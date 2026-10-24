import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import { attendanceRecords, classSessions, mergedSessionClasses, mergedSessions, sections, subjects, users } from '../../database/schema';
import { type AccessScope } from './attendance.service';
import { AttendanceCoreService, type SessionRow } from './attendance-core.service';
import { CreateMergeDto, ListMergeableQueryDto } from './dto/attendance.dto';
import { SubmitMergeDto } from './dto/merge.dto';

@Injectable()
export class MergeService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
    private readonly core: AttendanceCoreService,
  ) {}

  // Classes the teacher could merge on a date. The server re-checks compatibility on create.
  async mergeable(instituteId: string, query: ListMergeableQueryDto, scope: AccessScope) {
    const teacherId = scope.canManage ? query.teacherUserId : scope.userId;
    const filters = [
      eq(classSessions.instituteId, instituteId),
      eq(classSessions.sessionDate, query.date),
      ne(classSessions.status, 'CANCELLED'),
    ];

    if (teacherId) {
      filters.push(eq(classSessions.teacherUserId, teacherId));
    }

    const rows = await this.database.db
      .select({
        session: classSessions,
        sectionName: sections.name,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
      })
      .from(classSessions)
      .innerJoin(users, eq(users.id, classSessions.teacherUserId))
      .leftJoin(sections, eq(sections.id, classSessions.sectionId))
      .leftJoin(subjects, eq(subjects.id, classSessions.subjectId))
      .where(and(...filters))
      .orderBy(classSessions.startTime, classSessions.title);

    const result: Record<string, unknown>[] = [];

    for (const row of rows) {
      if (row.session.lockedAt || (await this.core.activeMerge(row.session.id))) {
        continue;
      }

      const roster = await this.core.roster(row.session);

      result.push({
        id: row.session.id,
        title: row.session.title,
        classType: row.session.classType,
        subjectId: row.session.subjectId,
        subjectName: row.subjectName,
        subjectCode: row.subjectCode,
        sectionName: row.sectionName,
        teacherUserId: row.session.teacherUserId,
        teacherName: [row.teacherFirstName, row.teacherLastName].filter(Boolean).join(' '),
        startTime: row.session.startTime,
        endTime: row.session.endTime,
        rosterSize: roster.length,
      });
    }

    return result;
  }

  async create(instituteId: string, dto: CreateMergeDto, scope: AccessScope) {
    const ids = [...new Set(dto.sessionIds)];

    if (ids.length < 2) {
      throw new BadRequestException('Select at least two different classes to merge');
    }

    const sessions = await this.database.db
      .select()
      .from(classSessions)
      .where(and(eq(classSessions.instituteId, instituteId), inArray(classSessions.id, ids)));

    if (sessions.length !== ids.length) {
      throw new NotFoundException('One of the selected classes was not found');
    }

    const first = sessions[0];

    if (!scope.canManage && sessions.some((session) => session.teacherUserId !== scope.userId)) {
      throw new ForbiddenException('You can only merge classes assigned to you');
    }

    if (sessions.some((session) => session.teacherUserId !== first.teacherUserId)) {
      throw new BadRequestException('All selected classes must have the same teacher');
    }

    if (sessions.some((session) => session.sessionDate !== first.sessionDate)) {
      throw new BadRequestException('All selected classes must be on the same date');
    }

    if (!first.subjectId || sessions.some((session) => session.subjectId !== first.subjectId)) {
      throw new BadRequestException('Only classes for the same subject can be merged');
    }

    if (sessions.some((session) => session.startTime !== first.startTime || session.endTime !== first.endTime)) {
      throw new BadRequestException('All selected classes must run in the same time slot');
    }

    if (sessions.some((session) => session.status === 'CANCELLED')) {
      throw new BadRequestException('A cancelled class cannot be merged');
    }

    if (sessions.some((session) => session.lockedAt)) {
      throw new BadRequestException('A class with locked attendance cannot be merged');
    }

    for (const session of sessions) {
      if (await this.core.activeMerge(session.id)) {
        throw new ConflictException(`"${session.title}" is already part of a merged session`);
      }

      if (!(await this.core.roster(session)).length) {
        throw new BadRequestException(`"${session.title}" has no enrolled students`);
      }
    }

    const mergedId = await this.database.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(mergedSessions)
        .values({
          instituteId,
          teacherUserId: first.teacherUserId,
          subjectId: first.subjectId,
          sessionDate: first.sessionDate,
          startTime: first.startTime,
          endTime: first.endTime,
          createdBy: scope.userId,
        })
        .returning({ id: mergedSessions.id });

      await tx.insert(mergedSessionClasses).values(sessions.map((session) => ({ mergedSessionId: created.id, sessionId: session.id })));

      return created.id;
    });

    this.logger.info('Classes merged', {
      operation: 'attendance.merge.create',
      resource: 'merged_session',
      resourceId: mergedId,
      instituteId,
      classes: sessions.length,
    });

    return { id: mergedId };
  }

  async detail(instituteId: string, id: string, scope: AccessScope) {
    const merged = await this.requireMerged(instituteId, id, scope);
    const classes = await this.classesOf(id);
    const records = classes.length
      ? await this.database.db
          .select()
          .from(attendanceRecords)
          .where(
            inArray(
              attendanceRecords.sessionId,
              classes.map((entry) => entry.session.id),
            ),
          )
      : [];

    // One row per student, even if they are enrolled in more than one selected class.
    const combined = new Map<
      string,
      {
        studentId: string;
        name: string;
        rollNumber: string;
        originLabels: string[];
        sessionIds: string[];
        status: string | null;
        excusedBy: boolean;
      }
    >();

    for (const entry of classes) {
      for (const student of await this.core.roster(entry.session)) {
        const record = records.find((candidate) => candidate.studentId === student.studentId && candidate.sessionId === entry.session.id);
        const row = combined.get(student.studentId) ?? {
          studentId: student.studentId,
          name: student.name,
          rollNumber: student.rollNumber,
          originLabels: [],
          sessionIds: [],
          status: null,
          excusedBy: false,
        };
        const label = student.originLabel ?? entry.session.title;

        if (!row.originLabels.includes(label)) {
          row.originLabels.push(label);
        }

        row.sessionIds.push(entry.session.id);
        row.status = row.status ?? record?.status ?? null;
        row.excusedBy = row.excusedBy || Boolean(record?.primarySessionId);
        combined.set(student.studentId, row);
      }
    }

    const studentsList = [...combined.values()].sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
    const countOf = (status: string) => studentsList.filter((student) => student.status === status).length;
    const [meta] = await this.database.db
      .select({
        subjectName: subjects.name,
        subjectCode: subjects.code,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
      })
      .from(mergedSessions)
      .innerJoin(users, eq(users.id, mergedSessions.teacherUserId))
      .leftJoin(subjects, eq(subjects.id, mergedSessions.subjectId))
      .where(eq(mergedSessions.id, id))
      .limit(1);

    return {
      merged: {
        id: merged.id,
        status: merged.status,
        sessionDate: merged.sessionDate,
        startTime: merged.startTime,
        endTime: merged.endTime,
        submittedAt: merged.submittedAt,
        subjectName: meta?.subjectName ?? null,
        subjectCode: meta?.subjectCode ?? null,
        teacherName: [meta?.teacherFirstName, meta?.teacherLastName].filter(Boolean).join(' '),
        isLocked: classes.some((entry) => entry.session.lockedAt),
      },
      canCorrectLocked: scope.canManage,
      classes: classes.map((entry) => ({
        id: entry.session.id,
        title: entry.session.title,
        sectionName: entry.sectionName,
      })),
      students: studentsList,
      summary: {
        total: studentsList.length,
        present: countOf('PRESENT'),
        absent: countOf('ABSENT'),
        excused: countOf('EXCUSED'),
        leave: countOf('LEAVE'),
        pending: studentsList.filter((student) => student.status === null).length,
      },
    };
  }

  async submit(instituteId: string, id: string, dto: SubmitMergeDto, scope: AccessScope) {
    const merged = await this.requireMerged(instituteId, id, scope);

    if (merged.status === 'CANCELLED') {
      throw new BadRequestException('This merged session was cancelled');
    }

    const classes = await this.classesOf(id);
    const locked = classes.some((entry) => entry.session.lockedAt);

    if (locked && !scope.canManage) {
      throw new ForbiddenException('Attendance for this session is locked. Ask an administrator to correct it.');
    }

    if (locked && !dto.reason) {
      throw new BadRequestException('Give a reason for correcting locked attendance');
    }

    const bySession = new Map<string, Set<string>>();
    const everyone = new Set<string>();

    for (const entry of classes) {
      const roster = new Set((await this.core.roster(entry.session)).map((student) => student.studentId));
      bySession.set(entry.session.id, roster);
      roster.forEach((studentId) => everyone.add(studentId));
    }

    const entries = new Map(dto.entries.map((entry) => [entry.studentId, entry]));

    for (const studentId of entries.keys()) {
      if (!everyone.has(studentId)) {
        throw new BadRequestException('A selected student is not in any of the merged classes');
      }
    }

    const missing = [...everyone].filter((studentId) => !entries.has(studentId)).length;

    if (missing) {
      throw new BadRequestException(`Mark every student before submitting (${missing} still pending)`);
    }

    const trigger = locked ? 'CORRECTION' : 'MERGED_SUBMIT';
    let changed = 0;

    for (const [studentId, entry] of entries) {
      for (const [sessionId, roster] of bySession) {
        if (!roster.has(studentId)) {
          continue;
        }

        const [existing] = await this.database.db
          .select()
          .from(attendanceRecords)
          .where(and(eq(attendanceRecords.studentId, studentId), eq(attendanceRecords.sessionId, sessionId)))
          .limit(1);

        if (existing?.status === 'EXCUSED' && existing.primarySessionId && entry.status === 'ABSENT') {
          continue;
        }

        const saved = await this.core.saveRecord({
          instituteId,
          studentId,
          sessionId,
          status: entry.status,
          mergedSessionId: id,
          actorId: scope.userId,
          trigger,
          reason: dto.reason ?? null,
        });

        changed += saved ? 1 : 0;
      }
    }

    await this.database.db
      .update(classSessions)
      .set({ status: 'COMPLETED', updatedAt: new Date() })
      .where(
        and(
          inArray(
            classSessions.id,
            classes.map((entry) => entry.session.id),
          ),
          eq(classSessions.status, 'SCHEDULED'),
        ),
      );
    await this.database.db
      .update(mergedSessions)
      .set({ status: 'SUBMITTED', submittedAt: merged.submittedAt ?? new Date(), updatedAt: new Date() })
      .where(eq(mergedSessions.id, id));

    let excused = 0;

    for (const studentId of entries.keys()) {
      excused += (await this.core.reconcile(instituteId, studentId, merged.sessionDate, scope.userId)).excused;
    }

    return { saved: entries.size, changed, excusedElsewhere: excused };
  }

  async unmerge(instituteId: string, id: string, scope: AccessScope) {
    const merged = await this.requireMerged(instituteId, id, scope);

    if (merged.status === 'CANCELLED') {
      throw new BadRequestException('This merged session was already unmerged');
    }

    const classes = await this.classesOf(id);

    if (classes.some((entry) => entry.session.lockedAt) && !scope.canManage) {
      throw new ForbiddenException('Attendance is locked, so only an administrator can unmerge this session');
    }

    await this.database.db.transaction(async (tx) => {
      await tx.update(mergedSessions).set({ status: 'CANCELLED', updatedAt: new Date() }).where(eq(mergedSessions.id, id));
      // The attendance already saved stays with each original class.
      await tx.update(attendanceRecords).set({ mergedSessionId: null }).where(eq(attendanceRecords.mergedSessionId, id));
    });

    return { id };
  }

  async history(instituteId: string, scope: AccessScope) {
    const filters = [eq(mergedSessions.instituteId, instituteId)];

    if (!scope.canManage) {
      filters.push(eq(mergedSessions.teacherUserId, scope.userId));
    }

    const rows = await this.database.db
      .select({
        merged: mergedSessions,
        subjectName: subjects.name,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
        classCount: sql<number>`(select count(*)::int from ${mergedSessionClasses} where ${mergedSessionClasses.mergedSessionId} = ${mergedSessions.id})`,
      })
      .from(mergedSessions)
      .innerJoin(users, eq(users.id, mergedSessions.teacherUserId))
      .leftJoin(subjects, eq(subjects.id, mergedSessions.subjectId))
      .where(and(...filters))
      .orderBy(desc(mergedSessions.sessionDate), desc(mergedSessions.createdAt))
      .limit(100);

    const ids = rows.map((row) => row.merged.id);
    const classRows = ids.length
      ? await this.database.db
          .select({ mergedSessionId: mergedSessionClasses.mergedSessionId, sectionName: sections.name, title: classSessions.title })
          .from(mergedSessionClasses)
          .innerJoin(classSessions, eq(classSessions.id, mergedSessionClasses.sessionId))
          .leftJoin(sections, eq(sections.id, classSessions.sectionId))
          .where(inArray(mergedSessionClasses.mergedSessionId, ids))
      : [];

    return rows.map((row) => ({
      id: row.merged.id,
      status: row.merged.status,
      sessionDate: row.merged.sessionDate,
      startTime: row.merged.startTime,
      endTime: row.merged.endTime,
      submittedAt: row.merged.submittedAt,
      createdAt: row.merged.createdAt,
      subjectName: row.subjectName,
      teacherName: [row.teacherFirstName, row.teacherLastName].filter(Boolean).join(' '),
      classCount: row.classCount,
      classes: classRows.filter((entry) => entry.mergedSessionId === row.merged.id).map((entry) => entry.sectionName ?? entry.title),
    }));
  }

  private async classesOf(mergedId: string) {
    return this.database.db
      .select({ session: classSessions, sectionName: sections.name })
      .from(mergedSessionClasses)
      .innerJoin(classSessions, eq(classSessions.id, mergedSessionClasses.sessionId))
      .leftJoin(sections, eq(sections.id, classSessions.sectionId))
      .where(eq(mergedSessionClasses.mergedSessionId, mergedId))
      .orderBy(classSessions.title);
  }

  private async requireMerged(instituteId: string, id: string, scope: AccessScope) {
    const [merged] = await this.database.db
      .select()
      .from(mergedSessions)
      .where(and(eq(mergedSessions.id, id), eq(mergedSessions.instituteId, instituteId)))
      .limit(1);

    if (!merged) {
      throw new NotFoundException('Merged session not found');
    }

    if (!scope.canManage && merged.teacherUserId !== scope.userId) {
      throw new ForbiddenException('This merged session belongs to another teacher');
    }

    return merged;
  }
}

export type { SessionRow };

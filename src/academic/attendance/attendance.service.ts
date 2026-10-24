import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import {
  attendanceAudit,
  attendanceRecords,
  classSessionParticipants,
  classSessions,
  instituteUsers,
  primaryAssignments,
  sections,
  studentEnrollments,
  students,
  subjects,
  users,
} from '../../database/schema';
import { AttendanceCoreService, type SessionRow, overlaps } from './attendance-core.service';
import { AssignPrimaryDto, CreateSessionDto, ListSessionsQueryDto, MarkAttendanceDto, UpdateSessionDto } from './dto/attendance.dto';

export type AccessScope = { userId: string; canManage: boolean };

const MAX_REPEATS = 60;

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);

  return value.toISOString().slice(0, 10);
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
    private readonly core: AttendanceCoreService,
  ) {}

  async teachers(instituteId: string) {
    return this.database.db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
      .from(instituteUsers)
      .innerJoin(users, eq(users.id, instituteUsers.userId))
      .where(
        and(
          eq(instituteUsers.instituteId, instituteId),
          eq(users.isActive, true),
          // Students with portal logins are institute users too, but they don't teach.
          sql`not exists (select 1 from ${students} where ${students.userId} = ${users.id})`,
        ),
      )
      .orderBy(asc(users.firstName));
  }

  async searchStudents(instituteId: string, q?: string) {
    const filters = [eq(students.instituteId, instituteId), isNull(students.deletedAt)];

    if (q) {
      filters.push(or(ilike(students.name, `%${q}%`), ilike(students.rollNumber, `%${q}%`))!);
    }

    return this.database.db
      .select({ id: students.id, name: students.name, rollNumber: students.rollNumber })
      .from(students)
      .where(and(...filters))
      .orderBy(asc(students.rollNumber))
      .limit(50);
  }

  async list(instituteId: string, query: ListSessionsQueryDto, scope: AccessScope) {
    const date = query.date ?? new Date().toISOString().slice(0, 10);
    const filters = [eq(classSessions.instituteId, instituteId), eq(classSessions.sessionDate, date)];

    if (!scope.canManage) {
      filters.push(eq(classSessions.teacherUserId, scope.userId));
    } else if (query.teacherUserId) {
      filters.push(eq(classSessions.teacherUserId, query.teacherUserId));
    }

    const rows = await this.database.db
      .select({
        session: classSessions,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
        sectionName: sections.name,
        subjectName: subjects.name,
        subjectCode: subjects.code,
      })
      .from(classSessions)
      .innerJoin(users, eq(users.id, classSessions.teacherUserId))
      .leftJoin(sections, eq(sections.id, classSessions.sectionId))
      .leftJoin(subjects, eq(subjects.id, classSessions.subjectId))
      .where(and(...filters))
      .orderBy(asc(classSessions.startTime), asc(classSessions.title));

    if (!rows.length) {
      return { date, sessions: [] };
    }

    const ids = rows.map((row) => row.session.id);
    const counts = await this.database.db
      .select({
        sessionId: attendanceRecords.sessionId,
        status: attendanceRecords.status,
        total: sql<number>`count(*)::int`,
      })
      .from(attendanceRecords)
      .where(inArray(attendanceRecords.sessionId, ids))
      .groupBy(attendanceRecords.sessionId, attendanceRecords.status);
    const primaryCounts = await this.database.db
      .select({ sessionId: primaryAssignments.sessionId, total: sql<number>`count(*)::int` })
      .from(primaryAssignments)
      .where(inArray(primaryAssignments.sessionId, ids))
      .groupBy(primaryAssignments.sessionId);

    const sessions: Record<string, unknown>[] = [];

    for (const row of rows) {
      const roster = await this.core.roster(row.session);
      const mine = counts.filter((count) => count.sessionId === row.session.id);
      const total = (status: string) => mine.find((count) => count.status === status)?.total ?? 0;
      const merge = await this.core.activeMerge(row.session.id);

      sessions.push({
        ...this.present(row.session),
        teacherName: [row.teacherFirstName, row.teacherLastName].filter(Boolean).join(' '),
        sectionName: row.sectionName,
        subjectName: row.subjectName,
        subjectCode: row.subjectCode,
        rosterSize: roster.length,
        present: total('PRESENT'),
        absent: total('ABSENT'),
        excused: total('EXCUSED'),
        leave: total('LEAVE'),
        primaryCount: primaryCounts.find((count) => count.sessionId === row.session.id)?.total ?? 0,
        mergedSessionId: merge?.id ?? null,
      });
    }

    return { date, sessions };
  }

  async create(instituteId: string, dto: CreateSessionDto, scope: AccessScope) {
    this.core.assertValidTimes(dto.startTime, dto.endTime);

    if (dto.repeatUntil && dto.repeatUntil < dto.sessionDate) {
      throw new BadRequestException('"Repeat until" must be on or after the session date');
    }

    const isRegular = dto.classType === 'REGULAR';

    if (isRegular && (!dto.sectionId || !dto.subjectId)) {
      throw new BadRequestException('A regular class needs a section and a subject');
    }

    if (!isRegular && !dto.title) {
      throw new BadRequestException('Give this class a title');
    }

    await this.requireInstituteTeacher(instituteId, dto.teacherUserId);

    let title = dto.title;

    if (dto.subjectId) {
      const [subject] = await this.database.db
        .select({ name: subjects.name })
        .from(subjects)
        .where(and(eq(subjects.id, dto.subjectId), eq(subjects.instituteId, instituteId), isNull(subjects.deletedAt)))
        .limit(1);

      if (!subject) {
        throw new BadRequestException('Subject not found');
      }

      title ??= subject.name;
    }

    if (dto.sectionId) {
      const [section] = await this.database.db
        .select({ id: sections.id })
        .from(sections)
        .where(and(eq(sections.id, dto.sectionId), eq(sections.instituteId, instituteId)))
        .limit(1);

      if (!section) {
        throw new BadRequestException('Section not found');
      }
    }

    const participantIds = await this.resolveParticipants(instituteId, dto);

    if (!dto.sectionId && !participantIds.length) {
      throw new BadRequestException('Add at least one student to this class');
    }

    const dates = [dto.sessionDate];

    for (let next = addDays(dto.sessionDate, 7); dto.repeatUntil && next <= dto.repeatUntil; next = addDays(next, 7)) {
      dates.push(next);
    }

    if (dates.length > MAX_REPEATS) {
      throw new BadRequestException(`A repeating class can have at most ${MAX_REPEATS} sessions`);
    }

    const createdIds = await this.database.db.transaction(async (tx) => {
      const ids: string[] = [];

      for (const sessionDate of dates) {
        const [created] = await tx
          .insert(classSessions)
          .values({
            instituteId,
            classType: dto.classType,
            title: title!,
            subjectId: dto.subjectId ?? null,
            sectionId: dto.sectionId ?? null,
            teacherUserId: dto.teacherUserId,
            sessionDate,
            startTime: dto.startTime,
            endTime: dto.endTime,
            createdBy: scope.userId,
          })
          .returning({ id: classSessions.id });

        if (participantIds.length) {
          await tx.insert(classSessionParticipants).values(participantIds.map((studentId) => ({ sessionId: created.id, studentId })));
        }

        ids.push(created.id);
      }

      return ids;
    });

    this.logger.info('Class sessions created', {
      operation: 'attendance.sessions.create',
      resource: 'class_session',
      instituteId,
      count: createdIds.length,
    });

    return { ids: createdIds, count: createdIds.length };
  }

  async detail(instituteId: string, id: string, scope: AccessScope) {
    const session = await this.core.getSession(instituteId, id);
    this.assertCanAccess(session, scope);

    const [row] = await this.database.db
      .select({
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
        sectionName: sections.name,
        subjectName: subjects.name,
        subjectCode: subjects.code,
      })
      .from(classSessions)
      .innerJoin(users, eq(users.id, classSessions.teacherUserId))
      .leftJoin(sections, eq(sections.id, classSessions.sectionId))
      .leftJoin(subjects, eq(subjects.id, classSessions.subjectId))
      .where(eq(classSessions.id, id))
      .limit(1);

    const roster = await this.core.roster(session);
    const records = await this.database.db.select().from(attendanceRecords).where(eq(attendanceRecords.sessionId, id));
    const primaries = await this.database.db
      .select({ studentId: primaryAssignments.studentId })
      .from(primaryAssignments)
      .where(eq(primaryAssignments.sessionId, id));
    const merge = await this.core.activeMerge(id);

    const primarySessionIds = [...new Set(records.map((record) => record.primarySessionId).filter(Boolean))] as string[];
    const primaryTitles = primarySessionIds.length
      ? await this.database.db
          .select({ id: classSessions.id, title: classSessions.title })
          .from(classSessions)
          .where(inArray(classSessions.id, primarySessionIds))
      : [];

    return {
      session: {
        ...this.present(session),
        teacherName: [row?.teacherFirstName, row?.teacherLastName].filter(Boolean).join(' '),
        sectionName: row?.sectionName ?? null,
        subjectName: row?.subjectName ?? null,
        subjectCode: row?.subjectCode ?? null,
        mergedSessionId: merge?.id ?? null,
        mergedStatus: merge?.status ?? null,
      },
      canCorrectLocked: scope.canManage,
      students: roster.map((student) => {
        const record = records.find((entry) => entry.studentId === student.studentId);

        return {
          ...student,
          status: record?.status ?? null,
          remarks: record?.remarks ?? null,
          isPrimary: primaries.some((primary) => primary.studentId === student.studentId),
          excusedBy: record?.primarySessionId
            ? (primaryTitles.find((title) => title.id === record.primarySessionId)?.title ?? 'Primary class')
            : null,
        };
      }),
    };
  }

  async mark(instituteId: string, id: string, dto: MarkAttendanceDto, scope: AccessScope) {
    const session = await this.core.getSession(instituteId, id);
    this.assertCanAccess(session, scope);

    if (session.status === 'CANCELLED') {
      throw new BadRequestException('This class session was cancelled');
    }

    const merge = await this.core.activeMerge(id);

    if (merge) {
      throw new ConflictException('This class is part of a merged session. Take or edit attendance in the merged session instead.');
    }

    if (session.lockedAt && !scope.canManage) {
      throw new ForbiddenException('This session is locked. Ask an administrator to correct attendance.');
    }

    if (session.lockedAt && !dto.reason) {
      throw new BadRequestException('Give a reason for correcting locked attendance');
    }

    const roster = await this.core.roster(session);
    const inRoster = new Set(roster.map((student) => student.studentId));
    const entries = new Map<string, (typeof dto.entries)[number]>();

    for (const entry of dto.entries) {
      if (!inRoster.has(entry.studentId)) {
        throw new BadRequestException('A selected student is not in this class');
      }

      entries.set(entry.studentId, entry);
    }

    const trigger = session.lockedAt ? 'CORRECTION' : 'MANUAL';
    const kept: string[] = [];
    let changed = 0;

    for (const entry of entries.values()) {
      const [existing] = await this.database.db
        .select()
        .from(attendanceRecords)
        .where(and(eq(attendanceRecords.studentId, entry.studentId), eq(attendanceRecords.sessionId, id)))
        .limit(1);

      // An exemption from the primary class is not undone by marking the student absent here.
      if (existing?.status === 'EXCUSED' && existing.primarySessionId && entry.status === 'ABSENT') {
        kept.push(entry.studentId);
        continue;
      }

      const saved = await this.core.saveRecord({
        instituteId,
        studentId: entry.studentId,
        sessionId: id,
        status: entry.status,
        actorId: scope.userId,
        trigger,
        reason: dto.reason ?? null,
      });

      changed += saved ? 1 : 0;
    }

    if (session.status === 'SCHEDULED') {
      await this.database.db.update(classSessions).set({ status: 'COMPLETED', updatedAt: new Date() }).where(eq(classSessions.id, id));
    }

    let excused = 0;

    for (const studentId of entries.keys()) {
      const result = await this.core.reconcile(instituteId, studentId, session.sessionDate, scope.userId);
      excused += result.excused;
    }

    return { saved: entries.size, changed, keptExcused: kept.length, excusedElsewhere: excused };
  }

  async assignPrimary(instituteId: string, id: string, dto: AssignPrimaryDto, scope: AccessScope) {
    const session = await this.core.getSession(instituteId, id);
    this.assertCanAccess(session, scope);

    if (session.status === 'CANCELLED') {
      throw new BadRequestException('This class session was cancelled');
    }

    const roster = await this.core.roster(session);
    const byId = new Map(roster.map((student) => [student.studentId, student]));
    const targets = dto.all ? roster.map((student) => student.studentId) : [...new Set(dto.studentIds ?? [])];

    if (!targets.length) {
      throw new BadRequestException('Choose the students this class is primary for');
    }

    for (const studentId of targets) {
      if (!byId.has(studentId)) {
        throw new BadRequestException('A selected student is not in this class');
      }
    }

    // A student can have only one primary class per time slot.
    const conflicts: string[] = [];

    for (const studentId of targets) {
      const sessionsToday = await this.core.studentSessions(instituteId, studentId, session.sessionDate);
      const others = sessionsToday.filter((other) => other.id !== id && overlaps(session, other));

      if (!others.length) {
        continue;
      }

      const [clash] = await this.database.db
        .select({ sessionId: primaryAssignments.sessionId })
        .from(primaryAssignments)
        .where(
          and(
            eq(primaryAssignments.studentId, studentId),
            inArray(
              primaryAssignments.sessionId,
              others.map((other) => other.id),
            ),
          ),
        )
        .limit(1);

      if (clash) {
        const other = others.find((entry) => entry.id === clash.sessionId);
        conflicts.push(`${byId.get(studentId)!.name} (already primary for "${other?.title}")`);
      }
    }

    if (conflicts.length) {
      throw new ConflictException(
        `A student can have only one primary class per time slot. ${conflicts.slice(0, 5).join('; ')}${conflicts.length > 5 ? ` and ${conflicts.length - 5} more` : ''}.`,
      );
    }

    await this.database.db
      .insert(primaryAssignments)
      .values(targets.map((studentId) => ({ instituteId, studentId, sessionId: id, createdBy: scope.userId })))
      .onConflictDoNothing();

    let excused = 0;

    for (const studentId of targets) {
      excused += (await this.core.reconcile(instituteId, studentId, session.sessionDate, scope.userId)).excused;
    }

    return { assigned: targets.length, excusedElsewhere: excused };
  }

  async removePrimary(instituteId: string, id: string, studentId: string, scope: AccessScope) {
    const session = await this.core.getSession(instituteId, id);
    this.assertCanAccess(session, scope);

    const removed = await this.database.db
      .delete(primaryAssignments)
      .where(and(eq(primaryAssignments.sessionId, id), eq(primaryAssignments.studentId, studentId)))
      .returning({ id: primaryAssignments.id });

    if (!removed.length) {
      throw new NotFoundException('This class is not the primary class for that student');
    }

    const result = await this.core.reconcile(instituteId, studentId, session.sessionDate, scope.userId);

    return { removed: true, reverted: result.reverted, lockedSkipped: result.lockedSkipped };
  }

  async setLocked(instituteId: string, id: string, locked: boolean, scope: AccessScope) {
    await this.core.getSession(instituteId, id);

    await this.database.db
      .update(classSessions)
      .set({
        lockedAt: locked ? new Date() : null,
        lockedBy: locked ? scope.userId : null,
        updatedAt: new Date(),
      })
      .where(eq(classSessions.id, id));

    return { id, locked };
  }

  async update(instituteId: string, id: string, dto: UpdateSessionDto) {
    await this.core.getSession(instituteId, id);

    if (dto.teacherUserId) {
      await this.requireInstituteTeacher(instituteId, dto.teacherUserId);
    }

    await this.database.db
      .update(classSessions)
      .set({ teacherUserId: dto.teacherUserId, title: dto.title, updatedAt: new Date() })
      .where(eq(classSessions.id, id));

    return { id };
  }

  async cancel(instituteId: string, id: string) {
    await this.core.getSession(instituteId, id);

    const [{ count }] = await this.database.db
      .select({ count: sql<number>`count(*)::int` })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.sessionId, id));

    if (count > 0) {
      throw new BadRequestException('Attendance has already been recorded, so this session can no longer be cancelled');
    }

    if (await this.core.activeMerge(id)) {
      throw new ConflictException('Unmerge this class before cancelling it');
    }

    await this.database.db.update(classSessions).set({ status: 'CANCELLED', updatedAt: new Date() }).where(eq(classSessions.id, id));

    return { id };
  }

  async audit(instituteId: string, id: string, scope: AccessScope) {
    const session = await this.core.getSession(instituteId, id);
    this.assertCanAccess(session, scope);

    return this.database.db
      .select({
        id: attendanceAudit.id,
        studentName: students.name,
        rollNumber: students.rollNumber,
        oldStatus: attendanceAudit.oldStatus,
        newStatus: attendanceAudit.newStatus,
        trigger: attendanceAudit.trigger,
        reason: attendanceAudit.reason,
        changedAt: attendanceAudit.changedAt,
        changedByName: users.firstName,
      })
      .from(attendanceAudit)
      .innerJoin(students, eq(students.id, attendanceAudit.studentId))
      .leftJoin(users, eq(users.id, attendanceAudit.changedBy))
      .where(eq(attendanceAudit.sessionId, id))
      .orderBy(desc(attendanceAudit.changedAt))
      .limit(200);
  }

  async studentSummary(instituteId: string, studentId: string) {
    return this.core.studentSummary(instituteId, studentId);
  }

  assertCanAccess(session: SessionRow, scope: AccessScope) {
    if (!scope.canManage && session.teacherUserId !== scope.userId) {
      throw new ForbiddenException('This class is assigned to another teacher');
    }
  }

  private present(session: SessionRow) {
    return {
      id: session.id,
      classType: session.classType,
      title: session.title,
      subjectId: session.subjectId,
      sectionId: session.sectionId,
      teacherUserId: session.teacherUserId,
      sessionDate: session.sessionDate,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      isLocked: session.lockedAt !== null,
    };
  }

  private async resolveParticipants(instituteId: string, dto: CreateSessionDto) {
    const ids = new Set(dto.participantStudentIds ?? []);

    if (dto.participantSectionIds?.length) {
      const rows = await this.database.db
        .select({ studentId: studentEnrollments.studentId })
        .from(studentEnrollments)
        .where(
          and(
            eq(studentEnrollments.instituteId, instituteId),
            eq(studentEnrollments.active, true),
            inArray(studentEnrollments.sectionId, dto.participantSectionIds),
          ),
        );

      rows.forEach((row) => ids.add(row.studentId));
    }

    if (!ids.size) {
      return [];
    }

    const valid = await this.database.db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.instituteId, instituteId), isNull(students.deletedAt), inArray(students.id, [...ids])));

    if (valid.length !== ids.size) {
      throw new BadRequestException('One or more selected students were not found');
    }

    return valid.map((row) => row.id);
  }

  private async requireInstituteTeacher(instituteId: string, userId: string) {
    const [member] = await this.database.db
      .select({ userId: instituteUsers.userId })
      .from(instituteUsers)
      .where(and(eq(instituteUsers.instituteId, instituteId), eq(instituteUsers.userId, userId)))
      .limit(1);

    if (!member) {
      throw new BadRequestException('The selected teacher does not belong to this institute');
    }

    const [student] = await this.database.db.select({ id: students.id }).from(students).where(eq(students.userId, userId)).limit(1);

    if (student) {
      throw new BadRequestException('A student account cannot be assigned as a teacher');
    }
  }
}

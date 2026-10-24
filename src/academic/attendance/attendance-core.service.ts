import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { and, desc, eq, inArray, isNull, ne, or } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service';
import {
  attendanceAudit,
  attendanceRecords,
  classSessionParticipants,
  classSessions,
  mergedSessionClasses,
  mergedSessions,
  primaryAssignments,
  sections,
  studentEnrollments,
  students,
  subjects,
} from '../../database/schema';

export type SessionRow = typeof classSessions.$inferSelect;
export type RecordRow = typeof attendanceRecords.$inferSelect;
export type AttendanceStatus = RecordRow['status'];
export type AuditTrigger = (typeof attendanceAudit.$inferInsert)['trigger'];

export type RosterStudent = {
  studentId: string;
  name: string;
  rollNumber: string;
  // Section the student is enrolled in, or null for explicitly added participants.
  originLabel: string | null;
};

// Two sessions overlap when they share a date and their time ranges intersect.
export function overlaps(a: { startTime: string; endTime: string }, b: { startTime: string; endTime: string }) {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

@Injectable()
export class AttendanceCoreService {
  constructor(private readonly database: DatabaseService) {}

  async getSession(instituteId: string, id: string): Promise<SessionRow> {
    const [session] = await this.database.db
      .select()
      .from(classSessions)
      .where(and(eq(classSessions.id, id), eq(classSessions.instituteId, instituteId)))
      .limit(1);

    if (!session) {
      throw new NotFoundException('Class session not found');
    }

    return session;
  }

  // Students come from the section's enrollments (never copied) plus any listed participants.
  async roster(session: Pick<SessionRow, 'id' | 'instituteId' | 'sectionId'>): Promise<RosterStudent[]> {
    const byId = new Map<string, RosterStudent>();

    if (session.sectionId) {
      const rows = await this.database.db
        .select({
          studentId: students.id,
          name: students.name,
          rollNumber: students.rollNumber,
          sectionName: sections.name,
        })
        .from(studentEnrollments)
        .innerJoin(students, eq(students.id, studentEnrollments.studentId))
        .innerJoin(sections, eq(sections.id, studentEnrollments.sectionId))
        .where(
          and(
            eq(studentEnrollments.sectionId, session.sectionId),
            eq(studentEnrollments.instituteId, session.instituteId),
            eq(studentEnrollments.active, true),
            isNull(students.deletedAt),
          ),
        );

      for (const row of rows) {
        byId.set(row.studentId, {
          studentId: row.studentId,
          name: row.name,
          rollNumber: row.rollNumber,
          originLabel: row.sectionName,
        });
      }
    }

    const participants = await this.database.db
      .select({ studentId: students.id, name: students.name, rollNumber: students.rollNumber })
      .from(classSessionParticipants)
      .innerJoin(students, eq(students.id, classSessionParticipants.studentId))
      .where(and(eq(classSessionParticipants.sessionId, session.id), isNull(students.deletedAt)));

    for (const row of participants) {
      if (!byId.has(row.studentId)) {
        byId.set(row.studentId, { ...row, originLabel: null });
      }
    }

    return [...byId.values()].sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
  }

  // Every non-cancelled session on a date that this student is part of.
  async studentSessions(instituteId: string, studentId: string, sessionDate: string): Promise<SessionRow[]> {
    const enrolled = await this.database.db
      .select({ sectionId: studentEnrollments.sectionId })
      .from(studentEnrollments)
      .where(
        and(
          eq(studentEnrollments.studentId, studentId),
          eq(studentEnrollments.instituteId, instituteId),
          eq(studentEnrollments.active, true),
        ),
      );
    const listed = await this.database.db
      .select({ sessionId: classSessionParticipants.sessionId })
      .from(classSessionParticipants)
      .where(eq(classSessionParticipants.studentId, studentId));

    const sectionIds = enrolled.map((row) => row.sectionId);
    const sessionIds = listed.map((row) => row.sessionId);
    const membership = [
      ...(sectionIds.length ? [inArray(classSessions.sectionId, sectionIds)] : []),
      ...(sessionIds.length ? [inArray(classSessions.id, sessionIds)] : []),
    ];

    if (!membership.length) {
      return [];
    }

    return this.database.db
      .select()
      .from(classSessions)
      .where(
        and(
          eq(classSessions.instituteId, instituteId),
          eq(classSessions.sessionDate, sessionDate),
          ne(classSessions.status, 'CANCELLED'),
          or(...membership),
        ),
      );
  }

  // The session this one is currently merged into (open or submitted), if any.
  async activeMerge(sessionId: string) {
    const [row] = await this.database.db
      .select({ id: mergedSessions.id, status: mergedSessions.status })
      .from(mergedSessionClasses)
      .innerJoin(mergedSessions, eq(mergedSessions.id, mergedSessionClasses.mergedSessionId))
      .where(and(eq(mergedSessionClasses.sessionId, sessionId), ne(mergedSessions.status, 'CANCELLED')))
      .limit(1);

    return row ?? null;
  }

  // Writes one attendance entry and records the change. Returns false when nothing changed.
  async saveRecord(input: {
    instituteId: string;
    studentId: string;
    sessionId: string;
    status: AttendanceStatus;
    primarySessionId?: string | null;
    mergedSessionId?: string | null;
    actorId: string | null;
    trigger: AuditTrigger;
    reason?: string | null;
    remarks?: string | null;
  }): Promise<boolean> {
    const [existing] = await this.database.db
      .select()
      .from(attendanceRecords)
      .where(and(eq(attendanceRecords.studentId, input.studentId), eq(attendanceRecords.sessionId, input.sessionId)))
      .limit(1);

    const primarySessionId = input.status === 'EXCUSED' ? (input.primarySessionId ?? null) : null;
    const now = new Date();

    if (existing && existing.status === input.status && existing.primarySessionId === primarySessionId) {
      if (input.mergedSessionId !== undefined && existing.mergedSessionId !== input.mergedSessionId) {
        await this.database.db
          .update(attendanceRecords)
          .set({ mergedSessionId: input.mergedSessionId, updatedAt: now })
          .where(eq(attendanceRecords.id, existing.id));
      }

      return false;
    }

    await this.database.db.transaction(async (tx) => {
      if (existing) {
        await tx
          .update(attendanceRecords)
          .set({
            status: input.status,
            primarySessionId,
            mergedSessionId: input.mergedSessionId === undefined ? existing.mergedSessionId : input.mergedSessionId,
            modifiedBy: input.actorId,
            remarks: input.remarks ?? existing.remarks,
            updatedAt: now,
          })
          .where(eq(attendanceRecords.id, existing.id));
      } else {
        await tx.insert(attendanceRecords).values({
          instituteId: input.instituteId,
          studentId: input.studentId,
          sessionId: input.sessionId,
          status: input.status,
          primarySessionId,
          mergedSessionId: input.mergedSessionId ?? null,
          markedBy: input.actorId,
          remarks: input.remarks ?? null,
        });
      }

      await tx.insert(attendanceAudit).values({
        instituteId: input.instituteId,
        studentId: input.studentId,
        sessionId: input.sessionId,
        oldStatus: existing?.status ?? null,
        newStatus: input.status,
        trigger: input.trigger,
        reason: input.reason ?? null,
        changedBy: input.actorId,
      });
    });

    return true;
  }

  // Re-derives the primary-class exemptions for one student on one day. It only looks at
  // the current attendance and primary assignments, never at the order they were created in,
  // so a primary class added later (or attendance marked later) gives the same result.
  async reconcile(instituteId: string, studentId: string, sessionDate: string, actorId: string | null) {
    const sessionsToday = await this.studentSessions(instituteId, studentId, sessionDate);

    if (sessionsToday.length < 2) {
      return { excused: 0, reverted: 0, lockedSkipped: 0 };
    }

    const ids = sessionsToday.map((session) => session.id);
    const records = await this.database.db
      .select()
      .from(attendanceRecords)
      .where(and(eq(attendanceRecords.studentId, studentId), inArray(attendanceRecords.sessionId, ids)));
    const primaries = await this.database.db
      .select({ sessionId: primaryAssignments.sessionId })
      .from(primaryAssignments)
      .where(and(eq(primaryAssignments.studentId, studentId), inArray(primaryAssignments.sessionId, ids)));

    const recordBySession = new Map(records.map((record) => [record.sessionId, record]));
    const attendedPrimaries = sessionsToday.filter(
      (session) => primaries.some((primary) => primary.sessionId === session.id) && recordBySession.get(session.id)?.status === 'PRESENT',
    );

    // Session id -> the primary session that excuses it.
    const desired = new Map<string, string>();

    for (const primary of attendedPrimaries) {
      for (const other of sessionsToday) {
        if (other.id !== primary.id && overlaps(primary, other) && !desired.has(other.id)) {
          desired.set(other.id, primary.id);
        }
      }
    }

    let excused = 0;
    let reverted = 0;
    let lockedSkipped = 0;

    for (const session of sessionsToday) {
      const record = recordBySession.get(session.id);
      const primaryId = desired.get(session.id);

      if (primaryId) {
        // Only a missing or absent entry becomes Excused; Present and Leave stay as marked.
        if (record && record.status !== 'ABSENT') {
          continue;
        }

        if (session.lockedAt) {
          lockedSkipped += 1;
          continue;
        }

        await this.saveRecord({
          instituteId,
          studentId,
          sessionId: session.id,
          status: 'EXCUSED',
          primarySessionId: primaryId,
          actorId,
          trigger: 'PRIMARY_RULE',
          reason: 'Attended the primary class in the same time slot',
        });
        excused += 1;
      } else if (record?.status === 'EXCUSED' && record.primarySessionId) {
        // The primary class is no longer attended or assigned, so the exemption no longer applies.
        if (session.lockedAt) {
          lockedSkipped += 1;
          continue;
        }

        await this.saveRecord({
          instituteId,
          studentId,
          sessionId: session.id,
          status: 'ABSENT',
          actorId,
          trigger: 'PRIMARY_RULE',
          reason: 'The primary class is no longer attended',
        });
        reverted += 1;
      }
    }

    return { excused, reverted, lockedSkipped };
  }

  assertValidTimes(startTime: string, endTime: string) {
    if (endTime <= startTime) {
      throw new BadRequestException('The end time must be after the start time');
    }
  }

  // Attendance per class. Excused and leave sessions are left out of the percentage so a
  // student is not penalised for them; they are still reported separately.
  async studentSummary(instituteId: string, studentId: string) {
    const rows = await this.database.db
      .select({
        status: attendanceRecords.status,
        primarySessionId: attendanceRecords.primarySessionId,
        sessionId: classSessions.id,
        classType: classSessions.classType,
        title: classSessions.title,
        subjectId: classSessions.subjectId,
        subjectName: subjects.name,
        sessionDate: classSessions.sessionDate,
        startTime: classSessions.startTime,
        endTime: classSessions.endTime,
      })
      .from(attendanceRecords)
      .innerJoin(classSessions, eq(classSessions.id, attendanceRecords.sessionId))
      .leftJoin(subjects, eq(subjects.id, classSessions.subjectId))
      .where(and(eq(attendanceRecords.studentId, studentId), eq(attendanceRecords.instituteId, instituteId)))
      .orderBy(desc(classSessions.sessionDate), desc(classSessions.startTime));

    const groups = new Map<
      string,
      { label: string; classType: string; total: number; present: number; absent: number; excused: number; leave: number }
    >();

    for (const row of rows) {
      const key = `${row.classType}:${row.subjectId ?? row.title}`;
      const group = groups.get(key) ?? {
        label: row.subjectName ?? row.title,
        classType: row.classType,
        total: 0,
        present: 0,
        absent: 0,
        excused: 0,
        leave: 0,
      };

      group.total += 1;
      group[row.status.toLowerCase() as 'present' | 'absent' | 'excused' | 'leave'] += 1;
      groups.set(key, group);
    }

    const primaryIds = [...new Set(rows.map((row) => row.primarySessionId).filter(Boolean))] as string[];
    const primaryTitles = primaryIds.length
      ? await this.database.db
          .select({ id: classSessions.id, title: classSessions.title })
          .from(classSessions)
          .where(inArray(classSessions.id, primaryIds))
      : [];

    return {
      classes: [...groups.values()]
        .map((group) => {
          const eligible = group.total - group.excused - group.leave;

          return {
            ...group,
            eligible,
            percentage: eligible > 0 ? Math.round((group.present / eligible) * 10_000) / 100 : null,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label)),
      recent: rows.slice(0, 30).map((row) => ({
        sessionId: row.sessionId,
        title: row.subjectName ?? row.title,
        classType: row.classType,
        sessionDate: row.sessionDate,
        startTime: row.startTime,
        endTime: row.endTime,
        status: row.status,
        excusedBy: row.primarySessionId
          ? (primaryTitles.find((title) => title.id === row.primarySessionId)?.title ?? 'Primary class')
          : null,
      })),
    };
  }
}

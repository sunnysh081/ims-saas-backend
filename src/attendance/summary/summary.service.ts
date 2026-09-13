import { Injectable } from '@nestjs/common';

import { and, eq, lt, sql } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service';
import {
  attendanceRecords,
  attendanceSessions,
  attendanceSummaries,
  courseOfferings,
  sections,
  students,
  subjects,
} from '../../database/schema';

@Injectable()
export class SummaryService {
  constructor(private readonly database: DatabaseService) {}

  async recalculate(instituteId: string, studentId: string, offeringId: string) {
    const [totals] = await this.database.db
      .select({
        total: sql<number>`count(*)::int`,
        present: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'PRESENT')::int`,
        absent: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'ABSENT')::int`,
        late: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'LATE')::int`,
        onDuty: sql<number>`count(*) filter (where ${attendanceRecords.status} in ('ON_DUTY','MEDICAL'))::int`,
      })
      .from(attendanceRecords)
      .innerJoin(attendanceSessions, eq(attendanceRecords.sessionId, attendanceSessions.id))
      .where(
        and(
          eq(attendanceRecords.studentId, studentId),
          eq(attendanceSessions.offeringId, offeringId),
          eq(attendanceSessions.status, 'TAKEN'),
        ),
      );

    const totalClasses = Number(totals?.total ?? 0);
    const present = Number(totals?.present ?? 0);
    const absent = Number(totals?.absent ?? 0);
    const late = Number(totals?.late ?? 0);
    const onDuty = Number(totals?.onDuty ?? 0);

    const effective = present + late + onDuty;
    const percentage = totalClasses > 0 ? (effective / totalClasses) * 100 : 0;

    await this.database.db
      .insert(attendanceSummaries)
      .values({
        instituteId,
        studentId,
        offeringId,
        totalClasses,
        present,
        absent,
        late,
        onDuty,
        percentage,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [attendanceSummaries.studentId, attendanceSummaries.offeringId],
        set: {
          totalClasses,
          present,
          absent,
          late,
          onDuty,
          percentage,
          updatedAt: new Date(),
        },
      });
  }

  async getStudentSemesterSummary(instituteId: string, studentId: string, semesterId: string) {
    return this.database.db
      .select({
        offeringId: attendanceSummaries.offeringId,
        subjectId: subjects.id,
        subjectCode: subjects.code,
        subjectName: subjects.name,
        subjectType: subjects.type,
        facultyId: courseOfferings.facultyId,
        totalClasses: attendanceSummaries.totalClasses,
        present: attendanceSummaries.present,
        absent: attendanceSummaries.absent,
        late: attendanceSummaries.late,
        onDuty: attendanceSummaries.onDuty,
        percentage: attendanceSummaries.percentage,
      })
      .from(attendanceSummaries)
      .innerJoin(courseOfferings, eq(courseOfferings.id, attendanceSummaries.offeringId))
      .innerJoin(subjects, eq(subjects.id, courseOfferings.subjectId))
      .where(
        and(
          eq(attendanceSummaries.instituteId, instituteId),
          eq(attendanceSummaries.studentId, studentId),
          eq(courseOfferings.semesterId, semesterId),
        ),
      );
  }

  async getOfferingSummary(instituteId: string, offeringId: string) {
    return this.database.db
      .select({
        studentId: attendanceSummaries.studentId,
        rollNumber: students.rollNumber,
        studentName: students.name,
        totalClasses: attendanceSummaries.totalClasses,
        present: attendanceSummaries.present,
        absent: attendanceSummaries.absent,
        late: attendanceSummaries.late,
        onDuty: attendanceSummaries.onDuty,
        percentage: attendanceSummaries.percentage,
      })
      .from(attendanceSummaries)
      .innerJoin(students, eq(students.id, attendanceSummaries.studentId))
      .where(and(eq(attendanceSummaries.instituteId, instituteId), eq(attendanceSummaries.offeringId, offeringId)));
  }

  async getDefaulters(instituteId: string, query: { semesterId?: string; sectionId?: string; threshold: number }) {
    const filters = [eq(attendanceSummaries.instituteId, instituteId), lt(attendanceSummaries.percentage, query.threshold)];

    if (query.semesterId) {
      filters.push(eq(courseOfferings.semesterId, query.semesterId));
    }

    if (query.sectionId) {
      filters.push(eq(courseOfferings.sectionId, query.sectionId));
    }

    return this.database.db
      .select({
        studentId: attendanceSummaries.studentId,
        rollNumber: students.rollNumber,
        studentName: students.name,
        offeringId: attendanceSummaries.offeringId,
        subjectCode: subjects.code,
        subjectName: subjects.name,
        sectionName: sections.name,
        totalClasses: attendanceSummaries.totalClasses,
        present: attendanceSummaries.present,
        percentage: attendanceSummaries.percentage,
      })
      .from(attendanceSummaries)
      .innerJoin(students, eq(students.id, attendanceSummaries.studentId))
      .innerJoin(courseOfferings, eq(courseOfferings.id, attendanceSummaries.offeringId))
      .innerJoin(subjects, eq(subjects.id, courseOfferings.subjectId))
      .leftJoin(sections, eq(sections.id, courseOfferings.sectionId))
      .where(and(...filters));
  }
}

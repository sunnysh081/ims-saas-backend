import { ForbiddenException, Injectable } from '@nestjs/common';

import { and, eq, isNull } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service';
import {
  batches,
  branches,
  programs,
  sections,
  semesterHistories,
  semesters,
  studentEnrollments,
  students,
} from '../../database/schema';

@Injectable()
export class PortalProfileService {
  constructor(private readonly database: DatabaseService) {}

  async getForCurrentStudent(instituteId: string, userId: string) {
    const [student] = await this.database.db
      .select({
        id: students.id,
        rollNumber: students.rollNumber,
        name: students.name,
        email: students.email,
        phone: students.phone,
        status: students.status,
        createdAt: students.createdAt,
      })
      .from(students)
      .where(and(eq(students.userId, userId), eq(students.instituteId, instituteId), isNull(students.deletedAt)))
      .limit(1);

    if (!student) {
      throw new ForbiddenException('No student profile linked to this account');
    }

    const [enrollment] = await this.database.db
      .select({
        academicYear: studentEnrollments.academicYear,
        status: studentEnrollments.status,
        enrolledAt: studentEnrollments.enrolledAt,
        semesterLabel: semesters.label,
        semesterNumber: semesters.number,
        sectionName: sections.name,
        branchName: branches.name,
        branchCode: branches.code,
        batchStartYear: batches.startYear,
        batchEndYear: batches.endYear,
        programName: programs.name,
        programCode: programs.code,
      })
      .from(studentEnrollments)
      .innerJoin(sections, eq(sections.id, studentEnrollments.sectionId))
      .innerJoin(batches, eq(batches.id, sections.batchId))
      .innerJoin(programs, eq(programs.id, batches.programId))
      .innerJoin(semesters, eq(semesters.id, studentEnrollments.semesterId))
      .leftJoin(branches, eq(branches.id, sections.branchId))
      .where(
        and(
          eq(studentEnrollments.studentId, student.id),
          eq(studentEnrollments.instituteId, instituteId),
          eq(studentEnrollments.active, true),
        ),
      )
      .limit(1);

    const history = await this.database.db
      .select({
        id: semesterHistories.id,
        semesterLabel: semesters.label,
        semesterNumber: semesters.number,
        sgpa: semesterHistories.sgpa,
        attendancePct: semesterHistories.attendancePct,
        result: semesterHistories.result,
      })
      .from(semesterHistories)
      .innerJoin(semesters, eq(semesters.id, semesterHistories.semesterId))
      .where(and(eq(semesterHistories.instituteId, instituteId), eq(semesterHistories.studentId, student.id)))
      .orderBy(semesters.number);

    return { student, enrollment: enrollment ?? null, history };
  }
}

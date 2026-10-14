import { ForbiddenException, Injectable } from '@nestjs/common';

import { and, eq, isNull } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service';
import { curriculumPlans, sections, studentEnrollments, students } from '../database/schema';

@Injectable()
export class PortalStudentScopeService {
  constructor(private readonly database: DatabaseService) {}

  // The student is always derived from the logged-in user, never from the request.
  async scopeFor(instituteId: string, userId: string) {
    const [student] = await this.database.db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.userId, userId), eq(students.instituteId, instituteId), isNull(students.deletedAt)))
      .limit(1);

    if (!student) {
      throw new ForbiddenException('No student profile linked to this account');
    }

    const [enrollment] = await this.database.db
      .select({ semesterId: studentEnrollments.semesterId, batchId: sections.batchId })
      .from(studentEnrollments)
      .innerJoin(sections, eq(sections.id, studentEnrollments.sectionId))
      .where(
        and(
          eq(studentEnrollments.studentId, student.id),
          eq(studentEnrollments.instituteId, instituteId),
          eq(studentEnrollments.active, true),
        ),
      )
      .limit(1);

    if (!enrollment) {
      return { studentId: student.id, batchId: '', subjectIds: [] as string[] };
    }

    const plans = await this.database.db
      .select({ subjectId: curriculumPlans.subjectId })
      .from(curriculumPlans)
      .where(
        and(
          eq(curriculumPlans.batchId, enrollment.batchId),
          eq(curriculumPlans.semesterId, enrollment.semesterId),
          isNull(curriculumPlans.deletedAt),
        ),
      );

    return {
      studentId: student.id,
      batchId: enrollment.batchId,
      subjectIds: plans.map((plan) => plan.subjectId),
    };
  }
}

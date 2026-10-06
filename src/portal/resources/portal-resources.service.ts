import { ForbiddenException, Injectable } from '@nestjs/common';

import { and, eq, inArray, isNull } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service';
import { curriculumPlans, resources, sections, studentEnrollments, students, subjects } from '../../database/schema';

@Injectable()
export class PortalResourcesService {
  constructor(private readonly database: DatabaseService) {}

  async listForCurrentStudent(instituteId: string, userId: string) {
    const studentId = await this.requireStudentId(instituteId, userId);
    const curriculumSubjectIds = await this.currentCurriculumSubjectIds(instituteId, studentId);

    if (!curriculumSubjectIds.length) {
      return [];
    }

    return this.database.db
      .select({
        id: resources.id,
        subjectId: resources.subjectId,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        title: resources.title,
        description: resources.description,
        url: resources.url,
        createdAt: resources.createdAt,
      })
      .from(resources)
      .innerJoin(subjects, eq(subjects.id, resources.subjectId))
      .where(
        and(
          eq(resources.instituteId, instituteId),
          eq(resources.isPublished, true),
          isNull(resources.deletedAt),
          inArray(resources.subjectId, curriculumSubjectIds),
        ),
      )
      .orderBy(subjects.name, resources.title);
  }

  private async requireStudentId(instituteId: string, userId: string): Promise<string> {
    const [student] = await this.database.db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.userId, userId), eq(students.instituteId, instituteId), isNull(students.deletedAt)))
      .limit(1);

    if (!student) {
      throw new ForbiddenException('No student profile linked to this account');
    }

    return student.id;
  }

  private async currentCurriculumSubjectIds(instituteId: string, studentId: string): Promise<string[]> {
    const [enrollment] = await this.database.db
      .select({
        semesterId: studentEnrollments.semesterId,
        batchId: sections.batchId,
      })
      .from(studentEnrollments)
      .innerJoin(sections, eq(sections.id, studentEnrollments.sectionId))
      .where(
        and(
          eq(studentEnrollments.studentId, studentId),
          eq(studentEnrollments.instituteId, instituteId),
          eq(studentEnrollments.active, true),
        ),
      )
      .limit(1);

    if (!enrollment || !enrollment.batchId) {
      return [];
    }

    const rows = await this.database.db
      .select({ subjectId: curriculumPlans.subjectId })
      .from(curriculumPlans)
      .where(
        and(
          eq(curriculumPlans.batchId, enrollment.batchId),
          eq(curriculumPlans.semesterId, enrollment.semesterId),
          isNull(curriculumPlans.deletedAt),
        ),
      );

    return rows.map((row) => row.subjectId);
  }
}

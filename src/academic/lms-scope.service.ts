import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { and, eq, isNull } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service';
import { batches, curriculumPlans, sections, studentEnrollments, students, syllabi, syllabusUnits } from '../database/schema';

// Shared checks for content (quizzes, assignments) scoped to a batch + subject.
@Injectable()
export class LmsScopeService {
  constructor(private readonly database: DatabaseService) {}

  async requireBatch(instituteId: string, batchId: string) {
    const [batch] = await this.database.db
      .select({ id: batches.id, programId: batches.programId })
      .from(batches)
      .where(and(eq(batches.id, batchId), eq(batches.instituteId, instituteId), isNull(batches.deletedAt)))
      .limit(1);

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    return batch;
  }

  async requireCurriculumPairing(instituteId: string, batchId: string, subjectId: string) {
    const [plan] = await this.database.db
      .select({ id: curriculumPlans.id })
      .from(curriculumPlans)
      .where(
        and(
          eq(curriculumPlans.instituteId, instituteId),
          eq(curriculumPlans.batchId, batchId),
          eq(curriculumPlans.subjectId, subjectId),
          isNull(curriculumPlans.deletedAt),
        ),
      )
      .limit(1);

    if (!plan) {
      throw new BadRequestException("This subject is not in the batch's curriculum. Add it on the Curriculum page first.");
    }
  }

  async requireSyllabusUnit(instituteId: string, unitId: string | undefined, batchId: string, subjectId: string) {
    if (!unitId) {
      return;
    }

    const [unit] = await this.database.db
      .select({ id: syllabusUnits.id })
      .from(syllabusUnits)
      .innerJoin(syllabi, eq(syllabi.id, syllabusUnits.syllabusId))
      .where(
        and(
          eq(syllabusUnits.id, unitId),
          eq(syllabi.instituteId, instituteId),
          eq(syllabi.batchId, batchId),
          eq(syllabi.subjectId, subjectId),
          isNull(syllabi.deletedAt),
        ),
      )
      .limit(1);

    if (!unit) {
      throw new BadRequestException("The selected unit is not part of this batch's syllabus for the subject");
    }
  }

  // A student currently enrolled in a section of this batch.
  async requireRosterStudent(instituteId: string, batchId: string, studentId: string) {
    const [student] = await this.database.db
      .select({ id: students.id, name: students.name, rollNumber: students.rollNumber })
      .from(students)
      .innerJoin(studentEnrollments, and(eq(studentEnrollments.studentId, students.id), eq(studentEnrollments.active, true)))
      .innerJoin(sections, eq(sections.id, studentEnrollments.sectionId))
      .where(
        and(eq(students.id, studentId), eq(students.instituteId, instituteId), isNull(students.deletedAt), eq(sections.batchId, batchId)),
      )
      .limit(1);

    if (!student) {
      throw new NotFoundException('Student is not in this batch');
    }

    return student;
  }
}

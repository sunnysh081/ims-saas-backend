import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { and, asc, eq, isNull } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import { batches, curriculumPlans, semesters, subjects } from '../../database/schema';
import { CreateCurriculumPlanDto, ListCurriculumPlansQueryDto } from './dto/curriculum-plan.dto';

const planSelection = {
  id: curriculumPlans.id,
  batchId: curriculumPlans.batchId,
  semesterId: curriculumPlans.semesterId,
  semesterNumber: semesters.number,
  semesterLabel: semesters.label,
  subjectId: curriculumPlans.subjectId,
  subjectName: subjects.name,
  subjectCode: subjects.code,
  isElective: curriculumPlans.isElective,
  createdAt: curriculumPlans.createdAt,
};

@Injectable()
export class CurriculumService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async findAll(instituteId: string, query: ListCurriculumPlansQueryDto) {
    const filters = [eq(curriculumPlans.instituteId, instituteId), isNull(curriculumPlans.deletedAt)];

    if (query.batchId) {
      filters.push(eq(curriculumPlans.batchId, query.batchId));
    }

    return this.database.db
      .select(planSelection)
      .from(curriculumPlans)
      .innerJoin(semesters, eq(semesters.id, curriculumPlans.semesterId))
      .innerJoin(subjects, eq(subjects.id, curriculumPlans.subjectId))
      .where(and(...filters))
      .orderBy(asc(semesters.number), asc(subjects.name));
  }

  async create(instituteId: string, dto: CreateCurriculumPlanDto) {
    const batch = await this.requireBatch(instituteId, dto.batchId);
    const semester = await this.requireSemester(instituteId, dto.semesterId);

    if (semester.programId !== batch.programId) {
      throw new BadRequestException("Semester does not belong to this batch's program");
    }

    await this.requireSubjectInProgram(instituteId, dto.subjectId, batch.programId);
    await this.assertUniqueEntry(dto.batchId, dto.semesterId, dto.subjectId);

    const [created] = await this.database.db
      .insert(curriculumPlans)
      .values({
        instituteId,
        batchId: dto.batchId,
        semesterId: dto.semesterId,
        subjectId: dto.subjectId,
        isElective: dto.isElective ?? false,
      })
      .returning({ id: curriculumPlans.id });

    if (!created) {
      throw new BadRequestException('Failed to add subject to curriculum');
    }

    this.logger.info('Curriculum plan entry created', {
      operation: 'curriculum.create',
      resource: 'curriculum_plan',
      resourceId: created.id,
      instituteId,
    });

    return created;
  }

  async remove(instituteId: string, id: string): Promise<void> {
    const [existing] = await this.database.db
      .select({ id: curriculumPlans.id })
      .from(curriculumPlans)
      .where(and(eq(curriculumPlans.id, id), eq(curriculumPlans.instituteId, instituteId), isNull(curriculumPlans.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Curriculum entry not found');
    }

    await this.database.db.update(curriculumPlans).set({ deletedAt: new Date() }).where(eq(curriculumPlans.id, id));

    this.logger.info('Curriculum plan entry removed', {
      operation: 'curriculum.delete',
      resource: 'curriculum_plan',
      resourceId: id,
      instituteId,
    });
  }

  private async requireBatch(instituteId: string, batchId: string) {
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

  private async requireSemester(instituteId: string, semesterId: string) {
    const [semester] = await this.database.db
      .select({ id: semesters.id, programId: semesters.programId })
      .from(semesters)
      .where(and(eq(semesters.id, semesterId), eq(semesters.instituteId, instituteId)))
      .limit(1);

    if (!semester) {
      throw new NotFoundException('Semester not found');
    }

    return semester;
  }

  private async requireSubjectInProgram(instituteId: string, subjectId: string, programId: string) {
    const [subject] = await this.database.db
      .select({ id: subjects.id })
      .from(subjects)
      .where(
        and(
          eq(subjects.id, subjectId),
          eq(subjects.instituteId, instituteId),
          eq(subjects.programId, programId),
          isNull(subjects.deletedAt),
        ),
      )
      .limit(1);

    if (!subject) {
      throw new BadRequestException("Subject does not belong to this batch's program");
    }
  }

  private async assertUniqueEntry(batchId: string, semesterId: string, subjectId: string) {
    const [existing] = await this.database.db
      .select({ id: curriculumPlans.id })
      .from(curriculumPlans)
      .where(
        and(
          eq(curriculumPlans.batchId, batchId),
          eq(curriculumPlans.semesterId, semesterId),
          eq(curriculumPlans.subjectId, subjectId),
          isNull(curriculumPlans.deletedAt),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException('This subject is already assigned to this semester for this batch');
    }
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { and, eq, isNull, or } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import { programPlans, subjects, syllabi } from '../../database/schema';
import { CreateProgramPlansDto, ListProgramPlansQueryDto } from './dto/program-plan.dto';

@Injectable()
export class ProgramPlanService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async findAll(instituteId: string, query: ListProgramPlansQueryDto) {
    const filters = [eq(programPlans.instituteId, instituteId)];

    if (query.programId) {
      filters.push(eq(programPlans.programId, query.programId));
    }

    if (query.branchId) {
      filters.push(eq(programPlans.branchId, query.branchId));
    }

    if (query.semesterId) {
      filters.push(eq(programPlans.semesterId, query.semesterId));
    }

    return this.database.db
      .select({
        id: programPlans.id,
        programId: programPlans.programId,
        branchId: programPlans.branchId,
        semesterId: programPlans.semesterId,
        subjectId: programPlans.subjectId,
        subjectCode: subjects.code,
        subjectName: subjects.name,
        isElective: programPlans.isElective,
        createdAt: programPlans.createdAt,
      })
      .from(programPlans)
      .innerJoin(subjects, eq(subjects.id, programPlans.subjectId))
      .where(and(...filters));
  }

  async create(instituteId: string, dto: CreateProgramPlansDto) {
    const values = dto.items.map((item) => ({
      instituteId,
      programId: item.programId,
      branchId: item.branchId ?? null,
      semesterId: item.semesterId,
      subjectId: item.subjectId,
      isElective: item.isElective ?? false,
    }));

    const created = await this.database.db.insert(programPlans).values(values).onConflictDoNothing().returning({ id: programPlans.id });

    this.logger.info('Program plan entries created', {
      operation: 'program-plans.create',
      resource: 'program_plan',
      instituteId,
      count: created.length,
      requested: values.length,
    });

    if (!created.length && values.length) {
      throw new BadRequestException('All requested program plan entries already exist');
    }

    return this.findAll(instituteId, {
      programId: dto.items[0]?.programId,
    });
  }

  async remove(instituteId: string, id: string): Promise<void> {
    const [existing] = await this.database.db
      .select({ id: programPlans.id })
      .from(programPlans)
      .where(and(eq(programPlans.id, id), eq(programPlans.instituteId, instituteId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Program plan entry not found');
    }

    await this.database.db.delete(programPlans).where(eq(programPlans.id, id));

    this.logger.info('Program plan entry removed', {
      operation: 'program-plans.delete',
      resource: 'program_plan',
      resourceId: id,
      instituteId,
    });
  }

  async subjectsForPlan(instituteId: string, query: { programId: string; semesterId: string; branchId?: string }) {
    const rows = await this.database.db
      .select({
        planId: programPlans.id,
        subjectId: subjects.id,
        code: subjects.code,
        name: subjects.name,
        type: subjects.type,
        category: subjects.category,
        credits: subjects.credits,
        isElective: programPlans.isElective,
        branchId: programPlans.branchId,
      })
      .from(programPlans)
      .innerJoin(subjects, eq(subjects.id, programPlans.subjectId))
      .where(
        and(
          eq(programPlans.instituteId, instituteId),
          eq(programPlans.programId, query.programId),
          eq(programPlans.semesterId, query.semesterId),
          query.branchId ? or(isNull(programPlans.branchId), eq(programPlans.branchId, query.branchId)) : isNull(programPlans.branchId),
        ),
      );

    const results: Array<(typeof rows)[number] & { activeSyllabus: unknown }> = [];

    for (const row of rows) {
      const [activeSyllabus] = await this.database.db
        .select()
        .from(syllabi)
        .where(and(eq(syllabi.subjectId, row.subjectId), eq(syllabi.isActive, true)))
        .limit(1);

      results.push({
        ...row,
        activeSyllabus: activeSyllabus ?? null,
      });
    }

    return results;
  }
}

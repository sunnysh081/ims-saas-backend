import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { and, eq, isNull, sql } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import {
  batches,
  courseOfferings,
  electiveChoices,
  electiveGroups,
  electiveOptions,
  sections,
  students,
  studentEnrollments,
  subjects,
  syllabi,
} from '../../database/schema';
import {
  CreateElectiveGroupDto,
  CreateElectiveOptionDto,
  ListElectiveGroupsQueryDto,
  UpdateElectiveGroupDto,
} from './dto/elective-group.dto';

@Injectable()
export class ElectiveGroupService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async findAll(instituteId: string, query: ListElectiveGroupsQueryDto) {
    const filters = [eq(electiveGroups.instituteId, instituteId)];

    if (query.programId) {
      filters.push(eq(electiveGroups.programId, query.programId));
    }

    if (query.semesterId) {
      filters.push(eq(electiveGroups.semesterId, query.semesterId));
    }

    if (query.branchId) {
      filters.push(eq(electiveGroups.branchId, query.branchId));
    }

    return this.database.db
      .select()
      .from(electiveGroups)
      .where(and(...filters));
  }

  async findOne(instituteId: string, id: string) {
    const [group] = await this.database.db
      .select()
      .from(electiveGroups)
      .where(and(eq(electiveGroups.id, id), eq(electiveGroups.instituteId, instituteId)))
      .limit(1);

    if (!group) {
      throw new NotFoundException('Elective group not found');
    }

    return group;
  }

  async create(instituteId: string, dto: CreateElectiveGroupDto) {
    const [created] = await this.database.db
      .insert(electiveGroups)
      .values({
        instituteId,
        programId: dto.programId,
        semesterId: dto.semesterId,
        branchId: dto.branchId,
        name: dto.name,
        type: dto.type,
        maxChoices: dto.maxChoices ?? 1,
        choiceWindowOpen: dto.choiceWindowOpen ? new Date(dto.choiceWindowOpen) : undefined,
        choiceWindowClose: dto.choiceWindowClose ? new Date(dto.choiceWindowClose) : undefined,
      })
      .returning({ id: electiveGroups.id });

    if (!created) {
      throw new BadRequestException('Failed to create elective group');
    }

    this.logger.info('Elective group created', {
      operation: 'electives.create',
      resource: 'elective_group',
      resourceId: created.id,
      instituteId,
    });

    return this.findOne(instituteId, created.id);
  }

  async update(instituteId: string, id: string, dto: UpdateElectiveGroupDto) {
    await this.findOne(instituteId, id);

    await this.database.db
      .update(electiveGroups)
      .set({
        name: dto.name,
        maxChoices: dto.maxChoices,
        choiceWindowOpen: dto.choiceWindowOpen ? new Date(dto.choiceWindowOpen) : undefined,
        choiceWindowClose: dto.choiceWindowClose ? new Date(dto.choiceWindowClose) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(electiveGroups.id, id));

    return this.findOne(instituteId, id);
  }

  async addOption(instituteId: string, groupId: string, dto: CreateElectiveOptionDto) {
    await this.findOne(instituteId, groupId);

    const [subject] = await this.database.db
      .select({ id: subjects.id })
      .from(subjects)
      .where(and(eq(subjects.id, dto.subjectId), eq(subjects.instituteId, instituteId)))
      .limit(1);

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const [existing] = await this.database.db
      .select({ id: electiveOptions.id })
      .from(electiveOptions)
      .where(and(eq(electiveOptions.electiveGroupId, groupId), eq(electiveOptions.subjectId, dto.subjectId)))
      .limit(1);

    if (existing) {
      throw new ConflictException('Subject is already an option in this group');
    }

    const [created] = await this.database.db
      .insert(electiveOptions)
      .values({
        instituteId,
        electiveGroupId: groupId,
        subjectId: dto.subjectId,
        seatsLimit: dto.seatsLimit,
      })
      .returning({ id: electiveOptions.id });

    if (!created) {
      throw new BadRequestException('Failed to add elective option');
    }

    return this.getOption(instituteId, created.id);
  }

  async removeOption(instituteId: string, groupId: string, optionId: string): Promise<void> {
    const option = await this.getOption(instituteId, optionId, groupId);

    if (option.seatsConfirmed > 0) {
      throw new ConflictException('Cannot remove an option with confirmed choices');
    }

    await this.database.db.delete(electiveOptions).where(eq(electiveOptions.id, optionId));
  }

  async listOptions(instituteId: string, groupId: string) {
    await this.findOne(instituteId, groupId);

    return this.optionsBreakdown(groupId);
  }

  async seatMatrix(instituteId: string, groupId: string) {
    await this.findOne(instituteId, groupId);

    const options = await this.optionsBreakdown(groupId);

    const pending = await this.database.db
      .select({
        optionId: electiveChoices.electiveOptionId,
        count: sql<number>`count(*)`,
      })
      .from(electiveChoices)
      .where(and(eq(electiveChoices.electiveGroupId, groupId), eq(electiveChoices.status, 'PENDING')))
      .groupBy(electiveChoices.electiveOptionId);

    const pendingByOption = new Map(pending.map((row) => [row.optionId, Number(row.count)]));

    return options.map((option) => ({
      ...option,
      pendingChoices: pendingByOption.get(option.id) ?? 0,
    }));
  }

  async unsubmitted(instituteId: string, groupId: string) {
    const group = await this.findOne(instituteId, groupId);

    const eligibleFilters = [
      eq(studentEnrollments.instituteId, instituteId),
      eq(studentEnrollments.semesterId, group.semesterId),
      eq(studentEnrollments.active, true),
      eq(batches.programId, group.programId),
      isNull(sections.deletedAt),
      isNull(students.deletedAt),
    ];

    if (group.branchId) {
      eligibleFilters.push(eq(sections.branchId, group.branchId));
    }

    const eligible = await this.database.db
      .select({
        id: students.id,
        rollNumber: students.rollNumber,
        name: students.name,
        sectionId: sections.id,
      })
      .from(studentEnrollments)
      .innerJoin(students, eq(students.id, studentEnrollments.studentId))
      .innerJoin(sections, eq(sections.id, studentEnrollments.sectionId))
      .innerJoin(batches, eq(batches.id, sections.batchId))
      .where(and(...eligibleFilters));

    const chosen = await this.database.db
      .select({ studentId: electiveChoices.studentId })
      .from(electiveChoices)
      .where(eq(electiveChoices.electiveGroupId, groupId));

    const chosenIds = new Set(chosen.map((row) => row.studentId));

    return eligible.filter((student) => !chosenIds.has(student.id));
  }

  async confirmAll(instituteId: string, groupId: string) {
    const group = await this.findOne(instituteId, groupId);

    return this.database.db.transaction(async (tx) => {
      const pending = await tx
        .select()
        .from(electiveChoices)
        .where(and(eq(electiveChoices.electiveGroupId, groupId), eq(electiveChoices.status, 'PENDING')));

      const byOption = new Map<string, typeof pending>();

      for (const choice of pending) {
        const list = byOption.get(choice.electiveOptionId) ?? [];
        list.push(choice);
        byOption.set(choice.electiveOptionId, list);
      }

      let confirmedCount = 0;

      for (const [optionId, choices] of byOption) {
        const [option] = await tx.select().from(electiveOptions).where(eq(electiveOptions.id, optionId)).limit(1);

        if (!option) {
          continue;
        }

        const [activeSyllabus] = await tx
          .select({ id: syllabi.id })
          .from(syllabi)
          .where(and(eq(syllabi.subjectId, option.subjectId), eq(syllabi.isActive, true)))
          .limit(1);

        if (!activeSyllabus) {
          throw new BadRequestException(`Subject has no active syllabus: ${option.subjectId}`);
        }

        let [offering] = await tx
          .select({ id: courseOfferings.id })
          .from(courseOfferings)
          .where(
            and(
              eq(courseOfferings.subjectId, option.subjectId),
              eq(courseOfferings.electiveGroupId, groupId),
              eq(courseOfferings.semesterId, group.semesterId),
            ),
          )
          .limit(1);

        if (!offering) {
          const [created] = await tx
            .insert(courseOfferings)
            .values({
              instituteId,
              subjectId: option.subjectId,
              syllabusId: activeSyllabus.id,
              semesterId: group.semesterId,
              electiveGroupId: groupId,
            })
            .returning({ id: courseOfferings.id });

          offering = created;
        }

        if (!offering) {
          throw new BadRequestException('Failed to create elective offering');
        }

        for (const choice of choices) {
          await tx
            .update(electiveChoices)
            .set({
              status: 'CONFIRMED',
              offeringId: offering.id,
              confirmedAt: new Date(),
            })
            .where(eq(electiveChoices.id, choice.id));
        }

        confirmedCount += choices.length;

        await tx
          .update(electiveOptions)
          .set({
            seatsConfirmed: sql`${electiveOptions.seatsConfirmed} + ${choices.length}`,
          })
          .where(eq(electiveOptions.id, optionId));
      }

      this.logger.info('Elective group confirmed', {
        operation: 'electives.confirm-all',
        resource: 'elective_group',
        resourceId: groupId,
        instituteId,
        confirmedCount,
      });

      return { groupId, confirmedCount };
    });
  }

  private async optionsBreakdown(groupId: string) {
    const rows = await this.database.db
      .select({
        id: electiveOptions.id,
        subjectId: electiveOptions.subjectId,
        subjectCode: subjects.code,
        subjectName: subjects.name,
        seatsLimit: electiveOptions.seatsLimit,
        seatsConfirmed: electiveOptions.seatsConfirmed,
      })
      .from(electiveOptions)
      .innerJoin(subjects, eq(subjects.id, electiveOptions.subjectId))
      .where(eq(electiveOptions.electiveGroupId, groupId));

    return rows.map((row) => ({
      ...row,
      seatsAvailable: row.seatsLimit === null ? null : row.seatsLimit - row.seatsConfirmed,
    }));
  }

  private async getOption(instituteId: string, optionId: string, groupId?: string) {
    const filters = [eq(electiveOptions.id, optionId), eq(electiveOptions.instituteId, instituteId)];

    if (groupId) {
      filters.push(eq(electiveOptions.electiveGroupId, groupId));
    }

    const [option] = await this.database.db
      .select()
      .from(electiveOptions)
      .where(and(...filters))
      .limit(1);

    if (!option) {
      throw new NotFoundException('Elective option not found');
    }

    return option;
  }
}

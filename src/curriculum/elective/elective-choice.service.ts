import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { and, eq } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import { electiveChoices, electiveGroups, electiveOptions, students, subjects } from '../../database/schema';
import { CreateElectiveChoiceDto, ListElectiveChoicesQueryDto, UpdateElectiveChoiceDto } from './dto/elective-choice.dto';

@Injectable()
export class ElectiveChoiceService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async findAll(instituteId: string, query: ListElectiveChoicesQueryDto) {
    const filters = [eq(electiveChoices.instituteId, instituteId)];

    if (query.studentId) {
      filters.push(eq(electiveChoices.studentId, query.studentId));
    }

    if (query.electiveGroupId) {
      filters.push(eq(electiveChoices.electiveGroupId, query.electiveGroupId));
    }

    let rows = await this.database.db
      .select({
        id: electiveChoices.id,
        studentId: electiveChoices.studentId,
        studentName: students.name,
        rollNumber: students.rollNumber,
        electiveGroupId: electiveChoices.electiveGroupId,
        electiveOptionId: electiveChoices.electiveOptionId,
        subjectId: electiveOptions.subjectId,
        subjectCode: subjects.code,
        subjectName: subjects.name,
        offeringId: electiveChoices.offeringId,
        status: electiveChoices.status,
        chosenAt: electiveChoices.chosenAt,
        confirmedAt: electiveChoices.confirmedAt,
        semesterId: electiveGroups.semesterId,
      })
      .from(electiveChoices)
      .innerJoin(students, eq(students.id, electiveChoices.studentId))
      .innerJoin(electiveOptions, eq(electiveOptions.id, electiveChoices.electiveOptionId))
      .innerJoin(subjects, eq(subjects.id, electiveOptions.subjectId))
      .innerJoin(electiveGroups, eq(electiveGroups.id, electiveChoices.electiveGroupId))
      .where(and(...filters));

    if (query.semesterId) {
      rows = rows.filter((row) => row.semesterId === query.semesterId);
    }

    return rows;
  }

  async submitChoice(instituteId: string, dto: CreateElectiveChoiceDto) {
    const [group] = await this.database.db
      .select()
      .from(electiveGroups)
      .where(and(eq(electiveGroups.id, dto.electiveGroupId), eq(electiveGroups.instituteId, instituteId)))
      .limit(1);

    if (!group) {
      throw new NotFoundException('Elective group not found');
    }

    if (!group.isActive) {
      throw new BadRequestException('Elective group is not active');
    }

    const now = new Date();

    if (group.choiceWindowOpen && now < group.choiceWindowOpen) {
      throw new BadRequestException('Choice window has not opened yet');
    }

    if (group.choiceWindowClose && now > group.choiceWindowClose) {
      throw new BadRequestException('Choice window has closed');
    }

    const [option] = await this.database.db
      .select()
      .from(electiveOptions)
      .where(and(eq(electiveOptions.id, dto.electiveOptionId), eq(electiveOptions.electiveGroupId, dto.electiveGroupId)))
      .limit(1);

    if (!option) {
      throw new NotFoundException('Elective option not found in this group');
    }

    if (option.seatsLimit !== null && option.seatsConfirmed >= option.seatsLimit) {
      throw new ConflictException('No seats available for this option');
    }

    const [confirmedExisting] = await this.database.db
      .select({ id: electiveChoices.id })
      .from(electiveChoices)
      .where(
        and(
          eq(electiveChoices.studentId, dto.studentId),
          eq(electiveChoices.electiveGroupId, dto.electiveGroupId),
          eq(electiveChoices.status, 'CONFIRMED'),
        ),
      )
      .limit(1);

    if (confirmedExisting) {
      throw new ConflictException('Choice is already confirmed for this group and cannot be resubmitted');
    }

    const [pendingExisting] = await this.database.db
      .select()
      .from(electiveChoices)
      .where(and(eq(electiveChoices.studentId, dto.studentId), eq(electiveChoices.electiveGroupId, dto.electiveGroupId)))
      .limit(1);

    if (pendingExisting) {
      await this.database.db
        .update(electiveChoices)
        .set({
          electiveOptionId: dto.electiveOptionId,
          changedFrom: pendingExisting.electiveOptionId,
          status: 'CHANGED',
          chosenAt: new Date(),
        })
        .where(eq(electiveChoices.id, pendingExisting.id));

      return this.findOne(instituteId, pendingExisting.id);
    }

    const [created] = await this.database.db
      .insert(electiveChoices)
      .values({
        instituteId,
        studentId: dto.studentId,
        electiveGroupId: dto.electiveGroupId,
        electiveOptionId: dto.electiveOptionId,
        status: 'PENDING',
      })
      .returning({ id: electiveChoices.id });

    if (!created) {
      throw new BadRequestException('Failed to submit elective choice');
    }

    this.logger.info('Elective choice submitted', {
      operation: 'elective-choices.create',
      resource: 'elective_choice',
      resourceId: created.id,
      instituteId,
    });

    return this.findOne(instituteId, created.id);
  }

  async updateChoice(instituteId: string, id: string, dto: UpdateElectiveChoiceDto) {
    const choice = await this.requireOne(instituteId, id);

    if (choice.status === 'CONFIRMED' || choice.status === 'WITHDRAWN') {
      throw new BadRequestException('Cannot change a confirmed or withdrawn choice');
    }

    const [group] = await this.database.db.select().from(electiveGroups).where(eq(electiveGroups.id, choice.electiveGroupId)).limit(1);

    const now = new Date();

    if (group?.choiceWindowClose && now > group.choiceWindowClose) {
      throw new BadRequestException('Choice window has closed');
    }

    const [option] = await this.database.db
      .select()
      .from(electiveOptions)
      .where(and(eq(electiveOptions.id, dto.electiveOptionId), eq(electiveOptions.electiveGroupId, choice.electiveGroupId)))
      .limit(1);

    if (!option) {
      throw new NotFoundException('Elective option not found in this group');
    }

    await this.database.db
      .update(electiveChoices)
      .set({
        electiveOptionId: dto.electiveOptionId,
        changedFrom: choice.electiveOptionId,
        status: 'CHANGED',
        chosenAt: new Date(),
      })
      .where(eq(electiveChoices.id, id));

    return this.findOne(instituteId, id);
  }

  async withdraw(instituteId: string, id: string) {
    const choice = await this.requireOne(instituteId, id);

    if (choice.status === 'CONFIRMED') {
      throw new BadRequestException('Cannot withdraw a confirmed choice');
    }

    await this.database.db.update(electiveChoices).set({ status: 'WITHDRAWN' }).where(eq(electiveChoices.id, id));

    return this.findOne(instituteId, id);
  }

  private async requireOne(instituteId: string, id: string) {
    const [choice] = await this.database.db
      .select()
      .from(electiveChoices)
      .where(and(eq(electiveChoices.id, id), eq(electiveChoices.instituteId, instituteId)))
      .limit(1);

    if (!choice) {
      throw new NotFoundException('Elective choice not found');
    }

    return choice;
  }

  private async findOne(instituteId: string, id: string) {
    const [row] = await this.findAll(instituteId, {}).then((rows) => rows.filter((r) => r.id === id));

    if (!row) {
      throw new NotFoundException('Elective choice not found');
    }

    return row;
  }
}

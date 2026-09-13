import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { and, eq } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import { syllabi, syllabusUnits } from '../../database/schema';
import { CreateSyllabusUnitDto, UpdateSyllabusUnitDto } from './dto/syllabus-unit.dto';

@Injectable()
export class SyllabusUnitService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async findOne(instituteId: string, id: string) {
    const [unit] = await this.database.db
      .select()
      .from(syllabusUnits)
      .where(and(eq(syllabusUnits.id, id), eq(syllabusUnits.instituteId, instituteId)))
      .limit(1);

    if (!unit) {
      throw new NotFoundException('Syllabus unit not found');
    }

    return unit;
  }

  async create(instituteId: string, syllabusId: string, dto: CreateSyllabusUnitDto) {
    const [syllabus] = await this.database.db
      .select({ id: syllabi.id })
      .from(syllabi)
      .where(and(eq(syllabi.id, syllabusId), eq(syllabi.instituteId, instituteId)))
      .limit(1);

    if (!syllabus) {
      throw new NotFoundException('Syllabus not found');
    }

    const [existing] = await this.database.db
      .select({ id: syllabusUnits.id })
      .from(syllabusUnits)
      .where(and(eq(syllabusUnits.syllabusId, syllabusId), eq(syllabusUnits.unitNumber, dto.unitNumber)))
      .limit(1);

    if (existing) {
      throw new ConflictException('Unit number already exists for this syllabus');
    }

    const [created] = await this.database.db
      .insert(syllabusUnits)
      .values({
        instituteId,
        syllabusId,
        unitNumber: dto.unitNumber,
        title: dto.title,
        topics: dto.topics,
        hours: dto.hours,
        weightage: dto.weightage,
      })
      .returning({ id: syllabusUnits.id });

    if (!created) {
      throw new BadRequestException('Failed to create syllabus unit');
    }

    this.logger.info('Syllabus unit created', {
      operation: 'syllabus.units.create',
      resource: 'syllabus_unit',
      resourceId: created.id,
      instituteId,
    });

    return this.findOne(instituteId, created.id);
  }

  async update(instituteId: string, id: string, dto: UpdateSyllabusUnitDto) {
    await this.findOne(instituteId, id);

    await this.database.db
      .update(syllabusUnits)
      .set({
        unitNumber: dto.unitNumber,
        title: dto.title,
        topics: dto.topics,
        hours: dto.hours,
        weightage: dto.weightage,
      })
      .where(eq(syllabusUnits.id, id));

    return this.findOne(instituteId, id);
  }

  async remove(instituteId: string, id: string): Promise<void> {
    await this.findOne(instituteId, id);

    await this.database.db.delete(syllabusUnits).where(eq(syllabusUnits.id, id));

    this.logger.info('Syllabus unit removed', {
      operation: 'syllabus.units.delete',
      resource: 'syllabus_unit',
      resourceId: id,
      instituteId,
    });
  }
}

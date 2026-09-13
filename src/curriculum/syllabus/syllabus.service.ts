import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { and, asc, eq } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import { subjects, syllabi, syllabusUnits } from '../../database/schema';
import { CreateSyllabusDto, ListSyllabiQueryDto, UpdateSyllabusDto } from './dto/syllabus.dto';

@Injectable()
export class SyllabusService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async findAll(instituteId: string, query: ListSyllabiQueryDto) {
    const filters = [eq(syllabi.instituteId, instituteId)];

    if (query.subjectId) {
      filters.push(eq(syllabi.subjectId, query.subjectId));
    }

    if (query.isActive !== undefined) {
      filters.push(eq(syllabi.isActive, query.isActive));
    }

    return this.database.db
      .select()
      .from(syllabi)
      .where(and(...filters))
      .orderBy(asc(syllabi.regulationYear));
  }

  async findOne(instituteId: string, id: string) {
    const [syllabus] = await this.database.db
      .select()
      .from(syllabi)
      .where(and(eq(syllabi.id, id), eq(syllabi.instituteId, instituteId)))
      .limit(1);

    if (!syllabus) {
      throw new NotFoundException('Syllabus not found');
    }

    const units = await this.database.db
      .select()
      .from(syllabusUnits)
      .where(eq(syllabusUnits.syllabusId, id))
      .orderBy(asc(syllabusUnits.unitNumber));

    return { ...syllabus, units };
  }

  async create(instituteId: string, dto: CreateSyllabusDto) {
    const [subject] = await this.database.db
      .select({ id: subjects.id })
      .from(subjects)
      .where(and(eq(subjects.id, dto.subjectId), eq(subjects.instituteId, instituteId)))
      .limit(1);

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const [existing] = await this.database.db
      .select({ id: syllabi.id })
      .from(syllabi)
      .where(and(eq(syllabi.subjectId, dto.subjectId), eq(syllabi.version, dto.version)))
      .limit(1);

    if (existing) {
      throw new ConflictException('Syllabus version already exists');
    }

    const [created] = await this.database.db
      .insert(syllabi)
      .values({
        instituteId,
        subjectId: dto.subjectId,
        version: dto.version,
        regulationYear: dto.regulationYear,
        description: dto.description,
        outcomes: dto.outcomes,
        references: dto.references,
        totalHours: dto.totalHours,
      })
      .returning({ id: syllabi.id });

    if (!created) {
      throw new BadRequestException('Failed to create syllabus');
    }

    this.logger.info('Syllabus created', {
      operation: 'syllabus.create',
      resource: 'syllabus',
      resourceId: created.id,
      instituteId,
    });

    return this.findOne(instituteId, created.id);
  }

  async update(instituteId: string, id: string, dto: UpdateSyllabusDto) {
    await this.findOne(instituteId, id);

    await this.database.db
      .update(syllabi)
      .set({
        description: dto.description,
        outcomes: dto.outcomes,
        references: dto.references,
        totalHours: dto.totalHours,
        updatedAt: new Date(),
      })
      .where(eq(syllabi.id, id));

    return this.findOne(instituteId, id);
  }

  async activate(instituteId: string, id: string) {
    await this.database.db.transaction(async (tx) => {
      const [syllabus] = await tx
        .select({ id: syllabi.id, subjectId: syllabi.subjectId })
        .from(syllabi)
        .where(and(eq(syllabi.id, id), eq(syllabi.instituteId, instituteId)))
        .limit(1);

      if (!syllabus) {
        throw new NotFoundException('Syllabus not found');
      }

      await tx.update(syllabi).set({ isActive: false, updatedAt: new Date() }).where(eq(syllabi.subjectId, syllabus.subjectId));

      await tx.update(syllabi).set({ isActive: true, updatedAt: new Date() }).where(eq(syllabi.id, id));
    });

    this.logger.info('Syllabus activated', {
      operation: 'syllabus.activate',
      resource: 'syllabus',
      resourceId: id,
      instituteId,
    });

    return this.findOne(instituteId, id);
  }
}

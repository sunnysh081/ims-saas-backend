import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import { batches, programs, subjects, syllabi, syllabusUnits } from '../../database/schema';
import { CreateSyllabusDto, ListSyllabiQueryDto, SyllabusUnitDto, UpdateSyllabusDto } from './dto/syllabus.dto';

const syllabusSelection = {
  id: syllabi.id,
  batchId: syllabi.batchId,
  batchStartYear: batches.startYear,
  batchEndYear: batches.endYear,
  subjectId: syllabi.subjectId,
  subjectName: subjects.name,
  subjectCode: subjects.code,
  programId: batches.programId,
  programName: programs.name,
  programCode: programs.code,
  title: syllabi.title,
  isActive: syllabi.isActive,
  unitsCount: sql<number>`(
    select count(*)::int from ${syllabusUnits}
    where ${syllabusUnits.syllabusId} = ${syllabi.id}
  )`,
  createdAt: syllabi.createdAt,
  updatedAt: syllabi.updatedAt,
};

@Injectable()
export class SyllabiService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async findAll(instituteId: string, query: ListSyllabiQueryDto) {
    const filters = [eq(syllabi.instituteId, instituteId), isNull(syllabi.deletedAt)];

    if (query.batchId) {
      filters.push(eq(syllabi.batchId, query.batchId));
    }

    if (query.subjectId) {
      filters.push(eq(syllabi.subjectId, query.subjectId));
    }

    if (query.programId) {
      filters.push(eq(batches.programId, query.programId));
    }

    return this.database.db
      .select(syllabusSelection)
      .from(syllabi)
      .innerJoin(batches, eq(batches.id, syllabi.batchId))
      .innerJoin(subjects, eq(subjects.id, syllabi.subjectId))
      .innerJoin(programs, eq(programs.id, batches.programId))
      .where(and(...filters))
      .orderBy(asc(subjects.name));
  }

  async create(instituteId: string, dto: CreateSyllabusDto) {
    const batch = await this.requireBatch(instituteId, dto.batchId);
    await this.requireSubjectInProgram(instituteId, dto.subjectId, batch.programId);
    await this.assertUniquePairing(dto.batchId, dto.subjectId);

    const syllabusId = await this.database.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(syllabi)
        .values({
          instituteId,
          batchId: dto.batchId,
          subjectId: dto.subjectId,
          title: dto.title,
          isActive: dto.isActive ?? true,
        })
        .returning({ id: syllabi.id });

      if (!created) {
        throw new BadRequestException('Failed to create syllabus');
      }

      if (dto.units?.length) {
        await this.insertUnits(tx, created.id, dto.units);
      }

      return created.id;
    });

    this.logger.info('Syllabus created', {
      operation: 'syllabi.create',
      resource: 'syllabus',
      resourceId: syllabusId,
      instituteId,
    });

    return this.findOne(instituteId, syllabusId);
  }

  async findOne(instituteId: string, id: string) {
    const [syllabus] = await this.database.db
      .select(syllabusSelection)
      .from(syllabi)
      .innerJoin(batches, eq(batches.id, syllabi.batchId))
      .innerJoin(subjects, eq(subjects.id, syllabi.subjectId))
      .innerJoin(programs, eq(programs.id, batches.programId))
      .where(and(eq(syllabi.id, id), eq(syllabi.instituteId, instituteId), isNull(syllabi.deletedAt)))
      .limit(1);

    if (!syllabus) {
      throw new NotFoundException('Syllabus not found');
    }

    const units = await this.database.db
      .select({
        id: syllabusUnits.id,
        unitNumber: syllabusUnits.unitNumber,
        title: syllabusUnits.title,
        topics: syllabusUnits.topics,
        hours: syllabusUnits.hours,
      })
      .from(syllabusUnits)
      .where(eq(syllabusUnits.syllabusId, id))
      .orderBy(asc(syllabusUnits.sortOrder));

    return { ...syllabus, units };
  }

  async update(instituteId: string, id: string, dto: UpdateSyllabusDto) {
    await this.findOne(instituteId, id);

    await this.database.db.transaction(async (tx) => {
      await tx
        .update(syllabi)
        .set({
          title: dto.title,
          isActive: dto.isActive,
          updatedAt: new Date(),
        })
        .where(eq(syllabi.id, id));

      if (dto.units) {
        await tx.delete(syllabusUnits).where(eq(syllabusUnits.syllabusId, id));
        await this.insertUnits(tx, id, dto.units);
      }
    });

    return this.findOne(instituteId, id);
  }

  private async insertUnits(tx: DatabaseService['db'], syllabusId: string, units: SyllabusUnitDto[]) {
    await tx.insert(syllabusUnits).values(
      units.map((unit, index) => ({
        syllabusId,
        unitNumber: unit.unitNumber,
        title: unit.title,
        topics: unit.topics,
        hours: unit.hours,
        sortOrder: index,
      })),
    );
  }

  private async requireBatch(instituteId: string, batchId: string) {
    const [batch] = await this.database.db
      .select({
        id: batches.id,
        programId: batches.programId,
      })
      .from(batches)
      .where(and(eq(batches.id, batchId), eq(batches.instituteId, instituteId), isNull(batches.deletedAt)))
      .limit(1);

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    return batch;
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

  private async assertUniquePairing(batchId: string, subjectId: string) {
    const [existing] = await this.database.db
      .select({ id: syllabi.id })
      .from(syllabi)
      .where(and(eq(syllabi.batchId, batchId), eq(syllabi.subjectId, subjectId), isNull(syllabi.deletedAt)))
      .limit(1);

    if (existing) {
      throw new ConflictException('A syllabus already exists for this subject in this batch');
    }
  }
}

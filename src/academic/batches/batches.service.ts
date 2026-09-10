import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { and, desc, eq, isNull } from 'drizzle-orm';

import { AcademicLifecycleService } from '../academic-lifecycle.service';
import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import { batches, programs } from '../../database/schema';
import {
  CreateBatchDto,
  ListBatchesQueryDto,
  SplitBranchesDto,
  UpdateBatchDto,
} from './dto/batch.dto';

@Injectable()
export class BatchesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
    private readonly lifecycle: AcademicLifecycleService,
  ) {}

  async findAll(instituteId: string, query: ListBatchesQueryDto) {
    const filters = [
      eq(batches.instituteId, instituteId),
      isNull(batches.deletedAt),
    ];

    if (query.programId) {
      filters.push(eq(batches.programId, query.programId));
    }

    if (query.isActive !== undefined) {
      filters.push(eq(batches.isActive, query.isActive));
    }

    return this.database.db
      .select({
        id: batches.id,
        programId: batches.programId,
        programName: programs.name,
        programCode: programs.code,
        startYear: batches.startYear,
        endYear: batches.endYear,
        isCombined: batches.isCombined,
        isActive: batches.isActive,
        createdAt: batches.createdAt,
        updatedAt: batches.updatedAt,
      })
      .from(batches)
      .innerJoin(programs, eq(programs.id, batches.programId))
      .where(and(...filters))
      .orderBy(desc(batches.startYear));
  }

  async findOne(instituteId: string, id: string) {
    const [batch] = await this.database.db
      .select({
        id: batches.id,
        programId: batches.programId,
        programName: programs.name,
        programCode: programs.code,
        startYear: batches.startYear,
        endYear: batches.endYear,
        isCombined: batches.isCombined,
        isActive: batches.isActive,
        createdAt: batches.createdAt,
        updatedAt: batches.updatedAt,
      })
      .from(batches)
      .innerJoin(programs, eq(programs.id, batches.programId))
      .where(
        and(
          eq(batches.id, id),
          eq(batches.instituteId, instituteId),
          isNull(batches.deletedAt),
        ),
      )
      .limit(1);

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    return batch;
  }

  async create(instituteId: string, dto: CreateBatchDto) {
    await this.lifecycle.requireProgram(instituteId, dto.programId);

    if (dto.endYear <= dto.startYear) {
      throw new BadRequestException('endYear must be greater than startYear');
    }

    const [created] = await this.database.db
      .insert(batches)
      .values({
        instituteId,
        programId: dto.programId,
        startYear: dto.startYear,
        endYear: dto.endYear,
        isCombined: dto.isCombined ?? true,
        isActive: dto.isActive ?? true,
      })
      .returning({
        id: batches.id,
      });

    if (!created) {
      throw new BadRequestException('Failed to create batch');
    }

    this.logger.info('Batch created', {
      operation: 'batches.create',
      resource: 'batch',
      resourceId: created.id,
      instituteId,
    });

    return this.findOne(instituteId, created.id);
  }

  async update(instituteId: string, id: string, dto: UpdateBatchDto) {
    const batch = await this.findOne(instituteId, id);

    const startYear = dto.startYear ?? batch.startYear;
    const endYear = dto.endYear ?? batch.endYear;

    if (endYear <= startYear) {
      throw new BadRequestException('endYear must be greater than startYear');
    }

    await this.database.db
      .update(batches)
      .set({
        startYear: dto.startYear,
        endYear: dto.endYear,
        isCombined: dto.isCombined,
        isActive: dto.isActive,
        updatedAt: new Date(),
      })
      .where(eq(batches.id, id));

    return this.findOne(instituteId, id);
  }

  splitBranches(
    instituteId: string,
    id: string,
    dto: SplitBranchesDto,
    changedBy: string,
  ) {
    return this.lifecycle.splitBranches(instituteId, id, dto.splits, changedBy);
  }
}

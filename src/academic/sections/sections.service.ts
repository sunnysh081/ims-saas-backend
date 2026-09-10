import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { and, eq, isNull } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import { batches, branches, sections } from '../../database/schema';
import {
  CreateSectionDto,
  ListSectionsQueryDto,
  UpdateSectionDto,
} from './dto/section.dto';

@Injectable()
export class SectionsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async findAll(instituteId: string, query: ListSectionsQueryDto) {
    const filters = [
      eq(sections.instituteId, instituteId),
      isNull(sections.deletedAt),
    ];

    if (query.batchId) {
      filters.push(eq(sections.batchId, query.batchId));
    }

    if (query.branchId) {
      filters.push(eq(sections.branchId, query.branchId));
    }

    return this.database.db
      .select({
        id: sections.id,
        batchId: sections.batchId,
        name: sections.name,
        branchId: sections.branchId,
        branchName: branches.name,
        capacity: sections.capacity,
        createdAt: sections.createdAt,
        updatedAt: sections.updatedAt,
      })
      .from(sections)
      .leftJoin(branches, eq(branches.id, sections.branchId))
      .where(and(...filters))
      .orderBy(sections.name);
  }

  async findOne(instituteId: string, id: string) {
    const [section] = await this.database.db
      .select({
        id: sections.id,
        batchId: sections.batchId,
        name: sections.name,
        branchId: sections.branchId,
        capacity: sections.capacity,
      })
      .from(sections)
      .where(
        and(
          eq(sections.id, id),
          eq(sections.instituteId, instituteId),
          isNull(sections.deletedAt),
        ),
      )
      .limit(1);

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    return section;
  }

  async create(instituteId: string, dto: CreateSectionDto) {
    await this.assertBatch(instituteId, dto.batchId);

    if (dto.branchId) {
      await this.assertBranch(instituteId, dto.branchId);
    }

    const [created] = await this.database.db
      .insert(sections)
      .values({
        instituteId,
        batchId: dto.batchId,
        name: dto.name,
        branchId: dto.branchId,
        capacity: dto.capacity,
      })
      .returning({
        id: sections.id,
      });

    if (!created) {
      throw new BadRequestException('Failed to create section');
    }

    this.logger.info('Section created', {
      operation: 'sections.create',
      resource: 'section',
      resourceId: created.id,
      instituteId,
    });

    return this.findOne(instituteId, created.id);
  }

  async update(instituteId: string, id: string, dto: UpdateSectionDto) {
    await this.findOne(instituteId, id);

    if (dto.branchId) {
      await this.assertBranch(instituteId, dto.branchId);
    }

    await this.database.db
      .update(sections)
      .set({
        name: dto.name,
        branchId: dto.branchId,
        capacity: dto.capacity,
        updatedAt: new Date(),
      })
      .where(eq(sections.id, id));

    return this.findOne(instituteId, id);
  }

  private async assertBatch(instituteId: string, batchId: string) {
    const [batch] = await this.database.db
      .select({
        id: batches.id,
      })
      .from(batches)
      .where(
        and(
          eq(batches.id, batchId),
          eq(batches.instituteId, instituteId),
          isNull(batches.deletedAt),
        ),
      )
      .limit(1);

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }
  }

  private async assertBranch(instituteId: string, branchId: string) {
    const [branch] = await this.database.db
      .select({
        id: branches.id,
      })
      .from(branches)
      .where(
        and(
          eq(branches.id, branchId),
          eq(branches.instituteId, instituteId),
          isNull(branches.deletedAt),
        ),
      )
      .limit(1);

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
  }
}

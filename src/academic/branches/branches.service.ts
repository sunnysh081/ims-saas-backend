import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { and, eq, isNull } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import { branches } from '../../database/schema';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async findAll(instituteId: string) {
    return this.database.db
      .select({
        id: branches.id,
        name: branches.name,
        code: branches.code,
        createdAt: branches.createdAt,
        updatedAt: branches.updatedAt,
      })
      .from(branches)
      .where(
        and(eq(branches.instituteId, instituteId), isNull(branches.deletedAt)),
      )
      .orderBy(branches.name);
  }

  async create(instituteId: string, dto: CreateBranchDto) {
    const code = dto.code.toUpperCase();

    await this.assertUniqueCode(instituteId, code);

    const [created] = await this.database.db
      .insert(branches)
      .values({
        instituteId,
        name: dto.name,
        code,
      })
      .returning({
        id: branches.id,
      });

    if (!created) {
      throw new BadRequestException('Failed to create branch');
    }

    this.logger.info('Branch created', {
      operation: 'branches.create',
      resource: 'branch',
      resourceId: created.id,
      instituteId,
    });

    return this.findOne(instituteId, created.id);
  }

  async findOne(instituteId: string, id: string) {
    const [branch] = await this.database.db
      .select({
        id: branches.id,
        name: branches.name,
        code: branches.code,
        createdAt: branches.createdAt,
        updatedAt: branches.updatedAt,
      })
      .from(branches)
      .where(
        and(
          eq(branches.id, id),
          eq(branches.instituteId, instituteId),
          isNull(branches.deletedAt),
        ),
      )
      .limit(1);

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return branch;
  }

  async update(instituteId: string, id: string, dto: UpdateBranchDto) {
    await this.findOne(instituteId, id);

    const code = dto.code?.toUpperCase();

    if (code) {
      await this.assertUniqueCode(instituteId, code, id);
    }

    await this.database.db
      .update(branches)
      .set({
        name: dto.name,
        code,
        updatedAt: new Date(),
      })
      .where(eq(branches.id, id));

    return this.findOne(instituteId, id);
  }

  private async assertUniqueCode(
    instituteId: string,
    code: string,
    excludeId?: string,
  ) {
    const [existing] = await this.database.db
      .select({
        id: branches.id,
      })
      .from(branches)
      .where(
        and(
          eq(branches.instituteId, instituteId),
          eq(branches.code, code),
          isNull(branches.deletedAt),
        ),
      )
      .limit(1);

    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Branch code already exists');
    }
  }
}

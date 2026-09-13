import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { and, eq, isNull } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import { branches, programs } from '../../database/schema';
import {
  CreateBranchDto,
  ListBranchesQueryDto,
  UpdateBranchDto,
} from './dto/branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async findAll(instituteId: string, query: ListBranchesQueryDto = {}) {
    const filters = [
      eq(branches.instituteId, instituteId),
      isNull(branches.deletedAt),
    ];

    if (query.programId) {
      filters.push(eq(branches.programId, query.programId));
    }

    return this.database.db
      .select({
        id: branches.id,
        programId: branches.programId,
        programName: programs.name,
        programCode: programs.code,
        name: branches.name,
        code: branches.code,
        createdAt: branches.createdAt,
        updatedAt: branches.updatedAt,
      })
      .from(branches)
      .innerJoin(programs, eq(programs.id, branches.programId))
      .where(and(...filters))
      .orderBy(programs.name, branches.name);
  }

  async create(instituteId: string, dto: CreateBranchDto) {
    await this.assertProgram(instituteId, dto.programId);

    const code = dto.code.toUpperCase();

    await this.assertUniqueCode(dto.programId, code);

    const [created] = await this.database.db
      .insert(branches)
      .values({
        instituteId,
        programId: dto.programId,
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
        programId: branches.programId,
        programName: programs.name,
        programCode: programs.code,
        name: branches.name,
        code: branches.code,
        createdAt: branches.createdAt,
        updatedAt: branches.updatedAt,
      })
      .from(branches)
      .innerJoin(programs, eq(programs.id, branches.programId))
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
    const current = await this.findOne(instituteId, id);

    const code = dto.code?.toUpperCase();

    if (code) {
      await this.assertUniqueCode(current.programId, code, id);
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

  private async assertProgram(instituteId: string, programId: string) {
    const [program] = await this.database.db
      .select({
        id: programs.id,
      })
      .from(programs)
      .where(
        and(
          eq(programs.id, programId),
          eq(programs.instituteId, instituteId),
          isNull(programs.deletedAt),
        ),
      )
      .limit(1);

    if (!program) {
      throw new NotFoundException('Program not found');
    }
  }

  private async assertUniqueCode(
    programId: string,
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
          eq(branches.programId, programId),
          eq(branches.code, code),
          isNull(branches.deletedAt),
        ),
      )
      .limit(1);

    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Branch code already exists for this program');
    }
  }
}

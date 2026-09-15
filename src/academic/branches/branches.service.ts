import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { and, asc, eq, isNull } from 'drizzle-orm';

import { AcademicLifecycleService } from '../academic-lifecycle.service';
import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import {
  branchOutcomes,
  branches,
  instituteUsers,
  programs,
  users,
} from '../../database/schema';
import {
  BranchOutcomeDto,
  CreateBranchDto,
  ListBranchesQueryDto,
  UpdateBranchDto,
} from './dto/branch.dto';

const branchSelection = {
  id: branches.id,
  programId: branches.programId,
  programName: programs.name,
  programCode: programs.code,
  name: branches.name,
  code: branches.code,
  hodUserId: branches.hodUserId,
  hodFirstName: users.firstName,
  hodLastName: users.lastName,
  description: branches.description,
  createdAt: branches.createdAt,
  updatedAt: branches.updatedAt,
};

@Injectable()
export class BranchesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
    private readonly lifecycle: AcademicLifecycleService,
  ) {}

  async findAll(instituteId: string, query: ListBranchesQueryDto) {
    const filters = [
      eq(branches.instituteId, instituteId),
      isNull(branches.deletedAt),
    ];

    if (query.programId) {
      filters.push(eq(branches.programId, query.programId));
    }

    const rows = await this.database.db
      .select(branchSelection)
      .from(branches)
      .innerJoin(programs, eq(programs.id, branches.programId))
      .leftJoin(users, eq(users.id, branches.hodUserId))
      .where(and(...filters))
      .orderBy(branches.name);

    return rows.map((row) => this.withHod(row));
  }

  async create(instituteId: string, dto: CreateBranchDto) {
    await this.lifecycle.requireProgram(instituteId, dto.programId);

    if (dto.hodUserId) {
      await this.assertStaff(instituteId, dto.hodUserId);
    }

    const code = dto.code.toUpperCase();

    await this.assertUniqueCode(dto.programId, code);

    const branchId = await this.database.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(branches)
        .values({
          instituteId,
          programId: dto.programId,
          name: dto.name,
          code,
          hodUserId: dto.hodUserId,
          description: dto.description,
        })
        .returning({
          id: branches.id,
        });

      if (!created) {
        throw new BadRequestException('Failed to create branch');
      }

      if (dto.outcomes?.length) {
        await this.insertOutcomes(tx, created.id, dto.outcomes);
      }

      return created.id;
    });

    this.logger.info('Branch created', {
      operation: 'branches.create',
      resource: 'branch',
      resourceId: branchId,
      instituteId,
    });

    return this.findOne(instituteId, branchId);
  }

  async findOne(instituteId: string, id: string) {
    const [branch] = await this.database.db
      .select(branchSelection)
      .from(branches)
      .innerJoin(programs, eq(programs.id, branches.programId))
      .leftJoin(users, eq(users.id, branches.hodUserId))
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

    const outcomes = await this.database.db
      .select({
        id: branchOutcomes.id,
        type: branchOutcomes.type,
        code: branchOutcomes.code,
        statement: branchOutcomes.statement,
      })
      .from(branchOutcomes)
      .where(eq(branchOutcomes.branchId, id))
      .orderBy(asc(branchOutcomes.sortOrder));

    return { ...this.withHod(branch), outcomes };
  }

  async update(instituteId: string, id: string, dto: UpdateBranchDto) {
    const branch = await this.findOne(instituteId, id);

    const code = dto.code?.toUpperCase();

    if (code) {
      await this.assertUniqueCode(branch.programId, code, id);
    }

    if (dto.hodUserId) {
      await this.assertStaff(instituteId, dto.hodUserId);
    }

    await this.database.db.transaction(async (tx) => {
      await tx
        .update(branches)
        .set({
          name: dto.name,
          code,
          hodUserId: dto.hodUserId,
          description: dto.description,
          updatedAt: new Date(),
        })
        .where(eq(branches.id, id));

      if (dto.outcomes) {
        await tx.delete(branchOutcomes).where(eq(branchOutcomes.branchId, id));
        await this.insertOutcomes(tx, id, dto.outcomes);
      }
    });

    return this.findOne(instituteId, id);
  }

  private async insertOutcomes(
    tx: DatabaseService['db'],
    branchId: string,
    outcomes: BranchOutcomeDto[],
  ) {
    await tx.insert(branchOutcomes).values(
      outcomes.map((outcome, index) => ({
        branchId,
        type: outcome.type,
        code: outcome.code,
        statement: outcome.statement,
        sortOrder: index,
      })),
    );
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

  private withHod<
    T extends {
      hodFirstName: string | null;
      hodLastName: string | null;
    },
  >(row: T) {
    const { hodFirstName, hodLastName, ...branch } = row;

    return {
      ...branch,
      hodName: hodFirstName ? `${hodFirstName} ${hodLastName ?? ''}`.trim() : null,
    };
  }

  private async assertStaff(instituteId: string, userId: string) {
    const [member] = await this.database.db
      .select({
        id: instituteUsers.id,
      })
      .from(instituteUsers)
      .innerJoin(users, eq(users.id, instituteUsers.userId))
      .where(
        and(
          eq(instituteUsers.instituteId, instituteId),
          eq(instituteUsers.userId, userId),
          eq(users.isActive, true),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    if (!member) {
      throw new BadRequestException('HOD must be an active institute user');
    }
  }
}

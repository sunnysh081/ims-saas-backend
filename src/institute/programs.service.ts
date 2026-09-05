import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { and, desc, eq, isNull } from 'drizzle-orm';

import { AppLogger } from '../common/logging/logger.service';
import { DatabaseService } from '../database/database.service';
import {
  instituteUsers,
  programs,
  users,
} from '../database/schema';
import { CreateProgramDto, UpdateProgramDto } from './dto/program.dto';

@Injectable()
export class ProgramsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async listStaff(instituteId: string) {
    return this.database.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(instituteUsers)
      .innerJoin(users, eq(users.id, instituteUsers.userId))
      .where(
        and(
          eq(instituteUsers.instituteId, instituteId),
          eq(users.isActive, true),
          isNull(users.deletedAt),
        ),
      )
      .orderBy(users.firstName);
  }

  async findAll(instituteId: string) {
    return this.database.db
      .select({
        id: programs.id,
        name: programs.name,
        code: programs.code,
        type: programs.type,
        totalSemesters: programs.totalSemesters,
        durationMonths: programs.durationMonths,
        university: programs.university,
        sanctionedIntake: programs.sanctionedIntake,
        accreditation: programs.accreditation,
        departmentHeadUserId: programs.departmentHeadUserId,
        departmentHeadName: users.firstName,
        departmentHeadLastName: users.lastName,
        description: programs.description,
        isActive: programs.isActive,
        createdAt: programs.createdAt,
        updatedAt: programs.updatedAt,
      })
      .from(programs)
      .leftJoin(users, eq(users.id, programs.departmentHeadUserId))
      .where(
        and(eq(programs.instituteId, instituteId), isNull(programs.deletedAt)),
      )
      .orderBy(desc(programs.createdAt))
      .then((rows) => rows.map((row) => this.withHead(row)));
  }

  async findOne(instituteId: string, id: string) {
    const [program] = await this.database.db
      .select({
        id: programs.id,
        name: programs.name,
        code: programs.code,
        type: programs.type,
        totalSemesters: programs.totalSemesters,
        durationMonths: programs.durationMonths,
        university: programs.university,
        sanctionedIntake: programs.sanctionedIntake,
        accreditation: programs.accreditation,
        departmentHeadUserId: programs.departmentHeadUserId,
        departmentHeadName: users.firstName,
        departmentHeadLastName: users.lastName,
        description: programs.description,
        isActive: programs.isActive,
        createdAt: programs.createdAt,
        updatedAt: programs.updatedAt,
      })
      .from(programs)
      .leftJoin(users, eq(users.id, programs.departmentHeadUserId))
      .where(
        and(
          eq(programs.id, id),
          eq(programs.instituteId, instituteId),
          isNull(programs.deletedAt),
        ),
      )
      .limit(1);

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    return this.withHead(program);
  }

  async create(instituteId: string, dto: CreateProgramDto) {
    const code = dto.code.toUpperCase();

    await this.assertUniqueCode(instituteId, code);
    await this.assertStaff(instituteId, dto.departmentHeadUserId);

    const [created] = await this.database.db
      .insert(programs)
      .values({
        instituteId,
        name: dto.name,
        code,
        type: dto.type,
        totalSemesters: dto.totalSemesters,
        durationMonths: dto.durationMonths,
        university: dto.university,
        sanctionedIntake: dto.sanctionedIntake,
        accreditation: dto.accreditation,
        departmentHeadUserId: dto.departmentHeadUserId,
        description: dto.description,
        isActive: dto.isActive ?? true,
      })
      .returning({
        id: programs.id,
      });

    if (!created) {
      throw new BadRequestException('Failed to create program');
    }

    this.logger.info('Program created', {
      operation: 'programs.create',
      resource: 'program',
      resourceId: created.id,
      instituteId,
    });

    return this.findOne(instituteId, created.id);
  }

  async update(instituteId: string, id: string, dto: UpdateProgramDto) {
    await this.findOne(instituteId, id);

    const code = dto.code?.toUpperCase();

    if (code) {
      await this.assertUniqueCode(instituteId, code, id);
    }

    if (dto.departmentHeadUserId) {
      await this.assertStaff(instituteId, dto.departmentHeadUserId);
    }

    await this.database.db
      .update(programs)
      .set({
        name: dto.name,
        code,
        type: dto.type,
        totalSemesters: dto.totalSemesters,
        durationMonths: dto.durationMonths,
        university: dto.university,
        sanctionedIntake: dto.sanctionedIntake,
        accreditation: dto.accreditation,
        departmentHeadUserId: dto.departmentHeadUserId,
        description: dto.description,
        isActive: dto.isActive,
        updatedAt: new Date(),
      })
      .where(eq(programs.id, id));

    this.logger.info('Program updated', {
      operation: 'programs.update',
      resource: 'program',
      resourceId: id,
      instituteId,
    });

    return this.findOne(instituteId, id);
  }

  private withHead<
    T extends {
      departmentHeadName: string | null;
      departmentHeadLastName: string | null;
    },
  >(row: T) {
    const { departmentHeadName, departmentHeadLastName, ...program } = row;

    return {
      ...program,
      departmentHead: departmentHeadName
        ? `${departmentHeadName} ${departmentHeadLastName ?? ''}`.trim()
        : null,
    };
  }

  private async assertUniqueCode(
    instituteId: string,
    code: string,
    excludeId?: string,
  ) {
    const [existing] = await this.database.db
      .select({
        id: programs.id,
      })
      .from(programs)
      .where(
        and(
          eq(programs.instituteId, instituteId),
          eq(programs.code, code),
          isNull(programs.deletedAt),
        ),
      )
      .limit(1);

    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Program code already exists');
    }
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
      throw new BadRequestException(
        'Department head must be an active institute user',
      );
    }
  }
}

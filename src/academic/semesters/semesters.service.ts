import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { and, asc, eq } from 'drizzle-orm';

import { AcademicLifecycleService } from '../academic-lifecycle.service';
import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import { programs, semesters } from '../../database/schema';
import { CreateSemestersDto, ListSemestersQueryDto } from './dto/semester.dto';

@Injectable()
export class SemestersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
    private readonly lifecycle: AcademicLifecycleService,
  ) {}

  async findAll(instituteId: string, query: ListSemestersQueryDto) {
    const filters = [eq(semesters.instituteId, instituteId)];

    if (query.programId) {
      filters.push(eq(semesters.programId, query.programId));
    }

    return this.database.db
      .select({
        id: semesters.id,
        programId: semesters.programId,
        programName: programs.name,
        number: semesters.number,
        label: semesters.label,
        createdAt: semesters.createdAt,
      })
      .from(semesters)
      .innerJoin(programs, eq(programs.id, semesters.programId))
      .where(and(...filters))
      .orderBy(asc(semesters.programId), asc(semesters.number));
  }

  async bulkCreate(instituteId: string, dto: CreateSemestersDto) {
    const program = await this.lifecycle.requireProgram(
      instituteId,
      dto.programId,
    );

    const existing = await this.database.db
      .select({
        id: semesters.id,
      })
      .from(semesters)
      .where(
        and(
          eq(semesters.instituteId, instituteId),
          eq(semesters.programId, dto.programId),
        ),
      )
      .limit(1);

    if (existing.length) {
      throw new ConflictException('Semesters already exist for this program');
    }

    const values = Array.from({ length: program.totalSemesters }, (_, index) => {
      const number = index + 1;

      return {
        instituteId,
        programId: dto.programId,
        number,
        label: `Semester ${number}`,
      };
    });

    const created = await this.database.db
      .insert(semesters)
      .values(values)
      .returning({
        id: semesters.id,
        number: semesters.number,
        label: semesters.label,
        programId: semesters.programId,
      });

    if (!created.length) {
      throw new BadRequestException('Failed to create semesters');
    }

    this.logger.info('Semesters created', {
      operation: 'semesters.create',
      resource: 'semester',
      instituteId,
      programId: dto.programId,
      count: created.length,
    });

    return created;
  }

  async requireOne(instituteId: string, id: string) {
    const [semester] = await this.database.db
      .select()
      .from(semesters)
      .where(and(eq(semesters.id, id), eq(semesters.instituteId, instituteId)))
      .limit(1);

    if (!semester) {
      throw new NotFoundException('Semester not found');
    }

    return semester;
  }
}

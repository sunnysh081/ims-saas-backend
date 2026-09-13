import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { and, desc, eq, sql } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import { courseOfferings, subjects, syllabi } from '../../database/schema';
import { paginationMeta } from '../../academic/dto/pagination.dto';
import { CreateSubjectDto, ListSubjectsQueryDto, UpdateSubjectDto } from './dto/subject.dto';

@Injectable()
export class SubjectService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async findAll(instituteId: string, query: ListSubjectsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const filters = [eq(subjects.instituteId, instituteId)];

    if (query.programId) {
      filters.push(eq(subjects.programId, query.programId));
    }

    if (query.type) {
      filters.push(eq(subjects.type, query.type));
    }

    if (query.category) {
      filters.push(eq(subjects.category, query.category));
    }

    const rows = await this.database.db
      .select()
      .from(subjects)
      .where(and(...filters))
      .orderBy(desc(subjects.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const [{ count }] = await this.database.db
      .select({ count: sql<number>`count(*)` })
      .from(subjects)
      .where(and(...filters));

    return {
      items: rows,
      meta: paginationMeta(page, limit, Number(count ?? 0)),
    };
  }

  async findOne(instituteId: string, id: string) {
    const [subject] = await this.database.db
      .select()
      .from(subjects)
      .where(and(eq(subjects.id, id), eq(subjects.instituteId, instituteId)))
      .limit(1);

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return subject;
  }

  async findWithSyllabus(instituteId: string, id: string) {
    const subject = await this.findOne(instituteId, id);

    const [activeSyllabus] = await this.database.db
      .select()
      .from(syllabi)
      .where(and(eq(syllabi.subjectId, id), eq(syllabi.isActive, true)))
      .limit(1);

    return {
      ...subject,
      activeSyllabus: activeSyllabus ?? null,
    };
  }

  async create(instituteId: string, dto: CreateSubjectDto) {
    const [existing] = await this.database.db
      .select({ id: subjects.id })
      .from(subjects)
      .where(and(eq(subjects.instituteId, instituteId), eq(subjects.code, dto.code)))
      .limit(1);

    if (existing) {
      throw new ConflictException('Subject code already exists');
    }

    const [created] = await this.database.db
      .insert(subjects)
      .values({
        instituteId,
        programId: dto.programId,
        code: dto.code,
        name: dto.name,
        shortName: dto.shortName,
        type: dto.type,
        category: dto.category,
        credits: dto.credits,
        theoryHours: dto.theoryHours ?? 0,
        labHours: dto.labHours ?? 0,
      })
      .returning({ id: subjects.id });

    if (!created) {
      throw new BadRequestException('Failed to create subject');
    }

    this.logger.info('Subject created', {
      operation: 'subjects.create',
      resource: 'subject',
      resourceId: created.id,
      instituteId,
    });

    return this.findOne(instituteId, created.id);
  }

  async update(instituteId: string, id: string, dto: UpdateSubjectDto) {
    await this.findOne(instituteId, id);

    await this.database.db
      .update(subjects)
      .set({
        name: dto.name,
        shortName: dto.shortName,
        type: dto.type,
        category: dto.category,
        credits: dto.credits,
        theoryHours: dto.theoryHours,
        labHours: dto.labHours,
        isActive: dto.isActive,
        updatedAt: new Date(),
      })
      .where(eq(subjects.id, id));

    return this.findOne(instituteId, id);
  }

  async remove(instituteId: string, id: string): Promise<void> {
    await this.findOne(instituteId, id);

    const [activeOffering] = await this.database.db
      .select({ id: courseOfferings.id })
      .from(courseOfferings)
      .where(and(eq(courseOfferings.subjectId, id), eq(courseOfferings.isActive, true)))
      .limit(1);

    if (activeOffering) {
      throw new ConflictException('Cannot deactivate a subject with active course offerings');
    }

    await this.database.db.update(subjects).set({ isActive: false, updatedAt: new Date() }).where(eq(subjects.id, id));

    this.logger.info('Subject deactivated', {
      operation: 'subjects.delete',
      resource: 'subject',
      resourceId: id,
      instituteId,
    });
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { and, eq, isNull } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import { programs, resources, subjects } from '../../database/schema';
import { CreateResourceDto, ListResourcesQueryDto, UpdateResourceDto } from './dto/resource.dto';

const resourceSelection = {
  id: resources.id,
  subjectId: resources.subjectId,
  subjectName: subjects.name,
  subjectCode: subjects.code,
  programId: subjects.programId,
  programName: programs.name,
  programCode: programs.code,
  title: resources.title,
  description: resources.description,
  url: resources.url,
  isPublished: resources.isPublished,
  createdAt: resources.createdAt,
  updatedAt: resources.updatedAt,
};

@Injectable()
export class ResourcesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async findAll(instituteId: string, query: ListResourcesQueryDto) {
    const filters = [eq(resources.instituteId, instituteId), isNull(resources.deletedAt)];

    if (query.subjectId) {
      filters.push(eq(resources.subjectId, query.subjectId));
    }

    if (query.programId) {
      filters.push(eq(subjects.programId, query.programId));
    }

    return this.database.db
      .select(resourceSelection)
      .from(resources)
      .innerJoin(subjects, eq(subjects.id, resources.subjectId))
      .innerJoin(programs, eq(programs.id, subjects.programId))
      .where(and(...filters))
      .orderBy(resources.title);
  }

  async findOne(instituteId: string, id: string) {
    const [resource] = await this.database.db
      .select(resourceSelection)
      .from(resources)
      .innerJoin(subjects, eq(subjects.id, resources.subjectId))
      .innerJoin(programs, eq(programs.id, subjects.programId))
      .where(and(eq(resources.id, id), eq(resources.instituteId, instituteId), isNull(resources.deletedAt)))
      .limit(1);

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    return resource;
  }

  async create(instituteId: string, dto: CreateResourceDto) {
    await this.requireSubject(instituteId, dto.subjectId);

    const [created] = await this.database.db
      .insert(resources)
      .values({
        instituteId,
        subjectId: dto.subjectId,
        title: dto.title,
        description: dto.description,
        url: dto.url,
        isPublished: dto.isPublished ?? false,
      })
      .returning({ id: resources.id });

    if (!created) {
      throw new BadRequestException('Failed to create resource');
    }

    this.logger.info('Resource created', {
      operation: 'resources.create',
      resource: 'resource',
      resourceId: created.id,
      instituteId,
    });

    return this.findOne(instituteId, created.id);
  }

  async update(instituteId: string, id: string, dto: UpdateResourceDto) {
    await this.findOne(instituteId, id);

    await this.database.db
      .update(resources)
      .set({
        title: dto.title,
        description: dto.description,
        url: dto.url,
        isPublished: dto.isPublished,
        updatedAt: new Date(),
      })
      .where(eq(resources.id, id));

    return this.findOne(instituteId, id);
  }

  private async requireSubject(instituteId: string, subjectId: string) {
    const [subject] = await this.database.db
      .select({ id: subjects.id })
      .from(subjects)
      .where(and(eq(subjects.id, subjectId), eq(subjects.instituteId, instituteId), isNull(subjects.deletedAt)))
      .limit(1);

    if (!subject) {
      throw new BadRequestException('Subject not found');
    }
  }
}

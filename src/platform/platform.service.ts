import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { and, count, desc, eq, isNull, ne, sql } from 'drizzle-orm';

import { AppLogger } from '../common/logging/logger.service';
import { DatabaseService } from '../database/database.service';
import { institutes, users } from '../database/schema';
import { CreateInstituteDto } from './dto/create-institute.dto';
import { UpdateInstituteDto } from './dto/update-institute.dto';

@Injectable()
export class PlatformService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async overview() {
    const [[instituteStats], [userStats], recentInstitutes] = await Promise.all(
      [
        this.database.db
          .select({
            total: count(),
            active: sql<number>`count(*) filter (where ${institutes.isActive} = true and ${institutes.status} = 'active')`,
            suspended: sql<number>`count(*) filter (where ${institutes.status} = 'suspended')`,
          })
          .from(institutes)
          .where(isNull(institutes.deletedAt)),
        this.database.db
          .select({
            total: count(),
          })
          .from(users)
          .where(and(eq(users.isActive, true), isNull(users.deletedAt))),
        this.database.db
          .select({
            id: institutes.id,
            name: institutes.name,
            slug: institutes.slug,
            status: institutes.status,
            isActive: institutes.isActive,
            createdAt: institutes.createdAt,
          })
          .from(institutes)
          .where(isNull(institutes.deletedAt))
          .orderBy(desc(institutes.createdAt))
          .limit(8),
      ],
    );

    return {
      institutes: {
        total: Number(instituteStats?.total ?? 0),
        active: Number(instituteStats?.active ?? 0),
        suspended: Number(instituteStats?.suspended ?? 0),
      },
      users: {
        total: Number(userStats?.total ?? 0),
      },
      recentInstitutes,
    };
  }

  async listInstitutes() {
    return this.database.db
      .select({
        id: institutes.id,
        name: institutes.name,
        slug: institutes.slug,
        email: institutes.email,
        mobile: institutes.mobile,
        city: institutes.city,
        state: institutes.state,
        country: institutes.country,
        status: institutes.status,
        isActive: institutes.isActive,
        createdAt: institutes.createdAt,
        updatedAt: institutes.updatedAt,
      })
      .from(institutes)
      .where(isNull(institutes.deletedAt))
      .orderBy(desc(institutes.createdAt));
  }

  async getInstitute(id: string) {
    const [institute] = await this.database.db
      .select()
      .from(institutes)
      .where(and(eq(institutes.id, id), isNull(institutes.deletedAt)))
      .limit(1);

    if (!institute) {
      throw new NotFoundException('Institute not found');
    }

    return institute;
  }

  async createInstitute(dto: CreateInstituteDto) {
    const slug = dto.slug.toLowerCase();

    const [existing] = await this.database.db
      .select({ id: institutes.id })
      .from(institutes)
      .where(eq(institutes.slug, slug))
      .limit(1);

    if (existing) {
      throw new ConflictException('Institute slug already exists');
    }

    const [institute] = await this.database.db
      .insert(institutes)
      .values({
        name: dto.name.trim(),
        slug,
        email: dto.email?.trim().toLowerCase(),
        mobile: dto.mobile,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        postalCode: dto.postalCode,
        status: 'active',
        isActive: true,
      })
      .returning();

    this.logger.info('Institute created', {
      operation: 'institutes.create',
      resource: 'institute',
      resourceId: institute?.id,
    });

    return institute;
  }

  async updateInstitute(id: string, dto: UpdateInstituteDto) {
    await this.getInstitute(id);

    if (dto.slug) {
      const slug = dto.slug.toLowerCase();

      const [existing] = await this.database.db
        .select({ id: institutes.id })
        .from(institutes)
        .where(and(eq(institutes.slug, slug), ne(institutes.id, id)))
        .limit(1);

      if (existing) {
        throw new ConflictException('Institute slug already exists');
      }
    }

    const [institute] = await this.database.db
      .update(institutes)
      .set({
        ...dto,
        slug: dto.slug?.toLowerCase(),
        email: dto.email?.trim().toLowerCase(),
        name: dto.name?.trim(),
        updatedAt: new Date(),
      })
      .where(eq(institutes.id, id))
      .returning();

    this.logger.info('Institute updated', {
      operation: 'institutes.update',
      resource: 'institute',
      resourceId: id,
    });

    return institute;
  }
}

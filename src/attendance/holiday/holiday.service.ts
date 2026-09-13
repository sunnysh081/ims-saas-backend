import { Injectable, NotFoundException } from '@nestjs/common';

import { and, eq, gte, lte } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import { holidays } from '../../database/schema';
import { CreateHolidaysDto, ListHolidaysQueryDto } from './dto/holiday.dto';

@Injectable()
export class HolidayService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async findAll(instituteId: string, query: ListHolidaysQueryDto) {
    const filters = [eq(holidays.instituteId, instituteId)];

    if (query.programId) {
      filters.push(eq(holidays.programId, query.programId));
    }

    if (query.from) {
      filters.push(gte(holidays.date, query.from));
    }

    if (query.to) {
      filters.push(lte(holidays.date, query.to));
    }

    return this.database.db
      .select()
      .from(holidays)
      .where(and(...filters));
  }

  async create(instituteId: string, dto: CreateHolidaysDto) {
    const values = dto.items.map((item) => ({
      instituteId,
      date: item.date,
      name: item.name,
      programId: item.programId,
    }));

    const created = await this.database.db.insert(holidays).values(values).onConflictDoNothing().returning();

    this.logger.info('Holidays created', {
      operation: 'holidays.create',
      resource: 'holiday',
      instituteId,
      count: created.length,
    });

    return created;
  }

  async remove(instituteId: string, id: string): Promise<void> {
    const [existing] = await this.database.db
      .select({ id: holidays.id })
      .from(holidays)
      .where(and(eq(holidays.id, id), eq(holidays.instituteId, instituteId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Holiday not found');
    }

    await this.database.db.delete(holidays).where(eq(holidays.id, id));

    this.logger.info('Holiday removed', {
      operation: 'holidays.delete',
      resource: 'holiday',
      resourceId: id,
      instituteId,
    });
  }
}

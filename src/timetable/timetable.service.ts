import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { and, eq, inArray } from 'drizzle-orm';

import { AppLogger } from '../common/logging/logger.service';
import { DatabaseService } from '../database/database.service';
import { attendanceSessions, courseOfferings, holidays, sections, timetableSlots } from '../database/schema';
import { CreateTimetableSlotDto, GenerateSessionsDto, ListTimetableQueryDto, UpdateTimetableSlotDto } from './dto/timetable.dto';

const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

function timeRangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function enumerateDates(fromDate: string, toDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${fromDate}T00:00:00Z`);
  const end = new Date(`${toDate}T00:00:00Z`);

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

@Injectable()
export class TimetableService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async findAll(instituteId: string, query: ListTimetableQueryDto) {
    const filters = [eq(timetableSlots.instituteId, instituteId)];

    if (query.offeringId) {
      filters.push(eq(timetableSlots.offeringId, query.offeringId));
    }

    if (query.sectionId) {
      filters.push(eq(courseOfferings.sectionId, query.sectionId));
    }

    if (query.semesterId) {
      filters.push(eq(courseOfferings.semesterId, query.semesterId));
    }

    if (query.dayOfWeek) {
      filters.push(eq(timetableSlots.dayOfWeek, query.dayOfWeek));
    }

    return this.database.db
      .select({
        id: timetableSlots.id,
        offeringId: timetableSlots.offeringId,
        dayOfWeek: timetableSlots.dayOfWeek,
        startTime: timetableSlots.startTime,
        endTime: timetableSlots.endTime,
        roomNumber: timetableSlots.roomNumber,
        isActive: timetableSlots.isActive,
        sectionId: courseOfferings.sectionId,
        sectionName: sections.name,
        semesterId: courseOfferings.semesterId,
      })
      .from(timetableSlots)
      .innerJoin(courseOfferings, eq(courseOfferings.id, timetableSlots.offeringId))
      .leftJoin(sections, eq(sections.id, courseOfferings.sectionId))
      .where(and(...filters));
  }

  async findOne(instituteId: string, id: string) {
    const [slot] = await this.database.db
      .select()
      .from(timetableSlots)
      .where(and(eq(timetableSlots.id, id), eq(timetableSlots.instituteId, instituteId)))
      .limit(1);

    if (!slot) {
      throw new NotFoundException('Timetable slot not found');
    }

    return slot;
  }

  async create(instituteId: string, dto: CreateTimetableSlotDto) {
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const [offering] = await this.database.db
      .select({
        id: courseOfferings.id,
        sectionId: courseOfferings.sectionId,
      })
      .from(courseOfferings)
      .where(and(eq(courseOfferings.id, dto.offeringId), eq(courseOfferings.instituteId, instituteId)))
      .limit(1);

    if (!offering) {
      throw new NotFoundException('Course offering not found');
    }

    if (dto.roomNumber) {
      const sameRoom = await this.database.db
        .select({
          startTime: timetableSlots.startTime,
          endTime: timetableSlots.endTime,
        })
        .from(timetableSlots)
        .where(
          and(
            eq(timetableSlots.instituteId, instituteId),
            eq(timetableSlots.roomNumber, dto.roomNumber),
            eq(timetableSlots.dayOfWeek, dto.dayOfWeek),
            eq(timetableSlots.isActive, true),
          ),
        );

      const clash = sameRoom.some((slot) => timeRangesOverlap(dto.startTime, dto.endTime, slot.startTime, slot.endTime));

      if (clash) {
        throw new ConflictException(`Room ${dto.roomNumber} is already booked for an overlapping time on ${dto.dayOfWeek}`);
      }
    }

    const [created] = await this.database.db
      .insert(timetableSlots)
      .values({
        instituteId,
        offeringId: dto.offeringId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        roomNumber: dto.roomNumber,
      })
      .returning({ id: timetableSlots.id });

    if (!created) {
      throw new BadRequestException('Failed to create timetable slot');
    }

    this.logger.info('Timetable slot created', {
      operation: 'timetable.create',
      resource: 'timetable_slot',
      resourceId: created.id,
      instituteId,
    });

    return this.findOne(instituteId, created.id);
  }

  async update(instituteId: string, id: string, dto: UpdateTimetableSlotDto) {
    const slot = await this.findOne(instituteId, id);

    const startTime = dto.startTime ?? slot.startTime;
    const endTime = dto.endTime ?? slot.endTime;

    if (startTime >= endTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    await this.database.db
      .update(timetableSlots)
      .set({
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        roomNumber: dto.roomNumber,
        isActive: dto.isActive,
      })
      .where(eq(timetableSlots.id, id));

    return this.findOne(instituteId, id);
  }

  async remove(instituteId: string, id: string): Promise<void> {
    await this.findOne(instituteId, id);

    await this.database.db.update(timetableSlots).set({ isActive: false }).where(eq(timetableSlots.id, id));

    this.logger.info('Timetable slot deactivated', {
      operation: 'timetable.delete',
      resource: 'timetable_slot',
      resourceId: id,
      instituteId,
    });
  }

  async generateSessions(instituteId: string, dto: GenerateSessionsDto) {
    const slots = await this.database.db
      .select({
        id: timetableSlots.id,
        offeringId: timetableSlots.offeringId,
        dayOfWeek: timetableSlots.dayOfWeek,
      })
      .from(timetableSlots)
      .innerJoin(courseOfferings, eq(courseOfferings.id, timetableSlots.offeringId))
      .where(
        and(
          eq(timetableSlots.instituteId, instituteId),
          eq(timetableSlots.isActive, true),
          eq(courseOfferings.semesterId, dto.semesterId),
          eq(courseOfferings.isActive, true),
        ),
      );

    if (!slots.length) {
      throw new BadRequestException('No active timetable slots found for this semester');
    }

    const dates = enumerateDates(dto.fromDate, dto.toDate);

    const holidayRows = await this.database.db
      .select({ date: holidays.date })
      .from(holidays)
      .where(and(eq(holidays.instituteId, instituteId), inArray(holidays.date, dates)));

    const holidaySet = new Set(holidayRows.map((row) => row.date));

    const sessionValues: (typeof attendanceSessions.$inferInsert)[] = [];

    for (const date of dates) {
      if (holidaySet.has(date)) {
        continue;
      }

      const dayCode = DAY_CODES[new Date(`${date}T00:00:00Z`).getUTCDay()];

      if (dayCode === 'SUN') {
        continue;
      }

      for (const slot of slots) {
        if (slot.dayOfWeek === dayCode) {
          sessionValues.push({
            instituteId,
            offeringId: slot.offeringId,
            slotId: slot.id,
            date,
            status: 'SCHEDULED',
          });
        }
      }
    }

    let createdCount = 0;

    if (sessionValues.length) {
      const created = await this.database.db
        .insert(attendanceSessions)
        .values(sessionValues)
        .onConflictDoNothing()
        .returning({ id: attendanceSessions.id });

      createdCount = created.length;
    }

    this.logger.info('Attendance sessions generated', {
      operation: 'timetable.generate-sessions',
      resource: 'attendance_session',
      instituteId,
      semesterId: dto.semesterId,
      created: createdCount,
      considered: sessionValues.length,
    });

    return {
      semesterId: dto.semesterId,
      fromDate: dto.fromDate,
      toDate: dto.toDate,
      created: createdCount,
      considered: sessionValues.length,
    };
  }
}

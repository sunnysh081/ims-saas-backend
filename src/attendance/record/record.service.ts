import { Injectable, NotFoundException } from '@nestjs/common';

import { and, eq } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import { attendanceCorrectionLogs, attendanceRecords, attendanceSessions } from '../../database/schema';
import { SummaryService } from '../summary/summary.service';
import { CorrectRecordDto, ListRecordsQueryDto } from './dto/record.dto';

@Injectable()
export class RecordService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
    private readonly summaryService: SummaryService,
  ) {}

  async findAll(instituteId: string, query: ListRecordsQueryDto) {
    const filters = [eq(attendanceRecords.instituteId, instituteId)];

    if (query.sessionId) {
      filters.push(eq(attendanceRecords.sessionId, query.sessionId));
    }

    if (query.studentId) {
      filters.push(eq(attendanceRecords.studentId, query.studentId));
    }

    return this.database.db
      .select()
      .from(attendanceRecords)
      .where(and(...filters));
  }

  async correctRecord(instituteId: string, id: string, dto: CorrectRecordDto, correctedById: string) {
    const [record] = await this.database.db
      .select()
      .from(attendanceRecords)
      .where(and(eq(attendanceRecords.id, id), eq(attendanceRecords.instituteId, instituteId)))
      .limit(1);

    if (!record) {
      throw new NotFoundException('Attendance record not found');
    }

    const [session] = await this.database.db
      .select({ offeringId: attendanceSessions.offeringId })
      .from(attendanceSessions)
      .where(eq(attendanceSessions.id, record.sessionId))
      .limit(1);

    if (!session) {
      throw new NotFoundException('Attendance session not found');
    }

    await this.database.db.transaction(async (tx) => {
      await tx.insert(attendanceCorrectionLogs).values({
        instituteId,
        recordId: id,
        fromStatus: record.status,
        toStatus: dto.status,
        reason: dto.reason,
        correctedById,
      });

      await tx.update(attendanceRecords).set({ status: dto.status }).where(eq(attendanceRecords.id, id));
    });

    await this.summaryService.recalculate(instituteId, record.studentId, session.offeringId);

    this.logger.info('Attendance record corrected', {
      operation: 'attendance.records.correct',
      resource: 'attendance_record',
      resourceId: id,
      instituteId,
    });

    const [updated] = await this.database.db.select().from(attendanceRecords).where(eq(attendanceRecords.id, id)).limit(1);

    return updated;
  }
}

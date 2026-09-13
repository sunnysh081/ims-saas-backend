import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { and, eq, inArray } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import { attendanceRecords, attendanceSessions, leaveRequests, students } from '../../database/schema';
import { SummaryService } from '../summary/summary.service';
import { CreateLeaveDto, ListLeaveQueryDto, ReviewLeaveDto } from './dto/leave.dto';

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
export class LeaveService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
    private readonly summaryService: SummaryService,
  ) {}

  async findAll(instituteId: string, query: ListLeaveQueryDto) {
    const filters = [eq(leaveRequests.instituteId, instituteId)];

    if (query.studentId) {
      filters.push(eq(leaveRequests.studentId, query.studentId));
    }

    if (query.status) {
      filters.push(eq(leaveRequests.status, query.status));
    }

    if (query.semesterId) {
      filters.push(eq(leaveRequests.semesterId, query.semesterId));
    }

    return this.database.db
      .select({
        id: leaveRequests.id,
        studentId: leaveRequests.studentId,
        studentName: students.name,
        rollNumber: students.rollNumber,
        semesterId: leaveRequests.semesterId,
        type: leaveRequests.type,
        fromDate: leaveRequests.fromDate,
        toDate: leaveRequests.toDate,
        reason: leaveRequests.reason,
        status: leaveRequests.status,
        reviewedById: leaveRequests.reviewedById,
        reviewedAt: leaveRequests.reviewedAt,
        documentUrl: leaveRequests.documentUrl,
        createdAt: leaveRequests.createdAt,
      })
      .from(leaveRequests)
      .innerJoin(students, eq(students.id, leaveRequests.studentId))
      .where(and(...filters));
  }

  async findOne(instituteId: string, id: string) {
    const [leave] = await this.database.db
      .select()
      .from(leaveRequests)
      .where(and(eq(leaveRequests.id, id), eq(leaveRequests.instituteId, instituteId)))
      .limit(1);

    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }

    return leave;
  }

  async create(instituteId: string, dto: CreateLeaveDto) {
    if (dto.fromDate > dto.toDate) {
      throw new BadRequestException('fromDate must be on or before toDate');
    }

    const [created] = await this.database.db
      .insert(leaveRequests)
      .values({
        instituteId,
        studentId: dto.studentId,
        semesterId: dto.semesterId,
        type: dto.type,
        fromDate: dto.fromDate,
        toDate: dto.toDate,
        reason: dto.reason,
        documentUrl: dto.documentUrl,
      })
      .returning({ id: leaveRequests.id });

    if (!created) {
      throw new BadRequestException('Failed to submit leave request');
    }

    this.logger.info('Leave request submitted', {
      operation: 'leave.create',
      resource: 'leave_request',
      resourceId: created.id,
      instituteId,
    });

    return this.findOne(instituteId, created.id);
  }

  async review(instituteId: string, id: string, dto: ReviewLeaveDto, reviewedById: string) {
    const leave = await this.findOne(instituteId, id);

    if (leave.status !== 'PENDING') {
      throw new BadRequestException('Leave request has already been reviewed');
    }

    await this.database.db
      .update(leaveRequests)
      .set({
        status: dto.status,
        reviewedById,
        reviewedAt: new Date(),
      })
      .where(eq(leaveRequests.id, id));

    if (dto.status !== 'APPROVED') {
      return this.findOne(instituteId, id);
    }

    const newStatus = leave.type === 'MEDICAL' ? 'MEDICAL' : 'ON_DUTY';
    const dates = enumerateDates(leave.fromDate, leave.toDate);

    const sessions = await this.database.db
      .select({
        id: attendanceSessions.id,
        offeringId: attendanceSessions.offeringId,
      })
      .from(attendanceSessions)
      .where(
        and(
          eq(attendanceSessions.instituteId, instituteId),
          eq(attendanceSessions.status, 'TAKEN'),
          inArray(attendanceSessions.date, dates),
        ),
      );

    const affectedOfferingIds = new Set<string>();

    for (const session of sessions) {
      const updated = await this.database.db
        .update(attendanceRecords)
        .set({ status: newStatus, leaveId: id })
        .where(
          and(
            eq(attendanceRecords.sessionId, session.id),
            eq(attendanceRecords.studentId, leave.studentId),
            eq(attendanceRecords.status, 'ABSENT'),
          ),
        )
        .returning({ id: attendanceRecords.id });

      if (updated.length) {
        affectedOfferingIds.add(session.offeringId);
      }
    }

    await Promise.all(
      [...affectedOfferingIds].map((offeringId) => this.summaryService.recalculate(instituteId, leave.studentId, offeringId)),
    );

    this.logger.info('Leave request approved', {
      operation: 'leave.review',
      resource: 'leave_request',
      resourceId: id,
      instituteId,
      affectedOfferings: affectedOfferingIds.size,
    });

    return this.findOne(instituteId, id);
  }
}

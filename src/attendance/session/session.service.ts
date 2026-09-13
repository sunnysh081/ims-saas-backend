import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { and, eq, inArray } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import {
  attendanceRecords,
  attendanceSessions,
  courseOfferings,
  electiveChoices,
  studentEnrollments,
  students,
} from '../../database/schema';
import { SummaryService } from '../summary/summary.service';
import { CancelSessionDto, CreateSessionDto, ListSessionsQueryDto, MarkAttendanceDto } from './dto/session.dto';

@Injectable()
export class SessionService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
    private readonly summaryService: SummaryService,
  ) {}

  async findAll(instituteId: string, query: ListSessionsQueryDto) {
    const filters = [eq(attendanceSessions.instituteId, instituteId)];

    if (query.offeringId) {
      filters.push(eq(attendanceSessions.offeringId, query.offeringId));
    }

    if (query.date) {
      filters.push(eq(attendanceSessions.date, query.date));
    }

    if (query.status) {
      filters.push(eq(attendanceSessions.status, query.status));
    }

    return this.database.db
      .select()
      .from(attendanceSessions)
      .where(and(...filters));
  }

  async findOne(instituteId: string, id: string) {
    const [session] = await this.database.db
      .select()
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.id, id), eq(attendanceSessions.instituteId, instituteId)))
      .limit(1);

    if (!session) {
      throw new NotFoundException('Attendance session not found');
    }

    return session;
  }

  async findWithRoster(instituteId: string, id: string) {
    const session = await this.findOne(instituteId, id);

    const roster = await this.resolveRoster(session.offeringId);

    const existingRecords = await this.database.db
      .select({
        studentId: attendanceRecords.studentId,
        status: attendanceRecords.status,
        note: attendanceRecords.note,
      })
      .from(attendanceRecords)
      .where(eq(attendanceRecords.sessionId, id));

    const recordByStudent = new Map(existingRecords.map((record) => [record.studentId, record]));

    return {
      ...session,
      roster: roster.map((student) => ({
        ...student,
        status: recordByStudent.get(student.id)?.status ?? null,
        note: recordByStudent.get(student.id)?.note ?? null,
      })),
    };
  }

  async create(instituteId: string, dto: CreateSessionDto) {
    const [offering] = await this.database.db
      .select({ id: courseOfferings.id })
      .from(courseOfferings)
      .where(and(eq(courseOfferings.id, dto.offeringId), eq(courseOfferings.instituteId, instituteId)))
      .limit(1);

    if (!offering) {
      throw new NotFoundException('Course offering not found');
    }

    const [existing] = await this.database.db
      .select({ id: attendanceSessions.id })
      .from(attendanceSessions)
      .where(and(eq(attendanceSessions.offeringId, dto.offeringId), eq(attendanceSessions.date, dto.date)))
      .limit(1);

    if (existing) {
      throw new ConflictException('A session already exists for this date');
    }

    const [created] = await this.database.db
      .insert(attendanceSessions)
      .values({
        instituteId,
        offeringId: dto.offeringId,
        date: dto.date,
        topicCovered: dto.topicCovered,
        status: 'SCHEDULED',
      })
      .returning({ id: attendanceSessions.id });

    if (!created) {
      throw new BadRequestException('Failed to create attendance session');
    }

    return this.findOne(instituteId, created.id);
  }

  async markAttendance(instituteId: string, id: string, dto: MarkAttendanceDto, markedById: string) {
    const session = await this.findOne(instituteId, id);

    if (session.status === 'CANCELLED') {
      throw new BadRequestException('Session is cancelled');
    }

    const [offering] = await this.database.db
      .select({ semesterId: courseOfferings.semesterId })
      .from(courseOfferings)
      .where(eq(courseOfferings.id, session.offeringId))
      .limit(1);

    if (!offering) {
      throw new NotFoundException('Course offering not found');
    }

    const enrollments = await this.database.db
      .select({
        id: studentEnrollments.id,
        studentId: studentEnrollments.studentId,
      })
      .from(studentEnrollments)
      .where(
        and(
          eq(studentEnrollments.semesterId, offering.semesterId),
          eq(studentEnrollments.instituteId, instituteId),
          eq(studentEnrollments.active, true),
          inArray(
            studentEnrollments.studentId,
            dto.records.map((record) => record.studentId),
          ),
        ),
      );

    const enrollmentByStudent = new Map(enrollments.map((row) => [row.studentId, row.id]));

    await this.database.db.transaction(async (tx) => {
      for (const record of dto.records) {
        const enrollmentId = enrollmentByStudent.get(record.studentId);

        if (!enrollmentId) {
          throw new BadRequestException(`Student has no active enrollment this semester: ${record.studentId}`);
        }

        await tx
          .insert(attendanceRecords)
          .values({
            instituteId,
            sessionId: id,
            studentId: record.studentId,
            enrollmentId,
            status: record.status,
            markedById,
            note: record.note,
          })
          .onConflictDoUpdate({
            target: [attendanceRecords.sessionId, attendanceRecords.studentId],
            set: {
              status: record.status,
              markedById,
              note: record.note,
              markedAt: new Date(),
            },
          });
      }

      await tx
        .update(attendanceSessions)
        .set({
          status: 'TAKEN',
          takenById: markedById,
          takenAt: new Date(),
          topicCovered: dto.topicCovered ?? session.topicCovered,
        })
        .where(eq(attendanceSessions.id, id));
    });

    const uniqueStudentIds = [...new Set(dto.records.map((record) => record.studentId))];

    await Promise.all(uniqueStudentIds.map((studentId) => this.summaryService.recalculate(instituteId, studentId, session.offeringId)));

    this.logger.info('Attendance marked', {
      operation: 'attendance.mark',
      resource: 'attendance_session',
      resourceId: id,
      instituteId,
      count: dto.records.length,
    });

    return this.findWithRoster(instituteId, id);
  }

  async cancel(instituteId: string, id: string, dto: CancelSessionDto) {
    await this.findOne(instituteId, id);

    await this.database.db
      .update(attendanceSessions)
      .set({ status: 'CANCELLED', cancelReason: dto.cancelReason })
      .where(eq(attendanceSessions.id, id));

    this.logger.info('Attendance session cancelled', {
      operation: 'attendance.cancel',
      resource: 'attendance_session',
      resourceId: id,
      instituteId,
    });

    return this.findOne(instituteId, id);
  }

  async resolveRoster(offeringId: string) {
    const [offering] = await this.database.db.select().from(courseOfferings).where(eq(courseOfferings.id, offeringId)).limit(1);

    if (!offering) {
      throw new NotFoundException('Course offering not found');
    }

    if (offering.electiveGroupId) {
      return this.database.db
        .select({
          id: students.id,
          rollNumber: students.rollNumber,
          name: students.name,
        })
        .from(electiveChoices)
        .innerJoin(students, eq(students.id, electiveChoices.studentId))
        .where(and(eq(electiveChoices.offeringId, offeringId), eq(electiveChoices.status, 'CONFIRMED')));
    }

    return this.database.db
      .select({
        id: students.id,
        rollNumber: students.rollNumber,
        name: students.name,
      })
      .from(studentEnrollments)
      .innerJoin(students, eq(students.id, studentEnrollments.studentId))
      .where(
        and(
          eq(studentEnrollments.sectionId, offering.sectionId ?? ''),
          eq(studentEnrollments.semesterId, offering.semesterId),
          eq(studentEnrollments.active, true),
        ),
      );
  }
}

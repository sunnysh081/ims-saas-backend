import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { and, eq, inArray } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import {
  semesterHistories,
  semesters,
  students,
} from '../../database/schema';
import {
  ListSemesterHistoryQueryDto,
  SealSemesterHistoryDto,
} from './dto/semester-history.dto';

@Injectable()
export class SemesterHistoryService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async findAll(instituteId: string, query: ListSemesterHistoryQueryDto) {
    const filters = [eq(semesterHistories.instituteId, instituteId)];

    if (query.studentId) {
      filters.push(eq(semesterHistories.studentId, query.studentId));
    }

    if (query.semesterId) {
      filters.push(eq(semesterHistories.semesterId, query.semesterId));
    }

    return this.database.db
      .select({
        id: semesterHistories.id,
        studentId: semesterHistories.studentId,
        studentName: students.name,
        rollNumber: students.rollNumber,
        semesterId: semesterHistories.semesterId,
        semesterLabel: semesters.label,
        sgpa: semesterHistories.sgpa,
        attendancePct: semesterHistories.attendancePct,
        result: semesterHistories.result,
        sealedAt: semesterHistories.sealedAt,
      })
      .from(semesterHistories)
      .innerJoin(students, eq(students.id, semesterHistories.studentId))
      .innerJoin(semesters, eq(semesters.id, semesterHistories.semesterId))
      .where(and(...filters))
      .orderBy(semesterHistories.sealedAt);
  }

  async seal(instituteId: string, dto: SealSemesterHistoryDto) {
    const [semester] = await this.database.db
      .select({
        id: semesters.id,
      })
      .from(semesters)
      .where(
        and(
          eq(semesters.id, dto.semesterId),
          eq(semesters.instituteId, instituteId),
        ),
      )
      .limit(1);

    if (!semester) {
      throw new NotFoundException('Semester not found');
    }

    const studentIds = dto.results.map((result) => result.studentId);

    const existing = await this.database.db
      .select({
        studentId: semesterHistories.studentId,
      })
      .from(semesterHistories)
      .where(
        and(
          eq(semesterHistories.instituteId, instituteId),
          eq(semesterHistories.semesterId, dto.semesterId),
          inArray(semesterHistories.studentId, studentIds),
        ),
      );

    if (existing.length) {
      throw new ConflictException(
        'Semester history already sealed for one or more students',
      );
    }

    const inserted = await this.database.db
      .insert(semesterHistories)
      .values(
        dto.results.map((result) => ({
          instituteId,
          studentId: result.studentId,
          semesterId: dto.semesterId,
          sgpa: result.sgpa,
          attendancePct: result.attendancePct,
          result: result.result,
        })),
      )
      .returning({
        id: semesterHistories.id,
        studentId: semesterHistories.studentId,
      });

    this.logger.info('Semester history sealed', {
      operation: 'semester-history.seal',
      resource: 'semester_history',
      instituteId,
      semesterId: dto.semesterId,
      count: inserted.length,
    });

    return {
      sealed: inserted.length,
      items: inserted,
    };
  }
}

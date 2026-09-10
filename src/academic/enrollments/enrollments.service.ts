import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { and, eq, isNull } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import {
  sections,
  semesters,
  studentEnrollments,
  students,
} from '../../database/schema';
import {
  CreateEnrollmentDto,
  ListEnrollmentsQueryDto,
} from './dto/enrollment.dto';

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async findAll(instituteId: string, query: ListEnrollmentsQueryDto) {
    const filters = [eq(studentEnrollments.instituteId, instituteId)];

    if (query.studentId) {
      filters.push(eq(studentEnrollments.studentId, query.studentId));
    }

    if (query.semesterId) {
      filters.push(eq(studentEnrollments.semesterId, query.semesterId));
    }

    if (query.active !== undefined) {
      filters.push(eq(studentEnrollments.active, query.active));
    }

    return this.database.db
      .select({
        id: studentEnrollments.id,
        studentId: studentEnrollments.studentId,
        studentName: students.name,
        rollNumber: students.rollNumber,
        semesterId: studentEnrollments.semesterId,
        semesterLabel: semesters.label,
        sectionId: studentEnrollments.sectionId,
        sectionName: sections.name,
        academicYear: studentEnrollments.academicYear,
        status: studentEnrollments.status,
        active: studentEnrollments.active,
        enrolledAt: studentEnrollments.enrolledAt,
      })
      .from(studentEnrollments)
      .leftJoin(students, eq(students.id, studentEnrollments.studentId))
      .leftJoin(semesters, eq(semesters.id, studentEnrollments.semesterId))
      .leftJoin(sections, eq(sections.id, studentEnrollments.sectionId))
      .where(and(...filters))
      .orderBy(studentEnrollments.enrolledAt);
  }

  async create(instituteId: string, dto: CreateEnrollmentDto) {
    const [student] = await this.database.db
      .select({
        id: students.id,
      })
      .from(students)
      .where(
        and(
          eq(students.id, dto.studentId),
          eq(students.instituteId, instituteId),
          isNull(students.deletedAt),
        ),
      )
      .limit(1);

    if (!student) {
      throw new NotFoundException('Student not found');
    }

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

    const [section] = await this.database.db
      .select({
        id: sections.id,
        capacity: sections.capacity,
      })
      .from(sections)
      .where(
        and(
          eq(sections.id, dto.sectionId),
          eq(sections.instituteId, instituteId),
          isNull(sections.deletedAt),
        ),
      )
      .limit(1);

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    const [active] = await this.database.db
      .select({
        id: studentEnrollments.id,
      })
      .from(studentEnrollments)
      .where(
        and(
          eq(studentEnrollments.studentId, dto.studentId),
          eq(studentEnrollments.active, true),
        ),
      )
      .limit(1);

    if (active) {
      throw new ConflictException('Student already has an active enrollment');
    }

    const occupied = await this.database.db
      .select({
        id: studentEnrollments.id,
      })
      .from(studentEnrollments)
      .where(
        and(
          eq(studentEnrollments.sectionId, dto.sectionId),
          eq(studentEnrollments.active, true),
        ),
      );

    if (occupied.length >= section.capacity) {
      throw new ConflictException('Section is at capacity');
    }

    const [created] = await this.database.db
      .insert(studentEnrollments)
      .values({
        instituteId,
        studentId: dto.studentId,
        semesterId: dto.semesterId,
        sectionId: dto.sectionId,
        academicYear: dto.academicYear,
        status: 'ACTIVE',
        active: true,
      })
      .returning({
        id: studentEnrollments.id,
      });

    if (!created) {
      throw new BadRequestException('Failed to enroll student');
    }

    this.logger.info('Student enrolled', {
      operation: 'enrollments.create',
      resource: 'enrollment',
      resourceId: created.id,
      instituteId,
    });

    const [row] = await this.findAll(instituteId, {
      studentId: dto.studentId,
      active: true,
    });

    return row;
  }
}

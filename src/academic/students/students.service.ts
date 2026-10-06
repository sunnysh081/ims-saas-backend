import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { paginationMeta } from '../dto/pagination.dto';
import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import { UsersService } from '../../platform/users.service';
import {
  branchChangeLogs,
  branches,
  roles,
  sectionChangeLogs,
  sections,
  semesterHistories,
  semesters,
  studentEnrollments,
  students,
} from '../../database/schema';
import { CreateStudentDto, ListStudentsQueryDto, PortalAccessDto, UpdateStudentDto } from './dto/student.dto';

@Injectable()
export class StudentsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
    private readonly usersService: UsersService,
  ) {}

  async findAll(instituteId: string, query: ListStudentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const filters = [eq(students.instituteId, instituteId), isNull(students.deletedAt)];

    if (query.status) {
      filters.push(eq(students.status, query.status));
    }

    const needsEnrollment = Boolean(query.batchId) || Boolean(query.sectionId) || Boolean(query.semesterId);

    if (!needsEnrollment) {
      const rows = await this.database.db
        .select()
        .from(students)
        .where(and(...filters))
        .orderBy(desc(students.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      const [{ count }] = await this.database.db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(students)
        .where(and(...filters));

      return {
        items: rows,
        meta: paginationMeta(page, limit, Number(count ?? 0)),
      };
    }

    const enrollmentFilters = [...filters, eq(studentEnrollments.instituteId, instituteId), eq(studentEnrollments.active, true)];

    if (query.sectionId) {
      enrollmentFilters.push(eq(studentEnrollments.sectionId, query.sectionId));
    }

    if (query.semesterId) {
      enrollmentFilters.push(eq(studentEnrollments.semesterId, query.semesterId));
    }

    if (query.batchId) {
      enrollmentFilters.push(eq(sections.batchId, query.batchId));
    }

    const rows = await this.database.db
      .select({
        id: students.id,
        rollNumber: students.rollNumber,
        name: students.name,
        email: students.email,
        phone: students.phone,
        status: students.status,
        createdAt: students.createdAt,
        updatedAt: students.updatedAt,
        enrollmentId: studentEnrollments.id,
        sectionId: studentEnrollments.sectionId,
        semesterId: studentEnrollments.semesterId,
        academicYear: studentEnrollments.academicYear,
      })
      .from(students)
      .innerJoin(studentEnrollments, eq(studentEnrollments.studentId, students.id))
      .innerJoin(sections, eq(sections.id, studentEnrollments.sectionId))
      .where(and(...enrollmentFilters))
      .orderBy(students.rollNumber)
      .limit(limit)
      .offset((page - 1) * limit);

    const [{ count }] = await this.database.db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(students)
      .innerJoin(studentEnrollments, eq(studentEnrollments.studentId, students.id))
      .innerJoin(sections, eq(sections.id, studentEnrollments.sectionId))
      .where(and(...enrollmentFilters));

    return {
      items: rows,
      meta: paginationMeta(page, limit, Number(count ?? 0)),
    };
  }

  async findOne(instituteId: string, id: string) {
    const [student] = await this.database.db
      .select({
        id: students.id,
        rollNumber: students.rollNumber,
        name: students.name,
        email: students.email,
        phone: students.phone,
        status: students.status,
        userId: students.userId,
        createdAt: students.createdAt,
        updatedAt: students.updatedAt,
      })
      .from(students)
      .where(and(eq(students.id, id), eq(students.instituteId, instituteId), isNull(students.deletedAt)))
      .limit(1);

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async create(instituteId: string, dto: CreateStudentDto) {
    const rollNumber = dto.rollNumber.toUpperCase();
    const email = dto.email.toLowerCase();

    await this.assertUnique(instituteId, rollNumber, email);

    const [created] = await this.database.db
      .insert(students)
      .values({
        instituteId,
        rollNumber,
        name: dto.name,
        email,
        phone: dto.phone,
        status: dto.status ?? 'ACTIVE',
      })
      .returning({
        id: students.id,
      });

    if (!created) {
      throw new BadRequestException('Failed to create student');
    }

    this.logger.info('Student created', {
      operation: 'students.create',
      resource: 'student',
      resourceId: created.id,
      instituteId,
    });

    return this.findOne(instituteId, created.id);
  }

  async update(instituteId: string, id: string, dto: UpdateStudentDto) {
    await this.findOne(instituteId, id);

    const rollNumber = dto.rollNumber?.toUpperCase();
    const email = dto.email?.toLowerCase();

    if (rollNumber || email) {
      await this.assertUnique(instituteId, rollNumber, email, id);
    }

    await this.database.db
      .update(students)
      .set({
        rollNumber,
        name: dto.name,
        email,
        phone: dto.phone,
        status: dto.status,
        updatedAt: new Date(),
      })
      .where(eq(students.id, id));

    return this.findOne(instituteId, id);
  }

  async semesterHistory(instituteId: string, id: string) {
    await this.findOne(instituteId, id);

    return this.database.db
      .select({
        id: semesterHistories.id,
        semesterId: semesterHistories.semesterId,
        semesterLabel: semesters.label,
        semesterNumber: semesters.number,
        sgpa: semesterHistories.sgpa,
        attendancePct: semesterHistories.attendancePct,
        result: semesterHistories.result,
        sealedAt: semesterHistories.sealedAt,
      })
      .from(semesterHistories)
      .innerJoin(semesters, eq(semesters.id, semesterHistories.semesterId))
      .where(and(eq(semesterHistories.instituteId, instituteId), eq(semesterHistories.studentId, id)))
      .orderBy(semesters.number);
  }

  async sectionChangeLog(instituteId: string, id: string) {
    await this.findOne(instituteId, id);

    return this.database.db
      .select({
        id: sectionChangeLogs.id,
        enrollmentId: sectionChangeLogs.enrollmentId,
        fromSectionId: sectionChangeLogs.fromSectionId,
        toSectionId: sectionChangeLogs.toSectionId,
        reason: sectionChangeLogs.reason,
        changedAt: sectionChangeLogs.changedAt,
        changedBy: sectionChangeLogs.changedBy,
      })
      .from(sectionChangeLogs)
      .where(and(eq(sectionChangeLogs.instituteId, instituteId), eq(sectionChangeLogs.studentId, id)))
      .orderBy(desc(sectionChangeLogs.changedAt));
  }

  async branchChangeLog(instituteId: string, id: string) {
    await this.findOne(instituteId, id);

    return this.database.db
      .select({
        id: branchChangeLogs.id,
        fromBranchId: branchChangeLogs.fromBranchId,
        fromBranchName: branches.name,
        toBranchId: branchChangeLogs.toBranchId,
        atSemesterId: branchChangeLogs.atSemesterId,
        reason: branchChangeLogs.reason,
        changedAt: branchChangeLogs.changedAt,
        changedBy: branchChangeLogs.changedBy,
      })
      .from(branchChangeLogs)
      .innerJoin(branches, eq(branches.id, branchChangeLogs.fromBranchId))
      .where(and(eq(branchChangeLogs.instituteId, instituteId), eq(branchChangeLogs.studentId, id)))
      .orderBy(desc(branchChangeLogs.changedAt));
  }

  async currentEnrollment(instituteId: string, id: string) {
    await this.findOne(instituteId, id);

    const [row] = await this.database.db
      .select({
        id: studentEnrollments.id,
        studentId: studentEnrollments.studentId,
        semesterId: studentEnrollments.semesterId,
        semesterLabel: semesters.label,
        semesterNumber: semesters.number,
        sectionId: studentEnrollments.sectionId,
        sectionName: sections.name,
        branchId: sections.branchId,
        academicYear: studentEnrollments.academicYear,
        status: studentEnrollments.status,
        active: studentEnrollments.active,
        enrolledAt: studentEnrollments.enrolledAt,
      })
      .from(studentEnrollments)
      .leftJoin(sections, eq(studentEnrollments.sectionId, sections.id))
      .leftJoin(semesters, eq(studentEnrollments.semesterId, semesters.id))
      .where(
        and(eq(studentEnrollments.studentId, id), eq(studentEnrollments.instituteId, instituteId), eq(studentEnrollments.active, true)),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException('Active enrollment not found');
    }

    return row;
  }

  async enablePortalAccess(instituteId: string, id: string, dto: PortalAccessDto) {
    const student = await this.findOne(instituteId, id);

    if (student.userId) {
      throw new ConflictException('Portal access is already enabled for this student');
    }

    const studentRoleId = await this.requireStudentRole();

    const user = await this.usersService.createInstituteUser(instituteId, {
      email: student.email,
      password: dto.password,
      firstName: student.name,
      roleIds: [studentRoleId],
    });

    await this.database.db.update(students).set({ userId: user.id, updatedAt: new Date() }).where(eq(students.id, id));

    this.logger.info('Student portal access enabled', {
      operation: 'students.portal-access',
      resource: 'student',
      resourceId: id,
      instituteId,
    });

    return this.findOne(instituteId, id);
  }

  private async requireStudentRole(): Promise<string> {
    const [role] = await this.database.db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.slug, 'student'), eq(roles.scope, 'institute'), isNull(roles.instituteId)))
      .limit(1);

    if (!role) {
      throw new BadRequestException('Student role is not configured. Run the role seed first.');
    }

    return role.id;
  }

  private async assertUnique(instituteId: string, rollNumber?: string, email?: string, excludeId?: string) {
    if (rollNumber) {
      const [existing] = await this.database.db
        .select({
          id: students.id,
        })
        .from(students)
        .where(and(eq(students.instituteId, instituteId), eq(students.rollNumber, rollNumber), isNull(students.deletedAt)))
        .limit(1);

      if (existing && existing.id !== excludeId) {
        throw new ConflictException('Roll number already exists');
      }
    }

    if (email) {
      const [existing] = await this.database.db
        .select({
          id: students.id,
        })
        .from(students)
        .where(and(eq(students.instituteId, instituteId), eq(students.email, email), isNull(students.deletedAt)))
        .limit(1);

      if (existing && existing.id !== excludeId) {
        throw new ConflictException('Student email already exists');
      }
    }
  }
}

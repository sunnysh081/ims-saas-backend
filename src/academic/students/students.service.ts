import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { paginationMeta } from '../dto/pagination.dto';
import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import {
  academicAuditLogs,
  branchChangeLogs,
  branches,
  sectionChangeLogs,
  sections,
  semesterHistories,
  semesters,
  studentEnrollments,
  students,
  users,
} from '../../database/schema';
import { branchLink, sectionLink } from '../academic-audit.service';
import {
  CreateStudentDto,
  ListStudentsQueryDto,
  UpdateStudentDto,
} from './dto/student.dto';

@Injectable()
export class StudentsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async findAll(
    instituteId: string,
    query: ListStudentsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const filters = [
      eq(students.instituteId, instituteId),
      isNull(students.deletedAt),
    ];

    if (query.status) {
      filters.push(eq(students.status, query.status));
    }

    const needsEnrollment =
      Boolean(query.batchId) ||
      Boolean(query.sectionId) ||
      Boolean(query.semesterId);

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

    const enrollmentFilters = [
      ...filters,
      eq(studentEnrollments.instituteId, instituteId),
      eq(studentEnrollments.active, true),
    ];

    if (query.sectionId) {
      enrollmentFilters.push(eq(studentEnrollments.sectionId, query.sectionId));
    }

    if (query.semesterId) {
      enrollmentFilters.push(
        eq(studentEnrollments.semesterId, query.semesterId),
      );
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
      .innerJoin(
        studentEnrollments,
        eq(studentEnrollments.studentId, students.id),
      )
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
      .innerJoin(
        studentEnrollments,
        eq(studentEnrollments.studentId, students.id),
      )
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
      .where(
        and(
          eq(students.id, id),
          eq(students.instituteId, instituteId),
          isNull(students.deletedAt),
        ),
      )
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
      .where(
        and(
          eq(semesterHistories.instituteId, instituteId),
          eq(semesterHistories.studentId, id),
        ),
      )
      .orderBy(semesters.number);
  }

  async sectionChangeLog(instituteId: string, id: string) {
    await this.findOne(instituteId, id);

    const fromSection = alias(sections, 'from_section');
    const toSection = alias(sections, 'to_section');
    const fromBranch = alias(branches, 'from_branch');
    const toBranch = alias(branches, 'to_branch');

    const rows = await this.database.db
      .select({
        id: sectionChangeLogs.id,
        enrollmentId: sectionChangeLogs.enrollmentId,
        fromSectionId: sectionChangeLogs.fromSectionId,
        toSectionId: sectionChangeLogs.toSectionId,
        fromSectionName: sql<string>`coalesce(${sectionChangeLogs.fromSectionName}, ${fromSection.name})`,
        toSectionName: sql<string>`coalesce(${sectionChangeLogs.toSectionName}, ${toSection.name})`,
        fromBranchName: sql<string | null>`coalesce(${sectionChangeLogs.fromBranchName}, ${fromBranch.name})`,
        toBranchName: sql<string | null>`coalesce(${sectionChangeLogs.toBranchName}, ${toBranch.name})`,
        semesterId: sectionChangeLogs.semesterId,
        semesterLabel: sectionChangeLogs.semesterLabel,
        academicYear: sectionChangeLogs.academicYear,
        reason: sectionChangeLogs.reason,
        changedAt: sectionChangeLogs.changedAt,
        changedBy: sectionChangeLogs.changedBy,
        changedByName: sql<string>`trim(concat(${users.firstName}, ' ', coalesce(${users.lastName}, '')))`,
      })
      .from(sectionChangeLogs)
      .leftJoin(fromSection, eq(fromSection.id, sectionChangeLogs.fromSectionId))
      .leftJoin(toSection, eq(toSection.id, sectionChangeLogs.toSectionId))
      .leftJoin(fromBranch, eq(fromBranch.id, fromSection.branchId))
      .leftJoin(toBranch, eq(toBranch.id, toSection.branchId))
      .leftJoin(users, eq(users.id, sectionChangeLogs.changedBy))
      .where(
        and(
          eq(sectionChangeLogs.instituteId, instituteId),
          eq(sectionChangeLogs.studentId, id),
        ),
      )
      .orderBy(desc(sectionChangeLogs.changedAt));

    return rows.map((row) => ({
      ...row,
      fromLink: sectionLink({
        sectionId: row.fromSectionId,
        sectionName: row.fromSectionName ?? '—',
        branchId: null,
        branchName: row.fromBranchName,
        batchId: '',
      }),
      toLink: sectionLink({
        sectionId: row.toSectionId,
        sectionName: row.toSectionName ?? '—',
        branchId: null,
        branchName: row.toBranchName,
        batchId: '',
      }),
    }));
  }

  async branchChangeLog(instituteId: string, id: string) {
    await this.findOne(instituteId, id);

    const fromBranch = alias(branches, 'from_branch');
    const toBranch = alias(branches, 'to_branch');

    const rows = await this.database.db
      .select({
        id: branchChangeLogs.id,
        fromBranchId: branchChangeLogs.fromBranchId,
        toBranchId: branchChangeLogs.toBranchId,
        fromBranchName: sql<string>`coalesce(${branchChangeLogs.fromBranchName}, ${fromBranch.name})`,
        toBranchName: sql<string>`coalesce(${branchChangeLogs.toBranchName}, ${toBranch.name})`,
        fromSectionId: branchChangeLogs.fromSectionId,
        toSectionId: branchChangeLogs.toSectionId,
        fromSectionName: branchChangeLogs.fromSectionName,
        toSectionName: branchChangeLogs.toSectionName,
        atSemesterId: branchChangeLogs.atSemesterId,
        semesterLabel: branchChangeLogs.semesterLabel,
        reason: branchChangeLogs.reason,
        changedAt: branchChangeLogs.changedAt,
        changedBy: branchChangeLogs.changedBy,
        changedByName: sql<string>`trim(concat(${users.firstName}, ' ', coalesce(${users.lastName}, '')))`,
      })
      .from(branchChangeLogs)
      .leftJoin(fromBranch, eq(fromBranch.id, branchChangeLogs.fromBranchId))
      .leftJoin(toBranch, eq(toBranch.id, branchChangeLogs.toBranchId))
      .leftJoin(users, eq(users.id, branchChangeLogs.changedBy))
      .where(
        and(
          eq(branchChangeLogs.instituteId, instituteId),
          eq(branchChangeLogs.studentId, id),
        ),
      )
      .orderBy(desc(branchChangeLogs.changedAt));

    return rows.map((row) => ({
      ...row,
      fromLink: row.fromSectionId
        ? sectionLink({
            sectionId: row.fromSectionId,
            sectionName: row.fromSectionName ?? '—',
            branchId: row.fromBranchId,
            branchName: row.fromBranchName,
            batchId: '',
          })
        : branchLink(row.fromBranchId, row.fromBranchName),
      toLink: row.toSectionId
        ? sectionLink({
            sectionId: row.toSectionId,
            sectionName: row.toSectionName ?? '—',
            branchId: row.toBranchId,
            branchName: row.toBranchName,
            batchId: '',
          })
        : branchLink(row.toBranchId, row.toBranchName),
    }));
  }

  async auditLog(instituteId: string, id: string) {
    await this.findOne(instituteId, id);

    return this.database.db
      .select({
        id: academicAuditLogs.id,
        action: academicAuditLogs.action,
        summary: academicAuditLogs.summary,
        fromLink: academicAuditLogs.fromLink,
        toLink: academicAuditLogs.toLink,
        fromPayload: academicAuditLogs.fromPayload,
        toPayload: academicAuditLogs.toPayload,
        reason: academicAuditLogs.reason,
        changedBy: academicAuditLogs.changedBy,
        changedByName: academicAuditLogs.changedByName,
        changedByEmail: academicAuditLogs.changedByEmail,
        changedAt: academicAuditLogs.changedAt,
      })
      .from(academicAuditLogs)
      .where(
        and(
          eq(academicAuditLogs.instituteId, instituteId),
          eq(academicAuditLogs.studentId, id),
        ),
      )
      .orderBy(desc(academicAuditLogs.changedAt));
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
        and(
          eq(studentEnrollments.studentId, id),
          eq(studentEnrollments.instituteId, instituteId),
          eq(studentEnrollments.active, true),
        ),
      )
      .limit(1);

    if (!row) {
      throw new NotFoundException('Active enrollment not found');
    }

    return row;
  }

  private async assertUnique(
    instituteId: string,
    rollNumber?: string,
    email?: string,
    excludeId?: string,
  ) {
    if (rollNumber) {
      const [existing] = await this.database.db
        .select({
          id: students.id,
        })
        .from(students)
        .where(
          and(
            eq(students.instituteId, instituteId),
            eq(students.rollNumber, rollNumber),
            isNull(students.deletedAt),
          ),
        )
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
        .where(
          and(
            eq(students.instituteId, instituteId),
            eq(students.email, email),
            isNull(students.deletedAt),
          ),
        )
        .limit(1);

      if (existing && existing.id !== excludeId) {
        throw new ConflictException('Student email already exists');
      }
    }
  }
}

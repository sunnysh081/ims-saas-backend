import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { and, eq, isNull } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import {
  batches,
  courseOfferings,
  electiveChoices,
  programPlans,
  sections,
  students,
  studentEnrollments,
  subjects,
  syllabi,
  users,
} from '../../database/schema';
import { CreateOfferingDto, ListOfferingsQueryDto, UpdateOfferingDto } from './dto/offering.dto';

@Injectable()
export class OfferingService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async findAll(instituteId: string, query: ListOfferingsQueryDto) {
    const filters = [eq(courseOfferings.instituteId, instituteId)];

    if (query.semesterId) {
      filters.push(eq(courseOfferings.semesterId, query.semesterId));
    }

    if (query.sectionId) {
      filters.push(eq(courseOfferings.sectionId, query.sectionId));
    }

    if (query.batchId) {
      filters.push(eq(courseOfferings.batchId, query.batchId));
    }

    if (query.facultyId) {
      filters.push(eq(courseOfferings.facultyId, query.facultyId));
    }

    return this.database.db
      .select({
        id: courseOfferings.id,
        subjectId: courseOfferings.subjectId,
        subjectCode: subjects.code,
        subjectName: subjects.name,
        syllabusId: courseOfferings.syllabusId,
        semesterId: courseOfferings.semesterId,
        batchId: courseOfferings.batchId,
        sectionId: courseOfferings.sectionId,
        sectionName: sections.name,
        electiveGroupId: courseOfferings.electiveGroupId,
        facultyId: courseOfferings.facultyId,
        facultyName: users.firstName,
        isActive: courseOfferings.isActive,
      })
      .from(courseOfferings)
      .innerJoin(subjects, eq(subjects.id, courseOfferings.subjectId))
      .leftJoin(sections, eq(sections.id, courseOfferings.sectionId))
      .leftJoin(users, eq(users.id, courseOfferings.facultyId))
      .where(and(...filters));
  }

  async findOne(instituteId: string, id: string) {
    const [offering] = await this.database.db
      .select()
      .from(courseOfferings)
      .where(and(eq(courseOfferings.id, id), eq(courseOfferings.instituteId, instituteId)))
      .limit(1);

    if (!offering) {
      throw new NotFoundException('Course offering not found');
    }

    return offering;
  }

  async create(instituteId: string, dto: CreateOfferingDto) {
    const [existing] = await this.database.db
      .select({ id: courseOfferings.id })
      .from(courseOfferings)
      .where(
        and(
          eq(courseOfferings.subjectId, dto.subjectId),
          eq(courseOfferings.sectionId, dto.sectionId),
          eq(courseOfferings.semesterId, dto.semesterId),
        ),
      )
      .limit(1);

    if (existing) {
      throw new ConflictException('An offering for this subject and section already exists');
    }

    const [created] = await this.database.db
      .insert(courseOfferings)
      .values({
        instituteId,
        subjectId: dto.subjectId,
        syllabusId: dto.syllabusId,
        semesterId: dto.semesterId,
        batchId: dto.batchId,
        sectionId: dto.sectionId,
        facultyId: dto.facultyId,
      })
      .returning({ id: courseOfferings.id });

    if (!created) {
      throw new BadRequestException('Failed to create course offering');
    }

    this.logger.info('Course offering created', {
      operation: 'offerings.create',
      resource: 'course_offering',
      resourceId: created.id,
      instituteId,
    });

    return this.findOne(instituteId, created.id);
  }

  async update(instituteId: string, id: string, dto: UpdateOfferingDto) {
    await this.findOne(instituteId, id);

    await this.database.db
      .update(courseOfferings)
      .set({
        facultyId: dto.facultyId,
        syllabusId: dto.syllabusId,
        updatedAt: new Date(),
      })
      .where(eq(courseOfferings.id, id));

    return this.findOne(instituteId, id);
  }

  async generateOfferings(instituteId: string, semesterId: string, batchId: string) {
    const [batch] = await this.database.db
      .select({ id: batches.id, programId: batches.programId })
      .from(batches)
      .where(and(eq(batches.id, batchId), eq(batches.instituteId, instituteId), isNull(batches.deletedAt)))
      .limit(1);

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    const plans = await this.database.db
      .select()
      .from(programPlans)
      .where(
        and(
          eq(programPlans.instituteId, instituteId),
          eq(programPlans.programId, batch.programId),
          eq(programPlans.semesterId, semesterId),
          eq(programPlans.isElective, false),
        ),
      );

    if (!plans.length) {
      throw new BadRequestException('No core program plan entries found for this program and semester');
    }

    const created: { id: string }[] = [];

    await this.database.db.transaction(async (tx) => {
      for (const plan of plans) {
        const [activeSyllabus] = await tx
          .select({ id: syllabi.id })
          .from(syllabi)
          .where(and(eq(syllabi.subjectId, plan.subjectId), eq(syllabi.isActive, true)))
          .limit(1);

        if (!activeSyllabus) {
          continue;
        }

        const sectionFilters = [eq(sections.batchId, batchId), isNull(sections.deletedAt)];

        if (plan.branchId) {
          sectionFilters.push(eq(sections.branchId, plan.branchId));
        }

        const batchSections = await tx
          .select({ id: sections.id })
          .from(sections)
          .where(and(...sectionFilters));

        for (const section of batchSections) {
          const [existing] = await tx
            .select({ id: courseOfferings.id })
            .from(courseOfferings)
            .where(
              and(
                eq(courseOfferings.subjectId, plan.subjectId),
                eq(courseOfferings.sectionId, section.id),
                eq(courseOfferings.semesterId, semesterId),
              ),
            )
            .limit(1);

          if (existing) {
            continue;
          }

          const [row] = await tx
            .insert(courseOfferings)
            .values({
              instituteId,
              subjectId: plan.subjectId,
              syllabusId: activeSyllabus.id,
              semesterId,
              batchId,
              sectionId: section.id,
            })
            .onConflictDoNothing()
            .returning({ id: courseOfferings.id });

          if (row) {
            created.push(row);
          }
        }
      }
    });

    this.logger.info('Core offerings generated', {
      operation: 'offerings.generate',
      resource: 'course_offering',
      instituteId,
      semesterId,
      batchId,
      count: created.length,
    });

    return this.findAll(instituteId, { semesterId, batchId });
  }

  async getRoster(instituteId: string, id: string) {
    const offering = await this.findOne(instituteId, id);

    if (offering.electiveGroupId) {
      return this.database.db
        .select({
          id: students.id,
          rollNumber: students.rollNumber,
          name: students.name,
          email: students.email,
        })
        .from(electiveChoices)
        .innerJoin(students, eq(students.id, electiveChoices.studentId))
        .where(and(eq(electiveChoices.offeringId, id), eq(electiveChoices.status, 'CONFIRMED')));
    }

    return this.database.db
      .select({
        id: students.id,
        rollNumber: students.rollNumber,
        name: students.name,
        email: students.email,
        enrollmentId: studentEnrollments.id,
      })
      .from(studentEnrollments)
      .innerJoin(students, eq(students.id, studentEnrollments.studentId))
      .where(
        and(
          eq(studentEnrollments.sectionId, offering.sectionId ?? ''),
          eq(studentEnrollments.semesterId, offering.semesterId),
          eq(studentEnrollments.instituteId, instituteId),
          eq(studentEnrollments.active, true),
        ),
      );
  }
}

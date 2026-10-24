import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { and, eq, isNull, sql } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import {
  assignmentSubmissions,
  assignments,
  batches,
  programs,
  sections,
  studentEnrollments,
  students,
  subjects,
} from '../../database/schema';
import { LmsScopeService } from '../lms-scope.service';
import {
  AssignmentBodyDto,
  CreateAssignmentDto,
  GradeSubmissionDto,
  ListAssignmentsQueryDto,
  UpdateAssignmentDto,
} from './dto/assignment.dto';

type Tx = Parameters<Parameters<DatabaseService['db']['transaction']>[0]>[0];
type Rubric = { criterion: string; maxMarks: number }[];

const assignmentSelection = {
  id: assignments.id,
  batchId: assignments.batchId,
  batchStartYear: batches.startYear,
  batchEndYear: batches.endYear,
  subjectId: assignments.subjectId,
  subjectName: subjects.name,
  subjectCode: subjects.code,
  programId: batches.programId,
  programName: programs.name,
  programCode: programs.code,
  assignmentType: assignments.assignmentType,
  title: assignments.title,
  description: assignments.description,
  considerForGrading: assignments.considerForGrading,
  rubricGrading: assignments.rubricGrading,
  rubric: assignments.rubric,
  courseOutcomes: assignments.courseOutcomes,
  btLevel: assignments.btLevel,
  topicOutcomes: assignments.topicOutcomes,
  startsAt: assignments.startsAt,
  dueAt: assignments.dueAt,
  submissionType: assignments.submissionType,
  syllabusUnitId: assignments.syllabusUnitId,
  chapter: assignments.chapter,
  maxMarks: sql<number>`${assignments.maxMarks}::float8`,
  instructions: assignments.instructions,
  attachmentUrl: assignments.attachmentUrl,
  attachmentLabel: assignments.attachmentLabel,
  status: assignments.status,
  publishedAt: assignments.publishedAt,
  createdAt: assignments.createdAt,
  updatedAt: assignments.updatedAt,
  submittedCount: sql<number>`(select count(*)::int from ${assignmentSubmissions} where ${assignmentSubmissions.assignmentId} = ${assignments.id} and ${assignmentSubmissions.submittedAt} is not null)`,
  gradedCount: sql<number>`(select count(*)::int from ${assignmentSubmissions} where ${assignmentSubmissions.assignmentId} = ${assignments.id} and ${assignmentSubmissions.gradedAt} is not null)`,
};

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
    private readonly scope: LmsScopeService,
  ) {}

  async findAll(instituteId: string, query: ListAssignmentsQueryDto) {
    const filters = [eq(assignments.instituteId, instituteId), isNull(assignments.deletedAt)];

    if (query.batchId) {
      filters.push(eq(assignments.batchId, query.batchId));
    }

    if (query.subjectId) {
      filters.push(eq(assignments.subjectId, query.subjectId));
    }

    if (query.programId) {
      filters.push(eq(batches.programId, query.programId));
    }

    if (query.status) {
      filters.push(eq(assignments.status, query.status));
    }

    return this.database.db
      .select(assignmentSelection)
      .from(assignments)
      .innerJoin(batches, eq(batches.id, assignments.batchId))
      .innerJoin(subjects, eq(subjects.id, assignments.subjectId))
      .innerJoin(programs, eq(programs.id, batches.programId))
      .where(and(...filters))
      .orderBy(sql`${assignments.createdAt} desc`);
  }

  async findOne(instituteId: string, id: string) {
    const [assignment] = await this.database.db
      .select(assignmentSelection)
      .from(assignments)
      .innerJoin(batches, eq(batches.id, assignments.batchId))
      .innerJoin(subjects, eq(subjects.id, assignments.subjectId))
      .innerJoin(programs, eq(programs.id, batches.programId))
      .where(and(eq(assignments.id, id), eq(assignments.instituteId, instituteId), isNull(assignments.deletedAt)))
      .limit(1);

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return { ...assignment, rubric: assignment.rubric as Rubric };
  }

  async create(instituteId: string, dto: CreateAssignmentDto) {
    const values = this.values(dto);

    await this.scope.requireBatch(instituteId, dto.batchId);
    await this.scope.requireCurriculumPairing(instituteId, dto.batchId, dto.subjectId);
    await this.scope.requireSyllabusUnit(instituteId, dto.syllabusUnitId, dto.batchId, dto.subjectId);

    const copyTargets = [...new Set(dto.copyToBatchIds ?? [])].filter((id) => id !== dto.batchId);

    for (const targetBatchId of copyTargets) {
      await this.scope.requireBatch(instituteId, targetBatchId);
      await this.scope.requireCurriculumPairing(instituteId, targetBatchId, dto.subjectId);
    }

    const createdIds = await this.database.db.transaction(async (tx) => {
      const ids: string[] = [];

      for (const targetBatchId of [dto.batchId, ...copyTargets]) {
        ids.push(await this.insert(tx, instituteId, dto, values, targetBatchId, targetBatchId === dto.batchId));
      }

      return ids;
    });

    const primaryId = createdIds[0];

    if (!primaryId) {
      throw new BadRequestException('Failed to create assignment');
    }

    this.logger.info('Assignment created', {
      operation: 'assignments.create',
      resource: 'assignment',
      resourceId: primaryId,
      instituteId,
      copies: copyTargets.length,
    });

    return this.findOne(instituteId, primaryId);
  }

  async update(instituteId: string, id: string, dto: UpdateAssignmentDto) {
    const existing = await this.findOne(instituteId, id);
    const values = this.values(dto);

    await this.scope.requireSyllabusUnit(instituteId, dto.syllabusUnitId, existing.batchId, existing.subjectId);

    const marksChanged = Number(values.maxMarks) !== existing.maxMarks || JSON.stringify(values.rubric) !== JSON.stringify(existing.rubric);

    if (marksChanged && existing.gradedCount > 0) {
      throw new BadRequestException('Some submissions are already graded, so the marks and rubric can no longer be changed.');
    }

    await this.database.db
      .update(assignments)
      .set({
        ...values,
        publishedAt: dto.status === 'PUBLISHED' ? (existing.publishedAt ?? new Date()) : null,
        updatedAt: new Date(),
      })
      .where(eq(assignments.id, id));

    return this.findOne(instituteId, id);
  }

  async remove(instituteId: string, id: string) {
    await this.findOne(instituteId, id);

    await this.database.db.update(assignments).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(assignments.id, id));

    return { id };
  }

  async roster(instituteId: string, id: string) {
    const assignment = await this.findOne(instituteId, id);

    const rows = await this.database.db
      .select({
        studentId: students.id,
        name: students.name,
        rollNumber: students.rollNumber,
        submittedAt: assignmentSubmissions.submittedAt,
        isLate: assignmentSubmissions.isLate,
        marks: sql<number | null>`${assignmentSubmissions.marks}::float8`,
        gradedAt: assignmentSubmissions.gradedAt,
      })
      .from(students)
      .innerJoin(studentEnrollments, and(eq(studentEnrollments.studentId, students.id), eq(studentEnrollments.active, true)))
      .innerJoin(sections, eq(sections.id, studentEnrollments.sectionId))
      .leftJoin(assignmentSubmissions, and(eq(assignmentSubmissions.studentId, students.id), eq(assignmentSubmissions.assignmentId, id)))
      .where(and(eq(students.instituteId, instituteId), isNull(students.deletedAt), eq(sections.batchId, assignment.batchId)))
      .orderBy(students.rollNumber);

    return { assignment, students: rows };
  }

  async submissionDetail(instituteId: string, id: string, studentId: string) {
    const assignment = await this.findOne(instituteId, id);
    const student = await this.scope.requireRosterStudent(instituteId, assignment.batchId, studentId);

    const [submission] = await this.database.db
      .select({
        submissionText: assignmentSubmissions.submissionText,
        submissionUrl: assignmentSubmissions.submissionUrl,
        submittedAt: assignmentSubmissions.submittedAt,
        isLate: assignmentSubmissions.isLate,
        marks: sql<number | null>`${assignmentSubmissions.marks}::float8`,
        rubricMarks: assignmentSubmissions.rubricMarks,
        feedback: assignmentSubmissions.feedback,
        gradedAt: assignmentSubmissions.gradedAt,
      })
      .from(assignmentSubmissions)
      .where(and(eq(assignmentSubmissions.assignmentId, id), eq(assignmentSubmissions.studentId, studentId)))
      .limit(1);

    return { assignment, student, submission: submission ?? null };
  }

  async grade(instituteId: string, id: string, studentId: string, dto: GradeSubmissionDto) {
    const assignment = await this.findOne(instituteId, id);
    await this.scope.requireRosterStudent(instituteId, assignment.batchId, studentId);

    let marks: number;
    let rubricMarks: number[] | null = null;

    if (assignment.rubricGrading) {
      const given = dto.rubricMarks ?? [];

      if (given.length !== assignment.rubric.length) {
        throw new BadRequestException('Enter marks for every rubric criterion');
      }

      given.forEach((value, index) => {
        const criterion = assignment.rubric[index];

        if (value > criterion.maxMarks) {
          throw new BadRequestException(`Marks for "${criterion.criterion}" cannot exceed ${criterion.maxMarks}`);
        }
      });

      rubricMarks = given;
      marks = Math.round(given.reduce((sum, value) => sum + value, 0) * 100) / 100;
    } else {
      if (dto.marks === undefined) {
        throw new BadRequestException('Enter the marks');
      }

      if (dto.marks > assignment.maxMarks) {
        throw new BadRequestException(`Marks cannot exceed ${assignment.maxMarks}`);
      }

      marks = dto.marks;
    }

    const now = new Date();
    const graded = {
      marks: marks.toFixed(2),
      rubricMarks,
      feedback: dto.feedback ?? null,
      gradedAt: now,
      updatedAt: now,
    };

    await this.database.db
      .insert(assignmentSubmissions)
      .values({ instituteId, assignmentId: id, studentId, ...graded })
      .onConflictDoUpdate({
        target: [assignmentSubmissions.assignmentId, assignmentSubmissions.studentId],
        set: graded,
      });

    return this.submissionDetail(instituteId, id, studentId);
  }

  private values(dto: AssignmentBodyDto) {
    if (dto.startsAt && new Date(dto.dueAt) <= new Date(dto.startsAt)) {
      throw new BadRequestException('The due date must be after the start date');
    }

    const rubric: Rubric = dto.rubricGrading
      ? (dto.rubric ?? [])
          .map((item) => ({ criterion: item.criterion.trim(), maxMarks: item.maxMarks }))
          .filter((item) => item.criterion.length)
      : [];

    if (dto.rubricGrading && !rubric.length) {
      throw new BadRequestException('Add at least one rubric criterion');
    }

    const maxMarks = dto.rubricGrading
      ? Math.round(rubric.reduce((sum, item) => sum + item.maxMarks, 0) * 100) / 100
      : (dto.maxMarks ?? 100);

    return {
      assignmentType: dto.assignmentType,
      title: dto.title,
      description: dto.description,
      considerForGrading: dto.considerForGrading ?? false,
      rubricGrading: dto.rubricGrading ?? false,
      rubric,
      courseOutcomes: dto.courseOutcomes ?? [],
      btLevel: dto.btLevel ?? null,
      topicOutcomes: (dto.topicOutcomes ?? []).map((tag) => tag.trim()).filter((tag) => tag.length),
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      dueAt: new Date(dto.dueAt),
      submissionType: dto.submissionType,
      syllabusUnitId: dto.syllabusUnitId ?? null,
      chapter: dto.chapter ?? null,
      maxMarks: maxMarks.toFixed(2),
      instructions: dto.instructions ?? null,
      attachmentUrl: dto.attachmentUrl ?? null,
      attachmentLabel: dto.attachmentUrl ? (dto.attachmentLabel ?? null) : null,
      status: dto.status,
    };
  }

  private async insert(
    tx: Tx,
    instituteId: string,
    dto: CreateAssignmentDto,
    values: ReturnType<AssignmentsService['values']>,
    batchId: string,
    keepUnit: boolean,
  ) {
    const [created] = await tx
      .insert(assignments)
      .values({
        ...values,
        instituteId,
        batchId,
        subjectId: dto.subjectId,
        // Units belong to one batch's syllabus, so copies for other batches drop the link.
        syllabusUnitId: keepUnit ? values.syllabusUnitId : null,
        publishedAt: dto.status === 'PUBLISHED' ? new Date() : null,
      })
      .returning({ id: assignments.id });

    if (!created) {
      throw new BadRequestException('Failed to create assignment');
    }

    return created.id;
  }
}

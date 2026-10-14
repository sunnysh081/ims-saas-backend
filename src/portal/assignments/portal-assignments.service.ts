import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { and, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service';
import { assignmentSubmissions, assignments, subjects } from '../../database/schema';
import { PortalStudentScopeService } from '../portal-student-scope.service';
import { SubmitAssignmentDto } from './dto/portal-assignment.dto';

type AssignmentRow = typeof assignments.$inferSelect;
type SubmissionRow = typeof assignmentSubmissions.$inferSelect;

@Injectable()
export class PortalAssignmentsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly studentScope: PortalStudentScopeService,
  ) {}

  async list(instituteId: string, userId: string) {
    const scope = await this.studentScope.scopeFor(instituteId, userId);

    if (!scope.subjectIds.length) {
      return [];
    }

    const rows = await this.database.db
      .select({ assignment: assignments, subjectName: subjects.name, subjectCode: subjects.code })
      .from(assignments)
      .innerJoin(subjects, eq(subjects.id, assignments.subjectId))
      .where(this.visible(instituteId, scope))
      .orderBy(assignments.dueAt);

    const submissions = rows.length
      ? await this.database.db
          .select()
          .from(assignmentSubmissions)
          .where(
            and(
              eq(assignmentSubmissions.studentId, scope.studentId),
              inArray(
                assignmentSubmissions.assignmentId,
                rows.map((row) => row.assignment.id),
              ),
            ),
          )
      : [];
    const byAssignment = new Map(submissions.map((submission) => [submission.assignmentId, submission]));

    return rows.map((row) => ({
      ...this.summary(row.assignment, byAssignment.get(row.assignment.id)),
      subjectName: row.subjectName,
      subjectCode: row.subjectCode,
    }));
  }

  async detail(instituteId: string, userId: string, id: string) {
    const scope = await this.studentScope.scopeFor(instituteId, userId);
    const assignment = await this.requireVisible(instituteId, scope, id);
    const submission = await this.findSubmission(id, scope.studentId);
    const [subject] = await this.database.db
      .select({ name: subjects.name, code: subjects.code })
      .from(subjects)
      .where(eq(subjects.id, assignment.subjectId))
      .limit(1);

    const graded = submission?.gradedAt != null;

    return {
      ...this.summary(assignment, submission),
      subjectName: subject?.name,
      subjectCode: subject?.code,
      description: assignment.description,
      instructions: assignment.instructions,
      attachmentUrl: assignment.attachmentUrl,
      attachmentLabel: assignment.attachmentLabel,
      considerForGrading: assignment.considerForGrading,
      rubric: assignment.rubricGrading ? (assignment.rubric as { criterion: string; maxMarks: number }[]) : [],
      submission: submission
        ? {
            submissionText: submission.submissionText,
            submissionUrl: submission.submissionUrl,
            submittedAt: submission.submittedAt,
            isLate: submission.isLate,
            rubricMarks: graded ? submission.rubricMarks : null,
            feedback: graded ? submission.feedback : null,
          }
        : null,
    };
  }

  async submit(instituteId: string, userId: string, id: string, dto: SubmitAssignmentDto) {
    const scope = await this.studentScope.scopeFor(instituteId, userId);
    const assignment = await this.requireVisible(instituteId, scope, id);

    if (assignment.submissionType !== 'ONLINE') {
      throw new BadRequestException('This assignment is handed in on paper, not online');
    }

    if (!dto.text && !dto.url) {
      throw new BadRequestException('Write your answer or add a link before submitting');
    }

    const existing = await this.findSubmission(id, scope.studentId);

    if (existing?.gradedAt) {
      throw new ConflictException('This submission has already been graded and can no longer be changed');
    }

    const now = new Date();
    const submitted = {
      submissionText: dto.text ?? null,
      submissionUrl: dto.url ?? null,
      submittedAt: now,
      isLate: now > assignment.dueAt,
      updatedAt: now,
    };

    await this.database.db
      .insert(assignmentSubmissions)
      .values({ instituteId, assignmentId: id, studentId: scope.studentId, ...submitted })
      .onConflictDoUpdate({
        target: [assignmentSubmissions.assignmentId, assignmentSubmissions.studentId],
        set: submitted,
      });

    return this.detail(instituteId, userId, id);
  }

  private summary(assignment: AssignmentRow, submission: SubmissionRow | undefined) {
    const graded = submission?.gradedAt != null;
    const state = graded ? 'GRADED' : submission?.submittedAt ? 'SUBMITTED' : 'NOT_SUBMITTED';

    return {
      id: assignment.id,
      title: assignment.title,
      assignmentType: assignment.assignmentType,
      submissionType: assignment.submissionType,
      startsAt: assignment.startsAt,
      dueAt: assignment.dueAt,
      maxMarks: Number(assignment.maxMarks),
      state,
      isOverdue: new Date() > assignment.dueAt,
      submittedAt: submission?.submittedAt ?? null,
      isLate: submission?.isLate ?? false,
      marks: graded && submission?.marks != null ? Number(submission.marks) : null,
    };
  }

  private findSubmission(assignmentId: string, studentId: string) {
    return this.database.db
      .select()
      .from(assignmentSubmissions)
      .where(and(eq(assignmentSubmissions.assignmentId, assignmentId), eq(assignmentSubmissions.studentId, studentId)))
      .limit(1)
      .then((rows) => rows[0]);
  }

  private visible(instituteId: string, scope: { batchId: string; subjectIds: string[] }) {
    return and(
      eq(assignments.instituteId, instituteId),
      eq(assignments.status, 'PUBLISHED'),
      isNull(assignments.deletedAt),
      eq(assignments.batchId, scope.batchId),
      inArray(assignments.subjectId, scope.subjectIds),
      or(isNull(assignments.startsAt), lte(assignments.startsAt, sql`now()`)),
    );
  }

  private async requireVisible(instituteId: string, scope: { batchId: string; subjectIds: string[] }, id: string) {
    if (!scope.subjectIds.length) {
      throw new NotFoundException('Assignment not found');
    }

    const [assignment] = await this.database.db
      .select()
      .from(assignments)
      .where(and(eq(assignments.id, id), this.visible(instituteId, scope)))
      .limit(1);

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return assignment;
  }
}

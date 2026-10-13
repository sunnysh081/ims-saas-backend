import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { type GradableQuestion, gradeQuestion, reviewQuestions, sanitizeAnswer, seededShuffle } from '../../academic/quizzes/quiz-grading';
import { DatabaseService } from '../../database/database.service';
import {
  curriculumPlans,
  quizAttemptAnswers,
  quizAttempts,
  quizQuestions,
  quizzes,
  sections,
  studentEnrollments,
  students,
  subjects,
} from '../../database/schema';
import { SubmitQuizDto } from './dto/portal-quiz.dto';

// Answers arriving slightly after the deadline are still accepted (network delay, clock drift).
const SUBMIT_GRACE_MS = 60_000;

type QuizRow = typeof quizzes.$inferSelect;
type AttemptRow = typeof quizAttempts.$inferSelect;

@Injectable()
export class PortalQuizzesService {
  constructor(private readonly database: DatabaseService) {}

  async list(instituteId: string, userId: string) {
    const scope = await this.scopeFor(instituteId, userId);

    if (!scope.subjectIds.length) {
      return [];
    }

    const rows = await this.database.db
      .select({
        quiz: quizzes,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        questionCount: sql<number>`(select count(*)::int from ${quizQuestions} where ${quizQuestions.quizId} = ${quizzes.id})`,
        totalMarks: sql<number>`(select coalesce(sum(${quizQuestions.maxMarks}), 0)::float8 from ${quizQuestions} where ${quizQuestions.quizId} = ${quizzes.id})`,
      })
      .from(quizzes)
      .innerJoin(subjects, eq(subjects.id, quizzes.subjectId))
      .where(this.visibleFilter(instituteId, scope))
      .orderBy(sql`${quizzes.createdAt} desc`);

    const attempts = rows.length
      ? await this.database.db
          .select()
          .from(quizAttempts)
          .where(
            and(
              eq(quizAttempts.studentId, scope.studentId),
              inArray(
                quizAttempts.quizId,
                rows.map((row) => row.quiz.id),
              ),
            ),
          )
      : [];
    const attemptByQuiz = new Map(attempts.map((attempt) => [attempt.quizId, attempt]));

    return rows.map((row) => ({
      ...this.summary(row.quiz, attemptByQuiz.get(row.quiz.id)),
      subjectName: row.subjectName,
      subjectCode: row.subjectCode,
      questionCount: row.questionCount,
      totalMarks: row.totalMarks,
    }));
  }

  async detail(instituteId: string, userId: string, quizId: string) {
    const scope = await this.scopeFor(instituteId, userId);
    const quiz = await this.requireVisibleQuiz(instituteId, scope, quizId);
    const attempt = await this.findAttempt(quizId, scope.studentId);
    const [meta] = await this.database.db
      .select({
        subjectName: subjects.name,
        subjectCode: subjects.code,
        questionCount: sql<number>`(select count(*)::int from ${quizQuestions} where ${quizQuestions.quizId} = ${quizzes.id})`,
        totalMarks: sql<number>`(select coalesce(sum(${quizQuestions.maxMarks}), 0)::float8 from ${quizQuestions} where ${quizQuestions.quizId} = ${quizzes.id})`,
      })
      .from(quizzes)
      .innerJoin(subjects, eq(subjects.id, quizzes.subjectId))
      .where(eq(quizzes.id, quizId))
      .limit(1);

    return {
      ...this.summary(quiz, attempt),
      description: quiz.description,
      shuffleQuestions: quiz.shuffleQuestions,
      subjectName: meta?.subjectName,
      subjectCode: meta?.subjectCode,
      questionCount: meta?.questionCount ?? 0,
      totalMarks: meta?.totalMarks ?? 0,
    };
  }

  async start(instituteId: string, userId: string, quizId: string) {
    const scope = await this.scopeFor(instituteId, userId);
    const quiz = await this.requireVisibleQuiz(instituteId, scope, quizId);
    const existing = await this.findAttempt(quizId, scope.studentId);

    if (existing?.status === 'SUBMITTED') {
      throw new ConflictException('You have already submitted this quiz');
    }

    if (existing) {
      return this.attemptView(quiz, existing);
    }

    const state = this.availability(quiz);

    if (state === 'UPCOMING') {
      throw new BadRequestException('This quiz has not started yet');
    }

    if (state === 'CLOSED') {
      throw new BadRequestException('This quiz is closed');
    }

    const [{ count }] = await this.database.db
      .select({ count: sql<number>`count(*)::int` })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId));

    if (!count) {
      throw new BadRequestException('This quiz has no questions');
    }

    const now = Date.now();
    const timerEnd = quiz.isTimed && quiz.durationMinutes ? now + quiz.durationMinutes * 60_000 : null;
    const closeAt = quiz.endsAt ? quiz.endsAt.getTime() : null;
    const deadline = timerEnd !== null && closeAt !== null ? Math.min(timerEnd, closeAt) : (timerEnd ?? closeAt);

    const [created] = await this.database.db
      .insert(quizAttempts)
      .values({
        instituteId,
        quizId,
        studentId: scope.studentId,
        deadlineAt: deadline === null ? null : new Date(deadline),
      })
      .onConflictDoNothing()
      .returning();

    const attempt = created ?? (await this.findAttempt(quizId, scope.studentId));

    if (!attempt) {
      throw new BadRequestException('Unable to start the quiz');
    }

    return this.attemptView(quiz, attempt);
  }

  async currentAttempt(instituteId: string, userId: string, quizId: string) {
    const scope = await this.scopeFor(instituteId, userId);
    const quiz = await this.requireVisibleQuiz(instituteId, scope, quizId);
    const attempt = await this.findAttempt(quizId, scope.studentId);

    if (!attempt || attempt.status !== 'IN_PROGRESS') {
      throw new NotFoundException('No quiz attempt in progress');
    }

    if (this.pastDeadline(attempt)) {
      await this.finalize(quizId, attempt, [], true);
      throw new BadRequestException('Time is up. Your quiz was submitted automatically.');
    }

    return this.attemptView(quiz, attempt);
  }

  async submit(instituteId: string, userId: string, quizId: string, dto: SubmitQuizDto) {
    const scope = await this.scopeFor(instituteId, userId);
    const quiz = await this.requireVisibleQuiz(instituteId, scope, quizId);
    const attempt = await this.findAttempt(quizId, scope.studentId);

    if (!attempt) {
      throw new NotFoundException('You have not started this quiz');
    }

    if (attempt.status === 'SUBMITTED') {
      throw new ConflictException('You have already submitted this quiz');
    }

    const timedOut = this.pastDeadline(attempt);
    const submitted = await this.finalize(quizId, attempt, timedOut ? [] : dto.answers, timedOut);

    return this.summary(quiz, submitted);
  }

  async result(instituteId: string, userId: string, quizId: string) {
    const scope = await this.scopeFor(instituteId, userId);
    const quiz = await this.requireVisibleQuiz(instituteId, scope, quizId);
    const attempt = await this.findAttempt(quizId, scope.studentId);

    if (!attempt || attempt.status !== 'SUBMITTED') {
      throw new NotFoundException('No submitted attempt for this quiz');
    }

    if (!this.resultsVisible(quiz, attempt)) {
      throw new ForbiddenException('Results are not available yet');
    }

    const questions = await this.database.db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(asc(quizQuestions.position));
    const answers = await this.database.db.select().from(quizAttemptAnswers).where(eq(quizAttemptAnswers.attemptId, attempt.id));

    return {
      ...this.summary(quiz, attempt),
      questions: reviewQuestions(questions as unknown as GradableQuestion[], answers),
    };
  }

  private async finalize(
    quizId: string,
    attempt: AttemptRow,
    given: { questionId: string; answer?: unknown }[],
    timedOut: boolean,
  ) {
    const questions = (await this.database.db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))) as unknown as GradableQuestion[];
    const givenByQuestion = new Map(given.map((item) => [item.questionId, item.answer]));

    let score = 0;
    let total = 0;
    let pendingManual = false;

    const rows = questions.map((question) => {
      const answer = sanitizeAnswer(question, givenByQuestion.get(question.id));
      const grade = gradeQuestion(question, answer);

      total += Number(question.maxMarks);
      score += grade.marks ?? 0;
      pendingManual ||= grade.marks === null;

      return {
        attemptId: attempt.id,
        questionId: question.id,
        answer,
        marksAwarded: grade.marks === null ? null : grade.marks.toFixed(2),
        isCorrect: grade.isCorrect,
      };
    });

    return this.database.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(quizAttempts)
        .set({
          status: 'SUBMITTED',
          submittedAt: new Date(),
          score: Math.max(0, score).toFixed(2),
          totalMarks: total.toFixed(2),
          pendingManual,
          timedOut,
        })
        .where(and(eq(quizAttempts.id, attempt.id), eq(quizAttempts.status, 'IN_PROGRESS')))
        .returning();

      if (!updated) {
        throw new ConflictException('You have already submitted this quiz');
      }

      if (rows.length) {
        await tx.insert(quizAttemptAnswers).values(rows);
      }

      return updated;
    });
  }

  private async attemptView(quiz: QuizRow, attempt: AttemptRow) {
    const rows = await this.database.db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quiz.id))
      .orderBy(asc(quizQuestions.position));
    const ordered = quiz.shuffleQuestions ? seededShuffle(rows, `${attempt.id}:questions`) : rows;

    const questions = ordered.map((question) => {
      const key = (question.answerData ?? {}) as {
        options?: { text: string }[];
        blanks?: string[];
        pairs?: { left: string; right: string }[];
      };
      const base = {
        id: question.id,
        type: question.type,
        text: question.text,
        maxMarks: Number(question.maxMarks),
        allowNegativeMarking: question.allowNegativeMarking,
        negativeMarks: Number(question.negativeMarks),
      };

      if (question.type === 'MCQ_SINGLE' || question.type === 'MCQ_MULTIPLE') {
        const options = (key.options ?? []).map((option, index) => ({ index, text: option.text }));

        return {
          ...base,
          options: quiz.shuffleOptions ? seededShuffle(options, `${attempt.id}:${question.id}`) : options,
        };
      }

      if (question.type === 'BLANKS') {
        return { ...base, blankCount: (key.blanks ?? []).length };
      }

      if (question.type === 'MATCH') {
        const pairs = key.pairs ?? [];

        return {
          ...base,
          left: pairs.map((pair) => pair.left),
          right: seededShuffle(
            pairs.map((pair, index) => ({ index, text: pair.right })),
            `${attempt.id}:${question.id}:match`,
          ),
        };
      }

      return base;
    });

    return {
      attempt: {
        id: attempt.id,
        startedAt: attempt.startedAt,
        deadlineAt: attempt.deadlineAt,
        status: attempt.status,
      },
      quiz: { id: quiz.id, title: quiz.title, isTimed: quiz.isTimed, durationMinutes: quiz.durationMinutes },
      serverNow: new Date(),
      questions,
    };
  }

  private availability(quiz: QuizRow, now = new Date()): 'UPCOMING' | 'OPEN' | 'CLOSED' {
    if (quiz.startsAt && quiz.startsAt > now) {
      return 'UPCOMING';
    }

    if (quiz.endsAt && quiz.endsAt < now) {
      return 'CLOSED';
    }

    return 'OPEN';
  }

  private pastDeadline(attempt: AttemptRow) {
    return attempt.deadlineAt !== null && Date.now() > attempt.deadlineAt.getTime() + SUBMIT_GRACE_MS;
  }

  private resultsVisible(quiz: QuizRow, attempt: AttemptRow | undefined, now = new Date()) {
    if (!attempt || attempt.status !== 'SUBMITTED') {
      return false;
    }

    switch (quiz.resultsDisplay) {
      case 'ON_SUBMIT':
        return true;
      case 'ON_CLOSE':
        return quiz.endsAt !== null && quiz.endsAt <= now;
      default:
        return quiz.scoresPublishedAt !== null;
    }
  }

  private summary(quiz: QuizRow, attempt: AttemptRow | undefined) {
    const visible = this.resultsVisible(quiz, attempt);

    return {
      id: quiz.id,
      title: quiz.title,
      quizType: quiz.quizType,
      isTimed: quiz.isTimed,
      durationMinutes: quiz.durationMinutes,
      startsAt: quiz.startsAt,
      endsAt: quiz.endsAt,
      resultsDisplay: quiz.resultsDisplay,
      availability: this.availability(quiz),
      attemptStatus: attempt ? attempt.status : 'NOT_STARTED',
      submittedAt: attempt?.submittedAt ?? null,
      timedOut: attempt?.timedOut ?? false,
      resultsVisible: visible,
      pendingManual: visible ? (attempt?.pendingManual ?? false) : null,
      score: visible && attempt?.score != null ? Number(attempt.score) : null,
      resultTotal: visible && attempt?.totalMarks != null ? Number(attempt.totalMarks) : null,
    };
  }

  private findAttempt(quizId: string, studentId: string) {
    return this.database.db
      .select()
      .from(quizAttempts)
      .where(and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.studentId, studentId)))
      .limit(1)
      .then((rows) => rows[0]);
  }

  private visibleFilter(instituteId: string, scope: { batchId: string; subjectIds: string[] }) {
    return and(
      eq(quizzes.instituteId, instituteId),
      eq(quizzes.status, 'PUBLISHED'),
      isNull(quizzes.deletedAt),
      eq(quizzes.batchId, scope.batchId),
      inArray(quizzes.subjectId, scope.subjectIds),
    );
  }

  private async requireVisibleQuiz(instituteId: string, scope: { batchId: string; subjectIds: string[] }, quizId: string) {
    if (!scope.subjectIds.length) {
      throw new NotFoundException('Quiz not found');
    }

    const [quiz] = await this.database.db
      .select()
      .from(quizzes)
      .where(and(eq(quizzes.id, quizId), this.visibleFilter(instituteId, scope)))
      .limit(1);

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return quiz;
  }

  // The student is always derived from the logged-in user, never from the request.
  private async scopeFor(instituteId: string, userId: string) {
    const [student] = await this.database.db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.userId, userId), eq(students.instituteId, instituteId), isNull(students.deletedAt)))
      .limit(1);

    if (!student) {
      throw new ForbiddenException('No student profile linked to this account');
    }

    const [enrollment] = await this.database.db
      .select({ semesterId: studentEnrollments.semesterId, batchId: sections.batchId })
      .from(studentEnrollments)
      .innerJoin(sections, eq(sections.id, studentEnrollments.sectionId))
      .where(
        and(
          eq(studentEnrollments.studentId, student.id),
          eq(studentEnrollments.instituteId, instituteId),
          eq(studentEnrollments.active, true),
        ),
      )
      .limit(1);

    if (!enrollment) {
      return { studentId: student.id, batchId: '', subjectIds: [] as string[] };
    }

    const plans = await this.database.db
      .select({ subjectId: curriculumPlans.subjectId })
      .from(curriculumPlans)
      .where(
        and(
          eq(curriculumPlans.batchId, enrollment.batchId),
          eq(curriculumPlans.semesterId, enrollment.semesterId),
          isNull(curriculumPlans.deletedAt),
        ),
      );

    return {
      studentId: student.id,
      batchId: enrollment.batchId,
      subjectIds: plans.map((plan) => plan.subjectId),
    };
  }
}

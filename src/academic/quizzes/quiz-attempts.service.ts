import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { and, asc, desc, eq, isNull } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service';
import { quizAttemptAnswers, quizAttempts, quizQuestions, quizzes, students } from '../../database/schema';
import { GradeAttemptDto } from './dto/quiz.dto';
import { type GradableQuestion, reviewQuestions } from './quiz-grading';

const attemptSelection = {
  id: quizAttempts.id,
  studentId: quizAttempts.studentId,
  studentName: students.name,
  rollNumber: students.rollNumber,
  status: quizAttempts.status,
  startedAt: quizAttempts.startedAt,
  submittedAt: quizAttempts.submittedAt,
  score: quizAttempts.score,
  totalMarks: quizAttempts.totalMarks,
  pendingManual: quizAttempts.pendingManual,
  timedOut: quizAttempts.timedOut,
};

@Injectable()
export class QuizAttemptsService {
  constructor(private readonly database: DatabaseService) {}

  async list(instituteId: string, quizId: string) {
    const quiz = await this.requireQuiz(instituteId, quizId);

    const rows = await this.database.db
      .select(attemptSelection)
      .from(quizAttempts)
      .innerJoin(students, eq(students.id, quizAttempts.studentId))
      .where(eq(quizAttempts.quizId, quizId))
      .orderBy(desc(quizAttempts.startedAt));

    return {
      quiz: {
        id: quiz.id,
        title: quiz.title,
        status: quiz.status,
        resultsDisplay: quiz.resultsDisplay,
        scoresPublishedAt: quiz.scoresPublishedAt,
      },
      attempts: rows.map((row) => this.present(row)),
    };
  }

  async findOne(instituteId: string, quizId: string, attemptId: string) {
    const quiz = await this.requireQuiz(instituteId, quizId);
    const attempt = await this.requireAttempt(quizId, attemptId);

    const questions = await this.database.db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, quizId))
      .orderBy(asc(quizQuestions.position));
    const answers = await this.database.db
      .select()
      .from(quizAttemptAnswers)
      .where(eq(quizAttemptAnswers.attemptId, attemptId));

    return {
      quiz: { id: quiz.id, title: quiz.title },
      attempt: this.present(attempt),
      questions: reviewQuestions(questions as unknown as GradableQuestion[], answers),
    };
  }

  async grade(instituteId: string, quizId: string, attemptId: string, dto: GradeAttemptDto) {
    await this.requireQuiz(instituteId, quizId);
    const attempt = await this.requireAttempt(quizId, attemptId);

    if (attempt.status !== 'SUBMITTED') {
      throw new BadRequestException('This attempt has not been submitted yet');
    }

    const questions = await this.database.db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId));
    const byId = new Map(questions.map((question) => [question.id, question]));

    for (const grade of dto.grades) {
      const question = byId.get(grade.questionId);

      if (!question || (question.type !== 'SUBJECTIVE' && question.type !== 'ESSAY')) {
        throw new BadRequestException('Only written answers can be graded manually');
      }

      if (grade.marks > Number(question.maxMarks)) {
        throw new BadRequestException(`Marks cannot exceed ${Number(question.maxMarks)} for this question`);
      }
    }

    await this.database.db.transaction(async (tx) => {
      for (const grade of dto.grades) {
        await tx
          .update(quizAttemptAnswers)
          .set({ marksAwarded: grade.marks.toFixed(2), isCorrect: null })
          .where(and(eq(quizAttemptAnswers.attemptId, attemptId), eq(quizAttemptAnswers.questionId, grade.questionId)));
      }

      const answers = await tx.select().from(quizAttemptAnswers).where(eq(quizAttemptAnswers.attemptId, attemptId));
      const score = answers.reduce((sum, answer) => sum + Number(answer.marksAwarded ?? 0), 0);
      const pendingManual = answers.some((answer) => answer.marksAwarded === null);

      await tx
        .update(quizAttempts)
        .set({ score: Math.max(0, score).toFixed(2), pendingManual })
        .where(eq(quizAttempts.id, attemptId));
    });

    return this.findOne(instituteId, quizId, attemptId);
  }

  async setScoresPublished(instituteId: string, quizId: string, published: boolean) {
    await this.requireQuiz(instituteId, quizId);

    await this.database.db
      .update(quizzes)
      .set({ scoresPublishedAt: published ? new Date() : null, updatedAt: new Date() })
      .where(eq(quizzes.id, quizId));

    return this.list(instituteId, quizId);
  }

  private present(row: {
    id: string;
    studentId: string;
    studentName?: string;
    rollNumber?: string;
    status: string;
    startedAt: Date;
    submittedAt: Date | null;
    score: string | null;
    totalMarks: string | null;
    pendingManual: boolean;
    timedOut: boolean;
  }) {
    return {
      ...row,
      score: row.score === null ? null : Number(row.score),
      totalMarks: row.totalMarks === null ? null : Number(row.totalMarks),
    };
  }

  private async requireQuiz(instituteId: string, quizId: string) {
    const [quiz] = await this.database.db
      .select()
      .from(quizzes)
      .where(and(eq(quizzes.id, quizId), eq(quizzes.instituteId, instituteId), isNull(quizzes.deletedAt)))
      .limit(1);

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return quiz;
  }

  private async requireAttempt(quizId: string, attemptId: string) {
    const [attempt] = await this.database.db
      .select(attemptSelection)
      .from(quizAttempts)
      .innerJoin(students, eq(students.id, quizAttempts.studentId))
      .where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.quizId, quizId)))
      .limit(1);

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    return attempt;
  }
}

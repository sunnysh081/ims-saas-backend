import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { AppLogger } from '../../common/logging/logger.service';
import { DatabaseService } from '../../database/database.service';
import { LmsScopeService } from '../lms-scope.service';
import {
  batches,
  programs,
  quizAttempts,
  quizQuestions,
  quizzes,
  subjects,
} from '../../database/schema';
import { CreateQuizDto, ListQuizzesQueryDto, QuizBodyDto, QuizQuestionDto, UpdateQuizDto } from './dto/quiz.dto';

type Tx = Parameters<Parameters<DatabaseService['db']['transaction']>[0]>[0];

const quizSelection = {
  id: quizzes.id,
  batchId: quizzes.batchId,
  batchStartYear: batches.startYear,
  batchEndYear: batches.endYear,
  subjectId: quizzes.subjectId,
  subjectName: subjects.name,
  subjectCode: subjects.code,
  programId: batches.programId,
  programName: programs.name,
  programCode: programs.code,
  quizType: quizzes.quizType,
  title: quizzes.title,
  description: quizzes.description,
  syllabusUnitId: quizzes.syllabusUnitId,
  chapter: quizzes.chapter,
  isTimed: quizzes.isTimed,
  durationMinutes: quizzes.durationMinutes,
  considerForGrading: quizzes.considerForGrading,
  shuffleQuestions: quizzes.shuffleQuestions,
  shuffleOptions: quizzes.shuffleOptions,
  startsAt: quizzes.startsAt,
  endsAt: quizzes.endsAt,
  resultsDisplay: quizzes.resultsDisplay,
  status: quizzes.status,
  publishedAt: quizzes.publishedAt,
  scoresPublishedAt: quizzes.scoresPublishedAt,
  createdAt: quizzes.createdAt,
  updatedAt: quizzes.updatedAt,
  attemptCount: sql<number>`(select count(*)::int from ${quizAttempts} where ${quizAttempts.quizId} = ${quizzes.id} and ${quizAttempts.status} = 'SUBMITTED')`,
  questionCount: sql<number>`(select count(*)::int from ${quizQuestions} where ${quizQuestions.quizId} = ${quizzes.id})`,
  totalMarks: sql<number>`(select coalesce(sum(${quizQuestions.maxMarks}), 0)::float8 from ${quizQuestions} where ${quizQuestions.quizId} = ${quizzes.id})`,
};

@Injectable()
export class QuizzesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
    private readonly scope: LmsScopeService,
  ) {}

  async findAll(instituteId: string, query: ListQuizzesQueryDto) {
    const filters = [eq(quizzes.instituteId, instituteId), isNull(quizzes.deletedAt)];

    if (query.batchId) {
      filters.push(eq(quizzes.batchId, query.batchId));
    }

    if (query.subjectId) {
      filters.push(eq(quizzes.subjectId, query.subjectId));
    }

    if (query.programId) {
      filters.push(eq(batches.programId, query.programId));
    }

    if (query.status) {
      filters.push(eq(quizzes.status, query.status));
    }

    return this.database.db
      .select(quizSelection)
      .from(quizzes)
      .innerJoin(batches, eq(batches.id, quizzes.batchId))
      .innerJoin(subjects, eq(subjects.id, quizzes.subjectId))
      .innerJoin(programs, eq(programs.id, batches.programId))
      .where(and(...filters))
      .orderBy(sql`${quizzes.createdAt} desc`);
  }

  async findOne(instituteId: string, id: string) {
    const [quiz] = await this.database.db
      .select(quizSelection)
      .from(quizzes)
      .innerJoin(batches, eq(batches.id, quizzes.batchId))
      .innerJoin(subjects, eq(subjects.id, quizzes.subjectId))
      .innerJoin(programs, eq(programs.id, batches.programId))
      .where(and(eq(quizzes.id, id), eq(quizzes.instituteId, instituteId), isNull(quizzes.deletedAt)))
      .limit(1);

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const rows = await this.database.db
      .select()
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, id))
      .orderBy(asc(quizQuestions.position));

    const questions = rows.map((row) => {
      const answer = (row.answerData ?? {}) as Record<string, unknown>;

      return {
        id: row.id,
        type: row.type,
        text: row.text,
        courseOutcomes: row.courseOutcomes,
        btLevel: row.btLevel,
        topicOutcomes: row.topicOutcomes,
        maxMarks: Number(row.maxMarks),
        allowNegativeMarking: row.allowNegativeMarking,
        negativeMarks: Number(row.negativeMarks),
        options: answer.options as { text: string; isCorrect: boolean }[] | undefined,
        correct: answer.correct as boolean | undefined,
        blanks: answer.blanks as string[] | undefined,
        pairs: answer.pairs as { left: string; right: string }[] | undefined,
      };
    });

    return { ...quiz, questions };
  }

  async create(instituteId: string, dto: CreateQuizDto) {
    const publish = dto.status === 'PUBLISHED';
    this.validateBody(dto, publish);

    const batch = await this.scope.requireBatch(instituteId, dto.batchId);
    await this.scope.requireCurriculumPairing(instituteId, dto.batchId, dto.subjectId);
    await this.scope.requireSyllabusUnit(instituteId, dto.syllabusUnitId, dto.batchId, dto.subjectId);

    const copyTargets = [...new Set(dto.copyToBatchIds ?? [])].filter((id) => id !== dto.batchId);

    for (const targetBatchId of copyTargets) {
      await this.scope.requireBatch(instituteId, targetBatchId);
      await this.scope.requireCurriculumPairing(instituteId, targetBatchId, dto.subjectId);
    }

    const questionRows = dto.questions.map((question) => this.toQuestionValues(question, publish));

    const createdIds = await this.database.db.transaction(async (tx) => {
      const ids: string[] = [];

      for (const targetBatchId of [dto.batchId, ...copyTargets]) {
        const isPrimary = targetBatchId === dto.batchId;
        const quizId = await this.insertQuiz(tx, instituteId, dto, targetBatchId, isPrimary);

        await this.insertQuestions(tx, quizId, questionRows);
        ids.push(quizId);
      }

      return ids;
    });

    const primaryId = createdIds[0];

    if (!primaryId) {
      throw new BadRequestException('Failed to create quiz');
    }

    this.logger.info('Quiz created', {
      operation: 'quizzes.create',
      resource: 'quiz',
      resourceId: primaryId,
      instituteId,
      programId: batch.programId,
      copies: copyTargets.length,
    });

    return this.findOne(instituteId, primaryId);
  }

  async update(instituteId: string, id: string, dto: UpdateQuizDto) {
    const existing = await this.findOne(instituteId, id);
    const publish = dto.status === 'PUBLISHED';

    this.validateBody(dto, publish);
    await this.scope.requireSyllabusUnit(instituteId, dto.syllabusUnitId, existing.batchId, existing.subjectId);

    const questionRows = dto.questions.map((question) => this.toQuestionValues(question, publish));

    const questionsUnchanged = this.sameQuestions(existing.questions, questionRows);

    if (!questionsUnchanged) {
      const [{ count }] = await this.database.db
        .select({ count: sql<number>`count(*)::int` })
        .from(quizAttempts)
        .where(eq(quizAttempts.quizId, id));

      if (count > 0) {
        throw new BadRequestException(
          'Students have already attempted this quiz, so its questions can no longer be changed. Other settings can still be edited.',
        );
      }
    }

    await this.database.db.transaction(async (tx) => {
      await tx
        .update(quizzes)
        .set({
          ...this.quizValues(dto),
          publishedAt: publish ? (existing.publishedAt ?? new Date()) : null,
          updatedAt: new Date(),
        })
        .where(eq(quizzes.id, id));

      if (!questionsUnchanged) {
        await tx.delete(quizQuestions).where(eq(quizQuestions.quizId, id));
        await this.insertQuestions(tx, id, questionRows);
      }
    });

    return this.findOne(instituteId, id);
  }

  async remove(instituteId: string, id: string) {
    await this.findOne(instituteId, id);

    await this.database.db
      .update(quizzes)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(quizzes.id, id));

    return { id };
  }

  private sameQuestions(
    current: Awaited<ReturnType<QuizzesService['findOne']>>['questions'],
    next: ReturnType<QuizzesService['toQuestionValues']>[],
  ) {
    const normalize = (question: {
      type: string;
      text: string;
      maxMarks: number;
      allowNegativeMarking: boolean;
      negativeMarks: number;
      courseOutcomes: string[];
      btLevel: string | null;
      topicOutcomes: string[];
      answerData: unknown;
    }) => JSON.stringify(question);

    return (
      current.length === next.length &&
      current.every((question, index) => {
        const other = next[index]!;

        return (
          normalize({
            type: question.type,
            text: question.text,
            maxMarks: question.maxMarks,
            allowNegativeMarking: question.allowNegativeMarking,
            negativeMarks: question.allowNegativeMarking ? question.negativeMarks : 0,
            courseOutcomes: question.courseOutcomes,
            btLevel: question.btLevel,
            topicOutcomes: question.topicOutcomes,
            answerData: {
              options: question.options,
              correct: question.correct,
              blanks: question.blanks,
              pairs: question.pairs,
            },
          }) ===
          normalize({
            type: other.type,
            text: other.text,
            maxMarks: Number(other.maxMarks),
            allowNegativeMarking: other.allowNegativeMarking,
            negativeMarks: Number(other.negativeMarks),
            courseOutcomes: other.courseOutcomes,
            btLevel: other.btLevel,
            topicOutcomes: other.topicOutcomes,
            answerData: {
              options: (other.answerData as { options?: unknown }).options,
              correct: (other.answerData as { correct?: unknown }).correct,
              blanks: (other.answerData as { blanks?: unknown }).blanks,
              pairs: (other.answerData as { pairs?: unknown }).pairs,
            },
          })
        );
      })
    );
  }

  private quizValues(dto: QuizBodyDto) {
    return {
      quizType: dto.quizType,
      title: dto.title,
      description: dto.description ?? null,
      syllabusUnitId: dto.syllabusUnitId ?? null,
      chapter: dto.chapter ?? null,
      isTimed: dto.isTimed ?? false,
      durationMinutes: dto.isTimed ? (dto.durationMinutes ?? null) : null,
      considerForGrading: dto.considerForGrading ?? true,
      shuffleQuestions: dto.shuffleQuestions ?? false,
      shuffleOptions: dto.shuffleOptions ?? false,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      resultsDisplay: dto.resultsDisplay,
      status: dto.status,
    };
  }

  private async insertQuiz(
    tx: Tx,
    instituteId: string,
    dto: CreateQuizDto,
    batchId: string,
    keepUnit: boolean,
  ) {
    const [created] = await tx
      .insert(quizzes)
      .values({
        instituteId,
        batchId,
        subjectId: dto.subjectId,
        ...this.quizValues(dto),
        // Units belong to one batch's syllabus, so copies for other batches drop the link.
        syllabusUnitId: keepUnit ? (dto.syllabusUnitId ?? null) : null,
        publishedAt: dto.status === 'PUBLISHED' ? new Date() : null,
      })
      .returning({ id: quizzes.id });

    if (!created) {
      throw new BadRequestException('Failed to create quiz');
    }

    return created.id;
  }

  private async insertQuestions(tx: Tx, quizId: string, rows: ReturnType<QuizzesService['toQuestionValues']>[]) {
    if (!rows.length) {
      return;
    }

    await tx.insert(quizQuestions).values(
      rows.map((row, index) => ({
        ...row,
        quizId,
        position: index + 1,
      })),
    );
  }

  private validateBody(dto: QuizBodyDto, publish: boolean) {
    if (dto.isTimed && !dto.durationMinutes) {
      throw new BadRequestException('Duration is required for a timed quiz');
    }

    if (dto.startsAt && dto.endsAt && new Date(dto.endsAt) <= new Date(dto.startsAt)) {
      throw new BadRequestException('End time must be after the start time');
    }

    if (publish && !dto.questions.length) {
      throw new BadRequestException('Add at least one question before publishing');
    }
  }

  private toQuestionValues(question: QuizQuestionDto, publish: boolean) {
    const label = question.text.slice(0, 40);
    const fail = (message: string): never => {
      throw new BadRequestException(`${message} (question: "${label}")`);
    };

    let answerData: Record<string, unknown> = {};

    switch (question.type) {
      case 'MCQ_SINGLE':
      case 'MCQ_MULTIPLE': {
        const options = (question.options ?? [])
          .map((option) => ({ text: option.text.trim(), isCorrect: option.isCorrect }))
          .filter((option) => option.text.length);
        const correctCount = options.filter((option) => option.isCorrect).length;

        if (publish && options.length < 2) {
          fail('At least two options are required');
        }

        if (publish && question.type === 'MCQ_SINGLE' && correctCount !== 1) {
          fail('Select exactly one correct option');
        }

        if (publish && question.type === 'MCQ_MULTIPLE' && correctCount < 1) {
          fail('Select at least one correct option');
        }

        if (question.type === 'MCQ_SINGLE' && correctCount > 1) {
          fail('Only one option can be correct');
        }

        answerData = { options };
        break;
      }
      case 'TRUE_FALSE': {
        if (typeof question.correct !== 'boolean') {
          fail('Choose True or False as the correct answer');
        }

        answerData = { correct: question.correct };
        break;
      }
      case 'BLANKS': {
        const blanks = (question.blanks ?? []).map((answer) => answer.trim()).filter((answer) => answer.length);
        const placeholders = (question.text.match(/___/g) ?? []).length;

        if (publish && !blanks.length) {
          fail('Enter the acceptable answer for each blank');
        }

        if (publish && placeholders !== blanks.length) {
          fail(`The question has ${placeholders} blank(s) (___) but ${blanks.length} answer(s)`);
        }

        answerData = { blanks };
        break;
      }
      case 'MATCH': {
        const pairs = (question.pairs ?? [])
          .map((pair) => ({ left: pair.left.trim(), right: pair.right.trim() }))
          .filter((pair) => pair.left.length && pair.right.length);

        if (publish && pairs.length < 2) {
          fail('Add at least two complete pairs');
        }

        answerData = { pairs };
        break;
      }
      default:
        break;
    }

    const negative = question.allowNegativeMarking ?? false;

    if (negative && !(question.negativeMarks && question.negativeMarks > 0)) {
      fail('Enter the marks to deduct for a wrong answer');
    }

    if (negative && (question.negativeMarks ?? 0) > question.maxMarks) {
      fail('Negative marks cannot exceed the maximum marks');
    }

    return {
      type: question.type,
      text: question.text.trim(),
      courseOutcomes: question.courseOutcomes ?? [],
      btLevel: question.btLevel ?? null,
      topicOutcomes: (question.topicOutcomes ?? []).map((tag) => tag.trim()).filter((tag) => tag.length),
      maxMarks: question.maxMarks.toFixed(2),
      allowNegativeMarking: negative,
      negativeMarks: negative ? (question.negativeMarks ?? 0).toFixed(2) : '0',
      answerData,
    };
  }
}

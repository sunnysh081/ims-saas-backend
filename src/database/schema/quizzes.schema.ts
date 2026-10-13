import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { batches } from './batches.schema';
import {
  quizAttemptStatusEnum,
  quizQuestionTypeEnum,
  quizResultsDisplayEnum,
  quizStatusEnum,
  quizTypeEnum,
} from './enums';
import { institutes } from './institutes.schema';
import { students } from './students.schema';
import { subjects } from './subjects.schema';
import { syllabusUnits } from './syllabus-units.schema';

// A quiz is scoped to one batch + subject, which must exist in that batch's
// curriculum. That is the same pairing students are matched against.
export const quizzes = pgTable(
  'quizzes',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, { onDelete: 'cascade' }),

    batchId: uuid('batch_id')
      .notNull()
      .references(() => batches.id, { onDelete: 'cascade' }),

    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),

    quizType: quizTypeEnum('quiz_type').notNull().default('CLASS_QUIZ'),

    title: varchar('title', { length: 255 }).notNull(),

    description: text('description'),

    syllabusUnitId: uuid('syllabus_unit_id').references(
      () => syllabusUnits.id,
      { onDelete: 'set null' },
    ),

    chapter: varchar('chapter', { length: 255 }),

    isTimed: boolean('is_timed').notNull().default(false),

    durationMinutes: integer('duration_minutes'),

    considerForGrading: boolean('consider_for_grading').notNull().default(true),

    shuffleQuestions: boolean('shuffle_questions').notNull().default(false),

    shuffleOptions: boolean('shuffle_options').notNull().default(false),

    startsAt: timestamp('starts_at', { withTimezone: true }),

    endsAt: timestamp('ends_at', { withTimezone: true }),

    resultsDisplay: quizResultsDisplayEnum('results_display')
      .notNull()
      .default('ON_PUBLISH'),

    status: quizStatusEnum('status').notNull().default('DRAFT'),

    publishedAt: timestamp('published_at', { withTimezone: true }),

    // Set when staff publish scores (used by the "scores are published by me" option).
    scoresPublishedAt: timestamp('scores_published_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),

    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('quizzes_institute_id_idx').on(table.instituteId),
    index('quizzes_batch_subject_idx').on(table.batchId, table.subjectId),
  ],
);

export const quizQuestions = pgTable(
  'quiz_questions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    quizId: uuid('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'cascade' }),

    position: integer('position').notNull(),

    type: quizQuestionTypeEnum('type').notNull(),

    text: text('text').notNull(),

    courseOutcomes: text('course_outcomes').array().notNull().default([]),

    btLevel: varchar('bt_level', { length: 20 }),

    topicOutcomes: text('topic_outcomes').array().notNull().default([]),

    maxMarks: numeric('max_marks', { precision: 6, scale: 2 })
      .notNull()
      .default('1'),

    allowNegativeMarking: boolean('allow_negative_marking')
      .notNull()
      .default(false),

    negativeMarks: numeric('negative_marks', { precision: 6, scale: 2 })
      .notNull()
      .default('0'),

    // Type-specific answer key, validated in QuizzesService:
    //   MCQ_*: { options: [{ text, isCorrect }] }
    //   TRUE_FALSE: { correct: boolean }
    //   BLANKS: { blanks: string[] }
    //   MATCH: { pairs: [{ left, right }] }
    //   SUBJECTIVE / ESSAY: {}
    answerData: jsonb('answer_data').notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('quiz_questions_quiz_id_idx').on(table.quizId)],
);

// One attempt per student per quiz.
export const quizAttempts = pgTable(
  'quiz_attempts',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, { onDelete: 'cascade' }),

    quizId: uuid('quiz_id')
      .notNull()
      .references(() => quizzes.id, { onDelete: 'cascade' }),

    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),

    status: quizAttemptStatusEnum('status').notNull().default('IN_PROGRESS'),

    startedAt: timestamp('started_at', { withTimezone: true })
      .defaultNow()
      .notNull(),

    // Latest moment answers are accepted (timer end or quiz close, whichever is first).
    deadlineAt: timestamp('deadline_at', { withTimezone: true }),

    submittedAt: timestamp('submitted_at', { withTimezone: true }),

    score: numeric('score', { precision: 8, scale: 2 }),

    totalMarks: numeric('total_marks', { precision: 8, scale: 2 }),

    // True while subjective/essay answers still need marks from staff.
    pendingManual: boolean('pending_manual').notNull().default(false),

    timedOut: boolean('timed_out').notNull().default(false),
  },
  (table) => [
    uniqueIndex('quiz_attempts_quiz_student_unique').on(table.quizId, table.studentId),
    index('quiz_attempts_quiz_id_idx').on(table.quizId),
    index('quiz_attempts_student_id_idx').on(table.studentId),
  ],
);

export const quizAttemptAnswers = pgTable(
  'quiz_attempt_answers',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    attemptId: uuid('attempt_id')
      .notNull()
      .references(() => quizAttempts.id, { onDelete: 'cascade' }),

    questionId: uuid('question_id')
      .notNull()
      .references(() => quizQuestions.id, { onDelete: 'cascade' }),

    // Shape depends on the question type; see PortalQuizzesService.
    answer: jsonb('answer'),

    marksAwarded: numeric('marks_awarded', { precision: 6, scale: 2 }),

    isCorrect: boolean('is_correct'),
  },
  (table) => [
    uniqueIndex('quiz_attempt_answers_attempt_question_unique').on(table.attemptId, table.questionId),
  ],
);

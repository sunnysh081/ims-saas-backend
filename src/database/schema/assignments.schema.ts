import { boolean, index, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { batches } from './batches.schema';
import { assignmentStatusEnum, assignmentSubmissionTypeEnum, assignmentTypeEnum } from './enums';
import { institutes } from './institutes.schema';
import { students } from './students.schema';
import { subjects } from './subjects.schema';
import { syllabusUnits } from './syllabus-units.schema';

// Scoped to one batch + subject, like quizzes, so it matches the student's curriculum.
export const assignments = pgTable(
  'assignments',
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

    assignmentType: assignmentTypeEnum('assignment_type').notNull().default('CLASS_ASSIGNMENT'),

    title: varchar('title', { length: 255 }).notNull(),

    description: text('description').notNull(),

    considerForGrading: boolean('consider_for_grading').notNull().default(false),

    rubricGrading: boolean('rubric_grading').notNull().default(false),

    // [{ criterion, maxMarks }] when rubricGrading is on; maxMarks is then their sum.
    rubric: jsonb('rubric').notNull().default([]),

    courseOutcomes: text('course_outcomes').array().notNull().default([]),

    btLevel: varchar('bt_level', { length: 20 }),

    topicOutcomes: text('topic_outcomes').array().notNull().default([]),

    startsAt: timestamp('starts_at', { withTimezone: true }),

    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),

    submissionType: assignmentSubmissionTypeEnum('submission_type').notNull().default('ONLINE'),

    syllabusUnitId: uuid('syllabus_unit_id').references(() => syllabusUnits.id, {
      onDelete: 'set null',
    }),

    chapter: varchar('chapter', { length: 255 }),

    maxMarks: numeric('max_marks', { precision: 7, scale: 2 }).notNull().default('100'),

    instructions: text('instructions'),

    // A plain link for now; real file upload can replace it later.
    attachmentUrl: text('attachment_url'),

    attachmentLabel: varchar('attachment_label', { length: 255 }),

    status: assignmentStatusEnum('status').notNull().default('DRAFT'),

    publishedAt: timestamp('published_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('assignments_institute_id_idx').on(table.instituteId),
    index('assignments_batch_subject_idx').on(table.batchId, table.subjectId),
  ],
);

// One row per student per assignment. submittedAt stays null when staff only record
// marks (physical submissions, or a student who handed nothing in online).
export const assignmentSubmissions = pgTable(
  'assignment_submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, { onDelete: 'cascade' }),

    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => assignments.id, { onDelete: 'cascade' }),

    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),

    submissionText: text('submission_text'),

    submissionUrl: text('submission_url'),

    submittedAt: timestamp('submitted_at', { withTimezone: true }),

    isLate: boolean('is_late').notNull().default(false),

    marks: numeric('marks', { precision: 7, scale: 2 }),

    rubricMarks: jsonb('rubric_marks'),

    feedback: text('feedback'),

    gradedAt: timestamp('graded_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('assignment_submissions_assignment_student_unique').on(table.assignmentId, table.studentId),
    index('assignment_submissions_student_id_idx').on(table.studentId),
  ],
);

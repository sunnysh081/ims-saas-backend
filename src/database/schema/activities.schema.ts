import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { activityStatusEnum, activityTypeEnum } from './enums';
import { batches } from './batches.schema';
import { institutes } from './institutes.schema';
import { students } from './students.schema';
import { subjects } from './subjects.schema';
import { users } from './users.schema';

// Class engagement scoped to one batch + subject, like quizzes and assignments.
//   DISCUSSION: students and staff post replies.
//   POLL: students pick one option.
//   PRACTICAL: staff record who has completed it.
export const activities = pgTable(
  'activities',
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

    activityType: activityTypeEnum('activity_type').notNull(),

    title: varchar('title', { length: 255 }).notNull(),

    description: text('description').notNull(),

    // string[] of poll choices; empty for other types.
    pollOptions: jsonb('poll_options').notNull().default([]),

    startsAt: timestamp('starts_at', { withTimezone: true }),

    endsAt: timestamp('ends_at', { withTimezone: true }),

    status: activityStatusEnum('status').notNull().default('DRAFT'),

    publishedAt: timestamp('published_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('activities_institute_id_idx').on(table.instituteId),
    index('activities_batch_subject_idx').on(table.batchId, table.subjectId),
  ],
);

export const activityPosts = pgTable(
  'activity_posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, { onDelete: 'cascade' }),

    activityId: uuid('activity_id')
      .notNull()
      .references(() => activities.id, { onDelete: 'cascade' }),

    authorUserId: uuid('author_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // A reply to another post in the same activity (one level is enough for the UI).
    parentId: uuid('parent_id'),

    body: text('body').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),

    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('activity_posts_activity_id_idx').on(table.activityId)],
);

export const activityPollVotes = pgTable(
  'activity_poll_votes',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    activityId: uuid('activity_id')
      .notNull()
      .references(() => activities.id, { onDelete: 'cascade' }),

    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),

    optionIndex: integer('option_index').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('activity_poll_votes_activity_student_unique').on(table.activityId, table.studentId)],
);

export const activityRecords = pgTable(
  'activity_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, { onDelete: 'cascade' }),

    activityId: uuid('activity_id')
      .notNull()
      .references(() => activities.id, { onDelete: 'cascade' }),

    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'cascade' }),

    completed: boolean('completed').notNull().default(false),

    remarks: text('remarks'),

    markedAt: timestamp('marked_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex('activity_records_activity_student_unique').on(table.activityId, table.studentId)],
);

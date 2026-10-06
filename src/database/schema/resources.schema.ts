import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { institutes } from './institutes.schema';
import { subjects } from './subjects.schema';

export const resources = pgTable(
  'resources',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, {
        onDelete: 'cascade',
      }),

    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, {
        onDelete: 'cascade',
      }),

    title: varchar('title', {
      length: 255,
    }).notNull(),

    description: text('description'),

    // Plain link for now; a future `attachmentId` FK for real file upload can
    // sit alongside this without a breaking migration.
    url: text('url').notNull(),

    isPublished: boolean('is_published').notNull().default(false),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    deletedAt: timestamp('deleted_at', {
      withTimezone: true,
    }),
  },

  (table) => [
    index('resources_institute_id_idx').on(table.instituteId),
    index('resources_subject_id_idx').on(table.subjectId),
  ],
);

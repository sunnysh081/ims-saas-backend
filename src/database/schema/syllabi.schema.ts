import {
  boolean,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { sql } from 'drizzle-orm';

import { batches } from './batches.schema';
import { institutes } from './institutes.schema';
import { subjects } from './subjects.schema';

export const syllabi = pgTable(
  'syllabi',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, {
        onDelete: 'cascade',
      }),

    // Syllabus content is scoped per admission batch, since curriculum
    // revisions apply going forward rather than retroactively.
    batchId: uuid('batch_id')
      .notNull()
      .references(() => batches.id, {
        onDelete: 'cascade',
      }),

    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, {
        onDelete: 'restrict',
      }),

    title: varchar('title', {
      length: 255,
    }),

    isActive: boolean('is_active').notNull().default(true),

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
    uniqueIndex('syllabi_batch_subject_unique')
      .on(table.batchId, table.subjectId)
      .where(sql`${table.deletedAt} IS NULL`),

    index('syllabi_institute_id_idx').on(table.instituteId),
    index('syllabi_batch_id_idx').on(table.batchId),
    index('syllabi_subject_id_idx').on(table.subjectId),
  ],
);

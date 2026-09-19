import {
  boolean,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { sql } from 'drizzle-orm';

import { batches } from './batches.schema';
import { institutes } from './institutes.schema';
import { semesters } from './semesters.schema';
import { subjects } from './subjects.schema';

// Maps which subjects are taught in which semester of a given batch's
// curriculum. Scoped per batch (not just program) so a curriculum revision
// for a new admission year doesn't retroactively change older batches.
export const curriculumPlans = pgTable(
  'curriculum_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, {
        onDelete: 'cascade',
      }),

    batchId: uuid('batch_id')
      .notNull()
      .references(() => batches.id, {
        onDelete: 'cascade',
      }),

    semesterId: uuid('semester_id')
      .notNull()
      .references(() => semesters.id, {
        onDelete: 'cascade',
      }),

    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, {
        onDelete: 'restrict',
      }),

    isElective: boolean('is_elective').notNull().default(false),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    deletedAt: timestamp('deleted_at', {
      withTimezone: true,
    }),
  },

  (table) => [
    uniqueIndex('curriculum_plans_batch_semester_subject_unique')
      .on(table.batchId, table.semesterId, table.subjectId)
      .where(sql`${table.deletedAt} IS NULL`),

    index('curriculum_plans_institute_id_idx').on(table.instituteId),
    index('curriculum_plans_batch_id_idx').on(table.batchId),
    index('curriculum_plans_semester_id_idx').on(table.semesterId),
  ],
);

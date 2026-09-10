import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { batches } from './batches.schema';
import { institutes } from './institutes.schema';
import { semesters } from './semesters.schema';
import { users } from './users.schema';

export const semesterTransitions = pgTable(
  'semester_transitions',
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

    fromSemId: uuid('from_sem_id')
      .notNull()
      .references(() => semesters.id, {
        onDelete: 'restrict',
      }),

    toSemId: uuid('to_sem_id')
      .notNull()
      .references(() => semesters.id, {
        onDelete: 'restrict',
      }),

    triggeredBy: uuid('triggered_by')
      .notNull()
      .references(() => users.id, {
        onDelete: 'restrict',
      }),

    triggeredAt: timestamp('triggered_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    notes: text('notes'),
  },

  (table) => [
    index('semester_transitions_institute_id_idx').on(table.instituteId),
    index('semester_transitions_batch_id_idx').on(table.batchId),
  ],
);

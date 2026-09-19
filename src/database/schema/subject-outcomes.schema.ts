import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { subjects } from './subjects.schema';
import { subjectOutcomeTypeEnum } from './enums';

export const subjectOutcomes = pgTable(
  'subject_outcomes',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, {
        onDelete: 'cascade',
      }),

    type: subjectOutcomeTypeEnum('type').notNull(),

    code: varchar('code', {
      length: 20,
    }).notNull(),

    statement: text('statement').notNull(),

    sortOrder: integer('sort_order').notNull().default(0),

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
  },

  (table) => [
    index('subject_outcomes_subject_id_idx').on(table.subjectId),
    index('subject_outcomes_type_idx').on(table.type),
  ],
);

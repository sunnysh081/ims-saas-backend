import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { branches } from './branches.schema';
import { branchOutcomeTypeEnum } from './enums';

export const branchOutcomes = pgTable(
  'branch_outcomes',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, {
        onDelete: 'cascade',
      }),

    type: branchOutcomeTypeEnum('type').notNull(),

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
    index('branch_outcomes_branch_id_idx').on(table.branchId),
    index('branch_outcomes_type_idx').on(table.type),
  ],
);

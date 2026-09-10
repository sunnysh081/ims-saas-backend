import {
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { sql } from 'drizzle-orm';

import { batches } from './batches.schema';
import { branches } from './branches.schema';
import { institutes } from './institutes.schema';

export const sections = pgTable(
  'sections',
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

    name: varchar('name', {
      length: 50,
    }).notNull(),

    branchId: uuid('branch_id').references(() => branches.id, {
      onDelete: 'set null',
    }),

    capacity: integer('capacity').notNull(),

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
    uniqueIndex('sections_batch_name_unique')
      .on(table.batchId, table.name)
      .where(sql`${table.deletedAt} IS NULL`),

    index('sections_institute_id_idx').on(table.instituteId),
    index('sections_batch_id_idx').on(table.batchId),
    index('sections_branch_id_idx').on(table.branchId),
  ],
);

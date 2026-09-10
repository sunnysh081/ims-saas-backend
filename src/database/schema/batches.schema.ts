import {
  boolean,
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { institutes } from './institutes.schema';
import { programs } from './programs.schema';

export const batches = pgTable(
  'batches',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, {
        onDelete: 'cascade',
      }),

    programId: uuid('program_id')
      .notNull()
      .references(() => programs.id, {
        onDelete: 'restrict',
      }),

    startYear: integer('start_year').notNull(),

    endYear: integer('end_year').notNull(),

    isCombined: boolean('is_combined').notNull().default(true),

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
    index('batches_institute_id_idx').on(table.instituteId),
    index('batches_program_id_idx').on(table.programId),
    index('batches_active_idx').on(table.isActive),
  ],
);

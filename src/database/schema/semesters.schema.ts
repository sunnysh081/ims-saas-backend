import {
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { institutes } from './institutes.schema';
import { programs } from './programs.schema';

export const semesters = pgTable(
  'semesters',
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
        onDelete: 'cascade',
      }),

    number: integer('number').notNull(),

    label: varchar('label', {
      length: 50,
    }).notNull(),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => [
    uniqueIndex('semesters_program_number_unique').on(
      table.programId,
      table.number,
    ),

    index('semesters_institute_id_idx').on(table.instituteId),
    index('semesters_program_id_idx').on(table.programId),
  ],
);

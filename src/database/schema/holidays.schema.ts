import { index, pgTable, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { institutes } from './institutes.schema';
import { programs } from './programs.schema';

export const holidays = pgTable(
  'holidays',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, {
        onDelete: 'cascade',
      }),

    date: varchar('date', {
      length: 10,
    }).notNull(),

    name: varchar('name', {
      length: 255,
    }).notNull(),

    // null = institute-wide
    programId: uuid('program_id').references(() => programs.id, {
      onDelete: 'cascade',
    }),
  },

  (table) => [
    uniqueIndex('holidays_institute_date_program_unique').on(table.instituteId, table.date, table.programId),

    index('holidays_institute_id_idx').on(table.instituteId),
    index('holidays_date_idx').on(table.date),
  ],
);

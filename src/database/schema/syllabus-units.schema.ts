import { index, integer, pgTable, text, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { institutes } from './institutes.schema';
import { syllabi } from './syllabi.schema';

export const syllabusUnits = pgTable(
  'syllabus_units',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, {
        onDelete: 'cascade',
      }),

    syllabusId: uuid('syllabus_id')
      .notNull()
      .references(() => syllabi.id, {
        onDelete: 'cascade',
      }),

    unitNumber: integer('unit_number').notNull(),

    title: varchar('title', {
      length: 255,
    }).notNull(),

    topics: text('topics').notNull(),

    hours: integer('hours').notNull(),

    weightage: integer('weightage'),
  },

  (table) => [
    uniqueIndex('syllabus_units_unit_number_unique').on(table.syllabusId, table.unitNumber),

    index('syllabus_units_institute_id_idx').on(table.instituteId),
    index('syllabus_units_syllabus_id_idx').on(table.syllabusId),
  ],
);

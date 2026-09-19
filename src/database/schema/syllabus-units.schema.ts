import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { syllabi } from './syllabi.schema';

export const syllabusUnits = pgTable(
  'syllabus_units',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    syllabusId: uuid('syllabus_id')
      .notNull()
      .references(() => syllabi.id, {
        onDelete: 'cascade',
      }),

    unitNumber: integer('unit_number').notNull(),

    title: varchar('title', {
      length: 255,
    }).notNull(),

    topics: text('topics'),

    hours: integer('hours'),

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

  (table) => [index('syllabus_units_syllabus_id_idx').on(table.syllabusId)],
);

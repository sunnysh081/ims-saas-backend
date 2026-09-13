import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { institutes } from './institutes.schema';
import { subjects } from './subjects.schema';

export const syllabi = pgTable(
  'syllabi',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, {
        onDelete: 'cascade',
      }),

    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, {
        onDelete: 'cascade',
      }),

    version: varchar('version', {
      length: 20,
    }).notNull(),

    regulationYear: integer('regulation_year').notNull(),

    description: text('description'),

    outcomes: text('outcomes'),

    references: text('references'),

    totalHours: integer('total_hours'),

    isActive: boolean('is_active').notNull().default(false),

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
    uniqueIndex('syllabi_subject_version_unique').on(table.subjectId, table.version),

    index('syllabi_institute_id_idx').on(table.instituteId),
    index('syllabi_subject_id_idx').on(table.subjectId),
    index('syllabi_active_idx').on(table.isActive),
  ],
);

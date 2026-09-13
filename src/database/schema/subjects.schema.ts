import { boolean, index, integer, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { institutes } from './institutes.schema';
import { programs } from './programs.schema';
import { subjectCategoryEnum, subjectTypeEnum } from './enums';

export const subjects = pgTable(
  'subjects',
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

    code: varchar('code', {
      length: 20,
    }).notNull(),

    name: varchar('name', {
      length: 255,
    }).notNull(),

    shortName: varchar('short_name', {
      length: 50,
    }),

    type: subjectTypeEnum('type').notNull(),

    category: subjectCategoryEnum('category').notNull(),

    credits: integer('credits').notNull(),

    theoryHours: integer('theory_hours').default(0),

    labHours: integer('lab_hours').default(0),

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
  },

  (table) => [
    uniqueIndex('subjects_institute_code_unique').on(table.instituteId, table.code),

    index('subjects_institute_id_idx').on(table.instituteId),
    index('subjects_program_id_idx').on(table.programId),
    index('subjects_category_idx').on(table.category),
    index('subjects_active_idx').on(table.isActive),
  ],
);

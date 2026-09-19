import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { sql } from 'drizzle-orm';

import { institutes } from './institutes.schema';
import { programs } from './programs.schema';
import { subjectTypeEnum } from './enums';

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
        onDelete: 'restrict',
      }),

    name: varchar('name', {
      length: 255,
    }).notNull(),

    code: varchar('code', {
      length: 50,
    }),

    shortName: varchar('short_name', {
      length: 50,
    }),

    type: subjectTypeEnum('type').notNull().default('THEORY'),

    lectureHours: integer('lecture_hours'),

    tutorialHours: integer('tutorial_hours'),

    practicalHours: integer('practical_hours'),

    maxMarks: integer('max_marks').notNull().default(100),

    passingMarks: integer('passing_marks').notNull().default(35),

    credits: numeric('credits', {
      precision: 4,
      scale: 2,
    }).notNull(),

    theoryMarks: integer('theory_marks'),

    practicalMarks: integer('practical_marks'),

    internalMarks: integer('internal_marks'),

    description: text('description'),

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
    uniqueIndex('subjects_program_code_unique')
      .on(table.programId, table.code)
      .where(sql`${table.deletedAt} IS NULL AND ${table.code} IS NOT NULL`),

    index('subjects_institute_id_idx').on(table.instituteId),
    index('subjects_program_id_idx').on(table.programId),
  ],
);

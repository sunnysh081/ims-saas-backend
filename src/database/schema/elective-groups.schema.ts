import { boolean, index, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { branches } from './branches.schema';
import { electiveGroupTypeEnum } from './enums';
import { institutes } from './institutes.schema';
import { programs } from './programs.schema';
import { semesters } from './semesters.schema';

export const electiveGroups = pgTable(
  'elective_groups',
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

    semesterId: uuid('semester_id')
      .notNull()
      .references(() => semesters.id, {
        onDelete: 'cascade',
      }),

    // null = open elective, available across branches
    branchId: uuid('branch_id').references(() => branches.id, {
      onDelete: 'cascade',
    }),

    name: varchar('name', {
      length: 50,
    }).notNull(),

    type: electiveGroupTypeEnum('type').notNull(),

    maxChoices: integer('max_choices').notNull().default(1),

    choiceWindowOpen: timestamp('choice_window_open', {
      withTimezone: true,
    }),

    choiceWindowClose: timestamp('choice_window_close', {
      withTimezone: true,
    }),

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
    index('elective_groups_institute_id_idx').on(table.instituteId),
    index('elective_groups_program_id_idx').on(table.programId),
    index('elective_groups_semester_id_idx').on(table.semesterId),
  ],
);

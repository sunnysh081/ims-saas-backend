import { boolean, index, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { branches } from './branches.schema';
import { institutes } from './institutes.schema';
import { programs } from './programs.schema';
import { semesters } from './semesters.schema';
import { subjects } from './subjects.schema';

export const programPlans = pgTable(
  'program_plans',
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

    // null = common to all branches
    branchId: uuid('branch_id').references(() => branches.id, {
      onDelete: 'cascade',
    }),

    semesterId: uuid('semester_id')
      .notNull()
      .references(() => semesters.id, {
        onDelete: 'cascade',
      }),

    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, {
        onDelete: 'cascade',
      }),

    isElective: boolean('is_elective').notNull().default(false),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => [
    uniqueIndex('program_plans_unique').on(table.programId, table.branchId, table.semesterId, table.subjectId),

    index('program_plans_institute_id_idx').on(table.instituteId),
    index('program_plans_program_id_idx').on(table.programId),
    index('program_plans_semester_id_idx').on(table.semesterId),
  ],
);

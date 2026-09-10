import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { branches } from './branches.schema';
import { institutes } from './institutes.schema';
import { sections } from './sections.schema';
import { semesters } from './semesters.schema';
import { students } from './students.schema';
import { users } from './users.schema';

export const branchChangeLogs = pgTable(
  'branch_change_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, {
        onDelete: 'cascade',
      }),

    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, {
        onDelete: 'cascade',
      }),

    fromBranchId: uuid('from_branch_id')
      .notNull()
      .references(() => branches.id, {
        onDelete: 'restrict',
      }),

    toBranchId: uuid('to_branch_id')
      .notNull()
      .references(() => branches.id, {
        onDelete: 'restrict',
      }),

    fromBranchName: varchar('from_branch_name', { length: 255 }),

    toBranchName: varchar('to_branch_name', { length: 255 }),

    fromSectionId: uuid('from_section_id').references(() => sections.id, {
      onDelete: 'set null',
    }),

    toSectionId: uuid('to_section_id').references(() => sections.id, {
      onDelete: 'set null',
    }),

    fromSectionName: varchar('from_section_name', { length: 50 }),

    toSectionName: varchar('to_section_name', { length: 50 }),

    atSemesterId: uuid('at_semester_id')
      .notNull()
      .references(() => semesters.id, {
        onDelete: 'restrict',
      }),

    semesterLabel: varchar('semester_label', { length: 50 }),

    reason: text('reason'),

    changedAt: timestamp('changed_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    changedBy: uuid('changed_by')
      .notNull()
      .references(() => users.id, {
        onDelete: 'restrict',
      }),
  },

  (table) => [
    index('branch_change_logs_institute_id_idx').on(table.instituteId),
    index('branch_change_logs_student_id_idx').on(table.studentId),
  ],
);

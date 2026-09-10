import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { branches } from './branches.schema';
import { institutes } from './institutes.schema';
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

    atSemesterId: uuid('at_semester_id')
      .notNull()
      .references(() => semesters.id, {
        onDelete: 'restrict',
      }),

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

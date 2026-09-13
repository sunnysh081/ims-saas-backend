import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { institutes } from './institutes.schema';
import { leaveStatusEnum, leaveTypeEnum } from './enums';
import { semesters } from './semesters.schema';
import { students } from './students.schema';
import { users } from './users.schema';

export const leaveRequests = pgTable(
  'leave_requests',
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

    semesterId: uuid('semester_id')
      .notNull()
      .references(() => semesters.id, {
        onDelete: 'cascade',
      }),

    type: leaveTypeEnum('type').notNull(),

    fromDate: varchar('from_date', {
      length: 10,
    }).notNull(),

    toDate: varchar('to_date', {
      length: 10,
    }).notNull(),

    reason: text('reason'),

    status: leaveStatusEnum('status').notNull().default('PENDING'),

    reviewedById: uuid('reviewed_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    reviewedAt: timestamp('reviewed_at', {
      withTimezone: true,
    }),

    documentUrl: varchar('document_url', {
      length: 500,
    }),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => [
    index('leave_requests_institute_id_idx').on(table.instituteId),
    index('leave_requests_student_id_idx').on(table.studentId),
    index('leave_requests_status_idx').on(table.status),
  ],
);

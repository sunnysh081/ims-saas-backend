import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { attendanceSessions } from './attendance-sessions.schema';
import { attendanceStatusEnum } from './enums';
import { institutes } from './institutes.schema';
import { leaveRequests } from './leave-requests.schema';
import { studentEnrollments } from './student-enrollments.schema';
import { students } from './students.schema';
import { users } from './users.schema';

export const attendanceRecords = pgTable(
  'attendance_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, {
        onDelete: 'cascade',
      }),

    sessionId: uuid('session_id')
      .notNull()
      .references(() => attendanceSessions.id, {
        onDelete: 'cascade',
      }),

    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, {
        onDelete: 'cascade',
      }),

    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => studentEnrollments.id, {
        onDelete: 'cascade',
      }),

    status: attendanceStatusEnum('status').notNull(),

    markedById: uuid('marked_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    markedAt: timestamp('marked_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    leaveId: uuid('leave_id').references(() => leaveRequests.id, {
      onDelete: 'set null',
    }),

    note: text('note'),
  },

  (table) => [
    uniqueIndex('attendance_records_session_student_unique').on(table.sessionId, table.studentId),

    index('attendance_records_institute_id_idx').on(table.instituteId),
    index('attendance_records_student_id_idx').on(table.studentId),
    index('attendance_records_session_id_idx').on(table.sessionId),
  ],
);

import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { attendanceRecords } from './attendance-records.schema';
import { attendanceStatusEnum } from './enums';
import { institutes } from './institutes.schema';
import { users } from './users.schema';

export const attendanceCorrectionLogs = pgTable(
  'attendance_correction_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, {
        onDelete: 'cascade',
      }),

    recordId: uuid('record_id')
      .notNull()
      .references(() => attendanceRecords.id, {
        onDelete: 'cascade',
      }),

    fromStatus: attendanceStatusEnum('from_status').notNull(),

    toStatus: attendanceStatusEnum('to_status').notNull(),

    reason: text('reason').notNull(),

    correctedById: uuid('corrected_by_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'restrict',
      }),

    correctedAt: timestamp('corrected_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => [
    index('attendance_correction_logs_institute_id_idx').on(table.instituteId),
    index('attendance_correction_logs_record_id_idx').on(table.recordId),
  ],
);

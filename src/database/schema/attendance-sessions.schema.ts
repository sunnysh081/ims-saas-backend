import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { courseOfferings } from './course-offerings.schema';
import { institutes } from './institutes.schema';
import { sessionStatusEnum } from './enums';
import { timetableSlots } from './timetable-slots.schema';
import { users } from './users.schema';

export const attendanceSessions = pgTable(
  'attendance_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, {
        onDelete: 'cascade',
      }),

    offeringId: uuid('offering_id')
      .notNull()
      .references(() => courseOfferings.id, {
        onDelete: 'cascade',
      }),

    slotId: uuid('slot_id').references(() => timetableSlots.id, {
      onDelete: 'set null',
    }),

    date: varchar('date', {
      length: 10,
    }).notNull(),

    status: sessionStatusEnum('status').notNull().default('SCHEDULED'),

    takenById: uuid('taken_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    takenAt: timestamp('taken_at', {
      withTimezone: true,
    }),

    cancelReason: text('cancel_reason'),

    topicCovered: text('topic_covered'),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => [
    uniqueIndex('attendance_sessions_offering_slot_date_unique').on(table.offeringId, table.slotId, table.date),

    index('attendance_sessions_institute_id_idx').on(table.instituteId),
    index('attendance_sessions_offering_id_idx').on(table.offeringId),
    index('attendance_sessions_date_idx').on(table.date),
    index('attendance_sessions_status_idx').on(table.status),
  ],
);

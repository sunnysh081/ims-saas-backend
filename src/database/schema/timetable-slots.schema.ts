import { boolean, index, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';

import { courseOfferings } from './course-offerings.schema';
import { dayOfWeekEnum } from './enums';
import { institutes } from './institutes.schema';

export const timetableSlots = pgTable(
  'timetable_slots',
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

    dayOfWeek: dayOfWeekEnum('day_of_week').notNull(),

    startTime: varchar('start_time', {
      length: 5,
    }).notNull(),

    endTime: varchar('end_time', {
      length: 5,
    }).notNull(),

    roomNumber: varchar('room_number', {
      length: 50,
    }),

    isActive: boolean('is_active').notNull().default(true),
  },

  (table) => [
    index('timetable_slots_institute_id_idx').on(table.instituteId),
    index('timetable_slots_offering_id_idx').on(table.offeringId),
    index('timetable_slots_day_of_week_idx').on(table.dayOfWeek),
    index('timetable_slots_active_idx').on(table.isActive),
  ],
);

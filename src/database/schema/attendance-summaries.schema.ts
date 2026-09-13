import { index, integer, pgTable, real, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { courseOfferings } from './course-offerings.schema';
import { institutes } from './institutes.schema';
import { students } from './students.schema';

export const attendanceSummaries = pgTable(
  'attendance_summaries',
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

    offeringId: uuid('offering_id')
      .notNull()
      .references(() => courseOfferings.id, {
        onDelete: 'cascade',
      }),

    totalClasses: integer('total_classes').notNull().default(0),

    present: integer('present').notNull().default(0),

    absent: integer('absent').notNull().default(0),

    late: integer('late').notNull().default(0),

    onDuty: integer('on_duty').notNull().default(0),

    percentage: real('percentage').notNull().default(0),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => [
    uniqueIndex('attendance_summaries_student_offering_unique').on(table.studentId, table.offeringId),

    index('attendance_summaries_institute_id_idx').on(table.instituteId),
    index('attendance_summaries_offering_id_idx').on(table.offeringId),
  ],
);

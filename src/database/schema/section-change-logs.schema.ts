import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { institutes } from './institutes.schema';
import { sections } from './sections.schema';
import { studentEnrollments } from './student-enrollments.schema';
import { students } from './students.schema';
import { users } from './users.schema';

export const sectionChangeLogs = pgTable(
  'section_change_logs',
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

    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => studentEnrollments.id, {
        onDelete: 'cascade',
      }),

    fromSectionId: uuid('from_section_id')
      .notNull()
      .references(() => sections.id, {
        onDelete: 'restrict',
      }),

    toSectionId: uuid('to_section_id')
      .notNull()
      .references(() => sections.id, {
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
    index('section_change_logs_institute_id_idx').on(table.instituteId),
    index('section_change_logs_student_id_idx').on(table.studentId),
  ],
);

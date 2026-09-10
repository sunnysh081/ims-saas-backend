import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { institutes } from './institutes.schema';
import { sections } from './sections.schema';
import { semesters } from './semesters.schema';
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

    fromSectionName: varchar('from_section_name', { length: 50 }),

    toSectionName: varchar('to_section_name', { length: 50 }),

    fromBranchName: varchar('from_branch_name', { length: 255 }),

    toBranchName: varchar('to_branch_name', { length: 255 }),

    semesterId: uuid('semester_id').references(() => semesters.id, {
      onDelete: 'set null',
    }),

    semesterLabel: varchar('semester_label', { length: 50 }),

    academicYear: varchar('academic_year', { length: 9 }),

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

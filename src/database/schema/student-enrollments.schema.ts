import {
  boolean,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { enrollmentStatusEnum } from './enums';
import { institutes } from './institutes.schema';
import { sections } from './sections.schema';
import { semesters } from './semesters.schema';
import { students } from './students.schema';

export const studentEnrollments = pgTable(
  'student_enrollments',
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
        onDelete: 'restrict',
      }),

    sectionId: uuid('section_id')
      .notNull()
      .references(() => sections.id, {
        onDelete: 'restrict',
      }),

    academicYear: varchar('academic_year', {
      length: 9,
    }).notNull(),

    status: enrollmentStatusEnum('status').notNull().default('ACTIVE'),

    active: boolean('active').notNull().default(true),

    enrolledAt: timestamp('enrolled_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => [
    index('enrollments_institute_id_idx').on(table.instituteId),
    index('enrollments_student_id_idx').on(table.studentId),
    index('enrollments_semester_id_idx').on(table.semesterId),
    index('enrollments_section_id_idx').on(table.sectionId),
    index('enrollments_active_idx').on(table.active),
  ],
);

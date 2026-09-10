import {
  index,
  pgTable,
  real,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { resultStatusEnum } from './enums';
import { institutes } from './institutes.schema';
import { semesters } from './semesters.schema';
import { students } from './students.schema';

export const semesterHistories = pgTable(
  'semester_histories',
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

    sgpa: real('sgpa'),

    attendancePct: real('attendance_pct'),

    result: resultStatusEnum('result').notNull(),

    sealedAt: timestamp('sealed_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => [
    uniqueIndex('semester_histories_student_semester_unique').on(
      table.studentId,
      table.semesterId,
    ),

    index('semester_histories_institute_id_idx').on(table.instituteId),
    index('semester_histories_student_id_idx').on(table.studentId),
    index('semester_histories_semester_id_idx').on(table.semesterId),
  ],
);

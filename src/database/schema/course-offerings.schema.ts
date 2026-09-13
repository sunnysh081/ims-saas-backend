import { boolean, index, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { batches } from './batches.schema';
import { electiveGroups } from './elective-groups.schema';
import { institutes } from './institutes.schema';
import { sections } from './sections.schema';
import { semesters } from './semesters.schema';
import { subjects } from './subjects.schema';
import { syllabi } from './syllabi.schema';
import { users } from './users.schema';

// Core:     sectionId set, electiveGroupId null
// Elective: sectionId null, electiveGroupId set
export const courseOfferings = pgTable(
  'course_offerings',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, {
        onDelete: 'cascade',
      }),

    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, {
        onDelete: 'cascade',
      }),

    syllabusId: uuid('syllabus_id')
      .notNull()
      .references(() => syllabi.id, {
        onDelete: 'restrict',
      }),

    semesterId: uuid('semester_id')
      .notNull()
      .references(() => semesters.id, {
        onDelete: 'cascade',
      }),

    // required for core (section-based) offerings; null for elective
    // offerings, which span every batch enrolled in the semester/branch
    batchId: uuid('batch_id').references(() => batches.id, {
      onDelete: 'cascade',
    }),

    sectionId: uuid('section_id').references(() => sections.id, {
      onDelete: 'cascade',
    }),

    electiveGroupId: uuid('elective_group_id').references(() => electiveGroups.id, {
      onDelete: 'cascade',
    }),

    facultyId: uuid('faculty_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => [
    uniqueIndex('course_offerings_core_unique').on(table.subjectId, table.sectionId, table.semesterId),

    uniqueIndex('course_offerings_elective_unique').on(table.subjectId, table.electiveGroupId, table.semesterId),

    index('course_offerings_institute_id_idx').on(table.instituteId),
    index('course_offerings_semester_id_idx').on(table.semesterId),
    index('course_offerings_batch_id_idx').on(table.batchId),
    index('course_offerings_section_id_idx').on(table.sectionId),
    index('course_offerings_faculty_id_idx').on(table.facultyId),
  ],
);

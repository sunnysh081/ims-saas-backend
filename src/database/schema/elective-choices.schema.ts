import { index, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { courseOfferings } from './course-offerings.schema';
import { electiveChoiceStatusEnum } from './enums';
import { electiveGroups } from './elective-groups.schema';
import { electiveOptions } from './elective-options.schema';
import { institutes } from './institutes.schema';
import { students } from './students.schema';

export const electiveChoices = pgTable(
  'elective_choices',
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

    electiveGroupId: uuid('elective_group_id')
      .notNull()
      .references(() => electiveGroups.id, {
        onDelete: 'cascade',
      }),

    electiveOptionId: uuid('elective_option_id')
      .notNull()
      .references(() => electiveOptions.id, {
        onDelete: 'cascade',
      }),

    offeringId: uuid('offering_id').references(() => courseOfferings.id, {
      onDelete: 'set null',
    }),

    status: electiveChoiceStatusEnum('status').notNull().default('PENDING'),

    chosenAt: timestamp('chosen_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    confirmedAt: timestamp('confirmed_at', {
      withTimezone: true,
    }),

    changedFrom: uuid('changed_from').references(() => electiveOptions.id, {
      onDelete: 'set null',
    }),
  },

  (table) => [
    uniqueIndex('elective_choices_student_group_unique').on(table.studentId, table.electiveGroupId),

    index('elective_choices_institute_id_idx').on(table.instituteId),
    index('elective_choices_group_id_idx').on(table.electiveGroupId),
    index('elective_choices_option_id_idx').on(table.electiveOptionId),
    index('elective_choices_status_idx').on(table.status),
  ],
);

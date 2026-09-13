import { index, integer, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { electiveGroups } from './elective-groups.schema';
import { institutes } from './institutes.schema';
import { subjects } from './subjects.schema';

export const electiveOptions = pgTable(
  'elective_options',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, {
        onDelete: 'cascade',
      }),

    electiveGroupId: uuid('elective_group_id')
      .notNull()
      .references(() => electiveGroups.id, {
        onDelete: 'cascade',
      }),

    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, {
        onDelete: 'cascade',
      }),

    seatsLimit: integer('seats_limit'),

    seatsConfirmed: integer('seats_confirmed').notNull().default(0),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => [
    uniqueIndex('elective_options_unique').on(table.electiveGroupId, table.subjectId),

    index('elective_options_institute_id_idx').on(table.instituteId),
    index('elective_options_group_id_idx').on(table.electiveGroupId),
  ],
);

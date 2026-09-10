import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { sql } from 'drizzle-orm';

import { studentStatusEnum } from './enums';
import { institutes } from './institutes.schema';
import { users } from './users.schema';

export const students = pgTable(
  'students',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, {
        onDelete: 'cascade',
      }),

    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    rollNumber: varchar('roll_number', {
      length: 50,
    }).notNull(),

    name: varchar('name', {
      length: 255,
    }).notNull(),

    email: varchar('email', {
      length: 255,
    }).notNull(),

    phone: varchar('phone', {
      length: 20,
    }),

    status: studentStatusEnum('status').notNull().default('ACTIVE'),

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

    deletedAt: timestamp('deleted_at', {
      withTimezone: true,
    }),
  },

  (table) => [
    uniqueIndex('students_institute_roll_unique')
      .on(table.instituteId, table.rollNumber)
      .where(sql`${table.deletedAt} IS NULL`),

    uniqueIndex('students_institute_email_unique')
      .on(table.instituteId, table.email)
      .where(sql`${table.deletedAt} IS NULL`),

    index('students_institute_id_idx').on(table.instituteId),
    index('students_status_idx').on(table.status),
    index('students_user_id_idx').on(table.userId),
  ],
);

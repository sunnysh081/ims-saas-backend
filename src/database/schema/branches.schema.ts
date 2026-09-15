import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { sql } from 'drizzle-orm';

import { institutes } from './institutes.schema';
import { programs } from './programs.schema';
import { users } from './users.schema';

export const branches = pgTable(
  'branches',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, {
        onDelete: 'cascade',
      }),

    programId: uuid('program_id')
      .notNull()
      .references(() => programs.id, {
        onDelete: 'restrict',
      }),

    name: varchar('name', {
      length: 255,
    }).notNull(),

    code: varchar('code', {
      length: 50,
    }).notNull(),

    hodUserId: uuid('hod_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    description: text('description'),

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
    uniqueIndex('branches_program_code_unique')
      .on(table.programId, table.code)
      .where(sql`${table.deletedAt} IS NULL`),

    index('branches_institute_id_idx').on(table.instituteId),
    index('branches_program_id_idx').on(table.programId),
    index('branches_hod_user_id_idx').on(table.hodUserId),
  ],
);

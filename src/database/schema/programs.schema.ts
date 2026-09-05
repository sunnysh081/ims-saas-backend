import {
  boolean,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { sql } from 'drizzle-orm';

import { institutes } from './institutes.schema';
import { users } from './users.schema';
import { programTypeEnum, programUniversityEnum } from './enums';

export const programs = pgTable(
  'programs',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    instituteId: uuid('institute_id')
      .notNull()
      .references(() => institutes.id, {
        onDelete: 'cascade',
      }),

    name: varchar('name', {
      length: 200,
    }).notNull(),

    code: varchar('code', {
      length: 50,
    }).notNull(),

    type: programTypeEnum('type').notNull().default('degree'),

    totalSemesters: integer('total_semesters').notNull().default(1),

    durationMonths: integer('duration_months'),

    university: programUniversityEnum('university')
      .notNull()
      .default('autonomous'),

    sanctionedIntake: integer('sanctioned_intake').notNull(),

    accreditation: varchar('accreditation', {
      length: 150,
    }),

    departmentHeadUserId: uuid('department_head_user_id').references(
      () => users.id,
      {
        onDelete: 'set null',
      },
    ),

    description: varchar('description', {
      length: 1000,
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

    deletedAt: timestamp('deleted_at', {
      withTimezone: true,
    }),
  },

  (table) => [
    uniqueIndex('programs_institute_code_unique')
      .on(table.instituteId, table.code)
      .where(sql`${table.deletedAt} IS NULL`),

    index('programs_institute_id_idx').on(table.instituteId),

    index('programs_type_idx').on(table.type),

    index('programs_active_idx').on(table.isActive),

    index('programs_department_head_idx').on(table.departmentHeadUserId),
  ],
);

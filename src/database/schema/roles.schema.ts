import {
  boolean,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { sql } from 'drizzle-orm';
import { roleScopeEnum } from './enums';

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    name: varchar('name', {
      length: 100,
    }).notNull(),

    slug: varchar('slug', {
      length: 100,
    }).notNull(),

    description: varchar('description', {
      length: 500,
    }),

    scope: roleScopeEnum('scope').notNull().default('institute'),

    /**
     * NULL for global roles (super_admin and roles created by super_admin).
     *
     * Set when an institute user creates a role for their institute.
     */
    instituteId: uuid('institute_id'),

    /**
     * System roles cannot be deleted
     * or renamed by institute admins.
     */
    isSystem: boolean('is_system').notNull().default(false),

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
    /**
     * Institute roles:
     *
     * institute A + teacher
     * institute B + teacher
     *
     * are both allowed.
     */
    uniqueIndex('roles_institute_slug_unique')
      .on(table.instituteId, table.slug)
      .where(sql`${table.instituteId} IS NOT NULL`),

    /**
     * Global roles:
     *
     * NULL + super_admin
     *
     * can exist only once.
     */
    uniqueIndex('roles_global_slug_unique')
      .on(table.slug)
      .where(sql`${table.instituteId} IS NULL`),

    index('roles_institute_id_idx').on(table.instituteId),

    index('roles_scope_idx').on(table.scope),

    index('roles_active_idx').on(table.isActive),
  ],
);

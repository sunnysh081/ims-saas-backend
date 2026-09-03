import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import { permissionActionEnum } from './enums';

import { modules } from './modules.schema';

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    moduleId: uuid('module_id')
      .notNull()
      .references(() => modules.id, {
        onDelete: 'cascade',
      }),

    name: varchar('name', {
      length: 150,
    }).notNull(),

    slug: varchar('slug', {
      length: 150,
    }).notNull(),

    action: permissionActionEnum('action').notNull(),

    description: varchar('description', {
      length: 500,
    }),

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
    uniqueIndex('permissions_module_slug_unique').on(
      table.moduleId,
      table.slug,
    ),

    uniqueIndex('permissions_module_action_unique').on(
      table.moduleId,
      table.action,
    ),

    index('permissions_module_id_idx').on(table.moduleId),
  ],
);

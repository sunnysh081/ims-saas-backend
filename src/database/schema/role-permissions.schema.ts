import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { roles } from './roles.schema';

import { permissions } from './permissions.schema';

export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, {
        onDelete: 'cascade',
      }),

    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, {
        onDelete: 'cascade',
      }),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },

  (table) => [
    uniqueIndex('role_permissions_unique').on(table.roleId, table.permissionId),

    index('role_permissions_role_id_idx').on(table.roleId),

    index('role_permissions_permission_id_idx').on(table.permissionId),
  ],
);

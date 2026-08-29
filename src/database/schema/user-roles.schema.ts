import {
    index,
    pgTable,
    timestamp,
    uniqueIndex,
    uuid,
} from 'drizzle-orm/pg-core';

import {
    users,
} from './users.schema';

import {
    roles,
} from './roles.schema';

export const userRoles = pgTable(
    'user_roles',
    {
        id: uuid('id')
            .defaultRandom()
            .primaryKey(),

        userId: uuid(
            'user_id',
        )
            .notNull()
            .references(
                () => users.id,
                {
                    onDelete: 'cascade',
                },
            ),

        roleId: uuid(
            'role_id',
        )
            .notNull()
            .references(
                () => roles.id,
                {
                    onDelete: 'cascade',
                },
            ),

        createdAt: timestamp(
            'created_at',
            {
                withTimezone: true,
            },
        )
            .defaultNow()
            .notNull(),
    },

    (table) => [
        uniqueIndex(
            'user_roles_user_role_unique',
        ).on(
            table.userId,
            table.roleId,
        ),

        index(
            'user_roles_user_id_idx',
        ).on(table.userId),

        index(
            'user_roles_role_id_idx',
        ).on(table.roleId),
    ],
);
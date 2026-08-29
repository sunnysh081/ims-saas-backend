import {
    boolean,
    index,
    pgTable,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from 'drizzle-orm/pg-core';

import {
    roleScopeEnum,
} from './enums';

export const roles = pgTable(
    'roles',
    {
        id: uuid('id')
            .defaultRandom()
            .primaryKey(),

        name: varchar('name', {
            length: 100,
        }).notNull(),

        slug: varchar('slug', {
            length: 100,
        }).notNull(),

        description: varchar(
            'description',
            {
                length: 500,
            },
        ),

        scope: roleScopeEnum(
            'scope',
        )
            .notNull()
            .default('institute'),

        /**
         * NULL for platform roles.
         *
         * Required for institute-scoped roles.
         */
        instituteId: uuid(
            'institute_id',
        ),

        /**
         * System roles cannot be deleted
         * or renamed by institute admins.
         */
        isSystem: boolean(
            'is_system',
        )
            .notNull()
            .default(false),

        isActive: boolean(
            'is_active',
        )
            .notNull()
            .default(true),

        createdAt: timestamp(
            'created_at',
            {
                withTimezone: true,
            },
        )
            .defaultNow()
            .notNull(),

        updatedAt: timestamp(
            'updated_at',
            {
                withTimezone: true,
            },
        )
            .defaultNow()
            .notNull(),

        deletedAt: timestamp(
            'deleted_at',
            {
                withTimezone: true,
            },
        ),
    },

    (table) => [
        uniqueIndex(
            'roles_institute_slug_unique',
        ).on(
            table.instituteId,
            table.slug,
        ),

        index(
            'roles_institute_id_idx',
        ).on(table.instituteId),

        index(
            'roles_scope_idx',
        ).on(table.scope),

        index(
            'roles_active_idx',
        ).on(table.isActive),
    ],
);
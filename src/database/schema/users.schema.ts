import {
    boolean,
    index,
    pgTable,
    timestamp,
    uuid,
    varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
    'users',
    {
        id: uuid('id')
            .defaultRandom()
            .primaryKey(),

        email: varchar('email', {
            length: 255,
        })
            .notNull()
            .unique(),

        passwordHash: varchar(
            'password_hash',
            {
                length: 255,
            },
        ).notNull(),

        firstName: varchar(
            'first_name',
            {
                length: 100,
            },
        ).notNull(),

        lastName: varchar(
            'last_name',
            {
                length: 100,
            },
        ),

        mobile: varchar('mobile', {
            length: 30,
        }),

        isActive: boolean(
            'is_active',
        )
            .notNull()
            .default(true),

        emailVerified: boolean(
            'email_verified',
        )
            .notNull()
            .default(false),

        lastLoginAt: timestamp(
            'last_login_at',
            {
                withTimezone: true,
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
        index('users_email_idx')
            .on(table.email),

        index('users_active_idx')
            .on(table.isActive),

        index('users_deleted_at_idx')
            .on(table.deletedAt),
    ],
);
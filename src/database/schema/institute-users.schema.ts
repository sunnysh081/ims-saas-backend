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
    institutes,
} from './institutes.schema';

export const instituteUsers =
    pgTable(
        'institute_users',
        {
            id: uuid('id')
                .defaultRandom()
                .primaryKey(),

            instituteId: uuid(
                'institute_id',
            )
                .notNull()
                .references(
                    () => institutes.id,
                    {
                        onDelete: 'cascade',
                    },
                ),

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
        },

        (table) => [
            uniqueIndex(
                'institute_users_unique',
            ).on(
                table.instituteId,
                table.userId,
            ),

            index(
                'institute_users_institute_idx',
            ).on(table.instituteId),

            index(
                'institute_users_user_idx',
            ).on(table.userId),
        ],
    );
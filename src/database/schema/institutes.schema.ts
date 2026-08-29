import {
    boolean,
    index,
    pgTable,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from 'drizzle-orm/pg-core';

export const institutes = pgTable(
    'institutes',
    {
        id: uuid('id')
            .defaultRandom()
            .primaryKey(),

        /**
         * Human-readable institute name.
         */
        name: varchar('name', {
            length: 200,
        }).notNull(),

        /**
         * Stable URL-safe identifier.
         *
         * Example:
         *   delhi-university
         *
         * Used for:
         *   delhi-university.yourdomain.com
         */
        slug: varchar('slug', {
            length: 100,
        }).notNull(),

        /**
         * Optional custom domain.
         *
         * Example:
         *   college.example.com
         */
        customDomain: varchar(
            'custom_domain',
            {
                length: 255,
            },
        ),

        /**
         * Contact information.
         */
        email: varchar('email', {
            length: 255,
        }),

        mobile: varchar('mobile', {
            length: 30,
        }),

        /**
         * Basic institute address.
         */
        addressLine1: varchar(
            'address_line_1',
            {
                length: 255,
            },
        ),

        addressLine2: varchar(
            'address_line_2',
            {
                length: 255,
            },
        ),

        city: varchar('city', {
            length: 100,
        }),

        state: varchar('state', {
            length: 100,
        }),

        country: varchar('country', {
            length: 100,
        }),

        postalCode: varchar(
            'postal_code',
            {
                length: 20,
            },
        ),



        /**
         * Tenant lifecycle.
         *
         * Keep this separate from isActive.
         */
        status: varchar('status', {
            length: 30,
        })
            .notNull()
            .default('active'),

        /**
         * Whether this tenant can currently
         * access the application.
         */
        isActive: boolean('is_active')
            .notNull()
            .default(true),

        /**
         * Soft delete.
         */
        deletedAt: timestamp('deleted_at', {
            withTimezone: true,
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
        /**
         * Slug is globally unique because it is
         * part of the SaaS hostname.
         */
        uniqueIndex(
            'institutes_slug_unique',
        ).on(table.slug),

        /**
         * Custom domains must also be globally unique.
         */
        uniqueIndex(
            'institutes_custom_domain_unique',
        ).on(table.customDomain),

        index(
            'institutes_status_idx',
        ).on(table.status),

        index(
            'institutes_active_idx',
        ).on(table.isActive),

        index(
            'institutes_deleted_at_idx',
        ).on(table.deletedAt),
    ],
);
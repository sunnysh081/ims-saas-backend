import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.schema';

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    refreshTokenHash: varchar('refresh_token_hash', {
      length: 255,
    }).notNull(),

    userAgent: varchar('user_agent', {
      length: 500,
    }),

    ipAddress: varchar('ip_address', {
      length: 100,
    }),

    expiresAt: timestamp('expires_at', {
      withTimezone: true,
    }).notNull(),

    revokedAt: timestamp('revoked_at', {
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
    index('auth_sessions_user_id_idx').on(table.userId),

    index('auth_sessions_expires_at_idx').on(table.expiresAt),

    index('auth_sessions_revoked_at_idx').on(table.revokedAt),
  ],
);

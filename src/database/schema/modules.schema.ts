import {
  boolean,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const modules = pgTable(
  'modules',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    name: varchar('name', {
      length: 100,
    }).notNull(),

    slug: varchar('slug', {
      length: 100,
    })
      .notNull()
      .unique(),

    description: varchar('description', {
      length: 500,
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
  },

  (table) => [
    index('modules_slug_idx').on(table.slug),
    index('modules_active_idx').on(table.isActive),
  ],
);

import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { NodePgDatabase, NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import type { PgTransaction } from 'drizzle-orm/pg-core';

import type * as schema from '../database/schema';

export type AcademicDb = NodePgDatabase<typeof schema>;

export type AcademicTx = PgTransaction<
  NodePgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

export type AcademicExecutor = AcademicDb | AcademicTx;

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  public readonly db: NodePgDatabase<typeof schema>;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined');
    }

    this.pool = new Pool({
      connectionString,

      max: 20,
      min: 2,

      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,

      // Production:
      // ssl: {
      //   rejectUnauthorized: true,
      // },
    });

    this.db = drizzle(this.pool, {
      schema,
    });
  }

  async onModuleInit() {
    await this.pool.query('SELECT 1');
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}

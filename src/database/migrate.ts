import 'dotenv/config';

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured');
}

const pool = new Pool({
  connectionString: databaseUrl,

  max: 1,

  connectionTimeoutMillis: 10_000,
});

const db = drizzle(pool);

async function main(): Promise<void> {
  try {
    console.log('Running database migrations...');

    await migrate(db, {
      migrationsFolder: './drizzle',
    });

    console.log('Database migrations completed successfully.');
  } catch (error) {
    console.error('Database migration failed:', error);

    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();

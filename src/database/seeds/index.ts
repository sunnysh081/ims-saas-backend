import 'dotenv/config';

import { DatabaseService } from '../database.service';
import { seedSystemRoles } from './roles.seed';
import { seedSuperAdmin } from './super-admin.seed';

async function bootstrap(): Promise<void> {
  const database = new DatabaseService();

  try {
    console.log('Starting database seed...');

    await seedSystemRoles(database);
    await seedSuperAdmin(database);
    console.log('Database seed completed successfully.');
  } catch (error) {
    console.error('Database seed failed:', error);

    process.exitCode = 1;
  } finally {
    await database.onModuleDestroy();
  }
}

void bootstrap();

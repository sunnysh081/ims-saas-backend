import 'dotenv/config';

import { DatabaseService } from '../database.service';
import { seedDummyData } from './dummy-data.seed';

async function bootstrap(): Promise<void> {
  const database = new DatabaseService();

  try {
    console.log('Seeding dummy test data...');

    await seedDummyData(database);

    console.log('Dummy data seed completed successfully.');
  } catch (error) {
    console.error('Dummy data seed failed:', error);

    process.exitCode = 1;
  } finally {
    await database.onModuleDestroy();
  }
}

void bootstrap();

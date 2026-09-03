import { Injectable } from '@nestjs/common';
import { HealthCheckResult, HealthCheckService } from '@nestjs/terminus';
import { sql } from 'drizzle-orm';

import { DatabaseService } from './database/database.service';

@Injectable()
export class AppService {
  constructor(
    private readonly healthCheckService: HealthCheckService,
    private readonly databaseService: DatabaseService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    return this.healthCheckService.check([
      async () => {
        try {
          await this.databaseService.db.execute(sql`SELECT 1`);
          return {
            database: {
              status: 'up',
            },
          };
        } catch (error) {
          return {
            database: {
              status: 'down',
              message:
                error instanceof Error
                  ? error.message
                  : 'Database connection failed',
            },
          };
        }
      },
    ]);
  }
}

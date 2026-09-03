import { and, eq, isNull } from 'drizzle-orm';

import { PgDatabase } from 'drizzle-orm/pg-core';

export abstract class BaseRepository<TTable extends any> {
  constructor(
    protected readonly db: PgDatabase<any>,
    protected readonly table: TTable,
  ) {}

  protected async findById(id: string) {
    const result = await this.db
      .select()
      .from(this.table as any)
      .where(
        and(
          eq((this.table as any).id, id),
          isNull((this.table as any).deletedAt),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }
}

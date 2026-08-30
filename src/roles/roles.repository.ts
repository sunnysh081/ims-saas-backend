import {
    Injectable,
} from '@nestjs/common';

import {
    and,
    eq,
    isNull,
} from 'drizzle-orm';

import {
    DatabaseService,
} from '../database/database.service';

import {
    roles,
} from '../database/schema';

@Injectable()
export class RolesRepository {
    constructor(
        private readonly database: DatabaseService,
    ) { }

    async findById(
        roleId: string,
    ) {
        const result =
            await this.database.db
                .select()
                .from(roles)
                .where(
                    and(
                        eq(
                            roles.id,
                            roleId,
                        ),
                        isNull(
                            roles.deletedAt,
                        ),
                    ),
                )
                .limit(1);

        return result[0] ?? null;
    }

    async findBySlug(
        instituteId: string | null,
        slug: string,
    ) {
        const result =
            await this.database.db
                .select()
                .from(roles)
                .where(
                    and(
                        instituteId
                            ? eq(
                                roles.instituteId,
                                instituteId,
                            )
                            : isNull(
                                roles.instituteId,
                            ),

                        eq(
                            roles.slug,
                            slug,
                        ),

                        isNull(
                            roles.deletedAt,
                        ),
                    ),
                )
                .limit(1);

        return result[0] ?? null;
    }

    async findAllByInstitute(
        instituteId: string,
    ) {
        return this.database.db
            .select()
            .from(roles)
            .where(
                and(
                    eq(
                        roles.instituteId,
                        instituteId,
                    ),
                    isNull(
                        roles.deletedAt,
                    ),
                ),
            )
            .orderBy(
                roles.name,
            );
    }

    async create(
        data: typeof roles.$inferInsert,
    ) {
        const result =
            await this.database.db
                .insert(roles)
                .values(data)
                .returning();

        return result[0];
    }

    async update(
        roleId: string,
        data: Partial<
            typeof roles.$inferInsert
        >,
    ) {
        const result =
            await this.database.db
                .update(roles)
                .set({
                    ...data,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(
                            roles.id,
                            roleId,
                        ),
                        isNull(
                            roles.deletedAt,
                        ),
                    ),
                )
                .returning();

        return result[0] ?? null;
    }

    async softDelete(
        roleId: string,
    ) {
        const result =
            await this.database.db
                .update(roles)
                .set({
                    deletedAt: new Date(),
                    updatedAt: new Date(),
                })
                .where(
                    eq(
                        roles.id,
                        roleId,
                    ),
                )
                .returning();

        return result[0] ?? null;
    }
}
import {
    and,
    eq,
    isNull,
} from 'drizzle-orm';

import { DatabaseService } from '../database.service';
import { roles } from '../schema';

export async function seedSystemRoles(
    database: DatabaseService,
): Promise<void> {
    /**
     * Check whether the global super_admin
     * role already exists.
     */
    const [existingRole] =
        await database.db
            .select({
                id: roles.id,
            })
            .from(roles)
            .where(
                and(
                    eq(
                        roles.slug,
                        'super_admin',
                    ),
                    isNull(
                        roles.instituteId,
                    ),
                    eq(
                        roles.scope,
                        'platform',
                    ),
                ),
            )
            .limit(1);

    if (existingRole) {
        console.log(
            'System role already exists: super_admin',
        );

        return;
    }

    await database.db
        .insert(roles)
        .values({
            name: 'Super Admin',

            slug: 'super_admin',

            description:
                'Platform-level administrator with access to the entire SaaS platform.',

            scope: 'platform',

            instituteId: null,

            isSystem: true,

            isActive: true,
        });

    console.log(
        'Created system role: super_admin',
    );
}
import {
    Injectable,
} from '@nestjs/common';

import {
    and,
    eq,
    inArray,
} from 'drizzle-orm';

import {
    DatabaseService,
} from '../database/database.service';

import {
    instituteUsers,
    permissions,
    rolePermissions,
    roles,
    userRoles,
} from '../database/schema';

@Injectable()
export class AuthorizationService {
    constructor(
        private readonly database: DatabaseService,
    ) { }

    async hasPermissions(
        userId: string,
        instituteId: string,
        requiredPermissions: string[],
    ): Promise<boolean> {
        if (
            !requiredPermissions.length
        ) {
            return true;
        }

        const rows =
            await this.database.db
                .selectDistinct({
                    permissionSlug:
                        permissions.slug,
                })
                .from(instituteUsers)
                .innerJoin(
                    userRoles,
                    eq(
                        userRoles.userId,
                        instituteUsers.userId,
                    ),
                )
                .innerJoin(
                    roles,
                    eq(
                        roles.id,
                        userRoles.roleId,
                    ),
                )
                .innerJoin(
                    rolePermissions,
                    eq(
                        rolePermissions.roleId,
                        roles.id,
                    ),
                )
                .innerJoin(
                    permissions,
                    eq(
                        permissions.id,
                        rolePermissions.permissionId,
                    ),
                )
                .where(
                    and(
                        eq(
                            instituteUsers.userId,
                            userId,
                        ),

                        eq(
                            instituteUsers.instituteId,
                            instituteId,
                        ),

                        eq(
                            roles.instituteId,
                            instituteId,
                        ),

                        eq(
                            roles.isActive,
                            true,
                        ),

                        inArray(
                            permissions.slug,
                            requiredPermissions,
                        ),
                    ),
                );

        const granted = new Set(
            rows.map(
                (row) => row.permissionSlug,
            ),
        );

        return requiredPermissions.every(
            (permission) =>
                granted.has(permission),
        );
    }
}
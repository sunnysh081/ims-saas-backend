import {
    Injectable,
} from '@nestjs/common';

import {
    eq,
} from 'drizzle-orm';

import {
    DatabaseService,
} from '../database/database.service';

import {
    modules,
    permissions,
} from '../database/schema';

@Injectable()
export class PermissionsService {
    constructor(
        private readonly database: DatabaseService,
    ) { }

    async findAll() {
        return this.database.db
            .select({
                id: permissions.id,
                name: permissions.name,
                slug: permissions.slug,
                action: permissions.action,

                moduleId: modules.id,
                moduleName: modules.name,
                moduleSlug: modules.slug,
            })
            .from(permissions)
            .innerJoin(
                modules,
                eq(
                    permissions.moduleId,
                    modules.id,
                ),
            )
            .orderBy(
                modules.name,
                permissions.name,
            );
    }
}
import { and, eq } from 'drizzle-orm';

import { DatabaseService } from '../database.service';
import { modules, permissions } from '../schema';

const CATALOG = [
  {
    name: 'Users',
    slug: 'users',
    description: 'Institute user management.',
    permissions: [
      {
        name: 'View users',
        slug: 'users.read',
        action: 'read' as const,
        description: 'List and view institute users.',
      },
      {
        name: 'Create users',
        slug: 'users.create',
        action: 'create' as const,
        description: 'Add users to the institute.',
      },
      {
        name: 'Update users',
        slug: 'users.update',
        action: 'update' as const,
        description: 'Edit institute users and their roles.',
      },
      {
        name: 'Delete users',
        slug: 'users.delete',
        action: 'delete' as const,
        description: 'Remove users from the institute.',
      },
    ],
  },
  {
    name: 'Roles',
    slug: 'roles',
    description: 'Institute role and permission assignment.',
    permissions: [
      {
        name: 'View roles',
        slug: 'roles.read',
        action: 'read' as const,
        description: 'List and view institute roles.',
      },
      {
        name: 'Create roles',
        slug: 'roles.create',
        action: 'create' as const,
        description: 'Create institute roles.',
      },
      {
        name: 'Update roles',
        slug: 'roles.update',
        action: 'update' as const,
        description: 'Edit institute roles and their permissions.',
      },
      {
        name: 'Delete roles',
        slug: 'roles.delete',
        action: 'delete' as const,
        description: 'Remove institute roles.',
      },
    ],
  },
];

export async function seedPermissions(
  database: DatabaseService,
): Promise<void> {
  for (const module of CATALOG) {
    const [existingModule] = await database.db
      .select({
        id: modules.id,
      })
      .from(modules)
      .where(eq(modules.slug, module.slug))
      .limit(1);

    let moduleId = existingModule?.id;

    if (moduleId) {
      console.log(`Module already exists: ${module.slug}`);
    } else {
      const [created] = await database.db
        .insert(modules)
        .values({
          name: module.name,
          slug: module.slug,
          description: module.description,
          isActive: true,
        })
        .returning({
          id: modules.id,
        });

      if (!created) {
        throw new Error(`Failed to create module: ${module.slug}`);
      }

      moduleId = created.id;
      console.log(`Created module: ${module.slug}`);
    }

    for (const permission of module.permissions) {
      const [existingPermission] = await database.db
        .select({
          id: permissions.id,
        })
        .from(permissions)
        .where(
          and(
            eq(permissions.moduleId, moduleId),
            eq(permissions.slug, permission.slug),
          ),
        )
        .limit(1);

      if (existingPermission) {
        console.log(`Permission already exists: ${permission.slug}`);
        continue;
      }

      await database.db.insert(permissions).values({
        moduleId,
        name: permission.name,
        slug: permission.slug,
        action: permission.action,
        description: permission.description,
      });

      console.log(`Created permission: ${permission.slug}`);
    }
  }
}

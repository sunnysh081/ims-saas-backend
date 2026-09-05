import { and, eq, isNull } from 'drizzle-orm';

import { DatabaseService } from '../database.service';
import { roles } from '../schema';

const SYSTEM_ROLES = [
  {
    name: 'Super Admin',
    slug: 'super_admin',
    description:
      'Platform-level administrator with access to the entire SaaS platform.',
    scope: 'platform' as const,
  },
  {
    name: 'Institute Admin',
    slug: 'institute_admin',
    description:
      'Institute-level administrator with access to manage their institute.',
    scope: 'institute' as const,
  },
];

export async function seedSystemRoles(
  database: DatabaseService,
): Promise<void> {
  for (const role of SYSTEM_ROLES) {
    const [existingRole] = await database.db
      .select({
        id: roles.id,
      })
      .from(roles)
      .where(
        and(
          eq(roles.slug, role.slug),
          isNull(roles.instituteId),
          eq(roles.scope, role.scope),
        ),
      )
      .limit(1);

    if (existingRole) {
      console.log(`System role already exists: ${role.slug}`);
      continue;
    }

    await database.db.insert(roles).values({
      name: role.name,
      slug: role.slug,
      description: role.description,
      scope: role.scope,
      instituteId: null,
      isSystem: true,
      isActive: true,
    });

    console.log(`Created system role: ${role.slug}`);
  }
}

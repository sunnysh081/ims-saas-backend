import { and, eq, inArray, isNull } from 'drizzle-orm';

import { DatabaseService } from '../database.service';
import { permissions, rolePermissions, roles } from '../schema';

const SYSTEM_ROLES = [
  {
    name: 'Super Admin',
    slug: 'super_admin',
    description: 'Platform-level administrator with access to the entire SaaS platform.',
    scope: 'platform' as const,
  },
  {
    name: 'Institute Admin',
    slug: 'institute_admin',
    description: 'Institute-level administrator with access to manage their institute.',
    scope: 'institute' as const,
  },
  {
    name: 'Student',
    slug: 'student',
    description: 'Student portal access: view own resources, quizzes, assignments, and activities.',
    scope: 'institute' as const,
  },
];

// Granted to the Student system role directly (students don't get an
// institute-admin-style permission bypass, so this has to be explicit).
const STUDENT_PERMISSION_SLUGS = ['portal.resources.read'];

export async function seedSystemRoles(database: DatabaseService): Promise<void> {
  for (const role of SYSTEM_ROLES) {
    const [existingRole] = await database.db
      .select({
        id: roles.id,
      })
      .from(roles)
      .where(and(eq(roles.slug, role.slug), isNull(roles.instituteId), eq(roles.scope, role.scope)))
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

// Must run after both seedSystemRoles and seedPermissions, since it looks up
// the Student role and the portal.* permission catalog created by those.
export async function seedStudentRolePermissions(database: DatabaseService): Promise<void> {
  const [studentRole] = await database.db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.slug, 'student'), eq(roles.scope, 'institute'), isNull(roles.instituteId)))
    .limit(1);

  if (!studentRole) {
    console.log('Skipping student role permissions: student role not found.');
    return;
  }

  const permissionRows = await database.db
    .select({ id: permissions.id, slug: permissions.slug })
    .from(permissions)
    .where(inArray(permissions.slug, STUDENT_PERMISSION_SLUGS));

  if (!permissionRows.length) {
    console.log('Skipping student role permissions: portal permissions not found.');
    return;
  }

  const existing = await database.db
    .select({ permissionId: rolePermissions.permissionId })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, studentRole.id));

  const alreadyGranted = new Set(existing.map((row) => row.permissionId));
  const toGrant = permissionRows.filter((row) => !alreadyGranted.has(row.id));

  if (!toGrant.length) {
    console.log('Student role permissions already granted.');
    return;
  }

  await database.db.insert(rolePermissions).values(
    toGrant.map((row) => ({
      roleId: studentRole.id,
      permissionId: row.id,
    })),
  );

  console.log(`Granted ${toGrant.length} permission(s) to student role: ${toGrant.map((row) => row.slug).join(', ')}`);
}

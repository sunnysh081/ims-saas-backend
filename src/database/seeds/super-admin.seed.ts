import { and, eq, isNull } from 'drizzle-orm';

import * as argon2 from 'argon2';

import { DatabaseService } from '../database.service';
import { roles, userRoles, users } from '../schema';

export async function seedSuperAdmin(database: DatabaseService): Promise<void> {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();

  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email) {
    throw new Error('SUPER_ADMIN_EMAIL is required');
  }

  if (!password) {
    throw new Error('SUPER_ADMIN_PASSWORD is required');
  }

  // if (password.length < 12) {
  //     throw new Error(
  //         'SUPER_ADMIN_PASSWORD must contain at least 12 characters',
  //     );
  // }

  await database.db.transaction(async (tx) => {
    /**
     * Find platform super_admin role.
     */
    const [role] = await tx
      .select({
        id: roles.id,
      })
      .from(roles)
      .where(
        and(
          eq(roles.slug, 'super_admin'),
          eq(roles.scope, 'platform'),
          isNull(roles.instituteId),
        ),
      )
      .limit(1);

    if (!role) {
      throw new Error('super_admin role not found. Run role seed first.');
    }

    /**
     * Find existing user.
     */
    const [existingUser] = await tx
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;

      console.log(`Super admin user already exists: ${email}`);
    } else {
      const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 19_456,
        timeCost: 2,
        parallelism: 1,
      });

      const [user] = await tx
        .insert(users)
        .values({
          email,
          passwordHash,
          firstName: 'Super',
          lastName: 'Admin',
          isActive: true,
          emailVerified: true,
        })
        .returning({
          id: users.id,
        });

      if (!user) {
        throw new Error('Failed to create super admin user');
      }

      userId = user.id;

      console.log(`Created super admin user: ${email}`);
    }

    /**
     * Assign super_admin role.
     */
    await tx
      .insert(userRoles)
      .values({
        userId,
        roleId: role.id,
      })
      .onConflictDoNothing();

    console.log(`Ensured super_admin role assignment: ${email}`);
  });
}

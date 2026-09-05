import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as argon2 from 'argon2';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';

import { AppLogger } from '../common/logging/logger.service';
import { DatabaseService } from '../database/database.service';
import {
  instituteUsers,
  institutes,
  roles,
  userRoles,
  users,
} from '../database/schema';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

const userColumns = {
  id: users.id,
  email: users.email,
  firstName: users.firstName,
  lastName: users.lastName,
  mobile: users.mobile,
  isActive: users.isActive,
  emailVerified: users.emailVerified,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

@Injectable()
export class UsersService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async listUsers() {
    const rows = await this.database.db
      .select(userColumns)
      .from(users)
      .where(isNull(users.deletedAt))
      .orderBy(desc(users.createdAt));

    const assignments = await this.roleAssignments(rows.map((row) => row.id));
    const memberships = await this.instituteMemberships(rows.map((row) => row.id));

    return rows.map((row) => this.withUserRelations(row, assignments, memberships));
  }

  async getUser(id: string) {
    const [user] = await this.database.db
      .select(userColumns)
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const assignments = await this.roleAssignments([user.id]);
    const memberships = await this.instituteMemberships([user.id]);

    return this.withUserRelations(user, assignments, memberships);
  }

  async createUser(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();

    const [existing] = await this.database.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      throw new ConflictException('Email already exists');
    }

    await this.assertInstituteExists(dto.instituteId);
    await this.assertAssignableRoles(dto.roleIds, dto.instituteId);

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });

    const user = await this.database.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({
          email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          mobile: dto.mobile,
          isActive: true,
          emailVerified: false,
        })
        .returning(userColumns);

      if (!created) {
        throw new BadRequestException('Failed to create user');
      }

      await tx.insert(instituteUsers).values({
        userId: created.id,
        instituteId: dto.instituteId,
      });

      await tx.insert(userRoles).values(
        dto.roleIds.map((roleId) => ({
          userId: created.id,
          roleId,
        })),
      );

      return created;
    });

    this.logger.info('User created', {
      operation: 'users.create',
      resource: 'user',
      resourceId: user.id,
    });

    return this.getUser(user.id);
  }

  async updateUser(id: string, dto: UpdateUserDto, actorId: string) {
    const current = await this.getUser(id);
    const isSuperAdminUser = this.isSuperAdmin(current.roles);

    if (id === actorId && dto.isActive === false) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      const [existing] = await this.database.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing && existing.id !== id) {
        throw new ConflictException('Email already exists');
      }
    }

    const instituteId = dto.instituteId ?? current.instituteId ?? null;

    if (!isSuperAdminUser && dto.instituteId) {
      await this.assertInstituteExists(dto.instituteId);
    }

    if (dto.roleIds) {
      if (!isSuperAdminUser && !instituteId) {
        throw new BadRequestException('Institute is required');
      }

      await this.assertAssignableRoles(dto.roleIds, instituteId, {
        allowSuperAdmin: isSuperAdminUser,
      });

      if (id === actorId && isSuperAdminUser) {
        const assigned = await this.database.db
          .select({ slug: roles.slug, scope: roles.scope, instituteId: roles.instituteId })
          .from(roles)
          .where(inArray(roles.id, dto.roleIds));

        const keepsSuperAdmin = assigned.some(
          (role) =>
            role.slug === 'super_admin' &&
            role.scope === 'platform' &&
            role.instituteId === null,
        );

        if (!keepsSuperAdmin) {
          throw new BadRequestException(
            'You cannot remove the super admin role from your own account',
          );
        }
      }
    }

    await this.database.db.transaction(async (tx) => {
      const passwordHash = dto.password
        ? await argon2.hash(dto.password, {
            type: argon2.argon2id,
            memoryCost: 19_456,
            timeCost: 2,
            parallelism: 1,
          })
        : undefined;

      await tx
        .update(users)
        .set({
          email: dto.email?.trim().toLowerCase(),
          firstName: dto.firstName,
          lastName: dto.lastName,
          mobile: dto.mobile,
          isActive: dto.isActive,
          ...(passwordHash ? { passwordHash } : {}),
          updatedAt: new Date(),
        })
        .where(eq(users.id, id));

      if (dto.instituteId && !isSuperAdminUser) {
        await tx.delete(instituteUsers).where(eq(instituteUsers.userId, id));
        await tx.insert(instituteUsers).values({
          userId: id,
          instituteId: dto.instituteId,
        });
      }

      if (dto.roleIds) {
        await tx.delete(userRoles).where(eq(userRoles.userId, id));
        await tx.insert(userRoles).values(
          dto.roleIds.map((roleId) => ({
            userId: id,
            roleId,
          })),
        );
      }
    });

    this.logger.info('User updated', {
      operation: 'users.update',
      resource: 'user',
      resourceId: id,
    });

    return this.getUser(current.id);
  }

  private withUserRelations(
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string | null;
      mobile: string | null;
      isActive: boolean;
      emailVerified: boolean;
      lastLoginAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    },
    assignments: Awaited<ReturnType<UsersService['roleAssignments']>>,
    memberships: Awaited<ReturnType<UsersService['instituteMemberships']>>,
  ) {
    const institutesForUser = memberships.get(user.id) ?? [];

    return {
      ...user,
      roles: assignments.get(user.id) ?? [],
      institutes: institutesForUser,
      instituteId: institutesForUser[0]?.id ?? null,
    };
  }

  private isSuperAdmin(
    assigned: Array<{ slug: string; scope: 'platform' | 'institute'; instituteId: string | null }>,
  ) {
    return assigned.some(
      (role) =>
        role.slug === 'super_admin' &&
        role.scope === 'platform' &&
        role.instituteId === null,
    );
  }

  private async assertInstituteExists(instituteId: string) {
    const [institute] = await this.database.db
      .select({ id: institutes.id })
      .from(institutes)
      .where(and(eq(institutes.id, instituteId), isNull(institutes.deletedAt)))
      .limit(1);

    if (!institute) {
      throw new BadRequestException('Institute not found');
    }
  }

  private async assertAssignableRoles(
    roleIds: string[],
    instituteId: string | null,
    options: { allowSuperAdmin?: boolean } = {},
  ) {
    const uniqueIds = [...new Set(roleIds)];

    const rows = await this.database.db
      .select({
        id: roles.id,
        slug: roles.slug,
        scope: roles.scope,
        instituteId: roles.instituteId,
      })
      .from(roles)
      .where(and(inArray(roles.id, uniqueIds), eq(roles.isActive, true)));

    if (rows.length !== uniqueIds.length) {
      throw new BadRequestException('One or more roles are invalid');
    }

    for (const role of rows) {
      const isSuperAdminRole =
        role.slug === 'super_admin' &&
        role.scope === 'platform' &&
        role.instituteId === null;

      if (isSuperAdminRole) {
        if (!options.allowSuperAdmin) {
          throw new BadRequestException('Cannot assign the super admin role');
        }

        continue;
      }

      if (role.scope === 'platform') {
        throw new BadRequestException('Only super_admin is a platform role');
      }

      if (role.instituteId && role.instituteId !== instituteId) {
        throw new BadRequestException('Role does not belong to this institute');
      }
    }
  }

  private async instituteMemberships(userIds: string[]) {
    const map = new Map<string, Array<{ id: string; name: string }>>();

    if (!userIds.length) {
      return map;
    }

    const rows = await this.database.db
      .select({
        userId: instituteUsers.userId,
        id: institutes.id,
        name: institutes.name,
      })
      .from(instituteUsers)
      .innerJoin(institutes, eq(institutes.id, instituteUsers.instituteId))
      .where(inArray(instituteUsers.userId, userIds));

    for (const row of rows) {
      const list = map.get(row.userId) ?? [];
      list.push({ id: row.id, name: row.name });
      map.set(row.userId, list);
    }

    return map;
  }

  private async roleAssignments(userIds: string[]) {
    const map = new Map<
      string,
      Array<{
        id: string;
        name: string;
        slug: string;
        scope: 'platform' | 'institute';
        instituteId: string | null;
        visibility: 'global' | 'institute';
      }>
    >();

    if (!userIds.length) {
      return map;
    }

    const rows = await this.database.db
      .select({
        userId: userRoles.userId,
        id: roles.id,
        name: roles.name,
        slug: roles.slug,
        scope: roles.scope,
        instituteId: roles.instituteId,
      })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(inArray(userRoles.userId, userIds));

    for (const row of rows) {
      const list = map.get(row.userId) ?? [];
      list.push({
        id: row.id,
        name: row.name,
        slug: row.slug,
        scope: row.scope,
        instituteId: row.instituteId,
        visibility: row.instituteId ? 'institute' : 'global',
      });
      map.set(row.userId, list);
    }

    return map;
  }
}

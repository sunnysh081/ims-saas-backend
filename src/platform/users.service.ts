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
import { roles, userRoles, users } from '../database/schema';
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

    return rows.map((row) => ({
      ...row,
      roles: assignments.get(row.id) ?? [],
    }));
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

    return {
      ...user,
      roles: assignments.get(user.id) ?? [],
    };
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

    await this.assertRolesExist(dto.roleIds);

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

    if (dto.roleIds) {
      await this.assertRolesExist(dto.roleIds);

      if (id === actorId) {
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

  private async assertRolesExist(roleIds: string[]) {
    const uniqueIds = [...new Set(roleIds)];

    const rows = await this.database.db
      .select({ id: roles.id })
      .from(roles)
      .where(and(inArray(roles.id, uniqueIds), eq(roles.isActive, true)));

    if (rows.length !== uniqueIds.length) {
      throw new BadRequestException('One or more roles are invalid');
    }
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
      });
      map.set(row.userId, list);
    }

    return map;
  }
}

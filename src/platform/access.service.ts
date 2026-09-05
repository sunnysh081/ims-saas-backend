import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { and, desc, eq, inArray, isNull } from 'drizzle-orm';

import { AppLogger } from '../common/logging/logger.service';
import { DatabaseService } from '../database/database.service';
import {
  institutes,
  modules,
  permissions,
  rolePermissions,
  roles,
} from '../database/schema';
import { CreatePlatformRoleDto, UpdatePlatformRoleDto } from './dto/role.dto';

@Injectable()
export class AccessService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async listPermissions() {
    const rows = await this.database.db
      .select({
        id: permissions.id,
        name: permissions.name,
        slug: permissions.slug,
        action: permissions.action,
        description: permissions.description,
        moduleId: modules.id,
        moduleName: modules.name,
        moduleSlug: modules.slug,
      })
      .from(permissions)
      .innerJoin(modules, eq(permissions.moduleId, modules.id))
      .orderBy(modules.name, permissions.name);

    const grouped = new Map<
      string,
      {
        id: string;
        name: string;
        slug: string;
        permissions: typeof rows;
      }
    >();

    for (const row of rows) {
      const current = grouped.get(row.moduleId) ?? {
        id: row.moduleId,
        name: row.moduleName,
        slug: row.moduleSlug,
        permissions: [],
      };

      current.permissions.push(row);
      grouped.set(row.moduleId, current);
    }

    return {
      items: rows,
      modules: [...grouped.values()],
    };
  }

  async listRoles() {
    const rows = await this.database.db
      .select({
        id: roles.id,
        name: roles.name,
        slug: roles.slug,
        description: roles.description,
        scope: roles.scope,
        instituteId: roles.instituteId,
        instituteName: institutes.name,
        isSystem: roles.isSystem,
        isActive: roles.isActive,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
      })
      .from(roles)
      .leftJoin(institutes, eq(institutes.id, roles.instituteId))
      .where(isNull(roles.deletedAt))
      .orderBy(desc(roles.createdAt));

    return rows.map((role) => this.withVisibility(role));
  }

  async getRole(id: string) {
    const [role] = await this.database.db
      .select({
        id: roles.id,
        name: roles.name,
        slug: roles.slug,
        description: roles.description,
        scope: roles.scope,
        instituteId: roles.instituteId,
        instituteName: institutes.name,
        isSystem: roles.isSystem,
        isActive: roles.isActive,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
      })
      .from(roles)
      .leftJoin(institutes, eq(institutes.id, roles.instituteId))
      .where(and(eq(roles.id, id), isNull(roles.deletedAt)))
      .limit(1);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const assigned = await this.database.db
      .select({
        permissionId: rolePermissions.permissionId,
      })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, id));

    return this.withVisibility({
      ...role,
      permissionIds: assigned.map((row) => row.permissionId),
    });
  }

  async createRole(dto: CreatePlatformRoleDto) {
    const slug = dto.slug.toLowerCase();

    if (slug === 'super_admin' || slug === 'institute_admin') {
      throw new BadRequestException(`${slug} is reserved`);
    }

    const existing = await this.findRoleBySlug(slug, null);

    if (existing) {
      throw new ConflictException('Role slug already exists');
    }

    await this.assertPermissionsExist(dto.permissionIds);

    const role = await this.database.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(roles)
        .values({
          name: dto.name,
          slug,
          description: dto.description,
          scope: 'institute',
          instituteId: null,
          isSystem: false,
          isActive: true,
        })
        .returning();

      if (!created) {
        throw new BadRequestException('Failed to create role');
      }

      if (dto.permissionIds.length) {
        await tx.insert(rolePermissions).values(
          dto.permissionIds.map((permissionId) => ({
            roleId: created.id,
            permissionId,
          })),
        );
      }

      return created;
    });

    this.logger.info('Role created', {
      operation: 'roles.create',
      resource: 'role',
      resourceId: role.id,
    });

    return this.getRole(role.id);
  }

  async updateRole(id: string, dto: UpdatePlatformRoleDto) {
    const current = await this.getRole(id);

    if (current.isSystem && dto.slug && dto.slug !== current.slug) {
      throw new BadRequestException('System role slug cannot be changed');
    }

    const nextSlug = dto.slug?.toLowerCase();

    if (
      (nextSlug === 'super_admin' || nextSlug === 'institute_admin') &&
      current.slug !== nextSlug
    ) {
      throw new BadRequestException(`${nextSlug} is reserved`);
    }

    if (dto.slug) {
      const slug = dto.slug.toLowerCase();
      const existing = await this.findRoleBySlug(slug, current.instituteId);

      if (existing && existing.id !== id) {
        throw new ConflictException('Role slug already exists');
      }
    }

    if (dto.permissionIds) {
      await this.assertPermissionsExist(dto.permissionIds);
    }

    await this.database.db.transaction(async (tx) => {
      await tx
        .update(roles)
        .set({
          name: dto.name,
          slug: dto.slug?.toLowerCase(),
          description: dto.description,
          isActive: dto.isActive,
          updatedAt: new Date(),
        })
        .where(eq(roles.id, id));

      if (dto.permissionIds) {
        await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, id));

        if (dto.permissionIds.length) {
          await tx.insert(rolePermissions).values(
            dto.permissionIds.map((permissionId) => ({
              roleId: id,
              permissionId,
            })),
          );
        }
      }
    });

    this.logger.info('Role updated', {
      operation: 'roles.update',
      resource: 'role',
      resourceId: id,
    });

    return this.getRole(id);
  }

  private withVisibility<T extends { instituteId: string | null }>(role: T) {
    return {
      ...role,
      visibility: role.instituteId ? ('institute' as const) : ('global' as const),
    };
  }

  private async findRoleBySlug(slug: string, instituteId: string | null) {
    const [existing] = await this.database.db
      .select({ id: roles.id })
      .from(roles)
      .where(
        and(
          eq(roles.slug, slug),
          instituteId ? eq(roles.instituteId, instituteId) : isNull(roles.instituteId),
          isNull(roles.deletedAt),
        ),
      )
      .limit(1);

    return existing;
  }

  private async assertPermissionsExist(permissionIds: string[]) {
    const uniqueIds = [...new Set(permissionIds)];

    if (!uniqueIds.length) {
      return;
    }

    const rows = await this.database.db
      .select({ id: permissions.id })
      .from(permissions)
      .where(inArray(permissions.id, uniqueIds));

    if (rows.length !== uniqueIds.length) {
      throw new BadRequestException('One or more permissions are invalid');
    }
  }
}

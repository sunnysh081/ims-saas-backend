import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AppLogger } from '../common/logging/logger.service';

import { DatabaseService } from '../database/database.service';

import { permissions, rolePermissions, roles } from '../database/schema';

import { and, eq, inArray, isNull, or } from 'drizzle-orm';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async create(instituteId: string, dto: CreateRoleDto) {
    const slug = dto.slug.toLowerCase();
    this.assertWritableSlug(slug);

    const existing = await this.database.db
      .select({
        id: roles.id,
      })
      .from(roles)
      .where(and(eq(roles.instituteId, instituteId), eq(roles.slug, slug)))
      .limit(1);

    if (existing.length) {
      throw new ConflictException('Role already exists');
    }

    await this.assertPermissionsExist(dto.permissionIds);

    const role = await this.database.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(roles)
        .values({
          name: dto.name,
          slug,
          description: dto.description,
          instituteId,
          scope: 'institute',
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

      this.logger.info('Role created', {
        operation: 'roles.create',
        resource: 'role',
        resourceId: created.id,
        instituteId,
      });

      return created;
    });

    return this.findOne(instituteId, role.id);
  }

  async findAll(instituteId: string) {
    const rows = await this.database.db
      .select()
      .from(roles)
      .where(
        and(
          isNull(roles.deletedAt),
          or(
            eq(roles.instituteId, instituteId),
            and(isNull(roles.instituteId), eq(roles.scope, 'institute')),
          ),
        ),
      );

    return rows.map((role) => this.withVisibility(role));
  }

  async findOne(instituteId: string, roleId: string) {
    const role = await this.requireRole(instituteId, roleId);
    const assigned = await this.database.db
      .select({
        permissionId: rolePermissions.permissionId,
      })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));

    return this.withVisibility({
      ...role,
      permissionIds: assigned.map((row) => row.permissionId),
    });
  }

  async update(instituteId: string, roleId: string, dto: UpdateRoleDto) {
    const current = await this.requireRole(instituteId, roleId);

    if (current.instituteId !== instituteId) {
      throw new BadRequestException('Global roles cannot be edited here');
    }

    if (current.isSystem && dto.slug && dto.slug !== current.slug) {
      throw new BadRequestException('System role slug cannot be changed');
    }

    if (dto.slug) {
      this.assertWritableSlug(dto.slug);
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
        .where(eq(roles.id, roleId));

      if (dto.permissionIds) {
        await tx
          .delete(rolePermissions)
          .where(eq(rolePermissions.roleId, roleId));

        if (dto.permissionIds.length) {
          await tx.insert(rolePermissions).values(
            dto.permissionIds.map((permissionId) => ({
              roleId,
              permissionId,
            })),
          );
        }
      }
    });

    this.logger.info('Role updated', {
      operation: 'roles.update',
      resource: 'role',
      resourceId: roleId,
      instituteId,
    });

    return this.findOne(instituteId, roleId);
  }

  private async requireRole(instituteId: string, roleId: string) {
    const [role] = await this.database.db
      .select()
      .from(roles)
      .where(
        and(
          eq(roles.id, roleId),
          isNull(roles.deletedAt),
          or(
            eq(roles.instituteId, instituteId),
            and(isNull(roles.instituteId), eq(roles.scope, 'institute')),
          ),
        ),
      )
      .limit(1);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  private assertWritableSlug(slug: string) {
    const value = slug.toLowerCase();

    if (value === 'super_admin' || value === 'institute_admin') {
      throw new BadRequestException(`${value} is reserved`);
    }
  }

  private async assertPermissionsExist(permissionIds: string[]) {
    const uniqueIds = [...new Set(permissionIds)];

    if (!uniqueIds.length) {
      return;
    }

    const rows = await this.database.db
      .select({
        id: permissions.id,
      })
      .from(permissions)
      .where(inArray(permissions.id, uniqueIds));

    if (rows.length !== uniqueIds.length) {
      throw new BadRequestException('One or more permissions are invalid');
    }
  }

  private withVisibility<T extends { instituteId: string | null }>(role: T) {
    return {
      ...role,
      visibility: role.instituteId
        ? ('institute' as const)
        : ('global' as const),
    };
  }
}

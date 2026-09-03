import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AppLogger } from '../common/logging/logger.service';

import { DatabaseService } from '../database/database.service';

import { permissions, rolePermissions, roles } from '../database/schema';

import { and, eq, inArray } from 'drizzle-orm';

import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly logger: AppLogger,
  ) {}

  async create(instituteId: string, dto: CreateRoleDto) {
    const existing = await this.database.db
      .select({
        id: roles.id,
      })
      .from(roles)
      .where(and(eq(roles.instituteId, instituteId), eq(roles.slug, dto.slug)))
      .limit(1);

    if (existing.length) {
      throw new ConflictException('Role already exists');
    }

    const permissionRows = dto.permissionIds.length
      ? await this.database.db
          .select({
            id: permissions.id,
          })
          .from(permissions)
          .where(inArray(permissions.id, dto.permissionIds))
      : [];

    if (permissionRows.length !== dto.permissionIds.length) {
      throw new BadRequestException('One or more permissions are invalid');
    }

    return this.database.db.transaction(async (tx) => {
      const [role] = await tx
        .insert(roles)
        .values({
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          instituteId,
          scope: 'institute',
          isSystem: false,
          isActive: true,
        })
        .returning();

      if (!role) {
        throw new BadRequestException('Failed to create role');
      }

      if (dto.permissionIds.length) {
        await tx.insert(rolePermissions).values(
          dto.permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
        );
      }

      this.logger.info('Role created', {
        operation: 'roles.create',
        resource: 'role',
        resourceId: role.id,
        instituteId,
      });

      return role;
    });
  }

  async findAll(instituteId: string) {
    return this.database.db
      .select()
      .from(roles)
      .where(and(eq(roles.instituteId, instituteId), eq(roles.isActive, true)));
  }

  async findOne(instituteId: string, roleId: string) {
    const [role] = await this.database.db
      .select()
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.instituteId, instituteId)))
      .limit(1);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }
}

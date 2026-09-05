import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';

import { and, count, eq, isNull, or } from 'drizzle-orm';

import { RequirePermissions } from '../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../common/decorators/current-institute.decorator';
import { InstituteGuard } from '../common/guards/institute.guard';
import { PermissionGuard } from '../common/guards/permissions.guards';
import { DatabaseService } from '../database/database.service';
import { institutes, instituteUsers, roles } from '../database/schema';
import { AccessService } from '../platform/access.service';

@Controller('institute')
@UseGuards(InstituteGuard)
export class InstituteController {
  constructor(
    private readonly database: DatabaseService,
    private readonly accessService: AccessService,
  ) {}

  @Get('overview')
  async overview(
    @CurrentInstituteId()
    instituteId: string,
  ) {
    const [institute] = await this.database.db
      .select({
        id: institutes.id,
        name: institutes.name,
        slug: institutes.slug,
        status: institutes.status,
        isActive: institutes.isActive,
      })
      .from(institutes)
      .where(and(eq(institutes.id, instituteId), isNull(institutes.deletedAt)))
      .limit(1);

    if (!institute) {
      throw new NotFoundException('Institute not found');
    }

    const [userCount] = await this.database.db
      .select({
        total: count(),
      })
      .from(instituteUsers)
      .where(eq(instituteUsers.instituteId, instituteId));

    const [roleCount] = await this.database.db
      .select({
        total: count(),
      })
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

    return {
      institute,
      users: {
        total: Number(userCount?.total ?? 0),
      },
      roles: {
        total: Number(roleCount?.total ?? 0),
      },
    };
  }

  @Get('permissions')
  @UseGuards(PermissionGuard)
  @RequirePermissions('roles.read')
  permissions() {
    return this.accessService.listPermissions();
  }
}

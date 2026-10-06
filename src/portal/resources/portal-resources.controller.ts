import { Controller, Get, UseGuards } from '@nestjs/common';

import type { AuthenticatedUser } from '../../authorization/types/authorization.type';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { PortalResourcesService } from './portal-resources.service';

@Controller('portal/resources')
@UseGuards(InstituteGuard, PermissionGuard)
export class PortalResourcesController {
  constructor(private readonly portalResourcesService: PortalResourcesService) {}

  @Get()
  @RequirePermissions('portal.resources.read')
  findAll(
    @CurrentInstituteId()
    instituteId: string,
    @CurrentUser()
    user: AuthenticatedUser,
  ) {
    return this.portalResourcesService.listForCurrentStudent(instituteId, user.id);
  }
}

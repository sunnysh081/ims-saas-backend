import { Controller, Get, UseGuards } from '@nestjs/common';

import type { AuthenticatedUser } from '../../authorization/types/authorization.type';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { PortalProfileService } from './portal-profile.service';

@Controller('portal/profile')
@UseGuards(InstituteGuard, PermissionGuard)
export class PortalProfileController {
  constructor(private readonly portalProfileService: PortalProfileService) {}

  @Get()
  @RequirePermissions('portal.profile.read')
  get(@CurrentInstituteId() instituteId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.portalProfileService.getForCurrentStudent(instituteId, user.id);
  }
}

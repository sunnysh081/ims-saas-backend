import { Module } from '@nestjs/common';

import { InstituteGuard } from '../common/guards/institute.guard';
import { PermissionGuard } from '../common/guards/permissions.guards';
import { PortalResourcesController } from './resources/portal-resources.controller';
import { PortalResourcesService } from './resources/portal-resources.service';

@Module({
  controllers: [PortalResourcesController],
  providers: [PortalResourcesService, InstituteGuard, PermissionGuard],
})
export class PortalModule {}

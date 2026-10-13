import { Module } from '@nestjs/common';

import { InstituteGuard } from '../common/guards/institute.guard';
import { PermissionGuard } from '../common/guards/permissions.guards';
import { PortalProfileController } from './profile/portal-profile.controller';
import { PortalProfileService } from './profile/portal-profile.service';
import { PortalQuizzesController } from './quizzes/portal-quizzes.controller';
import { PortalQuizzesService } from './quizzes/portal-quizzes.service';
import { PortalResourcesController } from './resources/portal-resources.controller';
import { PortalResourcesService } from './resources/portal-resources.service';

@Module({
  controllers: [PortalResourcesController, PortalProfileController, PortalQuizzesController],
  providers: [PortalResourcesService, PortalProfileService, PortalQuizzesService, InstituteGuard, PermissionGuard],
})
export class PortalModule {}

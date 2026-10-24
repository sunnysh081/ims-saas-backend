import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';

import { CreatePostDto, VoteDto } from '../../academic/activities/dto/activity.dto';
import type { AuthenticatedUser } from '../../authorization/types/authorization.type';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { PortalActivitiesService } from './portal-activities.service';

@Controller('portal/activities')
@UseGuards(InstituteGuard, PermissionGuard)
export class PortalActivitiesController {
  constructor(private readonly portalActivitiesService: PortalActivitiesService) {}

  @Get()
  @RequirePermissions('portal.activities.read')
  list(@CurrentInstituteId() instituteId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.portalActivitiesService.list(instituteId, user.id);
  }

  @Get(':id')
  @RequirePermissions('portal.activities.read')
  detail(@CurrentInstituteId() instituteId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.portalActivitiesService.detail(instituteId, user.id, id);
  }

  @Post(':id/posts')
  @RequirePermissions('portal.activities.participate')
  post(
    @CurrentInstituteId() instituteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.portalActivitiesService.post(instituteId, user.id, id, dto);
  }

  @Delete(':id/posts/:postId')
  @RequirePermissions('portal.activities.participate')
  deletePost(
    @CurrentInstituteId() instituteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('postId') postId: string,
  ) {
    return this.portalActivitiesService.deletePost(instituteId, user.id, id, postId);
  }

  @Post(':id/vote')
  @RequirePermissions('portal.activities.participate')
  vote(@CurrentInstituteId() instituteId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: VoteDto) {
    return this.portalActivitiesService.vote(instituteId, user.id, id, dto);
  }
}

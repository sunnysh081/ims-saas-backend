import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';

import type { AuthenticatedUser } from '../../authorization/types/authorization.type';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto, CreatePostDto, ListActivitiesQueryDto, SetRecordDto, UpdateActivityDto } from './dto/activity.dto';

@Controller('institute/activities')
@UseGuards(InstituteGuard, PermissionGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @RequirePermissions('activities.read')
  findAll(@CurrentInstituteId() instituteId: string, @Query() query: ListActivitiesQueryDto) {
    return this.activitiesService.findAll(instituteId, query);
  }

  @Get(':id')
  @RequirePermissions('activities.read')
  findOne(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.activitiesService.findOne(instituteId, id);
  }

  @Post()
  @RequirePermissions('activities.create')
  create(@CurrentInstituteId() instituteId: string, @Body() dto: CreateActivityDto) {
    return this.activitiesService.create(instituteId, dto);
  }

  @Patch(':id')
  @RequirePermissions('activities.update')
  update(@CurrentInstituteId() instituteId: string, @Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.activitiesService.update(instituteId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('activities.delete')
  remove(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.activitiesService.remove(instituteId, id);
  }

  @Get(':id/participation')
  @RequirePermissions('activities.read')
  participation(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.activitiesService.participation(instituteId, id);
  }

  @Post(':id/posts')
  @RequirePermissions('activities.update')
  addPost(
    @CurrentInstituteId() instituteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreatePostDto,
  ) {
    return this.activitiesService.addPost(instituteId, id, user.id, dto);
  }

  @Delete(':id/posts/:postId')
  @RequirePermissions('activities.update')
  removePost(@CurrentInstituteId() instituteId: string, @Param('id') id: string, @Param('postId') postId: string) {
    return this.activitiesService.removePost(instituteId, id, postId);
  }

  @Put(':id/records/:studentId')
  @RequirePermissions('activities.update')
  setRecord(
    @CurrentInstituteId() instituteId: string,
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Body() dto: SetRecordDto,
  ) {
    return this.activitiesService.setRecord(instituteId, id, studentId, dto);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { ResourcesService } from './resources.service';
import { CreateResourceDto, ListResourcesQueryDto, UpdateResourceDto } from './dto/resource.dto';

@Controller('institute/resources')
@UseGuards(InstituteGuard, PermissionGuard)
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  @RequirePermissions('resources.read')
  findAll(
    @CurrentInstituteId()
    instituteId: string,
    @Query()
    query: ListResourcesQueryDto,
  ) {
    return this.resourcesService.findAll(instituteId, query);
  }

  @Get(':id')
  @RequirePermissions('resources.read')
  findOne(
    @CurrentInstituteId()
    instituteId: string,
    @Param('id')
    id: string,
  ) {
    return this.resourcesService.findOne(instituteId, id);
  }

  @Post()
  @RequirePermissions('resources.create')
  create(
    @CurrentInstituteId()
    instituteId: string,
    @Body()
    dto: CreateResourceDto,
  ) {
    return this.resourcesService.create(instituteId, dto);
  }

  @Patch(':id')
  @RequirePermissions('resources.update')
  update(
    @CurrentInstituteId()
    instituteId: string,
    @Param('id')
    id: string,
    @Body()
    dto: UpdateResourceDto,
  ) {
    return this.resourcesService.update(instituteId, id, dto);
  }
}

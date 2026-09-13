import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { ElectiveGroupService } from './elective-group.service';
import {
  CreateElectiveGroupDto,
  CreateElectiveOptionDto,
  ListElectiveGroupsQueryDto,
  UpdateElectiveGroupDto,
} from './dto/elective-group.dto';

@Controller('institute/elective-groups')
@UseGuards(InstituteGuard, PermissionGuard)
export class ElectiveGroupController {
  constructor(private readonly electiveGroupService: ElectiveGroupService) {}

  @Get()
  @RequirePermissions('electives.read')
  findAll(@CurrentInstituteId() instituteId: string, @Query() query: ListElectiveGroupsQueryDto) {
    return this.electiveGroupService.findAll(instituteId, query);
  }

  @Post()
  @RequirePermissions('electives.manage')
  create(@CurrentInstituteId() instituteId: string, @Body() dto: CreateElectiveGroupDto) {
    return this.electiveGroupService.create(instituteId, dto);
  }

  @Patch(':id')
  @RequirePermissions('electives.manage')
  update(@CurrentInstituteId() instituteId: string, @Param('id') id: string, @Body() dto: UpdateElectiveGroupDto) {
    return this.electiveGroupService.update(instituteId, id, dto);
  }

  @Post(':id/options')
  @RequirePermissions('electives.manage')
  addOption(@CurrentInstituteId() instituteId: string, @Param('id') id: string, @Body() dto: CreateElectiveOptionDto) {
    return this.electiveGroupService.addOption(instituteId, id, dto);
  }

  @Delete(':id/options/:optionId')
  @RequirePermissions('electives.manage')
  removeOption(@CurrentInstituteId() instituteId: string, @Param('id') id: string, @Param('optionId') optionId: string) {
    return this.electiveGroupService.removeOption(instituteId, id, optionId);
  }

  @Get(':id/options')
  @RequirePermissions('electives.read')
  listOptions(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.electiveGroupService.listOptions(instituteId, id);
  }

  @Get(':id/seat-matrix')
  @RequirePermissions('electives.read')
  seatMatrix(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.electiveGroupService.seatMatrix(instituteId, id);
  }

  @Get(':id/unsubmitted')
  @RequirePermissions('electives.read')
  unsubmitted(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.electiveGroupService.unsubmitted(instituteId, id);
  }

  @Post(':id/confirm-all')
  @RequirePermissions('electives.manage')
  confirmAll(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.electiveGroupService.confirmAll(instituteId, id);
  }
}

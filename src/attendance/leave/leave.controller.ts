import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import type { AuthenticatedUser } from '../../authorization/types/authorization.type';
import { CreateLeaveDto, ListLeaveQueryDto, ReviewLeaveDto } from './dto/leave.dto';
import { LeaveService } from './leave.service';

@Controller('institute/leave')
@UseGuards(InstituteGuard, PermissionGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Get()
  @RequirePermissions('leave.read')
  findAll(@CurrentInstituteId() instituteId: string, @Query() query: ListLeaveQueryDto) {
    return this.leaveService.findAll(instituteId, query);
  }

  @Post()
  @RequirePermissions('leave.create')
  create(@CurrentInstituteId() instituteId: string, @Body() dto: CreateLeaveDto) {
    return this.leaveService.create(instituteId, dto);
  }

  @Get(':id')
  @RequirePermissions('leave.read')
  findOne(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.leaveService.findOne(instituteId, id);
  }

  @Patch(':id/review')
  @RequirePermissions('leave.review')
  review(
    @CurrentInstituteId() instituteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewLeaveDto,
  ) {
    return this.leaveService.review(instituteId, id, dto, user.id);
  }
}

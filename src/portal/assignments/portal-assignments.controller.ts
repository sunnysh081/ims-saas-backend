import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import type { AuthenticatedUser } from '../../authorization/types/authorization.type';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { SubmitAssignmentDto } from './dto/portal-assignment.dto';
import { PortalAssignmentsService } from './portal-assignments.service';

@Controller('portal/assignments')
@UseGuards(InstituteGuard, PermissionGuard)
export class PortalAssignmentsController {
  constructor(private readonly portalAssignmentsService: PortalAssignmentsService) {}

  @Get()
  @RequirePermissions('portal.assignments.read')
  list(@CurrentInstituteId() instituteId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.portalAssignmentsService.list(instituteId, user.id);
  }

  @Get(':id')
  @RequirePermissions('portal.assignments.read')
  detail(@CurrentInstituteId() instituteId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.portalAssignmentsService.detail(instituteId, user.id, id);
  }

  @Post(':id/submit')
  @RequirePermissions('portal.assignments.submit')
  submit(
    @CurrentInstituteId() instituteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SubmitAssignmentDto,
  ) {
    return this.portalAssignmentsService.submit(instituteId, user.id, id, dto);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import type { AuthenticatedUser } from '../../authorization/types/authorization.type';
import { CancelSessionDto, CreateSessionDto, ListSessionsQueryDto, MarkAttendanceDto } from './dto/session.dto';
import { SessionService } from './session.service';

@Controller('institute/attendance/sessions')
@UseGuards(InstituteGuard, PermissionGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  @RequirePermissions('attendance.read')
  findAll(@CurrentInstituteId() instituteId: string, @Query() query: ListSessionsQueryDto) {
    return this.sessionService.findAll(instituteId, query);
  }

  @Post()
  @RequirePermissions('attendance.manage')
  create(@CurrentInstituteId() instituteId: string, @Body() dto: CreateSessionDto) {
    return this.sessionService.create(instituteId, dto);
  }

  @Get(':id')
  @RequirePermissions('attendance.read')
  findOne(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.sessionService.findWithRoster(instituteId, id);
  }

  @Post(':id/mark')
  @RequirePermissions('attendance.mark')
  mark(
    @CurrentInstituteId() instituteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MarkAttendanceDto,
  ) {
    return this.sessionService.markAttendance(instituteId, id, dto, user.id);
  }

  @Patch(':id/cancel')
  @RequirePermissions('attendance.manage')
  cancel(@CurrentInstituteId() instituteId: string, @Param('id') id: string, @Body() dto: CancelSessionDto) {
    return this.sessionService.cancel(instituteId, id, dto);
  }
}

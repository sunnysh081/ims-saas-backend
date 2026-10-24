import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { AuthorizationService } from '../../authorization/authotizations.service';
import type { AuthenticatedUser } from '../../authorization/types/authorization.type';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { AttendanceService } from './attendance.service';
import {
  AssignPrimaryDto,
  CreateSessionDto,
  ListSessionsQueryDto,
  LockSessionDto,
  MarkAttendanceDto,
  SearchStudentsQueryDto,
  UpdateSessionDto,
} from './dto/attendance.dto';

@Controller('institute/attendance')
@UseGuards(InstituteGuard, PermissionGuard)
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  // Managers see every class; everyone else only the classes assigned to them.
  private async scope(user: AuthenticatedUser, instituteId: string) {
    return {
      userId: user.id,
      canManage: await this.authorizationService.hasPermissions(user.id, instituteId, ['attendance.manage']),
    };
  }

  @Get('teachers')
  @RequirePermissions('attendance.read')
  teachers(@CurrentInstituteId() instituteId: string) {
    return this.attendanceService.teachers(instituteId);
  }

  @Get('students')
  @RequirePermissions('attendance.schedule')
  searchStudents(@CurrentInstituteId() instituteId: string, @Query() query: SearchStudentsQueryDto) {
    return this.attendanceService.searchStudents(instituteId, query.q);
  }

  @Get('students/:studentId/summary')
  @RequirePermissions('attendance.read')
  studentSummary(@CurrentInstituteId() instituteId: string, @Param('studentId') studentId: string) {
    return this.attendanceService.studentSummary(instituteId, studentId);
  }

  @Get('sessions')
  @RequirePermissions('attendance.read')
  async list(@CurrentInstituteId() instituteId: string, @CurrentUser() user: AuthenticatedUser, @Query() query: ListSessionsQueryDto) {
    return this.attendanceService.list(instituteId, query, await this.scope(user, instituteId));
  }

  @Post('sessions')
  @RequirePermissions('attendance.schedule')
  async create(@CurrentInstituteId() instituteId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSessionDto) {
    return this.attendanceService.create(instituteId, dto, await this.scope(user, instituteId));
  }

  @Get('sessions/:id')
  @RequirePermissions('attendance.read')
  async detail(@CurrentInstituteId() instituteId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.attendanceService.detail(instituteId, id, await this.scope(user, instituteId));
  }

  @Patch('sessions/:id')
  @RequirePermissions('attendance.schedule')
  update(@CurrentInstituteId() instituteId: string, @Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.attendanceService.update(instituteId, id, dto);
  }

  @Delete('sessions/:id')
  @RequirePermissions('attendance.schedule')
  cancel(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.attendanceService.cancel(instituteId, id);
  }

  @Post('sessions/:id/attendance')
  @RequirePermissions('attendance.mark')
  async mark(
    @CurrentInstituteId() instituteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MarkAttendanceDto,
  ) {
    return this.attendanceService.mark(instituteId, id, dto, await this.scope(user, instituteId));
  }

  @Post('sessions/:id/primary')
  @RequirePermissions('attendance.primary')
  async assignPrimary(
    @CurrentInstituteId() instituteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AssignPrimaryDto,
  ) {
    return this.attendanceService.assignPrimary(instituteId, id, dto, await this.scope(user, instituteId));
  }

  @Delete('sessions/:id/primary/:studentId')
  @RequirePermissions('attendance.primary')
  async removePrimary(
    @CurrentInstituteId() instituteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ) {
    return this.attendanceService.removePrimary(instituteId, id, studentId, await this.scope(user, instituteId));
  }

  @Patch('sessions/:id/lock')
  @RequirePermissions('attendance.manage')
  async lock(
    @CurrentInstituteId() instituteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: LockSessionDto,
  ) {
    return this.attendanceService.setLocked(instituteId, id, dto.locked, await this.scope(user, instituteId));
  }

  @Get('sessions/:id/audit')
  @RequirePermissions('attendance.read')
  async audit(@CurrentInstituteId() instituteId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.attendanceService.audit(instituteId, id, await this.scope(user, instituteId));
  }
}

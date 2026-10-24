import { Controller, Get, UseGuards } from '@nestjs/common';

import { AttendanceCoreService } from '../../academic/attendance/attendance-core.service';
import type { AuthenticatedUser } from '../../authorization/types/authorization.type';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { PortalStudentScopeService } from '../portal-student-scope.service';

@Controller('portal/attendance')
@UseGuards(InstituteGuard, PermissionGuard)
export class PortalAttendanceController {
  constructor(
    private readonly core: AttendanceCoreService,
    private readonly studentScope: PortalStudentScopeService,
  ) {}

  // The student always comes from the logged-in user, never from the request.
  @Get()
  @RequirePermissions('portal.attendance.read')
  async mine(@CurrentInstituteId() instituteId: string, @CurrentUser() user: AuthenticatedUser) {
    const { studentId } = await this.studentScope.scopeFor(instituteId, user.id);

    return this.core.studentSummary(instituteId, studentId);
  }
}

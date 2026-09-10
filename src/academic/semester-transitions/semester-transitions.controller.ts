import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import type { AuthenticatedUser } from '../../authorization/types/authorization.type';
import { AcademicLifecycleService } from '../academic-lifecycle.service';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { PromoteSemesterDto } from './dto/promote.dto';

@Controller('institute/semester-transitions')
@UseGuards(InstituteGuard, PermissionGuard)
export class SemesterTransitionsController {
  constructor(private readonly lifecycle: AcademicLifecycleService) {}

  @Post('promote')
  @RequirePermissions('semester-transitions.create')
  promote(
    @CurrentInstituteId()
    instituteId: string,
    @CurrentUser()
    user: AuthenticatedUser,
    @Body()
    dto: PromoteSemesterDto,
  ) {
    return this.lifecycle.promoteSemester(
      instituteId,
      dto.batchId,
      dto.fromSemId,
      dto.toSemId,
      dto.academicYear,
      user.id,
      dto.notes,
    );
  }
}

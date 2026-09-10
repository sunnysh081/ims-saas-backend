import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import type { AuthenticatedUser } from '../../authorization/types/authorization.type';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import {
  ListSemesterHistoryQueryDto,
  SealSemesterHistoryDto,
} from './dto/semester-history.dto';
import { SemesterHistoryService } from './semester-history.service';

@Controller('institute/semester-history')
@UseGuards(InstituteGuard, PermissionGuard)
export class SemesterHistoryController {
  constructor(
    private readonly semesterHistoryService: SemesterHistoryService,
  ) {}

  @Get()
  @RequirePermissions('semester-history.read')
  findAll(
    @CurrentInstituteId()
    instituteId: string,
    @Query()
    query: ListSemesterHistoryQueryDto,
  ) {
    return this.semesterHistoryService.findAll(instituteId, query);
  }

  @Post('seal')
  @RequirePermissions('semester-history.create')
  seal(
    @CurrentInstituteId()
    instituteId: string,
    @CurrentUser()
    user: AuthenticatedUser,
    @Body()
    dto: SealSemesterHistoryDto,
  ) {
    return this.semesterHistoryService.seal(instituteId, dto, user.id);
  }
}

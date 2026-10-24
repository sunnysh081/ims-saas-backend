import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { AuthorizationService } from '../../authorization/authotizations.service';
import type { AuthenticatedUser } from '../../authorization/types/authorization.type';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { CreateMergeDto, ListMergeableQueryDto } from './dto/attendance.dto';
import { SubmitMergeDto } from './dto/merge.dto';
import { MergeService } from './merge.service';

@Controller('institute/attendance-merges')
@UseGuards(InstituteGuard, PermissionGuard)
export class MergeController {
  constructor(
    private readonly mergeService: MergeService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  private async scope(user: AuthenticatedUser, instituteId: string) {
    return {
      userId: user.id,
      canManage: await this.authorizationService.hasPermissions(user.id, instituteId, ['attendance.manage']),
    };
  }

  @Get('mergeable')
  @RequirePermissions('attendance.mark')
  async mergeable(
    @CurrentInstituteId() instituteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMergeableQueryDto,
  ) {
    return this.mergeService.mergeable(instituteId, query, await this.scope(user, instituteId));
  }

  @Get()
  @RequirePermissions('attendance.read')
  async history(@CurrentInstituteId() instituteId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.mergeService.history(instituteId, await this.scope(user, instituteId));
  }

  @Post()
  @RequirePermissions('attendance.mark')
  async create(@CurrentInstituteId() instituteId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMergeDto) {
    return this.mergeService.create(instituteId, dto, await this.scope(user, instituteId));
  }

  @Get(':id')
  @RequirePermissions('attendance.read')
  async detail(@CurrentInstituteId() instituteId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.mergeService.detail(instituteId, id, await this.scope(user, instituteId));
  }

  @Post(':id/submit')
  @RequirePermissions('attendance.mark')
  async submit(
    @CurrentInstituteId() instituteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SubmitMergeDto,
  ) {
    return this.mergeService.submit(instituteId, id, dto, await this.scope(user, instituteId));
  }

  @Post(':id/unmerge')
  @RequirePermissions('attendance.mark')
  async unmerge(@CurrentInstituteId() instituteId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.mergeService.unmerge(instituteId, id, await this.scope(user, instituteId));
  }
}

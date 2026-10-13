import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import type { AuthenticatedUser } from '../../authorization/types/authorization.type';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { SubmitQuizDto } from './dto/portal-quiz.dto';
import { PortalQuizzesService } from './portal-quizzes.service';

@Controller('portal/quizzes')
@UseGuards(InstituteGuard, PermissionGuard)
export class PortalQuizzesController {
  constructor(private readonly portalQuizzesService: PortalQuizzesService) {}

  @Get()
  @RequirePermissions('portal.quizzes.read')
  list(@CurrentInstituteId() instituteId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.portalQuizzesService.list(instituteId, user.id);
  }

  @Get(':id')
  @RequirePermissions('portal.quizzes.read')
  detail(@CurrentInstituteId() instituteId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.portalQuizzesService.detail(instituteId, user.id, id);
  }

  @Get(':id/result')
  @RequirePermissions('portal.quizzes.read')
  result(@CurrentInstituteId() instituteId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.portalQuizzesService.result(instituteId, user.id, id);
  }

  @Get(':id/attempt')
  @RequirePermissions('portal.quizzes.attempt')
  currentAttempt(
    @CurrentInstituteId() instituteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.portalQuizzesService.currentAttempt(instituteId, user.id, id);
  }

  @Post(':id/start')
  @RequirePermissions('portal.quizzes.attempt')
  start(@CurrentInstituteId() instituteId: string, @CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.portalQuizzesService.start(instituteId, user.id, id);
  }

  @Post(':id/submit')
  @RequirePermissions('portal.quizzes.attempt')
  submit(
    @CurrentInstituteId() instituteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SubmitQuizDto,
  ) {
    return this.portalQuizzesService.submit(instituteId, user.id, id, dto);
  }
}

import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import {
  CreateEnrollmentDto,
  ListEnrollmentsQueryDto,
} from './dto/enrollment.dto';
import { EnrollmentsService } from './enrollments.service';

@Controller('institute/enrollments')
@UseGuards(InstituteGuard, PermissionGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get()
  @RequirePermissions('enrollments.read')
  findAll(
    @CurrentInstituteId()
    instituteId: string,
    @Query()
    query: ListEnrollmentsQueryDto,
  ) {
    return this.enrollmentsService.findAll(instituteId, query);
  }

  @Post()
  @RequirePermissions('enrollments.create')
  create(
    @CurrentInstituteId()
    instituteId: string,
    @Body()
    dto: CreateEnrollmentDto,
  ) {
    return this.enrollmentsService.create(instituteId, dto);
  }
}

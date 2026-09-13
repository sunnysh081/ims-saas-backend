import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { SummaryService } from './summary.service';

class StudentSummaryQueryDto {
  @IsUUID('4')
  semesterId!: string;
}

class DefaultersQueryDto {
  @IsOptional()
  @IsUUID('4')
  semesterId?: string;

  @IsOptional()
  @IsUUID('4')
  sectionId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  threshold?: number;
}

@Controller('institute/attendance/summary')
@UseGuards(InstituteGuard, PermissionGuard)
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get('student/:studentId')
  @RequirePermissions('attendance.read')
  studentSummary(@CurrentInstituteId() instituteId: string, @Param('studentId') studentId: string, @Query() query: StudentSummaryQueryDto) {
    return this.summaryService.getStudentSemesterSummary(instituteId, studentId, query.semesterId);
  }

  @Get('offering/:offeringId')
  @RequirePermissions('attendance.read')
  offeringSummary(@CurrentInstituteId() instituteId: string, @Param('offeringId') offeringId: string) {
    return this.summaryService.getOfferingSummary(instituteId, offeringId);
  }

  @Get('defaulters')
  @RequirePermissions('attendance.read')
  defaulters(@CurrentInstituteId() instituteId: string, @Query() query: DefaultersQueryDto) {
    return this.summaryService.getDefaulters(instituteId, {
      semesterId: query.semesterId,
      sectionId: query.sectionId,
      threshold: query.threshold ?? 75,
    });
  }
}

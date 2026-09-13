import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsUUID } from 'class-validator';

import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { CreateProgramPlansDto, ListProgramPlansQueryDto } from './dto/program-plan.dto';
import { ProgramPlanService } from './program-plan.service';

class SubjectsForPlanQueryDto {
  @IsUUID('4')
  programId!: string;

  @IsUUID('4')
  semesterId!: string;

  @IsOptional()
  @IsUUID('4')
  branchId?: string;
}

@Controller('institute/program-plans')
@UseGuards(InstituteGuard, PermissionGuard)
export class ProgramPlanController {
  constructor(private readonly programPlanService: ProgramPlanService) {}

  @Get('subjects')
  @RequirePermissions('program-plans.read')
  subjectsForPlan(@CurrentInstituteId() instituteId: string, @Query() query: SubjectsForPlanQueryDto) {
    return this.programPlanService.subjectsForPlan(instituteId, query);
  }

  @Get()
  @RequirePermissions('program-plans.read')
  findAll(@CurrentInstituteId() instituteId: string, @Query() query: ListProgramPlansQueryDto) {
    return this.programPlanService.findAll(instituteId, query);
  }

  @Post()
  @RequirePermissions('program-plans.create')
  create(@CurrentInstituteId() instituteId: string, @Body() dto: CreateProgramPlansDto) {
    return this.programPlanService.create(instituteId, dto);
  }

  @Delete(':id')
  @RequirePermissions('program-plans.delete')
  remove(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.programPlanService.remove(instituteId, id);
  }
}

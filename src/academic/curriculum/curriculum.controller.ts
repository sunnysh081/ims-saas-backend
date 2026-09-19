import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { CurriculumService } from './curriculum.service';
import { CreateCurriculumPlanDto, ListCurriculumPlansQueryDto } from './dto/curriculum-plan.dto';

@Controller('institute/curriculum')
@UseGuards(InstituteGuard, PermissionGuard)
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService) {}

  @Get()
  @RequirePermissions('curriculum.read')
  findAll(
    @CurrentInstituteId()
    instituteId: string,
    @Query()
    query: ListCurriculumPlansQueryDto,
  ) {
    return this.curriculumService.findAll(instituteId, query);
  }

  @Post()
  @RequirePermissions('curriculum.create')
  create(
    @CurrentInstituteId()
    instituteId: string,
    @Body()
    dto: CreateCurriculumPlanDto,
  ) {
    return this.curriculumService.create(instituteId, dto);
  }

  @Delete(':id')
  @RequirePermissions('curriculum.create')
  remove(
    @CurrentInstituteId()
    instituteId: string,
    @Param('id')
    id: string,
  ) {
    return this.curriculumService.remove(instituteId, id);
  }
}

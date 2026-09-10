import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { CreateSemestersDto, ListSemestersQueryDto } from './dto/semester.dto';
import { SemestersService } from './semesters.service';

@Controller('institute/semesters')
@UseGuards(InstituteGuard, PermissionGuard)
export class SemestersController {
  constructor(private readonly semestersService: SemestersService) {}

  @Get()
  @RequirePermissions('semesters.read')
  findAll(
    @CurrentInstituteId()
    instituteId: string,
    @Query()
    query: ListSemestersQueryDto,
  ) {
    return this.semestersService.findAll(instituteId, query);
  }

  @Post()
  @RequirePermissions('semesters.create')
  create(
    @CurrentInstituteId()
    instituteId: string,
    @Body()
    dto: CreateSemestersDto,
  ) {
    return this.semestersService.bulkCreate(instituteId, dto);
  }
}

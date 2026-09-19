import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { SyllabiService } from './syllabi.service';
import { CreateSyllabusDto, ListSyllabiQueryDto, UpdateSyllabusDto } from './dto/syllabus.dto';

@Controller('institute/syllabi')
@UseGuards(InstituteGuard, PermissionGuard)
export class SyllabiController {
  constructor(private readonly syllabiService: SyllabiService) {}

  @Get()
  @RequirePermissions('syllabi.read')
  findAll(
    @CurrentInstituteId()
    instituteId: string,
    @Query()
    query: ListSyllabiQueryDto,
  ) {
    return this.syllabiService.findAll(instituteId, query);
  }

  @Get(':id')
  @RequirePermissions('syllabi.read')
  findOne(
    @CurrentInstituteId()
    instituteId: string,
    @Param('id')
    id: string,
  ) {
    return this.syllabiService.findOne(instituteId, id);
  }

  @Post()
  @RequirePermissions('syllabi.create')
  create(
    @CurrentInstituteId()
    instituteId: string,
    @Body()
    dto: CreateSyllabusDto,
  ) {
    return this.syllabiService.create(instituteId, dto);
  }

  @Patch(':id')
  @RequirePermissions('syllabi.update')
  update(
    @CurrentInstituteId()
    instituteId: string,
    @Param('id')
    id: string,
    @Body()
    dto: UpdateSyllabusDto,
  ) {
    return this.syllabiService.update(instituteId, id, dto);
  }
}

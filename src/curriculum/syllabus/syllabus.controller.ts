import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { CreateSyllabusDto, ListSyllabiQueryDto, UpdateSyllabusDto } from './dto/syllabus.dto';
import { SyllabusService } from './syllabus.service';

@Controller('institute/syllabi')
@UseGuards(InstituteGuard, PermissionGuard)
export class SyllabusController {
  constructor(private readonly syllabusService: SyllabusService) {}

  @Get()
  @RequirePermissions('syllabus.read')
  findAll(@CurrentInstituteId() instituteId: string, @Query() query: ListSyllabiQueryDto) {
    return this.syllabusService.findAll(instituteId, query);
  }

  @Get(':id')
  @RequirePermissions('syllabus.read')
  findOne(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.syllabusService.findOne(instituteId, id);
  }

  @Post()
  @RequirePermissions('syllabus.create')
  create(@CurrentInstituteId() instituteId: string, @Body() dto: CreateSyllabusDto) {
    return this.syllabusService.create(instituteId, dto);
  }

  @Patch(':id')
  @RequirePermissions('syllabus.update')
  update(@CurrentInstituteId() instituteId: string, @Param('id') id: string, @Body() dto: UpdateSyllabusDto) {
    return this.syllabusService.update(instituteId, id, dto);
  }

  @Post(':id/activate')
  @RequirePermissions('syllabus.manage')
  activate(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.syllabusService.activate(instituteId, id);
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { SubjectService } from './subject.service';
import { CreateSubjectDto, ListSubjectsQueryDto, UpdateSubjectDto } from './dto/subject.dto';

@Controller('institute/subjects')
@UseGuards(InstituteGuard, PermissionGuard)
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Get()
  @RequirePermissions('subjects.read')
  findAll(@CurrentInstituteId() instituteId: string, @Query() query: ListSubjectsQueryDto) {
    return this.subjectService.findAll(instituteId, query);
  }

  @Get(':id')
  @RequirePermissions('subjects.read')
  findOne(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.subjectService.findWithSyllabus(instituteId, id);
  }

  @Post()
  @RequirePermissions('subjects.create')
  create(@CurrentInstituteId() instituteId: string, @Body() dto: CreateSubjectDto) {
    return this.subjectService.create(instituteId, dto);
  }

  @Patch(':id')
  @RequirePermissions('subjects.update')
  update(@CurrentInstituteId() instituteId: string, @Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjectService.update(instituteId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('subjects.delete')
  remove(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.subjectService.remove(instituteId, id);
  }
}

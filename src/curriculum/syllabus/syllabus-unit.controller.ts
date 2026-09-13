import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { CreateSyllabusUnitDto, UpdateSyllabusUnitDto } from './dto/syllabus-unit.dto';
import { SyllabusUnitService } from './syllabus-unit.service';

@Controller()
@UseGuards(InstituteGuard, PermissionGuard)
export class SyllabusUnitController {
  constructor(private readonly syllabusUnitService: SyllabusUnitService) {}

  @Post('institute/syllabi/:syllabusId/units')
  @RequirePermissions('syllabus.update')
  create(@CurrentInstituteId() instituteId: string, @Param('syllabusId') syllabusId: string, @Body() dto: CreateSyllabusUnitDto) {
    return this.syllabusUnitService.create(instituteId, syllabusId, dto);
  }

  @Patch('institute/syllabus-units/:id')
  @RequirePermissions('syllabus.update')
  update(@CurrentInstituteId() instituteId: string, @Param('id') id: string, @Body() dto: UpdateSyllabusUnitDto) {
    return this.syllabusUnitService.update(instituteId, id, dto);
  }

  @Delete('institute/syllabus-units/:id')
  @RequirePermissions('syllabus.update')
  remove(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.syllabusUnitService.remove(instituteId, id);
  }
}

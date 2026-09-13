import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { RequirePermissions } from '../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../common/decorators/current-institute.decorator';
import { InstituteGuard } from '../common/guards/institute.guard';
import { PermissionGuard } from '../common/guards/permissions.guards';
import { CreateTimetableSlotDto, GenerateSessionsDto, ListTimetableQueryDto, UpdateTimetableSlotDto } from './dto/timetable.dto';
import { TimetableService } from './timetable.service';

@Controller('institute/timetable')
@UseGuards(InstituteGuard, PermissionGuard)
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Get()
  @RequirePermissions('timetable.read')
  findAll(@CurrentInstituteId() instituteId: string, @Query() query: ListTimetableQueryDto) {
    return this.timetableService.findAll(instituteId, query);
  }

  @Post('generate-sessions')
  @RequirePermissions('timetable.manage')
  generateSessions(@CurrentInstituteId() instituteId: string, @Body() dto: GenerateSessionsDto) {
    return this.timetableService.generateSessions(instituteId, dto);
  }

  @Post()
  @RequirePermissions('timetable.create')
  create(@CurrentInstituteId() instituteId: string, @Body() dto: CreateTimetableSlotDto) {
    return this.timetableService.create(instituteId, dto);
  }

  @Patch(':id')
  @RequirePermissions('timetable.update')
  update(@CurrentInstituteId() instituteId: string, @Param('id') id: string, @Body() dto: UpdateTimetableSlotDto) {
    return this.timetableService.update(instituteId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('timetable.update')
  remove(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.timetableService.remove(instituteId, id);
  }
}

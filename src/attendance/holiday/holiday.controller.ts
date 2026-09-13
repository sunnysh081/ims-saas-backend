import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { CreateHolidaysDto, ListHolidaysQueryDto } from './dto/holiday.dto';
import { HolidayService } from './holiday.service';

@Controller('institute/holidays')
@UseGuards(InstituteGuard, PermissionGuard)
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) {}

  @Get()
  @RequirePermissions('holidays.read')
  findAll(@CurrentInstituteId() instituteId: string, @Query() query: ListHolidaysQueryDto) {
    return this.holidayService.findAll(instituteId, query);
  }

  @Post()
  @RequirePermissions('holidays.create')
  create(@CurrentInstituteId() instituteId: string, @Body() dto: CreateHolidaysDto) {
    return this.holidayService.create(instituteId, dto);
  }

  @Delete(':id')
  @RequirePermissions('holidays.create')
  remove(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.holidayService.remove(instituteId, id);
  }
}

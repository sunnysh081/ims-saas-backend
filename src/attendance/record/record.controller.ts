import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';

import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import type { AuthenticatedUser } from '../../authorization/types/authorization.type';
import { CorrectRecordDto, ListRecordsQueryDto } from './dto/record.dto';
import { RecordService } from './record.service';

@Controller('institute/attendance/records')
@UseGuards(InstituteGuard, PermissionGuard)
export class RecordController {
  constructor(private readonly recordService: RecordService) {}

  @Get()
  @RequirePermissions('attendance.read')
  findAll(@CurrentInstituteId() instituteId: string, @Query() query: ListRecordsQueryDto) {
    return this.recordService.findAll(instituteId, query);
  }

  @Patch(':id')
  @RequirePermissions('attendance.manage')
  correct(
    @CurrentInstituteId() instituteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CorrectRecordDto,
  ) {
    return this.recordService.correctRecord(instituteId, id, dto, user.id);
  }
}

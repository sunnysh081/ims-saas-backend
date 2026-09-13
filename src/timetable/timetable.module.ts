import { Module } from '@nestjs/common';

import { InstituteGuard } from '../common/guards/institute.guard';
import { PermissionGuard } from '../common/guards/permissions.guards';
import { TimetableController } from './timetable.controller';
import { TimetableService } from './timetable.service';

@Module({
  controllers: [TimetableController],
  providers: [TimetableService, InstituteGuard, PermissionGuard],
  exports: [TimetableService],
})
export class TimetableModule {}

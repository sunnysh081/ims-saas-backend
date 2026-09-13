import { Module } from '@nestjs/common';

import { InstituteGuard } from '../common/guards/institute.guard';
import { PermissionGuard } from '../common/guards/permissions.guards';
import { HolidayController } from './holiday/holiday.controller';
import { HolidayService } from './holiday/holiday.service';
import { LeaveController } from './leave/leave.controller';
import { LeaveService } from './leave/leave.service';
import { RecordController } from './record/record.controller';
import { RecordService } from './record/record.service';
import { SessionController } from './session/session.controller';
import { SessionService } from './session/session.service';
import { SummaryController } from './summary/summary.controller';
import { SummaryService } from './summary/summary.service';

@Module({
  controllers: [SessionController, RecordController, SummaryController, LeaveController, HolidayController],
  providers: [SessionService, RecordService, SummaryService, LeaveService, HolidayService, InstituteGuard, PermissionGuard],
})
export class AttendanceModule {}

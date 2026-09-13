import { Module } from '@nestjs/common';

import { ElectiveChoiceController } from './elective-choice.controller';
import { ElectiveChoiceService } from './elective-choice.service';
import { ElectiveGroupController } from './elective-group.controller';
import { ElectiveGroupService } from './elective-group.service';

@Module({
  controllers: [ElectiveGroupController, ElectiveChoiceController],
  providers: [ElectiveGroupService, ElectiveChoiceService],
  exports: [ElectiveGroupService, ElectiveChoiceService],
})
export class ElectiveModule {}

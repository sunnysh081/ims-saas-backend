import { Module } from '@nestjs/common';

import { ProgramPlanController } from './program-plan.controller';
import { ProgramPlanService } from './program-plan.service';

@Module({
  controllers: [ProgramPlanController],
  providers: [ProgramPlanService],
  exports: [ProgramPlanService],
})
export class ProgramPlanModule {}

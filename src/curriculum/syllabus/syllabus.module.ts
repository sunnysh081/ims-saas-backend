import { Module } from '@nestjs/common';

import { SyllabusUnitController } from './syllabus-unit.controller';
import { SyllabusUnitService } from './syllabus-unit.service';
import { SyllabusController } from './syllabus.controller';
import { SyllabusService } from './syllabus.service';

@Module({
  controllers: [SyllabusController, SyllabusUnitController],
  providers: [SyllabusService, SyllabusUnitService],
  exports: [SyllabusService],
})
export class SyllabusModule {}

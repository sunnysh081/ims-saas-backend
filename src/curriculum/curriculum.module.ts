import { Module } from '@nestjs/common';

import { InstituteGuard } from '../common/guards/institute.guard';
import { PermissionGuard } from '../common/guards/permissions.guards';
import { ElectiveModule } from './elective/elective.module';
import { OfferingModule } from './offering/offering.module';
import { ProgramPlanModule } from './program-plan/program-plan.module';
import { SubjectModule } from './subject/subject.module';
import { SyllabusModule } from './syllabus/syllabus.module';

@Module({
  imports: [SubjectModule, SyllabusModule, ProgramPlanModule, ElectiveModule, OfferingModule],
  providers: [InstituteGuard, PermissionGuard],
})
export class CurriculumModule {}

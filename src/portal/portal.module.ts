import { Module } from '@nestjs/common';

import { InstituteGuard } from '../common/guards/institute.guard';
import { PermissionGuard } from '../common/guards/permissions.guards';
import { AttendanceCoreService } from '../academic/attendance/attendance-core.service';
import { PortalAttendanceController } from './attendance/portal-attendance.controller';
import { PortalActivitiesController } from './activities/portal-activities.controller';
import { PortalActivitiesService } from './activities/portal-activities.service';
import { PortalAssignmentsController } from './assignments/portal-assignments.controller';
import { PortalAssignmentsService } from './assignments/portal-assignments.service';
import { PortalStudentScopeService } from './portal-student-scope.service';
import { PortalProfileController } from './profile/portal-profile.controller';
import { PortalProfileService } from './profile/portal-profile.service';
import { PortalQuizzesController } from './quizzes/portal-quizzes.controller';
import { PortalQuizzesService } from './quizzes/portal-quizzes.service';
import { PortalResourcesController } from './resources/portal-resources.controller';
import { PortalResourcesService } from './resources/portal-resources.service';

@Module({
  controllers: [PortalResourcesController, PortalProfileController, PortalQuizzesController, PortalAssignmentsController, PortalActivitiesController, PortalAttendanceController],
  providers: [PortalResourcesService, PortalProfileService, PortalQuizzesService, PortalAssignmentsService, PortalActivitiesService, PortalStudentScopeService, AttendanceCoreService, InstituteGuard, PermissionGuard],
})
export class PortalModule {}

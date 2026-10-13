import { Module } from '@nestjs/common';

import { InstituteGuard } from '../common/guards/institute.guard';
import { PermissionGuard } from '../common/guards/permissions.guards';
import { AcademicLifecycleService } from './academic-lifecycle.service';
import { BatchesController } from './batches/batches.controller';
import { BatchesService } from './batches/batches.service';
import { BranchesController } from './branches/branches.controller';
import { BranchesService } from './branches/branches.service';
import { CurriculumController } from './curriculum/curriculum.controller';
import { CurriculumService } from './curriculum/curriculum.service';
import { EnrollmentsController } from './enrollments/enrollments.controller';
import { EnrollmentsService } from './enrollments/enrollments.service';
import { QuizAttemptsService } from './quizzes/quiz-attempts.service';
import { QuizzesController } from './quizzes/quizzes.controller';
import { QuizzesService } from './quizzes/quizzes.service';
import { ResourcesController } from './resources/resources.controller';
import { ResourcesService } from './resources/resources.service';
import { SectionsController } from './sections/sections.controller';
import { SectionsService } from './sections/sections.service';
import { SemesterHistoryController } from './semester-history/semester-history.controller';
import { SemesterHistoryService } from './semester-history/semester-history.service';
import { SemesterTransitionsController } from './semester-transitions/semester-transitions.controller';
import { SemestersController } from './semesters/semesters.controller';
import { SemestersService } from './semesters/semesters.service';
import { StudentsController } from './students/students.controller';
import { StudentsService } from './students/students.service';
import { SubjectsController } from './subjects/subjects.controller';
import { SubjectsService } from './subjects/subjects.service';
import { SyllabiController } from './syllabi/syllabi.controller';
import { SyllabiService } from './syllabi/syllabi.service';
import { UsersService } from '../platform/users.service';

@Module({
  controllers: [
    BranchesController,
    BatchesController,
    SemestersController,
    SectionsController,
    StudentsController,
    SubjectsController,
    SyllabiController,
    CurriculumController,
    ResourcesController,
    QuizzesController,
    EnrollmentsController,
    SemesterTransitionsController,
    SemesterHistoryController,
  ],
  providers: [
    AcademicLifecycleService,
    BranchesService,
    BatchesService,
    SemestersService,
    SectionsService,
    StudentsService,
    SubjectsService,
    SyllabiService,
    CurriculumService,
    ResourcesService,
    QuizzesService,
    QuizAttemptsService,
    EnrollmentsService,
    SemesterHistoryService,
    UsersService,
    InstituteGuard,
    PermissionGuard,
  ],
})
export class AcademicModule {}

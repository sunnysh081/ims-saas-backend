import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../../authorization/types/authorization.type';
import { AcademicLifecycleService } from '../academic-lifecycle.service';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import {
  ChangeBranchDto,
  ChangeSectionDto,
  CreateStudentDto,
  ListStudentsQueryDto,
  UpdateStudentDto,
} from './dto/student.dto';
import { StudentsService } from './students.service';

@Controller('institute/students')
@UseGuards(InstituteGuard, PermissionGuard)
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly lifecycle: AcademicLifecycleService,
  ) {}

  @Get()
  @RequirePermissions('students.read')
  findAll(
    @CurrentInstituteId()
    instituteId: string,
    @Query()
    query: ListStudentsQueryDto,
  ) {
    return this.studentsService.findAll(instituteId, query);
  }

  @Post()
  @RequirePermissions('students.create')
  create(
    @CurrentInstituteId()
    instituteId: string,
    @Body()
    dto: CreateStudentDto,
  ) {
    return this.studentsService.create(instituteId, dto);
  }

  @Get(':id/semester-history')
  @RequirePermissions('students.read')
  semesterHistory(
    @CurrentInstituteId()
    instituteId: string,
    @Param('id')
    id: string,
  ) {
    return this.studentsService.semesterHistory(instituteId, id);
  }

  @Get(':id/section-change-log')
  @RequirePermissions('students.read')
  sectionChangeLog(
    @CurrentInstituteId()
    instituteId: string,
    @Param('id')
    id: string,
  ) {
    return this.studentsService.sectionChangeLog(instituteId, id);
  }

  @Get(':id/branch-change-log')
  @RequirePermissions('students.read')
  branchChangeLog(
    @CurrentInstituteId()
    instituteId: string,
    @Param('id')
    id: string,
  ) {
    return this.studentsService.branchChangeLog(instituteId, id);
  }

  @Get(':id/audit')
  @RequirePermissions('students.read')
  audit(
    @CurrentInstituteId()
    instituteId: string,
    @Param('id')
    id: string,
  ) {
    return this.studentsService.auditLog(instituteId, id);
  }

  @Get(':id/current-enrollment')
  @RequirePermissions('students.read')
  currentEnrollment(
    @CurrentInstituteId()
    instituteId: string,
    @Param('id')
    id: string,
  ) {
    return this.studentsService.currentEnrollment(instituteId, id);
  }

  @Post(':id/change-section')
  @RequirePermissions('students.update')
  changeSection(
    @CurrentInstituteId()
    instituteId: string,
    @CurrentUser()
    user: AuthenticatedUser,
    @Param('id')
    id: string,
    @Body()
    dto: ChangeSectionDto,
  ) {
    return this.lifecycle.changeSection(
      instituteId,
      id,
      dto.toSectionId,
      dto.reason,
      user.id,
    );
  }

  @Post(':id/change-branch')
  @RequirePermissions('students.update')
  changeBranch(
    @CurrentInstituteId()
    instituteId: string,
    @CurrentUser()
    user: AuthenticatedUser,
    @Param('id')
    id: string,
    @Body()
    dto: ChangeBranchDto,
  ) {
    return this.lifecycle.changeBranch(
      instituteId,
      id,
      dto.toBranchId,
      dto.toSectionId,
      dto.atSemesterId,
      dto.reason,
      user.id,
    );
  }

  @Get(':id')
  @RequirePermissions('students.read')
  findOne(
    @CurrentInstituteId()
    instituteId: string,
    @Param('id')
    id: string,
  ) {
    return this.studentsService.findOne(instituteId, id);
  }

  @Patch(':id')
  @RequirePermissions('students.update')
  update(
    @CurrentInstituteId()
    instituteId: string,
    @Param('id')
    id: string,
    @Body()
    dto: UpdateStudentDto,
  ) {
    return this.studentsService.update(instituteId, id, dto);
  }
}

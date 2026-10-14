import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto, GradeSubmissionDto, ListAssignmentsQueryDto, UpdateAssignmentDto } from './dto/assignment.dto';

@Controller('institute/assignments')
@UseGuards(InstituteGuard, PermissionGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  @RequirePermissions('assignments.read')
  findAll(@CurrentInstituteId() instituteId: string, @Query() query: ListAssignmentsQueryDto) {
    return this.assignmentsService.findAll(instituteId, query);
  }

  @Get(':id')
  @RequirePermissions('assignments.read')
  findOne(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.assignmentsService.findOne(instituteId, id);
  }

  @Post()
  @RequirePermissions('assignments.create')
  create(@CurrentInstituteId() instituteId: string, @Body() dto: CreateAssignmentDto) {
    return this.assignmentsService.create(instituteId, dto);
  }

  @Patch(':id')
  @RequirePermissions('assignments.update')
  update(@CurrentInstituteId() instituteId: string, @Param('id') id: string, @Body() dto: UpdateAssignmentDto) {
    return this.assignmentsService.update(instituteId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('assignments.delete')
  remove(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.assignmentsService.remove(instituteId, id);
  }

  @Get(':id/submissions')
  @RequirePermissions('assignments.read')
  roster(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.assignmentsService.roster(instituteId, id);
  }

  @Get(':id/submissions/:studentId')
  @RequirePermissions('assignments.read')
  submission(@CurrentInstituteId() instituteId: string, @Param('id') id: string, @Param('studentId') studentId: string) {
    return this.assignmentsService.submissionDetail(instituteId, id, studentId);
  }

  @Patch(':id/submissions/:studentId/grade')
  @RequirePermissions('assignments.update')
  grade(
    @CurrentInstituteId() instituteId: string,
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Body() dto: GradeSubmissionDto,
  ) {
    return this.assignmentsService.grade(instituteId, id, studentId, dto);
  }
}

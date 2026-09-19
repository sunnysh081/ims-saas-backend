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

import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { SubjectsService } from './subjects.service';
import {
  CreateSubjectDto,
  ListSubjectsQueryDto,
  UpdateSubjectDto,
} from './dto/subject.dto';

@Controller('institute/subjects')
@UseGuards(InstituteGuard, PermissionGuard)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  @RequirePermissions('subjects.read')
  findAll(
    @CurrentInstituteId()
    instituteId: string,
    @Query()
    query: ListSubjectsQueryDto,
  ) {
    return this.subjectsService.findAll(instituteId, query);
  }

  @Get(':id')
  @RequirePermissions('subjects.read')
  findOne(
    @CurrentInstituteId()
    instituteId: string,
    @Param('id')
    id: string,
  ) {
    return this.subjectsService.findOne(instituteId, id);
  }

  @Post()
  @RequirePermissions('subjects.create')
  create(
    @CurrentInstituteId()
    instituteId: string,
    @Body()
    dto: CreateSubjectDto,
  ) {
    return this.subjectsService.create(instituteId, dto);
  }

  @Patch(':id')
  @RequirePermissions('subjects.update')
  update(
    @CurrentInstituteId()
    instituteId: string,
    @Param('id')
    id: string,
    @Body()
    dto: UpdateSubjectDto,
  ) {
    return this.subjectsService.update(instituteId, id, dto);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { RequirePermissions } from '../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../common/decorators/current-institute.decorator';
import { InstituteGuard } from '../common/guards/institute.guard';
import { PermissionGuard } from '../common/guards/permissions.guards';
import { CreateProgramDto, UpdateProgramDto } from './dto/program.dto';
import { ProgramsService } from './programs.service';

@Controller('institute/programs')
@UseGuards(InstituteGuard, PermissionGuard)
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get()
  @RequirePermissions('programs.read')
  findAll(
    @CurrentInstituteId()
    instituteId: string,
  ) {
    return this.programsService.findAll(instituteId);
  }

  @Get('staff')
  staff(
    @CurrentInstituteId()
    instituteId: string,
  ) {
    return this.programsService.listStaff(instituteId);
  }

  @Post()
  @RequirePermissions('programs.create')
  create(
    @CurrentInstituteId()
    instituteId: string,

    @Body()
    dto: CreateProgramDto,
  ) {
    return this.programsService.create(instituteId, dto);
  }

  @Get(':id')
  @RequirePermissions('programs.read')
  findOne(
    @CurrentInstituteId()
    instituteId: string,

    @Param('id')
    id: string,
  ) {
    return this.programsService.findOne(instituteId, id);
  }

  @Patch(':id')
  @RequirePermissions('programs.update')
  update(
    @CurrentInstituteId()
    instituteId: string,

    @Param('id')
    id: string,

    @Body()
    dto: UpdateProgramDto,
  ) {
    return this.programsService.update(instituteId, id, dto);
  }
}

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
import {
  CreateSectionDto,
  ListSectionsQueryDto,
  UpdateSectionDto,
} from './dto/section.dto';
import { SectionsService } from './sections.service';

@Controller('institute/sections')
@UseGuards(InstituteGuard, PermissionGuard)
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Get()
  @RequirePermissions('sections.read')
  findAll(
    @CurrentInstituteId()
    instituteId: string,
    @Query()
    query: ListSectionsQueryDto,
  ) {
    return this.sectionsService.findAll(instituteId, query);
  }

  @Post()
  @RequirePermissions('sections.create')
  create(
    @CurrentInstituteId()
    instituteId: string,
    @Body()
    dto: CreateSectionDto,
  ) {
    return this.sectionsService.create(instituteId, dto);
  }

  @Patch(':id')
  @RequirePermissions('sections.update')
  update(
    @CurrentInstituteId()
    instituteId: string,
    @Param('id')
    id: string,
    @Body()
    dto: UpdateSectionDto,
  ) {
    return this.sectionsService.update(instituteId, id, dto);
  }
}

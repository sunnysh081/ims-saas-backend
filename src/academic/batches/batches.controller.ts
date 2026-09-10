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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import type { AuthenticatedUser } from '../../authorization/types/authorization.type';
import { BatchesService } from './batches.service';
import {
  CreateBatchDto,
  ListBatchesQueryDto,
  SplitBranchesDto,
  UpdateBatchDto,
} from './dto/batch.dto';

@Controller('institute/batches')
@UseGuards(InstituteGuard, PermissionGuard)
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Get()
  @RequirePermissions('batches.read')
  findAll(
    @CurrentInstituteId()
    instituteId: string,
    @Query()
    query: ListBatchesQueryDto,
  ) {
    return this.batchesService.findAll(instituteId, query);
  }

  @Post()
  @RequirePermissions('batches.create')
  create(
    @CurrentInstituteId()
    instituteId: string,
    @Body()
    dto: CreateBatchDto,
  ) {
    return this.batchesService.create(instituteId, dto);
  }

  @Get(':id')
  @RequirePermissions('batches.read')
  findOne(
    @CurrentInstituteId()
    instituteId: string,
    @Param('id')
    id: string,
  ) {
    return this.batchesService.findOne(instituteId, id);
  }

  @Patch(':id')
  @RequirePermissions('batches.update')
  update(
    @CurrentInstituteId()
    instituteId: string,
    @Param('id')
    id: string,
    @Body()
    dto: UpdateBatchDto,
  ) {
    return this.batchesService.update(instituteId, id, dto);
  }

  @Post(':id/split-branches')
  @RequirePermissions('batches.manage')
  splitBranches(
    @CurrentInstituteId()
    instituteId: string,
    @CurrentUser()
    user: AuthenticatedUser,
    @Param('id')
    id: string,
    @Body()
    dto: SplitBranchesDto,
  ) {
    return this.batchesService.splitBranches(instituteId, id, dto, user.id);
  }
}

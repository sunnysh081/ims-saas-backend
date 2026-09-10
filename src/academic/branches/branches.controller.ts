import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@Controller('institute/branches')
@UseGuards(InstituteGuard, PermissionGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @RequirePermissions('branches.read')
  findAll(
    @CurrentInstituteId()
    instituteId: string,
  ) {
    return this.branchesService.findAll(instituteId);
  }

  @Post()
  @RequirePermissions('branches.create')
  create(
    @CurrentInstituteId()
    instituteId: string,
    @Body()
    dto: CreateBranchDto,
  ) {
    return this.branchesService.create(instituteId, dto);
  }

  @Patch(':id')
  @RequirePermissions('branches.update')
  update(
    @CurrentInstituteId()
    instituteId: string,
    @Param('id')
    id: string,
    @Body()
    dto: UpdateBranchDto,
  ) {
    return this.branchesService.update(instituteId, id, dto);
  }
}

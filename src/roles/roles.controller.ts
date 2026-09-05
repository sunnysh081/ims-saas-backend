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
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@Controller('institute/roles')
@UseGuards(InstituteGuard, PermissionGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles.read')
  findAll(
    @CurrentInstituteId()
    instituteId: string,
  ) {
    return this.rolesService.findAll(instituteId);
  }

  @Post()
  @RequirePermissions('roles.create')
  create(
    @CurrentInstituteId()
    instituteId: string,

    @Body()
    dto: CreateRoleDto,
  ) {
    return this.rolesService.create(instituteId, dto);
  }

  @Get(':id')
  @RequirePermissions('roles.read')
  findOne(
    @CurrentInstituteId()
    instituteId: string,

    @Param('id')
    roleId: string,
  ) {
    return this.rolesService.findOne(instituteId, roleId);
  }

  @Patch(':id')
  @RequirePermissions('roles.update')
  update(
    @CurrentInstituteId()
    instituteId: string,

    @Param('id')
    roleId: string,

    @Body()
    dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(instituteId, roleId, dto);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { AccessService } from './access.service';
import { CreatePlatformRoleDto, UpdatePlatformRoleDto } from './dto/role.dto';

@Controller('roles')
@UseGuards(SuperAdminGuard)
export class PlatformRolesController {
  constructor(private readonly accessService: AccessService) {}

  @Get()
  findAll() {
    return this.accessService.listRoles();
  }

  @Post()
  create(
    @Body()
    dto: CreatePlatformRoleDto,
  ) {
    return this.accessService.createRole(dto);
  }

  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.accessService.getRole(id);
  }

  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdatePlatformRoleDto,
  ) {
    return this.accessService.updateRole(id, dto);
  }
}

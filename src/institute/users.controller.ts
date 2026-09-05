import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../authorization/types/authorization.type';
import { RequirePermissions } from '../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../common/decorators/current-institute.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InstituteGuard } from '../common/guards/institute.guard';
import { PermissionGuard } from '../common/guards/permissions.guards';
import { UsersService } from '../platform/users.service';
import {
  CreateInstituteUserDto,
  UpdateInstituteUserDto,
} from './dto/user.dto';

@Controller('institute/users')
@UseGuards(InstituteGuard, PermissionGuard)
export class InstituteUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.read')
  findAll(
    @CurrentInstituteId()
    instituteId: string,
  ) {
    return this.usersService.listInstituteUsers(instituteId);
  }

  @Post()
  @RequirePermissions('users.create')
  create(
    @CurrentInstituteId()
    instituteId: string,

    @Body()
    dto: CreateInstituteUserDto,
  ) {
    return this.usersService.createInstituteUser(instituteId, dto);
  }

  @Get(':id')
  @RequirePermissions('users.read')
  findOne(
    @CurrentInstituteId()
    instituteId: string,

    @Param('id')
    id: string,
  ) {
    return this.usersService.getInstituteUser(instituteId, id);
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  update(
    @CurrentInstituteId()
    instituteId: string,

    @Param('id')
    id: string,

    @Body()
    dto: UpdateInstituteUserDto,

    @CurrentUser()
    actor: AuthenticatedUser,
  ) {
    return this.usersService.updateInstituteUser(
      instituteId,
      id,
      dto,
      actor.id,
    );
  }
}

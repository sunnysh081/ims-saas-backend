import { Module } from '@nestjs/common';

import { InstituteGuard } from '../common/guards/institute.guard';
import { PermissionGuard } from '../common/guards/permissions.guards';
import { AccessService } from '../platform/access.service';
import { UsersService } from '../platform/users.service';
import { RolesController } from '../roles/roles.controller';
import { RolesService } from '../roles/roles.service';
import { InstituteController } from './institute.controller';
import { InstituteUsersController } from './users.controller';
import { ProgramsController } from './programs.controller';
import { ProgramsService } from './programs.service';

@Module({
  controllers: [
    InstituteController,
    InstituteUsersController,
    RolesController,
    ProgramsController,
  ],
  providers: [
    UsersService,
    AccessService,
    RolesService,
    ProgramsService,
    InstituteGuard,
    PermissionGuard,
  ],
})
export class InstituteModule {}

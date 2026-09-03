import { Module } from '@nestjs/common';

import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { AccessService } from './access.service';
import { InstitutesController } from './institutes.controller';
import { PermissionsController } from './permissions.controller';
import { PlatformController } from './platform.controller';
import { PlatformRolesController } from './roles.controller';
import { PlatformService } from './platform.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [
    PlatformController,
    InstitutesController,
    UsersController,
    PlatformRolesController,
    PermissionsController,
  ],
  providers: [PlatformService, UsersService, AccessService, SuperAdminGuard],
})
export class PlatformModule {}

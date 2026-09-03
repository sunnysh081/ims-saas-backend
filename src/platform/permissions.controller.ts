import { Controller, Get, UseGuards } from '@nestjs/common';

import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { AccessService } from './access.service';

@Controller('permissions')
@UseGuards(SuperAdminGuard)
export class PermissionsController {
  constructor(private readonly accessService: AccessService) {}

  @Get()
  findAll() {
    return this.accessService.listPermissions();
  }
}

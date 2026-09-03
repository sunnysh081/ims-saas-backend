import { Controller, Get, UseGuards } from '@nestjs/common';

import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { PlatformService } from './platform.service';

@Controller('platform')
@UseGuards(SuperAdminGuard)
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('overview')
  overview() {
    return this.platformService.overview();
  }
}

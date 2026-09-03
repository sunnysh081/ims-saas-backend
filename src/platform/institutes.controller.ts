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
import { CreateInstituteDto } from './dto/create-institute.dto';
import { UpdateInstituteDto } from './dto/update-institute.dto';
import { PlatformService } from './platform.service';

@Controller('institutes')
@UseGuards(SuperAdminGuard)
export class InstitutesController {
  constructor(private readonly platformService: PlatformService) {}

  @Get()
  findAll() {
    return this.platformService.listInstitutes();
  }

  @Post()
  create(
    @Body()
    dto: CreateInstituteDto,
  ) {
    return this.platformService.createInstitute(dto);
  }

  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.platformService.getInstitute(id);
  }

  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateInstituteDto,
  ) {
    return this.platformService.updateInstitute(id, dto);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { ElectiveChoiceService } from './elective-choice.service';
import { CreateElectiveChoiceDto, ListElectiveChoicesQueryDto, UpdateElectiveChoiceDto } from './dto/elective-choice.dto';

@Controller('institute/elective-choices')
@UseGuards(InstituteGuard, PermissionGuard)
export class ElectiveChoiceController {
  constructor(private readonly electiveChoiceService: ElectiveChoiceService) {}

  @Get()
  @RequirePermissions('elective-choices.read')
  findAll(@CurrentInstituteId() instituteId: string, @Query() query: ListElectiveChoicesQueryDto) {
    return this.electiveChoiceService.findAll(instituteId, query);
  }

  @Post()
  @RequirePermissions('elective-choices.create')
  submit(@CurrentInstituteId() instituteId: string, @Body() dto: CreateElectiveChoiceDto) {
    return this.electiveChoiceService.submitChoice(instituteId, dto);
  }

  @Patch(':id')
  @RequirePermissions('elective-choices.create')
  update(@CurrentInstituteId() instituteId: string, @Param('id') id: string, @Body() dto: UpdateElectiveChoiceDto) {
    return this.electiveChoiceService.updateChoice(instituteId, id, dto);
  }

  @Post(':id/withdraw')
  @RequirePermissions('elective-choices.create')
  withdraw(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.electiveChoiceService.withdraw(instituteId, id);
  }
}

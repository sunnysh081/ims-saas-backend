import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { CurrentInstituteId } from '../../common/decorators/current-institute.decorator';
import { InstituteGuard } from '../../common/guards/institute.guard';
import { PermissionGuard } from '../../common/guards/permissions.guards';
import { CreateOfferingDto, GenerateOfferingsDto, ListOfferingsQueryDto, UpdateOfferingDto } from './dto/offering.dto';
import { OfferingService } from './offering.service';

@Controller('institute/offerings')
@UseGuards(InstituteGuard, PermissionGuard)
export class OfferingController {
  constructor(private readonly offeringService: OfferingService) {}

  @Get()
  @RequirePermissions('offerings.read')
  findAll(@CurrentInstituteId() instituteId: string, @Query() query: ListOfferingsQueryDto) {
    return this.offeringService.findAll(instituteId, query);
  }

  @Post('generate')
  @RequirePermissions('offerings.create')
  generate(@CurrentInstituteId() instituteId: string, @Body() dto: GenerateOfferingsDto) {
    return this.offeringService.generateOfferings(instituteId, dto.semesterId, dto.batchId);
  }

  @Post()
  @RequirePermissions('offerings.create')
  create(@CurrentInstituteId() instituteId: string, @Body() dto: CreateOfferingDto) {
    return this.offeringService.create(instituteId, dto);
  }

  @Get(':id')
  @RequirePermissions('offerings.read')
  findOne(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.offeringService.findOne(instituteId, id);
  }

  @Patch(':id')
  @RequirePermissions('offerings.update')
  update(@CurrentInstituteId() instituteId: string, @Param('id') id: string, @Body() dto: UpdateOfferingDto) {
    return this.offeringService.update(instituteId, id, dto);
  }

  @Get(':id/students')
  @RequirePermissions('offerings.read')
  roster(@CurrentInstituteId() instituteId: string, @Param('id') id: string) {
    return this.offeringService.getRoster(instituteId, id);
  }
}

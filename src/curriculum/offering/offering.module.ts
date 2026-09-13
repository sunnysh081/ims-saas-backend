import { Module } from '@nestjs/common';

import { OfferingController } from './offering.controller';
import { OfferingService } from './offering.service';

@Module({
  controllers: [OfferingController],
  providers: [OfferingService],
  exports: [OfferingService],
})
export class OfferingModule {}

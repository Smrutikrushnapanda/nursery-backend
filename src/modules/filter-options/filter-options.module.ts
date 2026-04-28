import { Module } from '@nestjs/common';
import { FilterOptionsService } from './filter-options.service';
import { FilterOptionsController } from './filter-options.controller';

@Module({
  providers: [FilterOptionsService],
  controllers: [FilterOptionsController],
  exports: [FilterOptionsService],
})
export class FilterOptionsModule {}

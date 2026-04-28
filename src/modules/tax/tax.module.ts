import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tax } from './tax.entity';
import { TaxService } from './tax.service';
import { TaxController } from './tax.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tax])],
  providers: [TaxService],
  controllers: [TaxController],
  exports: [TaxService],
})
export class TaxModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QrCode } from './qr-code.entity';
import { QrService } from './qr.service';
import { QrController } from './qr.controller';
import { PlantsModule } from '../plants/plants.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [TypeOrmModule.forFeature([QrCode]), PlantsModule, SubscriptionsModule],
  controllers: [QrController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}

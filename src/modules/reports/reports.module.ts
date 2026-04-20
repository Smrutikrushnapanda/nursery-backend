import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { PlantStock } from '../inventory/entities/plant-stock.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, PlantStock]), SubscriptionsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlantVariant } from '../plants/plant-variant.entity';
import { PlantStock } from '../inventory/entities/plant-stock.entity';
import { OrdersModule } from '../orders/orders.module';
import { InvoiceModule } from '../invoices/invoice.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PosService } from './pos.service';
import { PosController } from './pos.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlantVariant, PlantStock]),
    OrdersModule,
    InvoiceModule,
    OrganizationsModule,
    SubscriptionsModule,
  ],
  controllers: [PosController],
  providers: [PosService],
})
export class PosModule {}

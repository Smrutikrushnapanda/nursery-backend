import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { Plant } from '../plants/plant.entity';
import { PlantVariant } from '../plants/plant-variant.entity';
import { PlantStock } from '../inventory/entities/plant-stock.entity';
import { StockLog } from '../inventory/entities/stock-log.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { InvoiceModule } from '../invoices/invoice.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Plant,
      PlantVariant,
      PlantStock,
      StockLog,
      Payment,
      Order,
      OrderItem,
      Organization,
    ]),
    InvoiceModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}

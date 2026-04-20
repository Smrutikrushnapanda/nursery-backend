import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { PlantVariant } from '../plants/plant-variant.entity';
import { Cart } from '../cart/cart.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { InventoryModule } from '../inventory/inventory.module';
import { InvoiceModule } from '../invoices/invoice.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, PlantVariant, Cart, Organization]),
    InventoryModule,
    InvoiceModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [TypeOrmModule, OrdersService],
})
export class OrdersModule {}

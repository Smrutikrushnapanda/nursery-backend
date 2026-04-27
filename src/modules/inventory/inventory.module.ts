import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlantVariant } from '../plants/plant-variant.entity';
import { QrCode } from '../qr/qr-code.entity';
import { InventoryController } from './inventory.controller';
import { PlantStock } from './entities/plant-stock.entity';
import { StockLog } from './entities/stock-log.entity';
import { InventoryService } from './inventory.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlantStock, StockLog, PlantVariant, QrCode])],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}

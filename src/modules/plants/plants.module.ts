import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlantsService } from './plants.service';
import { PlantsController } from './plants.controller';
import { Plant } from './plant.entity';
import { PlantImage } from './plant-image.entity';
import { PlantVariant } from './plant-variant.entity';
import { PlantVariantsService } from './plant-variants.service';
import { PlantVariantsController } from './plant-variants.controller';
import { PlantStock } from '../inventory/entities/plant-stock.entity';
import { FileUploadModule } from '../uploads/file-upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plant, PlantVariant, PlantStock, PlantImage]),
    FileUploadModule,
  ],
  controllers: [PlantsController, PlantVariantsController],
  providers: [PlantsService, PlantVariantsService],
  exports: [TypeOrmModule, PlantsService, PlantVariantsService],
})
export class PlantsModule {}

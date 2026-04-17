import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlantsService } from './plants.service';
import { PlantsController } from './plants.controller';
import { Plant } from './plant.entity';
import { PlantVariant } from './plant-variant.entity';
import { PlantVariantsService } from './plant-variants.service';
import { PlantVariantsController } from './plant-variants.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Plant, PlantVariant])],
  controllers: [PlantsController, PlantVariantsController],
  providers: [PlantsService, PlantVariantsService],
  exports: [TypeOrmModule, PlantsService, PlantVariantsService],
})
export class PlantsModule {}

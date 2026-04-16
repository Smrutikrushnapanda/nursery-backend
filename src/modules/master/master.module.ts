import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterService } from './master.service';
import { MasterController } from './master.controller';
import { BusinessType } from './business-type.entity';
import { Category } from './category.entity';
import { SubCategory } from './subcategory.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessType, Category, SubCategory])],
  providers: [MasterService],
  controllers: [MasterController],
  exports: [MasterService],
})
export class MasterModule {}
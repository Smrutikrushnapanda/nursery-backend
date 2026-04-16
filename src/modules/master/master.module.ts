import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterService } from './master.service';
import { MasterController } from './master.controller';
import { BusinessType } from './business-type.entity';
import { Category } from '../categories/category.entity';
import { SubCategory } from './subcategory.entity';
import { MenuMaster } from './menu-master.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BusinessType, Category, SubCategory, MenuMaster])],
  providers: [MasterService],
  controllers: [MasterController],
  exports: [MasterService],
})
export class MasterModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterService } from './master.service';
import { MasterController } from './master.controller';
import { MenuMasterController } from './menu-master.controller';
import { BusinessType } from './business-type.entity';
import { Category } from '../categories/category.entity';
import { SubCategory } from './subcategory.entity';
import { MenuMaster } from './menu-master.entity';
import { RegistrationCategory } from './registration-category.entity';
import { RegistrationSubCategory } from './registration-subcategory.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BusinessType,
      Category,
      SubCategory,
      MenuMaster,
      RegistrationCategory,
      RegistrationSubCategory,
    ]),
  ],
  providers: [MasterService],
  controllers: [MasterController, MenuMasterController],
  exports: [MasterService],
})
export class MasterModule {}

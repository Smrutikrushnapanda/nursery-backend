import { Controller, Get, Query } from '@nestjs/common';
import { MasterService } from './master.service';

@Controller('master')
export class MasterController {
  constructor(private readonly masterService: MasterService) {}

  @Get('business-types')
  async getBusinessTypes() {
    return this.masterService.getBusinessTypes();
  }

  @Get('categories')
  async getCategories() {
    return this.masterService.getCategories();
  }

  @Get('subcategories')
  async getSubCategories(@Query('categoryId') categoryId?: string) {
    const categoryIdNum = categoryId ? parseInt(categoryId, 10) : undefined;
    return this.masterService.getSubCategories(categoryIdNum);
  }
}
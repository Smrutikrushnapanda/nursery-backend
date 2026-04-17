import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MasterService } from '../master/master.service';

@ApiTags('Auth')
@Controller('register')
export class RegisterController {
  constructor(private readonly masterService: MasterService) {}

  @Get('business-types')
  @ApiOperation({ summary: 'Get business types for registration' })
  @ApiResponse({
    status: 200,
    description: 'Returns all business types',
  })
  async getBusinessTypes() {
    return this.masterService.getBusinessTypes();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get categories for registration' })
  @ApiResponse({
    status: 200,
    description: 'Returns all registration categories',
  })
  async getCategories() {
    return this.masterService.getRegistrationCategories();
  }

  @Get('sub-categories')
  @ApiOperation({ summary: 'Get sub-categories for registration' })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter by category ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns registration sub-categories',
  })
  async getSubCategories(@Query('categoryId') categoryId?: string) {
    const categoryIdNum = categoryId ? parseInt(categoryId, 10) : undefined;
    return this.masterService.getRegistrationSubCategories(categoryIdNum);
  }
}

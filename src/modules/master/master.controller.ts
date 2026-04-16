import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MasterService } from './master.service';
import { CreateMenuMasterDto } from './dto/create-menu-master.dto';
import { UpdateMenuMasterDto } from './dto/update-menu-master.dto';
import { MenuMaster } from './menu-master.entity';

@ApiTags('Master')
@Controller('master')
export class MasterController {
  constructor(private readonly masterService: MasterService) {}

  @Get('business-types')
  @ApiOperation({ summary: 'Get all business types' })
  @ApiResponse({
    status: 200,
    description: 'Returns all business types',
  })
  async getBusinessTypes() {
    return this.masterService.getBusinessTypes();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({
    status: 200,
    description: 'Returns all categories',
  })
  async getCategories() {
    return this.masterService.getCategories();
  }

  @Get('subcategories')
  @ApiOperation({ summary: 'Get all subcategories' })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter by category ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all subcategories or filtered by category',
  })
  async getSubCategories(@Query('categoryId') categoryId?: string) {
    const categoryIdNum = categoryId ? parseInt(categoryId, 10) : undefined;
    return this.masterService.getSubCategories(categoryIdNum);
  }

  // Menu Master APIs
  @Post('menus')
  @ApiOperation({ summary: 'Create a new menu' })
  @ApiResponse({
    status: 201,
    description: 'Menu created successfully',
    type: MenuMaster,
  })
  async createMenuMaster(
    @Body() createMenuMasterDto: CreateMenuMasterDto,
  ): Promise<MenuMaster> {
    return this.masterService.createMenuMaster(createMenuMasterDto);
  }

  @Get('menus')
  @ApiOperation({ summary: 'Get all menus' })
  @ApiResponse({
    status: 200,
    description: 'Returns all menus',
    type: [MenuMaster],
  })
  async getAllMenuMasters(): Promise<MenuMaster[]> {
    return this.masterService.getAllMenuMasters();
  }

  @Get('menus/:id')
  @ApiOperation({ summary: 'Get a menu by ID' })
  @ApiParam({
    name: 'id',
    description: 'Menu ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the menu',
    type: MenuMaster,
  })
  @ApiResponse({
    status: 404,
    description: 'Menu not found',
  })
  async getMenuMasterById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MenuMaster> {
    return this.masterService.getMenuMasterById(id);
  }

  @Put('menus/:id')
  @ApiOperation({ summary: 'Update a menu' })
  @ApiParam({
    name: 'id',
    description: 'Menu ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Menu updated successfully',
    type: MenuMaster,
  })
  @ApiResponse({
    status: 404,
    description: 'Menu not found',
  })
  async updateMenuMaster(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMenuMasterDto: UpdateMenuMasterDto,
  ): Promise<MenuMaster> {
    return this.masterService.updateMenuMaster(id, updateMenuMasterDto);
  }

  @Delete('menus/:id')
  @ApiOperation({ summary: 'Delete a menu' })
  @ApiParam({
    name: 'id',
    description: 'Menu ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Menu deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Menu not found',
  })
  async deleteMenuMaster(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.masterService.deleteMenuMaster(id);
  }
}
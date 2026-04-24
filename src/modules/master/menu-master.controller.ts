import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { MasterService } from './master.service';
import { CreateMenuMasterDto } from './dto/create-menu-master.dto';
import { UpdateMenuMasterDto } from './dto/update-menu-master.dto';
import { MenuMaster } from './menu-master.entity';

@ApiTags('Master - Menus')
@Controller('master')
export class MenuMasterController {
  constructor(private readonly masterService: MasterService) {}

  @Post('menus')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(OptionalJwtAuthGuard)
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
  @UseGuards(OptionalJwtAuthGuard)
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
    return this.masterService.getAccessibleMenuMasterById(id);
  }

  @Put('menus/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
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
  async deleteMenuMaster(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.masterService.deleteMenuMaster(id);
  }
}

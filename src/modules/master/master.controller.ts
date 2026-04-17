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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MasterService } from './master.service';
import { CreateSubCategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubCategoryDto } from './dto/update-subcategory.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentOrganization } from '../../common/decorators/current-organization.decorator';

@ApiTags('Master - Categories & Subcategories')
@Controller('master')
export class MasterController {
  constructor(private readonly masterService: MasterService) {}

  @Get('dashboard/subcategories')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get subcategories (Dashboard)', description: 'Dashboard flow endpoint. Retrieve subcategories for the organization. Optionally filter by categoryId.' })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter by category ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all subcategories or filtered by category',
  })
  async getDashboardSubCategories(
    @CurrentOrganization() orgId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const categoryIdNum = categoryId ? parseInt(categoryId, 10) : undefined;
    return this.masterService.getSubCategories(orgId, categoryIdNum);
  }

  @Post('dashboard/subcategories')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new subcategory (Dashboard)' })
  @ApiResponse({
    status: 201,
    description: 'SubCategory created successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found',
  })
  async createSubCategory(
    @Body() createSubCategoryDto: CreateSubCategoryDto,
    @CurrentOrganization() orgId: string,
  ) {
    return this.masterService.createSubCategory(createSubCategoryDto, orgId);
  }

  @Get('dashboard/subcategories/:id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get a subcategory by ID (Dashboard)' })
  @ApiParam({
    name: 'id',
    description: 'SubCategory ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the subcategory',
  })
  @ApiResponse({
    status: 404,
    description: 'SubCategory not found',
  })
  async getSubCategoryById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentOrganization() orgId?: string,
  ) {
    return this.masterService.getDashboardSubCategoryById(id, orgId);
  }

  @Put('dashboard/subcategories/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a subcategory (Dashboard)' })
  @ApiParam({
    name: 'id',
    description: 'SubCategory ID',
  })
  @ApiResponse({
    status: 200,
    description: 'SubCategory updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'SubCategory or Category not found',
  })
  async updateSubCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubCategoryDto: UpdateSubCategoryDto,
    @CurrentOrganization() orgId: string,
  ) {
    return this.masterService.updateSubCategory(id, updateSubCategoryDto, orgId);
  }

  @Delete('dashboard/subcategories/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a subcategory (Dashboard)' })
  @ApiParam({
    name: 'id',
    description: 'SubCategory ID',
  })
  @ApiResponse({
    status: 200,
    description: 'SubCategory deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'SubCategory not found',
  })
  async deleteSubCategory(
    @Param('id', ParseIntPipe) id: number,
    @CurrentOrganization() orgId: string,
  ) {
    return this.masterService.deleteSubCategory(id, orgId);
  }
}

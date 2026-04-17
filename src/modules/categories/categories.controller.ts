import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CurrentOrganization } from '../../common/decorators/current-organization.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';

@ApiTags('Master - Categories & Subcategories')
@ApiBearerAuth()
@Controller('master/category')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new category', description: 'Create a new category under the organization' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  create(@Body() dto: CreateCategoryDto, @CurrentOrganization() orgId: string) {
    return this.service.create(dto, orgId);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get all active categories for the organization', description: 'Retrieve all active (status=true) categories for the current organization' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  findAll(@CurrentOrganization() orgId?: string) {
    return this.service.findAll(orgId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a category by ID', description: 'Retrieve a specific category by its ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findOne(@Param('id') id: string, @CurrentOrganization() orgId: string) {
    return this.service.findOne(+id, orgId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update a category', description: 'Update an existing category (partial update)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @CurrentOrganization() orgId: string) {
    return this.service.update(+id, dto, orgId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Soft delete a category', description: 'Soft delete a category by setting status to false' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  remove(@Param('id') id: string, @CurrentOrganization() orgId: string) {
    return this.service.remove(+id, orgId);
  }
}

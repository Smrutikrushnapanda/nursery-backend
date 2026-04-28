import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CurrentOrganization } from '../../common/decorators/current-organization.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  AddStockDto,
  DeadStockDto,
  RemoveStockDto,
  UpdateStockDto,
} from './dto/stock-change.dto';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('add-stock')
  @ApiOperation({ summary: 'Add stock for a plant variant' })
  addStock(
    @Body() dto: AddStockDto,
    @CurrentOrganization() organizationId?: string,
  ) {
    return this.inventoryService.addStock(
      this.requireOrganization(organizationId),
      dto.variantId,
      dto.quantity,
      dto.reference,
    );
  }

  @Post('remove-stock')
  @ApiOperation({ summary: 'Remove stock for a plant variant' })
  removeStock(
    @Body() dto: RemoveStockDto,
    @CurrentOrganization() organizationId?: string,
  ) {
    return this.inventoryService.removeStock(
      this.requireOrganization(organizationId),
      dto.variantId,
      dto.quantity,
      dto.reference,
    );
  }

  @Post('dead-stock')
  @ApiOperation({ summary: 'Mark dead stock for a plant variant' })
  markDeadStock(
    @Body() dto: DeadStockDto,
    @CurrentOrganization() organizationId?: string,
  ) {
    return this.inventoryService.markDeadStock(
      this.requireOrganization(organizationId),
      dto.variantId,
      dto.quantity,
      dto.reference,
    );
  }

  @Put('stock')
  @ApiOperation({ summary: 'Update stock quantity for a plant variant' })
  updateStock(
    @Body() dto: UpdateStockDto,
    @CurrentOrganization() organizationId?: string,
  ) {
    return this.inventoryService.updateStock(
      this.requireOrganization(organizationId),
      dto.variantId,
      dto.quantity,
      dto.reason,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all stock records for the organization with optional filters' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category name (case-insensitive partial match)' })
  @ApiQuery({ name: 'subcategory', required: false, description: 'Filter by subcategory name (case-insensitive partial match)' })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    description: 'Filter by stock status: "In Stock", "Low Stock", or "Out of Stock"',
    enum: ['In Stock', 'Low Stock', 'Out of Stock']
  })
  @ApiQuery({ name: 'size', required: false, description: 'Filter by variant size (TINY, SMALL, MEDIUM, LARGE, EXTRA_LARGE)' })
  @ApiQuery({ name: 'activity', required: false, description: 'Filter by QR activity: "generated", "not_generated", "most_scanned", "least_scanned", "recently_scanned", "never_scanned"', enum: ['generated', 'not_generated', 'most_scanned', 'least_scanned', 'recently_scanned', 'never_scanned'] })
  @ApiQuery({ name: 'minPrice', required: false, description: 'Minimum price filter' })
  @ApiQuery({ name: 'maxPrice', required: false, description: 'Maximum price filter' })
  @ApiQuery({ name: 'minQuantity', required: false, description: 'Minimum quantity filter' })
  @ApiQuery({ name: 'maxQuantity', required: false, description: 'Maximum quantity filter' })
  getAllStockRecords(
    @CurrentOrganization() organizationId?: string,
    @Query('category') category?: string,
    @Query('subcategory') subcategory?: string,
    @Query('status') status?: string,
    @Query('size') size?: string,
    @Query('activity') activity?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minQuantity') minQuantity?: string,
    @Query('maxQuantity') maxQuantity?: string,
  ) {
    return this.inventoryService.getAllStock(
      this.requireOrganization(organizationId),
      {
        category,
        subcategory,
        status,
        size,
        activity,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        minQuantity: minQuantity ? parseFloat(minQuantity) : undefined,
        maxQuantity: maxQuantity ? parseFloat(maxQuantity) : undefined,
      },
    );
  }

  @Get(':variantId')
  @ApiOperation({ summary: 'Get current stock by variant id' })
  @ApiParam({ name: 'variantId', type: Number, description: 'Plant variant ID', required: true })
  getStock(
    @Param('variantId', ParseIntPipe) variantId: number,
    @CurrentOrganization() organizationId?: string,
  ) {
    return this.inventoryService.getStock(
      this.requireOrganization(organizationId),
      variantId,
    );
  }

  @Delete()
  @ApiOperation({ summary: 'Delete/clear all stock records for the organization' })
  deleteAllStock(
    @CurrentOrganization() organizationId?: string,
  ) {
    return this.inventoryService.deleteAllStock(
      this.requireOrganization(organizationId),
    );
  }

  @Delete(':variantId')
  @ApiOperation({ summary: 'Delete/clear stock for a plant variant' })
  @ApiParam({ name: 'variantId', type: Number, description: 'Plant variant ID', required: true })
  deleteStock(
    @Param('variantId', ParseIntPipe) variantId: number,
    @CurrentOrganization() organizationId?: string,
  ) {
    return this.inventoryService.deleteStock(
      this.requireOrganization(organizationId),
      variantId,
    );
  }

  private requireOrganization(organizationId?: string): string {
    if (!organizationId) {
      throw new BadRequestException('Organization context is missing');
    }
    return organizationId;
  }
}

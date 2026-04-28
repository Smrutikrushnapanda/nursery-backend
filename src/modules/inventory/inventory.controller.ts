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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Get all stock records for the organization' })
  getAllStockRecords(
    @CurrentOrganization() organizationId?: string,
  ) {
    return this.inventoryService.getAllStock(
      this.requireOrganization(organizationId),
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

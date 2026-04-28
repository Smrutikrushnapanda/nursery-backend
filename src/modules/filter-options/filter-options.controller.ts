import { Controller, Get, Param } from '@nestjs/common';
import { FilterOptionsService } from './filter-options.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('filter-options')
@ApiTags('Filter Options')
export class FilterOptionsController {
  constructor(private readonly filterOptionsService: FilterOptionsService) {}

  @Get('inventory-status')
  @ApiOperation({ summary: 'Get inventory status filter options' })
  @ApiResponse({
    status: 200,
    description: 'Returns inventory status options',
    schema: {
      example: {
        success: true,
        data: [
          { value: 'In Stock', label: 'In Stock' },
          { value: 'Low Stock', label: 'Low Stock' },
          { value: 'Out of Stock', label: 'Out of Stock' },
        ],
      },
    },
  })
  async getInventoryStatus() {
    return this.filterOptionsService.getInventoryStatus();
  }

  @Get('payment-methods')
  @ApiOperation({ summary: 'Get payment methods filter options' })
  @ApiResponse({
    status: 200,
    description: 'Returns payment method options',
    schema: {
      example: {
        success: true,
        data: [
          { value: 'CASH', label: 'Cash' },
          { value: 'UPI', label: 'UPI' },
          { value: 'CARD', label: 'Card' },
          { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
        ],
      },
    },
  })
  async getPaymentMethods() {
    return this.filterOptionsService.getPaymentMethods();
  }

  @Get('payment-statuses')
  @ApiOperation({ summary: 'Get payment statuses filter options' })
  @ApiResponse({
    status: 200,
    description: 'Returns payment status options',
    schema: {
      example: {
        success: true,
        data: [
          { value: 'PENDING', label: 'Pending' },
          { value: 'COMPLETED', label: 'Completed' },
          { value: 'FAILED', label: 'Failed' },
          { value: 'REFUNDED', label: 'Refunded' },
        ],
      },
    },
  })
  async getPaymentStatuses() {
    return this.filterOptionsService.getPaymentStatuses();
  }

  @Get('activity-levels')
  @ApiOperation({ summary: 'Get activity levels filter options' })
  @ApiResponse({
    status: 200,
    description: 'Returns activity level options',
    schema: {
      example: {
        success: true,
        data: [
          { value: 'Low Activity', label: 'Low Activity' },
          { value: 'Moderate Activity', label: 'Moderate Activity' },
          { value: 'High Activity', label: 'High Activity' },
        ],
      },
    },
  })
  async getActivityLevels() {
    return this.filterOptionsService.getActivityLevels();
  }

  @Get('http-methods')
  @ApiOperation({ summary: 'Get HTTP methods filter options' })
  @ApiResponse({
    status: 200,
    description: 'Returns HTTP method options',
    schema: {
      example: {
        success: true,
        data: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'PATCH', label: 'PATCH' },
          { value: 'DELETE', label: 'DELETE' },
        ],
      },
    },
  })
  async getHttpMethods() {
    return this.filterOptionsService.getHttpMethods();
  }

  @Get('plant-sizes')
  @ApiOperation({ summary: 'Get plant sizes filter options' })
  @ApiResponse({
    status: 200,
    description: 'Returns plant size options',
    schema: {
      example: {
        success: true,
        data: [
          { value: 'TINY', label: 'Tiny' },
          { value: 'SMALL', label: 'Small' },
          { value: 'MEDIUM', label: 'Medium' },
          { value: 'LARGE', label: 'Large' },
          { value: 'EXTRA_LARGE', label: 'Extra Large' },
        ],
      },
    },
  })
  async getPlantSizes() {
    return this.filterOptionsService.getPlantSizes();
  }

  @Get(':optionType')
  @ApiOperation({ summary: 'Get filter options by type' })
  @ApiResponse({
    status: 200,
    description: 'Returns filter options for the specified type',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid option type',
  })
  async getFilterOptions(@Param('optionType') optionType: string) {
    return this.filterOptionsService.getFilterOptionsByType(optionType);
  }
}

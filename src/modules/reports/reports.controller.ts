import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { CurrentOrganization } from '../../common/decorators/current-organization.decorator';
import { UserRole } from '../users/user.entity';
import { PlanFeature } from '../plans/entities/plan.entity';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER)
@RequireFeature(PlanFeature.REPORTS)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Get sales report grouped by period' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['daily', 'weekly', 'monthly'],
    example: 'daily',
  })
  @ApiResponse({ status: 200, description: 'Sales report fetched successfully' })
  getSales(
    @CurrentOrganization() orgId: string,
    @Query('type') type: 'daily' | 'weekly' | 'monthly' = 'daily',
  ) {
    return this.reportsService.getSales(orgId, type);
  }

  @Get('top-plants')
  @ApiOperation({ summary: 'Get top selling plants report' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Maximum number of plants to return',
  })
  @ApiResponse({
    status: 200,
    description: 'Top plants report fetched successfully',
  })
  getTopPlants(
    @CurrentOrganization() orgId: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getTopPlants(orgId, limit ? Number(limit) : 10);
  }

  @Get('inventory-value')
  @ApiOperation({ summary: 'Get current inventory valuation report' })
  @ApiResponse({
    status: 200,
    description: 'Inventory valuation report fetched successfully',
  })
  getInventoryValue(@CurrentOrganization() orgId: string) {
    return this.reportsService.getInventoryValue(orgId);
  }
}

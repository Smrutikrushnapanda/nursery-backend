import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { CurrentOrganization } from '../../common/decorators/current-organization.decorator';
import { UserRole } from '../users/user.entity';
import { PlanFeature } from '../plans/entities/plan.entity';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
@Roles(UserRole.OWNER, UserRole.MANAGER)
@RequireFeature(PlanFeature.REPORTS)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  getSales(
    @CurrentOrganization() orgId: string,
    @Query('type') type: 'daily' | 'weekly' | 'monthly' = 'daily',
  ) {
    return this.reportsService.getSales(orgId, type);
  }

  @Get('top-plants')
  getTopPlants(
    @CurrentOrganization() orgId: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getTopPlants(orgId, limit ? Number(limit) : 10);
  }

  @Get('inventory-value')
  getInventoryValue(@CurrentOrganization() orgId: string) {
    return this.reportsService.getInventoryValue(orgId);
  }
}

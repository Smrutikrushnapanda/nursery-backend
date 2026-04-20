import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { CurrentOrganization } from '../../common/decorators/current-organization.decorator';
import { PlanFeature } from '../plans/entities/plan.entity';
import { PosService, QuickOrderDto } from './pos.service';

@ApiTags('POS (Mobile)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireFeature(PlanFeature.POS)
@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Get lean product catalog for mobile POS (plants + variants + stock)' })
  getCatalog(@CurrentOrganization() orgId: string) {
    return this.posService.getCatalog(orgId);
  }

  @Post('quick-order')
  @ApiOperation({ summary: 'Create order + payment in one shot (skip cart), send invoice email' })
  quickOrder(@Body() dto: QuickOrderDto, @CurrentOrganization() orgId: string) {
    return this.posService.quickOrder(dto, orgId);
  }
}

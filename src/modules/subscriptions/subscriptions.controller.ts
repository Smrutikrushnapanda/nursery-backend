import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentOrganization } from '../../common/decorators/current-organization.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { SubscribeDto, UpgradeDto } from './dto/subscription.dto';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to a plan' })
  subscribe(@Body() dto: SubscribeDto, @CurrentOrganization() orgId: string) {
    return this.subscriptionsService.subscribe(dto, orgId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current active subscription' })
  getActive(@CurrentOrganization() orgId: string) {
    return this.subscriptionsService.getActive(orgId);
  }

  @Post('upgrade')
  @ApiOperation({ summary: 'Upgrade to a higher plan' })
  upgrade(@Body() dto: UpgradeDto, @CurrentOrganization() orgId: string) {
    return this.subscriptionsService.upgrade(dto, orgId);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel active subscription' })
  cancel(@CurrentOrganization() orgId: string) {
    return this.subscriptionsService.cancel(orgId);
  }
}

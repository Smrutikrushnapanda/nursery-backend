import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentOrganization } from '../../common/decorators/current-organization.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BillingService } from './billing.service';
import { CreateManualBillDto } from './dto/create-manual-bill.dto';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plants')
  @ApiOperation({
    summary: 'Get active plants with variants and stock for manual billing',
  })
  getPlants(@CurrentOrganization() organizationId: string) {
    return this.billingService.getPlants(organizationId);
  }

  @Get('plants/:plantId/variants')
  @ApiOperation({
    summary: 'Get variants for selected plant in manual billing',
  })
  getPlantVariants(
    @Param('plantId', ParseIntPipe) plantId: number,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.billingService.getPlantVariants(plantId, organizationId);
  }

  @Post('manual')
  @ApiOperation({
    summary: 'Create manual bill, deduct stock, create payment, send invoice email',
  })
  createManualBill(
    @Body() dto: CreateManualBillDto,
    @CurrentOrganization() organizationId: string,
  ) {
    if (!organizationId) {
      throw new BadRequestException('Organization context is required');
    }

    return this.billingService.createManualBill(dto, organizationId);
  }
}

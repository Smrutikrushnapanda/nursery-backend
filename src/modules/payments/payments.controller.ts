import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { PlanFeature } from '../plans/entities/plan.entity';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), FeatureGuard)
@RequireFeature(PlanFeature.PAYMENTS)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Pay for an order (cash / UPI / card / bank transfer)' })
  create(@Body() dto: CreatePaymentDto, @Request() req: any) {
    return this.paymentsService.create(dto, req.user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all payments for the organization with pagination' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentsService.findAll(
      req.user.organizationId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID with full order details' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.paymentsService.findOne(id, req.user.organizationId);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get payment by order ID' })
  findByOrder(@Param('orderId', ParseIntPipe) orderId: number, @Request() req: any) {
    return this.paymentsService.findByOrder(orderId, req.user.organizationId);
  }
}

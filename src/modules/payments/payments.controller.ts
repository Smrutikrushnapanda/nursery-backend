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
  @ApiOperation({ summary: 'Get all payments for the organization with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ 
    name: 'method', 
    required: false, 
    description: 'Filter by payment method',
    enum: ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER']
  })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    description: 'Filter by payment status',
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']
  })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (YYYY-MM-DD)' })
  findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('method') method?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.paymentsService.findAll(
      req.user.organizationId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50,
      {
        method,
        status,
        startDate,
        endDate,
      },
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

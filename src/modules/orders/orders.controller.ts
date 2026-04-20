import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentMethod } from '../payments/entities/payment.entity';

class CheckoutDto {
  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 'TXN123456' })
  @IsOptional() @IsString() @MaxLength(100)
  paymentReference?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional() @IsString() @MaxLength(150)
  customerName?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional() @IsString() @MaxLength(25)
  customerPhone?: string;

  @ApiPropertyOptional({ example: 'customer@example.com' })
  @IsOptional() @IsString()
  customerEmail?: string;
}

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @ApiOperation({ summary: 'Checkout — convert cart into order, reduce stock, create payment' })
  checkout(@Body() body: CheckoutDto, @Request() req: any) {
    return this.ordersService.createFromCart(
      req.user.userId,
      req.user.organizationId,
      body.paymentMethod,
      body.paymentReference,
      body.customerName,
      body.customerPhone,
      body.customerEmail,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create order with items, reduce stock, create payment — all in one' })
  create(@Body() dto: CreateOrderDto, @Request() req: any) {
    return this.ordersService.create(dto, req.user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  findAll(@Request() req: any) {
    return this.ordersService.findAll(req.user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID with items and payment' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.ordersService.findOne(id, req.user.organizationId);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a pending order' })
  cancel(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.ordersService.cancel(id, req.user.organizationId);
  }
}

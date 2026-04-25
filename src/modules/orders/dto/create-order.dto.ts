import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
  IsNumber,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../payments/entities/payment.entity';

export class OrderItemDto {
  @ApiProperty({ example: 1, description: 'Plant variant ID' })
  @IsInt()
  @IsPositive()
  variantId: number;

  @ApiProperty({ example: 2, description: 'Quantity' })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH, description: 'Payment method — payment is created automatically' })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 'TXN123456', description: 'UPI / card reference number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentReference?: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  customerName?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(25)
  customerPhone?: string;

  @ApiPropertyOptional({ example: 'customer@example.com' })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({ example: 100, description: 'Discount amount (fixed) or percentage value' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ example: 'fixed', description: 'Discount type: "fixed" for fixed amount or "percentage" for percentage' })
  @IsOptional()
  @IsIn(['fixed', 'percentage'])
  discountType?: 'fixed' | 'percentage';
}

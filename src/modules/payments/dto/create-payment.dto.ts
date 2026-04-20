import { IsEmail, IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty({ example: 1, description: 'Order ID to pay for' })
  @IsInt()
  @IsPositive()
  orderId: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({ example: 'TXN123456', description: 'UPI / card reference number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @ApiPropertyOptional({ example: 'Paid via GPay' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'customer@example.com', description: 'Send invoice to this email' })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaymentMethod } from '../../payments/entities/payment.entity';

export class SubscribeDto {
  @ApiProperty({ example: 'uuid-of-plan' })
  @IsUUID()
  planId: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.UPI })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 'TXN123456' })
  @IsOptional()
  @IsString()
  paymentReference?: string;
}

export class UpgradeDto {
  @ApiProperty({ example: 'uuid-of-new-plan' })
  @IsUUID()
  planId: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.UPI })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 'TXN123456' })
  @IsOptional()
  @IsString()
  paymentReference?: string;
}

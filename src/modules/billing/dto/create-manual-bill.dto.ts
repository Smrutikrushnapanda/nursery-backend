import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../payments/entities/payment.entity';

export class ManualBillItemDto {
  @ApiProperty({ example: 1, description: 'Plant ID selected by seller' })
  @IsInt()
  @IsPositive()
  plantId: number;

  @ApiProperty({ example: 2, description: 'Plant variant ID selected by seller' })
  @IsInt()
  @IsPositive()
  variantId: number;

  @ApiProperty({ example: 3, description: 'Quantity to bill' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 149.99, description: 'Manual selling price per item' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  unitPrice: number;
}

export class CreateManualBillDto {
  @ApiProperty({ example: 'Walk-in Customer' })
  @IsString()
  @MaxLength(150)
  customerName: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(25)
  customerPhone?: string;

  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  customerEmail: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 'MANUAL-UPI-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentReference?: string;

  @ApiProperty({
    type: [ManualBillItemDto],
    description: 'Multiple plants/variants with manual billing price',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualBillItemDto)
  items: ManualBillItemDto[];
}

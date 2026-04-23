import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PlantVariantSize } from '../plant-variant.entity';

export class CreatePlantVariantDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  plantId: number;

  @ApiPropertyOptional({
    enum: PlantVariantSize,
    example: PlantVariantSize.MEDIUM,
    default: PlantVariantSize.MEDIUM,
  })
  @IsOptional()
  @IsEnum(PlantVariantSize)
  size?: PlantVariantSize;

  @ApiProperty({ example: 199.99 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 'ROSE-MEDIUM-001', description: 'SKU will be auto-generated if not provided' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: 25.0, default: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ example: 5.0, default: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minQuantity?: number;

  @ApiPropertyOptional({ example: '8901234567890' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ example: 300, description: 'Original/Mock price (for displaying discounted price)' })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  mockPrice?: number;
}

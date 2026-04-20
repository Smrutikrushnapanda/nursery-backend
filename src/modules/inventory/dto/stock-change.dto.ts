import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class StockChangeDto {
  @ApiProperty({ example: 12, description: 'Plant variant id' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  variantId: number;

  @ApiProperty({
    example: 10,
    description: 'Quantity to add/remove/mark-dead (must be positive integer)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    example: 'ORDER-2026-0001',
    description: 'Optional reference for traceability (order id, note, etc.)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reference?: string;
}

export class AddStockDto extends StockChangeDto {}

export class RemoveStockDto extends StockChangeDto {}

export class DeadStockDto extends StockChangeDto {}

export class UpdateStockDto {
  @ApiProperty({ example: 12, description: 'Plant variant id' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  variantId: number;

  @ApiProperty({
    example: 50,
    description: 'New quantity to set (must be a non-negative integer)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({
    example: 'Inventory adjustment',
    description: 'Optional reason for the update',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

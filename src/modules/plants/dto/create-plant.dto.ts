import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsNumber, IsString } from 'class-validator';

export class CreatePlantDto {
  @ApiProperty({ example: 'Red Rose' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'PLT-001', required: false, description: 'Auto-generated if not provided' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: 'Beautiful flowering plant', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 'Water daily, keep in sunlight', required: false })
  @IsOptional()
  @IsString()
  careInstructions?: string;

  @ApiProperty({ example: 'Summer', required: false })
  @IsOptional()
  @IsString()
  season?: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  categoryId: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  subcategoryId: number;
}
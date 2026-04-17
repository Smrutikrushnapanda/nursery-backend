import { IsOptional, IsNumber, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSubCategoryDto {
  @ApiPropertyOptional({ example: 'Updated SubCategory Name', description: 'SubCategory name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 2, description: 'Category ID that this subcategory belongs to', required: false })
  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @ApiPropertyOptional({ example: 'Updated description', description: 'SubCategory description', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
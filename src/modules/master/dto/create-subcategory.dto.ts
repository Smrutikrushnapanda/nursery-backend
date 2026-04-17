import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubCategoryDto {
  @ApiProperty({ example: 'Indoor Plants', description: 'SubCategory name' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 1, description: 'Category ID that this subcategory belongs to' })
  @IsNumber()
  @IsNotEmpty()
  categoryId: number;

  @ApiPropertyOptional({ example: 'Plants for indoor use', description: 'SubCategory description', required: false })
  @IsOptional()
  description?: string;
}
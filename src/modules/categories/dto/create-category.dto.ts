import { IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Indoor Plants', description: 'Category name' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Plants for indoor use', description: 'Category description', required: false })
  @IsOptional()
  description?: string;
}
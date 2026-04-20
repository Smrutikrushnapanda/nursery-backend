import { IsInt, IsPositive, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ example: 1, description: 'Plant variant ID' })
  @IsInt()
  @IsPositive()
  variantId: number;

  @ApiPropertyOptional({ example: 1, description: 'Quantity (default 1)' })
  @IsInt()
  @Min(1)
  quantity: number = 1;
}

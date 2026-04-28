import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateTaxDto {
  @ApiProperty({ example: 'GST' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  taxType: string;

  @ApiProperty({ example: 5, description: 'Tax percentage value' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  percentage: number;

  @ApiPropertyOptional({ example: true, description: 'true=active, false=inactive' })
  @IsOptional()
  @IsBoolean()
  status?: boolean;
}

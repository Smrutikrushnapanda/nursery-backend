import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreatePlantVariantDto } from './create-plant-variant.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePlantVariantDto extends PartialType(CreatePlantVariantDto) {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean;
}

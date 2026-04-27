import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreatePlantDto } from './create-plant.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePlantDto extends PartialType(CreatePlantDto) {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  status?: boolean;
}

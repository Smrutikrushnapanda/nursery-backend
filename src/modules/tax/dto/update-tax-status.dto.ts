import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateTaxStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  status: boolean;
}

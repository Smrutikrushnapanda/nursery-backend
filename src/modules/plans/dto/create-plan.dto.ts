import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { PlanFeature, PlanName } from '../entities/plan.entity';

export class CreatePlanDto {
  @ApiProperty({ enum: PlanName, example: PlanName.BASIC })
  @IsEnum(PlanName)
  name: PlanName;

  @ApiProperty({ example: 4999 })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ enum: PlanFeature, isArray: true, example: [PlanFeature.INVENTORY, PlanFeature.POS] })
  @IsArray()
  @IsEnum(PlanFeature, { each: true })
  features: PlanFeature[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: boolean;
}

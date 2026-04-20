import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { PlanFeature, PlanName } from '../entities/plan.entity';

export class UpdatePlanDto {
  @ApiPropertyOptional({ enum: PlanName, example: PlanName.STANDARD })
  @IsOptional()
  @IsEnum(PlanName)
  name?: PlanName;

  @ApiPropertyOptional({ example: 1499 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @ApiPropertyOptional({ enum: PlanFeature, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(PlanFeature, { each: true })
  features?: PlanFeature[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMenuMasterDto {
  @ApiProperty({ example: 'Dashboard', description: 'Name of the menu' })
  @IsString()
  menuName: string;

  @ApiPropertyOptional({ example: '/dashboard', description: 'Path of the menu' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({
    example: null,
    description: 'Parent menu ID (null for root menus)',
  })
  @IsOptional()
  @IsNumber()
  parentId?: number | null;

  @ApiPropertyOptional({ example: 'dashboard-icon', description: 'Icon class name' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: 1, description: 'Display order of the menu' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether menu is visible' })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Status of the menu' })
  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
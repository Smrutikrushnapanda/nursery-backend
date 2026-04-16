import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Jagannath Nursery Store' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  organizationName!: string;

  @ApiProperty({ example: 'contact@jagannathnursery.com' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(191)
  email!: string;

  @ApiProperty({ example: '+91-9999999999' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(25)
  @Matches(/^[+0-9()\-\s]+$/, {
    message: 'phone must contain only numbers, spaces, +, -, or parentheses',
  })
  phone!: string;

  @ApiProperty({ example: 'Bhubaneswar, Odisha' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address!: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

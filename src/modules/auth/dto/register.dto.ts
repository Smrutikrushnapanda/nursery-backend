import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsStrongPassword,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Jagannath Nursery Store' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(150)
  organizationName!: string;

  @ApiProperty({ example: 'owner@jagannathnursery.com' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(191)
  email!: string;

  @ApiProperty({ example: '+91-9937898008' })
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

  @ApiPropertyOptional({
    example:
      'https://images-platform.99static.com/X2v_BF-mAJySsyQiC-ofV042ZhQ/0x0:1400x1400/fit-in/500x500/logo.png',
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @IsNotEmpty()
  businessTypeId!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  categoryId!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  subcategoryId!: number;

  @ApiProperty({ example: 'Str0ngP@ssw0rd!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @IsStrongPassword(
    { minUppercase: 1, minLowercase: 1, minNumbers: 1, minSymbols: 1 },
    {
      message: 'password must include uppercase, lowercase, number, and symbol',
    },
  )
  password!: string;
}

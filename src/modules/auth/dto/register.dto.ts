import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsStrongPassword,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'My Nursery Store' })
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

  @ApiPropertyOptional({ example: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const lowered = value.toLowerCase();
      if (lowered === 'true') {
        return true;
      }
      if (lowered === 'false') {
        return false;
      }
    }
    return value;
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  businessTypeId!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsNotEmpty()
  categoryId!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
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

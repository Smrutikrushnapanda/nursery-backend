import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'My Nursery Store' })
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
  @Matches(/^[+0-9()-\s]+$/, {
    message: 'phone must contain only numbers, spaces, +, -, or parentheses',
  })
  phone!: string;

  @ApiProperty({ example: 'Bhubaneswar, Odisha' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address!: string;

  @ApiPropertyOptional({
    example: 'true',
    description: "Send 'true' or 'false' as string in form-data",
  })
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

  @ApiPropertyOptional({
    example: [
      { day: 'monday', open: '09:00', close: '18:00', isOpen: true },
      { day: 'tuesday', open: '09:00', close: '18:00', isOpen: true },
    ],
    description: 'Business hours for each day of the week',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BusinessHoursDto)
  businessHours?: BusinessHoursDto[];
}

export class BusinessHoursDto {
  @ApiProperty({ example: 'monday' })
  @IsString()
  day: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  open: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  close: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isOpen: boolean;
}

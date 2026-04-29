import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'skpanda017@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(191)
  email!: string;

  @ApiProperty({ example: 'Smruti@1234' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: false, description: 'If true, token expires in 7 days; if false or omitted, token expires in 24 hours' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean = false;
}

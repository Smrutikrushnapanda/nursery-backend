import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'owner@jagannathnursery.com' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(191)
  email!: string;

  @ApiProperty({ example: 'Str0ngP@ssw0rd!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}

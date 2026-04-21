import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ValidateNested,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  IsArray,
  IsNumberString,
} from 'class-validator';

export class CreatePlantDto {
  @ApiProperty({ example: 'Red Rose' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'PLT-001',
    required: false,
    description: 'Auto-generated if not provided',
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: 'Beautiful flowering plant', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Water daily, keep in sunlight', required: false })
  @IsOptional()
  @IsString()
  careInstructions?: string;

  @ApiProperty({
    example: 'Moderate',
    required: false,
    description: 'Water requirement (e.g., Low, Moderate, High)',
  })
  @IsOptional()
  @IsString()
  waterRequirement?: string;

  @ApiProperty({
    example: 'Full Sun',
    required: false,
    description: 'Sunlight requirement (e.g., Full Sun, Partial Shade, Shade)',
  })
  @IsOptional()
  @IsString()
  sunlightRequirement?: string;

  @ApiProperty({
    example: 15,
    required: false,
    description: 'Minimum temperature in Celsius',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  temperatureMin?: number;

  @ApiProperty({
    example: 30,
    required: false,
    description: 'Maximum temperature in Celsius',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  temperatureMax?: number;

  @ApiProperty({
    example: 'Medium',
    required: false,
    description: 'Humidity level (e.g., Low, Medium, High)',
  })
  @IsOptional()
  @IsString()
  humidityLevel?: string;

  @ApiProperty({
    example: 'Well-draining soil',
    required: false,
    description: 'Soil type',
  })
  @IsOptional()
  @IsString()
  soilType?: string;

  @ApiProperty({
    example: 'Monthly',
    required: false,
    description: 'Fertilizing frequency',
  })
  @IsOptional()
  @IsString()
  fertilizingFrequency?: string;

  @ApiProperty({
    example: 'As needed',
    required: false,
    description: 'Pruning frequency',
  })
  @IsOptional()
  @IsString()
  pruningFrequency?: string;

  @ApiProperty({
    example: 'Rosa rubiginosa',
    required: false,
    description: 'Scientific name of the plant',
  })
  @IsOptional()
  @IsString()
  scientificName?: string;

  @ApiProperty({ example: 'Summer', required: false })
  @IsOptional()
  @IsString()
  season?: string;

  @ApiProperty({ example: '1' })
  @IsNumberString()
  categoryId: string;

  @ApiProperty({ example: '1' })
  @IsNumberString()
  subcategoryId: string;

  @ApiProperty({
    example: 'Non-toxic',
    required: false,
    description: 'Pet toxicity level (Non-toxic, Mild, Moderate, Severe)',
  })
  @IsOptional()
  @IsString()
  petToxicity?: string;

  @ApiProperty({
    example: 'Safe for cats and dogs',
    required: false,
    description: 'Notes about pet toxicity',
  })
  @IsOptional()
  @IsString()
  petToxicityNotes?: string;

  @ApiProperty({
    example: [
      { imageUrl: 'https://cloudinary.com/image1.jpg', isPrimary: true, displayOrder: 0 },
      { imageUrl: 'https://cloudinary.com/image2.jpg', isPrimary: false, displayOrder: 1 },
    ],
    required: false,
    description: 'Array of plant images for slider',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlantImageDto)
  images?: PlantImageDto[];
}

export class PlantImageDto {
  @ApiProperty({ example: 'https://cloudinary.com/image1.jpg' })
  @IsNotEmpty()
  @IsString()
  imageUrl: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  isPrimary?: boolean;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  displayOrder?: number;
}

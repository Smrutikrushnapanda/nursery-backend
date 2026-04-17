import { PartialType } from '@nestjs/swagger';
import { CreatePlantVariantDto } from './create-plant-variant.dto';

export class UpdatePlantVariantDto extends PartialType(CreatePlantVariantDto) {}

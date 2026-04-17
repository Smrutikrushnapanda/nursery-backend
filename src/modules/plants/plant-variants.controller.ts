import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentOrganization } from '../../common/decorators/current-organization.decorator';
import { PlantVariantsService } from './plant-variants.service';
import { CreatePlantVariantDto } from './dto/create-plant-variant.dto';
import { UpdatePlantVariantDto } from './dto/update-plant-variant.dto';

@ApiTags('Master - Plant Variants')
@ApiBearerAuth()
@UseGuards(OptionalJwtAuthGuard)
@Controller('master/plant-variant')
export class PlantVariantsController {
  constructor(private readonly service: PlantVariantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create Plant Variant' })
  create(
    @Body() dto: CreatePlantVariantDto,
    @CurrentOrganization() orgId: string,
  ) {
    return this.service.create(dto, orgId);
  }

  @Get()
  @ApiOperation({ summary: 'Get All Plant Variants' })
  @ApiQuery({
    name: 'plantId',
    required: false,
    description: 'Filter variants by plant id',
  })
  findAll(
    @CurrentOrganization() orgId: string | undefined,
    @Query('plantId') plantId?: string,
  ) {
    return this.service.findAll(orgId, this.parseOptionalPlantId(plantId));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Plant Variant By ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentOrganization() orgId: string | undefined,
  ) {
    return this.service.findOne(id, orgId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update Plant Variant' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlantVariantDto,
    @CurrentOrganization() orgId: string,
  ) {
    return this.service.update(id, dto, orgId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete Plant Variant (Soft)' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentOrganization() orgId: string,
  ) {
    return this.service.remove(id, orgId);
  }

  private parseOptionalPlantId(plantId?: string): number | undefined {
    if (plantId === undefined || plantId.trim() === '') {
      return undefined;
    }

    const parsed = Number(plantId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('plantId must be a positive integer');
    }

    return parsed;
  }
}

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
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
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
  @ApiOperation({ summary: 'Get All Plant Variants with pagination' })
  @ApiQuery({
    name: 'plantId',
    required: false,
    description: 'Filter variants by plant id',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  findAll(
    @CurrentOrganization() orgId: string | undefined,
    @Query('plantId') plantId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Check if pagination is requested
    if (page !== undefined || limit !== undefined) {
      return this.service.findAll(orgId, page ? Number(page) : 1, limit ? Number(limit) : 50);
    }
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

  @Get(':id/qr')
  @ApiOperation({ summary: 'Get QR Code for Plant Variant' })
  @ApiProduces('image/png')
  @ApiResponse({ status: 200, description: 'QR code PNG image', schema: { type: 'string', format: 'binary' } })
  async getQr(
    @Param('id', ParseIntPipe) id: number,
    @CurrentOrganization() orgId: string | undefined,
    @Res() res: Response,
  ) {
    const qr = await this.service.generateQr(id, orgId);
    res.setHeader('Content-Type', 'image/png');
    res.send(qr);
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

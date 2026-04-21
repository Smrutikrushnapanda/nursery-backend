import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PlantsService } from './plants.service';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentOrganization } from '../../common/decorators/current-organization.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
// Use any for multer file to avoid type issues

@ApiTags('Master - Plants')
@ApiBearerAuth()
@Controller('master/plant')
export class PlantsController {
  constructor(private readonly service: PlantsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'categoryId', 'subcategoryId'],
      properties: {
        name: { type: 'string' },
        sku: { type: 'string' },
        description: { type: 'string' },
        careInstructions: { type: 'string' },
        waterRequirement: { type: 'string' },
        sunlightRequirement: { type: 'string' },
        temperatureMin: { type: 'string' },
        temperatureMax: { type: 'string' },
        humidityLevel: { type: 'string' },
        soilType: { type: 'string' },
        fertilizingFrequency: { type: 'string' },
        pruningFrequency: { type: 'string' },
        scientificName: { type: 'string' },
        season: { type: 'string' },
        categoryId: { type: 'string' },
        subcategoryId: { type: 'string' },
        petToxicity: { type: 'string' },
        petToxicityNotes: { type: 'string' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Multiple plant image files for slider',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('images', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiOperation({ summary: 'Create Plant' })
  create(
    @Body() dto: CreatePlantDto,
    @CurrentOrganization() orgId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^image\/(jpeg|png|webp|gif|svg\+xml)$/,
        })
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .build({ fileIsRequired: false }),
    )
    imageFile?: any,
  ) {
    return this.service.create(dto, orgId, imageFile ? [imageFile] : []);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get All Plants' })
  findAll(@CurrentOrganization() orgId: string | undefined) {
    return this.service.findAll(orgId);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get Plant By ID' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentOrganization() orgId: string | undefined,
  ) {
    return this.service.findOne(id, orgId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update Plant' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePlantDto,
    @CurrentOrganization() orgId: string,
  ) {
    return this.service.update(id, dto, orgId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete Plant (Soft)' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentOrganization() orgId: string,
  ) {
    return this.service.remove(id, orgId);
  }
}

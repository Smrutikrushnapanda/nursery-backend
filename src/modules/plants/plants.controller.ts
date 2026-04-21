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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PlantsService } from './plants.service';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
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

function plantImageStorage(): multer.StorageEngine {
  const dest = path.join(process.cwd(), 'uploads', 'plants', 'images');
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  return multer.diskStorage({
    destination: dest,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
      cb(null, `${name}-${uniqueSuffix}${ext}`);
    },
  });
}

@ApiTags('Master - Plants')
@ApiBearerAuth()
@Controller('master/plant')
export class PlantsController {
  constructor(
    private readonly service: PlantsService,
  ) {}

  private static readonly ALLOWED_IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ]);

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
    FilesInterceptor('images', 10, {
      limits: { fileSize: 5 * 1024 * 1024 },
      storage: plantImageStorage(),
    }),
  )
  @ApiOperation({ summary: 'Create Plant' })
  create(
    @Body() dto: CreatePlantDto,
    @CurrentOrganization() orgId: string,
    @UploadedFiles() imageFiles?: any[],
  ) {
    const invalidMimeType = imageFiles?.find(
      (file) =>
        !PlantsController.ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype),
    )?.mimetype;

    if (invalidMimeType) {
      throw new BadRequestException(
        `Unsupported image file type: ${invalidMimeType}`,
      );
    }

    return this.service.create(dto, orgId, imageFiles ?? []);
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

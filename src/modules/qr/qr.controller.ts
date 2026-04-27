import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  Headers,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags, ApiQuery, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { FeatureGuard } from '../../common/guards/feature.guard';
import { RequireFeature } from '../../common/decorators/require-feature.decorator';
import { PlanFeature } from '../plans/entities/plan.entity';
import { QrService } from './qr.service';

interface PlantLabelData {
  name: string;
  scientificName: string | null;
  careInstructions: string | null;
  waterRequirement: string | null;
  sunlightRequirement: string | null;
  temperatureRange: string | null;
  season: string | null;
  sku: string | null;
  petToxicity: string | null;
  qrCodeUrl: string;
  qrImageBase64: string;
}

class SellerQrScanDto {
  @ApiPropertyOptional({
    description: 'Raw QR code content (supports app code or URL value)',
    example: 'https://your-frontend.com/plant/12',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description: 'Product/plant identifier. Can be numeric id or URL.',
    example: '12',
  })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ description: 'Specific variant ID to add', example: 27 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  variantId?: number;

  @ApiPropertyOptional({ description: 'Quantity to add in cart', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({
    description: 'Optional scan location metadata',
    example: 'Counter 1',
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: 'Optional device metadata',
    example: 'Android POS device',
  })
  @IsOptional()
  @IsString()
  device?: string;
}

class GenerateQrDto {
  @ApiPropertyOptional({ description: 'Specific variant ID to generate QR for', example: 27 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  variantId?: number;
}

@ApiTags('QR')
@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}


  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate QR code for a specific plant variant (Small / Medium / Large …)' })
  @ApiParam({ name: 'plantId', type: Number, description: 'Plant ID' })
  @ApiParam({ name: 'variantId', type: Number, description: 'Plant Variant ID' })
  @UseGuards(AuthGuard('jwt'), FeatureGuard)
  @RequireFeature(PlanFeature.QR)
  @Post('generate/:plantId/:variantId')
  generateForVariant(
    @Param('plantId') plantId: string,
    @Param('variantId') variantId: string,
    @Request() req: any,
  ) {
    return this.qrService.generate(+plantId, req.user.organizationId, +variantId);
  }

  @ApiOperation({ summary: 'Scan QR code — returns plant data (PUBLIC, no auth)' })
  @ApiParam({ name: 'code', type: String, description: 'QR code string' })
  @ApiQuery({ name: 'location', required: false, description: 'Scan location' })
  @ApiQuery({ name: 'device', required: false, description: 'Device info' })
  @Get('scan/:code')
  scan(
    @Param('code') code: string,
    @Query('location') location?: string,
    @Query('device') device?: string,
    @Headers('x-forwarded-for') ip?: string,
  ) {
    return this.qrService.scan(code, {
      scanLocation: location,
      deviceInfo: device,
      ipAddress: ip,
    });
  }

  @ApiOperation({ summary: 'Scan by product ID — returns plant data (PUBLIC, no auth)' })
  @ApiParam({ name: 'productId', type: String, description: 'Product ID' })
  @ApiQuery({ name: 'location', required: false, description: 'Scan location' })
  @ApiQuery({ name: 'device', required: false, description: 'Device info' })
  @Get('scan/id/:productId')
  scanById(
    @Param('productId') productId: string,
    @Query('location') location?: string,
    @Query('device') device?: string,
    @Headers('x-forwarded-for') ip?: string,
  ) {
    return this.qrService.scanById(productId, {
      scanLocation: location,
      deviceInfo: device,
      ipAddress: ip,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Seller QR scan (AUTH) — scan and add item directly to seller cart',
  })
  @UseGuards(AuthGuard('jwt'))
  @Post('scan/seller')
  scanForSeller(
    @Body() body: SellerQrScanDto,
    @Request() req: any,
    @Headers('x-forwarded-for') ip?: string,
  ) {
    return this.qrService.scanForSeller({
      code: body.code,
      productId: body.productId,
      variantId: body.variantId,
      quantity: body.quantity,
      scannedBy: req.user.userId,
      organizationId: req.user.organizationId,
      scanLocation: body.location,
      deviceInfo: body.device,
      ipAddress: ip,
    });
  }

  // Legacy endpoint for backward compatibility
  @Get(':code')
  scanLegacy(@Param('code') code: string) {
    return this.qrService.scan(code);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get QR scan logs for organization' })
  @ApiQuery({ name: 'plantId', required: false, type: Number })
  @UseGuards(AuthGuard('jwt'))
  @Get('logs')
  getScanLogs(@Request() req: any, @Query('plantId') plantId?: string) {
    return this.qrService.getScanLogs(
      req.user.organizationId,
      plantId ? +plantId : undefined,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate printable label for a plant (generic)' })
  @ApiParam({ name: 'plantId', type: Number })
  @UseGuards(AuthGuard('jwt'), FeatureGuard)
  @RequireFeature(PlanFeature.QR)
  @Get('label/:plantId')
  async generateLabel(
    @Param('plantId') plantId: string,
    @Request() req: any,
  ) {
    const plant = await this.qrService.getPlantForLabel(+plantId, req.user.organizationId);
    const qrData = await this.qrService.generate(+plantId, req.user.organizationId);

    return {
      plant,
      qrCode: qrData,
      labelData: {
        name: plant.name,
        scientificName: plant.scientificName,
        careInstructions: plant.careInstructions,
        waterRequirement: plant.waterRequirement,
        sunlightRequirement: plant.sunlightRequirement,
        temperatureRange: plant.temperatureMin && plant.temperatureMax
          ? `${plant.temperatureMin}°C - ${plant.temperatureMax}°C`
          : null,
        season: plant.season,
        sku: plant.sku,
        qrCodeUrl: qrData.code,
        qrImageBase64: qrData.qrImageBase64,
      },
    };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate printable label for a specific plant variant' })
  @ApiParam({ name: 'plantId', type: Number })
  @ApiParam({ name: 'variantId', type: Number, description: 'Plant Variant ID (Small / Medium / Large …)' })
  @UseGuards(AuthGuard('jwt'), FeatureGuard)
  @RequireFeature(PlanFeature.QR)
  @Get('label/:plantId/:variantId')
  async generateVariantLabel(
    @Param('plantId') plantId: string,
    @Param('variantId') variantId: string,
    @Request() req: any,
  ) {
    const plant = await this.qrService.getPlantForLabel(+plantId, req.user.organizationId);
    const qrData = await this.qrService.generate(+plantId, req.user.organizationId, +variantId);

    return {
      plant,
      qrCode: qrData,
      labelData: {
        name: plant.name,
        scientificName: plant.scientificName,
        careInstructions: plant.careInstructions,
        waterRequirement: plant.waterRequirement,
        sunlightRequirement: plant.sunlightRequirement,
        temperatureRange: plant.temperatureMin && plant.temperatureMax
          ? `${plant.temperatureMin}°C - ${plant.temperatureMax}°C`
          : null,
        season: plant.season,
        sku: plant.sku,
        variantId: +variantId,
        qrCodeUrl: qrData.code,
        qrImageBase64: qrData.qrImageBase64,
      },
    };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk generate QR codes for plants filtered by category/subcategory' })
  @ApiQuery({ name: 'categoryId', required: false, type: Number, description: 'Filter by category ID' })
  @ApiQuery({ name: 'subcategoryId', required: false, type: Number, description: 'Filter by subcategory ID' })
  @UseGuards(AuthGuard('jwt'), FeatureGuard)
  @RequireFeature(PlanFeature.QR)
  @Post('generate/bulk')
  generateBulk(
    @Request() req: any,
    @Query('categoryId') categoryId?: string,
    @Query('subcategoryId') subcategoryId?: string,
  ) {
    return this.qrService.generateBulk(req.user.organizationId, {
      categoryId: categoryId ? +categoryId : undefined,
      subcategoryId: subcategoryId ? +subcategoryId : undefined,
    });
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get most scanned plants for analytics' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results to return (default 10)' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date for filtering (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date for filtering (ISO string)' })
  @UseGuards(AuthGuard('jwt'))
  @Get('analytics/most-scanned')
  getMostScannedPlants(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.qrService.getMostScannedPlants(
      req.user.organizationId,
      limit ? +limit : 10,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get QR scan analytics summary' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to analyze (default 30)' })
  @UseGuards(AuthGuard('jwt'))
  @Get('analytics/summary')
  getScanAnalytics(@Request() req: any, @Query('days') days?: string) {
    return this.qrService.getScanAnalytics(req.user.organizationId, days ? +days : 30);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Batch generate PDF labels for multiple plants' })
  @ApiQuery({ name: 'plantIds', required: true, description: 'Comma-separated plant IDs' })
  @UseGuards(AuthGuard('jwt'), FeatureGuard)
  @RequireFeature(PlanFeature.QR)
  @Get('labels/batch-pdf')
  async generateBatchLabelsPdf(
    @Query('plantIds') plantIds: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const ids = plantIds.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id));
    const labels: PlantLabelData[] = [];

    for (const plantId of ids) {
      const plant = await this.qrService.getPlantForLabel(plantId, req.user.organizationId);
      if (plant) {
        const qrData = await this.qrService.generate(plantId, req.user.organizationId);
        labels.push({
          name: plant.name,
          scientificName: plant.scientificName || null,
          careInstructions: plant.careInstructions || null,
          waterRequirement: plant.waterRequirement || null,
          sunlightRequirement: plant.sunlightRequirement || null,
          temperatureRange: plant.temperatureMin && plant.temperatureMax
            ? `${plant.temperatureMin}°C - ${plant.temperatureMax}°C`
            : null,
          season: plant.season || null,
          sku: plant.sku || null,
          petToxicity: plant.petToxicity || null,
          qrCodeUrl: qrData.code,
          qrImageBase64: qrData.qrImageBase64,
        });
      }
    }

    // Generate PDF
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=plant-labels.pdf');

    doc.pipe(res);

    // Layout: 2 columns x 5 rows = 10 labels per page
    const labelWidth = 200;
    const labelHeight = 120;
    let col = 0;
    let row = 0;

    for (const label of labels) {
      const x = 50 + col * labelWidth;
      const y = 50 + row * labelHeight;

      // Label border
      doc.rect(x, y, labelWidth, labelHeight).stroke('#ccc');

      // Plant name
      doc.fontSize(14).font('Helvetica-Bold').text(label.name, x + 10, y + 10, { width: labelWidth - 20 });


      // Scientific name
      if (label.scientificName) {
        doc.fontSize(8).font('Helvetica-Italic').text(label.scientificName, x + 10, y + 30, { width: labelWidth - 20 });
      }

      // QR Code (placeholder - would need to embed actual image)
      const qrY = label.scientificName ? y + 55 : y + 45;
      if (label.qrImageBase64) {
        const base64Data = label.qrImageBase64.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(base64Data, 'base64');
        doc.image(imgBuffer, x + 10, qrY, { width: 50, height: 50 });
      }

      // Additional info
      const infoX = x + 70;
      const infoY = qrY;
      doc.fontSize(7).font('Helvetica').text(
        `Water: ${label.waterRequirement || 'N/A'}\nSun: ${label.sunlightRequirement || 'N/A'}\n${label.temperatureRange || ''}`,
        infoX, infoY,
        { width: labelWidth - 80 }
      );

      // Pet toxicity warning
      if (label.petToxicity && label.petToxicity !== 'Non-toxic') {
        doc.fontSize(6).fillColor('red').text(`⚠ ${label.petToxicity} to pets`, x + 10, y + labelHeight - 20, { width: labelWidth - 20 });
        doc.fillColor('#000');
      }

      // Move to next position
      col++;
      if (col >= 2) {
        col = 0;
        row++;
      }
      if (row >= 5) {
        row = 0;
        doc.addPage();
      }
    }

    doc.end();
  }
}

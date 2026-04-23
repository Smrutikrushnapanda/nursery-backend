import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import * as QRCode from 'qrcode';
import { QrCode } from './qr-code.entity';
import { QrScanLog } from './scan-log.entity';
import { Plant } from '../plants/plant.entity';
import { PlantVariant } from '../plants/plant-variant.entity';
import { CartService } from '../cart/cart.service';

@Injectable()
export class QrService {
  constructor(
    @InjectRepository(QrCode)
    private readonly qrRepo: Repository<QrCode>,
    @InjectRepository(QrScanLog)
    private readonly scanLogRepo: Repository<QrScanLog>,
    @InjectRepository(Plant)
    private readonly plantRepo: Repository<Plant>,
    @InjectRepository(PlantVariant)
    private readonly variantRepo: Repository<PlantVariant>,
    private readonly cartService: CartService,
  ) {}

  private getPublicQrBaseUrl(): string {
    const raw =
      process.env.QR_PUBLIC_BASE_URL?.trim() ||
      process.env.FRONTEND_URL?.trim() ||
      'http://localhost:3000';

    try {
      const url = new URL(raw);
      return url.toString().replace(/\/+$/, '');
    } catch {
      return 'http://localhost:3000';
    }
  }

  private buildPlantQrUrl(plantId: number): string {
    return `${this.getPublicQrBaseUrl()}/plant/${plantId}`;
  }

  private decodeInput(value: string): string {
    try {
      return decodeURIComponent(value).trim();
    } catch {
      return value.trim();
    }
  }

  private extractPlantId(value: string): number | null {
    const normalized = this.decodeInput(value);
    const numeric = Number(normalized);
    if (Number.isInteger(numeric) && numeric > 0) {
      return numeric;
    }

    try {
      const parsedUrl = new URL(normalized);

      const queryId =
        parsedUrl.searchParams.get('plantId') ||
        parsedUrl.searchParams.get('productId') ||
        parsedUrl.searchParams.get('id');

      if (queryId) {
        const parsedQueryId = Number(queryId);
        if (Number.isInteger(parsedQueryId) && parsedQueryId > 0) {
          return parsedQueryId;
        }
      }

      const segments = parsedUrl.pathname
        .split('/')
        .filter(Boolean)
        .map((segment) => segment.toLowerCase());

      for (let i = 0; i < segments.length - 1; i += 1) {
        if (
          ['plant', 'plants', 'product', 'products', 'p'].includes(segments[i])
        ) {
          const parsedSegmentId = Number(segments[i + 1]);
          if (Number.isInteger(parsedSegmentId) && parsedSegmentId > 0) {
            return parsedSegmentId;
          }
        }
      }

      const lastSegment = segments[segments.length - 1];
      if (lastSegment) {
        const parsedLast = Number(lastSegment);
        if (Number.isInteger(parsedLast) && parsedLast > 0) {
          return parsedLast;
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  private createScanMetadata(
    metadata?: {
      scannedBy?: string;
      scanLocation?: string;
      deviceInfo?: string;
      ipAddress?: string;
    },
  ): DeepPartial<QrScanLog> {
    return {
      scannedBy: metadata?.scannedBy || undefined,
      scanLocation: metadata?.scanLocation || undefined,
      deviceInfo: metadata?.deviceInfo || undefined,
      ipAddress: metadata?.ipAddress || undefined,
    };
  }

  private async logScan(
    payload: {
      qrCode: string;
      plantId: number;
      organizationId: string;
    },
    metadata?: {
      scannedBy?: string;
      scanLocation?: string;
      deviceInfo?: string;
      ipAddress?: string;
    },
  ) {
    const scanLog = this.scanLogRepo.create({
      ...payload,
      ...this.createScanMetadata(metadata),
    });
    await this.scanLogRepo.save(scanLog);
  }

  private async resolveVariantForCart(
    plantId: number,
    organizationId: string,
    variantId?: number,
  ): Promise<PlantVariant> {
    if (variantId) {
      const selected = await this.variantRepo.findOne({
        where: { id: variantId, plantId, organizationId, status: true },
      });
      if (!selected) {
        throw new BadRequestException('Selected variant is not valid for this plant');
      }
      return selected;
    }

    const firstActiveVariant = await this.variantRepo.findOne({
      where: { plantId, organizationId, status: true },
      order: { id: 'ASC' },
    });

    if (!firstActiveVariant) {
      throw new BadRequestException('No active variant found for this plant');
    }

    return firstActiveVariant;
  }

  async generate(plantId: number, organizationId: string) {
    const plant = await this.plantRepo.findOne({
      where: { id: plantId, organizationId, status: true },
      relations: ['category', 'subcategory', 'variants'],
    });

    if (!plant) throw new NotFoundException('Plant not found');

    const code = this.buildPlantQrUrl(plantId);
    const existing = await this.qrRepo.findOne({ where: { plantId } });
    if (existing) {
      if (existing.code !== code) {
        existing.code = code;
        existing.qrImageBase64 = await QRCode.toDataURL(code);
        await this.qrRepo.save(existing);
      }

      await this.plantRepo.update(plantId, { qrCodeUrl: code });

      return {
        code,
        qrImageBase64: existing.qrImageBase64,
        plantId,
        id: existing.id,
      };
    }

    const qrImageBase64 = await QRCode.toDataURL(code);

    const qrCode = this.qrRepo.create({
      code,
      plantId,
      organizationId,
      qrImageBase64,
    });

    const saved = await this.qrRepo.save(qrCode);

    // Store the QR code reference on the plant
    await this.plantRepo.update(plantId, { qrCodeUrl: code });

    return { code, qrImageBase64, plantId, id: saved.id };
  }

  async scan(code: string, metadata?: {
    scannedBy?: string;
    scanLocation?: string;
    deviceInfo?: string;
    ipAddress?: string;
  }) {
    const normalizedCode = this.decodeInput(code);
    const qrCode = await this.qrRepo.findOne({
      where: { code: normalizedCode },
      relations: ['plant', 'plant.category', 'plant.subcategory', 'plant.variants'],
    });

    if (!qrCode) {
      const plantId = this.extractPlantId(normalizedCode);
      if (plantId) {
        return this.scanById(String(plantId), metadata);
      }
      throw new NotFoundException('QR code not found');
    }

    await this.logScan(
      {
        qrCode: qrCode.code,
        plantId: qrCode.plantId,
        organizationId: qrCode.organizationId,
      },
      metadata,
    );

    return {
      code: qrCode.code,
      id: qrCode.id,
      plant: qrCode.plant,
      scannedAt: new Date(),
    };
  }

  async scanById(productId: string, metadata?: {
    scannedBy?: string;
    scanLocation?: string;
    deviceInfo?: string;
    ipAddress?: string;
  }) {
    const normalizedInput = this.decodeInput(productId);
    const extractedPlantId = this.extractPlantId(normalizedInput);

    // Try to find plant by ID
    const plant = await this.plantRepo.findOne({
      where: extractedPlantId ? { id: extractedPlantId } : { id: -1 },
      relations: ['category', 'subcategory', 'variants'],
    });

    if (!plant) {
      // Try to find by qrCodeUrl
      const qrCode = await this.qrRepo.findOne({
        where: { code: normalizedInput },
        relations: ['plant', 'plant.category', 'plant.subcategory', 'plant.variants'],
      });

      if (!qrCode) {
        throw new NotFoundException('Product not found');
      }

      await this.logScan(
        {
          qrCode: qrCode.code,
          plantId: qrCode.plantId,
          organizationId: qrCode.organizationId,
        },
        metadata,
      );

      return {
        code: qrCode.code,
        id: qrCode.id,
        plant: qrCode.plant,
        scannedAt: new Date(),
      };
    }

    await this.logScan(
      {
        qrCode: plant.qrCodeUrl || normalizedInput,
        plantId: plant.id,
        organizationId: plant.organizationId,
      },
      metadata,
    );

    return {
      code: plant.qrCodeUrl || normalizedInput,
      id: plant.id,
      plant,
      scannedAt: new Date(),
    };
  }

  async scanForSeller(input: {
    code?: string;
    productId?: string;
    variantId?: number;
    quantity?: number;
    organizationId: string;
    scannedBy: string;
    scanLocation?: string;
    deviceInfo?: string;
    ipAddress?: string;
  }) {
    const quantity = input.quantity && input.quantity > 0 ? input.quantity : 1;

    if (!input.code && !input.productId) {
      throw new BadRequestException('code or productId is required');
    }

    const scanResult = input.code
      ? await this.scan(input.code, {
          scannedBy: input.scannedBy,
          scanLocation: input.scanLocation,
          deviceInfo: input.deviceInfo,
          ipAddress: input.ipAddress,
        })
      : await this.scanById(input.productId!, {
          scannedBy: input.scannedBy,
          scanLocation: input.scanLocation,
          deviceInfo: input.deviceInfo,
          ipAddress: input.ipAddress,
        });

    const scannedPlant = scanResult.plant;
    if (!scannedPlant) {
      throw new NotFoundException('Scanned plant not found');
    }

    if (scannedPlant.organizationId !== input.organizationId) {
      throw new BadRequestException(
        'This QR code belongs to a different organization',
      );
    }

    const variant = await this.resolveVariantForCart(
      scannedPlant.id,
      input.organizationId,
      input.variantId,
    );

    const cart = await this.cartService.add(
      {
        variantId: variant.id,
        quantity,
      },
      input.scannedBy,
      input.organizationId,
    );

    return {
      scan: scanResult,
      addedVariant: {
        id: variant.id,
        size: variant.size,
        sku: variant.sku,
        price: Number(variant.price),
      },
      quantity,
      cart,
    };
  }

  async getScanLogs(organizationId: string, plantId?: number) {
    const where: any = { organizationId };
    if (plantId) where.plantId = plantId;

    return this.scanLogRepo.find({
      where,
      relations: ['plant'],
      order: { scannedAt: 'DESC' },
      take: 100,
    });
  }

  async getPlantForLabel(plantId: number, organizationId: string) {
    const plant = await this.plantRepo.findOne({
      where: { id: plantId, organizationId, status: true },
      relations: ['category', 'subcategory'],
    });

    if (!plant) throw new NotFoundException('Plant not found');

    return plant;
  }

  async generateBulk(organizationId: string, filters: {
    categoryId?: number;
    subcategoryId?: number;
  }) {
    // Build query for plants based on filters
    const query = this.plantRepo
      .createQueryBuilder('plant')
      .where('plant.organizationId = :organizationId', { organizationId })
      .andWhere('plant.status = :status', { status: true });

    if (filters.categoryId) {
      query.andWhere('plant.categoryId = :categoryId', { categoryId: filters.categoryId });
    }

    if (filters.subcategoryId) {
      query.andWhere('plant.subcategoryId = :subcategoryId', { subcategoryId: filters.subcategoryId });
    }

    const plants = await query.getMany();

    if (plants.length === 0) {
      return {
        generated: [],
        skipped: [],
        summary: { total: 0, generated: 0, skipped: 0 },
      };
    }

    const results = {
      generated: [] as Array<{ plantId: number; code: string; qrImageBase64: string }>,
      skipped: [] as Array<{ plantId: number; reason: string }>,
    };

    for (const plant of plants) {
      // Check if QR already exists
      const existing = await this.qrRepo.findOne({ where: { plantId: plant.id } });
      if (existing) {
        results.skipped.push({ plantId: plant.id, reason: 'QR code already exists' });
        continue;
      }

      // Generate new QR code
      const code = this.buildPlantQrUrl(plant.id);
      const qrImageBase64 = await QRCode.toDataURL(code);

      const qrCode = this.qrRepo.create({
        code,
        plantId: plant.id,
        organizationId,
        qrImageBase64,
      });

      await this.qrRepo.save(qrCode);

      // Store QR code reference on the plant
      await this.plantRepo.update(plant.id, { qrCodeUrl: code });

      results.generated.push({ plantId: plant.id, code, qrImageBase64 });
    }

    return {
      ...results,
      summary: {
        total: plants.length,
        generated: results.generated.length,
        skipped: results.skipped.length,
      },
    };
  }

  async getMostScannedPlants(organizationId: string, limit: number = 10, startDate?: Date, endDate?: Date) {
    const query = this.scanLogRepo
      .createQueryBuilder('scanLog')
      .select('scanLog.plantId', 'plantId')
      .addSelect('COUNT(*)', 'scanCount')
      .addSelect('MAX(scanLog.scannedAt)', 'lastScannedAt')
      .where('scanLog.organizationId = :organizationId', { organizationId });

    if (startDate) {
      query.andWhere('scanLog.scannedAt >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('scanLog.scannedAt <= :endDate', { endDate });
    }

    const results = await query
      .groupBy('scanLog.plantId')
      .orderBy('scanCount', 'DESC')
      .limit(limit)
      .getRawMany();

    // Get plant details for each result
    const plantIds = results.map(r => r.plantId);
    const plants = await this.plantRepo.findByIds(plantIds);
    const plantMap = new Map(plants.map(p => [p.id, p]));

    return results.map(r => ({
      plantId: r.plantId,
      scanCount: parseInt(r.scanCount),
      lastScannedAt: r.lastScannedAt,
      plant: plantMap.get(r.plantId) || null,
    }));
  }

  async getScanAnalytics(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Count total scans in period
    const totalScans = await this.scanLogRepo
      .createQueryBuilder('scanLog')
      .select('COUNT(*)', 'count')
      .where('scanLog.organizationId = :organizationId', { organizationId })
      .andWhere('scanLog.scannedAt >= :startDate', { startDate })
      .getRawOne();

    const uniquePlants = await this.scanLogRepo
      .createQueryBuilder('scanLog')
      .select('COUNT(DISTINCT scanLog.plantId)', 'count')
      .where('scanLog.organizationId = :organizationId', { organizationId })
      .andWhere('scanLog.scannedAt >= :startDate', { startDate })
      .getRawOne();

    const uniqueScanners = await this.scanLogRepo
      .createQueryBuilder('scanLog')
      .select('COUNT(DISTINCT scanLog.scannedBy)', 'count')
      .where('scanLog.organizationId = :organizationId', { organizationId })
      .andWhere('scanLog.scannedAt >= :startDate', { startDate })
      .andWhere('scanLog.scannedBy IS NOT NULL')
      .getRawOne();

    // Get daily scan counts for the last 30 days
    const dailyScans = await this.scanLogRepo
      .createQueryBuilder('scanLog')
      .select('DATE(scanLog.scannedAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('scanLog.organizationId = :organizationId', { organizationId })
      .andWhere('scanLog.scannedAt >= :startDate', { startDate })
      .groupBy('DATE(scanLog.scannedAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      totalScans: parseInt(totalScans?.count || '0'),
      uniquePlantsScanned: parseInt(uniquePlants?.count || '0'),
      uniqueScanners: parseInt(uniqueScanners?.count || '0'),
      periodDays: days,
      dailyScans,
    };
  }
}

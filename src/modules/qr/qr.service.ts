import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial, IsNull } from 'typeorm';
import * as QRCode from 'qrcode';
import { QrCode } from './qr-code.entity';
import { QrScanLog } from './scan-log.entity';
import { Plant } from '../plants/plant.entity';
import { PlantVariant } from '../plants/plant-variant.entity';
import { CartService } from '../cart/cart.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PlanFeature } from '../plans/entities/plan.entity';

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
    private readonly subscriptionsService: SubscriptionsService,
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

  private buildPlantQrUrl(plantId: number, variantId?: number | null): string {
    const base = `${this.getPublicQrBaseUrl()}/plant/${plantId}`;
    return variantId ? `${base}?variantId=${variantId}` : base;
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

  private async findPlantByIdentifier(
    identifier: string,
    organizationId?: string,
  ): Promise<{ plant: Plant; matchedVariantId?: number } | null> {
    const extractedId = this.extractPlantId(identifier);

    // First, try to find by variant ID (for numeric identifiers)
    if (extractedId) {
      const variantById = await this.variantRepo.findOne({
        where: organizationId
          ? { id: extractedId, organizationId, status: true }
          : { id: extractedId, status: true },
        relations: ['plant', 'plant.category', 'plant.subcategory', 'plant.variants'],
      });
      if (variantById?.plant) {
        return { plant: variantById.plant, matchedVariantId: variantById.id };
      }

      // If not found as variant, try plant ID
      const plantById = await this.plantRepo.findOne({
        where: organizationId
          ? { id: extractedId, organizationId }
          : { id: extractedId },
        relations: ['category', 'subcategory', 'variants'],
      });
      if (plantById) {
        return { plant: plantById };
      }
    }

    const normalizedIdentifier = identifier.toLowerCase();

    // Try to find by plant SKU
    const plantSkuQuery = this.plantRepo
      .createQueryBuilder('plant')
      .leftJoinAndSelect('plant.category', 'category')
      .leftJoinAndSelect('plant.subcategory', 'subcategory')
      .leftJoinAndSelect('plant.variants', 'variants')
      .where('LOWER(plant.sku) = :identifier', { identifier: normalizedIdentifier });

    if (organizationId) {
      plantSkuQuery.andWhere('plant.organizationId = :organizationId', {
        organizationId,
      });
    }

    const plantBySku = await plantSkuQuery.orderBy('plant.id', 'ASC').getOne();
    if (plantBySku) {
      return { plant: plantBySku };
    }

    // Try to find by variant SKU
    const variantSkuQuery = this.variantRepo
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.plant', 'plant')
      .leftJoinAndSelect('plant.category', 'category')
      .leftJoinAndSelect('plant.subcategory', 'subcategory')
      .leftJoinAndSelect('plant.variants', 'variants')
      .where('LOWER(variant.sku) = :identifier', { identifier: normalizedIdentifier })
      .andWhere('variant.status = true');

    if (organizationId) {
      variantSkuQuery.andWhere('variant.organizationId = :organizationId', {
        organizationId,
      });
    }

    const variantBySku = await variantSkuQuery.orderBy('variant.id', 'ASC').getOne();
    if (variantBySku?.plant) {
      return { plant: variantBySku.plant, matchedVariantId: variantBySku.id };
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

  private async ensureBuyerCanViewScanDetails(
    organizationId: string,
    skipPlanValidation?: boolean,
  ) {
    if (skipPlanValidation) {
      return;
    }

    const activeSubscription =
      await this.subscriptionsService.getActiveForFeatureCheck(organizationId);

    if (!activeSubscription?.plan) {
      throw new ForbiddenException('No active subscription found for QR scan');
    }

    const features = activeSubscription.plan.features ?? [];
    const canBuyerScan =
      features.includes(PlanFeature.QR) &&
      features.includes(PlanFeature.ANALYTICS);

    if (!canBuyerScan) {
      throw new ForbiddenException(
        'Buyer QR scan is available only for premium plan',
      );
    }
  }

  async generate(plantId: number, organizationId: string, variantId?: number | null) {
    const plant = await this.plantRepo.findOne({
      where: { id: plantId, organizationId, status: true },
      relations: ['category', 'subcategory', 'variants'],
    });

    if (!plant) throw new NotFoundException('Plant not found');

    // When a variantId is provided, validate it belongs to this plant
    if (variantId) {
      const variant = await this.variantRepo.findOne({
        where: { id: variantId, plantId, organizationId, status: true },
      });
      if (!variant) {
        throw new NotFoundException(`Variant ${variantId} not found for plant ${plantId}`);
      }
    }

    const code = this.buildPlantQrUrl(plantId, variantId);

    // Look up existing QR by plant + variant combo
    const existing = await this.qrRepo.findOne({
      where: variantId !== undefined
        ? variantId !== null
          ? { plantId, variantId }
          : { plantId, variantId: IsNull() }
        : { plantId },
    });

    if (existing) {
      if (existing.code !== code) {
        existing.code = code;
        existing.qrImageBase64 = await QRCode.toDataURL(code);
        await this.qrRepo.save(existing);
      }

      // Only update the plant-level qrCodeUrl when generating the generic (no-variant) QR
      if (!variantId) {
        await this.plantRepo.update(plantId, { qrCodeUrl: code });
      }

      return {
        code,
        qrImageBase64: existing.qrImageBase64,
        plantId,
        variantId: variantId ?? null,
        id: existing.id,
        alreadyGenerated: 1, // QR already existed
      };
    }

    const qrImageBase64 = await QRCode.toDataURL(code);

    const qrCode = this.qrRepo.create({
      code,
      plantId,
      variantId: variantId ?? null,
      organizationId,
      qrImageBase64,
    });

    const saved = await this.qrRepo.save(qrCode);

    // Store the QR code reference on the plant only for the generic QR
    if (!variantId) {
      await this.plantRepo.update(plantId, { qrCodeUrl: code });
    }

    return { code, qrImageBase64, plantId, variantId: variantId ?? null, id: saved.id, alreadyGenerated: 0 }; // Newly generated
  }

  async scan(code: string, metadata?: {
    scannedBy?: string;
    scanLocation?: string;
    deviceInfo?: string;
    ipAddress?: string;
  }, options?: {
    skipBuyerPlanValidation?: boolean;
    organizationId?: string;
  }) {
    const normalizedCode = this.decodeInput(code);
    const qrCode = await this.qrRepo.findOne({
      where: { code: normalizedCode },
      relations: ['plant', 'plant.category', 'plant.subcategory', 'plant.variants'],
    });

    if (!qrCode) {
      const plantId = this.extractPlantId(normalizedCode);
      if (plantId) {
        return this.scanById(String(plantId), metadata, options);
      }
      throw new NotFoundException('QR code not found');
    }

    await this.ensureBuyerCanViewScanDetails(
      qrCode.organizationId,
      options?.skipBuyerPlanValidation,
    );

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
      matchedVariantId: qrCode.variantId ?? undefined,
      scannedAt: new Date(),
    };
  }

  async scanById(productId: string, metadata?: {
    scannedBy?: string;
    scanLocation?: string;
    deviceInfo?: string;
    ipAddress?: string;
  }, options?: {
    skipBuyerPlanValidation?: boolean;
    organizationId?: string;
  }) {
    const normalizedInput = this.decodeInput(productId);
    const resolvedPlant = await this.findPlantByIdentifier(
      normalizedInput,
      options?.organizationId,
    );

    if (!resolvedPlant) {
      // Try to find by qrCodeUrl
      const qrCode = await this.qrRepo.findOne({
        where: { code: normalizedInput },
        relations: ['plant', 'plant.category', 'plant.subcategory', 'plant.variants'],
      });

      if (!qrCode) {
        throw new NotFoundException('Product not found');
      }

      await this.ensureBuyerCanViewScanDetails(
        qrCode.organizationId,
        options?.skipBuyerPlanValidation,
      );

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
        matchedVariantId: qrCode.variantId ?? undefined,
        scannedAt: new Date(),
      };
    }

    const plant = resolvedPlant.plant;

    await this.ensureBuyerCanViewScanDetails(
      plant.organizationId,
      options?.skipBuyerPlanValidation,
    );

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
      matchedVariantId: resolvedPlant.matchedVariantId,
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

    // If variantId is provided directly, fetch the variant and its plant
    if (input.variantId) {
      const variant = await this.variantRepo.findOne({
        where: {
          id: input.variantId,
          organizationId: input.organizationId,
          status: true,
        },
        relations: ['plant', 'plant.category', 'plant.subcategory', 'plant.variants'],
      });

      if (!variant) {
        throw new NotFoundException(`Variant #${input.variantId} not found`);
      }

      if (!variant.plant) {
        throw new NotFoundException('Plant data not found for this variant');
      }

      const cart = await this.cartService.add(
        {
          variantId: variant.id,
          quantity,
        },
        input.scannedBy,
        input.organizationId,
      );

      return {
        scan: {
          code: '',
          id: variant.plant.id,
          plant: variant.plant,
          matchedVariantId: variant.id,
          scannedAt: new Date(),
        },
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

    if (!input.code && !input.productId) {
      throw new BadRequestException('code or productId is required');
    }

    const scanResult = input.code
      ? await this.scan(input.code, {
          scannedBy: input.scannedBy,
          scanLocation: input.scanLocation,
          deviceInfo: input.deviceInfo,
          ipAddress: input.ipAddress,
        }, {
          skipBuyerPlanValidation: true,
          organizationId: input.organizationId,
        })
      : await this.scanById(input.productId!, {
          scannedBy: input.scannedBy,
          scanLocation: input.scanLocation,
          deviceInfo: input.deviceInfo,
          ipAddress: input.ipAddress,
        }, {
          skipBuyerPlanValidation: true,
          organizationId: input.organizationId,
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

    const matchedVariantId =
      input.variantId ??
      (typeof scanResult.matchedVariantId === 'number'
        ? scanResult.matchedVariantId
        : undefined);

    const variant = await this.resolveVariantForCart(
      scannedPlant.id,
      input.organizationId,
      matchedVariantId,
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
    plantIds?: number[];
  }) {
    // Build query for plants based on filters (OR logic for plantIds with category/subcategory)
    const query = this.plantRepo
      .createQueryBuilder('plant')
      .where('plant.organizationId = :organizationId', { organizationId })
      .andWhere('plant.status = :status', { status: true });

    const conditions: string[] = [];
    const params: Record<string, any> = { organizationId, status: true };

    if (filters.categoryId) {
      conditions.push('plant.categoryId = :categoryId');
      params.categoryId = filters.categoryId;
    }

    if (filters.subcategoryId) {
      conditions.push('plant.subcategoryId = :subcategoryId');
      params.subcategoryId = filters.subcategoryId;
    }

    if (filters.plantIds && filters.plantIds.length > 0) {
      conditions.push('plant.id IN (:...plantIds)');
      params.plantIds = filters.plantIds;
    }

    // Add OR conditions if any filter is present
    if (conditions.length > 0) {
      query.andWhere(`(${conditions.join(' OR ')})`, params);
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
      generated: [] as Array<{ plantId: number; code: string; qrImageBase64: string; alreadyGenerated: number }>,
      skipped: [] as Array<{ plantId: number; reason: string; alreadyGenerated: number }>,
    };

    for (const plant of plants) {
      // Check if QR already exists
      const existing = await this.qrRepo.findOne({ where: { plantId: plant.id } });
      if (existing) {
        results.skipped.push({ plantId: plant.id, reason: 'QR code already exists', alreadyGenerated: 1 });
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

      results.generated.push({ plantId: plant.id, code, qrImageBase64, alreadyGenerated: 0 });
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

    const scanSourceCounts = await this.scanLogRepo
      .createQueryBuilder('scanLog')
      .select(
        'SUM(CASE WHEN scanLog.scannedBy IS NOT NULL THEN 1 ELSE 0 END)',
        'sellerCount',
      )
      .addSelect(
        'SUM(CASE WHEN scanLog.scannedBy IS NULL THEN 1 ELSE 0 END)',
        'buyerCount',
      )
      .where('scanLog.organizationId = :organizationId', { organizationId })
      .andWhere('scanLog.scannedAt >= :startDate', { startDate })
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
      scannedBySeller: parseInt(scanSourceCounts?.sellerCount || '0'),
      scannedByBuyer: parseInt(scanSourceCounts?.buyerCount || '0'),
      periodDays: days,
      dailyScans,
    };
  }
}

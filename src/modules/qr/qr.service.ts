import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import * as QRCode from 'qrcode';
import { QrCode } from './qr-code.entity';
import { QrScanLog } from './scan-log.entity';
import { Plant } from '../plants/plant.entity';

@Injectable()
export class QrService {
  constructor(
    @InjectRepository(QrCode)
    private readonly qrRepo: Repository<QrCode>,
    @InjectRepository(QrScanLog)
    private readonly scanLogRepo: Repository<QrScanLog>,
    @InjectRepository(Plant)
    private readonly plantRepo: Repository<Plant>,
  ) {}

  async generate(plantId: number, organizationId: string) {
    const plant = await this.plantRepo.findOne({
      where: { id: plantId, organizationId, status: true },
      relations: ['category', 'subcategory', 'variants'],
    });

    if (!plant) throw new NotFoundException('Plant not found');

    const existing = await this.qrRepo.findOne({ where: { plantId } });
    if (existing) throw new ConflictException('QR code already exists for this plant');

    const code = `PLT-${organizationId.slice(0, 8)}-${plantId}-${Date.now()}`;
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
    const qrCode = await this.qrRepo.findOne({
      where: { code },
      relations: ['plant', 'plant.category', 'plant.subcategory', 'plant.variants'],
    });

    if (!qrCode) throw new NotFoundException('QR code not found');

    // Log the scan event
    const scanLogData: DeepPartial<QrScanLog> = {
      qrCode: code,
      plantId: qrCode.plantId,
      organizationId: qrCode.organizationId,
      scannedBy: metadata?.scannedBy || undefined,
      scanLocation: metadata?.scanLocation || undefined,
      deviceInfo: metadata?.deviceInfo || undefined,
      ipAddress: metadata?.ipAddress || undefined,
    };
    const scanLog = this.scanLogRepo.create(scanLogData);
    await this.scanLogRepo.save(scanLog);

    return {
      code: qrCode.code,
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
    // Try to find plant by ID
    const plant = await this.plantRepo.findOne({
      where: { id: +productId },
      relations: ['category', 'subcategory', 'variants'],
    });

    if (!plant) {
      // Try to find by qrCodeUrl
      const qrCode = await this.qrRepo.findOne({
        where: { code: productId },
        relations: ['plant', 'plant.category', 'plant.subcategory', 'plant.variants'],
      });
      
      if (!qrCode) {
        throw new NotFoundException('Product not found');
      }
      
      // Log the scan event
      const scanLogData: DeepPartial<QrScanLog> = {
        qrCode: qrCode.code,
        plantId: qrCode.plantId,
        organizationId: qrCode.organizationId,
        scannedBy: metadata?.scannedBy || undefined,
        scanLocation: metadata?.scanLocation || undefined,
        deviceInfo: metadata?.deviceInfo || undefined,
        ipAddress: metadata?.ipAddress || undefined,
      };
      const scanLog = this.scanLogRepo.create(scanLogData);
      await this.scanLogRepo.save(scanLog);

      return {
        code: qrCode.code,
        id: qrCode.id,
        plant: qrCode.plant,
        scannedAt: new Date(),
      };
    }

    // Log the scan event
    const scanLogData: DeepPartial<QrScanLog> = {
      qrCode: `ID-${productId}`,
      plantId: plant.id,
      organizationId: plant.organizationId,
      scannedBy: metadata?.scannedBy || undefined,
      scanLocation: metadata?.scanLocation || undefined,
      deviceInfo: metadata?.deviceInfo || undefined,
      ipAddress: metadata?.ipAddress || undefined,
    };
    const scanLog = this.scanLogRepo.create(scanLogData);
    await this.scanLogRepo.save(scanLog);

    return {
      code: plant.qrCodeUrl || `ID-${productId}`,
      id: plant.id,
      plant,
      scannedAt: new Date(),
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
      const code = `PLT-${organizationId.slice(0, 8)}-${plant.id}-${Date.now()}`;
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

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { PlantVariant } from '../plants/plant-variant.entity';
import { QrCode } from '../qr/qr-code.entity';
import { PlantStock } from './entities/plant-stock.entity';
import { StockLog, StockLogType } from './entities/stock-log.entity';

type InventoryQrCodeResponse = {
  code: string | null;
  qrImageBase64: string | null;
  plantId: number | null;
  variantId: number | null;
  id: number | null;
  alreadyGenerated: 0 | 1;
};

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(PlantStock)
    private readonly stockRepo: Repository<PlantStock>,
    @InjectRepository(QrCode)
    private readonly qrRepo: Repository<QrCode>,
    private readonly dataSource: DataSource,
  ) {}

  addStock(
    organizationId: string,
    variantId: number,
    quantity: number,
    reference?: string,
  ) {
    return this.applyStockChange(
      organizationId,
      variantId,
      quantity,
      StockLogType.IN,
      reference,
    );
  }

  removeStock(
    organizationId: string,
    variantId: number,
    quantity: number,
    reference?: string,
  ) {
    return this.applyStockChange(
      organizationId,
      variantId,
      quantity,
      StockLogType.OUT,
      reference,
    );
  }

  markDeadStock(
    organizationId: string,
    variantId: number,
    quantity: number,
    reference?: string,
  ) {
    return this.applyStockChange(
      organizationId,
      variantId,
      quantity,
      StockLogType.DEAD,
      reference,
    );
  }

   async getAllStock(
     organizationId: string,
     filters: {
       category?: string;
       subcategory?: string;
       status?: string;
       size?: string;
       minPrice?: number;
       maxPrice?: number;
       minQuantity?: number;
       maxQuantity?: number;
       activity?: string;
     } = {}
   ) {
      // Build the base query with relations
      const query = this.stockRepo.createQueryBuilder('stock')
        .where('stock.organizationId = :organizationId', { organizationId })
        .leftJoinAndSelect('stock.variant', 'variant')
        .leftJoinAndSelect('variant.plant', 'plant')
        .leftJoinAndSelect('plant.category', 'category')
        .leftJoinAndSelect('plant.subcategory', 'subcategory')
        // Left join with QR codes for activity filtering
        .leftJoin('qr_codes', 'qr', `(qr.variantId = stock.variantId OR (qr.variantId IS NULL AND qr.plantId = variant.plantId))`)
        .orderBy('variant.id', 'ASC')
        .distinct();

     // Apply filters
     if (filters.category) {
       query.andWhere('category.name ILIKE :category', { category: `%${filters.category}%` });
     }
     
     if (filters.subcategory) {
       query.andWhere('subcategory.name ILIKE :subcategory', { subcategory: `%${filters.subcategory}%` });
     }
     
     if (filters.size) {
       query.andWhere('variant.size ILIKE :size', { size: `%${filters.size}%` });
     }
     
     if (filters.minPrice !== undefined) {
       query.andWhere('variant.price >= :minPrice', { minPrice: filters.minPrice });
     }
     
     if (filters.maxPrice !== undefined) {
       query.andWhere('variant.price <= :maxPrice', { maxPrice: filters.maxPrice });
     }
     
     if (filters.minQuantity !== undefined) {
       query.andWhere('stock.quantity >= :minQuantity', { minQuantity: filters.minQuantity });
     }
     
     if (filters.maxQuantity !== undefined) {
       query.andWhere('stock.quantity <= :maxQuantity', { maxQuantity: filters.maxQuantity });
     }
     
      // Status filter (based on quantity)
      if (filters.status) {
        switch (filters.status.toLowerCase()) {
          case 'in stock':
            query.andWhere('stock.quantity > 5');
            break;
          case 'low stock':
            query.andWhere('stock.quantity > 0 AND stock.quantity <= 5');
            break;
          case 'out of stock':
            query.andWhere('stock.quantity <= 0');
            break;
          default:
            // No filter for unknown status values
            break;
        }
      }

      // Activity filter (based on QR code generation and scan activity)
      if (filters.activity) {
        switch (filters.activity.toLowerCase()) {
          case 'generated':
            query.andWhere('qr.id IS NOT NULL');
            break;
          case 'not_generated':
            query.andWhere('qr.id IS NULL');
            break;
          case 'most_scanned':
            query.leftJoin('qr_scan_logs', 'scanLog', 'scanLog.plantId = variant.plantId');
            query.addSelect('COUNT(scanLog.id)', 'scanCount');
            query.groupBy('stock.id, variant.id, plant.id, category.id, subcategory.id, qr.id');
            query.orderBy('scanCount', 'DESC');
            break;
          case 'least_scanned':
            query.leftJoin('qr_scan_logs', 'scanLog', 'scanLog.plantId = variant.plantId');
            query.addSelect('COUNT(scanLog.id)', 'scanCount');
            query.groupBy('stock.id, variant.id, plant.id, category.id, subcategory.id, qr.id');
            query.orderBy('scanCount', 'ASC');
            break;
          case 'recently_scanned':
            query.leftJoin('qr_scan_logs', 'scanLog', 'scanLog.plantId = variant.plantId');
            query.addSelect('MAX(scanLog.scannedAt)', 'lastScannedAt');
            query.groupBy('stock.id, variant.id, plant.id, category.id, subcategory.id, qr.id');
            query.orderBy('lastScannedAt', 'DESC');
            query.andWhere('scanLog.scannedAt IS NOT NULL');
            break;
          case 'never_scanned':
            query.leftJoin('qr_scan_logs', 'scanLog', 'scanLog.plantId = variant.plantId');
            query.andWhere('scanLog.id IS NULL');
            break;
          default:
            // No filter for unknown activity values
            break;
        }
      }

     // Execute query to get stocks with relations
     const stocks = await query.getMany();

     if (stocks.length === 0) {
       return stocks;
     }

     // Get QR codes for the stocks
     const variantIds = stocks
       .map((stock) => stock.variantId)
       .filter((variantId): variantId is number => Number.isInteger(variantId));
     
     const plantIds = stocks
       .map((stock) => stock.variant?.plant?.id)
       .filter((plantId): plantId is number => Number.isInteger(plantId));

     const qrQuery = this.qrRepo
       .createQueryBuilder('qr')
       .where('qr.organizationId = :organizationId', { organizationId });

     if (variantIds.length > 0 && plantIds.length > 0) {
       qrQuery.andWhere(
         new Brackets((qb) => {
           qb.where('qr.variantId IN (:...variantIds)', { variantIds }).orWhere(
             'qr.variantId IS NULL AND qr.plantId IN (:...plantIds)',
             { plantIds },
           );
         }),
       );
     } else if (variantIds.length > 0) {
       qrQuery.andWhere('qr.variantId IN (:...variantIds)', { variantIds });
     } else if (plantIds.length > 0) {
       qrQuery.andWhere('qr.variantId IS NULL AND qr.plantId IN (:...plantIds)', {
         plantIds,
       });
     }

     const qrCodes = await qrQuery.getMany();
     const qrByVariantId = new Map<number, QrCode>();
     const qrByPlantId = new Map<number, QrCode>();

     for (const qrCode of qrCodes) {
       if (qrCode.variantId !== null) {
         qrByVariantId.set(qrCode.variantId, qrCode);
       } else {
         qrByPlantId.set(qrCode.plantId, qrCode);
       }
     }

     // Map stocks to response format with QR codes
     return stocks.map((stock) => {
       const plantId = stock.variant?.plant?.id;
       const variantQrCode = qrByVariantId.get(stock.variantId) ?? null;
       const plantQrCode = plantId ? qrByPlantId.get(plantId) ?? null : null;
       const selectedQrCode = variantQrCode ?? plantQrCode;

       return {
         ...stock,
         qrCode: this.buildInventoryQrCode(
           selectedQrCode,
           plantId,
           stock.variantId,
         ),
       };
     });
   }

  async getStock(organizationId: string, variantId: number) {
    this.assertPositiveVariantId(variantId);
    await this.ensureVariantBelongsToOrganization(
      variantId,
      organizationId,
      this.dataSource.manager,
    );

    const stock = await this.stockRepo.findOne({
      where: { variantId, organizationId },
    });

    if (stock) {
      return stock;
    }

    try {
      return await this.stockRepo.save(
        this.stockRepo.create({
          variantId,
          organizationId,
          quantity: 0,
        }),
      );
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        return this.stockRepo.findOneOrFail({
          where: { variantId, organizationId },
        });
      }
      throw error;
    }
  }

  async updateStock(
    organizationId: string,
    variantId: number,
    quantity: number,
    reason?: string,
  ) {
    this.assertPositiveVariantId(variantId);
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new BadRequestException('quantity must be a non-negative integer');
    }

    return this.dataSource.transaction(async (manager) => {
      await this.ensureVariantBelongsToOrganization(
        variantId,
        organizationId,
        manager,
      );

      const stock = await this.getOrCreateStockForUpdate(
        manager,
        variantId,
        organizationId,
      );

      const previousQuantity = stock.quantity;
      stock.quantity = quantity;

      const savedStock = await manager.getRepository(PlantStock).save(stock);

      // Log the adjustment
      const logEntry = manager.getRepository(StockLog).create({
        variantId,
        organizationId,
        type: StockLogType.ADJUST,
        quantity: quantity - previousQuantity,
        reference: reason || 'Stock adjustment',
      });

      await manager.getRepository(StockLog).save(logEntry);
      return savedStock;
    });
  }

  async deleteStock(organizationId: string, variantId: number) {
    this.assertPositiveVariantId(variantId);

    await this.ensureVariantBelongsToOrganization(
      variantId,
      organizationId,
      this.dataSource.manager,
    );

    const stock = await this.stockRepo.findOne({
      where: { variantId, organizationId },
    });

    if (!stock) {
      throw new NotFoundException(
        `Stock for variant #${variantId} not found`,
      );
    }

    // Log the deletion
    await this.dataSource.transaction(async (manager) => {
      const logEntry = manager.getRepository(StockLog).create({
        variantId,
        organizationId,
        type: StockLogType.ADJUST,
        quantity: -stock.quantity,
        reference: 'Stock deleted/cleared',
      });

      await manager.getRepository(StockLog).save(logEntry);
      await manager.getRepository(PlantStock).delete({ variantId, organizationId });
    });

    return { message: 'Stock deleted successfully' };
  }

  async deleteAllStock(organizationId: string) {
    // Delete all stock records for the organization
    const result = await this.dataSource.transaction(async (manager) => {
      // Get all stocks to log the deletion
      const allStocks = await manager.getRepository(PlantStock).find({
        where: { organizationId },
      });

      // Create log entries for all deleted stocks
      const logEntries = allStocks.map((stock) =>
        manager.getRepository(StockLog).create({
          variantId: stock.variantId,
          organizationId,
          type: StockLogType.ADJUST,
          quantity: -stock.quantity,
          reference: 'All stock deleted/cleared',
        }),
      );

      if (logEntries.length > 0) {
        await manager.getRepository(StockLog).save(logEntries);
      }

      // Delete all stock records
      const deleteResult = await manager.getRepository(PlantStock).delete({
        organizationId,
      });

      return deleteResult;
    });

    return {
      message: `Successfully deleted stock for ${result.affected} variants`,
      deletedCount: result.affected,
    };
  }

  private async applyStockChange(
    organizationId: string,
    variantId: number,
    quantity: number,
    type: StockLogType,
    reference?: string,
  ) {
    this.assertPositiveVariantId(variantId);
    this.assertPositiveQuantity(quantity);

    return this.dataSource.transaction(async (manager) => {
      await this.ensureVariantBelongsToOrganization(
        variantId,
        organizationId,
        manager,
      );

      const stock = await this.getOrCreateStockForUpdate(
        manager,
        variantId,
        organizationId,
      );

      if (type === StockLogType.IN) {
        stock.quantity += quantity;
      } else {
        if (stock.quantity < quantity) {
          throw new BadRequestException(
            `Insufficient stock for variant #${variantId}. Available: ${stock.quantity}, requested: ${quantity}`,
          );
        }
        stock.quantity -= quantity;
      }

      const savedStock = await manager.getRepository(PlantStock).save(stock);

      const logEntry = manager.getRepository(StockLog).create({
        variantId,
        organizationId,
        type,
        quantity,
        reference: this.normalizeReference(reference),
      });

      await manager.getRepository(StockLog).save(logEntry);
      return savedStock;
    });
  }

  private async ensureVariantBelongsToOrganization(
    variantId: number,
    organizationId: string,
    manager: EntityManager,
  ) {
    const variant = await manager.getRepository(PlantVariant).findOne({
      where: { id: variantId, organizationId, status: true },
      select: { id: true },
    });

    if (!variant) {
      throw new NotFoundException(`Plant variant #${variantId} not found`);
    }
  }

  private async getOrCreateStockForUpdate(
    manager: EntityManager,
    variantId: number,
    organizationId: string,
  ): Promise<PlantStock> {
    const repo = manager.getRepository(PlantStock);

    let stock = await repo.findOne({
      where: { variantId, organizationId },
      lock: { mode: 'pessimistic_write' },
    });

    if (stock) {
      return stock;
    }

    try {
      stock = repo.create({
        variantId,
        organizationId,
        quantity: 0,
      });
      return await repo.save(stock);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        return repo.findOneOrFail({
          where: { variantId, organizationId },
          lock: { mode: 'pessimistic_write' },
        });
      }
      throw error;
    }
  }

  private assertPositiveQuantity(quantity: number) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('quantity must be a positive integer');
    }
  }

  private assertPositiveVariantId(variantId: number) {
    if (!Number.isInteger(variantId) || variantId <= 0) {
      throw new BadRequestException('variantId must be a positive integer');
    }
  }

  private normalizeReference(reference?: string): string | null {
    if (!reference) {
      return null;
    }
    const normalized = reference.trim();
    return normalized.length ? normalized : null;
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const queryError = error as QueryFailedError & {
      code?: string;
      errno?: number;
    };

    return (
      queryError.code === '23505' ||
      queryError.code === 'ER_DUP_ENTRY' ||
      queryError.errno === 1062
    );
  }

  private buildInventoryQrCode(
    qrCode: QrCode | null,
    plantId?: number,
    variantId?: number,
  ): InventoryQrCodeResponse {
    if (qrCode) {
      return {
        code: qrCode.code ?? null,
        qrImageBase64: qrCode.qrImageBase64 ?? null,
        plantId: qrCode.plantId ?? null,
        variantId: qrCode.variantId,
        id: qrCode.id ?? null,
        alreadyGenerated: 1,
      };
    }

    return {
      code: null,
      qrImageBase64: null,
      plantId: plantId ?? null,
      variantId: variantId ?? null,
      id: null,
      alreadyGenerated: 0,
    };
  }
}

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

  async getAllStock(organizationId: string) {
    const stocks = await this.stockRepo.find({
      where: { organizationId },
      relations: ['variant', 'variant.plant', 'variant.plant.category', 'variant.plant.subcategory'],
      order: { variantId: 'ASC' },
    });

    if (stocks.length === 0) {
      return stocks;
    }

    const plantIds = Array.from(
      new Set(
        stocks
          .map((stock) => stock.variant?.plant?.id)
          .filter((plantId): plantId is number => Number.isInteger(plantId)),
      ),
    );
    const variantIds = Array.from(
      new Set(
        stocks
          .map((stock) => stock.variantId)
          .filter((variantId): variantId is number =>
            Number.isInteger(variantId),
          ),
      ),
    );

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
    } else {
      return stocks.map((stock) => ({
        ...stock,
        qrCode: this.buildInventoryQrCode(
          null,
          stock.variant?.plant?.id,
          stock.variantId,
        ),
      }));
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

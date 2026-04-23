import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { PlantVariant } from '../plants/plant-variant.entity';
import { PlantStock } from './entities/plant-stock.entity';
import { StockLog, StockLogType } from './entities/stock-log.entity';
import { UpdateStockDto } from './dto/stock-change.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(PlantStock)
    private readonly stockRepo: Repository<PlantStock>,
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
    return this.stockRepo.find({
      where: { organizationId },
      relations: ['variant', 'variant.plant', 'variant.plant.category', 'variant.plant.subcategory'],
      order: { variantId: 'ASC' },
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
}

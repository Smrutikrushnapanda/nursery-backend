import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import * as QRCode from 'qrcode';
import { PlantVariant } from './plant-variant.entity';
import { Plant } from './plant.entity';
import { CreatePlantVariantDto } from './dto/create-plant-variant.dto';
import { UpdatePlantVariantDto } from './dto/update-plant-variant.dto';
import { PlantStock } from '../inventory/entities/plant-stock.entity';

type QueryErrorLike = {
  code?: string;
  errno?: number;
};

type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

interface VariantWithStock extends PlantVariant {
  stockQuantity?: number;
  stockStatus?: StockStatus;
}

@Injectable()
export class PlantVariantsService {
  constructor(
    @InjectRepository(PlantVariant)
    private readonly plantVariantRepo: Repository<PlantVariant>,
    @InjectRepository(Plant)
    private readonly plantRepo: Repository<Plant>,
    @InjectRepository(PlantStock)
    private readonly stockRepo: Repository<PlantStock>,
  ) {}

  async create(dto: CreatePlantVariantDto, orgId: string) {
    await this.ensurePlantBelongsToOrg(dto.plantId, orgId);

    // Auto-generate SKU if not provided
    if (!dto.sku) {
      const count = await this.plantVariantRepo.count({
        where: { organizationId: orgId },
      });
      const plant = await this.plantRepo.findOne({
        where: { id: dto.plantId, organizationId: orgId },
        select: { sku: true },
      });
      const plantSku = plant?.sku || 'PLT';
      dto.sku = `${plantSku}-VAR-${String(count + 1).padStart(4, '0')}`;
    }

    const variant = this.plantVariantRepo.create({ ...dto, organizationId: orgId });

    try {
      return await this.plantVariantRepo.save(variant);
    } catch (error) {
      this.rethrowFriendlyUniqueError(error);
      throw error;
    }
  }

  async findAll(orgId: string | undefined, plantIdOrPage?: number | string, pageOrUndefined?: number, limit?: number) {
    // Check if pagination is being used
    const isPageination = typeof plantIdOrPage === 'number' && !isNaN(plantIdOrPage as number) && (pageOrUndefined !== undefined || limit !== undefined);
    
    if (isPageination) {
      // New API: findAll(orgId, page, limit)
      return this.findAllPaginated(orgId, plantIdOrPage as number, pageOrUndefined || 50);
    }

    // Original API: findAll(orgId, plantId?)
    const plantId = typeof plantIdOrPage === 'number' ? plantIdOrPage : undefined;

    const query = this.plantVariantRepo
      .createQueryBuilder('variant')
      .innerJoinAndSelect('variant.plant', 'plant', 'plant.status = :plantStatus', { plantStatus: true })
      .leftJoinAndSelect('variant.stock', 'stock')
      .where('variant.status = :variantStatus', { variantStatus: true })
      .orderBy('variant.createdAt', 'DESC');

    if (orgId) {
      query.andWhere('variant.organizationId = :orgId', { orgId });

      if (plantId !== undefined) {
        await this.ensurePlantBelongsToOrg(plantId, orgId);
        query.andWhere('variant.plantId = :plantId', { plantId });
      }
    } else if (plantId !== undefined) {
      query.andWhere('variant.plantId = :plantId', { plantId });
    }

    const variants = await query.getMany();
    return this.enrichVariantsWithStockStatus(variants);
  }

  async findAllPaginated(orgId: string | undefined, pageNum: number = 1, limitNum: number = 50) {
    // Ensure page and limit are valid
    pageNum = Math.max(1, pageNum);
    limitNum = Math.min(500, Math.max(1, limitNum));

    const query = this.plantVariantRepo
      .createQueryBuilder('variant')
      .innerJoinAndSelect('variant.plant', 'plant', 'plant.status = :plantStatus', { plantStatus: true })
      .leftJoinAndSelect('variant.stock', 'stock')
      .where('variant.status = :variantStatus', { variantStatus: true })
      .orderBy('variant.createdAt', 'DESC');

    if (orgId) {
      query.andWhere('variant.organizationId = :orgId', { orgId });
    }

    const [variants, total] = await query
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getManyAndCount();

    const enrichedVariants = this.enrichVariantsWithStockStatus(variants);

    return {
      data: enrichedVariants,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  async findOne(id: number, orgId: string | undefined) {
    const query = this.plantVariantRepo
      .createQueryBuilder('variant')
      .innerJoinAndSelect('variant.plant', 'plant', 'plant.status = :plantStatus', { plantStatus: true })
      .leftJoinAndSelect('variant.stock', 'stock')
      .where('variant.id = :id', { id })
      .andWhere('variant.status = :variantStatus', { variantStatus: true });

    if (orgId) {
      query.andWhere('variant.organizationId = :orgId', { orgId });
    }

    const variant = await query.getOne();

    if (!variant) {
      throw new NotFoundException(`Plant variant #${id} not found`);
    }

    return this.enrichVariantsWithStockStatus([variant])[0];
  }

  async update(id: number, dto: UpdatePlantVariantDto, orgId: string) {
    const variant = await this.findOne(id, orgId);

    if (dto.plantId !== undefined && dto.plantId !== variant.plantId) {
      await this.ensurePlantBelongsToOrg(dto.plantId, orgId);
    }

    Object.assign(variant, dto);

    try {
      return await this.plantVariantRepo.save(variant);
    } catch (error) {
      this.rethrowFriendlyUniqueError(error);
      throw error;
    }
  }

  async remove(id: number, orgId: string) {
    const variant = await this.findOne(id, orgId);
    variant.status = false;
    return this.plantVariantRepo.save(variant);
  }

  async generateQr(id: number, orgId: string | undefined): Promise<Buffer> {
    const variant = await this.findOne(id, orgId);
    const url = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/product/${variant.id}`;
    return QRCode.toBuffer(url, { width: 300, margin: 2 });
  }

  private async ensurePlantBelongsToOrg(plantId: number, orgId: string) {
    const plant = await this.plantRepo.findOne({
      where: { id: plantId, organizationId: orgId, status: true },
      select: { id: true },
    });

    if (!plant) {
      throw new NotFoundException(`Plant #${plantId} not found`);
    }
  }

  private rethrowFriendlyUniqueError(error: unknown) {
    if (!(error instanceof QueryFailedError)) {
      return;
    }

    const queryError = error as QueryFailedError & QueryErrorLike;
    if (
      queryError.code === '23505' ||
      queryError.code === 'ER_DUP_ENTRY' ||
      queryError.errno === 1062
    ) {
      throw new ConflictException(
        'Variant SKU must be unique within your organization',
      );
    }
  }

  private computeStockStatus(quantity: number, minQuantity: number): StockStatus {
    if (quantity === 0) return 'Out of Stock';
    if (quantity <= minQuantity) return 'Low Stock';
    return 'In Stock';
  }

  private enrichVariantsWithStockStatus(variants: PlantVariant[]): (PlantVariant & { stockQuantity?: number; stockStatus?: StockStatus })[] {
    return variants.map((variant) => {
      const stock = variant.stock as PlantStock | undefined;
      const stockQuantity = stock?.quantity ?? 0;
      const stockStatus = this.computeStockStatus(stockQuantity, variant.minQuantity);

      return {
        ...variant,
        stockQuantity,
        stockStatus,
      };
    });
  }
}

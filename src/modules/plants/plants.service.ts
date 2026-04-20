import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plant } from './plant.entity';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { PlantVariant } from './plant-variant.entity';
import { PlantStock } from '../inventory/entities/plant-stock.entity';

type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

interface VariantWithStock extends PlantVariant {
  stockQuantity?: number;
  stockStatus?: StockStatus;
}

@Injectable()
export class PlantsService {
  constructor(
    @InjectRepository(Plant)
    private readonly plantRepo: Repository<Plant>,
    @InjectRepository(PlantVariant)
    private readonly plantVariantRepo: Repository<PlantVariant>,
    @InjectRepository(PlantStock)
    private readonly stockRepo: Repository<PlantStock>,
  ) {}

  async create(dto: CreatePlantDto, orgId: string) {
    // Auto-generate SKU if not provided
    if (!dto.sku) {
      const count = await this.plantRepo.count({ where: { organizationId: orgId } });
      dto.sku = `PLT-${String(count + 1).padStart(3, '0')}`;
    }
    const plant = this.plantRepo.create({ ...dto, organizationId: orgId });
    return this.plantRepo.save(plant);
  }

  async findAll(orgId: string | undefined) {
    const plants = await this.plantRepo
      .createQueryBuilder('plant')
      .leftJoinAndSelect('plant.category', 'category')
      .leftJoinAndSelect('plant.subcategory', 'subcategory')
      .leftJoinAndSelect(
        'plant.variants',
        'variant',
        'variant.status = :variantStatus',
        { variantStatus: true },
      )
      .leftJoinAndSelect('variant.stock', 'stock')
      .where(orgId ? 'plant.organizationId = :orgId' : '1=1', { orgId })
      .andWhere('plant.status = :plantStatus', { plantStatus: true })
      .orderBy('plant.createdAt', 'DESC')
      .getMany();

    // Enrich variants with computed stock status
    return this.enrichPlantsWithStockStatus(plants);
  }

  async findOne(id: number, orgId: string | undefined) {
    const plant = await this.plantRepo
      .createQueryBuilder('plant')
      .leftJoinAndSelect('plant.category', 'category')
      .leftJoinAndSelect('plant.subcategory', 'subcategory')
      .leftJoinAndSelect(
        'plant.variants',
        'variant',
        'variant.status = :variantStatus',
        { variantStatus: true },
      )
      .leftJoinAndSelect('variant.stock', 'stock')
      .where('plant.id = :id', { id })
      .andWhere(orgId ? 'plant.organizationId = :orgId' : '1=1', { orgId })
      .andWhere('plant.status = :plantStatus', { plantStatus: true })
      .getOne();

    if (!plant) throw new NotFoundException('Plant not found');
    return this.enrichPlantsWithStockStatus([plant])[0];
  }

  async update(id: number, dto: UpdatePlantDto, orgId: string) {
    const plant = await this.findOne(id, orgId);
    Object.assign(plant, dto);
    return this.plantRepo.save(plant);
  }

  async remove(id: number, orgId: string) {
    const plant = await this.findOne(id, orgId);
    plant.status = false;
    await this.plantVariantRepo.update(
      { plantId: id, organizationId: orgId, status: true },
      { status: false },
    );
    return this.plantRepo.save(plant);
  }

  private computeStockStatus(quantity: number, minQuantity: number): StockStatus {
    if (quantity === 0) return 'Out of Stock';
    if (quantity <= minQuantity) return 'Low Stock';
    return 'In Stock';
  }

  private enrichPlantsWithStockStatus(plants: Plant[]): Plant[] {
    return plants.map((plant) => {
      const enrichedVariants = plant.variants.map((variant: PlantVariant) => {
        const stock = variant.stock as PlantStock | undefined;
        const stockQuantity = stock?.quantity ?? 0;
        const stockStatus = this.computeStockStatus(stockQuantity, variant.minQuantity);

        return {
          ...variant,
          stockQuantity,
          stockStatus,
        } as VariantWithStock;
      });

      return {
        ...plant,
        variants: enrichedVariants as PlantVariant[],
      } as Plant;
    });
  }
}

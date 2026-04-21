import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plant } from './plant.entity';
import { PlantImage } from './plant-image.entity';
import { CreatePlantDto, PlantImageDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { PlantVariant } from './plant-variant.entity';
import { PlantStock } from '../inventory/entities/plant-stock.entity';
// Use any for multer file to avoid type issues
import { CloudinaryService } from '../uploads/cloudinary.service';

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
    @InjectRepository(PlantImage)
    private readonly plantImageRepo: Repository<PlantImage>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    dto: CreatePlantDto,
    orgId: string,
    imageFiles?: any[],
  ) {
    // Auto-generate SKU if not provided
    if (!dto.sku) {
      const count = await this.plantRepo.count({
        where: { organizationId: orgId },
      });
      dto.sku = `PLT-${String(count + 1).padStart(3, '0')}`;
    }

    // Upload single image for backward compatibility
    const imageUrl = imageFiles?.length
      ? await this.cloudinaryService.uploadPlantImage(imageFiles[0])
      : null;

    const { categoryId, subcategoryId, ...restDto } = dto;

    const plant = this.plantRepo.create({
      ...restDto,
      categoryId: Number(categoryId),
      subcategoryId: Number(subcategoryId),
      imageUrl,
      organizationId: orgId,
    });
    const savedPlant = await this.plantRepo.save(plant);

    // Handle multiple images if provided via file upload
    if (imageFiles && imageFiles.length > 0) {
      const imageEntities = await Promise.all(
        imageFiles.map(async (file, index) =>
          this.plantImageRepo.create({
            imageUrl: await this.cloudinaryService.uploadPlantImage(file),
            plantId: savedPlant.id,
            organizationId: orgId,
            isPrimary: index === 0, // First image is primary by default
            displayOrder: index,
          }),
        ),
      );
      await this.plantImageRepo.save(imageEntities);
    } else if (dto.images && dto.images.length > 0) {
      // Handle images passed as URLs in dto
      const imageEntities = dto.images.map((img: PlantImageDto) =>
        this.plantImageRepo.create({
          imageUrl: img.imageUrl,
          plantId: savedPlant.id,
          organizationId: orgId,
          isPrimary: img.isPrimary ?? false,
          displayOrder: img.displayOrder ?? 0,
        }),
      );
      await this.plantImageRepo.save(imageEntities);
    }

    return this.findOne(savedPlant.id, orgId);
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
      .leftJoinAndSelect('plant.images', 'image')
      .where(orgId ? 'plant.organizationId = :orgId' : '1=1', { orgId })
      .andWhere('plant.status = :plantStatus', { plantStatus: true })
      .orderBy('plant.createdAt', 'DESC')
      .addOrderBy('image.displayOrder', 'ASC')
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
      .leftJoinAndSelect('plant.images', 'image')
      .where('plant.id = :id', { id })
      .andWhere(orgId ? 'plant.organizationId = :orgId' : '1=1', { orgId })
      .andWhere('plant.status = :plantStatus', { plantStatus: true })
      .orderBy('image.displayOrder', 'ASC')
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

  private computeStockStatus(
    quantity: number,
    minQuantity: number,
  ): StockStatus {
    if (quantity === 0) return 'Out of Stock';
    if (quantity <= minQuantity) return 'Low Stock';
    return 'In Stock';
  }

  private enrichPlantsWithStockStatus(plants: Plant[]): Plant[] {
    return plants.map((plant) => {
      const enrichedVariants = plant.variants.map((variant: PlantVariant) => {
        const stock = variant.stock as PlantStock | undefined;
        const stockQuantity = stock?.quantity ?? 0;
        const stockStatus = this.computeStockStatus(
          stockQuantity,
          variant.minQuantity,
        );

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

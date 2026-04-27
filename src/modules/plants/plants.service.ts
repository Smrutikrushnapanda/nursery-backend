import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plant } from './plant.entity';
import { PlantImage } from './plant-image.entity';
import { CreatePlantDto, PlantImageDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { PlantVariant } from './plant-variant.entity';
import { PlantStock } from '../inventory/entities/plant-stock.entity';
import { FileUploadService } from '../uploads/file-upload.service';

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
    private readonly fileUploadService: FileUploadService,
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
      ? await this.fileUploadService.uploadPlantImage(imageFiles[0])
      : null;

    const {
      categoryId,
      subcategoryId,
      temperatureMin,
      temperatureMax,
      ...restDto
    } = dto;

    const parsedTemperatureMin =
      temperatureMin === undefined || temperatureMin === ''
        ? undefined
        : Number(temperatureMin);
    const parsedTemperatureMax =
      temperatureMax === undefined || temperatureMax === ''
        ? undefined
        : Number(temperatureMax);

    const plant = this.plantRepo.create({
      ...restDto,
      categoryId: Number(categoryId),
      subcategoryId: Number(subcategoryId),
      temperatureMin: parsedTemperatureMin,
      temperatureMax: parsedTemperatureMax,
      imageUrl,
      organizationId: orgId,
    });
    const savedPlant = await this.plantRepo.save(plant);

    // Handle multiple images if provided via file upload
    if (imageFiles && imageFiles.length > 0) {
      const imageEntities = await Promise.all(
        imageFiles.map(async (file, index) =>
          this.plantImageRepo.create({
            imageUrl: await this.fileUploadService.uploadPlantImage(file),
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

  async findAll(
    orgId: string | undefined,
    categoryIdOrPage?: string | number,
    subcategoryIdOrLimit?: string | number,
    page?: number,
    limit?: number,
  ) {
    // Check if pagination is being used (when page and limit are provided)
    if (typeof categoryIdOrPage === 'number' || typeof subcategoryIdOrLimit === 'number') {
      // New pagination API: findAll(orgId, page, limit)
      const pageNum = (categoryIdOrPage as number) || 1;
      const limitNum = (subcategoryIdOrLimit as number) || 50;
      return this.findAllPaginated(orgId, pageNum, limitNum);
    }

    // Original API: findAll(orgId, categoryId, subcategoryId)
    const categoryId = categoryIdOrPage as string | undefined;
    const subcategoryId = subcategoryIdOrLimit as string | undefined;

    const query = this.plantRepo
      .createQueryBuilder('plant')
      .leftJoinAndSelect('plant.category', 'category')
      .leftJoinAndSelect('plant.subcategory', 'subcategory')
      .leftJoinAndSelect('plant.variants', 'variant')
      .leftJoinAndSelect('variant.stock', 'stock')
      .leftJoinAndSelect('plant.images', 'image')
      .where(orgId ? 'plant.organizationId = :orgId' : '1=1', { orgId });

    // Apply categoryId filter if provided
    if (categoryId && categoryId !== '' && categoryId !== 'undefined') {
      query.andWhere('plant.categoryId = :categoryId', {
        categoryId: Number(categoryId),
      });
    }

    // Apply subcategoryId filter if provided
    if (subcategoryId && subcategoryId !== '' && subcategoryId !== 'undefined') {
      query.andWhere('plant.subcategoryId = :subcategoryId', {
        subcategoryId: Number(subcategoryId),
      });
    }

    const plants = await query
      .orderBy('plant.createdAt', 'DESC')
      .addOrderBy('image.displayOrder', 'ASC')
      .getMany();

    // Enrich variants with computed stock status
    return this.enrichPlantsWithStockStatus(plants);
  }

  async findAllPaginated(
    orgId: string | undefined,
    pageNum: number = 1,
    limitNum: number = 50,
  ) {
    // Ensure page and limit are valid
    pageNum = Math.max(1, pageNum);
    limitNum = Math.min(500, Math.max(1, limitNum));

    const query = this.plantRepo
      .createQueryBuilder('plant')
      .leftJoinAndSelect('plant.category', 'category')
      .leftJoinAndSelect('plant.subcategory', 'subcategory')
      .leftJoinAndSelect('plant.variants', 'variant')
      .leftJoinAndSelect('variant.stock', 'stock')
      .leftJoinAndSelect('plant.images', 'image')
      .where(orgId ? 'plant.organizationId = :orgId' : '1=1', { orgId });

    const [plants, total] = await query
      .orderBy('plant.createdAt', 'DESC')
      .addOrderBy('image.displayOrder', 'ASC')
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getManyAndCount();

    const enrichedPlants = this.enrichPlantsWithStockStatus(plants);

    return {
      data: enrichedPlants,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  async findOne(id: number, orgId: string | undefined) {
    const plant = await this.plantRepo
      .createQueryBuilder('plant')
      .leftJoinAndSelect('plant.category', 'category')
      .leftJoinAndSelect('plant.subcategory', 'subcategory')
      .leftJoinAndSelect('plant.variants', 'variant')
      .leftJoinAndSelect('variant.stock', 'stock')
      .leftJoinAndSelect('plant.images', 'image')
      .where('plant.id = :id', { id })
      .andWhere(orgId ? 'plant.organizationId = :orgId' : '1=1', { orgId })
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

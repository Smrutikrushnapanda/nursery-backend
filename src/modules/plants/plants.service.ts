import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plant } from './plant.entity';
import { CreatePlantDto } from './dto/create-plant.dto';
import { UpdatePlantDto } from './dto/update-plant.dto';
import { PlantVariant } from './plant-variant.entity';

@Injectable()
export class PlantsService {
  constructor(
    @InjectRepository(Plant)
    private readonly plantRepo: Repository<Plant>,
    @InjectRepository(PlantVariant)
    private readonly plantVariantRepo: Repository<PlantVariant>,
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
    return this.plantRepo
      .createQueryBuilder('plant')
      .leftJoinAndSelect('plant.category', 'category')
      .leftJoinAndSelect('plant.subcategory', 'subcategory')
      .leftJoinAndSelect(
        'plant.variants',
        'variant',
        'variant.status = :variantStatus',
        { variantStatus: true },
      )
      .where(orgId ? 'plant.organizationId = :orgId' : '1=1', { orgId })
      .andWhere('plant.status = :plantStatus', { plantStatus: true })
      .orderBy('plant.createdAt', 'DESC')
      .getMany();
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
      .where('plant.id = :id', { id })
      .andWhere(orgId ? 'plant.organizationId = :orgId' : '1=1', { orgId })
      .andWhere('plant.status = :plantStatus', { plantStatus: true })
      .getOne();

    if (!plant) throw new NotFoundException('Plant not found');
    return plant;
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
}

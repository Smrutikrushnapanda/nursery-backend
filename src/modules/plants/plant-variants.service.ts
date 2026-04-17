import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { PlantVariant } from './plant-variant.entity';
import { Plant } from './plant.entity';
import { CreatePlantVariantDto } from './dto/create-plant-variant.dto';
import { UpdatePlantVariantDto } from './dto/update-plant-variant.dto';

type QueryErrorLike = {
  code?: string;
  errno?: number;
};

@Injectable()
export class PlantVariantsService {
  constructor(
    @InjectRepository(PlantVariant)
    private readonly plantVariantRepo: Repository<PlantVariant>,
    @InjectRepository(Plant)
    private readonly plantRepo: Repository<Plant>,
  ) {}

  async create(dto: CreatePlantVariantDto, orgId: string) {
    await this.ensurePlantBelongsToOrg(dto.plantId, orgId);
    const variant = this.plantVariantRepo.create({ ...dto, organizationId: orgId });

    try {
      return await this.plantVariantRepo.save(variant);
    } catch (error) {
      this.rethrowFriendlyUniqueError(error);
      throw error;
    }
  }

  async findAll(orgId: string | undefined, plantId?: number) {
    const query = this.plantVariantRepo
      .createQueryBuilder('variant')
      .innerJoinAndSelect('variant.plant', 'plant', 'plant.status = :plantStatus', { plantStatus: true })
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

    return query.getMany();
  }

  async findOne(id: number, orgId: string | undefined) {
    const query = this.plantVariantRepo
      .createQueryBuilder('variant')
      .innerJoinAndSelect('variant.plant', 'plant', 'plant.status = :plantStatus', { plantStatus: true })
      .where('variant.id = :id', { id })
      .andWhere('variant.status = :variantStatus', { variantStatus: true });

    if (orgId) {
      query.andWhere('variant.organizationId = :orgId', { orgId });
    }

    const variant = await query.getOne();

    if (!variant) {
      throw new NotFoundException(`Plant variant #${id} not found`);
    }

    return variant;
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
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto, organizationId?: string) {
    const category = this.categoryRepository.create({
      ...dto,
      organizationId: organizationId || undefined,
    });

    const saved = await this.categoryRepository.save(category);

    return {
      success: true,
      message: 'Category created successfully',
      data: saved,
    };
  }

  async findAll(organizationId?: string) {
    let categories: Category[];

    if (!organizationId) {
      categories = await this.categoryRepository.find({
        where: { status: true },
        order: { id: 'ASC' },
      });
    } else {
      categories = await this.categoryRepository.find({
        where: [
          { organizationId, status: true },
          { organizationId: IsNull(), status: true },
        ],
        order: { id: 'ASC' },
      });
    }

    return {
      success: true,
      message: 'Categories fetched successfully',
    };
  }

  async findOne(id: number, organizationId?: string) {
    const category = await this.categoryRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    if (organizationId) {
      const normalize = (val?: string | null) =>
        val ? val.trim().toLowerCase() : null;

      const categoryOrgId = normalize(category.organizationId);
      const requestOrgId = normalize(organizationId);

      if (categoryOrgId && categoryOrgId !== requestOrgId) {
        throw new NotFoundException(`Category #${id} not found`);
      }
    }

    return {
      success: true,
      message: 'Category fetched successfully',
      data: category,
    };
  }

  async update(id: number, dto: UpdateCategoryDto, organizationId?: string) {
    const category = await this.findOne(id, organizationId);

    // ⚠️ because findOne now returns object, extract data
    const entity = category.data;

    Object.assign(entity, dto);
    const updated = await this.categoryRepository.save(entity);

    return {
      success: true,
      message: 'Category updated successfully',
      data: updated,
    };
  }

  async remove(id: number, organizationId?: string) {
    const where = organizationId
      ? [{ id, organizationId }, { id, organizationId: IsNull() }]
      : { id };

    const result = await this.categoryRepository.update(where, {
      status: false,
    });

    if (!result.affected) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    return {
      success: true,
      message: 'Category deleted successfully',
    };
  }
}
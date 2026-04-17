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

  async create(
    dto: CreateCategoryDto,
    organizationId?: string,
  ): Promise<Category> {
    const category = this.categoryRepository.create({
      ...dto,
      organizationId: organizationId || undefined,
    });
    return this.categoryRepository.save(category);
  }

  async findAll(organizationId?: string): Promise<Category[]> {
    if (!organizationId) {
      return this.categoryRepository.find({
        where: { status: true },
        order: { id: 'ASC' },
      });
    }

    return this.categoryRepository.find({
      where: [
        { organizationId, status: true },
        { organizationId: IsNull(), status: true },
      ],
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number, organizationId?: string): Promise<Category> {
    const where = organizationId ? { id, organizationId } : { id };
    const category = await this.categoryRepository.findOne({ where });
    if (!category) throw new NotFoundException(`Category #${id} not found`);
    return category;
  }

  async update(
    id: number,
    dto: UpdateCategoryDto,
    organizationId?: string,
  ): Promise<Category> {
    const category = await this.findOne(id, organizationId);
    Object.assign(category, dto);
    return this.categoryRepository.save(category);
  }

  async remove(id: number, organizationId?: string): Promise<void> {
    const category = await this.findOne(id, organizationId);
    category.status = false;
    await this.categoryRepository.save(category);
  }
}

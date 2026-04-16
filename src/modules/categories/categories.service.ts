import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto, organizationId: string): Promise<Category> {
    const category = this.categoryRepository.create({ ...dto, organizationId });
    return this.categoryRepository.save(category);
  }

  async findAll(organizationId: string): Promise<Category[]> {
    return this.categoryRepository.find({ where: { organizationId, status: true } });
  }

  async findOne(id: number, organizationId: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({ where: { id, organizationId } });
    if (!category) throw new NotFoundException(`Category #${id} not found`);
    return category;
  }

  async update(id: number, dto: UpdateCategoryDto, organizationId: string): Promise<Category> {
    const category = await this.findOne(id, organizationId);
    Object.assign(category, dto);
    return this.categoryRepository.save(category);
  }

  async remove(id: number, organizationId: string): Promise<void> {
    const category = await this.findOne(id, organizationId);
    category.status = false;
    await this.categoryRepository.save(category);
  }
}

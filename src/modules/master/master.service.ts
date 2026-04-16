import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessType } from './business-type.entity';
import { Category } from '../categories/category.entity';
import { SubCategory } from './subcategory.entity';
import { MenuMaster } from './menu-master.entity';
import { CreateMenuMasterDto } from './dto/create-menu-master.dto';
import { UpdateMenuMasterDto } from './dto/update-menu-master.dto';

@Injectable()
export class MasterService implements OnModuleInit {
  constructor(
    @InjectRepository(BusinessType)
    private readonly businessTypeRepository: Repository<BusinessType>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(SubCategory)
    private readonly subCategoryRepository: Repository<SubCategory>,
    @InjectRepository(MenuMaster)
    private readonly menuMasterRepository: Repository<MenuMaster>,
  ) {}

  async onModuleInit() {
    await this.seedBusinessTypes();
    await this.seedCategories();
    await this.seedSubCategories();
  }

  private async seedBusinessTypes() {
    const count = await this.businessTypeRepository.count();
    if (count === 0) {
      const businessTypes = [
        { name: 'individual' },
        { name: 'proprietorship' },
        { name: 'partnership' },
        { name: 'private_limited' },
      ];
      await this.businessTypeRepository.save(businessTypes);
      console.log('Business types seeded');
    }
  }

  private async seedCategories() {
    const count = await this.categoryRepository.count();
    if (count === 0) {
      const categories = [
        { name: 'agriculture' },
        { name: 'ecommerce' },
        { name: 'services' },
      ];
      await this.categoryRepository.save(categories);
      console.log('Categories seeded');
    }
  }

  private async seedSubCategories() {
    const count = await this.subCategoryRepository.count();
    if (count === 0) {
      const subCategories = [
        { name: 'nursery', categoryId: 1 },
        { name: 'seeds', categoryId: 1 },
        { name: 'fashion', categoryId: 2 },
      ];
      await this.subCategoryRepository.save(subCategories);
      console.log('Subcategories seeded');
    }
  }

  async getBusinessTypes(): Promise<BusinessType[]> {
    return this.businessTypeRepository.find({
      order: { id: 'ASC' },
    });
  }

  async getCategories(): Promise<Category[]> {
    return this.categoryRepository.find({
      order: { id: 'ASC' },
    });
  }

  async getSubCategories(categoryId?: number): Promise<SubCategory[]> {
    if (categoryId) {
      return this.subCategoryRepository.find({
        where: { categoryId },
        order: { id: 'ASC' },
      });
    }
    return this.subCategoryRepository.find({
      order: { id: 'ASC' },
    });
  }

  // Menu Master CRUD operations
  async createMenuMaster(createMenuMasterDto: CreateMenuMasterDto): Promise<MenuMaster> {
    const menuMaster = this.menuMasterRepository.create(createMenuMasterDto);
    return this.menuMasterRepository.save(menuMaster);
  }

  async getAllMenuMasters(): Promise<MenuMaster[]> {
    return this.menuMasterRepository.find({
      order: { displayOrder: 'ASC' },
    });
  }

  async getMenuMasterById(id: number): Promise<MenuMaster> {
    const menuMaster = await this.menuMasterRepository.findOne({ where: { id } });
    if (!menuMaster) {
      throw new NotFoundException(`MenuMaster with ID ${id} not found`);
    }
    return menuMaster;
  }

  async updateMenuMaster(
    id: number,
    updateMenuMasterDto: UpdateMenuMasterDto,
  ): Promise<MenuMaster> {
    const menuMaster = await this.getMenuMasterById(id);
    const updatedMenuMaster = this.menuMasterRepository.merge(
      menuMaster,
      updateMenuMasterDto,
    );
    return this.menuMasterRepository.save(updatedMenuMaster);
  }

  async deleteMenuMaster(id: number): Promise<void> {
    const menuMaster = await this.getMenuMasterById(id);
    await this.menuMasterRepository.remove(menuMaster);
  }
}

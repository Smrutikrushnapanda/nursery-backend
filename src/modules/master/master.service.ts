import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  NotFoundException,
} from '@nestjs/common';
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

  private async seedCategories(organizationId: string) {
    const count = await this.categoryRepository.count({
      where: { organizationId },
    });
    if (count === 0) {
      const categories = [
        { name: 'agriculture', organizationId, status: true },
        { name: 'ecommerce', organizationId, status: true },
        { name: 'services', organizationId, status: true },
      ];
      await this.categoryRepository.save(categories);
      console.log(`Categories seeded for org ${organizationId}`);
    }
  }

  private async seedSubCategories(organizationId: string) {
    const count = await this.subCategoryRepository.count({
      where: { organizationId },
    });
    if (count === 0) {
      const categories = await this.categoryRepository.find({
        where: { organizationId },
      });
      const categoryByName = new Map(
        categories.map((category) => [category.name?.toLowerCase(), category.id]),
      );

      const subCategories = [
        { name: 'nursery', categoryId: categoryByName.get('agriculture') },
        { name: 'seeds', categoryId: categoryByName.get('agriculture') },
        { name: 'fashion', categoryId: categoryByName.get('ecommerce') },
      ]
        .filter((subCategory) => subCategory.categoryId)
        .map((subCategory) => ({
          ...subCategory,
          organizationId,
        }));

      if (subCategories.length === 0) {
        return;
      }

      await this.subCategoryRepository.save(
        subCategories as Array<{ name: string; categoryId: number; organizationId: string }>,
      );
      console.log(`Subcategories seeded for org ${organizationId}`);
    }
  }

  private async ensureTenantMasterData(organizationId: string) {
    await this.seedCategories(organizationId);
    await this.seedSubCategories(organizationId);
  }

  private async validateParentMenuOwnership(
    parentId: number,
    organizationId: string,
    currentMenuId?: number,
  ) {
    if (currentMenuId && parentId === currentMenuId) {
      throw new BadRequestException('A menu cannot be its own parent.');
    }

    const parent = await this.menuMasterRepository.findOne({
      where: { id: parentId, organizationId },
    });

    if (!parent) {
      throw new NotFoundException(`Parent menu with ID ${parentId} not found`);
    }

    return parent;
  }

  async getBusinessTypes(): Promise<BusinessType[]> {
    return this.businessTypeRepository.find({
      order: { id: 'ASC' },
    });
  }

  async getCategories(organizationId: string): Promise<Category[]> {
    await this.ensureTenantMasterData(organizationId);
    return this.categoryRepository.find({
      where: { organizationId, status: true },
      order: { id: 'ASC' },
    });
  }

  async getSubCategories(
    organizationId: string,
    categoryId?: number,
  ): Promise<SubCategory[]> {
    await this.ensureTenantMasterData(organizationId);
    if (categoryId) {
      return this.subCategoryRepository.find({
        where: { organizationId, categoryId },
        order: { id: 'ASC' },
      });
    }
    return this.subCategoryRepository.find({
      where: { organizationId },
      order: { id: 'ASC' },
    });
  }

  // Menu Master CRUD operations
  async createMenuMaster(
    createMenuMasterDto: CreateMenuMasterDto,
    organizationId: string,
  ): Promise<MenuMaster> {
    if (createMenuMasterDto.parentId) {
      await this.validateParentMenuOwnership(
        createMenuMasterDto.parentId,
        organizationId,
      );
    }

    const menuMaster = this.menuMasterRepository.create({
      ...createMenuMasterDto,
      organizationId,
    });
    return this.menuMasterRepository.save(menuMaster);
  }

  async getAllMenuMasters(organizationId: string): Promise<MenuMaster[]> {
    return this.menuMasterRepository.find({
      where: { organizationId },
      order: { displayOrder: 'ASC' },
    });
  }

  async getMenuMasterById(
    id: number,
    organizationId: string,
  ): Promise<MenuMaster> {
    const menuMaster = await this.menuMasterRepository.findOne({
      where: { id, organizationId },
    });
    if (!menuMaster) {
      throw new NotFoundException(`MenuMaster with ID ${id} not found`);
    }
    return menuMaster;
  }

  async updateMenuMaster(
    id: number,
    updateMenuMasterDto: UpdateMenuMasterDto,
    organizationId: string,
  ): Promise<MenuMaster> {
    const menuMaster = await this.getMenuMasterById(id, organizationId);

    if (updateMenuMasterDto.parentId) {
      await this.validateParentMenuOwnership(
        updateMenuMasterDto.parentId,
        organizationId,
        id,
      );
    }

    const updatedMenuMaster = this.menuMasterRepository.merge(
      menuMaster,
      updateMenuMasterDto,
    );
    return this.menuMasterRepository.save(updatedMenuMaster);
  }

  async deleteMenuMaster(id: number, organizationId: string): Promise<void> {
    const menuMaster = await this.getMenuMasterById(id, organizationId);
    await this.menuMasterRepository.remove(menuMaster);
  }
}

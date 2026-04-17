import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { BusinessType } from './business-type.entity';
import { Category } from '../categories/category.entity';
import { SubCategory } from './subcategory.entity';
import { MenuMaster } from './menu-master.entity';
import { CreateMenuMasterDto } from './dto/create-menu-master.dto';
import { UpdateMenuMasterDto } from './dto/update-menu-master.dto';
import { CreateSubCategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubCategoryDto } from './dto/update-subcategory.dto';
import { RegistrationCategory } from './registration-category.entity';
import { RegistrationSubCategory } from './registration-subcategory.entity';

const DEFAULT_REGISTRATION_CATEGORIES = [
  { id: 1, name: 'Agriculture' },
  { id: 2, name: 'Ecommerce' },
  { id: 3, name: 'Services' },
] as const;

const DEFAULT_REGISTRATION_SUBCATEGORIES = [
  { name: 'Nursery', categoryId: 1 },
  { name: 'Seeds', categoryId: 1 },
  { name: 'Fashion', categoryId: 2 },
  { name: 'Electronics', categoryId: 2 },
] as const;

type RegistrationCategoryResponse = {
  id: number;
  name: string;
};

type RegistrationSubCategoryResponse = {
  id: number;
  name: string;
  categoryId: number;
};

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
    @InjectRepository(RegistrationCategory)
    private readonly registrationCategoryRepository: Repository<RegistrationCategory>,
    @InjectRepository(RegistrationSubCategory)
    private readonly registrationSubCategoryRepository: Repository<RegistrationSubCategory>,
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

  private async seedRegistrationCategories() {
    const expectedCategoryIds = DEFAULT_REGISTRATION_CATEGORIES.map(
      (category) => category.id,
    );
    const existingCategories = await this.registrationCategoryRepository.find();
    const existingById = new Map(
      existingCategories.map((category) => [category.id, category]),
    );

    const recordsToSave: RegistrationCategory[] = [];
    for (const expectedCategory of DEFAULT_REGISTRATION_CATEGORIES) {
      const existingCategory = existingById.get(expectedCategory.id);
      if (!existingCategory) {
        recordsToSave.push(
          this.registrationCategoryRepository.create({
            id: expectedCategory.id,
            name: expectedCategory.name,
            status: true,
          }),
        );
        continue;
      }

      if (
        existingCategory.name !== expectedCategory.name ||
        existingCategory.status !== true
      ) {
        existingCategory.name = expectedCategory.name;
        existingCategory.status = true;
        recordsToSave.push(existingCategory);
      }
    }

    if (recordsToSave.length > 0) {
      await this.registrationCategoryRepository.save(recordsToSave);
    }

    await this.registrationCategoryRepository.delete({
      id: Not(In(expectedCategoryIds)),
    });
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

  private async seedRegistrationSubCategories() {
    const existingSubCategories =
      await this.registrationSubCategoryRepository.find();
    const expectedKeys = new Set(
      DEFAULT_REGISTRATION_SUBCATEGORIES.map(
        (subCategory) =>
          `${subCategory.categoryId}:${subCategory.name.toLowerCase()}`,
      ),
    );
    const existingByKey = new Map(
      existingSubCategories.map((subCategory) => [
        `${subCategory.categoryId}:${subCategory.name.toLowerCase()}`,
        subCategory,
      ]),
    );

    const recordsToSave: RegistrationSubCategory[] = [];

    for (const expectedSubCategory of DEFAULT_REGISTRATION_SUBCATEGORIES) {
      const key = `${expectedSubCategory.categoryId}:${expectedSubCategory.name.toLowerCase()}`;
      const existingSubCategory = existingByKey.get(key);

      if (!existingSubCategory) {
        recordsToSave.push(
          this.registrationSubCategoryRepository.create({
            name: expectedSubCategory.name,
            categoryId: expectedSubCategory.categoryId,
          }),
        );
        continue;
      }

      if (existingSubCategory.name !== expectedSubCategory.name) {
        existingSubCategory.name = expectedSubCategory.name;
        recordsToSave.push(existingSubCategory);
      }
    }

    if (recordsToSave.length > 0) {
      await this.registrationSubCategoryRepository.save(recordsToSave);
    }

    const staleSubCategoryIds = existingSubCategories
      .filter(
        (subCategory) =>
          !expectedKeys.has(
            `${subCategory.categoryId}:${subCategory.name.toLowerCase()}`,
          ),
      )
      .map((subCategory) => subCategory.id);

    if (staleSubCategoryIds.length > 0) {
      await this.registrationSubCategoryRepository.delete(staleSubCategoryIds);
    }
  }

  private async ensureTenantMasterData(organizationId: string) {
    await this.seedCategories(organizationId);
    await this.seedSubCategories(organizationId);
  }

  private async ensureRegistrationMasterData() {
    await this.seedRegistrationCategories();
    await this.seedRegistrationSubCategories();
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

  async getRegistrationCategories(): Promise<RegistrationCategoryResponse[]> {
    await this.ensureRegistrationMasterData();
    return this.registrationCategoryRepository.find({
      where: { status: true },
      select: {
        id: true,
        name: true,
      },
      order: { id: 'ASC' },
    });
  }

  async getSubCategories(
    organizationId?: string,
    categoryId?: number,
  ): Promise<SubCategory[]> {
    if (!organizationId) {
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

    await this.ensureTenantMasterData(organizationId);
    if (categoryId) {
      return this.subCategoryRepository.find({
        where: [
          { organizationId, categoryId },
          { organizationId: IsNull(), categoryId },
        ],
        order: { id: 'ASC' },
      });
    }
    return this.subCategoryRepository.find({
      where: [{ organizationId }, { organizationId: IsNull() }],
      order: { id: 'ASC' },
    });
  }

  async getDashboardSubCategoryById(
    id: number,
    organizationId?: string,
  ): Promise<SubCategory> {
    const where = organizationId
      ? [{ id, organizationId }, { id, organizationId: IsNull() }]
      : { id };

    const subCategory = await this.subCategoryRepository.findOne({
      where,
      relations: ['category'],
    });
    if (!subCategory) {
      throw new NotFoundException(`SubCategory with ID ${id} not found`);
    }
    return subCategory;
  }

  async getRegistrationSubCategories(
    categoryId?: number,
  ): Promise<RegistrationSubCategoryResponse[]> {
    await this.ensureRegistrationMasterData();
    if (categoryId) {
      return this.registrationSubCategoryRepository.find({
        where: { categoryId },
        select: {
          id: true,
          name: true,
          categoryId: true,
        },
        order: { id: 'ASC' },
      });
    }
    return this.registrationSubCategoryRepository.find({
      select: {
        id: true,
        name: true,
        categoryId: true,
      },
      order: { id: 'ASC' },
    });
  }

  async createSubCategory(
    createSubCategoryDto: CreateSubCategoryDto,
    organizationId: string,
  ): Promise<SubCategory> {
    // Validate that the category exists
    const category = await this.categoryRepository.findOne({
      where: { id: createSubCategoryDto.categoryId, organizationId },
    });
    if (!category) {
      throw new NotFoundException(
        `Category with ID ${createSubCategoryDto.categoryId} not found`,
      );
    }

    const subCategory = this.subCategoryRepository.create({
      ...createSubCategoryDto,
      organizationId,
    });
    return this.subCategoryRepository.save(subCategory);
  }

  async getSubCategoryById(
    id: number,
    organizationId: string,
  ): Promise<SubCategory> {
    const subCategory = await this.subCategoryRepository.findOne({
      where: { id, organizationId },
      relations: ['category'],
    });
    if (!subCategory) {
      throw new NotFoundException(`SubCategory with ID ${id} not found`);
    }
    return subCategory;
  }

  async updateSubCategory(
    id: number,
    updateSubCategoryDto: UpdateSubCategoryDto,
    organizationId: string,
  ): Promise<SubCategory> {
    const subCategory = await this.getSubCategoryById(id, organizationId);

    // If updating categoryId, validate the new category exists
    if (updateSubCategoryDto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateSubCategoryDto.categoryId, organizationId },
      });
      if (!category) {
        throw new NotFoundException(
          `Category with ID ${updateSubCategoryDto.categoryId} not found`,
        );
      }
    }

    const updatedSubCategory = this.subCategoryRepository.merge(
      subCategory,
      updateSubCategoryDto,
    );
    return this.subCategoryRepository.save(updatedSubCategory);
  }

  async deleteSubCategory(
    id: number,
    organizationId: string,
  ): Promise<void> {
    const subCategory = await this.getSubCategoryById(id, organizationId);
    await this.subCategoryRepository.remove(subCategory);
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

  async getAllMenuMasters(organizationId?: string): Promise<MenuMaster[]> {
    if (!organizationId) {
      return this.menuMasterRepository.find({
        where: { status: true },
        order: { displayOrder: 'ASC', id: 'ASC' },
      });
    }

    return this.menuMasterRepository.find({
      where: [
        { organizationId, status: true },
        { organizationId: IsNull(), status: true },
      ],
      order: { displayOrder: 'ASC', id: 'ASC' },
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

  async getAccessibleMenuMasterById(
    id: number,
    organizationId?: string,
  ): Promise<MenuMaster> {
    const where = organizationId
      ? [{ id, organizationId }, { id, organizationId: IsNull(), status: true }]
      : { id, status: true };

    const menuMaster = await this.menuMasterRepository.findOne({ where });
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

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
import { PlanMenuAccess } from './plan-menu-access.entity';
import { Subscription, SubscriptionStatus } from '../subscriptions/entities/subscription.entity';
import { Plan, PlanName } from '../plans/entities/plan.entity';

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

type MenuAccessLookup = {
  organizationId?: string;
  subscriptionId?: string;
};

type MenuSeed = {
  key: string;
  menuName: string;
  path: string;
  parentKey: string | null;
  displayOrder: number;
};

const DEFAULT_MENUS: MenuSeed[] = [
  {
    key: 'dashboard',
    menuName: 'Dashboard',
    path: '/dashboard',
    parentKey: null,
    displayOrder: 1,
  },
  {
    key: 'master',
    menuName: 'Master',
    path: '/master',
    parentKey: null,
    displayOrder: 2,
  },
  {
    key: 'workflow',
    menuName: 'Workflow',
    path: '/workflow',
    parentKey: null,
    displayOrder: 3,
  },
  {
    key: 'report',
    menuName: 'Report',
    path: '/report',
    parentKey: null,
    displayOrder: 4,
  },
  {
    key: 'plant_master',
    menuName: 'Plant Master',
    path: '/master/plant',
    parentKey: 'master',
    displayOrder: 1,
  },
  {
    key: 'plant_variant',
    menuName: 'Plant Variant',
    path: '/master/plant-variant',
    parentKey: 'master',
    displayOrder: 2,
  },
  {
    key: 'category_master',
    menuName: 'Category Master',
    path: '/master/category',
    parentKey: 'master',
    displayOrder: 3,
  },
  {
    key: 'sub_category',
    menuName: 'Sub Category',
    path: '/master/sub-category',
    parentKey: 'master',
    displayOrder: 4,
  },
  {
    key: 'inventory',
    menuName: 'Inventory',
    path: '/workflow/inventory',
    parentKey: 'workflow',
    displayOrder: 1,
  },
  {
    key: 'payments',
    menuName: 'Payments',
    path: '/workflow/payment',
    parentKey: 'workflow',
    displayOrder: 2,
  },
  {
    key: 'print_qr',
    menuName: 'Print QR',
    path: '/workflow/print-qr',
    parentKey: 'workflow',
    displayOrder: 3,
  },
  {
    key: 'scan_sell',
    menuName: 'Scan & Sell',
    path: '/workflow/scan-sell',
    parentKey: 'workflow',
    displayOrder: 4,
  },
  {
    key: 'sales_report',
    menuName: 'Sales Report',
    path: '/report/sales',
    parentKey: 'report',
    displayOrder: 1,
  },
  {
    key: 'log_reports',
    menuName: 'Log Reports',
    path: '/report/log-report',
    parentKey: 'report',
    displayOrder: 2,
  },
  {
    key: 'inventory_report',
    menuName: 'Inventory Reports',
    path: '/report/inventory',
    parentKey: 'report',
    displayOrder: 3,
  },
];

const BASIC_MENU_KEYS: string[] = [
  'dashboard',
  'master',
  'plant_master',
  'plant_variant',
  'category_master',
  'sub_category',
  'workflow',
  'inventory',
  'payments',
  'report',
  'log_reports',
];

const STANDARD_AND_PREMIUM_MENU_KEYS: string[] = [
  ...BASIC_MENU_KEYS,
  'print_qr',
  'scan_sell',
  'sales_report',
  'inventory_report',
];

const PLAN_MENU_KEYS: Record<PlanName, string[]> = {
  [PlanName.BASIC]: BASIC_MENU_KEYS,
  [PlanName.STANDARD]: STANDARD_AND_PREMIUM_MENU_KEYS,
  [PlanName.PREMIUM]: STANDARD_AND_PREMIUM_MENU_KEYS,
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
    @InjectRepository(PlanMenuAccess)
    private readonly planMenuAccessRepository: Repository<PlanMenuAccess>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(RegistrationCategory)
    private readonly registrationCategoryRepository: Repository<RegistrationCategory>,
    @InjectRepository(RegistrationSubCategory)
    private readonly registrationSubCategoryRepository: Repository<RegistrationSubCategory>,
  ) {}

  async onModuleInit() {
    await this.seedBusinessTypes();
    await this.syncPlanMenuAccessByPlanId();
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

  private normalizeText(value: string): string {
    return value.trim().toLowerCase();
  }

  private normalizePath(value: string): string {
    return value.trim().replace(/\/+$/, '').toLowerCase();
  }

  private async upsertDefaultMenus(): Promise<Map<string, MenuMaster>> {
    const allMenus = await this.menuMasterRepository.find({
      order: { id: 'ASC' },
    });

    const menuByPath = new Map<string, MenuMaster>();
    const menuByName = new Map<string, MenuMaster>();

    for (const menu of allMenus) {
      if (menu.path) {
        menuByPath.set(this.normalizePath(menu.path), menu);
      }
      menuByName.set(this.normalizeText(menu.menuName), menu);
    }

    const menuByKey = new Map<string, MenuMaster>();

    for (const definition of DEFAULT_MENUS) {
      const normalizedPath = this.normalizePath(definition.path);
      const normalizedName = this.normalizeText(definition.menuName);
      const existing =
        menuByPath.get(normalizedPath) ?? menuByName.get(normalizedName);

      const parentId = definition.parentKey
        ? menuByKey.get(definition.parentKey)?.id ?? null
        : null;

      if (!existing) {
        const created = await this.menuMasterRepository.save(
          this.menuMasterRepository.create({
            menuName: definition.menuName,
            path: definition.path,
            parentId,
            displayOrder: definition.displayOrder,
            isVisible: true,
            status: true,
          }),
        );

        menuByKey.set(definition.key, created);
        menuByPath.set(normalizedPath, created);
        menuByName.set(normalizedName, created);
        continue;
      }

      const shouldUpdate =
        existing.menuName !== definition.menuName ||
        existing.path !== definition.path ||
        (existing.parentId ?? null) !== parentId ||
        existing.displayOrder !== definition.displayOrder ||
        existing.isVisible !== true ||
        existing.status !== true;

      if (shouldUpdate) {
        existing.menuName = definition.menuName;
        existing.path = definition.path;
        existing.parentId = parentId;
        existing.displayOrder = definition.displayOrder;
        existing.isVisible = true;
        existing.status = true;
        await this.menuMasterRepository.save(existing);
      }

      menuByKey.set(definition.key, existing);
      menuByPath.set(normalizedPath, existing);
      menuByName.set(normalizedName, existing);
    }

    return menuByKey;
  }

  private async syncPlanMenuAccessByPlanId(): Promise<void> {
    const menuByKey = await this.upsertDefaultMenus();
    const plans = await this.planRepository.find();

    for (const plan of plans) {
      const allowedMenuKeys = PLAN_MENU_KEYS[plan.name as PlanName];
      if (!allowedMenuKeys || allowedMenuKeys.length === 0) {
        continue;
      }

      const allowedMenuIds = allowedMenuKeys
        .map((menuKey) => menuByKey.get(menuKey)?.id)
        .filter((menuId): menuId is number => typeof menuId === 'number');

      if (allowedMenuIds.length === 0) {
        continue;
      }

      const existingRows = await this.planMenuAccessRepository.find({
        where: { planId: plan.id },
      });
      const rowByMenuId = new Map(existingRows.map((row) => [row.menuId, row]));

      const rowsToSave: PlanMenuAccess[] = [];

      for (const menuId of allowedMenuIds) {
        const existingRow = rowByMenuId.get(menuId);
        if (!existingRow) {
          rowsToSave.push(
            this.planMenuAccessRepository.create({
              planId: plan.id,
              menuId,
              status: true,
            }),
          );
          continue;
        }

        if (!existingRow.status) {
          existingRow.status = true;
          rowsToSave.push(existingRow);
        }
      }

      for (const existingRow of existingRows) {
        if (allowedMenuIds.includes(existingRow.menuId)) {
          continue;
        }

        if (existingRow.status) {
          existingRow.status = false;
          rowsToSave.push(existingRow);
        }
      }

      if (rowsToSave.length > 0) {
        await this.planMenuAccessRepository.save(rowsToSave);
      }
    }
  }

  private async resolvePlanIdForMenus({
    organizationId,
    subscriptionId,
  }: MenuAccessLookup): Promise<string | null> {
    if (subscriptionId) {
      const subscription = await this.subscriptionRepository.findOne({
        where: { id: subscriptionId },
        relations: ['plan'],
      });

      if (!subscription) {
        throw new NotFoundException(`Subscription with ID ${subscriptionId} not found`);
      }

      return subscription.planId;
    }

    if (!organizationId) {
      const basicPlan = await this.planRepository.findOne({
        where: { name: PlanName.BASIC, isActive: true },
      });
      return basicPlan?.id ?? null;
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: {
        organizationId,
        status: SubscriptionStatus.ACTIVE,
      },
      relations: ['plan'],
    });

    if (subscription?.planId) {
      return subscription.planId;
    }

    const basicPlan = await this.planRepository.findOne({
      where: { name: PlanName.BASIC, isActive: true },
    });

    return basicPlan?.id ?? null;
  }

  private expandMenuIdsWithParents(menuIds: Set<number>, allMenus: MenuMaster[]) {
    const menuById = new Map(allMenus.map((menu) => [menu.id, menu]));
    const expandedIds = new Set(menuIds);
    const pendingIds = [...menuIds];

    while (pendingIds.length > 0) {
      const currentId = pendingIds.pop();
      if (!currentId) {
        continue;
      }

      const currentMenu = menuById.get(currentId);
      if (!currentMenu?.parentId || expandedIds.has(currentMenu.parentId)) {
        continue;
      }

      expandedIds.add(currentMenu.parentId);
      pendingIds.push(currentMenu.parentId);
    }

    return expandedIds;
  }

   private async validateParentMenuOwnership(
     parentId: number,
     currentMenuId?: number,
   ) {
     if (currentMenuId && parentId === currentMenuId) {
       throw new BadRequestException('A menu cannot be its own parent.');
     }

     const parent = await this.menuMasterRepository.findOne({
       where: { id: parentId },
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
  ): Promise<Array<Omit<SubCategory, 'category'> & { categoryName: string }>> {
    if (!organizationId) {
      if (categoryId) {
        const results = await this.subCategoryRepository.find({
          relations: ['category'],
          order: { id: 'ASC' },
          where: { categoryId },
        });
        return results.map((sub) => {
          const { category, ...rest } = sub;
          return {
            ...rest,
            categoryName: category?.name || '',
          };
        });
      }

      const results = await this.subCategoryRepository.find({
        relations: ['category'],
        order: { id: 'ASC' },
      });
      return results.map((sub) => {
        const { category, ...rest } = sub;
        return {
          ...rest,
          categoryName: category?.name || '',
        };
      });
    }

    await this.ensureTenantMasterData(organizationId);
    if (categoryId) {
      const results = await this.subCategoryRepository.find({
        relations: ['category'],
        order: { id: 'ASC' },
        where: [
          { organizationId, categoryId },
          { organizationId: IsNull(), categoryId },
        ],
      });
      return results.map((sub) => {
        const { category, ...rest } = sub;
        return {
          ...rest,
          categoryName: category?.name || '',
        };
      });
    }
    const results = await this.subCategoryRepository.find({
      relations: ['category'],
      order: { id: 'ASC' },
      where: [{ organizationId }, { organizationId: IsNull() }],
    });
    return results.map((sub) => {
      const { category, ...rest } = sub;
      return {
        ...rest,
        categoryName: category?.name || '',
      };
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
    const subCategory = await this.getDashboardSubCategoryById(id, organizationId);
    let nextCategory: Category | null = null;

    // If updating categoryId, validate the new category exists
    if (updateSubCategoryDto.categoryId !== undefined) {
      const category = await this.categoryRepository.findOne({
        where: { id: updateSubCategoryDto.categoryId, organizationId },
      });
      if (!category) {
        throw new NotFoundException(
          `Category with ID ${updateSubCategoryDto.categoryId} not found`,
        );
      }
      nextCategory = category;
    }

    const updatedSubCategory = this.subCategoryRepository.merge(
      subCategory,
      updateSubCategoryDto,
    );
    if (nextCategory) {
      updatedSubCategory.categoryId = nextCategory.id;
      updatedSubCategory.category = nextCategory;
    }
    await this.subCategoryRepository.save(updatedSubCategory);
    // Reload to get the updated category relation
    return this.getDashboardSubCategoryById(id, organizationId);
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
   ): Promise<MenuMaster> {
     if (createMenuMasterDto.parentId) {
       await this.validateParentMenuOwnership(
         createMenuMasterDto.parentId,
       );
     }

     const menuMaster = this.menuMasterRepository.create({
       ...createMenuMasterDto,
     });
     return this.menuMasterRepository.save(menuMaster);
   }

   async getAllMenuMasters({
     organizationId,
     subscriptionId,
   }: MenuAccessLookup = {}): Promise<MenuMaster[]> {
     const allMenus = await this.menuMasterRepository.find({
       where: { status: true, isVisible: true },
       order: { displayOrder: 'ASC', id: 'ASC' },
     });

     const planId = await this.resolvePlanIdForMenus({ organizationId, subscriptionId });

     if (!planId) {
       return [];
     }

     const accessRows = await this.planMenuAccessRepository.find({
       where: { planId, status: true },
       order: { menuId: 'ASC' },
     });

     if (accessRows.length === 0) {
       return [];
     }

     const expandedMenuIds = this.expandMenuIdsWithParents(
       new Set(accessRows.map((row) => row.menuId)),
       allMenus,
     );

     return allMenus.filter((menu) => expandedMenuIds.has(menu.id));
   }

   async getMenuMasterById(
     id: number,
   ): Promise<MenuMaster> {
     const menuMaster = await this.menuMasterRepository.findOne({
       where: { id },
     });
     if (!menuMaster) {
       throw new NotFoundException(`MenuMaster with ID ${id} not found`);
     }
     return menuMaster;
   }

    async getAccessibleMenuMasterById(
      id: number,
    ): Promise<MenuMaster> {
      const menuMaster = await this.menuMasterRepository.findOne({
        where: { id, status: true },
      });
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

      if (updateMenuMasterDto.parentId) {
        await this.validateParentMenuOwnership(
          updateMenuMasterDto.parentId,
          id,
        );
      }

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

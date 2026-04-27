import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan, PlanFeature, PlanName } from './entities/plan.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

const SEED_PLANS = [
  { name: PlanName.BASIC, price: 999, features: [PlanFeature.INVENTORY, PlanFeature.BILLING, PlanFeature.PAYMENTS] },
  { name: PlanName.STANDARD, price: 1999, features: [PlanFeature.INVENTORY, PlanFeature.BILLING, PlanFeature.POS, PlanFeature.REPORTS, PlanFeature.PAYMENTS, PlanFeature.QR] },
  { name: PlanName.PREMIUM, price: 2999, features: [PlanFeature.INVENTORY, PlanFeature.BILLING, PlanFeature.POS, PlanFeature.REPORTS, PlanFeature.PAYMENTS, PlanFeature.QR, PlanFeature.ANALYTICS] },
];

@Injectable()
export class PlansService implements OnModuleInit {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
  ) {}

  async onModuleInit() {
    const existingPlans = await this.planRepo.find();
    const planByName = new Map(existingPlans.map((plan) => [plan.name, plan]));
    const plansToSave: Plan[] = [];

    for (const seedPlan of SEED_PLANS) {
      const existingPlan = planByName.get(seedPlan.name);

      if (!existingPlan) {
        plansToSave.push(this.planRepo.create(seedPlan));
        continue;
      }

      const nextFeatures = [...seedPlan.features].sort();
      const currentFeatures = [...(existingPlan.features ?? [])].sort();
      const featuresChanged =
        nextFeatures.length !== currentFeatures.length ||
        nextFeatures.some((feature, index) => feature !== currentFeatures[index]);

      if (
        Number(existingPlan.price) !== Number(seedPlan.price) ||
        featuresChanged ||
        existingPlan.isActive !== true
      ) {
        existingPlan.price = seedPlan.price;
        existingPlan.features = seedPlan.features;
        existingPlan.isActive = true;
        plansToSave.push(existingPlan);
      }
    }

    if (plansToSave.length > 0) {
      await this.planRepo.save(plansToSave);
    }
  }

  async create(dto: CreatePlanDto): Promise<Plan> {
    const existing = await this.planRepo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException(`Plan with name "${dto.name}" already exists`);
    return this.planRepo.save(this.planRepo.create(dto));
  }

  findAll(): Promise<Plan[]> {
    return this.planRepo.find({ order: { price: 'ASC' } });
  }

  findAllActive(): Promise<Plan[]> {
    return this.planRepo.find({ where: { isActive: true }, order: { price: 'ASC' } });
  }

  async findOne(id: string): Promise<Plan> {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async findCheapest(): Promise<Plan> {
    const plan = await this.planRepo.findOne({
      where: { isActive: true },
      order: { price: 'ASC' },
    });
    if (!plan) throw new NotFoundException('No active plans found');
    return plan;
  }

  async update(id: string, dto: UpdatePlanDto): Promise<Plan> {
    const plan = await this.findOne(id);
    if (dto.name && dto.name !== plan.name) {
      const existing = await this.planRepo.findOne({ where: { name: dto.name } });
      if (existing) throw new ConflictException(`Plan with name "${dto.name}" already exists`);
    }
    Object.assign(plan, dto);
    return this.planRepo.save(plan);
  }

  async remove(id: string): Promise<void> {
    const plan = await this.findOne(id);
    await this.planRepo.remove(plan);
  }
}

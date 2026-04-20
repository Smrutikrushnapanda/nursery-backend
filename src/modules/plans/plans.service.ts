import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan, PlanFeature, PlanName } from './entities/plan.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

const SEED_PLANS = [
  { name: PlanName.BASIC, price: 999, features: [PlanFeature.INVENTORY, PlanFeature.BILLING] },
  { name: PlanName.STANDARD, price: 1999, features: [PlanFeature.INVENTORY, PlanFeature.BILLING, PlanFeature.POS, PlanFeature.REPORTS, PlanFeature.PAYMENTS] },
  { name: PlanName.PREMIUM, price: 2999, features: [PlanFeature.INVENTORY, PlanFeature.BILLING, PlanFeature.POS, PlanFeature.REPORTS, PlanFeature.PAYMENTS, PlanFeature.QR, PlanFeature.ANALYTICS] },
];

@Injectable()
export class PlansService implements OnModuleInit {
  constructor(
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
  ) {}

  async onModuleInit() {
    // Only seed if table is completely empty — never overwrites admin changes
    const count = await this.planRepo.count();
    if (count === 0) {
      await this.planRepo.save(SEED_PLANS.map((p) => this.planRepo.create(p)));
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

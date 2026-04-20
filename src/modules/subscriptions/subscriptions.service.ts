import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { Plan } from '../plans/entities/plan.entity';
import { PlansService } from '../plans/plans.service';
import { SubscribeDto, UpgradeDto } from './dto/subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    private readonly plansService: PlansService,
  ) {}

  async subscribe(dto: SubscribeDto, organizationId: string): Promise<Subscription> {
    const existing = await this.getActive(organizationId).catch(() => null);
    if (existing) {
      throw new BadRequestException('Organization already has an active subscription. Use /upgrade instead.');
    }

    const plan = await this.plansService.findOne(dto.planId);
    return this.createSubscription(organizationId, plan, 30);
  }

  async getActive(organizationId: string): Promise<Subscription> {
    const sub = await this.subRepo.findOne({
      where: { organizationId, status: SubscriptionStatus.ACTIVE },
      relations: ['plan'],
    });
    if (!sub) throw new NotFoundException('No active subscription found');
    return sub;
  }

  async upgrade(dto: UpgradeDto, organizationId: string): Promise<Subscription> {
    const current = await this.getActive(organizationId).catch(() => null);
    const newPlan = await this.plansService.findOne(dto.planId);

    if (current) {
      const currentPrice = Number(current.plan.price);
      const newPrice = Number(newPlan.price);

      if (newPrice <= currentPrice) {
        throw new BadRequestException('Can only upgrade to a higher-priced plan');
      }

      // Cancel current and extend end date by remaining days + 30
      const remainingMs = current.endDate.getTime() - Date.now();
      const remainingDays = Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60 * 24)));

      current.status = SubscriptionStatus.CANCELLED;
      await this.subRepo.save(current);

      return this.createSubscription(organizationId, newPlan, 30 + remainingDays);
    }

    return this.createSubscription(organizationId, newPlan, 30);
  }

  async cancel(organizationId: string): Promise<Subscription> {
    const sub = await this.getActive(organizationId);
    sub.status = SubscriptionStatus.CANCELLED;
    return this.subRepo.save(sub);
  }

  async createFreeTrial(organizationId: string): Promise<Subscription> {
    const existing = await this.subRepo.findOne({
      where: { organizationId, status: SubscriptionStatus.ACTIVE },
    });
    if (existing) return existing;

    const basicPlan = await this.plansService.findCheapest();
    return this.createSubscription(organizationId, basicPlan, 7);
  }

  async getActiveForFeatureCheck(organizationId: string): Promise<Subscription | null> {
    return this.subRepo.findOne({
      where: { organizationId, status: SubscriptionStatus.ACTIVE },
      relations: ['plan'],
    });
  }

  private async createSubscription(
    organizationId: string,
    plan: Plan,
    days: number,
  ): Promise<Subscription> {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    const sub = this.subRepo.create({
      organizationId,
      planId: plan.id,
      startDate,
      endDate,
      status: SubscriptionStatus.ACTIVE,
    });

    return this.subRepo.save(sub);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async expireSubscriptions() {
    await this.subRepo.update(
      { status: SubscriptionStatus.ACTIVE, endDate: LessThan(new Date()) },
      { status: SubscriptionStatus.EXPIRED },
    );
  }
}

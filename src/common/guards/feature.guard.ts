import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY } from '../decorators/require-feature.decorator';
import { PlanFeature } from '../../modules/plans/entities/plan.entity';
import { SubscriptionsService } from '../../modules/subscriptions/subscriptions.service';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<PlanFeature>(FEATURE_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!feature) return true;

    const request = ctx.switchToHttp().getRequest<{ user: { organizationId: string } }>();
    const organizationId = request.user?.organizationId;

    if (!organizationId) throw new ForbiddenException('Organization context missing');

    const sub = await this.subscriptionsService.getActiveForFeatureCheck(organizationId);

    if (!sub) {
      throw new ForbiddenException('No active subscription. Please subscribe to a plan.');
    }

    if (!sub.plan.features.includes(feature)) {
      throw new ForbiddenException(`Upgrade your plan to access ${feature}`);
    }

    return true;
  }
}

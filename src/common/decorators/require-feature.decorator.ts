import { SetMetadata } from '@nestjs/common';
import { PlanFeature } from '../../modules/plans/entities/plan.entity';

export const FEATURE_KEY = 'required_feature';
export const RequireFeature = (feature: PlanFeature) => SetMetadata(FEATURE_KEY, feature);

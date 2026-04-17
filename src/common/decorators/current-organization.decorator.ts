import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type AuthenticatedRequest = {
  user: {
    organizationId?: string;
    organization_id?: string;
    orgId?: string;
  };
};

export const CurrentOrganization = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return (
      request.user?.organizationId ??
      request.user?.organization_id ??
      request.user?.orgId
    );
  },
);

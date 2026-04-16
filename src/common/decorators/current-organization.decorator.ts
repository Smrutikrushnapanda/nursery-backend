import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type AuthenticatedRequest = {
  user: {
    organizationId: string;
  };
};

export const CurrentOrganization = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user.organizationId;
  },
);

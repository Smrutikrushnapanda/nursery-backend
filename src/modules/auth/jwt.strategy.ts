import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

type JwtPayload = {
  sub?: string;
  userId?: string;
  id?: string;
  organizationId?: string;
  organization_id?: string;
  orgId?: string;
  role?: string;
};

function extractTokenFromRequest(request: Request): string | null {
  if (!request || !request.headers) {
    return null;
  }

  // 1. Try cookie first
  const cookieToken = (request as any).cookies?.access_token;
  if (typeof cookieToken === 'string' && cookieToken.trim()) {
    return cookieToken.trim();
  }

  const authorizationHeader = request.headers.authorization;
  if (typeof authorizationHeader === 'string' && authorizationHeader.trim()) {
    const value = authorizationHeader.trim();
    const parts = value.split(/\s+/);

    if (parts.length === 1) {
      return parts[0];
    }

    if (parts.length === 2 && /^(bearer|token)$/i.test(parts[0])) {
      return parts[1];
    }

    if (
      parts.length === 3 &&
      /^bearer$/i.test(parts[0]) &&
      /^bearer$/i.test(parts[1])
    ) {
      return parts[2];
    }
  }

  const xAccessToken = request.headers['x-access-token'];
  if (typeof xAccessToken === 'string' && xAccessToken.trim()) {
    return xAccessToken.trim();
  }

  const accessTokenHeader = request.headers['access-token'];
  if (typeof accessTokenHeader === 'string' && accessTokenHeader.trim()) {
    return accessTokenHeader.trim();
  }

  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret =
      config.get<string>('JWT_SECRET') ?? 'change-me-in-production';

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        extractTokenFromRequest,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload) {
    const userId = payload.sub ?? payload.userId ?? payload.id;
    if (!userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const organizationId =
      payload.organizationId ?? payload.organization_id ?? payload.orgId;

    if (!organizationId) {
      throw new UnauthorizedException('Organization context is missing in token');
    }

    return {
      userId,
      organizationId,
      role: payload.role,
    };
  }
}

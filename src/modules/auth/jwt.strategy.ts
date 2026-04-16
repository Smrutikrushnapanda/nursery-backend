import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

type JwtPayload = {
  sub: string;
  organizationId: string;
  role: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret =
      config.get<string>('JWT_SECRET') ?? 'change-me-in-production';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload) {
    if (!payload.organizationId) {
      throw new UnauthorizedException();
    }

    return {
      userId: payload.sub,
      organizationId: payload.organizationId,
      role: payload.role,
    };
  }
}

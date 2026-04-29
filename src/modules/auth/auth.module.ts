import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerOptions } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RegisterController } from './register.controller';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { MasterModule } from '../master/master.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

const throttlerConfig: ThrottlerOptions = {
  ttl: 5 * 60 * 1000, // 5 minutes in milliseconds
  limit: 10, // 10 attempts max
};

@Module({
  imports: [
    UsersModule,
    OrganizationsModule,
    MasterModule,
    SubscriptionsModule,
    PassportModule,
    ThrottlerModule.forRoot([throttlerConfig]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'change-me-in-production',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController, RegisterController],
})
export class AuthModule {}

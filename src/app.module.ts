import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { PlantsModule } from './modules/plants/plants.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { OrdersModule } from './modules/orders/orders.module';
import { QrModule } from './modules/qr/qr.module';
import { CartModule } from './modules/cart/cart.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { MasterModule } from './modules/master/master.module';
import { ReportsModule } from './modules/reports/reports.module';
import { InvoiceModule } from './modules/invoices/invoice.module';
import { PosModule } from './modules/pos/pos.module';
import { LogReportModule } from './modules/log-report/log-report.module';
import { PlansModule } from './modules/plans/plans.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { EmailModule } from './modules/email/email.module';
import { BillingModule } from './modules/billing/billing.module';
import { ensureQrCodeSchema } from './database/ensure-qr-code-schema';

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function getDatabaseType(databaseUrl: string): TypeOrmModuleOptions['type'] {
  try {
    const protocol = new URL(databaseUrl).protocol
      .replace(':', '')
      .toLowerCase();

    if (protocol === 'postgres' || protocol === 'postgresql') {
      return 'postgres';
    }

    if (protocol === 'mysql') {
      return 'mysql';
    }

    if (protocol === 'mariadb') {
      return 'mariadb';
    }
  } catch (error) {
    throw new Error(
      `Invalid DATABASE_URL. Please check your connection string. ${(error as Error).message}`,
    );
  }

  throw new Error(
    'Unsupported database protocol in DATABASE_URL. Use postgresql://, mysql://, or mariadb://.',
  );
}

@Module({
  imports: [
    // Priority: env-specific local > env-specific > local > default.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV ?? 'development'}.local`,
        `.env.${process.env.NODE_ENV ?? 'development'}`,
        '.env.local',
        '.env',
      ],
      cache: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService,
      ): Promise<TypeOrmModuleOptions> => {
        const databaseUrl = configService.get<string>('DATABASE_URL');

        if (!databaseUrl) {
          throw new Error(
            'DATABASE_URL is missing. Add it to your environment variables or .env file.',
          );
        }

        const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';
        const isProduction = nodeEnv === 'production';
        const dbLogging = parseBoolean(
          configService.get<string>('DB_LOGGING'),
          !isProduction,
        );
        const dbSynchronize = parseBoolean(
          configService.get<string>('DB_SYNCHRONIZE'),
          !isProduction,
        );

        const databaseType = getDatabaseType(databaseUrl);

        if (dbSynchronize && databaseType === 'postgres') {
          await ensureQrCodeSchema(databaseUrl);
        }

        return {
          type: databaseType,
          url: databaseUrl,
          autoLoadEntities: true,
          synchronize: dbSynchronize,
          logging: dbLogging,
          retryAttempts: 5,
          retryDelay: 3_000,
        };
      },
    }),
    OrganizationsModule,
    CategoriesModule,
    PlantsModule,
    AuthModule,
    UsersModule,
    PaymentsModule,
    OrdersModule,
    QrModule,
    CartModule,
    InventoryModule,
    MasterModule,
    ReportsModule,
    InvoiceModule,
    PosModule,
    LogReportModule,
    PlansModule,
    SubscriptionsModule,
    EmailModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Application, Request, Response } from 'express';
import { AppModule } from './app.module';

function parseCorsOrigins(value?: string): true | string[] {
  if (!value) {
    return true;
  }

  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : true;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function getDatabaseDetails(
  databaseUrl?: string,
  providerLabel?: string,
): {
  provider: string;
  name: string;
} {
  if (!databaseUrl) {
    return {
      provider: providerLabel ?? 'Database',
      name: 'unknown_database',
    };
  }

  try {
    const parsedUrl = new URL(databaseUrl);
    const protocol = parsedUrl.protocol.replace(':', '').toLowerCase();

    let provider = providerLabel ?? 'Database';
    if (protocol === 'mysql' || protocol === 'mariadb') {
      provider = providerLabel ?? 'MySQL';
    } else if (protocol === 'postgres' || protocol === 'postgresql') {
      provider = providerLabel ?? 'PostgreSQL';
    }

    const name = parsedUrl.pathname.replace(/^\//, '') || 'unknown_database';

    return { provider, name };
  } catch {
    return { provider: 'Database', name: 'unknown_database' };
  }
}

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  const port = Number(process.env.PORT ?? 8080);
  const apiPrefix = process.env.API_PREFIX ?? 'api';
  const swaggerPath = process.env.SWAGGER_PATH ?? 'api-docs';
  const swaggerEnabled = parseBoolean(process.env.SWAGGER_ENABLED, true);
  const dbInfo = getDatabaseDetails(
    process.env.DATABASE_URL,
    process.env.DB_PROVIDER_LABEL,
  );

  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance() as Application;

  app.setGlobalPrefix(apiPrefix);
  expressApp.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      message: 'Nursery backend is running',
      apiBaseUrl: `/${apiPrefix}`,
    });
  });
  app.enableCors({
    origin: parseCorsOrigins(process.env.CORS_ORIGIN),
    credentials: true,
  });
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: isProduction,
    }),
  );

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(process.env.SWAGGER_TITLE ?? 'Nursery API')
      .setDescription(
        process.env.SWAGGER_DESCRIPTION ?? 'Nursery backend API documentation',
      )
      .setVersion(process.env.SWAGGER_VERSION ?? '1.0.0')
      .addBearerAuth()
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPath, app, swaggerDocument);
  }

  await app.listen(port);
  console.log(`${dbInfo.provider} Connection Pool initialized`);
  if (dbInfo.name === 'unknown_database') {
    console.log(`✅ Connected to ${dbInfo.provider} database`);
  } else {
    console.log(`✅ Connected to ${dbInfo.provider} database: ${dbInfo.name}`);
  }
  console.log('✅ Connected to DB');
  console.log(`🚀 Server running at: http://localhost:${port}`);
  if (swaggerEnabled) {
    console.log(`📚 Swagger docs: http://localhost:${port}/${swaggerPath}`);
  }
}

void bootstrap();

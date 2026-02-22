import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppValidationPipe } from './common/pipes/validation.pipe';
import { QueueService } from './modules/queue/queue.service';
import { VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import { DeprecationInterceptor } from './common/interceptors/deprecation.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Configuration service
  const configService = app.get(ConfigService);

  // Queue service (lifecycle hooks handle shutdown automatically)
  const queueService = app.get(QueueService);

  // Enable CORS
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',') : '*',
    credentials: configService.get<boolean>('CORS_CREDENTIALS', true),
  });

  // Security middleware
  app.use(helmet());

  // Global prefix (base path for all APIs)
  app.setGlobalPrefix('api');

  // Enable API versioning (URL-based, e.g. /v1/, /v2/)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global validation pipe
  app.useGlobalPipes(AppValidationPipe);

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalInterceptors(new DeprecationInterceptor());

  // Enable shutdown hooks (for services like QueueService)
  app.enableShutdownHooks();

  // Swagger setup
  if (configService.get<boolean>('SWAGGER_ENABLED', true)) {
    const config = new DocumentBuilder()
      .setTitle('Stellar Insured API')
      .setDescription('API documentation for Stellar Insured backend')
      .setVersion(configService.get<string>('APP_VERSION', '1.0'))
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(
      configService.get<string>('SWAGGER_PATH', '/api/docs'),
      app,
      document,
    );
  }

  // Get port from config
  const port = configService.get<number>('PORT', 4000);

  await app.listen(port);

  // Log startup information
  /* eslint-disable no-console */
  console.log(`\n🚀 Application is running on: http://localhost:${port}`);
  console.log(`🌍 Environment: ${configService.get('NODE_ENV', 'development')}`);
  console.log(`📋 Swagger UI: http://localhost:${port}/api/docs`);
  /* eslint-enable no-console */
}

void bootstrap();

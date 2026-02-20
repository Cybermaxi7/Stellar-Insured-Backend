import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppValidationPipe } from './common/pipes/validation.pipe';
import { QueueService } from './modules/queue/queue.service';
import helmet from 'helmet';
import * as fs from 'fs';

async function bootstrap(): Promise<void> {
  // Load configuration first to check for HTTPS
  const tempApp = await NestFactory.create(AppModule, { logger: false });
  const configService = tempApp.get(ConfigService);

  const httpsKeyPath = configService.get<string>('HTTPS_KEY_PATH');
  const httpsCertPath = configService.get<string>('HTTPS_CERT_PATH');

  let httpsOptions = null;
  if (httpsKeyPath && httpsCertPath) {
    try {
      httpsOptions = {
        key: fs.readFileSync(httpsKeyPath),
        cert: fs.readFileSync(httpsCertPath),
      };
      console.log('HTTPS configuration detected and loaded.');
    } catch (error) {
      console.error('Failed to load HTTPS certificates:', error.message);
    }
  }

  await tempApp.close();

  const app = await NestFactory.create(AppModule, { httpsOptions });

  // Get configuration service from the new app instance
  const appConfigService = app.get(ConfigService);
  // queueService is available for manual use if needed, but we rely on lifecycle hooks now
  const queueService = app.get(QueueService);

  // Enable CORS
  const corsOrigin = appConfigService.get<string>('CORS_ORIGIN');
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',') : '*',
    credentials: appConfigService.get<boolean>('CORS_CREDENTIALS', true),
  });

  // Security middleware
  app.use(helmet());

  // Set global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(AppValidationPipe);

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Enable shutdown hooks
  // This allows services (like QueueService) to run their OnModuleDestroy logic automatically
  app.enableShutdownHooks();

  // Swagger setup
  if (appConfigService.get<boolean>('SWAGGER_ENABLED', true)) {
    const config = new DocumentBuilder()
      .setTitle('Stellar Insured API')
      .setDescription('API documentation for Stellar Insured backend')
      .setVersion(appConfigService.get<string>('APP_VERSION', '1.0'))
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(
      appConfigService.get<string>('SWAGGER_PATH', '/api/docs'),
      app,
      document,
    );
  }

  // Get port from config
  const port = appConfigService.get<number>('PORT', 4000);

  await app.listen(port);

  // Log startup information
  /* eslint-disable no-console */
  console.log(`\n Application is running on: http://localhost:${port}`);
  console.log(` Environment: ${appConfigService.get('NODE_ENV', 'development')}`);
  console.log(`📋 Swagger UI: http://localhost:${port}/api/docs`);
  /* eslint-enable no-console */
}

void bootstrap();
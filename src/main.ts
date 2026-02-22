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
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import * as fs from 'fs';
import { rabbitConfig } from './queue/rabbitmq.config';
import * as cookieParser from 'cookie-parser';
import csurf from 'csurf';
import { ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  
  try {
    console.log('--- INICIANDO LEVANTAMIENTO DEL SERVIDOR ---');
  // Configuration service
  const configService = app.get(ConfigService);

  // Queue service (lifecycle hooks handle shutdown automatically)
  const queueService = app.get(QueueService);
    const app = await NestFactory.create(AppModule);
    const appConfigService = app.get(ConfigService);

    // HTTPS configuration
    const httpsKeyPath = appConfigService.get<string>('HTTPS_KEY_PATH');
    const httpsCertPath = appConfigService.get<string>('HTTPS_CERT_PATH');

    if (httpsKeyPath && httpsCertPath && fs.existsSync(httpsKeyPath)) {
      logger.log('HTTPS configuration detected (Skipped for dev stability)');
    }

  // Global prefix (base path for all APIs)
  app.setGlobalPrefix('api');

  // Enable API versioning (URL-based, e.g. /v1/, /v2/)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
    // CORS configuration
    const corsOrigin = appConfigService.get<string>('CORS_ORIGIN');
    app.enableCors({
      origin: corsOrigin ? corsOrigin.split(',') : '*',
      credentials: appConfigService.get<boolean>('CORS_CREDENTIALS', true),
    });

    // Security middleware
    app.use(helmet());
    app.setGlobalPrefix('api/v1');

    // Global pipes and filters
    app.useGlobalPipes(AppValidationPipe);
    app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalInterceptors(new DeprecationInterceptor());

  // Enable shutdown hooks (for services like QueueService)
  app.enableShutdownHooks();
    // Enable shutdown hooks for graceful shutdown
    app.enableShutdownHooks();
    
    // Make class-validator use NestJS container
    useContainer(app.select(AppModule), { fallbackOnErrors: true });

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
    
    console.log(`---  INTENTANDO ABRIR PUERTO ${port} ---`);
    
    // Connect RabbitMQ microservice
    app.connectMicroservice(rabbitConfig);
    await app.startAllMicroservices();
    
    await app.listen(port);

    // Log startup information
    logger.log(`Application is running on: http://localhost:${port}/api/v1`);
    logger.log(`Swagger UI: http://localhost:${port}/api/docs`);
    logger.log(`Health Check: http://localhost:${port}/health`);
    logger.log(`Liveness Probe: http://localhost:${port}/health/live`);
    logger.log(`Readiness Probe: http://localhost:${port}/health/ready`);

  // Log startup information
  /* eslint-disable no-console */
  console.log(`\n🚀 Application is running on: http://localhost:${port}`);
  console.log(`🌍 Environment: ${configService.get('NODE_ENV', 'development')}`);
  console.log(`📋 Swagger UI: http://localhost:${port}/api/docs`);
  /* eslint-enable no-console */
  } catch (error) {
    console.error('---  ERROR FATAL DURANTE EL BOOTSTRAP ---');
    console.error(error);
    process.exit(1);
  }
}

void bootstrap();

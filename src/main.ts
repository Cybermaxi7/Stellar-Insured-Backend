import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppValidationPipe } from './common/pipes/validation.pipe';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import * as fs from 'fs';
import { rabbitConfig } from './queue/rabbitmq.config';
import * as cookieParser from 'cookie-parser';
import csurf from 'csurf';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  
  try {
    console.log('--- INICIANDO LEVANTAMIENTO DEL SERVIDOR ---');

  
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    
    const httpsKeyPath = configService.get<string>('HTTPS_KEY_PATH');
    const httpsCertPath = configService.get<string>('HTTPS_CERT_PATH');

    if (httpsKeyPath && httpsCertPath && fs.existsSync(httpsKeyPath)) {
        
        logger.log('HTTPS configuration detected (Skipped for dev stability)');
    }

    
    const corsOrigin = configService.get<string>('CORS_ORIGIN');
    app.enableCors({
      origin: corsOrigin ? corsOrigin.split(',') : '*',
      credentials: configService.get<boolean>('CORS_CREDENTIALS', true),
    });

    
    app.use(helmet());
    app.setGlobalPrefix('api/v1');

    
    app.useGlobalPipes(AppValidationPipe);
    app.useGlobalFilters(new GlobalExceptionFilter());

    
    app.enableShutdownHooks();

    
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

    
    const port = configService.get<number>('PORT', 4000);
    
    console.log(`---  INTENTANDO ABRIR PUERTO ${port} ---`);
    await app.listen(port);

    logger.log(`Application is running on: http://localhost:${port}/api/v1`);
    logger.log(`Swagger UI: http://localhost:${port}/api/docs`);

  } catch (error) {
    console.error('---  ERROR FATAL DURANTE EL BOOTSTRAP ---');
    console.error(error);
    process.exit(1);
  }
}

bootstrap();
  app.connectMicroservice(rabbitConfig);

  await app.startAllMicroservices();

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
  console.log(
    ` Environment: ${appConfigService.get('NODE_ENV', 'development')}`,
  );
  console.log(`📋 Swagger UI: http://localhost:${port}/api/docs`);
  /* eslint-enable no-console */
}

void bootstrap();

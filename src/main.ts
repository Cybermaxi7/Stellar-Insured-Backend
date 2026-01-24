import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppValidationPipe } from './common/pipes/validation.pipe';
import helmet from 'helmet';
import { AppConfigService } from './config/app-config.service';
import { Logger } from '@nestjs/common';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  try {
    logger.log('🚀 Starting NestJS application...');

    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    logger.log('✅ NestFactory created successfully');

    // Get configuration service
    const configService = app.get(AppConfigService);
    logger.log('✅ Config service initialized');

    // Enable CORS - Use typed getters
    app.enableCors({
      origin: configService.corsOrigin,
      credentials: configService.corsCredentials,
    });
    logger.log('✅ CORS enabled');

    // Security middleware
    app.use(helmet());
    logger.log('✅ Security middleware loaded');

    // Set global prefix
    app.setGlobalPrefix('api/v1');
    logger.log('✅ Global prefix set to api/v1');

    // Global validation pipe
    app.useGlobalPipes(AppValidationPipe);
    logger.log('✅ Global validation pipe configured');

    // Global exception filter
    app.useGlobalFilters(new GlobalExceptionFilter());
    logger.log('✅ Global exception filter configured');

    // Enable shutdown hooks
    app.enableShutdownHooks();
    logger.log('✅ Shutdown hooks enabled');

    // Swagger setup - Use typed getters
    if (configService.swaggerEnabled) {
      const config = new DocumentBuilder()
        .setTitle('Stellar Insured API')
        .setDescription('API documentation for Stellar Insured backend')
        .setVersion(configService.appVersion)
        .addBearerAuth()
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup(configService.swaggerPath, app, document);
      logger.log('✅ Swagger documentation configured');
    }

    // Get port from config - Use typed getter
    const port = configService.port;
    logger.log(`📡 Attempting to start server on port ${port}...`);

    await app.listen(port);

    // Success message
    logger.log(`\n🎉 ==========================================`);
    logger.log(`🚀 ${configService.appName} v${configService.appVersion}`);
    logger.log(`🌍 Running on: http://localhost:${port}`);
    logger.log(`📊 Environment: ${configService.nodeEnv}`);
    logger.log(
      `📋 Swagger UI: http://localhost:${port}${configService.swaggerPath}`,
    );
    logger.log(`⚡ Health check: http://localhost:${port}/health`);
    logger.log(`🔗 Stellar Network: ${configService.stellarNetwork}`);
    logger.log(
      `💾 Database: ${configService.databaseHost}:${configService.databasePort}`,
    );
    logger.log(
      `🔄 Redis: ${configService.redisHost}:${configService.redisPort}`,
    );
    logger.log(`==========================================\n`);
  } catch (error) {
    logger.error('❌ Failed to bootstrap application:', error);

    // Log the full error stack
    if (error instanceof Error) {
      logger.error(`Error name: ${error.name}`);
      logger.error(`Error message: ${error.message}`);
      logger.error(`Error stack: ${error.stack}`);
    } else {
      logger.error(`Unknown error: ${JSON.stringify(error)}`);
    }

    process.exit(1);
  }
}

// Wrap bootstrap in try-catch at the top level
bootstrap().catch(error => {
  console.error('💥 Unhandled error in bootstrap:', error);
  process.exit(1);
});

import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from './config/config.module';
import { AppConfigService } from './config/app-config.service';
import { DatabaseModule } from './common/database/database.module';
import { CommonModule } from './common/common.module';
import { IdempotencyModule } from './common/idempotency/idempotency.module';
import { IdempotencyInterceptor } from './common/idempotency/interceptors/idempotency.interceptor';
import { EncryptionModule } from './modules/encryption/encryption.module';
import { HealthModule } from './modules/health/health.module';
import { CachingModule } from './common/caching/caching.module';
import { ClaimsModule } from './modules/claims/claims.module';
import { PolicyModule } from './modules/policy/policy.module';
import { DaoModule } from './modules/dao/dao.module';
import { NotificationModule } from './modules/notification/notification.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { FileModule } from './modules/file/file.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { QueueModule } from './modules/queue/queue.module';
import { AuditLogModule } from './common/audit-log/audit-log.module';
import { AuditModule } from './modules/audit/audit.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { FilesController } from './modules/files/files.controller';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { OracleModule } from './modules/oracle/oracle.module';
import { RateLimitingModule } from './common/rate-limiting.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigModule,
    HealthModule,
    EncryptionModule,
    CachingModule,

    // Redis-based cache for distributed rate limiting
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: AppConfigService) => {
        // Use Redis in production, in-memory for development/testing
        if (configService.isProductionEnvironment) {
          const redisStore = require('cache-manager-redis-yet').redisStore;
          return {
            isGlobal: true,
            store: redisStore,
            url: configService.redisUrl,
            ttl: configService.redisTtl,
            max: 10000,
          };
        } else {
          // For development and testing environments
          return {
            isGlobal: true,
            ttl: 5, // 5 seconds for dev
            max: 10000,
          };
        }
      },
      inject: [AppConfigService],
    }),
    CommonModule,
    DatabaseModule,
    IdempotencyModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: AppConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: configService.throttleDefaultTtl,
            limit: configService.throttleDefaultLimit,
          },
          {
            name: 'auth',
            ttl: configService.throttleAuthTtl,
            limit: configService.throttleAuthLimit,
          },
          {
            name: 'public',
            ttl: configService.throttlePublicTtl,
            limit: configService.throttlePublicLimit,
          },
          {
            name: 'admin',
            ttl: configService.throttleAdminTtl,
            limit: configService.throttleAdminLimit,
          },
          {
            name: 'claims',
            ttl: configService.rateLimitCreateClaimTtl,
            limit: configService.rateLimitCreateClaimLimit,
          },
          {
            name: 'policies',
            ttl: configService.rateLimitCreatePolicyTtl,
            limit: configService.rateLimitCreatePolicyLimit,
          },
        ],
      }),
      inject: [AppConfigService],
    }),
    HealthModule,
    ClaimsModule,
    PolicyModule,
    DaoModule,
    NotificationModule,
    UsersModule,
    AuthModule,
    AnalyticsModule,
    FileModule,
    PaymentsModule,
    QueueModule,
    AuditLogModule,
    AuditModule,
    DashboardModule,
    OracleModule,
    RateLimitingModule,
  ],
  controllers: [AppController, FilesController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    }
  ],
})
export class AppModule { }
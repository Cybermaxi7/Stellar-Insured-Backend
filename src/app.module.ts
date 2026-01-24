import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigService } from './config/app-config.service';
import { DatabaseModule } from './common/database/database.module';
import { HealthModule } from './modules/health/health.module';
import { ClaimsModule } from './modules/claims/claims.module';
import { PolicyModule } from './modules/policy/policy.module';
import { DaoModule } from './modules/dao/dao.module';
import { NotificationModule } from './modules/notification/notification.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { FileModule } from './modules/file/file.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { QueueModule } from './modules/queue/queue.module';
import { AuditLogModule } from './common/audit-log/audit-log.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FilesController } from './modules/files/files.controller';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [
    ConfigModule,
    HealthModule,
    AuditLogModule,
    QueueModule,
    PaymentsModule,
    AuthModule,
    UsersModule,
    DatabaseModule,
    ClaimsModule,
    PolicyModule,
    DaoModule,
    NotificationModule,
    FileModule,
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        throttlers: [
          {
            ttl: Number(configService.get('THROTTLE_TTL') ?? 60),
            limit: Number(configService.get('THROTTLE_LIMIT') ?? 100),
          },
        ],
      }),
    }),
  ],
  controllers: [AppController, FilesController],
  providers: [AppService, AppConfigService],
})
export class AppModule {}

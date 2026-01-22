import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './modules/health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FilesController } from './modules/files/files.controller';

@Module({
  imports: [ConfigModule, HealthModule],
  controllers: [AppController, FilesController],
  providers: [AppService],
})
export class AppModule {}

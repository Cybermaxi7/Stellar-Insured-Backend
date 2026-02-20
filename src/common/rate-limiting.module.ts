import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { RateLimitService } from './services/rate-limit.service';
import { MonitoringService } from './services/monitoring.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    RateLimitService,
    MonitoringService,
    CircuitBreakerService,
  ],
  exports: [
    RateLimitService,
    MonitoringService,
    CircuitBreakerService,
  ],
})
export class RateLimitingModule {}
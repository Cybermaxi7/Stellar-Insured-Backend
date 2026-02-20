import { Global, Module } from '@nestjs/common';
import { ExternalServiceClient } from './services/external-service.client';

@Global()
@Module({
  providers: [ExternalServiceClient],
  exports: [ExternalServiceClient],
})
export class CommonModule {}

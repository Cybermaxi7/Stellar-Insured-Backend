import { Module } from '@nestjs/common';
import { ClaimsService } from './claims.service';

@Module({
  providers: [ClaimsService],
  exports: [ClaimsService],
})
export class ClaimsModule {}

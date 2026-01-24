import { Module } from '@nestjs/common';
import { ClaimAuditLogListener } from '../listeners/claim-audit-log.listener';
import { QueueModule } from '../../modules/queue';
import { AuditLogService } from '../services/audit-log.service';

@Module({
  imports: [QueueModule],
  providers: [AuditLogService, ClaimAuditLogListener],
  exports: [AuditLogService],
})
export class AuditLogModule {}

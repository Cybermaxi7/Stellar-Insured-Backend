import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { AuditLogJobData } from './interfaces/audit-log-job.interface';

@Injectable()
export class QueueService {
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    @InjectQueue('audit-logs')
    private readonly auditLogsQueue: Queue<AuditLogJobData>,
  ) {}

  /**
   * Add an audit log job to the queue
   */
  async queueAuditLog(data: AuditLogJobData): Promise<void> {
    await this.auditLogsQueue.add(data, {
      jobId: `audit-${data.userId}-${Date.now()}`,
      priority: 10,
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    active: number;
    waiting: number;
    delayed: number;
    failed: number;
    completed: number;
  }> {
    return {
      active: await this.auditLogsQueue.getActiveCount(),
      waiting: await this.auditLogsQueue.getWaitingCount(),
      delayed: await this.auditLogsQueue.getDelayedCount(),
      failed: await this.auditLogsQueue.getFailedCount(),
      completed: await this.auditLogsQueue.getCompletedCount(),
    };
  }

  /**
   * Drain all queues
   */
  async drainQueues(): Promise<void> {
    await this.auditLogsQueue.empty();
  }

  /**
   * Close queue connections
   */
  async closeQueues(): Promise<void> {
    await this.auditLogsQueue.close();
  }

  async onApplicationShutdown(signal?: string) {
    try {
      await this.drainQueues();
      await this.closeQueues();
      console.log(`Queues gracefully shut down (signal: ${signal})`);
    } catch (err) {
      console.error('Error during queue shutdown', err);
    }
  }
}

import type { Job, Queue } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';

@Injectable()
export class GlobalQueueErrorHandler {
  private readonly logger = new Logger(GlobalQueueErrorHandler.name);

  constructor(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    @InjectQueue('audit-logs') private readonly queue: Queue,
  ) {
    // Error event
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    this.queue.on('error', (err: Error) => {
      this.logger.error(err.message, err.stack);
    });

    // Failed event
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    this.queue.on('failed', (job: Job, err: Error) => {
      this.logger.error(
        `Job ${job.id} (${job.name}) failed after ${job.attemptsMade}/${job.opts.attempts} attempts: ${err.message}`,
        err.stack,
      );
    });

    // Completed event
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    this.queue.on('completed', job => {
      this.logger.debug(`Job ${job.id} (${job.name}) completed successfully`);
    });

    // Stalled event
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    this.queue.on('stalled', job => {
      this.logger.warn(`Job ${job.id} (${job.name}) stalled`);
    });

    // Active event
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    this.queue.on('active', job => {
      this.logger.debug(`Job ${job.id} (${job.name}) is now active`);
    });
  }
}

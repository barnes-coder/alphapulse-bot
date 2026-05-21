import { Worker } from 'bullmq';
import { redisConnection } from '../schedulers/notification.scheduler';
import { logger } from '../utils/logger';

new Worker(
  'notifications',
  async (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'Processing notification job');
    return job.data;
  },
  { connection: redisConnection }
);

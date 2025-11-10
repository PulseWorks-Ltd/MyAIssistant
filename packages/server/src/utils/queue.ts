import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const emailSyncQueue = new Queue('email-sync', { connection });
export const aiProcessingQueue = new Queue('ai-processing', { connection });

export { connection };

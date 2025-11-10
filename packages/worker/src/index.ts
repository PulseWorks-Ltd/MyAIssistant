import dotenv from 'dotenv';
import EmailSyncWorker from './workers/emailSync.worker';
import AIProcessingWorker from './workers/aiProcessing.worker';
import logger from './utils/logger';

dotenv.config();

logger.info('Starting Email Copilot Worker...');

const emailSyncWorker = new EmailSyncWorker();
const aiProcessingWorker = new AIProcessingWorker();

logger.info('Workers started successfully');
logger.info('- Email Sync Worker: Active');
logger.info('- AI Processing Worker: Active');

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await emailSyncWorker.close();
  await aiProcessingWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await emailSyncWorker.close();
  await aiProcessingWorker.close();
  process.exit(0);
});

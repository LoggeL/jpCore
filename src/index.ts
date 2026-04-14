import { config } from './config.js';
import { buildApp } from './app.js';
import { runMigrations, closeDb } from './db/client.js';
import { logger } from './services/logger.js';
import { startBackupJobs } from './services/backup.js';

async function main(): Promise<void> {
  runMigrations();

  const app = await buildApp();

  const jobs = config.isTest ? [] : startBackupJobs();

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    logger.info({ port: config.port, env: config.env }, 'jpCore listening');
  } catch (err) {
    logger.error({ err }, 'failed to start server');
    process.exit(1);
  }

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutting down');
    for (const job of jobs) job.stop();
    try {
      await app.close();
      closeDb();
      logger.info('shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void main();

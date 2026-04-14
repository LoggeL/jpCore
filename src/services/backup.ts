import { CronJob } from 'cron';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { join, resolve } from 'node:path';
import { config } from '../config.js';
import { logger } from './logger.js';
import { cleanupExpiredSessions } from '../lib/session.js';

interface BackupPolicy {
  cron: string;
  count: number;
}

const POLICIES: Record<string, BackupPolicy> = {
  daily: { cron: '0 0 * * *', count: 3 },
  weekly: { cron: '0 0 * * 0', count: 3 },
  monthly: { cron: '0 0 1 * *', count: 3 },
};

export function startBackupJobs(): CronJob[] {
  const backupRoot = resolve(process.cwd(), config.backupDir);
  if (!existsSync(backupRoot)) mkdirSync(backupRoot, { recursive: true });

  const jobs: CronJob[] = [];

  for (const [name, policy] of Object.entries(POLICIES)) {
    const dir = join(backupRoot, name);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const job = new CronJob(
      policy.cron,
      () => {
        void runBackup(name, dir, policy.count).catch((err: unknown) => {
          logger.error({ err, name }, 'backup failed');
        });
      },
      null,
      true,
      'Europe/Berlin'
    );

    jobs.push(job);
    logger.info({ name, cron: policy.cron, count: policy.count }, 'backup job scheduled');
  }

  // Hourly session cleanup — removes expired rows.
  const cleanupJob = new CronJob(
    '0 * * * *',
    () => {
      const removed = cleanupExpiredSessions();
      if (removed > 0) logger.info({ removed }, 'expired sessions cleaned up');
    },
    null,
    true,
    'Europe/Berlin'
  );
  jobs.push(cleanupJob);

  return jobs;
}

async function runBackup(name: string, dir: string, maxCount: number): Promise<void> {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const fileName = join(dir, `${timestamp}.sqlite.gz`);

  await pipeline(createReadStream(config.databasePath), createGzip(), createWriteStream(fileName));

  logger.info({ name, fileName }, 'backup created');

  // Rotate: keep only the newest `maxCount` backups.
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sqlite.gz'))
    .sort(); // ISO timestamps sort lexicographically

  if (files.length > maxCount) {
    const toDelete = files.slice(0, files.length - maxCount);
    for (const f of toDelete) {
      try {
        unlinkSync(join(dir, f));
        logger.info({ name, deleted: f }, 'old backup pruned');
      } catch (err) {
        logger.warn({ err, file: f }, 'backup prune failed');
      }
    }
  }
}

/**
 * One-shot migration from the legacy jpCore SQLite schema to the new Drizzle schema.
 *
 * Source (default): C:/Users/Logge/Desktop/jpcore-data.sqlite — never mutated; a timestamped
 * backup is copied beside it before any reads.
 *
 * Target (default): ./data.sqlite — created fresh (or --force wipes an existing one).
 *
 * Usage:
 *   tsx scripts/migrate-from-legacy.ts
 *   tsx scripts/migrate-from-legacy.ts --source /path/to/legacy.sqlite
 *   tsx scripts/migrate-from-legacy.ts --target ./data.dryrun.sqlite --dry-run
 *   tsx scripts/migrate-from-legacy.ts --force   # overwrite non-empty target
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { copyFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as schema from '../src/db/schema.js';

type CliOpts = {
  source: string;
  target: string;
  dryRun: boolean;
  force: boolean;
};

function parseArgs(): CliOpts {
  const opts: CliOpts = {
    source: 'C:/Users/Logge/Desktop/jpcore-data.sqlite',
    target: './data.sqlite',
    dryRun: false,
    force: false,
  };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--source') opts.source = argv[++i] ?? opts.source;
    else if (a === '--target') opts.target = argv[++i] ?? opts.target;
    else if (a === '--dry-run') {
      opts.dryRun = true;
      if (opts.target === './data.sqlite') opts.target = './data.dryrun.sqlite';
    } else if (a === '--force') opts.force = true;
    else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: tsx scripts/migrate-from-legacy.ts [--source path] [--target path] [--dry-run] [--force]'
      );
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(2);
    }
  }
  return opts;
}

/**
 * Parse the legacy `roles` column. The column has mixed encodings:
 *   - null              → []
 *   - ''                → []
 *   - 'admin'           → ['admin']           (bare string)
 *   - '["admin"]'       → ['admin']           (json array of strings)
 *   - '["admin","user"]'→ ['admin','user']
 */
function parseLegacyRoles(raw: unknown): Array<'admin' | 'user'> {
  if (raw == null) return [];
  const s = String(raw).trim();
  if (s === '') return [];
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s) as unknown;
      if (Array.isArray(arr)) {
        return arr
          .map((r) => String(r))
          .filter((r): r is 'admin' | 'user' => r === 'admin' || r === 'user');
      }
    } catch {
      // fall through
    }
  }
  if (s === 'admin' || s === 'user') return [s];
  return [];
}

function backupSource(sourcePath: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${sourcePath}.migration-backup-${ts}`;
  copyFileSync(sourcePath, backupPath);
  return backupPath;
}

function ensureParentDir(filePath: string): void {
  const dir = dirname(resolve(filePath));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function runTargetMigrations(targetPath: string): Database.Database {
  const sqlite = new Database(targetPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  const here = dirname(fileURLToPath(import.meta.url));
  migrate(db, { migrationsFolder: resolve(here, '../src/db/migrations') });
  return sqlite;
}

interface Counts {
  account: number;
  role: number;
  item: number;
  volunteer: number;
  registration: number;
}

function emptyCounts(): Counts {
  return { account: 0, role: 0, item: 0, volunteer: 0, registration: 0 };
}

function printDiffTable(source: Partial<Counts>, target: Counts): void {
  const tables = ['account', 'role', 'item', 'volunteer', 'registration'] as const;
  console.log('\nRow counts:');
  console.log('  table         source   target   ok');
  console.log('  ──────────── ─────── ─────── ────');
  for (const t of tables) {
    const s = source[t];
    const v = target[t];
    const ok = t === 'role' ? '—' : s === v ? '✓' : '✗';
    const sStr = s === undefined ? '—' : String(s);
    console.log(`  ${t.padEnd(12)} ${sStr.padStart(7)} ${String(v).padStart(7)}   ${ok}`);
  }
}

async function main(): Promise<void> {
  const opts = parseArgs();
  console.log(`Source: ${opts.source}`);
  console.log(`Target: ${opts.target}${opts.dryRun ? ' (dry run)' : ''}`);

  if (!existsSync(opts.source)) {
    console.error(`Source DB does not exist: ${opts.source}`);
    process.exit(1);
  }

  ensureParentDir(opts.target);

  // Wipe target if forced, or refuse if non-empty and not forced
  if (existsSync(opts.target)) {
    if (opts.force || opts.dryRun) {
      unlinkSync(opts.target);
      console.log('Removed existing target.');
    } else {
      const existing = new Database(opts.target);
      const row = existing
        .prepare("SELECT COUNT(*) as c FROM sqlite_master WHERE type='table' AND name='account'")
        .get() as { c: number };
      existing.close();
      if (row.c > 0) {
        console.error('Target already exists and contains data. Use --force to overwrite.');
        process.exit(1);
      }
    }
  }

  // Backup the source read-only, never mutated.
  const backupPath = backupSource(opts.source);
  console.log(`Backed up source → ${backupPath}`);

  // Open source read-only
  const src = new Database(opts.source, { readonly: true });

  // Read source row counts up front
  const sourceCounts = {
    account: (src.prepare('SELECT COUNT(*) as c FROM account').get() as { c: number }).c,
    item: (src.prepare('SELECT COUNT(*) as c FROM item').get() as { c: number }).c,
    volunteer: (src.prepare('SELECT COUNT(*) as c FROM volunteer').get() as { c: number }).c,
    registration: (src.prepare('SELECT COUNT(*) as c FROM registration').get() as { c: number }).c,
  };
  console.log('Source row counts:', sourceCounts);

  // Apply migrations to target
  const tgt = runTargetMigrations(opts.target);

  // === Insert account rows ===
  const legacyAccounts = src
    .prepare(
      'SELECT id, name, email, verifiedMail, hash, salt, createdAt, lastActivity, roles FROM account ORDER BY id'
    )
    .all() as Array<{
    id: number;
    name: string | null;
    email: string | null;
    verifiedMail: number | null;
    hash: string | null;
    salt: string | null;
    createdAt: number | null;
    lastActivity: number | null;
    roles: string | null;
  }>;

  const insertAccount = tgt.prepare(`
    INSERT INTO account
      (id, name, email, email_verified_at, password_hash, password_algo, password_salt,
       created_at, updated_at, last_activity_at)
    VALUES (?, ?, ?, ?, ?, 'pbkdf2-100k', ?, ?, ?, ?)
  `);

  const insertRole = tgt.prepare(
    'INSERT INTO role (account_id, name) VALUES (?, ?)'
  );

  const insertItem = tgt.prepare(`
    INSERT INTO item (id, account_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
  `);

  const insertVolunteer = tgt.prepare(`
    INSERT INTO volunteer (id, account_id, duration, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
  `);

  const insertRegistration = tgt.prepare(`
    INSERT INTO registration (id, account_id, people_count, music, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const stats = emptyCounts();
  const skipped: string[] = [];

  const migrateAll = tgt.transaction(() => {
    // Accounts + roles
    for (const a of legacyAccounts) {
      if (!a.email || !a.name || !a.hash) {
        skipped.push(`account#${a.id} missing required fields`);
        continue;
      }
      const emailLower = a.email.toLowerCase().trim();
      const createdAt = a.createdAt ?? Date.now();
      const lastActivityAt = a.lastActivity ?? createdAt;
      const emailVerifiedAt = a.verifiedMail ? createdAt : null;

      insertAccount.run(
        a.id,
        a.name,
        emailLower,
        emailVerifiedAt,
        a.hash,
        a.salt ?? null,
        createdAt,
        lastActivityAt,
        lastActivityAt
      );
      stats.account++;

      const roles = parseLegacyRoles(a.roles);
      for (const r of roles) {
        insertRole.run(a.id, r);
        stats.role++;
      }
    }

    // Items
    const legacyItems = src
      .prepare('SELECT id, account_id, lastActivity, name FROM item ORDER BY id')
      .all() as Array<{ id: number; account_id: number | null; lastActivity: number | null; name: string }>;
    for (const it of legacyItems) {
      const ts = it.lastActivity ?? Date.now();
      insertItem.run(it.id, it.account_id ?? null, it.name, ts, ts);
      stats.item++;
    }

    // Volunteers
    const legacyVolunteers = src
      .prepare('SELECT id, account_id, duration, lastActivity FROM volunteer ORDER BY id')
      .all() as Array<{ id: number; account_id: number; duration: string; lastActivity: number | null }>;
    for (const v of legacyVolunteers) {
      const ts = v.lastActivity ?? Date.now();
      insertVolunteer.run(v.id, v.account_id, v.duration, ts, ts);
      stats.volunteer++;
    }

    // Registrations
    const legacyRegistrations = src
      .prepare(
        'SELECT id, people, account_id, music, lastActivity FROM registration ORDER BY id'
      )
      .all() as Array<{
      id: number;
      people: number | null;
      account_id: number;
      music: string | null;
      lastActivity: number | null;
    }>;
    for (const r of legacyRegistrations) {
      const ts = r.lastActivity ?? Date.now();
      const people = r.people && r.people >= 1 && r.people <= 2 ? r.people : 1;
      insertRegistration.run(r.id, r.account_id, people, r.music ?? null, ts, ts);
      stats.registration++;
    }
  });

  migrateAll();

  src.close();
  tgt.close();

  printDiffTable(sourceCounts, stats);
  if (skipped.length > 0) {
    console.log(`\nSkipped rows (${skipped.length}):`);
    for (const s of skipped) console.log(`  ${s}`);
  }

  const mismatches: string[] = [];
  if (stats.account !== sourceCounts.account - skipped.length) mismatches.push('account');
  if (stats.item !== sourceCounts.item) mismatches.push('item');
  if (stats.volunteer !== sourceCounts.volunteer) mismatches.push('volunteer');
  if (stats.registration !== sourceCounts.registration) mismatches.push('registration');

  if (mismatches.length > 0) {
    console.error(`\n✗ Row count mismatch: ${mismatches.join(', ')}`);
    process.exit(1);
  }

  console.log('\n✓ Migration complete.');
  if (opts.dryRun) console.log('(dry-run target: ' + opts.target + ' — delete when done)');
}

void main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

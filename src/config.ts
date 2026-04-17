import { z } from 'zod';

const csv = (val: string | undefined): string[] =>
  val ? val.split(',').map((s) => s.trim()).filter(Boolean) : [];

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().url().default('http://localhost:3000'),
  PUBLIC_APP_URL: z.string().url().default('https://poolparty.jupeters.de'),

  DATABASE_PATH: z.string().default('./data.sqlite'),

  SESSION_COOKIE_NAME: z.string().default('jpcore_session'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(14),
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters (ideally 32 random bytes base64)'),
  SESSION_COOKIE_SAMESITE: z.enum(['lax', 'none', 'strict']).optional(),
  SESSION_COOKIE_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v == null ? undefined : v === 'true')),

  PBKDF2_ITERATIONS: z.coerce.number().int().positive().default(100000),
  PBKDF2_HASH_BYTES: z.coerce.number().int().positive().default(32),
  PBKDF2_DIGEST: z.string().default('sha512'),

  JPSITE_PATH: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@logge.top'),
  EMAIL_REPLY_TO: z.string().default('noreply@logge.top'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),

  BACKUP_DIR: z.string().default('./backups'),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

export const config = {
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  isDev: env.NODE_ENV === 'development',
  isTest: env.NODE_ENV === 'test',
  port: env.PORT,
  host: env.HOST,
  publicAppUrl: env.PUBLIC_APP_URL,
  databasePath: env.DATABASE_PATH,
  session: {
    cookieName: env.SESSION_COOKIE_NAME,
    ttlMs: env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    secret: env.SESSION_SECRET,
    // In prod default to SameSite=None + Secure so cross-site fetches from jp-site work.
    // In dev default to Lax since the backend serves jp-site from the same origin.
    cookieSameSite:
      env.SESSION_COOKIE_SAMESITE ?? (env.NODE_ENV === 'production' ? 'none' : 'lax'),
    cookieSecure: env.SESSION_COOKIE_SECURE ?? env.NODE_ENV === 'production',
  },
  pbkdf2: {
    iterations: env.PBKDF2_ITERATIONS,
    hashBytes: env.PBKDF2_HASH_BYTES,
    digest: env.PBKDF2_DIGEST,
  },
  jpsitePath: env.JPSITE_PATH,
  corsOrigins: csv(env.CORS_ORIGINS),
  email: {
    resendKey: env.RESEND_API_KEY,
    from: env.EMAIL_FROM,
    replyTo: env.EMAIL_REPLY_TO,
    smtp: env.SMTP_HOST
      ? {
          host: env.SMTP_HOST,
          port: env.SMTP_PORT ?? 587,
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        }
      : null,
  },
  telegram:
    env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID
      ? { botToken: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_CHAT_ID }
      : null,
  backupDir: env.BACKUP_DIR,
} as const;

export type AppConfig = typeof config;

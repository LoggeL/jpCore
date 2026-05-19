# jpCore

> Authentication and database backend for **JP Poolparty** — the annual event in Ramsen, Germany.

The frontend that talks to this lives at [`realjupeters/realjupeters.github.io`](https://github.com/realjupeters/realjupeters.github.io). Production: <https://jpcore.logge.top>.

## Stack

- **Runtime**: Node.js 20 LTS (TypeScript)
- **Framework**: [Fastify 5](https://fastify.dev) + [`fastify-type-provider-zod`](https://github.com/turkerdev/fastify-type-provider-zod) — Zod schemas double as runtime validation and compile-time types
- **Database**: SQLite via [Drizzle ORM](https://orm.drizzle.team) and [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) (synchronous, fastest)
- **Auth**: opaque session tokens in `HttpOnly` cookies (no JWTs anywhere); [`argon2id`](https://github.com/ranisalt/node-argon2) password hashing with transparent PBKDF2 fallback for legacy data
- **Email**: [Resend](https://resend.com) primary with Nodemailer SMTP fallback
- **Logging**: [pino](https://getpino.io)
- **Tests**: [vitest](https://vitest.dev)
- **Container**: multi-stage `Dockerfile` with `node:20-bookworm-slim`

## Architecture

```
src/
├── index.ts              # entry: load config, build app, listen
├── app.ts                # Fastify instance + plugin / route registration
├── config.ts             # zod-validated env (fails fast on missing secrets)
├── db/
│   ├── client.ts         # better-sqlite3 + drizzle instance, runMigrations
│   ├── schema.ts         # source of truth for all tables and types
│   └── migrations/       # drizzle-kit generated SQL
├── lib/
│   ├── password.ts       # argon2id + PBKDF2-100k + PBKDF2-1k fallback chain
│   ├── session.ts        # opaque-cookie session lifecycle
│   ├── tokens.ts         # secure token generation + sha256 hashing
│   ├── cookies.ts        # set/clear session cookie helpers
│   └── errors.ts         # AppError hierarchy mapped to HTTP by errorHandler
├── middleware/
│   ├── auth.ts           # requireUser + requireAdmin preHandlers
│   └── errorHandler.ts   # central error -> safe HTTP response
├── routes/
│   ├── public/           # /api/public/{login,logout,sendPasswordReset,resetPassword,verifyEmail}
│   ├── private/          # /api/private/{me,changePassword,logoutAll,poolparty/*}
│   └── admin/            # /api/admin/{register,poolparty/*}  (requireAdmin)
├── schemas/              # Zod schemas shared between routes
└── services/
    ├── email/            # Resend / Nodemailer transport + Poolparty templates
    ├── backup.ts         # cron-scheduled gzip backups (3 daily, 3 weekly, 3 monthly)
    └── logger.ts         # pino + Telegram broadcast for non-HTTP code paths
scripts/
└── migrate-from-legacy.ts  # one-shot import from the old Express+Knex SQLite schema
tests/
└── password.test.ts        # argon2id round-trip + PBKDF2 legacy fallback
```

## Auth model

**Opaque session tokens in `HttpOnly` cookies** — no JWTs.

- Cookie: `jpcore_session`, `HttpOnly`, `SameSite=Lax`, `Secure` in production, sliding 90-day TTL
- Storage: `session` table with `sha256(token)` only — a DB leak doesn't yield live sessions
- Roles: fetched from the `role` table on every request (no stale-role problem; role changes take effect immediately)
- `lastActivityAt` and `expiresAt` are refreshed on authenticated requests so the DB row and cookie expiry stay aligned
- Password reset: dedicated `password_reset_token` table, 1-hour TTL, single-use, all sessions invalidated on consume
- Email verification: dedicated `email_verification_token` table, 24-hour TTL
- Rate limiting: 20 logins / IP / 15 min, 10 reset requests / IP / hour
- A central `errorHandler` maps `AppError` subclasses to HTTP — internal errors never leak `error.message` in the response body

### Password hashing

`verifyPassword()` accepts three algorithms in order:

1. `argon2id` — the default for new hashes
2. `pbkdf2-100k` — the legacy default from the old Express backend (preserved across the rewrite)
3. `pbkdf2-1k` — even older accounts that predate an earlier migration

When a legacy hash verifies successfully, the next login transparently re-hashes the password with `argon2id`. No forced resets, no broken accounts.

## API surface

### Public (no auth)

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/public/login` | Sets the `jpcore_session` cookie, returns `{id, name, email, emailVerifiedAt, roles}` |
| `POST` | `/api/public/logout` | Deletes the session row + clears cookie |
| `POST` | `/api/public/sendPasswordReset` | Emails a reset link if the address exists (rate limited; no enumeration) |
| `POST` | `/api/public/resetPassword` | Consumes a reset token, rotates the password, kills all sessions |
| `POST` | `/api/public/verifyEmail` | Marks `account.emailVerifiedAt` and consumes the verification token |

### Private (`requireUser` preHandler)

| Method | Path |
|---|---|
| `GET` | `/api/private/me` |
| `POST` | `/api/private/logout` (current device) |
| `POST` | `/api/private/logoutAll` |
| `POST` | `/api/private/changePassword` |
| `GET` | `/api/private/poolparty/me` |
| `GET` | `/api/private/poolparty/item` |
| `POST/PATCH/DELETE` | `/api/private/poolparty/registration` |
| `POST/DELETE` | `/api/private/poolparty/volunteer` |

### Admin (`requireAdmin` preHandler)

| Method | Path |
|---|---|
| `POST` | `/api/admin/register` |
| `DELETE` | `/api/admin/register/:id` |
| `GET` | `/api/admin/poolparty/account` |
| `GET` | `/api/admin/poolparty/registration` |
| `GET` | `/api/admin/poolparty/item` |
| `GET` | `/api/admin/poolparty/volunteer` |
| `POST` | `/api/admin/poolparty/item` |
| `DELETE` | `/api/admin/poolparty/item/:id` |
| `DELETE` | `/api/admin/poolparty/volunteer/:id` |
| `DELETE` | `/api/admin/poolparty/registration/:id` |

## Database schema

8 tables managed by Drizzle (`src/db/schema.ts`):

- `account` — id, name, email (unique), email_verified_at, password_hash, password_algo, password_salt, created_at, updated_at, last_activity_at
- `role` — accountId + name (`'admin' | 'user'`), unique on `(accountId, name)`
- `session` — id (uuid), accountId, token_hash, expires_at, last_used_at, user_agent, ip_address
- `password_reset_token` — accountId, token_hash, expires_at, used_at
- `email_verification_token` — same shape, longer TTL
- `item` — id, accountId (nullable), name
- `volunteer` — id, accountId (unique), duration
- `registration` — id, accountId (unique), people_count (CHECK 1 or 2), music

## Local development

```bash
git clone https://github.com/LoggeL/jpCore.git
cd jpCore
npm install
cp .env.example .env
# edit .env: set SESSION_SECRET, RESEND_API_KEY, etc.

# Optional: serve the jp-site frontend from the same origin in dev
# (point JPSITE_PATH at a local jp-site checkout)
JPSITE_PATH=../jp-site npm run dev
```

The dev server listens on `http://localhost:3000`. Migrations run automatically on startup.

### Common scripts

| Command | What it does |
|---|---|
| `npm run dev` | `tsx watch` — reloads on file changes |
| `npm run build` | TypeScript compile to `dist/` |
| `npm start` | Run the compiled `dist/index.js` |
| `npm test` | `vitest run` |
| `npm run db:generate` | `drizzle-kit generate` after schema changes |
| `npm run db:migrate` | Apply pending migrations to the configured DB |
| `npm run migrate:legacy` | Import data from the old Express+Knex `data.sqlite` |

## Migration from the legacy backend

The legacy backend used Express 5 + Knex with a different schema (string `roles` column, separate `verifiedMail` boolean, no session table, etc.). To migrate:

```bash
npm run migrate:legacy -- \
  --source /path/to/legacy/data.sqlite \
  --target /path/to/new/data.sqlite
```

The script:

1. Backs up the source to `<source>.migration-backup-<ts>` (the source itself is opened read-only)
2. Creates the target with the new schema via Drizzle migrations
3. Copies `account` (mapping `verifiedMail → emailVerifiedAt`), explodes the legacy `roles` column into `role` rows, copies `item / volunteer / registration` with column renames
4. Prints a row-count diff table and exits non-zero on any mismatch
5. Refuses to overwrite an existing non-empty target unless `--force` is passed
6. `--dry-run` writes to `./data.dryrun.sqlite` instead of the target

Existing PBKDF2 password hashes are copied verbatim and continue to work — they get transparently upgraded to argon2id on first successful login.

## Configuration

All config is loaded from environment variables and validated by Zod in `src/config.ts`. See `.env.example` for the full list. Required:

- `SESSION_SECRET` — at least 32 characters; ideally 32 random bytes base64

Optional but expected in production:

- `DATABASE_PATH` (default `./data.sqlite`)
- `RESEND_API_KEY` (otherwise emails are logged only)
- `EMAIL_FROM`, `EMAIL_REPLY_TO`
- `CORS_ORIGINS` (comma-separated; only needed if frontend lives on a different origin)
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` for error broadcasting

## Docker

```bash
docker build -t jpcore .
docker run -d \
  --name jpcore \
  -p 3000:3000 \
  -e SESSION_SECRET=$(openssl rand -base64 32) \
  -e RESEND_API_KEY=re_xxxxxxxxxxxx \
  -v /var/lib/jpcore:/data \
  -e DATABASE_PATH=/data/data.sqlite \
  -e BACKUP_DIR=/data/backups \
  jpcore
```

Mount a volume at `/data` for the SQLite file and the backup rotation directory.

## License

MIT — see [`LICENSE`](LICENSE).

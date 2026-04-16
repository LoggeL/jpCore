import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { and, eq, isNull } from 'drizzle-orm';
import { db, schema } from '../../db/client.js';
import { hashPassword } from '../../lib/password.js';
import { generateToken, hashToken } from '../../lib/tokens.js';
import { deleteAllSessionsForAccount } from '../../lib/session.js';
import { AuthError } from '../../lib/errors.js';
import { sendMail } from '../../services/email/send.js';
import { templates } from '../../services/email/templates.js';
import { config } from '../../config.js';
import { writeAuditLog } from '../../lib/audit.js';
import {
  SendPasswordResetBody,
  ResetPasswordBody,
  OkReply,
} from '../../schemas/auth.js';

const { account, passwordResetToken } = schema;
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export const passwordResetRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/sendPasswordReset',
    {
      schema: {
        body: SendPasswordResetBody,
        response: { 200: OkReply },
      },
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 hour',
          keyGenerator: (req) => `pwreset:${req.ip}`,
        },
      },
    },
    async (req) => {
      const { email } = req.body;

      const row = db
        .select({ id: account.id, name: account.name })
        .from(account)
        .where(eq(account.email, email))
        .get();

      // Always return ok to avoid leaking which emails are registered.
      if (!row) return { ok: true as const };

      const token = generateToken(32);
      const expiresAt = Date.now() + RESET_TTL_MS;

      db.insert(passwordResetToken)
        .values({
          accountId: row.id,
          tokenHash: hashToken(token),
          expiresAt,
        })
        .run();

      const url = `${config.host}/reset-password.html?token=${encodeURIComponent(token)}`;
      await sendMail(email, templates.passwordReset({ url }));

      writeAuditLog({
        accountId: row.id,
        eventType: 'password_reset_requested',
        message: `${row.name} requested mail reset`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
      });

      return { ok: true as const };
    }
  );

  app.post(
    '/resetPassword',
    {
      schema: {
        body: ResetPasswordBody,
        response: { 200: OkReply },
      },
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 hour',
          keyGenerator: (req) => `pwreset-consume:${req.ip}`,
        },
      },
    },
    async (req) => {
      const { token, password } = req.body;
      const tokenHash = hashToken(token);

      const row = db
        .select()
        .from(passwordResetToken)
        .where(and(eq(passwordResetToken.tokenHash, tokenHash), isNull(passwordResetToken.usedAt)))
        .get();

      if (!row) throw new AuthError('Invalid or used reset token', 'invalid_reset_token');
      if (row.expiresAt <= Date.now()) {
        throw new AuthError('Reset token expired', 'expired_reset_token');
      }

      const upgraded = await hashPassword(password);
      const now = Date.now();

      db.transaction((tx) => {
        tx.update(account)
          .set({
            passwordHash: upgraded.hash,
            passwordAlgo: upgraded.algo,
            passwordSalt: upgraded.salt,
            updatedAt: now,
          })
          .where(eq(account.id, row.accountId))
          .run();
        tx.update(passwordResetToken)
          .set({ usedAt: now })
          .where(eq(passwordResetToken.id, row.id))
          .run();
      });

      // Invalidate all existing sessions — password was just changed.
      deleteAllSessionsForAccount(row.accountId);

      const acc = db
        .select({ name: account.name })
        .from(account)
        .where(eq(account.id, row.accountId))
        .get();

      writeAuditLog({
        accountId: row.accountId,
        eventType: 'password_reset_completed',
        message: `${acc?.name ?? `Account ${row.accountId}`} reset mail`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] ?? null,
      });

      return { ok: true as const };
    }
  );
};

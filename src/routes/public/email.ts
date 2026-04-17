import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { and, eq, isNull } from 'drizzle-orm';
import { db, schema } from '../../db/client.js';
import { hashToken } from '../../lib/tokens.js';
import { AuthError } from '../../lib/errors.js';
import { VerifyEmailBody, OkReply } from '../../schemas/auth.js';
import { config } from '../../config.js';

const { account, emailVerificationToken } = schema;

export const emailRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/verify-email.html', async (req, reply) => {
    const token = (req.query as { token?: string })?.token;
    const qs = token ? `?token=${encodeURIComponent(token)}` : '';
    return reply.redirect(`${config.publicAppUrl}/verify-email.html${qs}`);
  });

  app.post(
    '/verifyEmail',
    {
      schema: {
        body: VerifyEmailBody,
        response: { 200: OkReply },
      },
      config: {
        rateLimit: {
          max: 30,
          timeWindow: '1 hour',
          keyGenerator: (req) => `verifyEmail:${req.ip}`,
        },
      },
    },
    async (req) => {
      const { token } = req.body;
      const tokenHash = hashToken(token);

      const row = db
        .select()
        .from(emailVerificationToken)
        .where(
          and(eq(emailVerificationToken.tokenHash, tokenHash), isNull(emailVerificationToken.usedAt))
        )
        .get();

      if (!row) throw new AuthError('Invalid or used verification token', 'invalid_verification_token');
      if (row.expiresAt <= Date.now()) {
        throw new AuthError('Verification token expired', 'expired_verification_token');
      }

      const now = Date.now();
      db.transaction((tx) => {
        tx.update(account)
          .set({ emailVerifiedAt: now, updatedAt: now })
          .where(eq(account.id, row.accountId))
          .run();
        tx.update(emailVerificationToken)
          .set({ usedAt: now })
          .where(eq(emailVerificationToken.id, row.id))
          .run();
      });

      return { ok: true as const };
    }
  );
};

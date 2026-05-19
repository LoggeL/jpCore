import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../db/client.js';
import { verifyPassword, hashPassword } from '../../lib/password.js';
import { AuthError } from '../../lib/errors.js';
import {
  createSession,
  deleteSession,
  findSessionByToken,
} from '../../lib/session.js';
import { clearSessionCookie, setSessionCookie } from '../../lib/cookies.js';
import { config } from '../../config.js';
import { LoginBody, LoginReply, OkReply } from '../../schemas/auth.js';
import { writeAuditLog } from '../../lib/audit.js';
import { getRealIp } from '../../lib/request-ip.js';

const { account } = schema;

export const loginRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/login',
    {
      schema: {
        body: LoginBody,
        response: { 200: LoginReply },
      },
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '15 minutes',
          keyGenerator: (req) => `login:${req.ip}`,
        },
      },
    },
    async (req, reply) => {
      const { email, password } = req.body;

      const row = db
        .select({
          id: account.id,
          name: account.name,
          email: account.email,
          emailVerifiedAt: account.emailVerifiedAt,
          passwordHash: account.passwordHash,
          passwordAlgo: account.passwordAlgo,
          passwordSalt: account.passwordSalt,
        })
        .from(account)
        .where(eq(account.email, email))
        .get();

      // Constant-ish error to avoid leaking existence. verifyPassword below also does work
      // in the "wrong password" path, but the no-account path is much cheaper so we burn a
      // dummy argon2 verify to equalize.
      if (!row) {
        await verifyPassword('dummy', {
          hash: '$argon2id$v=19$m=65536,t=3,p=4$YWFhYWFhYWFhYWFhYWFhYQ$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid',
          algo: 'argon2id',
          salt: null,
        });
        throw new AuthError('Invalid email or password', 'invalid_credentials');
      }

      const result = await verifyPassword(password, {
        hash: row.passwordHash,
        algo: row.passwordAlgo,
        salt: row.passwordSalt,
      });

      if (!result.valid) {
        throw new AuthError('Invalid email or password', 'invalid_credentials');
      }

      if (result.needsRehash) {
        const upgraded = await hashPassword(password);
        db.update(account)
          .set({
            passwordHash: upgraded.hash,
            passwordAlgo: upgraded.algo,
            passwordSalt: upgraded.salt,
            updatedAt: Date.now(),
          })
          .where(eq(account.id, row.id))
          .run();
      }

      const realIp = getRealIp(req);
      const active = createSession({
        accountId: row.id,
        userAgent: req.headers['user-agent'] ?? null,
        ipAddress: realIp,
      });
      setSessionCookie(reply, active.token, active.expiresAt);

      writeAuditLog({
        accountId: row.id,
        eventType: 'login',
        message: `${row.name} logged in`,
        ipAddress: realIp,
        userAgent: req.headers['user-agent'] ?? null,
      });

      return {
        ...active.account,
        sessionToken: active.token,
        expiresAt: active.expiresAt,
      };
    }
  );

  app.post(
    '/logout',
    {
      schema: { response: { 200: OkReply } },
    },
    async (req, reply) => {
      const authHeader = req.headers.authorization;
      const tokens = [
        authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : null,
        req.cookies?.[config.session.cookieName],
      ].filter((token): token is string => typeof token === 'string' && token.length > 0);

      for (const token of new Set(tokens)) {
        const active = findSessionByToken(token);
        if (active) deleteSession(active.id);
      }
      clearSessionCookie(reply);
      return { ok: true as const };
    }
  );
};

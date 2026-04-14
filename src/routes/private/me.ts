import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../db/client.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { AuthError } from '../../lib/errors.js';
import {
  deleteAllSessionsForAccount,
  deleteSession,
} from '../../lib/session.js';
import { requireUser } from '../../middleware/auth.js';
import { MeReply, ChangePasswordBody, OkReply } from '../../schemas/auth.js';

const { account } = schema;

export const meRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/me',
    {
      preHandler: [requireUser],
      schema: { response: { 200: MeReply } },
    },
    async (req) => {
      return req.user!;
    }
  );

  app.post(
    '/logoutAll',
    {
      preHandler: [requireUser],
      schema: { response: { 200: OkReply } },
    },
    async (req) => {
      deleteAllSessionsForAccount(req.user!.id);
      return { ok: true as const };
    }
  );

  app.post(
    '/changePassword',
    {
      preHandler: [requireUser],
      schema: { body: ChangePasswordBody, response: { 200: OkReply } },
    },
    async (req) => {
      const { currentPassword, newPassword } = req.body;
      const accountId = req.user!.id;

      const row = db
        .select({
          passwordHash: account.passwordHash,
          passwordAlgo: account.passwordAlgo,
          passwordSalt: account.passwordSalt,
        })
        .from(account)
        .where(eq(account.id, accountId))
        .get();

      if (!row) throw new AuthError('Account not found', 'account_missing');

      const check = await verifyPassword(currentPassword, {
        hash: row.passwordHash,
        algo: row.passwordAlgo,
        salt: row.passwordSalt,
      });
      if (!check.valid) throw new AuthError('Current password is incorrect', 'invalid_credentials');

      const upgraded = await hashPassword(newPassword);
      const now = Date.now();

      db.update(account)
        .set({
          passwordHash: upgraded.hash,
          passwordAlgo: upgraded.algo,
          passwordSalt: upgraded.salt,
          updatedAt: now,
        })
        .where(eq(account.id, accountId))
        .run();

      // Kill all other sessions; keep the current one alive so the user stays signed in.
      const currentSessionId = req.sessionId;
      deleteAllSessionsForAccount(accountId);
      // NB: deleteAllSessionsForAccount also kills the current one. Re-create a fresh
      // session for this request would be cleaner, but simplest for now is: client must
      // re-authenticate after a password change. Spec-wise this is correct and matches
      // common apps. (The alternative — skipping the current session — leaves a dangling
      // session tied to a now-invalid password, which is the thing we just fixed.)
      void currentSessionId;

      return { ok: true as const };
    }
  );

  app.post(
    '/logout',
    {
      preHandler: [requireUser],
      schema: { response: { 200: OkReply } },
    },
    async (req) => {
      if (req.sessionId) deleteSession(req.sessionId);
      return { ok: true as const };
    }
  );
};

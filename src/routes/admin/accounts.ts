import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../db/client.js';
import { hashPassword } from '../../lib/password.js';
import { generateToken, hashToken } from '../../lib/tokens.js';
import { requireAdmin } from '../../middleware/auth.js';
import { ConflictError } from '../../lib/errors.js';
import { sendMail } from '../../services/email/send.js';
import { templates } from '../../services/email/templates.js';
import { config } from '../../config.js';
import { AdminRegisterBody, OkReply } from '../../schemas/auth.js';
import { AdminAccountList, IdParam } from '../../schemas/poolparty.js';

const { account, role, emailVerificationToken } = schema;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

export const accountAdminRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/poolparty/account',
    {
      preHandler: [requireAdmin],
      schema: { response: { 200: AdminAccountList } },
    },
    async () => {
      const rows = db
        .select({
          id: account.id,
          name: account.name,
          email: account.email,
          emailVerifiedAt: account.emailVerifiedAt,
          lastActivityAt: account.lastActivityAt,
          createdAt: account.createdAt,
        })
        .from(account)
        .all();

      const result = rows.map((r) => {
        const roles = db
          .select({ name: role.name })
          .from(role)
          .where(eq(role.accountId, r.id))
          .all()
          .map((x) => x.name);
        return { ...r, roles };
      });

      return result;
    }
  );

  app.post(
    '/register',
    {
      preHandler: [requireAdmin],
      schema: { body: AdminRegisterBody, response: { 200: OkReply } },
    },
    async (req) => {
      const { email, name, password, roles } = req.body;

      const exists = db
        .select({ id: account.id })
        .from(account)
        .where(eq(account.email, email))
        .get();
      if (exists) throw new ConflictError('User already exists', 'user_exists');

      // If admin didn't supply a password, generate a random one. Either way, the new user
      // gets a verification link that includes their ability to set it via reset flow.
      const initialPassword = password ?? generateToken(18);
      const hashed = await hashPassword(initialPassword);

      const verificationToken = generateToken(32);
      const verificationExpiresAt = Date.now() + EMAIL_VERIFICATION_TTL_MS;

      db.transaction((tx) => {
        const result = tx
          .insert(account)
          .values({
            name,
            email,
            passwordHash: hashed.hash,
            passwordAlgo: hashed.algo,
            passwordSalt: hashed.salt,
          })
          .returning({ id: account.id })
          .get();

        for (const r of roles) {
          tx.insert(role).values({ accountId: result.id, name: r }).run();
        }

        tx.insert(emailVerificationToken)
          .values({
            accountId: result.id,
            tokenHash: hashToken(verificationToken),
            expiresAt: verificationExpiresAt,
          })
          .run();
      });

      const url = `${config.publicAppUrl}/verify-email.html?token=${encodeURIComponent(verificationToken)}`;
      await sendMail(email, templates.emailVerification({ name, url }));

      return { ok: true as const };
    }
  );

  app.delete(
    '/register/:id',
    {
      preHandler: [requireAdmin],
      schema: { params: IdParam, response: { 200: OkReply } },
    },
    async (req) => {
      const { id } = req.params;
      const result = db.delete(account).where(eq(account.id, id)).run();
      if (result.changes === 0) {
        throw new ConflictError('Account not found', 'account_not_found');
      }
      return { ok: true as const };
    }
  );
};

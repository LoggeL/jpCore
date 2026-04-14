import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq } from 'drizzle-orm';
import { db, schema } from '../../../db/client.js';
import { requireUser } from '../../../middleware/auth.js';
import { ConflictError, NotFoundError } from '../../../lib/errors.js';
import { sendMail } from '../../../services/email/send.js';
import { templates } from '../../../services/email/templates.js';
import { broadcast } from '../../../services/logger.js';
import { CreateVolunteerBody, OkReply } from '../../../schemas/poolparty.js';

const { account, registration, volunteer } = schema;

export const volunteerRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/volunteer',
    {
      preHandler: [requireUser],
      schema: { body: CreateVolunteerBody, response: { 200: OkReply } },
    },
    async (req) => {
      const userId = req.user!.id;
      const { duration } = req.body;

      const accountRow = db.transaction((tx) => {
        const hasRegistration = tx
          .select({ id: registration.id })
          .from(registration)
          .where(eq(registration.accountId, userId))
          .get();
        if (!hasRegistration)
          throw new ConflictError('Not yet registered', 'not_registered');

        const existing = tx
          .select({ id: volunteer.id })
          .from(volunteer)
          .where(eq(volunteer.accountId, userId))
          .get();
        if (existing)
          throw new ConflictError('Already registered as volunteer', 'already_volunteer');

        tx.insert(volunteer).values({ accountId: userId, duration }).run();

        return tx
          .select({ email: account.email, name: account.name })
          .from(account)
          .where(eq(account.id, userId))
          .get();
      });

      if (accountRow) {
        await sendMail(
          accountRow.email,
          templates.volunteerSuccessful({ name: accountRow.name, duration })
        );
        broadcast({ event: 'volunteer', name: accountRow.name, duration });
      }

      return { ok: true as const };
    }
  );

  app.delete(
    '/volunteer',
    {
      preHandler: [requireUser],
      schema: { response: { 200: OkReply } },
    },
    async (req) => {
      const userId = req.user!.id;

      const accountRow = db.transaction((tx) => {
        const existing = tx
          .select({ id: volunteer.id })
          .from(volunteer)
          .where(eq(volunteer.accountId, userId))
          .get();
        if (!existing) throw new NotFoundError('Not a volunteer', 'not_volunteer');

        tx.delete(volunteer).where(eq(volunteer.accountId, userId)).run();

        return tx
          .select({ email: account.email, name: account.name })
          .from(account)
          .where(eq(account.id, userId))
          .get();
      });

      if (accountRow) {
        await sendMail(
          accountRow.email,
          templates.unvolunteerSuccessful({ name: accountRow.name })
        );
        broadcast({ event: 'removed volunteer', name: accountRow.name });
      }

      return { ok: true as const };
    }
  );
};

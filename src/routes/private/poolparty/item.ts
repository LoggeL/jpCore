import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq, isNull } from 'drizzle-orm';
import { db, schema } from '../../../db/client.js';
import { requireUser } from '../../../middleware/auth.js';
import { ItemList, MePayload } from '../../../schemas/poolparty.js';

const { item, volunteer, registration } = schema;

export const itemRoutes: FastifyPluginAsyncZod = async (app) => {
  // List items not yet claimed by any account.
  app.get(
    '/item',
    {
      preHandler: [requireUser],
      schema: { response: { 200: ItemList } },
    },
    async () => {
      const rows = db
        .select({ id: item.id, name: item.name })
        .from(item)
        .where(isNull(item.accountId))
        .all();
      return rows;
    }
  );

  // Current user's item + volunteer + registration state.
  app.get(
    '/me',
    {
      preHandler: [requireUser],
      schema: { response: { 200: MePayload } },
    },
    async (req) => {
      const userId = req.user!.id;

      const userItem = db
        .select({ id: item.id, name: item.name })
        .from(item)
        .where(eq(item.accountId, userId))
        .get();

      const userVolunteer = db
        .select({ duration: volunteer.duration, updatedAt: volunteer.updatedAt })
        .from(volunteer)
        .where(eq(volunteer.accountId, userId))
        .get();

      const userRegistration = db
        .select({
          peopleCount: registration.peopleCount,
          music: registration.music,
          updatedAt: registration.updatedAt,
        })
        .from(registration)
        .where(eq(registration.accountId, userId))
        .get();

      return {
        item: userItem ?? null,
        volunteer: userVolunteer ?? null,
        registration: userRegistration ?? null,
      };
    }
  );
};

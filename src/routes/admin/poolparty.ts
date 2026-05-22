import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { eq, isNotNull } from 'drizzle-orm';
import { db, schema } from '../../db/client.js';
import { requireAdmin, requireAdminOrDj } from '../../middleware/auth.js';
import { NotFoundError } from '../../lib/errors.js';
import {
  AdminRegistrationList,
  AdminMusicRequestList,
  AdminItemList,
  AdminVolunteerList,
  AdminCreateItemBody,
  IdParam,
  OkReply,
} from '../../schemas/poolparty.js';

const { account, item, registration, volunteer } = schema;

export const poolpartyAdminRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/music',
    {
      preHandler: [requireAdminOrDj],
      schema: { response: { 200: AdminMusicRequestList } },
    },
    async () => {
      return db
        .select({
          id: registration.id,
          accountName: account.name,
          music: registration.music,
          updatedAt: registration.updatedAt,
        })
        .from(registration)
        .leftJoin(account, eq(account.id, registration.accountId))
        .where(isNotNull(registration.music))
        .all()
        .filter((row): row is typeof row & { music: string } => !!row.music?.trim());
    }
  );

  app.get(
    '/registration',
    {
      preHandler: [requireAdmin],
      schema: { response: { 200: AdminRegistrationList } },
    },
    async () => {
      return db
        .select({
          id: registration.id,
          accountId: registration.accountId,
          accountName: account.name,
          peopleCount: registration.peopleCount,
          music: registration.music,
          updatedAt: registration.updatedAt,
        })
        .from(registration)
        .leftJoin(account, eq(account.id, registration.accountId))
        .all();
    }
  );

  app.get(
    '/item',
    {
      preHandler: [requireAdmin],
      schema: { response: { 200: AdminItemList } },
    },
    async () => {
      return db
        .select({
          id: item.id,
          itemName: item.name,
          accountName: account.name,
          accountId: item.accountId,
          updatedAt: item.updatedAt,
        })
        .from(item)
        .leftJoin(account, eq(account.id, item.accountId))
        .all();
    }
  );

  app.get(
    '/volunteer',
    {
      preHandler: [requireAdmin],
      schema: { response: { 200: AdminVolunteerList } },
    },
    async () => {
      return db
        .select({
          id: volunteer.id,
          accountId: volunteer.accountId,
          accountName: account.name,
          duration: volunteer.duration,
          updatedAt: volunteer.updatedAt,
        })
        .from(volunteer)
        .leftJoin(account, eq(account.id, volunteer.accountId))
        .all();
    }
  );

  app.post(
    '/item',
    {
      preHandler: [requireAdmin],
      schema: { body: AdminCreateItemBody, response: { 200: OkReply } },
    },
    async (req) => {
      db.insert(item).values({ name: req.body.name }).run();
      return { ok: true as const };
    }
  );

  app.delete(
    '/item/:id',
    {
      preHandler: [requireAdmin],
      schema: { params: IdParam, response: { 200: OkReply } },
    },
    async (req) => {
      const result = db.delete(item).where(eq(item.id, req.params.id)).run();
      if (result.changes === 0) throw new NotFoundError('Item not found');
      return { ok: true as const };
    }
  );

  app.delete(
    '/volunteer/:id',
    {
      preHandler: [requireAdmin],
      schema: { params: IdParam, response: { 200: OkReply } },
    },
    async (req) => {
      const result = db.delete(volunteer).where(eq(volunteer.id, req.params.id)).run();
      if (result.changes === 0) throw new NotFoundError('Volunteer not found');
      return { ok: true as const };
    }
  );

  // Delete registration — cascades volunteer + unassigns item for the same account.
  app.delete(
    '/registration/:id',
    {
      preHandler: [requireAdmin],
      schema: { params: IdParam, response: { 200: OkReply } },
    },
    async (req) => {
      const id = req.params.id;

      db.transaction((tx) => {
        const existing = tx.select().from(registration).where(eq(registration.id, id)).get();
        if (!existing) throw new NotFoundError('Registration not found');

        tx.delete(volunteer).where(eq(volunteer.accountId, existing.accountId)).run();
        tx.update(item)
          .set({ accountId: null, updatedAt: Date.now() })
          .where(eq(item.accountId, existing.accountId))
          .run();
        tx.delete(registration).where(eq(registration.id, id)).run();
      });

      return { ok: true as const };
    }
  );
};

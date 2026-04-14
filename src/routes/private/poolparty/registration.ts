import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { and, eq, isNull } from 'drizzle-orm';
import { db, schema } from '../../../db/client.js';
import { requireUser } from '../../../middleware/auth.js';
import { ConflictError, NotFoundError, ValidationError } from '../../../lib/errors.js';
import { sendMail } from '../../../services/email/send.js';
import { templates } from '../../../services/email/templates.js';
import { broadcast } from '../../../services/logger.js';
import {
  CreateRegistrationBody,
  UpdateRegistrationBody,
  OkReply,
} from '../../../schemas/poolparty.js';

const { account, item, registration, volunteer } = schema;

export const registrationRoutes: FastifyPluginAsyncZod = async (app) => {
  // Create — atomic: inserts registration AND claims item in one transaction.
  // Fixes the orphaned-item bug from the old routes/poolparty/registration.js:36 where the
  // item could be claimed even when the registration insert failed.
  app.post(
    '/registration',
    {
      preHandler: [requireUser],
      schema: { body: CreateRegistrationBody, response: { 200: OkReply } },
    },
    async (req) => {
      const userId = req.user!.id;
      const { peopleCount, itemId, music } = req.body;

      const { accountRow, itemRow } = db.transaction((tx) => {
        const existing = tx
          .select({ id: registration.id })
          .from(registration)
          .where(eq(registration.accountId, userId))
          .get();
        if (existing) throw new ConflictError('Account already registered', 'already_registered');

        const itemRow = tx.select().from(item).where(eq(item.id, itemId)).get();
        if (!itemRow) throw new NotFoundError('Item not found', 'item_not_found');
        if (itemRow.accountId != null)
          throw new ConflictError('Item already taken', 'item_taken');

        tx.insert(registration)
          .values({
            accountId: userId,
            peopleCount,
            music: music ?? null,
          })
          .run();

        tx.update(item)
          .set({ accountId: userId, updatedAt: Date.now() })
          .where(eq(item.id, itemId))
          .run();

        const accountRow = tx
          .select({ email: account.email, name: account.name })
          .from(account)
          .where(eq(account.id, userId))
          .get();

        return { accountRow, itemRow };
      });

      if (accountRow) {
        await sendMail(
          accountRow.email,
          templates.registrationSuccessful({ name: accountRow.name, itemName: itemRow.name })
        );
        broadcast({
          event: 'registered',
          name: accountRow.name,
          itemName: itemRow.name,
          people: peopleCount,
          music: music ?? '',
        });
      }

      return { ok: true as const };
    }
  );

  // Update — partial change of peopleCount / music / itemId. Item swap is atomic.
  app.patch(
    '/registration',
    {
      preHandler: [requireUser],
      schema: { body: UpdateRegistrationBody, response: { 200: OkReply } },
    },
    async (req) => {
      const userId = req.user!.id;
      const body = req.body;

      const { changedFields, accountRow } = db.transaction((tx) => {
        const existing = tx
          .select()
          .from(registration)
          .where(eq(registration.accountId, userId))
          .get();
        if (!existing) throw new NotFoundError('No registration found', 'registration_missing');

        const changedFields: Record<string, string> = {};

        // Item swap
        if (body.itemId !== undefined) {
          const oldItem = tx
            .select()
            .from(item)
            .where(eq(item.accountId, userId))
            .get();

          if (!oldItem || oldItem.id !== body.itemId) {
            const newItem = tx.select().from(item).where(eq(item.id, body.itemId)).get();
            if (!newItem) throw new NotFoundError('Item not found', 'item_not_found');
            if (newItem.accountId != null && newItem.accountId !== userId)
              throw new ConflictError('Item already taken', 'item_taken');

            if (oldItem) {
              tx.update(item)
                .set({ accountId: null, updatedAt: Date.now() })
                .where(eq(item.id, oldItem.id))
                .run();
            }
            tx.update(item)
              .set({ accountId: userId, updatedAt: Date.now() })
              .where(eq(item.id, body.itemId))
              .run();

            changedFields.Item = `${oldItem?.name ?? '—'} → ${newItem.name}`;
          }
        }

        // peopleCount / music
        const updates: Partial<typeof existing> = {};
        if (body.peopleCount !== undefined && body.peopleCount !== existing.peopleCount) {
          updates.peopleCount = body.peopleCount;
          changedFields.Personen = `${existing.peopleCount} → ${body.peopleCount}`;
        }
        if (body.music !== undefined && body.music !== existing.music) {
          updates.music = body.music ?? null;
          changedFields.Musik = `${existing.music ?? '—'} → ${body.music ?? '—'}`;
        }

        if (Object.keys(updates).length > 0) {
          tx.update(registration)
            .set({ ...updates, updatedAt: Date.now() })
            .where(eq(registration.accountId, userId))
            .run();
        }

        if (Object.keys(changedFields).length === 0) {
          throw new ValidationError('No changes detected', 'no_changes');
        }

        const accountRow = tx
          .select({ email: account.email, name: account.name })
          .from(account)
          .where(eq(account.id, userId))
          .get();

        return { changedFields, accountRow };
      });

      if (accountRow) {
        await sendMail(
          accountRow.email,
          templates.registrationUpdate({ name: accountRow.name, changedFields })
        );
        broadcast({ event: 'updated registration', name: accountRow.name, ...changedFields });
      }

      return { ok: true as const };
    }
  );

  // Delete — cascades volunteer row and unassigns the item.
  app.delete(
    '/registration',
    {
      preHandler: [requireUser],
      schema: { response: { 200: OkReply } },
    },
    async (req) => {
      const userId = req.user!.id;

      const payload = db.transaction((tx) => {
        const existing = tx
          .select()
          .from(registration)
          .where(eq(registration.accountId, userId))
          .get();
        if (!existing) throw new NotFoundError('No registration found', 'registration_missing');

        const heldItem = tx.select().from(item).where(eq(item.accountId, userId)).get();
        tx.delete(volunteer).where(eq(volunteer.accountId, userId)).run();
        if (heldItem) {
          tx.update(item)
            .set({ accountId: null, updatedAt: Date.now() })
            .where(eq(item.id, heldItem.id))
            .run();
        }
        tx.delete(registration).where(eq(registration.accountId, userId)).run();

        const accountRow = tx
          .select({ email: account.email, name: account.name })
          .from(account)
          .where(eq(account.id, userId))
          .get();

        return { accountRow, itemName: heldItem?.name ?? null };
      });

      if (payload.accountRow && payload.itemName) {
        await sendMail(
          payload.accountRow.email,
          templates.unregistrationSuccessful({
            name: payload.accountRow.name,
            itemName: payload.itemName,
          })
        );
        broadcast({
          event: 'removed registered',
          name: payload.accountRow.name,
          itemName: payload.itemName,
        });
      }

      return { ok: true as const };
    }
  );
};

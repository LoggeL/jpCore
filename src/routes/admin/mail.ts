import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { desc, eq } from 'drizzle-orm';
import { db, schema } from '../../db/client.js';
import { requireAdmin } from '../../middleware/auth.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { sendMail } from '../../services/email/send.js';
import { logger } from '../../services/logger.js';
import {
  MailDraftBody,
  MailDraftList,
  MailDraftRow,
  IdParam,
  SendResult,
  OkReply,
} from '../../schemas/mail.js';

const { mailDraft, account } = schema;

export const mailAdminRoutes: FastifyPluginAsyncZod = async (app) => {
  // List all drafts (newest first)
  app.get(
    '/draft',
    {
      preHandler: [requireAdmin],
      schema: { response: { 200: MailDraftList } },
    },
    async () => {
      return db.select().from(mailDraft).orderBy(desc(mailDraft.updatedAt)).all();
    }
  );

  // Get one draft
  app.get(
    '/draft/:id',
    {
      preHandler: [requireAdmin],
      schema: { params: IdParam, response: { 200: MailDraftRow } },
    },
    async (req) => {
      const row = db.select().from(mailDraft).where(eq(mailDraft.id, req.params.id)).get();
      if (!row) throw new NotFoundError('Draft not found');
      return row;
    }
  );

  // Create a new draft
  app.post(
    '/draft',
    {
      preHandler: [requireAdmin],
      schema: { body: MailDraftBody, response: { 200: MailDraftRow } },
    },
    async (req) => {
      const result = db
        .insert(mailDraft)
        .values({ name: req.body.name, subject: req.body.subject, html: req.body.html })
        .returning()
        .get();
      return result;
    }
  );

  // Update an existing draft
  app.patch(
    '/draft/:id',
    {
      preHandler: [requireAdmin],
      schema: {
        params: IdParam,
        body: MailDraftBody.partial(),
        response: { 200: MailDraftRow },
      },
    },
    async (req) => {
      const existing = db.select().from(mailDraft).where(eq(mailDraft.id, req.params.id)).get();
      if (!existing) throw new NotFoundError('Draft not found');

      const patch: Partial<typeof existing> = { updatedAt: Date.now() };
      if (req.body.name !== undefined) patch.name = req.body.name;
      if (req.body.subject !== undefined) patch.subject = req.body.subject;
      if (req.body.html !== undefined) patch.html = req.body.html;

      const updated = db
        .update(mailDraft)
        .set(patch)
        .where(eq(mailDraft.id, req.params.id))
        .returning()
        .get();
      return updated;
    }
  );

  // Delete a draft
  app.delete(
    '/draft/:id',
    {
      preHandler: [requireAdmin],
      schema: { params: IdParam, response: { 200: OkReply } },
    },
    async (req) => {
      const result = db.delete(mailDraft).where(eq(mailDraft.id, req.params.id)).run();
      if (result.changes === 0) throw new NotFoundError('Draft not found');
      return { ok: true as const };
    }
  );

  // Send a test copy to the current admin only.
  app.post(
    '/draft/:id/send-test',
    {
      preHandler: [requireAdmin],
      schema: { params: IdParam, response: { 200: SendResult } },
    },
    async (req) => {
      const draft = db.select().from(mailDraft).where(eq(mailDraft.id, req.params.id)).get();
      if (!draft) throw new NotFoundError('Draft not found');
      const me = req.user!;
      if (!me.email) throw new ValidationError('Admin account has no email on file');

      await sendMail(me.email, {
        subject: `[TEST] ${draft.subject}`,
        html: draft.html,
      });

      return { sent: 1, failed: 0, recipients: [me.email] };
    }
  );

  // Send to every account with a non-empty email. One Resend call per recipient
  // (cleaner deliverability than BCC, and lets us report per-recipient failures).
  app.post(
    '/draft/:id/send-all',
    {
      preHandler: [requireAdmin],
      schema: { params: IdParam, response: { 200: SendResult } },
    },
    async (req) => {
      const draft = db.select().from(mailDraft).where(eq(mailDraft.id, req.params.id)).get();
      if (!draft) throw new NotFoundError('Draft not found');

      const rows = db
        .select({ email: account.email })
        .from(account)
        .all()
        .filter((r) => r.email && r.email.trim().length > 0);

      const recipients = Array.from(new Set(rows.map((r) => r.email!.toLowerCase().trim())));

      let sent = 0;
      let failed = 0;
      const errors: Array<{ email: string; error: string }> = [];

      for (const email of recipients) {
        try {
          await sendMail(email, { subject: draft.subject, html: draft.html });
          sent++;
        } catch (err) {
          failed++;
          const msg = err instanceof Error ? err.message : String(err);
          errors.push({ email, error: msg });
          logger.error({ err, email }, 'send-all failed for recipient');
        }
      }

      db.update(mailDraft)
        .set({ lastSentAt: Date.now(), lastSentTo: sent })
        .where(eq(mailDraft.id, req.params.id))
        .run();

      return { sent, failed, recipients, ...(errors.length ? { errors } : {}) };
    }
  );
};

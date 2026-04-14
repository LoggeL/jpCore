import { z } from 'zod';

export const MailDraftBody = z.object({
  name: z.string().trim().min(1).max(120),
  subject: z.string().trim().min(1).max(200),
  html: z.string().min(1).max(500_000),
});
export type MailDraftBody = z.infer<typeof MailDraftBody>;

export const MailDraftRow = z.object({
  id: z.number().int(),
  name: z.string(),
  subject: z.string(),
  html: z.string(),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  lastSentAt: z.number().int().nullable(),
  lastSentTo: z.number().int().nullable(),
});
export const MailDraftList = z.array(MailDraftRow);

export const IdParam = z.object({
  id: z.coerce.number().int().positive(),
});

export const SendResult = z.object({
  sent: z.number().int(),
  failed: z.number().int(),
  recipients: z.array(z.string()),
  errors: z.array(z.object({ email: z.string(), error: z.string() })).optional(),
});

export const OkReply = z.object({ ok: z.literal(true) });

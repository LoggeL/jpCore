import { db, schema } from '../db/client.js';

const { auditLog } = schema;

interface AuditInput {
  accountId?: number | null;
  eventType: string;
  message: string;
  meta?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export function writeAuditLog(input: AuditInput): void {
  db.insert(auditLog)
    .values({
      accountId: input.accountId ?? null,
      eventType: input.eventType,
      message: input.message,
      meta: input.meta ? JSON.stringify(input.meta) : null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    })
    .run();
}

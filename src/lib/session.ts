import { and, eq, lt, ne } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { generateToken, hashToken, newId } from './tokens.js';
import { config } from '../config.js';

const { session, account, role } = schema;

export interface NewSessionInput {
  accountId: number;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface SessionAccount {
  id: number;
  name: string;
  email: string;
  emailVerifiedAt: number | null;
  roles: string[];
}

export interface ActiveSession {
  id: string;
  token: string;
  expiresAt: number;
  account: SessionAccount;
}

/**
 * Create a new session row and return both the opaque token (to be set as a cookie
 * on the response) and the account it belongs to. The DB stores only the sha256 of
 * the token so a DB leak can't be turned into live sessions.
 */
export function createSession(input: NewSessionInput): ActiveSession {
  const token = generateToken(32);
  const now = Date.now();
  const id = newId();
  const expiresAt = now + config.session.ttlMs;

  db.insert(session)
    .values({
      id,
      accountId: input.accountId,
      tokenHash: hashToken(token),
      createdAt: now,
      expiresAt,
      lastUsedAt: now,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    })
    .run();

  const acc = loadAccountForSession(input.accountId);
  if (!acc) {
    throw new Error(`createSession: account ${input.accountId} vanished after insert`);
  }

  return { id, token, expiresAt, account: acc };
}

/**
 * Look up a session by its raw token. Returns null for unknown tokens, expired
 * sessions, or accounts that have been deleted. Fires an async `touch` to extend
 * the TTL — this never blocks the calling request.
 */
export function findSessionByToken(token: string): ActiveSession | null {
  const tokenHash = hashToken(token);
  const row = db
    .select()
    .from(session)
    .where(eq(session.tokenHash, tokenHash))
    .get();

  if (!row) return null;

  const now = Date.now();
  if (row.expiresAt <= now) {
    deleteSession(row.id);
    return null;
  }

  const acc = loadAccountForSession(row.accountId);
  if (!acc) return null;

  const expiresAt = touchSession(row.id);

  return { id: row.id, token, expiresAt, account: acc };
}

export function touchSession(sessionId: string): number {
  const now = Date.now();
  const expiresAt = now + config.session.ttlMs;

  const row = db
    .select({ accountId: session.accountId })
    .from(session)
    .where(eq(session.id, sessionId))
    .get();

  db.update(session)
    .set({ lastUsedAt: now, expiresAt })
    .where(eq(session.id, sessionId))
    .run();

  if (row) {
    db.update(account)
      .set({ lastActivityAt: now, updatedAt: now })
      .where(eq(account.id, row.accountId))
      .run();
  }

  return expiresAt;
}

export function deleteSession(sessionId: string): void {
  db.delete(session).where(eq(session.id, sessionId)).run();
}

export function deleteAllSessionsForAccount(accountId: number): number {
  const result = db.delete(session).where(eq(session.accountId, accountId)).run();
  return result.changes;
}

export function deleteOtherSessionsForAccount(accountId: number, sessionId: string): number {
  const result = db
    .delete(session)
    .where(and(eq(session.accountId, accountId), ne(session.id, sessionId)))
    .run();
  return result.changes;
}

export function cleanupExpiredSessions(): number {
  const result = db.delete(session).where(lt(session.expiresAt, Date.now())).run();
  return result.changes;
}

function loadAccountForSession(accountId: number): SessionAccount | null {
  const acc = db
    .select({
      id: account.id,
      name: account.name,
      email: account.email,
      emailVerifiedAt: account.emailVerifiedAt,
    })
    .from(account)
    .where(eq(account.id, accountId))
    .get();

  if (!acc) return null;

  const roles = db
    .select({ name: role.name })
    .from(role)
    .where(eq(role.accountId, accountId))
    .all()
    .map((r) => r.name);

  return { ...acc, roles };
}

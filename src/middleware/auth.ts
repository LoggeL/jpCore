import type { FastifyReply, FastifyRequest } from 'fastify';
import { findSessionByToken, type SessionAccount } from '../lib/session.js';
import { AuthError, ForbiddenError } from '../lib/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: SessionAccount;
    sessionId?: string;
  }
}

function extractSessionToken(req: FastifyRequest): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (token) return token;
  }
  return null;
}

export async function requireUser(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const token = extractSessionToken(req);
  if (!token) throw new AuthError();

  const active = findSessionByToken(token);
  if (!active) throw new AuthError('Session expired or invalid');

  req.user = active.account;
  req.sessionId = active.id;
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireUser(req, reply);
  if (!req.user?.roles.includes('admin')) {
    throw new ForbiddenError('Admin role required');
  }
}

export function isAdmin(user: SessionAccount | undefined): boolean {
  return !!user?.roles.includes('admin');
}

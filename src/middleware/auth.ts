import type { FastifyReply, FastifyRequest } from 'fastify';
import { findSessionByToken, type SessionAccount } from '../lib/session.js';
import { setSessionCookie } from '../lib/cookies.js';
import { config } from '../config.js';
import { AuthError, ForbiddenError } from '../lib/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: SessionAccount;
    sessionId?: string;
  }
}

function extractSessionTokenCandidates(req: FastifyRequest): string[] {
  const tokens: string[] = [];

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (token) tokens.push(token);
  }

  const cookieToken = req.cookies?.[config.session.cookieName];
  if (typeof cookieToken === 'string' && cookieToken && !tokens.includes(cookieToken)) {
    tokens.push(cookieToken);
  }

  return tokens;
}

export async function requireUser(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const tokens = extractSessionTokenCandidates(req);
  if (tokens.length === 0) throw new AuthError();

  const active = tokens.map((token) => findSessionByToken(token)).find((session) => session !== null);
  if (!active) throw new AuthError('Session expired or invalid');

  req.user = active.account;
  req.sessionId = active.id;
  setSessionCookie(reply, active.token, active.expiresAt);
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

import type { FastifyReply } from 'fastify';
import { config } from '../config.js';

export function setSessionCookie(reply: FastifyReply, token: string, expiresAt: number): void {
  reply.setCookie(config.session.cookieName, token, {
    httpOnly: true,
    secure: config.session.cookieSecure,
    sameSite: config.session.cookieSameSite,
    path: '/',
    expires: new Date(expiresAt),
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(config.session.cookieName, {
    path: '/',
    secure: config.session.cookieSecure,
    sameSite: config.session.cookieSameSite,
  });
}

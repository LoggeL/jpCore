import type { FastifyRequest } from 'fastify';

export function getRealIp(req: FastifyRequest): string | null {
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string' && cfIp.trim()) return cfIp.trim();

  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    const first = forwardedFor.split(',')[0];
    return first ? first.trim() : null;
  }

  return req.ip || null;
}

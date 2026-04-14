import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../services/logger.js';

export function errorHandler(
  err: FastifyError | AppError | Error,
  req: FastifyRequest,
  reply: FastifyReply
): void {
  if (err instanceof AppError) {
    reply.status(err.status).send({ error: err.code, message: err.publicMessage });
    return;
  }

  if (err instanceof ZodError) {
    reply.status(400).send({
      error: 'validation_error',
      message: 'Invalid request body',
      issues: err.issues.map((i) => ({ path: i.path, message: i.message })),
    });
    return;
  }

  // Fastify's own validation errors carry a `validation` array
  const fastifyErr = err as FastifyError;
  if (fastifyErr.validation) {
    reply.status(400).send({
      error: 'validation_error',
      message: fastifyErr.message,
      issues: fastifyErr.validation,
    });
    return;
  }

  if (fastifyErr.statusCode && fastifyErr.statusCode < 500) {
    reply.status(fastifyErr.statusCode).send({
      error: fastifyErr.code ?? 'bad_request',
      message: fastifyErr.message,
    });
    return;
  }

  // Unknown failures get logged but never leak internals to the client.
  logger.error({ err, url: req.url, method: req.method }, 'unhandled error');
  reply.status(500).send({ error: 'internal', message: 'Internal server error' });
}

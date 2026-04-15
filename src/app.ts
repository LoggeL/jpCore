import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { resolve } from 'node:path';
import { config } from './config.js';
import { logger } from './services/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { registerPublicRoutes } from './routes/public/index.js';
import { registerPrivateRoutes } from './routes/private/index.js';
import { registerAdminRoutes } from './routes/admin/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: config.isProd
      ? { level: 'info', base: { service: 'jpcore' } }
      : {
          level: 'debug',
          base: { service: 'jpcore' },
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
          },
        },
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(errorHandler);

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cookie, { secret: config.session.secret });
  await app.register(rateLimit, {
    global: false,
    max: 1000,
    timeWindow: '1 minute',
  });

  if (config.corsOrigins.length > 0) {
    await app.register(cors, {
      origin: config.corsOrigins,
      credentials: true,
      methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    });
  }

  // Dev static serving: mount jp-site at / so cookies are single-origin.
  if (config.jpsitePath) {
    const root = resolve(process.cwd(), config.jpsitePath);
    await app.register(fastifyStatic, { root, prefix: '/', decorateReply: false });
    logger.info({ root }, 'serving jp-site');
  }

  app.get('/api/health', async () => ({ status: 'ok', ts: Date.now() }));

  await app.register(registerPublicRoutes, { prefix: '/api/public' });
  await app.register(registerPrivateRoutes, { prefix: '/api/private' });
  await app.register(registerAdminRoutes, { prefix: '/api/admin' });

  return app;
}

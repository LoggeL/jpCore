import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { accountAdminRoutes } from './accounts.js';
import { poolpartyAdminRoutes } from './poolparty.js';
import { mailAdminRoutes } from './mail.js';
import { auditAdminRoutes } from './audit.js';

export const registerAdminRoutes: FastifyPluginAsyncZod = async (app) => {
  await app.register(accountAdminRoutes);
  await app.register(poolpartyAdminRoutes, { prefix: '/poolparty' });
  await app.register(mailAdminRoutes, { prefix: '/mail' });
  await app.register(auditAdminRoutes);
};

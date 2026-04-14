import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { meRoutes } from './me.js';
import { itemRoutes } from './poolparty/item.js';
import { registrationRoutes } from './poolparty/registration.js';
import { volunteerRoutes } from './poolparty/volunteer.js';

export const registerPrivateRoutes: FastifyPluginAsyncZod = async (app) => {
  await app.register(meRoutes);
  await app.register(itemRoutes, { prefix: '/poolparty' });
  await app.register(registrationRoutes, { prefix: '/poolparty' });
  await app.register(volunteerRoutes, { prefix: '/poolparty' });
};

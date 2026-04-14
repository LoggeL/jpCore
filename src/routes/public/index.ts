import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { loginRoutes } from './login.js';
import { passwordResetRoutes } from './passwordReset.js';
import { emailRoutes } from './email.js';

export const registerPublicRoutes: FastifyPluginAsyncZod = async (app) => {
  await app.register(loginRoutes);
  await app.register(passwordResetRoutes);
  await app.register(emailRoutes);
};

import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { desc } from 'drizzle-orm';
import { db, schema } from '../../db/client.js';
import { requireAdmin } from '../../middleware/auth.js';
import { AdminAuditLogList } from '../../schemas/poolparty.js';

const { auditLog } = schema;

export const auditAdminRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/poolparty/audit',
    {
      preHandler: [requireAdmin],
      schema: { response: { 200: AdminAuditLogList } },
    },
    async () => {
      return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(200).all();
    }
  );
};

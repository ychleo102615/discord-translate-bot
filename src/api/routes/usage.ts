import { Router } from 'express';
import type { RequestHandler } from 'express';
import { getUsage, getLimit } from '../../modules/translate/usageTracker.js';

export function createUsageRoutes(requireAuth: RequestHandler): Router {
  const router = Router();

  router.get('/', requireAuth, (_req, res) => {
    const usage = getUsage();
    res.json({ ...usage, limit: getLimit() });
  });

  return router;
}

import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { AuthRequest } from '../auth/middleware.js';
import { getUserLanguage, setUserLanguage } from '../../modules/translate/userPrefs.js';

export function createUserRoutes(requireAuth: RequestHandler): Router {
  const router = Router();

  router.get('/me', requireAuth, (req, res) => {
    res.json((req as AuthRequest).user);
  });

  router.get('/prefs', requireAuth, (req, res) => {
    const lang = getUserLanguage((req as AuthRequest).user.userId);
    res.json({ language: lang });
  });

  router.put('/prefs', requireAuth, (req, res) => {
    const { language } = req.body;
    if (!language) { res.status(400).json({ error: 'language is required' }); return; }
    setUserLanguage((req as AuthRequest).user.userId, language);
    res.json({ ok: true });
  });

  return router;
}

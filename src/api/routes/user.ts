import { Router } from 'express';
import type { RequestHandler } from 'express';
import type Database from 'better-sqlite3';
import type { AuthRequest } from '../auth/middleware.js';
import { fetchUserGuilds } from '../auth/discord.js';
import { getUserLanguage, setUserLanguage } from '../../modules/translate/userPrefs.js';

export function createUserRoutes(requireAuth: RequestHandler, db: Database.Database): Router {
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

  router.get('/guilds', requireAuth, async (req, res) => {
    const { userId } = (req as AuthRequest).user;
    const session = db.prepare(
      'SELECT access_token FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(userId) as { access_token: string } | undefined;

    if (!session) {
      res.status(401).json({ error: 'Session not found' });
      return;
    }

    try {
      const guilds = await fetchUserGuilds(session.access_token);
      const MANAGE_GUILD = BigInt(0x20);
      const manageable = guilds.filter(g => (BigInt(g.permissions) & MANAGE_GUILD) !== BigInt(0));
      res.json(manageable);
    } catch {
      res.status(502).json({ error: 'Failed to fetch guilds' });
    }
  });

  return router;
}

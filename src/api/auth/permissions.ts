import type { Response, NextFunction } from 'express';
import type Database from 'better-sqlite3';
import type { AuthRequest } from './middleware.js';
import { fetchUserGuilds } from './discord.js';

const MANAGE_GUILD = BigInt(0x20);
export const guildCache = new Map<string, { guilds: any[]; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function createGuildManagerMiddleware(db: Database.Database) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { guildId } = req.params;
    const { userId } = req.user;

    try {
      const session = db.prepare(
        'SELECT access_token FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      ).get(userId) as { access_token: string } | undefined;

      if (!session) {
        res.status(401).json({ error: 'Session not found' });
        return;
      }

      // Check cache or call Discord API
      const cached = guildCache.get(userId);
      let guilds: Awaited<ReturnType<typeof fetchUserGuilds>>;

      if (cached && cached.expiresAt > Date.now()) {
        guilds = cached.guilds;
      } else {
        guilds = await fetchUserGuilds(session.access_token);
        guildCache.set(userId, { guilds, expiresAt: Date.now() + CACHE_TTL });
      }

      const guild = guilds.find((g) => g.id === guildId);
      if (!guild || !(BigInt(guild.permissions) & MANAGE_GUILD)) {
        res.status(403).json({ error: 'Missing ManageGuild permission' });
        return;
      }

      next();
    } catch (err) {
      console.error('[Permissions] Guild check failed:', err);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

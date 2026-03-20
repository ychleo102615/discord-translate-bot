import { Router } from 'express';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import type { AppConfig } from '../../shared/types.js';
import type Database from 'better-sqlite3';

const DISCORD_API = 'https://discord.com/api/v10';

interface DiscordOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function getAuthorizeUrl(config: DiscordOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'identify guilds',
    state,
  });
  return `${DISCORD_API}/oauth2/authorize?${params}`;
}

export async function exchangeCode(code: string, config: DiscordOAuthConfig) {
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
    }),
  });
  if (!res.ok) throw new Error(`Discord token exchange failed: ${res.status}`);
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>;
}

export async function fetchDiscordUser(accessToken: string) {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Discord user fetch failed: ${res.status}`);
  return res.json() as Promise<{ id: string; username: string; avatar: string }>;
}

export async function fetchUserGuilds(accessToken: string) {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Discord guilds fetch failed: ${res.status}`);
  return res.json() as Promise<Array<{ id: string; name: string; icon: string; permissions: string }>>;
}

export function createAuthRouter(config: AppConfig, db: Database.Database): Router {
  const router = Router();
  router.use(cookieParser());

  // GET /api/auth/authorize — redirect to Discord
  router.get('/authorize', (_req, res) => {
    const state = crypto.randomUUID();
    res.cookie('oauth_state', state, { httpOnly: true, maxAge: 10 * 60 * 1000, sameSite: 'lax' });
    res.redirect(getAuthorizeUrl(config.discord, state));
  });

  // GET /api/auth/callback — handle Discord callback
  router.get('/callback', async (req, res) => {
    try {
      const { code, state } = req.query as { code?: string; state?: string };
      const savedState = req.cookies?.oauth_state;

      if (!code || !state || state !== savedState) {
        res.status(400).json({ error: 'Invalid OAuth state' });
        return;
      }
      res.clearCookie('oauth_state');

      const tokens = await exchangeCode(code, config.discord);
      const user = await fetchDiscordUser(tokens.access_token);

      // Save session to SQLite
      const sessionId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO sessions (id, user_id, access_token, refresh_token, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(sessionId, user.id, tokens.access_token, tokens.refresh_token, Date.now() + tokens.expires_in * 1000);

      // Sign JWT
      const token = jwt.sign(
        { userId: user.id, username: user.username, avatar: user.avatar },
        config.jwtSecret,
        { expiresIn: '7d' },
      );

      res.redirect(`${config.frontendUrl}/auth/callback?token=${token}`);
    } catch (err) {
      console.error('[Auth] OAuth callback failed:', err);
      res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
    }
  });

  return router;
}

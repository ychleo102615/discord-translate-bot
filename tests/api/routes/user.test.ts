import { describe, it, expect, vi, beforeEach } from 'vitest';
import http from 'node:http';

vi.mock('../../../src/modules/translate/userPrefs.js', () => ({
  getUserLanguage: vi.fn().mockReturnValue('zh-TW'),
  setUserLanguage: vi.fn(),
}));

vi.mock('../../../src/api/auth/discord.js', () => ({
  fetchUserGuilds: vi.fn(),
}));

import { getUserLanguage, setUserLanguage } from '../../../src/modules/translate/userPrefs.js';
import { fetchUserGuilds } from '../../../src/api/auth/discord.js';
import { createUserRoutes } from '../../../src/api/routes/user.js';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../../../src/api/auth/middleware.js';

// Fake auth middleware that attaches a mock user
const fakeAuth = (req: Request, _res: Response, next: NextFunction) => {
  (req as AuthRequest).user = { userId: 'user123', username: 'testuser', avatar: 'abc' };
  next();
};

// Minimal in-memory mock for better-sqlite3
function createMockDb() {
  const rows: Record<string, Record<string, unknown>> = {};
  return {
    prepare(_sql: string) {
      return {
        run(...args: unknown[]) {
          const [_id, userId, accessToken, refreshToken, expiresAt] = args as string[];
          rows[userId] = { access_token: accessToken, refresh_token: refreshToken, expires_at: expiresAt };
        },
        get(...args: unknown[]) {
          const userId = args[0] as string;
          const row = rows[userId];
          return row ? { access_token: row.access_token } : undefined;
        },
      };
    },
  };
}

/** Start an express app on a random port, make a GET request, return status + JSON body, then close. */
function requestApp(app: express.Express, path: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      fetch(`http://127.0.0.1:${addr.port}${path}`)
        .then(async (res) => {
          const body = await res.json();
          server.close();
          resolve({ status: res.status, body });
        })
        .catch((err) => {
          server.close();
          reject(err);
        });
    });
  });
}

describe('user routes', () => {
  it('getUserLanguage returns language', () => {
    expect(getUserLanguage('user1')).toBe('zh-TW');
  });

  it('setUserLanguage is callable', () => {
    setUserLanguage('user1', 'en');
    expect(setUserLanguage).toHaveBeenCalledWith('user1', 'en');
  });
});

describe('GET /api/user/guilds', () => {
  let app: express.Express;
  let mockDb: ReturnType<typeof createMockDb>;
  const mockedFetchUserGuilds = fetchUserGuilds as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    const router = createUserRoutes(fakeAuth, mockDb as any);
    app = express();
    app.use(express.json());
    app.use('/api/user', router);
  });

  it('returns 401 when no session found', async () => {
    const response = await requestApp(app, '/api/user/guilds');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Session not found' });
  });

  it('returns only guilds with ManageGuild (0x20) permission', async () => {
    mockDb.prepare('INSERT').run('sess1', 'user123', 'fake-token', 'refresh', Date.now() + 60000);

    mockedFetchUserGuilds.mockResolvedValue([
      { id: '111', name: 'Admin Guild', icon: 'a', permissions: '32' },        // 0x20 = 32
      { id: '222', name: 'Member Guild', icon: 'b', permissions: '0' },         // no ManageGuild
      { id: '333', name: 'Owner Guild', icon: 'c', permissions: '2147483647' }, // all permissions
      { id: '444', name: 'Partial Guild', icon: 'd', permissions: '16' },       // 0x10, no ManageGuild
    ]);

    const response = await requestApp(app, '/api/user/guilds');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      { id: '111', name: 'Admin Guild', icon: 'a', permissions: '32' },
      { id: '333', name: 'Owner Guild', icon: 'c', permissions: '2147483647' },
    ]);
    expect(mockedFetchUserGuilds).toHaveBeenCalledWith('fake-token');
  });

  it('returns empty array when user has no manageable guilds', async () => {
    mockDb.prepare('INSERT').run('sess1', 'user123', 'fake-token', 'refresh', Date.now() + 60000);

    mockedFetchUserGuilds.mockResolvedValue([
      { id: '222', name: 'Member Guild', icon: 'b', permissions: '0' },
      { id: '444', name: 'Partial Guild', icon: 'd', permissions: '16' },
    ]);

    const response = await requestApp(app, '/api/user/guilds');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('returns 502 when fetchUserGuilds fails', async () => {
    mockDb.prepare('INSERT').run('sess1', 'user123', 'fake-token', 'refresh', Date.now() + 60000);

    mockedFetchUserGuilds.mockRejectedValue(new Error('Discord API error'));

    const response = await requestApp(app, '/api/user/guilds');
    expect(response.status).toBe(502);
    expect(response.body).toEqual({ error: 'Failed to fetch guilds' });
  });
});

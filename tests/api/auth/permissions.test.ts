import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGuildManagerMiddleware, guildCache } from '../../../src/api/auth/permissions.js';

// Mock fetchUserGuilds
vi.mock('../../../src/api/auth/discord.js', () => ({
  fetchUserGuilds: vi.fn(),
}));

import { fetchUserGuilds } from '../../../src/api/auth/discord.js';
const mockFetchUserGuilds = vi.mocked(fetchUserGuilds);

function createMockDb(session: any) {
  return {
    prepare: vi.fn().mockReturnValue({
      get: vi.fn().mockReturnValue(session),
    }),
  } as any;
}

function createMockReqResNext(userId: string, guildId: string) {
  const req: any = { user: { userId }, params: { guildId } };
  const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const next = vi.fn();
  return { req, res, next };
}

describe('guild manager middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guildCache.clear();
  });

  it('allows user with ManageGuild permission', async () => {
    const db = createMockDb({ access_token: 'token123' });
    const middleware = createGuildManagerMiddleware(db);
    const { req, res, next } = createMockReqResNext('user1', 'guild1');

    // ManageGuild = 0x20 = 32
    mockFetchUserGuilds.mockResolvedValue([
      { id: 'guild1', name: 'Test', icon: '', permissions: '32' },
    ]);

    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects user without ManageGuild permission', async () => {
    const db = createMockDb({ access_token: 'token123' });
    const middleware = createGuildManagerMiddleware(db);
    const { req, res, next } = createMockReqResNext('user1', 'guild1');

    // permissions = 0 (no ManageGuild)
    mockFetchUserGuilds.mockResolvedValue([
      { id: 'guild1', name: 'Test', icon: '', permissions: '0' },
    ]);

    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects user not in guild', async () => {
    const db = createMockDb({ access_token: 'token123' });
    const middleware = createGuildManagerMiddleware(db);
    const { req, res, next } = createMockReqResNext('user1', 'guild1');

    mockFetchUserGuilds.mockResolvedValue([
      { id: 'other-guild', name: 'Other', icon: '', permissions: '32' },
    ]);

    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 401 when session not found', async () => {
    const db = createMockDb(undefined);
    const middleware = createGuildManagerMiddleware(db);
    const { req, res, next } = createMockReqResNext('user1', 'guild1');

    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 500 on Discord API error', async () => {
    const db = createMockDb({ access_token: 'token123' });
    const middleware = createGuildManagerMiddleware(db);
    const { req, res, next } = createMockReqResNext('user1', 'guild1');

    mockFetchUserGuilds.mockRejectedValue(new Error('Discord API error'));

    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

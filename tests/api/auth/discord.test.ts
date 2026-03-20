import { describe, it, expect, vi, afterEach } from 'vitest';
import { getAuthorizeUrl, exchangeCode, fetchDiscordUser } from '../../../src/api/auth/discord.js';

describe('discord auth', () => {
  const config = {
    clientId: 'test-id',
    clientSecret: 'test-secret',
    redirectUri: 'http://localhost:3001/api/auth/callback',
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getAuthorizeUrl includes correct params', () => {
    const url = getAuthorizeUrl(config, 'test-state');
    expect(url).toContain('client_id=test-id');
    expect(url).toContain('scope=identify+guilds');
    expect(url).toContain('state=test-state');
    expect(url).toContain('response_type=code');
  });

  it('exchangeCode calls Discord token endpoint', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: 'at', refresh_token: 'rt', expires_in: 604800 }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await exchangeCode('auth-code', config);
    expect(result.access_token).toBe('at');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://discord.com/api/v10/oauth2/token',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('fetchDiscordUser calls Discord users/@me', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '123', username: 'test', avatar: 'abc' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const user = await fetchDiscordUser('test-token');
    expect(user.id).toBe('123');
  });
});

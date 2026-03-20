import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock serverConfig
vi.mock('../../../src/modules/translate/serverConfig.js', () => ({
  getGuildConfig: vi.fn().mockReturnValue({
    enabledChannels: ['ch1'],
    targetLanguages: ['en'],
    showRomanization: true,
  }),
  addLanguage: vi.fn(),
  removeLanguage: vi.fn(),
  enableChannel: vi.fn(),
  disableChannel: vi.fn(),
  setRomanization: vi.fn(),
}));

import {
  getGuildConfig,
  addLanguage,
  removeLanguage,
  enableChannel,
  disableChannel,
  setRomanization,
} from '../../../src/modules/translate/serverConfig.js';
import { createGuildRoutes } from '../../../src/api/routes/guilds.js';
import type { RequestHandler } from 'express';

// Passthrough middleware stubs
const passAuth: RequestHandler = (_req, _res, next) => next();
const passGuildManager: RequestHandler = (_req, _res, next) => next();

function createMockRes() {
  const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  return res;
}

/** Helper: find a registered route handler and invoke it with mock req/res */
function callRoute(
  router: ReturnType<typeof createGuildRoutes>,
  method: string,
  path: string,
  params: Record<string, string>,
  body?: Record<string, unknown>,
) {
  // Walk the router stack to find the matching layer
  const layer = (router as any).stack.find((l: any) => {
    if (!l.route) return false;
    return l.route.path === path && l.route.methods[method];
  });
  if (!layer) throw new Error(`No route found: ${method.toUpperCase()} ${path}`);
  // The last handler in the route stack is the actual handler (after middlewares)
  const handlers = layer.route.stack.map((s: any) => s.handle);
  const handler = handlers[handlers.length - 1];

  const req: any = { params, body: body ?? {} };
  const res = createMockRes();
  handler(req, res);
  return res;
}

describe('guild routes', () => {
  let router: ReturnType<typeof createGuildRoutes>;

  beforeEach(() => {
    vi.clearAllMocks();
    router = createGuildRoutes(passAuth, passGuildManager);
  });

  // --- GET /:guildId/config ---
  describe('GET /:guildId/config', () => {
    it('returns guild config', () => {
      const res = callRoute(router, 'get', '/:guildId/config', { guildId: 'g1' });
      expect(getGuildConfig).toHaveBeenCalledWith('g1');
      expect(res.json).toHaveBeenCalledWith({
        enabledChannels: ['ch1'],
        targetLanguages: ['en'],
        showRomanization: true,
      });
    });

    it('returns default config when guild has none', () => {
      vi.mocked(getGuildConfig).mockReturnValueOnce(undefined as any);
      const res = callRoute(router, 'get', '/:guildId/config', { guildId: 'g_none' });
      expect(res.json).toHaveBeenCalledWith({
        enabledChannels: [],
        targetLanguages: [],
        showRomanization: false,
      });
    });
  });

  // --- POST /:guildId/config/languages ---
  describe('POST /:guildId/config/languages', () => {
    it('calls addLanguage and returns ok', () => {
      const res = callRoute(router, 'post', '/:guildId/config/languages', { guildId: 'g1' }, { lang: 'ja' });
      expect(addLanguage).toHaveBeenCalledWith('g1', 'ja');
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    it('returns 400 when lang is missing', () => {
      const res = callRoute(router, 'post', '/:guildId/config/languages', { guildId: 'g1' }, {});
      expect(res.status).toHaveBeenCalledWith(400);
      expect(addLanguage).not.toHaveBeenCalled();
    });
  });

  // --- DELETE /:guildId/config/languages/:lang ---
  describe('DELETE /:guildId/config/languages/:lang', () => {
    it('calls removeLanguage and returns ok', () => {
      const res = callRoute(router, 'delete', '/:guildId/config/languages/:lang', { guildId: 'g1', lang: 'ja' });
      expect(removeLanguage).toHaveBeenCalledWith('g1', 'ja');
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });
  });

  // --- POST /:guildId/config/channels ---
  describe('POST /:guildId/config/channels', () => {
    it('calls enableChannel and returns ok', () => {
      const res = callRoute(router, 'post', '/:guildId/config/channels', { guildId: 'g1' }, { channelId: 'ch2' });
      expect(enableChannel).toHaveBeenCalledWith('g1', 'ch2');
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    it('returns 400 when channelId is missing', () => {
      const res = callRoute(router, 'post', '/:guildId/config/channels', { guildId: 'g1' }, {});
      expect(res.status).toHaveBeenCalledWith(400);
      expect(enableChannel).not.toHaveBeenCalled();
    });
  });

  // --- DELETE /:guildId/config/channels/:channelId ---
  describe('DELETE /:guildId/config/channels/:channelId', () => {
    it('calls disableChannel and returns ok', () => {
      const res = callRoute(router, 'delete', '/:guildId/config/channels/:channelId', { guildId: 'g1', channelId: 'ch1' });
      expect(disableChannel).toHaveBeenCalledWith('g1', 'ch1');
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });
  });

  // --- PUT /:guildId/config/romanization ---
  describe('PUT /:guildId/config/romanization', () => {
    it('calls setRomanization with true', () => {
      const res = callRoute(router, 'put', '/:guildId/config/romanization', { guildId: 'g1' }, { enabled: true });
      expect(setRomanization).toHaveBeenCalledWith('g1', true);
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    it('calls setRomanization with false', () => {
      const res = callRoute(router, 'put', '/:guildId/config/romanization', { guildId: 'g1' }, { enabled: false });
      expect(setRomanization).toHaveBeenCalledWith('g1', false);
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    it('returns 400 when enabled is not boolean', () => {
      const res = callRoute(router, 'put', '/:guildId/config/romanization', { guildId: 'g1' }, { enabled: 'yes' });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(setRomanization).not.toHaveBeenCalled();
    });

    it('returns 400 when enabled is missing', () => {
      const res = callRoute(router, 'put', '/:guildId/config/romanization', { guildId: 'g1' }, {});
      expect(res.status).toHaveBeenCalledWith(400);
      expect(setRomanization).not.toHaveBeenCalled();
    });
  });
});

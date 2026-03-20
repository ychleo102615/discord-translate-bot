import { Router } from 'express';
import type { RequestHandler } from 'express';
import {
  getGuildConfig,
  addLanguage,
  removeLanguage,
  enableChannel,
  disableChannel,
  setRomanization,
} from '../../modules/translate/serverConfig.js';

/** Extract a route param as string (Express 5 types params as string | string[]). */
function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export function createGuildRoutes(requireAuth: RequestHandler, requireGuildManager: RequestHandler): Router {
  const router = Router();

  router.get('/:guildId/config', requireAuth, requireGuildManager, (req, res) => {
    const guildId = param(req.params.guildId);
    const config = getGuildConfig(guildId);
    res.json(config || { enabledChannels: [], targetLanguages: [], showRomanization: false });
  });

  router.post('/:guildId/config/languages', requireAuth, requireGuildManager, (req, res) => {
    const { lang } = req.body;
    if (!lang) {
      res.status(400).json({ error: 'lang is required' });
      return;
    }
    addLanguage(param(req.params.guildId), lang);
    res.json({ ok: true });
  });

  router.delete('/:guildId/config/languages/:lang', requireAuth, requireGuildManager, (req, res) => {
    removeLanguage(param(req.params.guildId), param(req.params.lang));
    res.json({ ok: true });
  });

  router.post('/:guildId/config/channels', requireAuth, requireGuildManager, (req, res) => {
    const { channelId } = req.body;
    if (!channelId) {
      res.status(400).json({ error: 'channelId is required' });
      return;
    }
    enableChannel(param(req.params.guildId), channelId);
    res.json({ ok: true });
  });

  router.delete('/:guildId/config/channels/:channelId', requireAuth, requireGuildManager, (req, res) => {
    disableChannel(param(req.params.guildId), param(req.params.channelId));
    res.json({ ok: true });
  });

  router.put('/:guildId/config/romanization', requireAuth, requireGuildManager, (req, res) => {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'enabled must be boolean' });
      return;
    }
    setRomanization(param(req.params.guildId), enabled);
    res.json({ ok: true });
  });

  return router;
}

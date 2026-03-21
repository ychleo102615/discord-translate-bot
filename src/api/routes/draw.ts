import { Router } from 'express';
import type { RequestHandler } from 'express';
import type Database from 'better-sqlite3';
import {
  createPool, getPool, listPools, updatePool, deletePool,
  addItem, getItems, updateItem, deleteItem,
} from '../../modules/draw/data/pools.js';
import {
  createStrategy, getStrategy, listStrategies, updateStrategy, deleteStrategy,
} from '../../modules/draw/data/strategies.js';
import {
  getSession, listSessions, getHistory,
} from '../../modules/draw/data/sessions.js';

/** Extract a route param as string (Express 5 types params as string | string[]). */
function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

export function createDrawRoutes(
  requireAuth: RequestHandler,
  requireGuildManager: RequestHandler,
  db: Database.Database,
): Router {
  const router = Router();
  const auth = [requireAuth, requireGuildManager] as const;

  // ─── Pools ────────────────────────────────────────────────

  router.post('/:guildId/draw/pools', ...auth, (req, res) => {
    try {
      const guildId = param(req.params.guildId);
      const { name, schema } = req.body;

      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'name is required and must be a string' });
        return;
      }
      if (!Array.isArray(schema) || schema.length === 0) {
        res.status(400).json({ error: 'schema is required and must be a non-empty array' });
        return;
      }

      const pool = createPool(db, guildId, name, schema);
      res.status(201).json(pool);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:guildId/draw/pools', ...auth, (req, res) => {
    try {
      const guildId = param(req.params.guildId);
      res.json(listPools(db, guildId));
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:guildId/draw/pools/:poolId', ...auth, (req, res) => {
    try {
      const pool = getPool(db, param(req.params.poolId));
      if (!pool || pool.guild_id !== param(req.params.guildId)) {
        res.status(404).json({ error: 'Pool not found' });
        return;
      }
      res.json(pool);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/:guildId/draw/pools/:poolId', ...auth, (req, res) => {
    try {
      const poolId = param(req.params.poolId);
      const existing = getPool(db, poolId);
      if (!existing || existing.guild_id !== param(req.params.guildId)) {
        res.status(404).json({ error: 'Pool not found' });
        return;
      }

      const { name } = req.body;
      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'name is required and must be a string' });
        return;
      }

      const updated = updatePool(db, poolId, { name });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.delete('/:guildId/draw/pools/:poolId', ...auth, (req, res) => {
    try {
      const poolId = param(req.params.poolId);
      const existing = getPool(db, poolId);
      if (!existing || existing.guild_id !== param(req.params.guildId)) {
        res.status(404).json({ error: 'Pool not found' });
        return;
      }

      deletePool(db, poolId);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── Pool Items ───────────────────────────────────────────

  router.post('/:guildId/draw/pools/:poolId/items', ...auth, (req, res) => {
    try {
      const poolId = param(req.params.poolId);
      const pool = getPool(db, poolId);
      if (!pool || pool.guild_id !== param(req.params.guildId)) {
        res.status(404).json({ error: 'Pool not found' });
        return;
      }

      const { data } = req.body;
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        res.status(400).json({ error: 'data is required and must be an object' });
        return;
      }

      const item = addItem(db, poolId, data);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Missing required field')) {
        res.status(400).json({ error: err.message });
        return;
      }
      if (err instanceof Error && err.message.includes('must be a')) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:guildId/draw/pools/:poolId/items', ...auth, (req, res) => {
    try {
      const poolId = param(req.params.poolId);
      const pool = getPool(db, poolId);
      if (!pool || pool.guild_id !== param(req.params.guildId)) {
        res.status(404).json({ error: 'Pool not found' });
        return;
      }

      res.json(getItems(db, poolId));
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/:guildId/draw/pools/:poolId/items/:itemId', ...auth, (req, res) => {
    try {
      const poolId = param(req.params.poolId);
      const pool = getPool(db, poolId);
      if (!pool || pool.guild_id !== param(req.params.guildId)) {
        res.status(404).json({ error: 'Pool not found' });
        return;
      }

      const { data } = req.body;
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        res.status(400).json({ error: 'data is required and must be an object' });
        return;
      }

      const updated = updateItem(db, param(req.params.itemId), data);
      if (!updated) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof Error && (err.message.includes('Missing required field') || err.message.includes('must be a'))) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.delete('/:guildId/draw/pools/:poolId/items/:itemId', ...auth, (req, res) => {
    try {
      const poolId = param(req.params.poolId);
      const pool = getPool(db, poolId);
      if (!pool || pool.guild_id !== param(req.params.guildId)) {
        res.status(404).json({ error: 'Pool not found' });
        return;
      }

      const deleted = deleteItem(db, param(req.params.itemId));
      if (!deleted) {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── Strategies ───────────────────────────────────────────

  router.post('/:guildId/draw/strategies', ...auth, (req, res) => {
    try {
      const guildId = param(req.params.guildId);
      const { name, poolId, filter, distribution, consumable } = req.body;

      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'name is required and must be a string' });
        return;
      }
      if (!poolId || typeof poolId !== 'string') {
        res.status(400).json({ error: 'poolId is required and must be a string' });
        return;
      }
      if (!Array.isArray(filter)) {
        res.status(400).json({ error: 'filter is required and must be an array' });
        return;
      }
      if (!distribution || typeof distribution !== 'string') {
        res.status(400).json({ error: 'distribution is required and must be a string' });
        return;
      }
      if (typeof consumable !== 'boolean') {
        res.status(400).json({ error: 'consumable is required and must be a boolean' });
        return;
      }

      // Verify the pool exists and belongs to this guild
      const pool = getPool(db, poolId);
      if (!pool || pool.guild_id !== guildId) {
        res.status(404).json({ error: 'Pool not found' });
        return;
      }

      const strategy = createStrategy(db, guildId, name, poolId, filter, distribution, consumable);
      res.status(201).json(strategy);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:guildId/draw/strategies', ...auth, (req, res) => {
    try {
      const guildId = param(req.params.guildId);
      res.json(listStrategies(db, guildId));
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:guildId/draw/strategies/:strategyId', ...auth, (req, res) => {
    try {
      const strategy = getStrategy(db, param(req.params.strategyId));
      if (!strategy || strategy.guild_id !== param(req.params.guildId)) {
        res.status(404).json({ error: 'Strategy not found' });
        return;
      }
      res.json(strategy);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/:guildId/draw/strategies/:strategyId', ...auth, (req, res) => {
    try {
      const strategyId = param(req.params.strategyId);
      const existing = getStrategy(db, strategyId);
      if (!existing || existing.guild_id !== param(req.params.guildId)) {
        res.status(404).json({ error: 'Strategy not found' });
        return;
      }

      const { name, filter, distribution, consumable } = req.body;
      const updates: { name?: string; filter?: any[]; distribution?: string; consumable?: boolean } = {};

      if (name !== undefined) updates.name = name;
      if (filter !== undefined) updates.filter = filter;
      if (distribution !== undefined) updates.distribution = distribution;
      if (consumable !== undefined) updates.consumable = consumable;

      const updated = updateStrategy(db, strategyId, updates);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.delete('/:guildId/draw/strategies/:strategyId', ...auth, (req, res) => {
    try {
      const strategyId = param(req.params.strategyId);
      const existing = getStrategy(db, strategyId);
      if (!existing || existing.guild_id !== param(req.params.guildId)) {
        res.status(404).json({ error: 'Strategy not found' });
        return;
      }

      deleteStrategy(db, strategyId);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // ─── Sessions & History ───────────────────────────────────

  router.get('/:guildId/draw/sessions', ...auth, (req, res) => {
    try {
      const guildId = param(req.params.guildId);
      res.json(listSessions(db, guildId));
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:guildId/draw/sessions/:sessionId', ...auth, (req, res) => {
    try {
      const session = getSession(db, param(req.params.sessionId));
      if (!session || session.guild_id !== param(req.params.guildId)) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      res.json(session);
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.get('/:guildId/draw/sessions/:sessionId/history', ...auth, (req, res) => {
    try {
      const session = getSession(db, param(req.params.sessionId));
      if (!session || session.guild_id !== param(req.params.guildId)) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      res.json(getHistory(db, session.id));
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}

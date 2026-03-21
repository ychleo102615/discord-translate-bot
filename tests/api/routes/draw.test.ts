import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import type { RequestHandler } from 'express';
import { runDrawMigration } from '../../../src/modules/draw/data/migration.js';
import { createDrawRoutes } from '../../../src/api/routes/draw.js';
import { createPool, addItem } from '../../../src/modules/draw/data/pools.js';
import { createStrategy } from '../../../src/modules/draw/data/strategies.js';
import { createSession } from '../../../src/modules/draw/data/sessions.js';
import type { SchemaField } from '../../../src/modules/draw/types.js';

// Passthrough middleware stubs
const passAuth: RequestHandler = (_req, _res, next) => next();
const passGuildManager: RequestHandler = (_req, _res, next) => next();

function createMockRes() {
  const res: any = {
    statusCode: 200,
    status(code: number) { res.statusCode = code; return res; },
    json(body: unknown) { res.body = body; return res; },
  };
  return res as { statusCode: number; body: any; status: (c: number) => any; json: (b: unknown) => any };
}

/** Find a registered route handler and invoke it with mock req/res */
function callRoute(
  router: ReturnType<typeof createDrawRoutes>,
  method: string,
  path: string,
  params: Record<string, string>,
  body?: Record<string, unknown>,
) {
  const layer = (router as any).stack.find((l: any) => {
    if (!l.route) return false;
    return l.route.path === path && l.route.methods[method];
  });
  if (!layer) throw new Error(`No route found: ${method.toUpperCase()} ${path}`);
  const handlers = layer.route.stack.map((s: any) => s.handle);
  const handler = handlers[handlers.length - 1];

  const req: any = { params, body: body ?? {} };
  const res = createMockRes();
  handler(req, res);
  return res;
}

const guildId = 'guild-test';
const schema: SchemaField[] = [
  { name: 'name', type: 'text' },
  { name: 'rarity', type: 'number' },
];

describe('draw routes', () => {
  let db: Database.Database;
  let router: ReturnType<typeof createDrawRoutes>;

  beforeEach(() => {
    db = new Database(':memory:');
    runDrawMigration(db);
    router = createDrawRoutes(passAuth, passGuildManager, db);
  });

  // ─── Pools ────────────────────────────────────────────────

  describe('POST /:guildId/draw/pools', () => {
    it('creates a pool', () => {
      const res = callRoute(router, 'post', '/:guildId/draw/pools', { guildId }, { name: 'Weapons', schema });
      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe('Weapons');
      expect(res.body.guild_id).toBe(guildId);
      expect(res.body.id).toBeDefined();
    });

    it('returns 400 when name is missing', () => {
      const res = callRoute(router, 'post', '/:guildId/draw/pools', { guildId }, { schema });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when schema is missing', () => {
      const res = callRoute(router, 'post', '/:guildId/draw/pools', { guildId }, { name: 'Weapons' });
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when schema is empty array', () => {
      const res = callRoute(router, 'post', '/:guildId/draw/pools', { guildId }, { name: 'Weapons', schema: [] });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /:guildId/draw/pools', () => {
    it('lists pools for a guild', () => {
      createPool(db, guildId, 'Pool A', schema);
      createPool(db, guildId, 'Pool B', schema);
      createPool(db, 'other-guild', 'Other', schema);

      const res = callRoute(router, 'get', '/:guildId/draw/pools', { guildId });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('GET /:guildId/draw/pools/:poolId', () => {
    it('returns a single pool', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      const res = callRoute(router, 'get', '/:guildId/draw/pools/:poolId', { guildId, poolId: pool.id });
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Weapons');
    });

    it('returns 404 for non-existent pool', () => {
      const res = callRoute(router, 'get', '/:guildId/draw/pools/:poolId', { guildId, poolId: 'no-such-id' });
      expect(res.statusCode).toBe(404);
    });

    it('returns 404 when pool belongs to another guild', () => {
      const pool = createPool(db, 'other-guild', 'Secret', schema);
      const res = callRoute(router, 'get', '/:guildId/draw/pools/:poolId', { guildId, poolId: pool.id });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /:guildId/draw/pools/:poolId', () => {
    it('updates pool name', () => {
      const pool = createPool(db, guildId, 'Old', schema);
      const res = callRoute(router, 'put', '/:guildId/draw/pools/:poolId', { guildId, poolId: pool.id }, { name: 'New' });
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('New');
    });

    it('returns 400 when name is missing', () => {
      const pool = createPool(db, guildId, 'Old', schema);
      const res = callRoute(router, 'put', '/:guildId/draw/pools/:poolId', { guildId, poolId: pool.id }, {});
      expect(res.statusCode).toBe(400);
    });

    it('returns 404 for non-existent pool', () => {
      const res = callRoute(router, 'put', '/:guildId/draw/pools/:poolId', { guildId, poolId: 'nope' }, { name: 'X' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /:guildId/draw/pools/:poolId', () => {
    it('deletes a pool', () => {
      const pool = createPool(db, guildId, 'ToDelete', schema);
      const res = callRoute(router, 'delete', '/:guildId/draw/pools/:poolId', { guildId, poolId: pool.id });
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it('returns 404 for non-existent pool', () => {
      const res = callRoute(router, 'delete', '/:guildId/draw/pools/:poolId', { guildId, poolId: 'nope' });
      expect(res.statusCode).toBe(404);
    });
  });

  // ─── Pool Items ───────────────────────────────────────────

  describe('POST /:guildId/draw/pools/:poolId/items', () => {
    it('adds an item to a pool', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      const res = callRoute(
        router, 'post', '/:guildId/draw/pools/:poolId/items',
        { guildId, poolId: pool.id },
        { data: { name: 'Sword', rarity: 5 } },
      );
      expect(res.statusCode).toBe(201);
      expect(res.body.pool_id).toBe(pool.id);
    });

    it('returns 400 when data is missing', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      const res = callRoute(
        router, 'post', '/:guildId/draw/pools/:poolId/items',
        { guildId, poolId: pool.id },
        {},
      );
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when data violates schema', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      const res = callRoute(
        router, 'post', '/:guildId/draw/pools/:poolId/items',
        { guildId, poolId: pool.id },
        { data: { name: 'Sword' } }, // missing rarity
      );
      expect(res.statusCode).toBe(400);
    });

    it('returns 404 when pool does not exist', () => {
      const res = callRoute(
        router, 'post', '/:guildId/draw/pools/:poolId/items',
        { guildId, poolId: 'nope' },
        { data: { name: 'Sword', rarity: 5 } },
      );
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /:guildId/draw/pools/:poolId/items', () => {
    it('lists items for a pool', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      addItem(db, pool.id, { name: 'Sword', rarity: 5 });
      addItem(db, pool.id, { name: 'Axe', rarity: 3 });

      const res = callRoute(
        router, 'get', '/:guildId/draw/pools/:poolId/items',
        { guildId, poolId: pool.id },
      );
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('DELETE /:guildId/draw/pools/:poolId/items/:itemId', () => {
    it('deletes an item', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      const item = addItem(db, pool.id, { name: 'Sword', rarity: 5 });

      const res = callRoute(
        router, 'delete', '/:guildId/draw/pools/:poolId/items/:itemId',
        { guildId, poolId: pool.id, itemId: item.id },
      );
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it('returns 404 for non-existent item', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      const res = callRoute(
        router, 'delete', '/:guildId/draw/pools/:poolId/items/:itemId',
        { guildId, poolId: pool.id, itemId: 'nope' },
      );
      expect(res.statusCode).toBe(404);
    });
  });

  // ─── Strategies ───────────────────────────────────────────

  describe('POST /:guildId/draw/strategies', () => {
    it('creates a strategy', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      const res = callRoute(
        router, 'post', '/:guildId/draw/strategies',
        { guildId },
        { name: 'Default', poolId: pool.id, filter: [], distribution: 'random', consumable: true },
      );
      expect(res.statusCode).toBe(201);
      expect(res.body.name).toBe('Default');
      expect(res.body.pool_id).toBe(pool.id);
    });

    it('returns 400 when name is missing', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      const res = callRoute(
        router, 'post', '/:guildId/draw/strategies',
        { guildId },
        { poolId: pool.id, filter: [], distribution: 'random', consumable: true },
      );
      expect(res.statusCode).toBe(400);
    });

    it('returns 400 when consumable is missing', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      const res = callRoute(
        router, 'post', '/:guildId/draw/strategies',
        { guildId },
        { name: 'X', poolId: pool.id, filter: [], distribution: 'random' },
      );
      expect(res.statusCode).toBe(400);
    });

    it('returns 404 when pool does not exist', () => {
      const res = callRoute(
        router, 'post', '/:guildId/draw/strategies',
        { guildId },
        { name: 'X', poolId: 'no-pool', filter: [], distribution: 'random', consumable: false },
      );
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /:guildId/draw/strategies', () => {
    it('lists strategies for a guild', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      createStrategy(db, guildId, 'S1', pool.id, [], 'random', true);
      createStrategy(db, guildId, 'S2', pool.id, [], 'random', false);

      const res = callRoute(router, 'get', '/:guildId/draw/strategies', { guildId });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('GET /:guildId/draw/strategies/:strategyId', () => {
    it('returns a single strategy', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      const strategy = createStrategy(db, guildId, 'S1', pool.id, [], 'random', true);

      const res = callRoute(router, 'get', '/:guildId/draw/strategies/:strategyId', { guildId, strategyId: strategy.id });
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('S1');
    });

    it('returns 404 for non-existent strategy', () => {
      const res = callRoute(router, 'get', '/:guildId/draw/strategies/:strategyId', { guildId, strategyId: 'nope' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /:guildId/draw/strategies/:strategyId', () => {
    it('updates a strategy', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      const strategy = createStrategy(db, guildId, 'Old', pool.id, [], 'random', true);

      const res = callRoute(
        router, 'put', '/:guildId/draw/strategies/:strategyId',
        { guildId, strategyId: strategy.id },
        { name: 'Updated' },
      );
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Updated');
    });

    it('returns 404 for non-existent strategy', () => {
      const res = callRoute(
        router, 'put', '/:guildId/draw/strategies/:strategyId',
        { guildId, strategyId: 'nope' },
        { name: 'X' },
      );
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /:guildId/draw/strategies/:strategyId', () => {
    it('deletes a strategy', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      const strategy = createStrategy(db, guildId, 'S1', pool.id, [], 'random', true);

      const res = callRoute(router, 'delete', '/:guildId/draw/strategies/:strategyId', { guildId, strategyId: strategy.id });
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it('returns 404 for non-existent strategy', () => {
      const res = callRoute(router, 'delete', '/:guildId/draw/strategies/:strategyId', { guildId, strategyId: 'nope' });
      expect(res.statusCode).toBe(404);
    });
  });

  // ─── Sessions ─────────────────────────────────────────────

  describe('GET /:guildId/draw/sessions', () => {
    it('lists sessions for a guild', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      const strategy = createStrategy(db, guildId, 'S1', pool.id, [], 'random', true);
      createSession(db, guildId, strategy.id);

      const res = callRoute(router, 'get', '/:guildId/draw/sessions', { guildId });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it('returns empty array when no sessions exist', () => {
      const res = callRoute(router, 'get', '/:guildId/draw/sessions', { guildId });
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /:guildId/draw/sessions/:sessionId', () => {
    it('returns a single session', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      const strategy = createStrategy(db, guildId, 'S1', pool.id, [], 'random', true);
      const session = createSession(db, guildId, strategy.id);

      const res = callRoute(router, 'get', '/:guildId/draw/sessions/:sessionId', { guildId, sessionId: session.id });
      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(session.id);
    });

    it('returns 404 for non-existent session', () => {
      const res = callRoute(router, 'get', '/:guildId/draw/sessions/:sessionId', { guildId, sessionId: 'nope' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /:guildId/draw/sessions/:sessionId/history', () => {
    it('returns history for a session', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      const strategy = createStrategy(db, guildId, 'S1', pool.id, [], 'random', true);
      const session = createSession(db, guildId, strategy.id);

      const res = callRoute(
        router, 'get', '/:guildId/draw/sessions/:sessionId/history',
        { guildId, sessionId: session.id },
      );
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns 404 for non-existent session', () => {
      const res = callRoute(
        router, 'get', '/:guildId/draw/sessions/:sessionId/history',
        { guildId, sessionId: 'nope' },
      );
      expect(res.statusCode).toBe(404);
    });
  });
});

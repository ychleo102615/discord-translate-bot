import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runDrawMigration } from '../../../../src/modules/draw/data/migration.js';
import { createPool, addItem } from '../../../../src/modules/draw/data/pools.js';
import { createStrategy } from '../../../../src/modules/draw/data/strategies.js';
import {
  createSession, getSession, listSessions, closeSession,
  getSessionItems, consumeItem, addHistory, getHistory,
} from '../../../../src/modules/draw/data/sessions.js';
import type { FilterCondition, SchemaField } from '../../../../src/modules/draw/types.js';

describe('sessions', () => {
  let db: Database.Database;
  const guildId = 'guild-1';
  const schema: SchemaField[] = [
    { name: 'name', type: 'text' },
    { name: 'rarity', type: 'number' },
  ];
  let poolId: string;
  let strategyId: string;

  beforeEach(() => {
    db = new Database(':memory:');
    runDrawMigration(db);

    poolId = createPool(db, guildId, 'Weapons', schema).id;
    addItem(db, poolId, { name: 'Sword', rarity: 5 });
    addItem(db, poolId, { name: 'Shield', rarity: 3 });
    addItem(db, poolId, { name: 'Bow', rarity: 1 });

    const filter: FilterCondition[] = [{ field: 'rarity', operator: 'gte', value: 3 }];
    strategyId = createStrategy(db, guildId, 'Rare Draw', poolId, filter, 'uniform', true).id;
  });

  describe('session CRUD', () => {
    it('creates a session with filtered items', () => {
      const session = createSession(db, guildId, strategyId);
      expect(session.id).toBeDefined();
      expect(session.status).toBe('active');
      expect(session.strategy_id).toBe(strategyId);

      // Filter gte 3 should include Sword (5) and Shield (3), exclude Bow (1)
      const items = getSessionItems(db, session.id);
      expect(items).toHaveLength(2);
      const names = items.map((i) => JSON.parse(i.data).name).sort();
      expect(names).toEqual(['Shield', 'Sword']);
    });

    it('creates a session with empty filter (all items)', () => {
      const allFilter: FilterCondition[] = [];
      const allStrategyId = createStrategy(db, guildId, 'All', poolId, allFilter, 'uniform', true).id;
      const session = createSession(db, guildId, allStrategyId);
      const items = getSessionItems(db, session.id);
      expect(items).toHaveLength(3);
    });

    it('throws when strategy not found', () => {
      expect(() => createSession(db, guildId, 'no-such-strategy')).toThrow('Strategy not found');
    });

    it('retrieves a session', () => {
      const session = createSession(db, guildId, strategyId);
      const fetched = getSession(db, session.id);
      expect(fetched).toEqual(session);
    });

    it('returns undefined for non-existent session', () => {
      expect(getSession(db, 'no-such-id')).toBeUndefined();
    });

    it('lists sessions by guild', () => {
      createSession(db, guildId, strategyId);
      createSession(db, guildId, strategyId);

      const sessions = listSessions(db, guildId);
      expect(sessions).toHaveLength(2);
    });

    it('closes a session', () => {
      const session = createSession(db, guildId, strategyId);
      expect(closeSession(db, session.id)).toBe(true);

      const fetched = getSession(db, session.id);
      expect(fetched?.status).toBe('closed');
    });

    it('returns false when closing non-existent session', () => {
      expect(closeSession(db, 'no-such-id')).toBe(false);
    });
  });

  describe('session items', () => {
    it('getSessionItems returns only unconsumed items', () => {
      const session = createSession(db, guildId, strategyId);
      const items = getSessionItems(db, session.id);
      expect(items).toHaveLength(2);

      consumeItem(db, items[0].id);

      const remaining = getSessionItems(db, session.id);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(items[1].id);
    });

    it('consumeItem returns true on success, false on already consumed', () => {
      const session = createSession(db, guildId, strategyId);
      const items = getSessionItems(db, session.id);
      expect(consumeItem(db, items[0].id)).toBe(true);
      expect(consumeItem(db, items[0].id)).toBe(false);
    });

    it('consumeItem returns false for non-existent item', () => {
      expect(consumeItem(db, 'no-such-id')).toBe(false);
    });
  });

  describe('history', () => {
    it('adds and retrieves history', () => {
      const session = createSession(db, guildId, strategyId);
      const items = getSessionItems(db, session.id);

      const history1 = addHistory(db, session.id, 'user-1', items[0].id, 1);
      const history2 = addHistory(db, session.id, 'user-2', items[1].id, 1);

      expect(history1.id).toBeDefined();
      expect(history1.user_id).toBe('user-1');
      expect(history1.round).toBe(1);

      const history = getHistory(db, session.id);
      expect(history).toHaveLength(2);
      expect(history[0].id).toBe(history1.id);
      expect(history[1].id).toBe(history2.id);
    });

    it('returns empty array for session with no history', () => {
      const session = createSession(db, guildId, strategyId);
      expect(getHistory(db, session.id)).toEqual([]);
    });
  });
});

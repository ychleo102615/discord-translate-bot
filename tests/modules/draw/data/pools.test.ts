import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runDrawMigration } from '../../../../src/modules/draw/data/migration.js';
import {
  createPool, getPool, listPools, updatePool, deletePool,
  addItem, getItem, getItems, updateItem, deleteItem,
} from '../../../../src/modules/draw/data/pools.js';
import type { SchemaField } from '../../../../src/modules/draw/types.js';

describe('pools', () => {
  let db: Database.Database;
  const guildId = 'guild-1';
  const schema: SchemaField[] = [
    { name: 'name', type: 'text' },
    { name: 'rarity', type: 'number' },
  ];

  beforeEach(() => {
    db = new Database(':memory:');
    runDrawMigration(db);
  });

  describe('pool CRUD', () => {
    it('creates and retrieves a pool', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      expect(pool.id).toBeDefined();
      expect(pool.guild_id).toBe(guildId);
      expect(pool.name).toBe('Weapons');
      expect(JSON.parse(pool.schema)).toEqual(schema);

      const fetched = getPool(db, pool.id);
      expect(fetched).toEqual(pool);
    });

    it('lists pools by guild', () => {
      createPool(db, guildId, 'Pool A', schema);
      createPool(db, guildId, 'Pool B', schema);
      createPool(db, 'guild-2', 'Pool C', schema);

      const pools = listPools(db, guildId);
      expect(pools).toHaveLength(2);
      expect(pools.map((p) => p.name)).toEqual(['Pool A', 'Pool B']);
    });

    it('updates a pool', () => {
      const pool = createPool(db, guildId, 'Old Name', schema);
      const newSchema: SchemaField[] = [{ name: 'label', type: 'text' }];
      const updated = updatePool(db, pool.id, { name: 'New Name', schema: newSchema });

      expect(updated?.name).toBe('New Name');
      expect(JSON.parse(updated!.schema)).toEqual(newSchema);
    });

    it('returns undefined when updating non-existent pool', () => {
      expect(updatePool(db, 'no-such-id', { name: 'x' })).toBeUndefined();
    });

    it('deletes a pool', () => {
      const pool = createPool(db, guildId, 'To Delete', schema);
      expect(deletePool(db, pool.id)).toBe(true);
      expect(getPool(db, pool.id)).toBeUndefined();
    });

    it('returns false when deleting non-existent pool', () => {
      expect(deletePool(db, 'no-such-id')).toBe(false);
    });
  });

  describe('pool item CRUD', () => {
    it('adds and retrieves an item', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      const item = addItem(db, pool.id, { name: 'Sword', rarity: 5 });

      expect(item.id).toBeDefined();
      expect(item.pool_id).toBe(pool.id);
      expect(JSON.parse(item.data)).toEqual({ name: 'Sword', rarity: 5 });

      const fetched = getItem(db, item.id);
      expect(fetched).toEqual(item);
    });

    it('lists items by pool', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      addItem(db, pool.id, { name: 'Sword', rarity: 5 });
      addItem(db, pool.id, { name: 'Shield', rarity: 3 });

      const items = getItems(db, pool.id);
      expect(items).toHaveLength(2);
    });

    it('validates data against schema - missing field', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      expect(() => addItem(db, pool.id, { name: 'Sword' })).toThrow('Missing required field: rarity');
    });

    it('validates data against schema - wrong type', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      expect(() => addItem(db, pool.id, { name: 'Sword', rarity: 'high' })).toThrow('must be a number');
    });

    it('throws when adding to non-existent pool', () => {
      expect(() => addItem(db, 'no-such-pool', { name: 'x', rarity: 1 })).toThrow('Pool not found');
    });

    it('updates an item', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      const item = addItem(db, pool.id, { name: 'Sword', rarity: 5 });
      const updated = updateItem(db, item.id, { name: 'Great Sword', rarity: 5 });

      expect(JSON.parse(updated!.data)).toEqual({ name: 'Great Sword', rarity: 5 });
    });

    it('returns undefined when updating non-existent item', () => {
      expect(updateItem(db, 'no-such-id', { name: 'x', rarity: 1 })).toBeUndefined();
    });

    it('deletes an item', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      const item = addItem(db, pool.id, { name: 'Sword', rarity: 5 });
      expect(deleteItem(db, item.id)).toBe(true);
      expect(getItem(db, item.id)).toBeUndefined();
    });

    it('cascade deletes items when pool is deleted', () => {
      const pool = createPool(db, guildId, 'Weapons', schema);
      const item = addItem(db, pool.id, { name: 'Sword', rarity: 5 });
      deletePool(db, pool.id);
      expect(getItem(db, item.id)).toBeUndefined();
    });
  });
});

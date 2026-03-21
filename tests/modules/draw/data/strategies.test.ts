import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runDrawMigration } from '../../../../src/modules/draw/data/migration.js';
import { createPool } from '../../../../src/modules/draw/data/pools.js';
import {
  createStrategy, getStrategy, listStrategies, updateStrategy, deleteStrategy,
} from '../../../../src/modules/draw/data/strategies.js';
import type { FilterCondition, SchemaField } from '../../../../src/modules/draw/types.js';

describe('strategies', () => {
  let db: Database.Database;
  const guildId = 'guild-1';
  const schema: SchemaField[] = [
    { name: 'name', type: 'text' },
    { name: 'rarity', type: 'number' },
  ];
  let poolId: string;

  beforeEach(() => {
    db = new Database(':memory:');
    runDrawMigration(db);
    poolId = createPool(db, guildId, 'Weapons', schema).id;
  });

  it('creates and retrieves a strategy', () => {
    const filter: FilterCondition[] = [{ field: 'rarity', operator: 'gte', value: 3 }];
    const strategy = createStrategy(db, guildId, 'Rare Draw', poolId, filter, 'uniform', true);

    expect(strategy.id).toBeDefined();
    expect(strategy.guild_id).toBe(guildId);
    expect(strategy.name).toBe('Rare Draw');
    expect(strategy.pool_id).toBe(poolId);
    expect(JSON.parse(strategy.filter)).toEqual(filter);
    expect(strategy.distribution).toBe('uniform');
    expect(strategy.consumable).toBe(1);

    const fetched = getStrategy(db, strategy.id);
    expect(fetched).toEqual(strategy);
  });

  it('lists strategies by guild', () => {
    const filter: FilterCondition[] = [];
    createStrategy(db, guildId, 'S1', poolId, filter, 'uniform', true);
    createStrategy(db, guildId, 'S2', poolId, filter, 'weighted', false);

    const pool2 = createPool(db, 'guild-2', 'Other', schema);
    createStrategy(db, 'guild-2', 'S3', pool2.id, filter, 'uniform', true);

    const strategies = listStrategies(db, guildId);
    expect(strategies).toHaveLength(2);
    expect(strategies.map((s) => s.name)).toEqual(['S1', 'S2']);
  });

  it('updates a strategy', () => {
    const filter: FilterCondition[] = [];
    const strategy = createStrategy(db, guildId, 'Old', poolId, filter, 'uniform', true);

    const newFilter: FilterCondition[] = [{ field: 'rarity', operator: 'eq', value: 5 }];
    const updated = updateStrategy(db, strategy.id, {
      name: 'New',
      filter: newFilter,
      distribution: 'weighted',
      consumable: false,
    });

    expect(updated?.name).toBe('New');
    expect(JSON.parse(updated!.filter)).toEqual(newFilter);
    expect(updated?.distribution).toBe('weighted');
    expect(updated?.consumable).toBe(0);
  });

  it('returns undefined when updating non-existent strategy', () => {
    expect(updateStrategy(db, 'no-such-id', { name: 'x' })).toBeUndefined();
  });

  it('deletes a strategy', () => {
    const filter: FilterCondition[] = [];
    const strategy = createStrategy(db, guildId, 'To Delete', poolId, filter, 'uniform', true);
    expect(deleteStrategy(db, strategy.id)).toBe(true);
    expect(getStrategy(db, strategy.id)).toBeUndefined();
  });

  it('returns false when deleting non-existent strategy', () => {
    expect(deleteStrategy(db, 'no-such-id')).toBe(false);
  });
});

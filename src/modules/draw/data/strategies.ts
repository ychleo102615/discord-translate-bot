import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { FilterCondition, StrategyRow } from '../types.js';

export function createStrategy(
  db: Database.Database,
  guildId: string,
  name: string,
  poolId: string,
  filter: FilterCondition[],
  distribution: string,
  consumable: boolean,
): StrategyRow {
  const id = randomUUID();
  const now = Date.now();
  const filterJson = JSON.stringify(filter);
  const consumableInt = consumable ? 1 : 0;

  db.prepare(
    `INSERT INTO draw_strategies (id, guild_id, name, pool_id, filter, distribution, consumable, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, guildId, name, poolId, filterJson, distribution, consumableInt, now);

  return {
    id,
    guild_id: guildId,
    name,
    pool_id: poolId,
    filter: filterJson,
    distribution,
    consumable: consumableInt,
    created_at: now,
  };
}

export function getStrategy(db: Database.Database, id: string): StrategyRow | undefined {
  return db.prepare('SELECT * FROM draw_strategies WHERE id = ?').get(id) as StrategyRow | undefined;
}

export function listStrategies(db: Database.Database, guildId: string): StrategyRow[] {
  return db.prepare('SELECT * FROM draw_strategies WHERE guild_id = ? ORDER BY created_at').all(guildId) as StrategyRow[];
}

export function updateStrategy(
  db: Database.Database,
  id: string,
  updates: {
    name?: string;
    filter?: FilterCondition[];
    distribution?: string;
    consumable?: boolean;
  },
): StrategyRow | undefined {
  const strategy = getStrategy(db, id);
  if (!strategy) return undefined;

  const name = updates.name ?? strategy.name;
  const filter = updates.filter ? JSON.stringify(updates.filter) : strategy.filter;
  const distribution = updates.distribution ?? strategy.distribution;
  const consumable = updates.consumable !== undefined ? (updates.consumable ? 1 : 0) : strategy.consumable;

  db.prepare(
    'UPDATE draw_strategies SET name = ?, filter = ?, distribution = ?, consumable = ? WHERE id = ?',
  ).run(name, filter, distribution, consumable, id);

  return { ...strategy, name, filter, distribution, consumable };
}

export function deleteStrategy(db: Database.Database, id: string): boolean {
  const result = db.prepare('DELETE FROM draw_strategies WHERE id = ?').run(id);
  return result.changes > 0;
}

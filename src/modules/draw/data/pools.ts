import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { SchemaField, PoolRow, PoolItemRow } from '../types.js';

// --- Pool CRUD ---

export function createPool(
  db: Database.Database,
  guildId: string,
  name: string,
  schema: SchemaField[],
): PoolRow {
  const id = randomUUID();
  const now = Date.now();
  const schemaJson = JSON.stringify(schema);

  db.prepare(
    'INSERT INTO draw_pools (id, guild_id, name, schema, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(id, guildId, name, schemaJson, now);

  return { id, guild_id: guildId, name, schema: schemaJson, created_at: now };
}

export function getPool(db: Database.Database, id: string): PoolRow | undefined {
  return db.prepare('SELECT * FROM draw_pools WHERE id = ?').get(id) as PoolRow | undefined;
}

export function listPools(db: Database.Database, guildId: string): PoolRow[] {
  return db.prepare('SELECT * FROM draw_pools WHERE guild_id = ? ORDER BY created_at').all(guildId) as PoolRow[];
}

export function updatePool(
  db: Database.Database,
  id: string,
  updates: { name?: string; schema?: SchemaField[] },
): PoolRow | undefined {
  const pool = getPool(db, id);
  if (!pool) return undefined;

  const name = updates.name ?? pool.name;
  const schema = updates.schema ? JSON.stringify(updates.schema) : pool.schema;

  db.prepare('UPDATE draw_pools SET name = ?, schema = ? WHERE id = ?').run(name, schema, id);

  return { ...pool, name, schema };
}

export function deletePool(db: Database.Database, id: string): boolean {
  const result = db.prepare('DELETE FROM draw_pools WHERE id = ?').run(id);
  return result.changes > 0;
}

// --- Pool Item CRUD ---

export function addItem(
  db: Database.Database,
  poolId: string,
  data: Record<string, unknown>,
): PoolItemRow {
  const pool = getPool(db, poolId);
  if (!pool) throw new Error(`Pool not found: ${poolId}`);

  const schema: SchemaField[] = JSON.parse(pool.schema);
  validateData(data, schema);

  const id = randomUUID();
  const now = Date.now();
  const dataJson = JSON.stringify(data);

  db.prepare(
    'INSERT INTO draw_pool_items (id, pool_id, data, created_at) VALUES (?, ?, ?, ?)',
  ).run(id, poolId, dataJson, now);

  return { id, pool_id: poolId, data: dataJson, created_at: now };
}

export function getItem(db: Database.Database, id: string): PoolItemRow | undefined {
  return db.prepare('SELECT * FROM draw_pool_items WHERE id = ?').get(id) as PoolItemRow | undefined;
}

export function getItems(db: Database.Database, poolId: string): PoolItemRow[] {
  return db.prepare('SELECT * FROM draw_pool_items WHERE pool_id = ? ORDER BY created_at').all(poolId) as PoolItemRow[];
}

export function updateItem(
  db: Database.Database,
  id: string,
  data: Record<string, unknown>,
): PoolItemRow | undefined {
  const item = getItem(db, id);
  if (!item) return undefined;

  const pool = getPool(db, item.pool_id);
  if (!pool) throw new Error(`Pool not found: ${item.pool_id}`);

  const schema: SchemaField[] = JSON.parse(pool.schema);
  validateData(data, schema);

  const dataJson = JSON.stringify(data);
  db.prepare('UPDATE draw_pool_items SET data = ? WHERE id = ?').run(dataJson, id);

  return { ...item, data: dataJson };
}

export function deleteItem(db: Database.Database, id: string): boolean {
  const result = db.prepare('DELETE FROM draw_pool_items WHERE id = ?').run(id);
  return result.changes > 0;
}

// --- Validation ---

function validateData(data: Record<string, unknown>, schema: SchemaField[]): void {
  for (const field of schema) {
    const value = data[field.name];
    if (value === undefined) {
      throw new Error(`Missing required field: ${field.name}`);
    }
    if (field.type === 'text' && typeof value !== 'string') {
      throw new Error(`Field "${field.name}" must be a string`);
    }
    if (field.type === 'number' && typeof value !== 'number') {
      throw new Error(`Field "${field.name}" must be a number`);
    }
  }
}

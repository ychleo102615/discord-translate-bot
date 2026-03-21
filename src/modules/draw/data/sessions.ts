import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { FilterCondition, SessionRow, SessionItemRow, HistoryRow, PoolItemRow } from '../types.js';

export function createSession(
  db: Database.Database,
  guildId: string,
  strategyId: string,
): SessionRow {
  const strategy = db.prepare('SELECT * FROM draw_strategies WHERE id = ?').get(strategyId) as
    | { pool_id: string; filter: string }
    | undefined;
  if (!strategy) throw new Error(`Strategy not found: ${strategyId}`);

  const filter: FilterCondition[] = JSON.parse(strategy.filter);
  const poolItems = db.prepare('SELECT * FROM draw_pool_items WHERE pool_id = ?').all(strategy.pool_id) as PoolItemRow[];

  const filteredItems = poolItems.filter((item) => {
    const data = JSON.parse(item.data) as Record<string, unknown>;
    return matchesFilter(data, filter);
  });

  const sessionId = randomUUID();
  const now = Date.now();

  const insertSession = db.prepare(
    'INSERT INTO draw_sessions (id, guild_id, strategy_id, status, created_at) VALUES (?, ?, ?, ?, ?)',
  );
  const insertSessionItem = db.prepare(
    'INSERT INTO draw_session_items (id, session_id, pool_item_id, data, consumed, consumed_at) VALUES (?, ?, ?, ?, 0, NULL)',
  );

  const runTransaction = db.transaction(() => {
    insertSession.run(sessionId, guildId, strategyId, 'active', now);
    for (const item of filteredItems) {
      insertSessionItem.run(randomUUID(), sessionId, item.id, item.data);
    }
  });
  runTransaction();

  return { id: sessionId, guild_id: guildId, strategy_id: strategyId, status: 'active', created_at: now };
}

export function getSession(db: Database.Database, id: string): SessionRow | undefined {
  return db.prepare('SELECT * FROM draw_sessions WHERE id = ?').get(id) as SessionRow | undefined;
}

export function listSessions(db: Database.Database, guildId: string): SessionRow[] {
  return db.prepare('SELECT * FROM draw_sessions WHERE guild_id = ? ORDER BY created_at').all(guildId) as SessionRow[];
}

export function closeSession(db: Database.Database, id: string): boolean {
  const result = db.prepare("UPDATE draw_sessions SET status = 'closed' WHERE id = ?").run(id);
  return result.changes > 0;
}

export function getSessionItems(db: Database.Database, sessionId: string): SessionItemRow[] {
  return db.prepare(
    'SELECT * FROM draw_session_items WHERE session_id = ? AND consumed = 0',
  ).all(sessionId) as SessionItemRow[];
}

export function consumeItem(db: Database.Database, id: string): boolean {
  const now = Date.now();
  const result = db.prepare(
    'UPDATE draw_session_items SET consumed = 1, consumed_at = ? WHERE id = ? AND consumed = 0',
  ).run(now, id);
  return result.changes > 0;
}

export function addHistory(
  db: Database.Database,
  sessionId: string,
  userId: string,
  sessionItemId: string,
  round: number,
): HistoryRow {
  const id = randomUUID();
  const now = Date.now();

  db.prepare(
    'INSERT INTO draw_history (id, session_id, user_id, session_item_id, round, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, sessionId, userId, sessionItemId, round, now);

  return { id, session_id: sessionId, user_id: userId, session_item_id: sessionItemId, round, created_at: now };
}

export function getHistory(db: Database.Database, sessionId: string): HistoryRow[] {
  return db.prepare('SELECT * FROM draw_history WHERE session_id = ? ORDER BY created_at').all(sessionId) as HistoryRow[];
}

// --- Filter matching ---

function matchesFilter(data: Record<string, unknown>, conditions: FilterCondition[]): boolean {
  return conditions.every((cond) => {
    const value = data[cond.field];
    switch (cond.operator) {
      case 'eq':
        return value === cond.value;
      case 'neq':
        return value !== cond.value;
      case 'in':
        return Array.isArray(cond.value) && cond.value.includes(String(value));
      case 'gt':
        return typeof value === 'number' && typeof cond.value === 'number' && value > cond.value;
      case 'gte':
        return typeof value === 'number' && typeof cond.value === 'number' && value >= cond.value;
      case 'lt':
        return typeof value === 'number' && typeof cond.value === 'number' && value < cond.value;
      case 'lte':
        return typeof value === 'number' && typeof cond.value === 'number' && value <= cond.value;
      default:
        return false;
    }
  });
}

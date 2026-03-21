import type Database from 'better-sqlite3';

export function runDrawMigration(db: Database.Database): void {
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS draw_pools (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      schema TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS draw_pool_items (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL REFERENCES draw_pools(id) ON DELETE CASCADE,
      data TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS draw_strategies (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      pool_id TEXT NOT NULL REFERENCES draw_pools(id),
      filter TEXT NOT NULL,
      distribution TEXT NOT NULL,
      consumable INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS draw_sessions (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      strategy_id TEXT NOT NULL REFERENCES draw_strategies(id),
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS draw_session_items (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES draw_sessions(id) ON DELETE CASCADE,
      pool_item_id TEXT NOT NULL,
      data TEXT NOT NULL,
      consumed INTEGER NOT NULL DEFAULT 0,
      consumed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS draw_history (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES draw_sessions(id),
      user_id TEXT NOT NULL,
      session_item_id TEXT NOT NULL,
      round INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);
}

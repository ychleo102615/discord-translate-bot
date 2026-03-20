import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { initDatabase, getDatabase, closeDatabase } from '../../src/shared/db.js';

describe('db', () => {
  const tmpDir = os.tmpdir();
  let dbPath: string;

  afterEach(() => {
    closeDatabase();
    if (dbPath && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('creates database file and runs migrations', () => {
    dbPath = path.join(tmpDir, `test-${Date.now()}.db`);
    const db = initDatabase(dbPath);
    expect(fs.existsSync(dbPath)).toBe(true);

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const names = tables.map((t: any) => t.name);
    expect(names).toContain('sessions');
    expect(names).toContain('audit_log');
  });

  it('getDatabase returns initialized instance', () => {
    dbPath = path.join(tmpDir, `test-${Date.now()}.db`);
    initDatabase(dbPath);
    expect(() => getDatabase()).not.toThrow();
  });

  it('getDatabase throws before init', () => {
    // closeDatabase() was called in afterEach, so singleton is null
    expect(() => getDatabase()).toThrow('Database not initialized');
  });
});

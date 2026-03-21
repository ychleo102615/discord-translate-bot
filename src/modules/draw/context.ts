import type Database from 'better-sqlite3';

let db: Database.Database;

export function setDb(database: Database.Database): void {
  db = database;
}

export function getDb(): Database.Database {
  return db;
}

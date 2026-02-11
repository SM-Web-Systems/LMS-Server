import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DATABASE_PATH || './data/student_ms.db';

// Ensure directory exists
import fs from 'fs';
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function query<T>(sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql);
  return stmt.all(...params) as T[];
}

export function queryOne<T>(sql: string, params: unknown[] = []): T | null {
  const stmt = db.prepare(sql);
  return (stmt.get(...params) as T) || null;
}

export function execute(sql: string, params: unknown[] = []): number {
  const stmt = db.prepare(sql);
  const result = stmt.run(...params);
  return result.changes;
}

export function insert(sql: string, params: unknown[] = []): string | number {
  const stmt = db.prepare(sql);
  const result = stmt.run(...params);
  return result.lastInsertRowid;
}

export function close(): void {
  db.close();
}

import Database, { type Database as DatabaseType } from 'better-sqlite3';
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

export let db: DatabaseType = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Ensure user_course_codes exists (for DBs created before course-code access was added)
function ensureCourseCodeTables(): void {
  const hasTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_course_codes'")
    .get();
  if (!hasTable) {
    db.exec(`
      CREATE TABLE user_course_codes (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_code TEXT NOT NULL,
        PRIMARY KEY (user_id, course_code)
      );
      CREATE INDEX IF NOT EXISTS idx_user_course_codes_user ON user_course_codes(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_course_codes_code ON user_course_codes(course_code);
    `);
  }
}
ensureCourseCodeTables();

function ensureClerkUserIdColumn(): void {
  const hasUsers = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    .get();
  if (!hasUsers) return;

  const cols = db.prepare('PRAGMA table_info(users)').all() as { name: string }[];
  if (!cols.some((c) => c.name === 'clerk_user_id')) {
    db.exec('ALTER TABLE users ADD COLUMN clerk_user_id TEXT');
  }
  db.exec(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id) WHERE clerk_user_id IS NOT NULL'
  );
}
ensureClerkUserIdColumn();

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
  return Number(result.lastInsertRowid);
}

export function close(): void {
  db.close();
}

export function _resetForTests(schemaSQL: string): void {
  try { db.close(); } catch { /* already closed */ }
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(schemaSQL);
}

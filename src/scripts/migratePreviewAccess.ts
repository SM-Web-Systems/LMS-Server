/**
 * Adds read-only preview support:
 *  - users.access_level ('full' | 'preview'), existing rows default to 'full'
 *  - courses.is_public_preview (0/1), marks courses public preview users may read
 * Safe to run multiple times.
 */
import dotenv from 'dotenv';
dotenv.config();

import { db, close } from '../config/database.js';

function columnExists(table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((r) => r.name === column);
}

try {
  if (!columnExists('users', 'access_level')) {
    db.exec("ALTER TABLE users ADD COLUMN access_level TEXT NOT NULL DEFAULT 'full'");
    console.log('Added column users.access_level (default full)');
  } else {
    console.log('Column users.access_level already exists');
  }

  if (!columnExists('courses', 'is_public_preview')) {
    db.exec('ALTER TABLE courses ADD COLUMN is_public_preview INTEGER NOT NULL DEFAULT 0');
    console.log('Added column courses.is_public_preview (default 0)');
  } else {
    console.log('Column courses.is_public_preview already exists');
  }

  console.log('Preview-access migration done.');
} finally {
  close();
}

/**
 * Add admins (Liam, Mukhtar, Benhur, Douglas, Myles). Idempotent.
 * Run: npx tsx src/scripts/addAdmins.ts (local) or docker exec lms-server node dist/scripts/addAdmins.js (server)
 */
import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, close } from '../config/database.js';

const ADMINS = [
  { name: 'Liam McMaster', email: 'liam.mcmaster@smwebsystems.com' },
  { name: 'Mukhtar Meer', email: 'mukhtar.meer@smwebsystems.com' },
  { name: 'Benhur Mwamba', email: 'benhur.mwamba@smwebsystems.com' },
  { name: 'Douglas Bailey', email: 'douglas.bailey@smwebsystems.com' },
  { name: 'Myles Traut', email: 'myles.traut@smwebsystems.com' },
];
const TEMP_PASSWORD = 'SmWebAdmin2026!';

function run() {
  const hash = bcrypt.hashSync(TEMP_PASSWORD, 10);
  const now = new Date().toISOString();
  const insert = db.prepare(
    'INSERT OR IGNORE INTO users (id, name, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const updateRole = db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE email = ?');
  const get = db.prepare('SELECT id, role FROM users WHERE email = ?');

  for (const a of ADMINS) {
    const email = a.email.toLowerCase();
    const row = get.get(email) as { id: string; role: string } | undefined;
    if (row) {
      updateRole.run('admin', now, email);
      console.log('Updated to admin:', a.email);
    } else {
      insert.run(uuidv4(), a.name, email, hash, 'admin', now, now);
      console.log('Created admin:', a.email);
    }
  }
  console.log('Temp password for new admins:', TEMP_PASSWORD);
  close();
}

run();

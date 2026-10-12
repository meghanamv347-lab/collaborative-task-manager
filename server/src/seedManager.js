import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import pool, { connectDB } from './db.js';

dotenv.config();

const managerEmail = process.env.MANAGER_EMAIL || 'manager@taskmanager.local';
const managerPassword = process.env.MANAGER_PASSWORD;

if (!managerPassword || managerPassword.length < 8) {
  throw new Error('Set MANAGER_PASSWORD (at least 8 characters) in server/.env before seeding.');
}

try {
  await connectDB();
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [managerEmail]);
  if (existing.length) {
    await pool.query('UPDATE users SET role = \'manager\' WHERE id = ?', [existing[0].id]);
    console.log(`Existing account ${managerEmail} promoted to manager.`);
  } else {
    const passwordHash = await bcrypt.hash(managerPassword, 10);
    await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, \'manager\')',
      ['Project Manager', managerEmail, passwordHash]
    );
    console.log(`Manager account created: ${managerEmail}`);
  }
} catch (error) {
  console.error('Manager seed failed:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}

import pool from '../db.js';

const User = {
  async findByEmail(email) {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1',
      [email]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  },

  async create({ name, email, password, role = 'user' }) {
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, password, role]
    );
    return result.insertId;
  },

  async list() {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY name ASC'
    );
    return rows;
  },
};

export default User;
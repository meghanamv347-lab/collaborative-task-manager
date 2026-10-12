import pool from '../db.js';

const Activity = {
  async create(connection, { taskId, actorId, action, details }) {
    await connection.query(
      'INSERT INTO activity_logs (task_id, actor_id, action, details) VALUES (?, ?, ?, ?)',
      [taskId, actorId, action, details]
    );
  },

  async listForTask(taskId) {
    const [rows] = await pool.query(`
      SELECT a.id, a.action, a.details, a.created_at, u.name AS actor_name
      FROM activity_logs a
      LEFT JOIN users u ON u.id = a.actor_id
      WHERE a.task_id = ?
      ORDER BY a.created_at DESC
    `, [taskId]);
    return rows;
  },
};

export default Activity;
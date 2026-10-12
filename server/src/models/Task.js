import pool from '../db.js';

export function mapTaskRow(task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description || '',
    status: task.status || 'todo',
    priority: task.priority || 'medium',
    assignedTo: task.assigned_to
      ? { id: task.assigned_to, name: task.assigned_name, email: task.assigned_email }
      : null,
    createdBy: task.created_by
      ? { id: task.created_by, name: task.creator_name, email: task.creator_email }
      : null,
    dueDate: task.due_date,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  };
}

const taskSelect = `
  SELECT t.*, u.name AS assigned_name, u.email AS assigned_email,
         c.name AS creator_name, c.email AS creator_email
  FROM tasks t
  LEFT JOIN users u ON u.id = t.assigned_to
  LEFT JOIN users c ON c.id = t.created_by
`;

const Task = {
  async findById(id) {
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  },

  async listForUser({ id, role }) {
    const where = role === 'manager' ? 'WHERE t.created_by = ?' : 'WHERE t.assigned_to = ?';
    const [rows] = await pool.query(
      `${taskSelect} ${where} ORDER BY t.created_at DESC`,
      [id]
    );
    return rows.map(mapTaskRow);
  },

  async create(connection, { title, description, status, priority, assignedTo, createdBy, dueDate }) {
    const [result] = await connection.query(
      'INSERT INTO tasks (title, description, status, priority, assigned_to, created_by, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, description, status, priority, assignedTo, createdBy, dueDate]
    );
    return result.insertId;
  },

  async update(connection, id, fields, values) {
    const [result] = await connection.query(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`,
      [...values, id]
    );
    return result;
  },

  async findDetailed(id) {
    const [rows] = await pool.query(`${taskSelect} WHERE t.id = ? LIMIT 1`, [id]);
    return rows[0] ? mapTaskRow(rows[0]) : null;
  },

  async deleteCreatedBy(id, managerId) {
    const [result] = await pool.query(
      'DELETE FROM tasks WHERE id = ? AND created_by = ?',
      [id, managerId]
    );
    return result;
  },
};

export default Task;
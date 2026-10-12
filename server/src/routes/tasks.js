import { Router } from 'express';
import auth from '../middleware/auth.js';
import pool from '../db.js';
import Activity from '../models/Activity.js';
import Task from '../models/Task.js';
import User from '../models/User.js';

const router = Router();

const validStatuses = ['todo', 'in-progress', 'completed'];
const validPriorities = ['low', 'medium', 'high'];

router.use(auth);

router.get('/', async (req, res) => {
  try {
    return res.json(await Task.listForUser(req.user));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch tasks.', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Only managers can create tasks.' });
    }

    const { title, description, status, priority, assignedTo, dueDate } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Task title is required.' });
    }

    if (assignedTo) {
      const assignedUser = await User.findById(assignedTo);
      if (!assignedUser) {
        return res.status(404).json({ message: 'Assigned user not found.' });
      }
    }

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid task status.' });
    }
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ message: 'Invalid task priority.' });
    }

    const connection = await pool.getConnection();
    let taskId;
    try {
      await connection.beginTransaction();
      taskId = await Task.create(connection, {
        title: String(title).trim(),
        description: description || '',
        status: status || 'todo',
        priority: priority || 'medium',
        assignedTo: assignedTo || null,
        createdBy: req.user.id,
        dueDate: dueDate || null,
      });
      await Activity.create(connection, { taskId, actorId: req.user.id, action: 'created', details: `Created task “${String(title).trim()}”.` });
      if (assignedTo) {
        await Activity.create(connection, { taskId, actorId: req.user.id, action: 'assigned', details: `Assigned task to user ${assignedTo}.` });
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return res.status(201).json(await Task.findDetailed(taskId));
  } catch (error) {
    return res.status(500).json({ message: 'Task creation failed.', error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, description, status, priority, assignedTo, dueDate } = req.body;
    const previous = await Task.findById(req.params.id);
    if (!previous) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (req.user.role === 'user') {
      const keys = Object.keys(req.body);
      if (previous.assigned_to !== Number(req.user.id) || keys.length !== 1 || keys[0] !== 'status') {
        return res.status(403).json({ message: 'Users can only update the status of tasks assigned to them.' });
      }
    } else if (req.user.role !== 'manager' || previous.created_by !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Managers can only edit tasks they created.' });
    }

    if (status !== undefined && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid task status.' });
    }
    if (priority !== undefined && !validPriorities.includes(priority)) {
      return res.status(400).json({ message: 'Invalid task priority.' });
    }
    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(String(title).trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || '');
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      values.push(priority);
    }
    if (assignedTo !== undefined) {
      if (assignedTo) {
        const assignedUser = await User.findById(assignedTo);
        if (!assignedUser) {
          return res.status(404).json({ message: 'Assigned user not found.' });
        }
      }
      updates.push('assigned_to = ?');
      values.push(assignedTo || null);
    }
    if (dueDate !== undefined) {
      updates.push('due_date = ?');
      values.push(dueDate || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No task fields were provided to update.' });
    }

    values.push(req.params.id);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await Task.update(connection, req.params.id, updates, values);

      if (status !== undefined && status !== previous.status) {
        await Activity.create(connection, { taskId: previous.id, actorId: req.user.id, action: 'status', details: `Changed status from ${previous.status} to ${status}.` });
      }
      if (assignedTo !== undefined && Number(assignedTo || 0) !== Number(previous.assigned_to || 0)) {
        await Activity.create(connection, { taskId: previous.id, actorId: req.user.id, action: 'assigned', details: `Changed task assignment to ${assignedTo || 'unassigned'}.` });
      }
      const otherFieldsChanged = ['title', 'description', 'priority', 'dueDate'].some((field) => req.body[field] !== undefined);
      if (otherFieldsChanged) {
        await Activity.create(connection, { taskId: previous.id, actorId: req.user.id, action: 'updated', details: 'Updated task details.' });
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return res.json(await Task.findDetailed(req.params.id));
  } catch (error) {
    return res.status(500).json({ message: 'Task update failed.', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Only managers can delete tasks.' });
    }

    const result = await Task.deleteCreatedBy(req.params.id, req.user.id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    return res.json({ message: 'Task deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Task deletion failed.', error: error.message });
  }
});

router.get('/:id/activity', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }
    const permitted = req.user.role === 'manager'
      ? task.created_by === Number(req.user.id)
      : task.assigned_to === Number(req.user.id);
    if (!permitted) {
      return res.status(403).json({ message: 'You cannot view this task activity.' });
    }

    return res.json(await Activity.listForTask(req.params.id));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch task activity.', error: error.message });
  }
});

export default router;

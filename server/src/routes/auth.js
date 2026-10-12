import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Router } from 'express';
import User from '../models/User.js';

const router = Router();

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists.' });
    }

    const safeRole = 'user';
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: safeRole,
    });

    const token = jwt.sign({ id: userId, role: safeRole }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.status(201).json({
      token,
      user: {
        id: userId,
        name: String(name).trim(),
        email: normalizedEmail,
        role: safeRole,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Registration failed.', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed.', error: error.message });
  }
});

export default router;

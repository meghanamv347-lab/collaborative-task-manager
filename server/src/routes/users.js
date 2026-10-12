import { Router } from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';

const router = Router();

router.use(auth);

router.get('/', async (req, res) => {
  if (req.user.role !== 'manager') {
    return res.status(403).json({ message: 'Only managers can view the team directory.' });
  }

  try {
    return res.json(await User.list());
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch users.', error: error.message });
  }
});

export default router;

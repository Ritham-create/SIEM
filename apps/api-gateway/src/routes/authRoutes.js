import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import memoryDb from '../models/memoryDb.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'siem_super_secret_session_key_998811';

// Helper to sign JWT
const signToken = (user) => {
  return jwt.sign(
    { id: user._id || user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// @route   POST /api/v1/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter all fields' });
    }

    const targetRole = role && ['Admin', 'Analyst', 'Viewer'].includes(role) ? role : 'Viewer';

    if (mongoose.connection.readyState === 1) {
      const userExists = await User.findOne({ $or: [{ email }, { username }] });
      if (userExists) {
        return res.status(400).json({ success: false, message: 'User already exists' });
      }

      const user = new User({ username, email, password, role: targetRole });
      await user.save();

      const token = signToken(user);
      return res.status(201).json({
        success: true,
        token,
        user: { id: user._id, username: user.username, email: user.email, role: user.role }
      });
    } else {
      // MemoryDb fallback
      const userExists = memoryDb.users.find(u => u.email === email || u.username === username);
      if (userExists) {
        return res.status(400).json({ success: false, message: 'User already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = {
        _id: 'u_' + Date.now(),
        username,
        email,
        password: hashedPassword,
        role: targetRole,
        createdAt: new Date()
      };

      memoryDb.users.push(newUser);
      const token = signToken(newUser);

      return res.status(201).json({
        success: true,
        token,
        user: { id: newUser._id, username: newUser.username, email: newUser.email, role: newUser.role }
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/v1/auth/login
// @desc    Authenticate user and get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please enter all fields' });
    }

    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
      }

      const token = signToken(user);
      return res.json({
        success: true,
        token,
        user: { id: user._id, username: user.username, email: user.email, role: user.role }
      });
    } else {
      // MemoryDb fallback
      const user = memoryDb.users.find(u => u.email === email);
      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
      }

      const token = signToken(user);
      return res.json({
        success: true,
        token,
        user: { id: user._id, username: user.username, email: user.email, role: user.role }
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/v1/auth/me
// @desc    Get current user details
router.get('/me', authenticate, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// @route   GET /api/v1/auth/users
// @desc    Get all users (Admin only)
router.get('/users', authenticate, requireRole('Admin'), async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const users = await User.find().select('-password');
      res.json({ success: true, data: users });
    } else {
      const users = memoryDb.users.map(u => {
        const { password, ...userWithoutPassword } = u;
        return userWithoutPassword;
      });
      res.json({ success: true, data: users });
    }
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/v1/auth/users/:id/role
// @desc    Update user role (Admin only)
router.put('/users/:id/role', authenticate, requireRole('Admin'), async (req, res) => {
  const { role } = req.body;
  if (!['Admin', 'Analyst', 'Viewer'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }

  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      res.json({ success: true, data: user });
    } else {
      const user = memoryDb.users.find(u => u._id === req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      user.role = role;
      const { password, ...userWithoutPassword } = user;
      res.json({ success: true, data: userWithoutPassword });
    }
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/v1/auth/users/:id
// @desc    Delete user account (Admin only)
router.delete('/users/:id', authenticate, requireRole('Admin'), async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      res.json({ success: true, message: 'User deleted successfully' });
    } else {
      const index = memoryDb.users.findIndex(u => u._id === req.params.id);
      if (index === -1) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      memoryDb.users.splice(index, 1);
      res.json({ success: true, message: 'User deleted successfully' });
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

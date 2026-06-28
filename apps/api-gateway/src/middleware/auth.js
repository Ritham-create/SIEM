import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import memoryDb from '../models/memoryDb.js';
import mongoose from 'mongoose';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Invalid token format' });
    }

    const secret = process.env.JWT_SECRET || 'siem_super_secret_session_key_998811';
    const decoded = jwt.verify(token, secret);

    let user;
    if (mongoose.connection.readyState === 1) {
      user = await User.findById(decoded.id).select('-password');
    } else {
      user = memoryDb.users.find(u => u._id === decoded.id);
      if (user) {
        // Exclude password in mock
        const { password, ...userWithoutPassword } = user;
        user = userWithoutPassword;
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'User session expired or not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth verification failed:', error.message);
    return res.status(401).json({ success: false, message: 'Authentication token is invalid or expired' });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const hasRole = Array.isArray(roles) 
      ? roles.includes(req.user.role) 
      : req.user.role === roles;

    if (!hasRole) {
      return res.status(403).json({ 
        success: false, 
        message: `Forbidden: This action requires one of the following roles: [${Array.isArray(roles) ? roles.join(', ') : roles}]` 
      });
    }

    next();
  };
};

import express from 'express';
import mongoose from 'mongoose';
import Log from '../models/Log.js';
import memoryDb from '../models/memoryDb.js';
import { authenticate } from '../middleware/auth.js';
import { analyzeLog } from '../services/analyzer.js';

const router = express.Router();

// @route   POST /api/v1/logs
// @desc    Ingest a new log / event (Public or internal ingestion)
router.post('/', async (req, res) => {
  const { sourceIp, destIp, service, user, action, status, severity, logType, payload } = req.body;

  if (!sourceIp || !action) {
    return res.status(400).json({ success: false, message: 'Source IP and Action are required fields' });
  }

  try {
    const logData = {
      timestamp: new Date(),
      sourceIp,
      destIp: destIp || 'N/A',
      service: service || 'unknown',
      user: user || 'system',
      action,
      status: status || 'info',
      severity: severity || 'info',
      logType: logType || 'syslog',
      payload: payload || {}
    };

    let logSaved;
    if (mongoose.connection.readyState === 1) {
      const log = new Log(logData);
      logSaved = await log.save();
    } else {
      // MemoryDb fallback
      logSaved = { _id: 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5), ...logData };
      memoryDb.logs.unshift(logSaved);
      // Keep memory logs under 1000 items to avoid exhaustion
      if (memoryDb.logs.length > 1000) memoryDb.logs.pop();
    }

    // Emit the log in real-time to connected browser clients
    const io = req.app.locals.io;
    if (io) {
      io.emit('newLog', logSaved);
    }

    // Run log through the Real-time Correlation Rules Engine
    // Non-blocking analysis to respond to ingestion immediately
    analyzeLog(logSaved);

    res.status(201).json({
      success: true,
      data: logSaved
    });
  } catch (error) {
    console.error('Log ingestion error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/v1/logs
// @desc    Query security logs with filters & pagination
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const { search, sourceIp, severity, status } = req.query;

    let dbQuery = {};
    if (sourceIp) dbQuery.sourceIp = sourceIp;
    if (severity) dbQuery.severity = severity;
    if (status) dbQuery.status = status;
    if (search) {
      dbQuery.$or = [
        { action: { $regex: search, $options: 'i' } },
        { user: { $regex: search, $options: 'i' } },
        { service: { $regex: search, $options: 'i' } },
        { sourceIp: { $regex: search, $options: 'i' } }
      ];
    }

    if (mongoose.connection.readyState === 1) {
      const total = await Log.countDocuments(dbQuery);
      const logs = await Log.find(dbQuery)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);

      return res.json({
        success: true,
        data: logs,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } else {
      // MemoryDb fallback query filtering
      let filteredLogs = [...memoryDb.logs];

      if (sourceIp) {
        filteredLogs = filteredLogs.filter(l => l.sourceIp === sourceIp);
      }
      if (severity) {
        filteredLogs = filteredLogs.filter(l => l.severity === severity);
      }
      if (status) {
        filteredLogs = filteredLogs.filter(l => l.status === status);
      }
      if (search) {
        const searchLower = search.toLowerCase();
        filteredLogs = filteredLogs.filter(l => 
          l.action.toLowerCase().includes(searchLower) ||
          l.user.toLowerCase().includes(searchLower) ||
          l.service.toLowerCase().includes(searchLower) ||
          l.sourceIp.toLowerCase().includes(searchLower)
        );
      }

      const total = filteredLogs.length;
      // Sort newest first
      filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      const paginatedLogs = filteredLogs.slice(skip, skip + limit);

      return res.json({
        success: true,
        data: paginatedLogs,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    }
  } catch (error) {
    console.error('Fetch logs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

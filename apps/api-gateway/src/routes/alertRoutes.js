import express from 'express';
import mongoose from 'mongoose';
import Alert from '../models/Alert.js';
import Rule from '../models/Rule.js';
import Case from '../models/Case.js';
import memoryDb from '../models/memoryDb.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/v1/alerts/stats
// @desc    Get alerts high-level metrics for dashboard widgets
router.get('/stats', authenticate, async (req, res) => {
  try {
    let totalAlerts = 0;
    let criticalAlerts = 0;
    let activeCases = 0;
    let rulesEnabled = 0;

    if (mongoose.connection.readyState === 1) {
      totalAlerts = await Alert.countDocuments();
      criticalAlerts = await Alert.countDocuments({ severity: 'critical', status: { $ne: 'Closed' } });
      activeCases = await Case.countDocuments({ status: { $in: ['Open', 'InProgress'] } });
      rulesEnabled = await Rule.countDocuments({ active: true });
    } else {
      // Memory DB counts
      totalAlerts = memoryDb.alerts.length;
      criticalAlerts = memoryDb.alerts.filter(a => a.severity === 'critical' && a.status !== 'Closed').length;
      activeCases = memoryDb.cases.filter(c => ['Open', 'InProgress'].includes(c.status)).length;
      rulesEnabled = memoryDb.rules.filter(r => r.active).length;
    }

    res.json({
      success: true,
      data: {
        totalAlerts,
        criticalAlerts,
        activeCases,
        rulesEnabled
      }
    });
  } catch (error) {
    console.error('Fetch stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/v1/alerts
// @desc    Get all alerts (supports pagination, filter by severity, status)
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { severity, status, sourceIp } = req.query;

    let dbQuery = {};
    if (severity) dbQuery.severity = severity;
    if (status) dbQuery.status = status;
    if (sourceIp) dbQuery.sourceIp = sourceIp;

    if (mongoose.connection.readyState === 1) {
      const total = await Alert.countDocuments(dbQuery);
      const alerts = await Alert.find(dbQuery)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);

      res.json({
        success: true,
        data: alerts,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    } else {
      // MemoryDb filtering
      let filteredAlerts = [...memoryDb.alerts];
      if (severity) filteredAlerts = filteredAlerts.filter(a => a.severity === severity);
      if (status) filteredAlerts = filteredAlerts.filter(a => a.status === status);
      if (sourceIp) filteredAlerts = filteredAlerts.filter(a => a.sourceIp === sourceIp);

      const total = filteredAlerts.length;
      // Sort newest first
      filteredAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      const paginatedAlerts = filteredAlerts.slice(skip, skip + limit);

      res.json({
        success: true,
        data: paginatedAlerts,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      });
    }
  } catch (error) {
    console.error('Fetch alerts error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/v1/alerts/:id
// @desc    Get detailed view of a specific alert
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const alert = await Alert.findById(req.params.id);
      if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
      res.json({ success: true, data: alert });
    } else {
      const alert = memoryDb.alerts.find(a => a._id === req.params.id);
      if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
      res.json({ success: true, data: alert });
    }
  } catch (error) {
    console.error('Fetch alert detail error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/v1/alerts/:id/status
// @desc    Update alert status (New, Investigating, Closed, False Positive)
router.put('/:id/status', authenticate, requireRole(['Admin', 'Analyst']), async (req, res) => {
  const { status } = req.body;
  if (!['New', 'Investigating', 'Closed', 'False Positive'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid alert status' });
  }

  try {
    if (mongoose.connection.readyState === 1) {
      const alert = await Alert.findByIdAndUpdate(req.params.id, { status }, { new: true });
      if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
      res.json({ success: true, data: alert });
    } else {
      const alert = memoryDb.alerts.find(a => a._id === req.params.id);
      if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
      alert.status = status;
      res.json({ success: true, data: alert });
    }
  } catch (error) {
    console.error('Update alert status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

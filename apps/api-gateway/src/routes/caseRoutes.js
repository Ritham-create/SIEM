import express from 'express';
import mongoose from 'mongoose';
import Case from '../models/Case.js';
import Alert from '../models/Alert.js';
import memoryDb from '../models/memoryDb.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/v1/cases
// @desc    Get list of all cases
router.get('/', authenticate, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const cases = await Case.find().sort({ createdAt: -1 });
      res.json({ success: true, data: cases });
    } else {
      res.json({ success: true, data: memoryDb.cases });
    }
  } catch (error) {
    console.error('Fetch cases error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/v1/cases/:id
// @desc    Get detailed case with timeline and nested alert descriptions
router.get('/:id', authenticate, async (req, res) => {
  try {
    let incidentCase;
    if (mongoose.connection.readyState === 1) {
      incidentCase = await Case.findById(req.params.id);
      if (!incidentCase) return res.status(404).json({ success: false, message: 'Case not found' });
      
      // Manually look up associated alerts
      const associatedAlerts = await Alert.find({ _id: { $in: incidentCase.alerts } });
      res.json({
        success: true,
        data: {
          ...incidentCase.toObject(),
          alertsData: associatedAlerts
        }
      });
    } else {
      incidentCase = memoryDb.cases.find(c => c._id === req.params.id);
      if (!incidentCase) return res.status(404).json({ success: false, message: 'Case not found' });
      
      const associatedAlerts = memoryDb.alerts.filter(a => incidentCase.alerts.includes(a._id));
      res.json({
        success: true,
        data: {
          ...incidentCase,
          alertsData: associatedAlerts
        }
      });
    }
  } catch (error) {
    console.error('Fetch case detail error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/v1/cases
// @desc    Create a new case (Analyst and Admin only)
router.post('/', authenticate, requireRole(['Admin', 'Analyst']), async (req, res) => {
  const { title, description, severity, alertId } = req.body;

  if (!title || !description) {
    return res.status(400).json({ success: false, message: 'Title and description are required' });
  }

  try {
    const caseData = {
      title,
      description,
      severity: severity || 'medium',
      status: 'Open',
      assignee: 'Unassigned',
      alerts: alertId ? [alertId] : [],
      timeline: [
        {
          event: `Case opened by ${req.user.username}`,
          timestamp: new Date(),
          author: req.user.username
        }
      ],
      createdAt: new Date()
    };

    let savedCase;
    if (mongoose.connection.readyState === 1) {
      const c = new Case(caseData);
      savedCase = await c.save();

      // If created from alert, mark alert as Investigating
      if (alertId) {
        await Alert.findByIdAndUpdate(alertId, { status: 'Investigating' });
      }
    } else {
      savedCase = { _id: 'c_' + Date.now(), ...caseData };
      memoryDb.cases.unshift(savedCase);

      if (alertId) {
        const alert = memoryDb.alerts.find(a => a._id === alertId);
        if (alert) alert.status = 'Investigating';
      }
    }

    res.status(201).json({ success: true, data: savedCase });
  } catch (error) {
    console.error('Create case error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/v1/cases/:id
// @desc    Update case priority, assignee, status, etc.
router.put('/:id', authenticate, requireRole(['Admin', 'Analyst']), async (req, res) => {
  const { status, assignee, severity } = req.body;

  try {
    const updateFields = {};
    const logEvents = [];

    if (status) {
      updateFields.status = status;
      logEvents.push({ event: `Status updated to '${status}' by ${req.user.username}`, author: req.user.username });
    }
    if (assignee) {
      updateFields.assignee = assignee;
      logEvents.push({ event: `Case assigned to '${assignee}' by ${req.user.username}`, author: req.user.username });
    }
    if (severity) {
      updateFields.severity = severity;
      logEvents.push({ event: `Severity updated to '${severity}' by ${req.user.username}`, author: req.user.username });
    }

    if (mongoose.connection.readyState === 1) {
      const incidentCase = await Case.findById(req.params.id);
      if (!incidentCase) return res.status(404).json({ success: false, message: 'Case not found' });

      // Apply updates and push to timeline
      Object.assign(incidentCase, updateFields);
      logEvents.forEach(e => incidentCase.timeline.push(e));
      await incidentCase.save();

      res.json({ success: true, data: incidentCase });
    } else {
      const incidentCase = memoryDb.cases.find(c => c._id === req.params.id);
      if (!incidentCase) return res.status(404).json({ success: false, message: 'Case not found' });

      Object.assign(incidentCase, updateFields);
      logEvents.forEach(e => incidentCase.timeline.push({ ...e, timestamp: new Date() }));

      res.json({ success: true, data: incidentCase });
    }
  } catch (error) {
    console.error('Update case error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/v1/cases/:id/comments
// @desc    Add comment / timeline event to case
router.post('/:id/comments', authenticate, requireRole(['Admin', 'Analyst']), async (req, res) => {
  const { comment } = req.body;
  if (!comment || comment.trim() === '') {
    return res.status(400).json({ success: false, message: 'Comment body is required' });
  }

  try {
    const event = `Comment: "${comment}"`;
    const author = req.user.username;

    if (mongoose.connection.readyState === 1) {
      const incidentCase = await Case.findByIdAndUpdate(
        req.params.id,
        { 
          $push: { 
            timeline: { event, author, timestamp: new Date() } 
          } 
        },
        { new: true }
      );
      if (!incidentCase) return res.status(404).json({ success: false, message: 'Case not found' });
      res.json({ success: true, data: incidentCase });
    } else {
      const incidentCase = memoryDb.cases.find(c => c._id === req.params.id);
      if (!incidentCase) return res.status(404).json({ success: false, message: 'Case not found' });
      
      incidentCase.timeline.push({
        event,
        author,
        timestamp: new Date()
      });
      res.json({ success: true, data: incidentCase });
    }
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

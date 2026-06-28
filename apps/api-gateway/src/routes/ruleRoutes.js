import express from 'express';
import mongoose from 'mongoose';
import Rule from '../models/Rule.js';
import memoryDb from '../models/memoryDb.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/v1/rules
// @desc    List all correlation rules
router.get('/', authenticate, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const rules = await Rule.find().sort({ createdAt: -1 });
      res.json({ success: true, data: rules });
    } else {
      res.json({ success: true, data: memoryDb.rules });
    }
  } catch (error) {
    console.error('Fetch rules error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/v1/rules
// @desc    Create a new correlation rule (Admin only)
router.post('/', authenticate, requireRole('Admin'), async (req, res) => {
  const { 
    name, 
    description, 
    conditionField, 
    conditionOperator, 
    conditionValue, 
    thresholdCount, 
    thresholdWindowMinutes, 
    severity, 
    mitreTactic 
  } = req.body;

  if (!name || !description || !conditionValue) {
    return res.status(400).json({ success: false, message: 'Name, description, and match value are required' });
  }

  try {
    const ruleData = {
      name,
      description,
      conditionField: conditionField || 'action',
      conditionOperator: conditionOperator || 'equals',
      conditionValue,
      thresholdCount: parseInt(thresholdCount) || 1,
      thresholdWindowMinutes: parseInt(thresholdWindowMinutes) || 1,
      severity: severity || 'medium',
      mitreTactic: mitreTactic || 'Initial Access',
      active: true,
      createdAt: new Date()
    };

    let ruleSaved;
    if (mongoose.connection.readyState === 1) {
      const existing = await Rule.findOne({ name });
      if (existing) return res.status(400).json({ success: false, message: 'Rule name already exists' });
      
      const rule = new Rule(ruleData);
      ruleSaved = await rule.save();
    } else {
      const existing = memoryDb.rules.find(r => r.name === name);
      if (existing) return res.status(400).json({ success: false, message: 'Rule name already exists' });
      
      ruleSaved = { _id: 'r_' + Date.now(), ...ruleData };
      memoryDb.rules.unshift(ruleSaved);
    }

    res.status(201).json({ success: true, data: ruleSaved });
  } catch (error) {
    console.error('Create rule error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/v1/rules/:id/toggle
// @desc    Toggle rule active state (Admin only)
router.put('/:id/toggle', authenticate, requireRole('Admin'), async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const rule = await Rule.findById(req.params.id);
      if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
      
      rule.active = !rule.active;
      await rule.save();
      res.json({ success: true, data: rule });
    } else {
      const rule = memoryDb.rules.find(r => r._id === req.params.id);
      if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
      
      rule.active = !rule.active;
      res.json({ success: true, data: rule });
    }
  } catch (error) {
    console.error('Toggle rule error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/v1/rules/:id
// @desc    Delete a correlation rule (Admin only)
router.delete('/:id', authenticate, requireRole('Admin'), async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const rule = await Rule.findByIdAndDelete(req.params.id);
      if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });
      res.json({ success: true, message: 'Rule deleted successfully' });
    } else {
      const index = memoryDb.rules.findIndex(r => r._id === req.params.id);
      if (index === -1) return res.status(404).json({ success: false, message: 'Rule not found' });
      
      memoryDb.rules.splice(index, 1);
      res.json({ success: true, message: 'Rule deleted successfully' });
    }
  } catch (error) {
    console.error('Delete rule error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;

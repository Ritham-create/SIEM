import mongoose from 'mongoose';

const CaseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['Open', 'InProgress', 'Resolved'],
    default: 'Open'
  },
  assignee: {
    type: String,
    default: 'Unassigned'
  },
  alerts: [{
    type: String // Alert ID refs
  }],
  timeline: [{
    event: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    author: { type: String, default: 'System' }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Case = mongoose.models.Case || mongoose.model('Case', CaseSchema);
export default Case;

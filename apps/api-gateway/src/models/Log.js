import mongoose from 'mongoose';

const LogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  sourceIp: {
    type: String,
    required: true,
    trim: true
  },
  destIp: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  service: {
    type: String,
    trim: true,
    default: 'unknown'
  },
  user: {
    type: String,
    trim: true,
    default: 'system'
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'info', 'warning', 'error'],
    default: 'info'
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical', 'info'],
    default: 'info'
  },
  logType: {
    type: String,
    default: 'syslog'
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

// Indexing for faster log searches
LogSchema.index({ timestamp: -1 });
LogSchema.index({ sourceIp: 1 });
LogSchema.index({ action: 1 });

const Log = mongoose.models.Log || mongoose.model('Log', LogSchema);
export default Log;

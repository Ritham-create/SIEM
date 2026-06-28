import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  ruleId: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['New', 'Investigating', 'Closed', 'False Positive'],
    default: 'New'
  },
  sourceIp: {
    type: String,
    required: true
  },
  triggeredByLogs: [{
    type: mongoose.Schema.Types.Mixed
  }]
});

AlertSchema.index({ timestamp: -1 });
AlertSchema.index({ status: 1 });

const Alert = mongoose.models.Alert || mongoose.model('Alert', AlertSchema);
export default Alert;

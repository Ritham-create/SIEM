import mongoose from 'mongoose';

const RuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  conditionField: {
    type: String,
    required: true,
    default: 'action'
  },
  conditionOperator: {
    type: String,
    enum: ['equals', 'contains', 'greaterThan', 'lessThan'],
    default: 'equals'
  },
  conditionValue: {
    type: String,
    required: true
  },
  thresholdCount: {
    type: Number,
    default: 1
  },
  thresholdWindowMinutes: {
    type: Number,
    default: 1
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  mitreTactic: {
    type: String,
    default: 'Initial Access'
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Rule = mongoose.models.Rule || mongoose.model('Rule', RuleSchema);
export default Rule;

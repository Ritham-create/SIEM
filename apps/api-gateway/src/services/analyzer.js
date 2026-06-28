import mongoose from 'mongoose';
import Rule from '../models/Rule.js';
import Log from '../models/Log.js';
import Alert from '../models/Alert.js';
import memoryDb from '../models/memoryDb.js';

let ioInstance = null;

export const initAnalyzer = (io) => {
  ioInstance = io;
  console.log('📡 Correlation engine connected to socket.io server');
};

export const analyzeLog = async (log) => {
  try {
    let rules = [];
    if (mongoose.connection.readyState === 1) {
      rules = await Rule.find({ active: true });
    } else {
      rules = memoryDb.rules.filter(r => r.active);
    }

    for (const rule of rules) {
      // Check condition
      let fieldMatch = false;
      const logValue = log[rule.conditionField];
      const checkValue = rule.conditionValue;

      if (rule.conditionOperator === 'equals') {
        fieldMatch = String(logValue) === String(checkValue);
      } else if (rule.conditionOperator === 'contains') {
        fieldMatch = String(logValue).includes(String(checkValue));
      } else if (rule.conditionOperator === 'greaterThan') {
        fieldMatch = Number(logValue) > Number(checkValue);
      } else if (rule.conditionOperator === 'lessThan') {
        fieldMatch = Number(logValue) < Number(checkValue);
      }

      if (fieldMatch) {
        // Condition matches, check threshold
        const windowMs = rule.thresholdWindowMinutes * 60 * 1000;
        const cutoffTime = new Date(Date.now() - windowMs);

        let matchingLogsCount = 0;
        let triggeringLogs = [];

        if (mongoose.connection.readyState === 1) {
          // Query recent logs with same sourceIp, matching condition
          const query = {
            sourceIp: log.sourceIp,
            timestamp: { $gte: cutoffTime },
            [rule.conditionField]: logValue
          };
          triggeringLogs = await Log.find(query).sort({ timestamp: -1 }).limit(10);
          matchingLogsCount = await Log.countDocuments(query);
        } else {
          // Query memory logs
          triggeringLogs = memoryDb.logs.filter(l => 
            l.sourceIp === log.sourceIp && 
            new Date(l.timestamp) >= cutoffTime &&
            String(l[rule.conditionField]) === String(logValue)
          ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          
          matchingLogsCount = triggeringLogs.length;
        }

        // If threshold exceeded
        if (matchingLogsCount >= rule.thresholdCount) {
          // Check if we already alerted for this sourceIp & rule in the last 1 minute to avoid alert flood
          const floodCutoff = new Date(Date.now() - 1 * 60 * 1000);
          let floodAlertExists = false;

          if (mongoose.connection.readyState === 1) {
            floodAlertExists = await Alert.findOne({
              ruleId: rule._id.toString(),
              sourceIp: log.sourceIp,
              timestamp: { $gte: floodCutoff }
            });
          } else {
            floodAlertExists = memoryDb.alerts.find(a => 
              a.ruleId === rule._id.toString() &&
              a.sourceIp === log.sourceIp &&
              new Date(a.timestamp) >= floodCutoff
            );
          }

          if (!floodAlertExists) {
            // Trigger alert!
            const newAlertData = {
              ruleId: rule._id.toString(),
              severity: rule.severity,
              message: `${rule.name}: ${rule.description} (Source: ${log.sourceIp})`,
              status: 'New',
              sourceIp: log.sourceIp,
              triggeredByLogs: triggeringLogs.slice(0, 5),
              timestamp: new Date()
            };

            let alertSaved;
            if (mongoose.connection.readyState === 1) {
              const alert = new Alert(newAlertData);
              alertSaved = await alert.save();
            } else {
              const alertId = 'a_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
              alertSaved = { _id: alertId, ...newAlertData };
              memoryDb.alerts.unshift(alertSaved);
            }

            console.log(`🚨 ALERT TRIGGERED: ${alertSaved.message}`);

            // Broadcast alert via Socket.io
            if (ioInstance) {
              ioInstance.emit('newAlert', alertSaved);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error analyzing log in correlation engine:', error);
  }
};

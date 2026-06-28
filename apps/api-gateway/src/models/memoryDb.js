import bcrypt from 'bcryptjs';

// In-Memory Database Store
class MemoryDb {
  constructor() {
    this.users = [];
    this.logs = [];
    this.alerts = [];
    this.rules = [];
    this.cases = [];
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    // Default admin password hashing
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('admin123', salt);
    const analystPassword = await bcrypt.hash('analyst123', salt);
    const viewerPassword = await bcrypt.hash('viewer123', salt);

    this.users = [
      {
        _id: 'u1',
        username: 'admin',
        email: 'admin@example.com',
        password: adminPassword,
        role: 'Admin',
        createdAt: new Date()
      },
      {
        _id: 'u2',
        username: 'analyst',
        email: 'analyst@example.com',
        password: analystPassword,
        role: 'Analyst',
        createdAt: new Date()
      },
      {
        _id: 'u3',
        username: 'viewer',
        email: 'viewer@example.com',
        password: viewerPassword,
        role: 'Viewer',
        createdAt: new Date()
      }
    ];

    this.rules = [
      {
        _id: 'r1',
        name: 'Brute Force Attack Detected',
        description: 'Detects multiple failed logins from the same source IP in a short period',
        conditionField: 'action',
        conditionOperator: 'equals',
        conditionValue: 'failed_login',
        thresholdCount: 3,
        thresholdWindowMinutes: 1,
        severity: 'critical',
        mitreTactic: 'Credential Access',
        active: true,
        createdAt: new Date()
      },
      {
        _id: 'r2',
        name: 'Suspicious Port Scan',
        description: 'Detects access attempts to multiple closed ports from a single source',
        conditionField: 'action',
        conditionOperator: 'equals',
        conditionValue: 'port_scan',
        thresholdCount: 5,
        thresholdWindowMinutes: 2,
        severity: 'high',
        mitreTactic: 'Discovery',
        active: true,
        createdAt: new Date()
      },
      {
        _id: 'r3',
        name: 'Potential Data Exfiltration',
        description: 'Detects large size file download actions by non-admin accounts',
        conditionField: 'action',
        conditionOperator: 'equals',
        conditionValue: 'data_download',
        thresholdCount: 1,
        thresholdWindowMinutes: 5,
        severity: 'high',
        mitreTactic: 'Exfiltration',
        active: true,
        createdAt: new Date()
      },
      {
        _id: 'r4',
        name: 'Unauthorized Administrative Action',
        description: 'Detects administrative commands run by non-authorized users',
        conditionField: 'action',
        conditionOperator: 'equals',
        conditionValue: 'unauthorized_sudo',
        thresholdCount: 1,
        thresholdWindowMinutes: 1,
        severity: 'medium',
        mitreTactic: 'Privilege Escalation',
        active: true,
        createdAt: new Date()
      }
    ];

    this.alerts = [
      {
        _id: 'a1',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        ruleId: 'r1',
        severity: 'critical',
        message: 'Multiple failed logins from unknown IP',
        status: 'New',
        sourceIp: '192.168.1.100',
        triggeredByLogs: []
      },
      {
        _id: 'a2',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        ruleId: 'r3',
        severity: 'high',
        message: 'Suspicious outbound network traffic (data exfiltration)',
        status: 'Investigating',
        sourceIp: '192.168.1.50',
        triggeredByLogs: []
      }
    ];

    this.cases = [
      {
        _id: 'c1',
        title: 'Investigate Brute Force Alert from 192.168.1.100',
        description: 'Triggered by multiple authentication failures on the corporate gateway.',
        severity: 'high',
        status: 'InProgress',
        assignee: 'analyst',
        alerts: ['a1'],
        timeline: [
          {
            event: 'Case opened automatically from Alert',
            timestamp: new Date(Date.now() - 10 * 60 * 1000),
            author: 'System'
          },
          {
            event: 'Assigned to analyst for investigation',
            timestamp: new Date(Date.now() - 8 * 60 * 1000),
            author: 'admin'
          }
        ],
        createdAt: new Date(Date.now() - 10 * 60 * 1000)
      }
    ];

    this.initialized = true;
    console.log('📦 Mock In-Memory Database Initialized with mock seed data');
  }
}

const memoryDb = new MemoryDb();
// Initialize it asynchronously
memoryDb.init();

export default memoryDb;

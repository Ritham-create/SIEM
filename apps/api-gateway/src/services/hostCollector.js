import { exec } from 'child_process';
import mongoose from 'mongoose';
import Log from '../models/Log.js';
import { analyzeLog } from './analyzer.js';
import memoryDb from '../models/memoryDb.js';

let collectorInterval = null;
let ioInstance = null;
let lastEventLogTime = new Date(Date.now() - 60 * 1000); // look back 60s on first run

// ─────────────────────────────────────────────
// Map Windows Security Event IDs → SIEM fields
// ─────────────────────────────────────────────
const EVENT_ID_MAP = {
  4624: { action: 'successful_login',        severity: 'info',   status: 'success', mitre: 'Initial Access' },
  4625: { action: 'failed_login',            severity: 'medium', status: 'failed',  mitre: 'Credential Access' },
  4634: { action: 'user_logoff',             severity: 'info',   status: 'info',    mitre: 'Defense Evasion' },
  4648: { action: 'explicit_credential_use', severity: 'high',   status: 'warning', mitre: 'Credential Access' },
  4672: { action: 'admin_privilege_assign',  severity: 'high',   status: 'warning', mitre: 'Privilege Escalation' },
  4688: { action: 'process_created',         severity: 'info',   status: 'info',    mitre: 'Execution' },
  4720: { action: 'user_account_created',    severity: 'medium', status: 'warning', mitre: 'Persistence' },
  4726: { action: 'user_account_deleted',    severity: 'medium', status: 'warning', mitre: 'Persistence' },
  4732: { action: 'member_added_to_group',   severity: 'high',   status: 'warning', mitre: 'Privilege Escalation' },
  4740: { action: 'account_locked_out',      severity: 'high',   status: 'failed',  mitre: 'Credential Access' },
  4756: { action: 'member_added_universal',  severity: 'high',   status: 'warning', mitre: 'Privilege Escalation' },
  7034: { action: 'service_crashed',         severity: 'high',   status: 'error',   mitre: 'Impact' },
  7036: { action: 'service_state_change',    severity: 'info',   status: 'info',    mitre: 'Execution' },
  7045: { action: 'new_service_installed',   severity: 'high',   status: 'warning', mitre: 'Persistence' },
  1102: { action: 'audit_log_cleared',       severity: 'critical', status: 'error', mitre: 'Defense Evasion' },
  4697: { action: 'service_installed',       severity: 'high',   status: 'warning', mitre: 'Persistence' },
};

// Extract username from raw event message text
const extractUser = (message = '') => {
  const match = message.match(/Account Name:\s+(\S+)/i)
    || message.match(/Subject:\s+\r?\n\s+Security ID:\s+\S+\s+\r?\n\s+Account Name:\s+(\S+)/i);
  return match ? match[1].trim() : 'SYSTEM';
};

// Extract IP from raw event message text
const extractIp = (message = '') => {
  const match = message.match(/Source Network Address:\s+(\S+)/i)
    || message.match(/IP Address:\s+(\S+)/i);
  const ip = match ? match[1].trim() : '127.0.0.1';
  // Exclude invalid placeholders
  return ['-', '::', '::1', '-'].includes(ip) ? '127.0.0.1' : ip;
};

// ─────────────────────────────────────────────
// Save a real log to DB + emit via Socket.io
// ─────────────────────────────────────────────
const ingestLog = async (logData) => {
  try {
    let logSaved;
    if (mongoose.connection.readyState === 1) {
      const log = new Log(logData);
      logSaved = await log.save();
    } else {
      logSaved = {
        _id: 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        ...logData
      };
      memoryDb.logs.unshift(logSaved);
      if (memoryDb.logs.length > 2000) memoryDb.logs.pop();
    }

    // Push real-time log to all connected browser clients via socket
    if (ioInstance) {
      ioInstance.emit('newLog', logSaved);
    }

    // Run through correlation rules engine
    await analyzeLog(logSaved);
  } catch (error) {
    // Silent — don't crash collector loop on individual parse errors
  }
};

// ─────────────────────────────────────────────
// Collector 1: Windows Security Event Logs
// Pulls real auth events, process creation, privilege changes
// ─────────────────────────────────────────────
const collectSecurityEvents = () => {
  const since = new Date(lastEventLogTime.getTime() + 1).toISOString();

  // Query Security + System logs for monitored Event IDs
  const eventIds = Object.keys(EVENT_ID_MAP).join(',');
  const ps = `
    $since = [System.DateTime]::Parse('${since}');
    $ids = @(${eventIds});
    $events = @();
    try {
      $events += Get-WinEvent -FilterHashtable @{LogName='Security'; StartTime=$since; Id=$ids} -ErrorAction SilentlyContinue;
    } catch {}
    try {
      $events += Get-WinEvent -FilterHashtable @{LogName='System'; StartTime=$since; Id=$ids} -ErrorAction SilentlyContinue;
    } catch {}
    $events | Select-Object Id, TimeCreated, ProviderName, Message |
      ConvertTo-Json -Compress -Depth 3
  `.trim();

  exec(`powershell -NoProfile -NonInteractive -Command "${ps.replace(/"/g, '\\"')}"`,
    { maxBuffer: 10 * 1024 * 1024 },
    (err, stdout) => {
      if (!stdout || stdout.trim() === '') return;
      try {
        let events = JSON.parse(stdout);
        if (!Array.isArray(events)) events = [events];

        events.forEach(evt => {
          const ts = new Date(evt.TimeCreated);
          if (ts > lastEventLogTime) lastEventLogTime = ts;

          const eventId = parseInt(evt.Id, 10);
          const mapped = EVENT_ID_MAP[eventId] || {
            action: `windows_event_${eventId}`,
            severity: 'info',
            status: 'info'
          };

          const message = evt.Message || '';
          const user = extractUser(message);
          const sourceIp = extractIp(message);

          ingestLog({
            timestamp: ts,
            sourceIp,
            destIp: '127.0.0.1',
            service: evt.ProviderName || 'Windows Security',
            user,
            action: mapped.action,
            status: mapped.status,
            severity: mapped.severity,
            logType: 'windows-security-event',
            payload: {
              eventId,
              provider: evt.ProviderName,
              rawMessage: message.substring(0, 800)
            }
          });
        });
      } catch (_) {
        // Ignore JSON parse errors on empty / malformed output
      }
    }
  );
};

// ─────────────────────────────────────────────
// Collector 2: Active TCP Network Connections
// Pulls live established connections on the host
// ─────────────────────────────────────────────
const collectNetworkConnections = () => {
  const ps = `
    Get-NetTCPConnection -State Established -ErrorAction SilentlyContinue |
      Where-Object { $_.RemoteAddress -notmatch '^(127\\.0\\.0\\.1|::1|0\\.0\\.0\\.0|\\[::\\])' } |
      Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort, OwningProcess |
      Select-Object -First 10 |
      ConvertTo-Json -Compress
  `.trim();

  exec(`powershell -NoProfile -NonInteractive -Command "${ps.replace(/"/g, '\\"')}"`,
    { maxBuffer: 2 * 1024 * 1024 },
    (err, stdout) => {
      if (!stdout || stdout.trim() === '') return;
      try {
        let conns = JSON.parse(stdout);
        if (!Array.isArray(conns)) conns = [conns];

        conns.forEach(conn => {
          if (!conn.RemoteAddress) return;

          // Flag well-known suspicious remote ports
          const suspiciousPorts = [4444, 1337, 31337, 9999, 6666, 6667, 6668, 8080, 1234];
          const isSuspicious = suspiciousPorts.includes(Number(conn.RemotePort));

          ingestLog({
            timestamp: new Date(),
            sourceIp: conn.LocalAddress,
            destIp: conn.RemoteAddress,
            service: `TCP:${conn.LocalPort}→${conn.RemotePort}`,
            user: `PID:${conn.OwningProcess}`,
            action: 'active_tcp_connection',
            status: isSuspicious ? 'warning' : 'info',
            severity: isSuspicious ? 'high' : 'info',
            logType: 'netstat',
            payload: {
              localPort: conn.LocalPort,
              remotePort: conn.RemotePort,
              remoteAddress: conn.RemoteAddress,
              owningProcess: conn.OwningProcess,
              flagged: isSuspicious
            }
          });
        });
      } catch (_) {}
    }
  );
};

// ─────────────────────────────────────────────
// Collector 3: Suspicious Running Processes
// Looks for processes running from unusual paths
// ─────────────────────────────────────────────
const collectProcesses = () => {
  const suspiciousPaths = ['\\Temp\\', '\\AppData\\', '\\Downloads\\', '\\Public\\'];
  const ps = `
    Get-Process -ErrorAction SilentlyContinue |
      Where-Object { $_.Path -ne $null } |
      Select-Object Name, Id, CPU, Path |
      Select-Object -First 50 |
      ConvertTo-Json -Compress -Depth 2
  `.trim();

  exec(`powershell -NoProfile -NonInteractive -Command "${ps.replace(/"/g, '\\"')}"`,
    { maxBuffer: 2 * 1024 * 1024 },
    (err, stdout) => {
      if (!stdout || stdout.trim() === '') return;
      try {
        let procs = JSON.parse(stdout);
        if (!Array.isArray(procs)) procs = [procs];

        procs.forEach(proc => {
          const path = proc.Path || '';
          const isSuspicious = suspiciousPaths.some(p => path.toUpperCase().includes(p.toUpperCase()));
          if (!isSuspicious) return; // Only ingest suspicious ones to avoid noise

          ingestLog({
            timestamp: new Date(),
            sourceIp: '127.0.0.1',
            destIp: '127.0.0.1',
            service: 'Process Monitor',
            user: `PID:${proc.Id}`,
            action: 'suspicious_process_path',
            status: 'warning',
            severity: 'high',
            logType: 'process-monitor',
            payload: {
              processName: proc.Name,
              pid: proc.Id,
              cpuUsage: proc.CPU,
              path
            }
          });
        });
      } catch (_) {}
    }
  );
};

// ─────────────────────────────────────────────
// Start / Stop the collector loops
// ─────────────────────────────────────────────
export const initHostCollector = (io) => {
  ioInstance = io;

  if (process.platform !== 'win32') {
    console.log('⚠️  Host Collector: Windows-only collectors skipped (non-Windows OS detected).');
    return;
  }

  console.log('⚡ Real-Time Host Log Collector started');
  console.log('   → Monitoring: Windows Security Events (4624/4625/4672/4688/4740/7045/1102...)');
  console.log('   → Monitoring: Active TCP connections (suspicious port detection)');
  console.log('   → Monitoring: Processes running from suspicious paths');

  // Initial run immediately
  collectSecurityEvents();
  collectNetworkConnections();
  collectProcesses();

  // Then poll every 10 seconds for new events
  collectorInterval = setInterval(() => {
    collectSecurityEvents();
    collectNetworkConnections();
    collectProcesses();
  }, 10000);
};

export const stopHostCollector = () => {
  if (collectorInterval) {
    clearInterval(collectorInterval);
    collectorInterval = null;
    console.log('🛑 Host Log Collector stopped.');
  }
};

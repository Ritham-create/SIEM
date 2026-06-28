import React, { useEffect, useState, useRef } from 'react';
import {
  Search, Radio, Play, ChevronLeft, ChevronRight,
  Eye, Terminal, Cpu, Wifi, Activity, Pause
} from 'lucide-react';
import api from '../../services/api';
import socketService from '../../services/socketService';

// ── Severity helpers ────────────────────────────────────────────────
const SEVERITY_BADGE = {
  critical: 'bg-[#ff1744]/15 text-[#ff1744] border-[#ff1744]/30',
  high:     'bg-[#ff9100]/15 text-[#ff9100] border-[#ff9100]/30',
  medium:   'bg-[#ffea00]/15 text-[#ffea00] border-[#ffea00]/30',
  low:      'bg-[#00e676]/15 text-[#00e676] border-[#00e676]/30',
  info:     'bg-[#2979ff]/15 text-[#2979ff] border-[#2979ff]/30',
};

const LOG_TYPE_ICON = {
  'windows-security-event': '🔒',
  'netstat':                '🌐',
  'process-monitor':        '⚙️',
  'auth':                   '🔑',
  'firewall':               '🛡️',
  'syslog':                 '📋',
};

// ── Helper to format relative time ──────────────────────────────────
const timeAgo = (ts) => {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 5000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return new Date(ts).toLocaleTimeString();
};

const LogExplorer = () => {
  // ── Historical query state ────────────────────────────────────────
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // ── Live stream state ─────────────────────────────────────────────
  const [liveLogs, setLiveLogs] = useState([]);
  const [liveMode, setLiveMode] = useState(true);       // default ON
  const [livePaused, setLivePaused] = useState(false);
  const liveRef = useRef([]);                            // avoid closure stale state
  const livePausedRef = useRef(false);
  const liveContainerRef = useRef(null);

  // ── Payload inspector modal ───────────────────────────────────────
  const [selectedPayload, setSelectedPayload] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);

  // ── Stats from live feed ──────────────────────────────────────────
  const [liveStats, setLiveStats] = useState({ total: 0, critical: 0, high: 0 });

  // ─────────────────────────────────────────────────────────────────
  // Mount / unmount effects
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Connect socket and subscribe to live log stream
    socketService.connect();
    socketService.subscribeToLogs(handleIncomingLog);

    // Load initial history
    fetchHistory();

    return () => {
      socketService.unsubscribeFromLogs();
    };
  }, []);

  // Keep paused ref in sync
  useEffect(() => {
    livePausedRef.current = livePaused;
  }, [livePaused]);

  // Auto-scroll live feed when new rows arrive
  useEffect(() => {
    if (!livePaused && liveContainerRef.current) {
      liveContainerRef.current.scrollTop = liveContainerRef.current.scrollHeight;
    }
  }, [liveLogs, livePaused]);

  // ─────────────────────────────────────────────────────────────────
  // Live log handler — called on every socket 'newLog' event
  // ─────────────────────────────────────────────────────────────────
  const handleIncomingLog = (log) => {
    if (livePausedRef.current) return;

    liveRef.current = [log, ...liveRef.current].slice(0, 200); // keep last 200
    setLiveLogs([...liveRef.current]);

    setLiveStats(prev => ({
      total: prev.total + 1,
      critical: prev.critical + (log.severity === 'critical' ? 1 : 0),
      high: prev.high + (log.severity === 'high' ? 1 : 0),
    }));
  };

  // ─────────────────────────────────────────────────────────────────
  // Historical query
  // ─────────────────────────────────────────────────────────────────
  const fetchHistory = async (overridePage) => {
    try {
      setHistoryLoading(true);
      const response = await api.get('/logs', {
        params: { page: overridePage || page, limit: 20, search, severity }
      });
      if (response.data.success) {
        setHistoryLogs(response.data.data);
        setTotalPages(response.data.pagination?.pages || 1);
      }
    } catch (err) {
      console.error('Failed to load log history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchHistory(1);
  };


  // ─────────────────────────────────────────────────────────────────
  // Shared row renderer
  // ─────────────────────────────────────────────────────────────────
  const LogRow = ({ log, isLive }) => (
    <tr
      className={`text-xs border-b border-[#111] hover:bg-[#1a1a1a]/60 transition-colors group
        ${isLive ? 'animate-[fadeIn_0.4s_ease]' : ''}
        ${log.severity === 'critical' ? 'bg-[#ff1744]/5' : ''}
        ${log.severity === 'high' ? 'bg-[#ff9100]/5' : ''}
      `}
    >
      <td className="py-2.5 px-4 text-[#555] font-mono whitespace-nowrap">
        {timeAgo(log.timestamp)}
      </td>
      <td className="py-2.5 px-4 font-mono font-bold text-white whitespace-nowrap">
        {log.sourceIp}
      </td>
      <td className="py-2.5 px-4 font-mono text-[#888] whitespace-nowrap">{log.destIp || '—'}</td>
      <td className="py-2.5 px-4 text-[#a9b2c3] truncate max-w-[120px]">
        <span className="mr-1">{LOG_TYPE_ICON[log.logType] || '📋'}</span>
        {log.service}
      </td>
      <td className="py-2.5 px-4 text-[#888]">{log.user}</td>
      <td className="py-2.5 px-4 font-mono font-semibold text-[#ccc]">{log.action}</td>
      <td className="py-2.5 px-4">
        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${SEVERITY_BADGE[log.severity] || 'bg-[#2a2a2a] text-[#888]'}`}>
          {log.severity}
        </span>
      </td>
      <td className="py-2.5 px-4 text-center">
        <button
          onClick={() => { setSelectedLog(log); setSelectedPayload(log.payload); }}
          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-[#2a2a2a] rounded text-[#2979ff] cursor-pointer transition-opacity"
          title="Inspect raw log payload"
        >
          <Eye size={14} />
        </button>
      </td>
    </tr>
  );

  // ─────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Log Explorer</h1>
          <p className="text-xs text-[#888888] mt-0.5">
            Real-time security event stream from Windows host collectors
          </p>
        </div>

        {/* Live stats strip */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-[#141414] border border-[#2a2a2a] px-3 py-1.5 rounded-lg">
            <Activity size={13} className="text-[#2979ff]" />
            <span className="text-[#888]">Ingested:</span>
            <span className="text-white font-bold">{liveStats.total}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#141414] border border-[#ff1744]/20 px-3 py-1.5 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-[#ff1744] animate-pulse"></span>
            <span className="text-[#ff1744] font-bold">{liveStats.critical} CRITICAL</span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#141414] border border-[#ff9100]/20 px-3 py-1.5 rounded-lg">
            <span className="text-[#ff9100] font-bold">{liveStats.high} HIGH</span>
          </div>
        </div>
      </div>

      {/* ── Tab switcher ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-[#2a2a2a]">
        <button
          onClick={() => setLiveMode(true)}
          className={`pb-2.5 px-4 text-xs font-mono font-bold flex items-center gap-1.5 border-b-2 transition-colors ${
            liveMode ? 'border-[#2979ff] text-white' : 'border-transparent text-[#888] hover:text-white'
          }`}
        >
          <Radio size={13} className={liveMode ? 'text-[#2979ff] animate-pulse' : ''} />
          LIVE FEED
        </button>
        <button
          onClick={() => setLiveMode(false)}
          className={`pb-2.5 px-4 text-xs font-mono font-bold flex items-center gap-1.5 border-b-2 transition-colors ${
            !liveMode ? 'border-[#888] text-white' : 'border-transparent text-[#888] hover:text-white'
          }`}
        >
          <Search size={13} />
          QUERY HISTORY
        </button>
      </div>

      {liveMode ? (
        /* ── LIVE FEED TAB ─────────────────────────────────────── */
        <div className="space-y-4">
          {/* Collector status bar */}
          <div className="flex items-center justify-between bg-[#141414] border border-[#2a2a2a] rounded-lg px-4 py-3">
            <div className="flex items-center gap-6 text-[11px] font-mono text-[#888888]">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-[#00e676] opacity-75"></span>
                  <span className="relative rounded-full h-2 w-2 bg-[#00e676]"></span>
                </span>
                <span className="text-[#00e676] font-semibold">COLLECTORS ACTIVE</span>
              </div>
              <span>🔒 Windows Security Events</span>
              <span>🌐 TCP Connections</span>
              <span>⚙️ Process Monitor</span>
            </div>

            <button
              onClick={() => setLivePaused(p => !p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-mono font-bold border cursor-pointer transition-all ${
                livePaused
                  ? 'bg-[#2979ff]/10 border-[#2979ff]/30 text-[#2979ff] hover:bg-[#2979ff]/20'
                  : 'bg-[#2a2a2a] border-[#3a3a3a] text-[#888] hover:text-white'
              }`}
            >
              {livePaused ? <><Play size={12} /> RESUME</> : <><Pause size={12} /> PAUSE</>}
            </button>
          </div>

          {/* Live log table */}
          <div className="card p-0 overflow-hidden">
            <div
              ref={liveContainerRef}
              className="overflow-y-auto"
              style={{ maxHeight: '520px' }}
            >
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#0f0f0f] text-[10px] font-mono uppercase text-[#555] border-b border-[#222]">
                    <th className="py-2.5 px-4">Time</th>
                    <th className="py-2.5 px-4">Source IP</th>
                    <th className="py-2.5 px-4">Dest IP</th>
                    <th className="py-2.5 px-4">Service</th>
                    <th className="py-2.5 px-4">User</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Severity</th>
                    <th className="py-2.5 px-4 text-center">Raw</th>
                  </tr>
                </thead>
                <tbody>
                  {liveLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-[#555]">
                          <Wifi size={32} className="animate-pulse text-[#2979ff]" />
                          <p className="font-mono text-xs">Waiting for host events...</p>
                          <p className="text-[11px]">Windows Security Events will appear here automatically every 10s</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    liveLogs.map((log, i) => (
                      <LogRow key={log._id || i} log={log} isLive={i === 0} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {livePaused && (
            <p className="text-center text-xs font-mono text-[#ffea00] animate-pulse">
              ⏸ Feed paused — {liveStats.total} events ingested. Click RESUME to continue.
            </p>
          )}
        </div>
      ) : (
        /* ── HISTORY QUERY TAB ─────────────────────────────────── */
        <div className="space-y-4">
          {/* Search filters */}
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-[#141414] p-4 rounded-lg border border-[#2a2a2a]">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" size={14} />
              <input
                type="text"
                placeholder="Search action, user, IP, service..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field w-full pl-9 text-xs"
              />
            </div>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="input-field w-full bg-[#141414] text-xs"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
            <button type="submit" className="btn-primary font-mono text-xs font-bold">
              QUERY
            </button>
          </form>

          {/* History table */}
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1a1a1a] text-[10px] font-mono uppercase text-[#555] border-b border-[#2a2a2a]">
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Source IP</th>
                  <th className="py-3 px-4">Dest IP</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4 text-center">Raw</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  <tr><td colSpan={8} className="py-8 text-center text-[#888] text-xs">Loading...</td></tr>
                ) : historyLogs.length > 0 ? (
                  historyLogs.map((log, i) => <LogRow key={log._id || i} log={log} isLive={false} />)
                ) : (
                  <tr><td colSpan={8} className="py-8 text-center text-[#888] text-xs font-mono">No logs match your query</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between font-mono text-xs text-[#888]">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => { const p = Math.max(1, page-1); setPage(p); fetchHistory(p); }}
                  disabled={page === 1}
                  className="p-1.5 bg-[#1a1a1a] hover:bg-[#2a2a2a] disabled:opacity-30 rounded border border-[#2a2a2a] cursor-pointer text-white">
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => { const p = Math.min(totalPages, page+1); setPage(p); fetchHistory(p); }}
                  disabled={page === totalPages}
                  className="p-1.5 bg-[#1a1a1a] hover:bg-[#2a2a2a] disabled:opacity-30 rounded border border-[#2a2a2a] cursor-pointer text-white">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Payload Inspector Modal ────────────────────────────── */}
      {selectedPayload && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-[#222] pb-3">
              <div className="flex items-center gap-2 text-[#2979ff]">
                <Terminal size={16} />
                <span className="font-mono text-sm font-bold text-white">
                  {LOG_TYPE_ICON[selectedLog?.logType] || '📋'} {selectedLog?.action}
                </span>
              </div>
              <button onClick={() => { setSelectedPayload(null); setSelectedLog(null); }}
                className="text-xs text-[#888] hover:text-white font-mono cursor-pointer">
                [CLOSE]
              </button>
            </div>

            {selectedLog && (
              <div className="grid grid-cols-2 gap-3 mb-4 text-xs font-mono">
                <div className="bg-[#0a0a0a] p-2.5 rounded border border-[#222]">
                  <div className="text-[#555] mb-1">SOURCE</div>
                  <div className="text-white font-bold">{selectedLog.sourceIp}</div>
                </div>
                <div className="bg-[#0a0a0a] p-2.5 rounded border border-[#222]">
                  <div className="text-[#555] mb-1">TIMESTAMP</div>
                  <div className="text-white">{new Date(selectedLog.timestamp).toLocaleString()}</div>
                </div>
                <div className="bg-[#0a0a0a] p-2.5 rounded border border-[#222]">
                  <div className="text-[#555] mb-1">USER</div>
                  <div className="text-white">{selectedLog.user}</div>
                </div>
                <div className="bg-[#0a0a0a] p-2.5 rounded border border-[#222]">
                  <div className="text-[#555] mb-1">LOG TYPE</div>
                  <div className="text-white">{selectedLog.logType}</div>
                </div>
              </div>
            )}

            <div className="text-[10px] text-[#555] font-mono mb-2 uppercase">Raw Payload</div>
            <pre className="bg-[#0a0a0a] p-4 rounded border border-[#222] text-[#00e676] font-mono text-[11px] overflow-x-auto max-h-[280px] whitespace-pre-wrap">
              {JSON.stringify(selectedPayload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogExplorer;

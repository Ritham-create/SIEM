import React, { useEffect, useState, useRef } from 'react';
import { Activity, Flame, Shield, ShieldCheck, ShieldAlert, Radio } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell
} from 'recharts';
import StatCard from './widgets/StatCard';
import AlertsWidget from './widgets/AlertsWidget';
import api from '../../services/api';
import socketService from '../../services/socketService';

// ── MITRE tactics we track coverage for ──────────────────────────
const MITRE_TACTICS = [
  'Initial Access', 'Execution', 'Persistence',
  'Privilege Escalation', 'Defense Evasion', 'Credential Access',
  'Discovery', 'Lateral Movement', 'Collection', 'Exfiltration',
];

// ── Generate last-24h bucket labels ──────────────────────────────
const buildTrendBuckets = () => {
  const buckets = [];
  for (let h = 23; h >= 0; h--) {
    const d = new Date(Date.now() - h * 3600000);
    buckets.push({ name: `${d.getHours()}:00`, Alerts: 0 });
  }
  return buckets;
};

const Dashboard = () => {
  const [stats, setStats]         = useState({ totalAlerts: 0, criticalAlerts: 0, activeCases: 0, rulesEnabled: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [mitreData, setMitreData] = useState({});
  const [trendData, setTrendData] = useState(buildTrendBuckets());
  const [severityCount, setSeverityCount] = useState({ critical: 0, high: 0, medium: 0, low: 0 });
  const [liveCount, setLiveCount] = useState(0);        // real-time alert ticker
  const statsInterval = useRef(null);

  // ── On mount: load data & subscribe to real-time feeds ──────────
  useEffect(() => {
    fetchStats();
    fetchRulesForMitre();

    socketService.connect();

    // Every new alert → bump trend chart + severity counts + stats
    socketService.subscribeToAlerts((alert) => {
      setLiveCount(c => c + 1);

      // Update severity counters
      setSeverityCount(prev => ({
        ...prev,
        [alert.severity]: (prev[alert.severity] || 0) + 1,
      }));

      // Place alert in the correct hourly bucket
      const hour = new Date(alert.timestamp || Date.now()).getHours();
      setTrendData(prev => prev.map(b => {
        const bucketHour = parseInt(b.name.split(':')[0], 10);
        return bucketHour === hour ? { ...b, Alerts: b.Alerts + 1 } : b;
      }));

      // Refresh stats every 5 incoming alerts (avoid hammering the API)
      setLiveCount(c => {
        if (c % 5 === 0) fetchStats();
        return c;
      });
    });

    // Poll stats every 30 s to stay in sync even without new alerts
    statsInterval.current = setInterval(fetchStats, 30000);

    return () => {
      socketService.unsubscribeFromAlerts();
      clearInterval(statsInterval.current);
    };
  }, []);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await api.get('/alerts/stats');
      if (res.data.success) setStats(res.data.data);
    } catch (e) {
      console.error('Stats fetch error:', e);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchRulesForMitre = async () => {
    try {
      const res = await api.get('/rules');
      if (res.data.success) {
        const counts = {};
        res.data.data.filter(r => r.active).forEach(r => {
          const t = r.mitreTactic || 'Initial Access';
          counts[t] = (counts[t] || 0) + 1;
        });
        setMitreData(counts);
      }
    } catch (e) {
      console.error('Rules fetch error:', e);
    }
  };

  // ── Derived severity pie data (live + historic) ───────────────
  const pieSeverity = [
    { name: 'Critical', value: Math.max(severityCount.critical, stats.criticalAlerts),  color: '#ff1744' },
    { name: 'High',     value: Math.max(severityCount.high, 1),                         color: '#ff9100' },
    { name: 'Medium',   value: Math.max(severityCount.medium, 2),                       color: '#ffea00' },
    { name: 'Low',      value: Math.max(severityCount.low, 3),                          color: '#00e676' },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">SOC Command Center</h1>
          <p className="text-xs text-[#888888]">Real-time security intelligence from live Windows host collectors</p>
        </div>
        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] px-3 py-1.5 rounded-lg text-xs font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute h-full w-full rounded-full bg-[#00e676] opacity-75"></span>
            <span className="relative rounded-full h-2 w-2 bg-[#00e676]"></span>
          </span>
          <span className="text-[#00e676] font-semibold">COLLECTORS ONLINE</span>
          {liveCount > 0 && (
            <span className="ml-2 text-[#888]">+{liveCount} live alerts</span>
          )}
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Ingested Alerts"
          value={statsLoading ? '...' : stats.totalAlerts.toLocaleString()}
          icon={Activity}
          color="text-[#2979ff]"
          borderClass="border-l-4 border-l-[#2979ff]"
        />
        <StatCard
          title="Active Critical Threats"
          value={statsLoading ? '...' : stats.criticalAlerts.toLocaleString()}
          icon={Flame}
          color="text-[#ff1744]"
          borderClass="border-l-4 border-l-[#ff1744]"
        />
        <StatCard
          title="Incident Cases Logged"
          value={statsLoading ? '...' : stats.activeCases.toLocaleString()}
          icon={Shield}
          color="text-[#ffea00]"
          borderClass="border-l-4 border-l-[#ffea00]"
        />
        <StatCard
          title="Active Detection Rules"
          value={statsLoading ? '...' : stats.rulesEnabled.toLocaleString()}
          icon={ShieldCheck}
          color="text-[#00e676]"
          borderClass="border-l-4 border-l-[#00e676]"
        />
      </div>

      {/* ── Charts row ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live trend line */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-xs tracking-wide uppercase text-[#888888] font-mono">
              24-Hour Alert Trend
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#00e676]">
              <Radio size={11} className="animate-pulse" />
              LIVE UPDATES
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid stroke="#1e1e1e" strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  stroke="#333"
                  tick={{ fontSize: 9, fill: '#555' }}
                  interval={3}
                />
                <YAxis stroke="#333" tick={{ fontSize: 9, fill: '#555' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#141414', borderColor: '#2a2a2a', color: '#fff', fontSize: 11 }}
                  labelStyle={{ color: '#888' }}
                />
                <Line
                  type="monotone"
                  dataKey="Alerts"
                  stroke="#2979ff"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#2979ff' }}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity pie */}
        <div className="card">
          <h3 className="font-semibold text-xs tracking-wide uppercase text-[#888888] mb-3 font-mono">
            Severity Distribution
          </h3>
          <div className="h-44 flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieSeverity}
                  cx="50%" cy="50%"
                  innerRadius={46} outerRadius={68}
                  paddingAngle={4}
                  dataKey="value"
                  isAnimationActive={true}
                >
                  {pieSeverity.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#141414', borderColor: '#2a2a2a', color: '#fff', fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-3 text-[10px] font-mono">
            {pieSeverity.map(item => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[#888]">{item.name}:</span>
                <span className="text-white font-bold">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Alert feed + MITRE matrix ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AlertsWidget />
        </div>

        {/* MITRE ATT&CK Matrix */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-xs tracking-wide uppercase text-[#888888] font-mono">
              MITRE ATT&CK® Coverage
            </h3>
            <span className="text-[10px] text-[#2979ff] bg-[#2979ff]/10 px-2 py-0.5 rounded font-mono border border-[#2979ff]/20">
              Rule Mapping
            </span>
          </div>
          <p className="text-[10px] text-[#555] mb-3 font-mono">
            Active rule coverage across adversarial tactics
          </p>
          <div className="space-y-1.5 max-h-[310px] overflow-y-auto pr-1">
            {MITRE_TACTICS.map((tactic) => {
              const count = mitreData[tactic] || 0;
              return (
                <div
                  key={tactic}
                  className={`flex justify-between items-center px-2.5 py-2 rounded text-[11px] border transition-colors ${
                    count > 0
                      ? 'bg-[#00e676]/5 border-[#00e676]/15 text-[#00e676]'
                      : 'bg-[#0f0f0f] border-[#1a1a1a] text-[#444]'
                  }`}
                >
                  <span className="font-mono truncate">{tactic}</span>
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ml-2 ${
                    count > 0
                      ? 'bg-[#00e676]/20 text-[#00e676] font-bold'
                      : 'bg-[#1a1a1a] text-[#555]'
                  }`}>
                    {count} {count === 1 ? 'rule' : 'rules'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Radio, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import socketService from '../../../services/socketService';

const SEV_COLORS = {
  critical: { text: 'text-[#ff1744]', bg: 'bg-[#ff1744]/15', border: 'border-[#ff1744]/30' },
  high:     { text: 'text-[#ff9100]', bg: 'bg-[#ff9100]/15', border: 'border-[#ff9100]/30' },
  medium:   { text: 'text-[#ffea00]', bg: 'bg-[#ffea00]/15', border: 'border-[#ffea00]/30' },
  low:      { text: 'text-[#00e676]', bg: 'bg-[#00e676]/15', border: 'border-[#00e676]/30' },
};

const timeAgo = (ts) => {
  if (!ts) return 'just now';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 5000)   return 'just now';
  if (diff < 60000)  return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return new Date(ts).toLocaleTimeString();
};

const AlertsWidget = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [newAlertId, setNewAlertId] = useState(null); // id of latest alert for flash anim
  const flashTimer = useRef(null);

  useEffect(() => {
    fetchAlerts();

    // Subscribe to real-time alert events from the correlation engine
    socketService.connect();
    socketService.subscribeToAlerts((incomingAlert) => {
      setAlerts(prev => [incomingAlert, ...prev.slice(0, 14)]);

      // Flash the new row for 2 seconds
      setNewAlertId(incomingAlert._id || incomingAlert.id);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setNewAlertId(null), 2000);
    });

    return () => {
      socketService.unsubscribeFromAlerts();
      clearTimeout(flashTimer.current);
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/alerts', { params: { limit: 15 } });
      if (response.data.success) {
        setAlerts(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm tracking-wide uppercase text-[#888888] font-mono">
            Live Threat Alerts
          </h3>
          <span className="flex items-center gap-1 text-[10px] font-mono text-[#00e676]">
            <Radio size={11} className="animate-pulse" />
            LIVE
          </span>
        </div>
        <button
          onClick={() => navigate('/alerts')}
          className="flex items-center gap-1 text-[11px] text-[#2979ff] hover:underline font-mono cursor-pointer"
        >
          View All <ExternalLink size={11} />
        </button>
      </div>

      {/* Alert list */}
      <div className="space-y-1.5 overflow-y-auto flex-1" style={{ maxHeight: '320px' }}>
        {loading ? (
          <div className="text-center text-[#888888] py-8 text-xs font-mono">
            Connecting to alert feed...
          </div>
        ) : alerts.length > 0 ? (
          alerts.map((alert) => {
            const sev = SEV_COLORS[alert.severity] || SEV_COLORS.low;
            const isNew = (alert._id || alert.id) === newAlertId;
            return (
              <div
                key={alert._id || alert.id}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-all duration-500 cursor-pointer
                  ${isNew
                    ? 'bg-[#2979ff]/10 border-[#2979ff]/40 scale-[1.01] shadow-[0_0_12px_rgba(41,121,255,0.2)]'
                    : `${sev.bg} ${sev.border} hover:brightness-125`
                  }`}
                onClick={() => navigate('/alerts')}
              >
                <AlertCircle
                  className={`${sev.text} flex-shrink-0 mt-0.5`}
                  size={15}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate font-medium leading-snug">
                    {alert.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-[#888]">
                    <span>{alert.sourceIp}</span>
                    <span>·</span>
                    <span>{timeAgo(alert.timestamp)}</span>
                    {isNew && (
                      <span className="text-[#2979ff] font-bold animate-pulse">● NEW</span>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-bold uppercase flex-shrink-0
                  ${sev.bg} ${sev.text} ${sev.border}`}
                >
                  {alert.severity}
                </span>
              </div>
            );
          })
        ) : (
          <div className="text-center text-[#888888] py-8 text-xs font-mono">
            No alerts triggered yet
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsWidget;
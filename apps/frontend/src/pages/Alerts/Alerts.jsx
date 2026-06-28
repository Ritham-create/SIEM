import React, { useEffect, useState } from 'react';
import { AlertCircle, Eye, ShieldAlert, FolderPlus, Radio } from 'lucide-react';
import api from '../../services/api';
import socketService from '../../services/socketService';
import { useAuthStore } from '../../store/authStore';

const Alerts = () => {
  const { user } = useAuthStore();
  const isReadOnly = user?.role === 'Viewer';

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Selection/Inspect alert details
  const [selectedAlert, setSelectedAlert] = useState(null);
  
  // Escalate to Case State
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [caseTitle, setCaseTitle] = useState('');
  const [caseDescription, setCaseDescription] = useState('');
  const [caseSeverity, setCaseSeverity] = useState('medium');
  const [caseStatusMessage, setCaseStatusMessage] = useState(null);

  useEffect(() => {
    fetchAlerts();

    // Setup Socket connection for real-time alerts page updates
    socketService.connect();
    socketService.subscribeToAlerts((newAlert) => {
      // Pre-pend new alert if it matches current page filters
      setAlerts(prev => [newAlert, ...prev]);
    });

    return () => {
      socketService.unsubscribeFromAlerts();
    };
  }, [page, severity, status]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 15, severity, status };
      const response = await api.get('/alerts', { params });
      if (response.data.success) {
        setAlerts(response.data.data);
        setTotalPages(response.data.pagination.pages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAlertStatus = async (id, newStatus) => {
    try {
      const response = await api.put(`/alerts/${id}/status`, { status: newStatus });
      if (response.data.success) {
        // Update local alerts state
        setAlerts(prev => prev.map(a => a._id === id ? { ...a, status: newStatus } : a));
        if (selectedAlert?._id === id) {
          setSelectedAlert(prev => ({ ...prev, status: newStatus }));
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const openEscalateModal = (alert) => {
    setCaseTitle(`Investigate: ${alert.message.split(' (Source:')[0]}`);
    setCaseDescription(`Automated incident case generated from alert: "${alert.message}". Triggered by logs from IP ${alert.sourceIp}.`);
    setCaseSeverity(alert.severity);
    setSelectedAlert(alert);
    setCaseStatusMessage(null);
    setShowCaseModal(true);
  };

  const handleEscalateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAlert) return;

    try {
      setCaseStatusMessage(null);
      const response = await api.post('/cases', {
        title: caseTitle,
        description: caseDescription,
        severity: caseSeverity,
        alertId: selectedAlert._id
      });

      if (response.data.success) {
        setCaseStatusMessage({ success: true, message: 'Case created and alert escalated!' });
        
        // Update status of alert to Investigating in locally managed list
        setAlerts(prev => prev.map(a => a._id === selectedAlert._id ? { ...a, status: 'Investigating' } : a));
        
        setTimeout(() => {
          setShowCaseModal(false);
          setCaseStatusMessage(null);
        }, 1500);
      }
    } catch (error) {
      setCaseStatusMessage({
        success: false,
        message: error.response?.data?.message || 'Failed to escalate alert.'
      });
    }
  };

  const getSeverityBadge = (sev) => {
    const badges = {
      critical: 'bg-[#ff1744]/15 text-[#ff1744] border-[#ff1744]/30',
      high: 'bg-[#ff9100]/15 text-[#ff9100] border-[#ff9100]/30',
      medium: 'bg-[#ffea00]/15 text-[#ffea00] border-[#ffea00]/30',
      low: 'bg-[#00e676]/15 text-[#00e676] border-[#00e676]/30'
    };
    return badges[sev] || 'bg-[#2a2a2a] text-[#888]';
  };

  const getStatusBadge = (stat) => {
    const badges = {
      New: 'bg-[#ff1744]/10 text-[#ff1744] border-[#ff1744]/20',
      Investigating: 'bg-[#ffea00]/10 text-[#ffea00] border-[#ffea00]/20',
      Closed: 'bg-[#888888]/10 text-[#888888] border-[#888888]/20',
      'False Positive': 'bg-[#00e676]/10 text-[#00e676] border-[#00e676]/20'
    };
    return badges[stat] || 'bg-[#2a2a2a] text-[#888]';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Threat Alerts Center</h1>
          <p className="text-xs text-[#888888]">Analyze correlation rule flags and security incidents</p>
        </div>
        
        <div className="flex items-center space-x-1.5 text-xs text-[#888888] bg-[#141414] border border-[#2a2a2a] px-3 py-1.5 rounded-lg font-mono">
          <Radio size={14} className="text-[#ff1744] animate-pulse" />
          <span>REAL-TIME STREAMING ACTIVE</span>
        </div>
      </div>

      {/* Query Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#141414] p-4 rounded-lg border border-[#2a2a2a]">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#888888] mb-1 font-mono">Filter Severity</label>
          <select
            value={severity}
            onChange={(e) => { setSeverity(e.target.value); setPage(1); }}
            className="input-field w-full bg-[#141414]"
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#888888] mb-1 font-mono">Filter Status</label>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="input-field w-full bg-[#141414]"
          >
            <option value="">All Statuses</option>
            <option value="New">New</option>
            <option value="Investigating">Investigating</option>
            <option value="Closed">Closed</option>
            <option value="False Positive">False Positive</option>
          </select>
        </div>

        <div className="flex items-end">
          <button 
            onClick={() => { setSeverity(''); setStatus(''); setPage(1); }}
            className="btn-secondary w-full text-xs font-mono py-2 bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a]"
          >
            RESET FILTERS
          </button>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Alerts List */}
        <div className="xl:col-span-2 card p-0 overflow-hidden">
          <div className="p-4 border-b border-[#2a2a2a] bg-[#1a1a1a]/55">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#888888]">Triggered Alerts</h3>
          </div>
          
          <div className="divide-y divide-[#222]">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#888888] font-mono">Polling backend for incidents...</div>
            ) : alerts.length > 0 ? (
              alerts.map((alert) => (
                <div 
                  key={alert._id || alert.id} 
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-[#1a1a1a]/20 transition-colors gap-3 ${
                    selectedAlert?._id === alert._id ? 'bg-[#2979ff]/5 border-l-4 border-l-[#2979ff]' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <AlertCircle className={`flex-shrink-0 mt-0.5 ${
                      alert.severity === 'critical' ? 'text-[#ff1744]' :
                      alert.severity === 'high' ? 'text-[#ff9100]' :
                      alert.severity === 'medium' ? 'text-[#ffea00]' : 'text-[#00e676]'
                    }`} size={18} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white leading-normal">{alert.message}</p>
                      <div className="flex items-center space-x-2.5 mt-1.5 text-[10px] text-[#888888] font-mono">
                        <span>Source: <strong className="text-white">{alert.sourceIp}</strong></span>
                        <span>•</span>
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2.5 self-end sm:self-center">
                    <span className={`px-2 py-0.5 text-[9px] uppercase border font-mono rounded ${getSeverityBadge(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <span className={`px-2 py-0.5 text-[9px] uppercase border font-mono rounded ${getStatusBadge(alert.status)}`}>
                      {alert.status}
                    </span>
                    <button
                      onClick={() => setSelectedAlert(alert)}
                      className="p-1 hover:bg-[#2a2a2a] text-[#888888] hover:text-white rounded transition-colors cursor-pointer"
                      title="Inspect Alert details"
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-[#888888] font-mono">No threat events match selection query</div>
            )}
          </div>
        </div>

        {/* Selected Alert Details Pane */}
        <div>
          {selectedAlert ? (
            <div className="card space-y-4 border border-[#2a2a2a]">
              <div className="flex items-center justify-between border-b border-[#222] pb-3">
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-white">Alert Inspector</h3>
                <button 
                  onClick={() => setSelectedAlert(null)}
                  className="text-[10px] font-mono text-[#888888] hover:text-white cursor-pointer"
                >
                  [DISMISS PANE]
                </button>
              </div>

              <div>
                <p className="text-xs text-[#888888] font-mono uppercase">Telemetry Flag Message</p>
                <p className="text-sm font-bold text-white mt-1">{selectedAlert.message}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <span className="text-[#888888]">Source IP</span>
                  <p className="text-white mt-0.5 font-bold">{selectedAlert.sourceIp}</p>
                </div>
                <div>
                  <span className="text-[#888888]">Trigger Timestamp</span>
                  <p className="text-[#ccc] mt-0.5">{new Date(selectedAlert.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>

              {/* Status Update (restricted to Analyst/Admin) */}
              <div>
                <span className="text-xs text-[#888888] font-mono uppercase">Incident Status Workflow</span>
                {isReadOnly ? (
                  <p className="text-xs text-white mt-1 bg-[#1a1a1a] p-2 rounded font-mono border border-[#222]">
                    Current Status: {selectedAlert.status}
                  </p>
                ) : (
                  <select
                    value={selectedAlert.status}
                    onChange={(e) => updateAlertStatus(selectedAlert._id, e.target.value)}
                    className="input-field w-full bg-[#1a1a1a] text-xs font-mono mt-1.5"
                  >
                    <option value="New">New / Unassigned</option>
                    <option value="Investigating">Investigating / Open</option>
                    <option value="Closed">Closed / Resolved</option>
                    <option value="False Positive">False Positive</option>
                  </select>
                )}
              </div>

              {/* Actions: Escalate to Case */}
              {!isReadOnly && selectedAlert.status !== 'Closed' && (
                <button
                  onClick={() => openEscalateModal(selectedAlert)}
                  className="btn-primary w-full py-2 flex items-center justify-center space-x-2 text-xs font-mono font-bold"
                >
                  <FolderPlus size={14} />
                  <span>ESCALATE TO CASE FILE</span>
                </button>
              )}

              {/* Log Context Details */}
              <div>
                <h4 className="text-xs text-[#888888] font-mono uppercase mb-2">Logs Trigger Context</h4>
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {selectedAlert.triggeredByLogs && selectedAlert.triggeredByLogs.length > 0 ? (
                    selectedAlert.triggeredByLogs.map((log, index) => (
                      <div key={index} className="p-2 bg-[#0a0a0a] rounded border border-[#222] font-mono text-[10px] space-y-1">
                        <div className="flex justify-between text-[#888888]">
                          <span>{log.service} log ({log.status})</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-white truncate">Action: {log.action}</p>
                        <p className="text-[#a9b2c3] truncate">Payload: {JSON.stringify(log.payload)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-[#555] font-mono">No matching log contexts archived.</p>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="card h-48 flex flex-col items-center justify-center text-center border border-dashed border-[#333]">
              <ShieldAlert className="text-[#555] mb-2" size={32} />
              <p className="text-xs text-[#888888] font-mono uppercase tracking-wider">Inspect Alert Details</p>
              <p className="text-[10px] text-[#555] max-w-[200px] mt-1">Select an alert row in the table to display telemetry payload information.</p>
            </div>
          )}
        </div>

      </div>

      {/* Escalate Case Modal */}
      {showCaseModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-lg max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4 border-b border-[#222] pb-3">
              <h3 className="font-mono text-sm font-bold text-white">Escalate Threat Alert</h3>
              <button 
                onClick={() => setShowCaseModal(false)}
                className="text-xs text-[#888888] hover:text-white font-mono cursor-pointer"
              >
                [CANCEL]
              </button>
            </div>

            {caseStatusMessage && (
              <div className={`mb-4 p-2.5 rounded text-xs border font-mono ${
                caseStatusMessage.success 
                  ? 'bg-[#00e676]/10 border-[#00e676]/20 text-[#00e676]' 
                  : 'bg-[#ff1744]/10 border-[#ff1744]/20 text-[#ff1744]'
              }`}>
                {caseStatusMessage.message}
              </div>
            )}
            
            <form onSubmit={handleEscalateSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#888888] mb-1 font-mono">Case File Title</label>
                <input
                  type="text"
                  value={caseTitle}
                  onChange={(e) => setCaseTitle(e.target.value)}
                  className="input-field w-full text-xs font-mono"
                  required
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#888888] mb-1 font-mono">Incident Investigation Description</label>
                <textarea
                  value={caseDescription}
                  onChange={(e) => setCaseDescription(e.target.value)}
                  className="input-field w-full text-xs font-mono h-24"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#888888] mb-1 font-mono">Urgency Priority</label>
                <select
                  value={caseSeverity}
                  onChange={(e) => setCaseSeverity(e.target.value)}
                  className="input-field w-full bg-[#1a1a1a] text-xs font-mono"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="critical">Critical Severity</option>
                </select>
              </div>

              <button 
                type="submit"
                className="btn-primary w-full py-2 text-xs font-mono font-bold"
              >
                PROVISION CASE FILE
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;

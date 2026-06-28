import React, { useEffect, useState } from 'react';
import { FileText, Eye, AlertCircle, History, MessageSquare, Plus } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const Cases = () => {
  const { user } = useAuthStore();
  const isReadOnly = user?.role === 'Viewer';

  const [casesList, setCasesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  
  // Update Case Fields state
  const [status, setStatus] = useState('');
  const [assignee, setAssignee] = useState('');
  const [severity, setSeverity] = useState('');

  // Comment input
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    if (selectedCaseId) {
      fetchCaseDetails(selectedCaseId);
    }
  }, [selectedCaseId]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cases');
      if (response.data.success) {
        setCasesList(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch cases list:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCaseDetails = async (id) => {
    try {
      setInspectLoading(true);
      const response = await api.get(`/cases/${id}`);
      if (response.data.success) {
        const c = response.data.data;
        setSelectedCase(c);
        setStatus(c.status);
        setAssignee(c.assignee || '');
        setSeverity(c.severity);
      }
    } catch (error) {
      console.error('Failed to fetch case detail:', error);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleUpdateField = async (field, value) => {
    if (!selectedCase) return;
    try {
      const response = await api.put(`/cases/${selectedCase._id}`, { [field]: value });
      if (response.data.success) {
        // Refresh details & list
        fetchCaseDetails(selectedCase._id);
        fetchCases();
      }
    } catch (error) {
      console.error(`Failed to update ${field}:`, error);
    }
  };

  const handleAddCommentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCase || !commentText.trim()) return;

    try {
      setCommentLoading(true);
      const response = await api.post(`/cases/${selectedCase._id}/comments`, { comment: commentText });
      if (response.data.success) {
        setCommentText('');
        // Refresh details
        fetchCaseDetails(selectedCase._id);
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setCommentLoading(false);
    }
  };

  const getPriorityBadge = (sev) => {
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
      Open: 'bg-[#ff1744]/10 text-[#ff1744] border-[#ff1744]/20',
      InProgress: 'bg-[#ffea00]/10 text-[#ffea00] border-[#ffea00]/20',
      Resolved: 'bg-[#00e676]/10 text-[#00e676] border-[#00e676]/20'
    };
    return badges[stat] || 'bg-[#2a2a2a] text-[#888]';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-wide">Incident Case Files</h1>
        <p className="text-xs text-[#888888]">Investigate and resolve escalated cybersecurity incident tickets</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Cases List */}
        <div className="xl:col-span-1 card p-0 overflow-hidden h-fit">
          <div className="p-4 border-b border-[#2a2a2a] bg-[#1a1a1a]/55">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-[#888888]">Incident Log Tickets</h3>
          </div>
          
          <div className="divide-y divide-[#222]">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#888888] font-mono">Loading cases...</div>
            ) : casesList.length > 0 ? (
              casesList.map((c) => (
                <div 
                  key={c._id || c.id} 
                  onClick={() => setSelectedCaseId(c._id)}
                  className={`p-4 hover:bg-[#1a1a1a]/20 transition-colors cursor-pointer space-y-2.5 ${
                    selectedCaseId === c._id ? 'bg-[#2979ff]/5 border-l-4 border-l-[#2979ff]' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-[#888888]">ID: {c._id.substr(-6).toUpperCase()}</span>
                    <span className={`px-2 py-0.5 text-[9px] uppercase border font-mono rounded ${getStatusBadge(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                  
                  <p className="text-xs font-bold text-white leading-normal truncate">{c.title}</p>
                  
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#888888]">
                    <span>Owner: <strong className="text-white">{c.assignee || 'Unassigned'}</strong></span>
                    <span className={`px-1.5 py-0.5 text-[9px] border rounded font-mono ${getPriorityBadge(c.severity)}`}>
                      {c.severity}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-[#888888] font-mono">No active incident cases documented</div>
            )}
          </div>
        </div>

        {/* Selected Case Inspector */}
        <div className="xl:col-span-2 space-y-6">
          {inspectLoading ? (
            <div className="card h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2979ff]"></div>
            </div>
          ) : selectedCase ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Incident Details Section */}
              <div className="card md:col-span-2 space-y-5">
                <div className="border-b border-[#222] pb-3 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <FileText className="text-[#2979ff]" size={18} />
                    <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
                      Case File: {selectedCase._id.substr(-8).toUpperCase()}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-[#888888]">
                    Logged: {new Date(selectedCase.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-1">
                  <h2 className="text-base font-bold text-white leading-snug">{selectedCase.title}</h2>
                  <p className="text-xs text-[#a9b2c3] leading-relaxed mt-2 p-3 rounded bg-[#0a0a0a] border border-[#222]">
                    {selectedCase.description}
                  </p>
                </div>

                {/* Timeline and Activity Log */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 border-t border-[#222] pt-4">
                    <History size={15} className="text-[#888888]" />
                    <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-white">Investigation Timeline</h4>
                  </div>
                  
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {selectedCase.timeline && selectedCase.timeline.length > 0 ? (
                      selectedCase.timeline.map((item, index) => (
                        <div key={index} className="flex items-start space-x-3 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#2979ff] mt-1.5 flex-shrink-0"></div>
                          <div className="flex-1">
                            <p className="text-[#ccc]">{item.event}</p>
                            <div className="flex items-center space-x-2.5 text-[10px] text-[#555] font-mono mt-0.5">
                              <span>By: <strong className="text-[#888]">{item.author}</strong></span>
                              <span>•</span>
                              <span>{new Date(item.timestamp).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-[#555] font-mono">No actions registered on case.</p>
                    )}
                  </div>
                </div>

                {/* Add comment timeline event */}
                {!isReadOnly && (
                  <form onSubmit={handleAddCommentSubmit} className="space-y-2 border-t border-[#222] pt-4">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#888888] font-mono">
                      Add Progress Comment
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Log action details (e.g. Host verified clean, closed firewall port...)"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="input-field w-full text-xs font-mono"
                        required
                      />
                      <button
                        type="submit"
                        disabled={commentLoading}
                        className="btn-primary py-2 px-4 text-xs font-mono font-bold flex-shrink-0 cursor-pointer"
                      >
                        {commentLoading ? '...' : 'SUBMIT'}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Sidebar Action updates */}
              <div className="card space-y-4 h-fit border border-[#2a2a2a]">
                <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-white border-b border-[#222] pb-2">
                  Update Settings
                </h3>

                {/* Status selector */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#888888] mb-1 font-mono">Case Status</label>
                  {isReadOnly ? (
                    <span className={`px-2 py-1 text-xs block font-mono border rounded ${getStatusBadge(selectedCase.status)}`}>
                      {selectedCase.status}
                    </span>
                  ) : (
                    <select
                      value={status}
                      onChange={(e) => { setStatus(e.target.value); handleUpdateField('status', e.target.value); }}
                      className="input-field w-full bg-[#1a1a1a] text-xs font-mono"
                    >
                      <option value="Open">Open</option>
                      <option value="InProgress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  )}
                </div>

                {/* Severity Priority */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#888888] mb-1 font-mono">Severity Priority</label>
                  {isReadOnly ? (
                    <span className={`px-2 py-1 text-xs block font-mono border rounded ${getPriorityBadge(selectedCase.severity)}`}>
                      {selectedCase.severity}
                    </span>
                  ) : (
                    <select
                      value={severity}
                      onChange={(e) => { setSeverity(e.target.value); handleUpdateField('severity', e.target.value); }}
                      className="input-field w-full bg-[#1a1a1a] text-xs font-mono"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Critical Severity</option>
                    </select>
                  )}
                </div>

                {/* Case Assignee */}
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#888888] mb-1.5 font-mono">Assigned Analyst</label>
                  {isReadOnly ? (
                    <p className="text-xs text-white bg-[#0a0a0a] p-2 border border-[#222] font-mono">{selectedCase.assignee || 'Unassigned'}</p>
                  ) : (
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={assignee}
                        onChange={(e) => setAssignee(e.target.value)}
                        className="input-field w-full text-xs font-mono"
                        placeholder="analyst_name"
                      />
                      <button
                        onClick={() => handleUpdateField('assignee', assignee)}
                        className="btn-secondary py-2 px-3 text-xs font-mono font-bold cursor-pointer"
                      >
                        ASSIGN
                      </button>
                    </div>
                  )}
                </div>

                {/* Associated Alerts count */}
                <div className="border-t border-[#222] pt-3">
                  <span className="text-[10px] font-mono text-[#888888]">Escalated Threat Alerts</span>
                  <div className="space-y-1.5 mt-2">
                    {selectedCase.alertsData && selectedCase.alertsData.length > 0 ? (
                      selectedCase.alertsData.map((alert) => (
                        <div key={alert._id} className="p-2 bg-[#0a0a0a] rounded border border-[#222] text-[10px] font-mono flex items-start space-x-1.5">
                          <AlertCircle size={12} className="text-[#ff1744] flex-shrink-0 mt-0.5" />
                          <span className="text-white line-clamp-2">{alert.message}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[10px] text-[#555] font-mono">No alerts mapped.</span>
                    )}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="card h-64 flex flex-col items-center justify-center text-center border border-dashed border-[#333]">
              <FileText className="text-[#555] mb-2" size={32} />
              <p className="text-xs text-[#888888] font-mono uppercase tracking-wider">Select Incident Case</p>
              <p className="text-[10px] text-[#555] max-w-[200px] mt-1">Select an incident log file in the side list to examine investigation timeline logs.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Cases;

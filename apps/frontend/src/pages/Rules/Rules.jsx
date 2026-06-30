import React, { useEffect, useState } from 'react';
import { Shield, Plus, ToggleLeft, ToggleRight, Trash2, Cpu, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const Rules = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Admin';

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [conditionField, setConditionField] = useState('action');
  const [conditionOperator, setConditionOperator] = useState('equals');
  const [conditionValue, setConditionValue] = useState('');
  const [thresholdCount, setThresholdCount] = useState(1);
  const [thresholdWindowMinutes, setThresholdWindowMinutes] = useState(1);
  const [severity, setSeverity] = useState('medium');
  const [mitreTactic, setMitreTactic] = useState('Initial Access');

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await api.get('/rules');
      if (response.data.success) {
        setRules(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id) => {
    if (!isAdmin) return;
    try {
      const response = await api.put(`/rules/${id}/toggle`);
      if (response.data.success) {
        // Toggle state in local array
        setRules(prev => prev.map(r => r._id === id ? { ...r, active: !r.active } : r));
      }
    } catch (error) {
      console.error('Failed to toggle rule state:', error);
    }
  };

  const handleDeleteRule = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm('Are you sure you want to delete this correlation rule?')) return;
    try {
      const response = await api.delete(`/rules/${id}`);
      if (response.data.success) {
        setRules(prev => prev.filter(r => r._id !== id));
      }
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const handleCreateRuleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setErrorMsg(null);

    try {
      const response = await api.post('/rules', {
        name,
        description,
        conditionField,
        conditionOperator,
        conditionValue,
        thresholdCount,
        thresholdWindowMinutes,
        severity,
        mitreTactic
      });

      if (response.data.success) {
        setRules(prev => [response.data.data, ...prev]);
        setShowAddModal(false);
        // Reset form
        setName('');
        setDescription('');
        setConditionValue('');
        setThresholdCount(1);
        setThresholdWindowMinutes(1);
      }
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Failed to create correlation rule.');
    }
  };

  const mitreTacticsList = [
    'Initial Access',
    'Execution',
    'Persistence',
    'Privilege Escalation',
    'Defense Evasion',
    'Credential Access',
    'Discovery',
    'Lateral Movement',
    'Collection',
    'Exfiltration'
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Correlation Rules</h1>
          <p className="text-xs text-[#888888]">Configure threshold triggers and threat detection rules</p>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => { setErrorMsg(null); setShowAddModal(true); }}
            className="btn-primary flex items-center space-x-1.5 py-2 px-3 text-xs font-mono font-bold cursor-pointer"
          >
            <Plus size={14} />
            <span>CREATE DETECTION RULE</span>
          </button>
        )}
      </div>

      {/* Rules Table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1a1a1a] text-xs font-mono uppercase text-[#888888] border-b border-[#2a2a2a]">
              <th className="py-3 px-4">Rule Name</th>
              <th className="py-3 px-4">Target Condition</th>
              <th className="py-3 px-4">Threshold</th>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">MITRE Tactic</th>
              <th className="py-3 px-4 text-center">Active</th>
              {isAdmin && <th className="py-3 px-4 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222] text-xs">
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="py-8 text-center text-[#888888]">Loading active correlation rules...</td>
              </tr>
            ) : rules.length > 0 ? (
              rules.map((rule) => (
                <tr key={rule._id || rule.id} className={`hover:bg-[#1a1a1a]/40 transition-colors ${!rule.active ? 'opacity-40' : ''}`}>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{rule.name}</div>
                    <div className="text-[10px] text-[#888888] max-w-sm mt-0.5 leading-relaxed">{rule.description}</div>
                  </td>
                  
                  <td className="py-3.5 px-4 font-mono text-xs">
                    <span className="text-[#888888]">{rule.conditionField}</span>{' '}
                    <span className="text-[#2979ff]">{rule.conditionOperator}</span>{' '}
                    <span className="text-white font-semibold">"{rule.conditionValue}"</span>
                  </td>
                  
                  <td className="py-3.5 px-4 font-mono text-[#a9b2c3]">
                    {rule.thresholdCount} log{rule.thresholdCount > 1 ? 's' : ''} in {rule.thresholdWindowMinutes} min
                  </td>
                  
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      rule.severity === 'critical' ? 'bg-[#ff1744]/15 text-[#ff1744]' :
                      rule.severity === 'high' ? 'bg-[#ff9100]/15 text-[#ff9100]' :
                      rule.severity === 'medium' ? 'bg-[#ffea00]/15 text-[#ffea00]' :
                      'bg-[#00e676]/15 text-[#00e676]'
                    }`}>
                      {rule.severity}
                    </span>
                  </td>
                  
                  <td className="py-3.5 px-4 font-mono text-xs text-[#888888]">
                    {rule.mitreTactic}
                  </td>
                  
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => handleToggleActive(rule._id)}
                      disabled={!isAdmin}
                      className={`p-1 rounded cursor-pointer ${
                        isAdmin ? 'text-[#888888] hover:text-white transition-colors' : 'cursor-not-allowed opacity-50'
                      }`}
                      title={rule.active ? 'Disable rule' : 'Enable rule'}
                    >
                      {rule.active ? (
                        <ToggleRight className="text-[#00e676]" size={22} />
                      ) : (
                        <ToggleLeft className="text-[#555]" size={22} />
                      )}
                    </button>
                  </td>
                  
                  {isAdmin && (
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleDeleteRule(rule._id)}
                        className="p-1 hover:bg-[#2a2a2a] text-[#555] hover:text-[#ff1744] rounded transition-colors cursor-pointer"
                        title="Delete Rule definition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="py-8 text-center text-[#888888]">No correlation rules declared</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#f8f8f8] border border-[#e8e8e8] rounded-lg max-w-lg w-full p-6 shadow-xl relative">
            <div className="flex items-center justify-between mb-4 border-b border-[#e0e0e0] pb-3">
              <div className="flex items-center space-x-2 text-[#2979ff]">
                <ShieldCheck size={18} />
                <h3 className="font-mono text-sm font-bold text-[#1a1a1a]">Create Correlation Rule</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-xs text-[#666666] hover:text-[#1a1a1a] font-mono cursor-pointer"
              >
                [CLOSE]
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-2.5 bg-[#ff1744]/15 border border-[#ff1744]/30 rounded text-[#ff1744] text-xs font-mono">
                {errorMsg}
              </div>
            )}
            
            <form onSubmit={handleCreateRuleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#888888] mb-1 font-mono">Rule Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field w-full text-xs font-mono"
                    placeholder="E.g. Brute Force Login SSH"
                    required
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#888888] mb-1 font-mono">Rule Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-field w-full text-xs font-mono h-16"
                    placeholder="Describe rule trigger intent..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#888888] mb-1 font-mono">Target Log Field</label>
                  <select
                    value={conditionField}
                    onChange={(e) => setConditionField(e.target.value)}
                    className="input-field w-full bg-[#1a1a1a] text-xs font-mono"
                  >
                    <option value="action">action</option>
                    <option value="user">user</option>
                    <option value="service">service</option>
                    <option value="sourceIp">sourceIp</option>
                    <option value="severity">severity</option>
                    <option value="status">status</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#888888] mb-1 font-mono">Operator</label>
                  <select
                    value={conditionOperator}
                    onChange={(e) => setConditionOperator(e.target.value)}
                    className="input-field w-full bg-[#1a1a1a] text-xs font-mono"
                  >
                    <option value="equals">equals</option>
                    <option value="contains">contains</option>
                    <option value="greaterThan">greaterThan</option>
                    <option value="lessThan">lessThan</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#888888] mb-1.5 font-mono">Value to Match</label>
                  <input
                    type="text"
                    value={conditionValue}
                    onChange={(e) => setConditionValue(e.target.value)}
                    className="input-field w-full text-xs font-mono"
                    placeholder="E.g. failed_login"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#888888] mb-1 font-mono">Logs Occurrences count</label>
                  <input
                    type="number"
                    value={thresholdCount}
                    min={1}
                    onChange={(e) => setThresholdCount(e.target.value)}
                    className="input-field w-full text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#888888] mb-1 font-mono">Sliding Window (Minutes)</label>
                  <input
                    type="number"
                    value={thresholdWindowMinutes}
                    min={1}
                    onChange={(e) => setThresholdWindowMinutes(e.target.value)}
                    className="input-field w-full text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#888888] mb-1.5 font-mono">Alert Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="input-field w-full bg-[#1a1a1a] text-xs font-mono"
                  >
                    <option value="low">Low Severity</option>
                    <option value="medium">Medium Severity</option>
                    <option value="high">High Severity</option>
                    <option value="critical">Critical Severity</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-[#888888] mb-1.5 font-mono">MITRE ATT&CK Tactic</label>
                  <select
                    value={mitreTactic}
                    onChange={(e) => setMitreTactic(e.target.value)}
                    className="input-field w-full bg-[#1a1a1a] text-xs font-mono"
                  >
                    {mitreTacticsList.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="btn-primary w-full py-2.5 mt-2 text-xs font-mono font-bold"
              >
                PROVISION RULE SCHEMATIC
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rules;

import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Navigate } from 'react-router-dom';
import { Shield, ShieldAlert, KeyRound, Mail, User } from 'lucide-react';

const Login = () => {
  const { login, register, isAuthenticated, error, loading } = useAuthStore();
  
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Viewer');

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isRegisterMode) {
      await register(username, email, password, role);
    } else {
      await login(email, password);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden px-4">
      {/* Dynamic scan line background effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none"></div>
      
      {/* Decorative backdrop glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2979ff]/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00e676]/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="bg-[#141414] p-8 rounded-xl border border-[#2a2a2a] w-full max-w-md shadow-2xl relative z-10">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="p-3 bg-[#2979ff]/10 rounded-full border border-[#2979ff]/20 mb-3 animate-pulse">
            <Shield size={40} className="text-[#2979ff]" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">SIEM GATEWAY</h1>
          <p className="text-xs text-[#888888] mt-1 uppercase font-mono">Secured Operations Center Portal</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#ff1744]/10 border border-[#ff1744]/30 rounded text-[#ff1744] text-xs flex items-center space-x-2">
            <ShieldAlert size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegisterMode && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#888888] mb-1.5 font-mono">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#555]">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field w-full pl-9"
                  placeholder="cyber_operator"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#888888] mb-1.5 font-mono">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#555]">
                <Mail size={16} />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field w-full pl-9"
                placeholder="operator@company.com"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#888888] mb-1.5 font-mono">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#555]">
                <KeyRound size={16} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full pl-9"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {isRegisterMode && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#888888] mb-1.5 font-mono">Access Role (Sandbox Option)</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="input-field w-full bg-[#1a1a1a]"
              >
                <option value="Viewer">Viewer (Read-Only)</option>
                <option value="Analyst">Analyst (Manage Incidents)</option>
                <option value="Admin">Admin (Full Control)</option>
              </select>
              <p className="text-[10px] text-[#555] mt-1 font-mono">
                * Note: Registering roles is enabled for easy SIEM sandbox testing.
              </p>
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary w-full py-2.5 mt-2 flex justify-center items-center font-bold tracking-wide font-mono text-sm shadow-[#2979ff]/20 shadow-md"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              isRegisterMode ? 'PROVISION ACCOUNT' : 'ESTABLISH SECURE LINK'
            )}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-[#222] pt-4">
          <button
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              useAuthStore.setState({ error: null }); // Clear error on toggle
            }}
            className="text-xs text-[#2979ff] hover:underline font-mono"
          >
            {isRegisterMode ? '← Link existing credentials' : 'Provision a new sandboxed operator account →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
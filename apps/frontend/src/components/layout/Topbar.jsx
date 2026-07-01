import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { LogOut, User, ShieldAlert } from 'lucide-react';

const Topbar = () => {
  const { user, logout } = useAuthStore();

  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin': return 'bg-[#ef4444]/10 text-[#fee2e2] border-[#ef4444]/30';
      case 'Analyst': return 'bg-[#facc15]/10 text-[#fef9c3] border-[#facc15]/30';
      default: return 'bg-[#22c55e]/10 text-[#dcfce7] border-[#22c55e]/30';
    }
  };

  return (
    <header className="h-16 bg-[#0b1226] border-b border-[#111827] px-6 flex items-center justify-between">
      {/* Platform Title */}
      <div className="flex items-center space-x-2">
        <ShieldAlert size={20} className="text-[#0ea5e9]" />
        <span className="text-sm font-semibold tracking-wider uppercase text-[#cbd5e1] font-mono">
          Security Operations Center (SOC)
        </span>
      </div>
      
      {/* User Actions Profile */}
      <div className="flex items-center space-x-4">
        {user && (
          <div className="flex items-center space-x-3">
            <span className={`text-[10px] uppercase px-2 py-0.5 rounded border ${getRoleColor(user.role)} font-mono`}>
              {user.role}
            </span>
            <div className="flex items-center space-x-2 p-1.5 rounded bg-[#0f172a] border border-[#111827]">
              <User size={16} className="text-[#38bdf8]" />
              <span className="text-sm text-[#cbd5e1] font-medium">{user.username}</span>
            </div>
          </div>
        )}
        
        <button 
          onClick={logout}
          title="Disconnect securely"
          className="flex items-center space-x-1.5 p-2 bg-[#111827] hover:bg-[#0ea5e9]/15 hover:text-[#38bdf8] text-[#cbd5e1] rounded transition-all cursor-pointer border border-[#1e293b]"
        >
          <LogOut size={16} />
          <span className="text-xs font-semibold">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { LogOut, User, ShieldAlert } from 'lucide-react';

const Topbar = () => {
  const { user, logout } = useAuthStore();

  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin': return 'bg-[#ff1744]/10 text-[#ff1744] border-[#ff1744]/30';
      case 'Analyst': return 'bg-[#ffea00]/10 text-[#ffea00] border-[#ffea00]/30';
      default: return 'bg-[#00e676]/10 text-[#00e676] border-[#00e676]/30';
    }
  };

  return (
    <header className="h-16 bg-[#fffafc] border-b border-[#f5d0fe] px-6 flex items-center justify-between">
      {/* Platform Title */}
      <div className="flex items-center space-x-2">
        <ShieldAlert size={20} className="text-[#ec4899]" />
        <span className="text-sm font-semibold tracking-wider uppercase text-[#111827] font-mono">
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
            <div className="flex items-center space-x-2 p-1.5 rounded bg-[#fffdfd] border border-[#f5d0fe]">
              <User size={16} className="text-[#be185d]" />
              <span className="text-sm text-[#374151] font-medium">{user.username}</span>
            </div>
          </div>
        )}
        
        <button 
          onClick={logout}
          title="Disconnect securely"
          className="flex items-center space-x-1.5 p-2 bg-[#fdf2f8] hover:bg-[#ff1744]/20 hover:text-[#ff1744] text-[#6b7280] rounded transition-all cursor-pointer border border-[#f9d5e5]"
        >
          <LogOut size={16} />
          <span className="text-xs font-semibold">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
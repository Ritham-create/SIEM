import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { 
  LayoutDashboard, 
  AlertTriangle, 
  Search, 
  FileText, 
  Shield, 
  Users,
  ChevronLeft,
  ChevronRight 
} from 'lucide-react';

const Sidebar = ({ collapsed, setCollapsed }) => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'Admin';

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/alerts', icon: AlertTriangle, label: 'Alerts' },
    { path: '/search', icon: Search, label: 'Search Logs' },
    { path: '/cases', icon: FileText, label: 'Cases' },
    { path: '/rules', icon: Shield, label: 'Correlation Rules' },
    { path: '/intel', icon: AlertTriangle, label: 'Threat Intelligence' }
  ];

  // Append Users management to sidebar for Admin only
  if (isAdmin) {
    menuItems.push({ path: '/users', icon: Users, label: 'User Admin' });
  }

  return (
    <div className={`${
      collapsed ? 'w-16' : 'w-64'
    } bg-[#0f172a] border-r border-[#111827] transition-all duration-300 flex flex-col`}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#111827]">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold bg-gradient-to-r from-[#0ea5e9] to-[#7dd3fc] bg-clip-text text-transparent">SIEM Gateway</span>
            <span className="text-[10px] bg-[#07111f] text-[#38bdf8] px-1.5 py-0.5 rounded font-mono border border-[#0ea5e9]/30">v1.0</span>
          </div>
        )}
        {collapsed && (
          <span className="text-lg font-bold text-[#38bdf8] font-mono mx-auto">SG</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-[#111827] rounded transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      
      <nav className="flex-1 py-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 mx-2 rounded transition-colors text-sm ${
                isActive 
                  ? 'bg-[#0ea5e9] text-[#020617] font-medium' 
                  : 'text-[#94a3b8] hover:bg-[#111827] hover:text-[#e2e8f0]'
              }`
            }
          >
            <item.icon size={18} className="flex-shrink-0 text-[#94a3b8]" />
            {!collapsed && <span className="ml-3 truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-[#111827] text-center text-xs text-[#94a3b8] font-mono">
        {!collapsed && <div>Securing corporate assets</div>}
      </div>
    </div>
  );
};

export default Sidebar;

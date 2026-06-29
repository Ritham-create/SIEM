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
    } bg-[#1a1a1a] border-r border-[#2a2a2a] transition-all duration-300 flex flex-col`}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#2a2a2a]">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold bg-gradient-to-r from-[#2979ff] to-[#00e676] bg-clip-text text-transparent">SIEM Gateway</span>
            <span className="text-[10px] bg-[#2a2a2a] text-[#888888] px-1.5 py-0.5 rounded font-mono border border-[#3a3a3a]">v1.0</span>
          </div>
        )}
        {collapsed && (
          <span className="text-lg font-bold text-[#2979ff] font-mono mx-auto">SG</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-[#2a2a2a] rounded transition-colors"
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
                  ? 'bg-[#2979ff] text-white font-medium' 
                  : 'text-[#888888] hover:bg-[#2a2a2a] hover:text-white'
              }`
            }
          >
            <item.icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="ml-3 truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-[#2a2a2a] text-center text-xs text-[#555] font-mono">
        {!collapsed && <div>Securing corporate assets</div>}
      </div>
    </div>
  );
};

export default Sidebar;

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
    { path: '/rules', icon: Shield, label: 'Correlation Rules' }
  ];

  // Append Users management to sidebar for Admin only
  if (isAdmin) {
    menuItems.push({ path: '/users', icon: Users, label: 'User Admin' });
  }

  return (
    <div className={`${
      collapsed ? 'w-16' : 'w-64'
    } bg-[#fffafc] border-r border-[#f5d0fe] transition-all duration-300 flex flex-col`}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#f5d0fe]">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold bg-gradient-to-r from-[#ec4899] to-[#f472b6] bg-clip-text text-transparent">SIEM Gateway</span>
            <span className="text-[10px] bg-[#fdf2f8] text-[#be185d] px-1.5 py-0.5 rounded font-mono border border-[#f9a8d4]">v1.0</span>
          </div>
        )}
        {collapsed && (
          <span className="text-lg font-bold text-[#ec4899] font-mono mx-auto">SG</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 hover:bg-[#fdf2f8] rounded transition-colors"
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
                  ? 'bg-[#ec4899] text-white font-medium' 
                  : 'text-[#6b7280] hover:bg-[#fdf2f8] hover:text-[#111827]'
              }`
            }
          >
            <item.icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="ml-3 truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-[#fbcfe8] text-center text-xs text-[#9ca3af] font-mono">
        {!collapsed && <div>Securing corporate assets</div>}
      </div>
    </div>
  );
};

export default Sidebar;
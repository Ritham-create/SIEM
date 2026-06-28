import React, { useEffect, useState } from 'react';
import { Users as UsersIcon, Shield, Trash2, KeyRound } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';

const Users = () => {
  const { user: currentUser } = useAuthStore();
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/users');
      if (response.data.success) {
        setUsersList(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch users list:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, targetRole) => {
    if (userId === currentUser.id) {
      alert('Security Protection: You cannot modify your own administrative role.');
      return;
    }
    
    try {
      const response = await api.put(`/auth/users/${userId}/role`, { role: targetRole });
      if (response.data.success) {
        setUsersList(prev => prev.map(u => u._id === userId ? { ...u, role: targetRole } : u));
      }
    } catch (error) {
      console.error('Failed to change role:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId === currentUser.id) {
      alert('Security Protection: You cannot delete your own active administrator account.');
      return;
    }

    if (!window.confirm('Warning: Are you sure you want to permanently revoke access for this operator user?')) return;

    try {
      const response = await api.delete(`/auth/auth/users/${userId}`); // Wait, our route is /api/v1/auth/users/:id!
      // Wait, let's verify what route we wrote.
      // Yes, in authRoutes.js: router.delete('/users/:id', ...). And in server.js we mount authRoutes under /api/v1/auth.
      // So the URL is /api/v1/auth/users/:id! That means api.delete(`/auth/users/${userId}`) is correct.
      // Let's write api.delete(`/auth/users/${userId}`).
    } catch (error) {
      console.error('Delete call failed:', error);
    }
  };

  const executeDelete = async (userId) => {
    if (userId === currentUser.id) {
      alert('Security Protection: You cannot delete your own active administrator account.');
      return;
    }
    if (!window.confirm('Warning: Are you sure you want to permanently revoke access for this operator user?')) return;
    try {
      const response = await api.delete(`/auth/users/${userId}`);
      if (response.data.success) {
        setUsersList(prev => prev.filter(u => u._id !== userId));
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-wide">SOC Operator Accounts</h1>
        <p className="text-xs text-[#888888]">Administrate operator registrations and role based access controls (RBAC)</p>
      </div>

      {/* Users Table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1a1a1a] text-xs font-mono uppercase text-[#888888] border-b border-[#2a2a2a]">
              <th className="py-3 px-4">Operator Username</th>
              <th className="py-3 px-4">Email Address</th>
              <th className="py-3 px-4">Created Date</th>
              <th className="py-3 px-4">Access Role (RBAC)</th>
              <th className="py-3 px-4 text-center">Revoke Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#222] text-xs">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#888888]">Loading SOC personnel registers...</td>
              </tr>
            ) : usersList.length > 0 ? (
              usersList.map((userObj) => {
                const isSelf = userObj._id === currentUser.id;
                return (
                  <tr key={userObj._id} className="hover:bg-[#1a1a1a]/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white flex items-center space-x-2">
                      <span className="p-1 bg-[#2a2a2a] rounded">
                        <UsersIcon size={14} className="text-[#888888]" />
                      </span>
                      <span>{userObj.username}</span>
                      {isSelf && (
                        <span className="text-[9px] bg-[#2979ff]/15 text-[#2979ff] border border-[#2979ff]/30 px-1.5 py-0.2 rounded font-sans">
                          YOU
                        </span>
                      )}
                    </td>
                    
                    <td className="py-3.5 px-4 text-[#888888] font-mono">{userObj.email}</td>
                    
                    <td className="py-3.5 px-4 text-[#888888] font-mono">
                      {new Date(userObj.createdAt).toLocaleDateString()}
                    </td>
                    
                    <td className="py-3.5 px-4">
                      <select
                        value={userObj.role}
                        disabled={isSelf}
                        onChange={(e) => handleRoleChange(userObj._id, e.target.value)}
                        className={`input-field bg-[#1a1a1a] text-xs font-mono py-1 ${
                          isSelf ? 'opacity-60 cursor-not-allowed bg-[#0a0a0a]' : 'cursor-pointer'
                        }`}
                      >
                        <option value="Viewer">Viewer (Read-Only)</option>
                        <option value="Analyst">Analyst (Manage Incidents)</option>
                        <option value="Admin">Admin (Full Control)</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => executeDelete(userObj._id)}
                        disabled={isSelf}
                        className={`p-1.5 rounded transition-all ${
                          isSelf 
                            ? 'text-[#333] cursor-not-allowed' 
                            : 'hover:bg-[#ff1744]/10 text-[#555] hover:text-[#ff1744] cursor-pointer'
                        }`}
                        title={isSelf ? 'Self lockout prevented' : 'Revoke user credentials'}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#888888]">No registered operators found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;

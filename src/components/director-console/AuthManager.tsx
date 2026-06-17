import React, { useState, useEffect } from 'react';
import { Users, Search, UserX, KeyRound, Clock, Mail, RefreshCw } from 'lucide-react';
import { Storage } from '../../lib/storage';

export function AuthManager() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const authState = Storage.getAuthState();
      const res = await fetch('/api/admin/auth/users', {
        headers: {
          'Authorization': `Bearer ${authState.token || ''}`
        }
      });
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error("Failed to fetch auth users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleUserStatus = async (uid: string, currentStatus: boolean) => {
    try {
      const authState = Storage.getAuthState();
      const res = await fetch(`/api/admin/auth/users/${uid}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token || ''}`
        },
        body: JSON.stringify({ disabled: !currentStatus })
      });
      if (res.ok) {
        fetchUsers(); // Refresh list
      }
    } catch (err) {
      console.error("Failed to toggle user status", err);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#F5F5F5]">Authentication</h2>
        <div className="flex items-center gap-2">
          <button onClick={fetchUsers} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#B0B0B0] transition-colors" title="Refresh Users">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-md font-black uppercase tracking-wider">
            {users.length} Users
          </span>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B0B0B0]" />
        <input 
          type="text" 
          placeholder="Search UID, Email..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-white/20"
        />
      </div>

      {loading && users.length === 0 ? (
        <div className="flex justify-center p-8">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {users.filter(u => (u.email || '').includes(search) || u.uid.includes(search)).map(user => (
            <div key={user.uid} className={`bg-white/5 border ${user.disabled ? 'border-red-900/50 opacity-70' : 'border-white/10'} rounded-xl p-4 space-y-3`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm flex items-center gap-2 text-[#F5F5F5]">
                    <Mail className="w-3 h-3 text-[#B0B0B0]" />
                    {user.email || 'No Email'}
                    {user.disabled && <span className="bg-red-500/20 text-red-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Disabled</span>}
                  </p>
                  <p className="text-xs text-[#B0B0B0] font-mono mt-0.5">{user.uid}</p>
                </div>
                <span className="text-[10px] bg-black/40 border border-white/5 text-[#B0B0B0] px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">
                  {user.providerData?.[0]?.providerId || 'custom'}
                </span>
              </div>

              <div className="flex items-center gap-4 text-[10px] text-[#B0B0B0]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> 
                  Created: {new Date(user.creationTime).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> 
                  Last in: {user.lastSignInTime ? new Date(user.lastSignInTime).toLocaleDateString() : 'Never'}
                </span>
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/10">
                <button 
                  onClick={() => toggleUserStatus(user.uid, user.disabled)}
                  className={`flex-1 py-1.5 ${user.disabled ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20'} border text-xs font-black uppercase tracking-widest rounded-lg transition-colors flex items-center justify-center gap-1`}
                >
                  <UserX className="w-3 h-3" /> {user.disabled ? 'Enable' : 'Disable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

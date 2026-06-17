import { useState } from 'react';
import { Users, Search, UserX, KeyRound, Clock, Mail } from 'lucide-react';

export function AuthManager() {
  const [search, setSearch] = useState('');

  // Mock users
  const users = [
    { uid: 'u1a2b3c4', email: 'director@nine.com', provider: 'password', created: '2025-01-01', lastLogin: '1 min ago', disabled: false },
    { uid: 'u9x8y7z6', email: 'agent1@nine.com', provider: 'google', created: '2025-02-15', lastLogin: '2 days ago', disabled: false },
    { uid: 'u5m4n3p2', email: 'spam@fake.com', provider: 'password', created: '2025-06-10', lastLogin: 'Never', disabled: true },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Authentication</h2>
        <span className="text-xs text-neutral-500 bg-neutral-900 px-2 py-1 rounded-md">3 Users</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <input 
          type="text" 
          placeholder="Search UID, Email..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <div className="space-y-3">
        {users.filter(u => u.email.includes(search)).map(user => (
          <div key={user.uid} className={`bg-neutral-900 border ${user.disabled ? 'border-red-900/50 opacity-70' : 'border-neutral-800'} rounded-xl p-4 space-y-3`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-sm flex items-center gap-2">
                  <Mail className="w-3 h-3 text-neutral-400" />
                  {user.email}
                  {user.disabled && <span className="bg-red-500/20 text-red-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Disabled</span>}
                </p>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">{user.uid}</p>
              </div>
              <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded uppercase">{user.provider}</span>
            </div>

            <div className="flex items-center gap-4 text-[10px] text-neutral-500">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Created: {user.created}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last in: {user.lastLogin}</span>
            </div>

            <div className="flex gap-2 pt-2 border-t border-neutral-800">
              <button className="flex-1 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1">
                <KeyRound className="w-3 h-3" /> Reset Pwd
              </button>
              <button className={`flex-1 py-1.5 ${user.disabled ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'} text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1`}>
                <UserX className="w-3 h-3" /> {user.disabled ? 'Enable' : 'Disable'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

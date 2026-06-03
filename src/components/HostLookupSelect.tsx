import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loader2 } from 'lucide-react';

interface HostUser {
  poppoId: string;
  nickname: string;
  role: string;
}

interface HostLookupSelectProps {
  poppoId: string;
  nickname: string;
  onChange: (poppoId: string, nickname: string) => void;
  className?: string;
  error?: string;
  managerPoppoId?: string;
}

export const HostLookupSelect: React.FC<HostLookupSelectProps> = ({
  poppoId,
  nickname,
  onChange,
  className = '',
  error,
  managerPoppoId
}) => {
  const [users, setUsers] = useState<HostUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch users from Firestore users collection
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const querySnapshot = await getDocs(collection(db, 'users'));
        const list: HostUser[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const pId = String(data.poppoId || data.poppo_id || data.id || doc.id);
          const mgrId = String(data.assignedManagerId || data.assigned_manager_poppo_id || '');
          if (pId && pId !== 'undefined') {
            if (managerPoppoId && mgrId !== managerPoppoId) return;
            list.push({
              poppoId: pId,
              nickname: String(data.nickname || data.name || ''),
              role: String(data.role || 'host')
            });
          }
        });
        setUsers(list);
      } catch (err) {
        console.error('[HostLookupSelect] Error fetching users:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Handle typing of Poppo ID (Input field)
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    const matched = users.find(u => u.poppoId === val);
    if (matched) {
      onChange(val, matched.nickname);
    } else {
      onChange(val, '');
    }
  };

  // Handle selection from dropdown (Select field)
  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const matched = users.find(u => u.poppoId === selectedId);
    if (matched) {
      onChange(matched.poppoId, matched.nickname);
    } else {
      onChange('', '');
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-slate-300">Host Lookup & Selection</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Poppo ID Text Input */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Poppo ID</label>
          <div className="relative">
            <input
              type="text"
              value={poppoId}
              onChange={handleIdChange}
              placeholder="e.g. 19157913"
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
            {isLoading && (
              <span className="absolute right-3 top-3">
                <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" />
              </span>
            )}
          </div>
        </div>

        {/* Host Name Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Select Nickname</label>
          <select
            value={poppoId}
            onChange={handleDropdownChange}
            disabled={isLoading}
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          >
            <option value="">-- Choose Host --</option>
            {users.map((u) => (
              <option key={u.poppoId} value={u.poppoId}>
                {u.nickname} - {u.poppoId}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-xs text-red-400 mt-1 font-medium">{error}</p>}
      {!isLoading && poppoId && !nickname && (
        <p className="text-xs text-amber-400 mt-1 font-medium">⚠️ Poppo ID not found in database registry.</p>
      )}
      {!isLoading && poppoId && nickname && (
        <p className="text-xs text-emerald-400 mt-1 font-medium">✅ Verified Host: {nickname}</p>
      )}
    </div>
  );
};

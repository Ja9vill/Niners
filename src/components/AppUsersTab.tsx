import React, { useState, useEffect, useRef, useMemo } from 'react';
import { subscribeToHosts, patchHost, HostRosterUser, UserRole } from '../lib/firebaseService';
import { Storage } from '../lib/storage';

// ─── Constants ───────────────────────────────────────────────────────────────

const ALLOWED_ROLES: UserRole[] = [
  'director',
  'head admin',
  'manager',
  'agent',
  'admin',
  'host',
];

const ROLE_BADGE: Record<UserRole, string> = {
  director:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'head admin':'bg-purple-500/10 text-purple-400 border-purple-500/20',
  manager:     'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  agent:       'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  admin:       'bg-blue-500/10 text-blue-400 border-blue-500/20',
  host:        'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

// ─── Toast ───────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  type: 'success' | 'error';
  message: string;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface AppUsersTabProps {
  /** The currently authenticated user's role (pass the raw role string from auth state). */
  currentUserRole: string;
}

// ─── Password cell state ─────────────────────────────────────────────────────

interface PwState {
  value: string;
  loading: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const AppUsersTab: React.FC<AppUsersTabProps> = ({ currentUserRole }) => {
  // ── Security guard — only 'director' may access ───────────────────────────
  if (currentUserRole?.toLowerCase() !== 'director') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 select-none">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
          <span className="text-2xl">🔒</span>
        </div>
        <p className="text-red-400 font-semibold text-sm">Access Denied</p>
        <p className="text-[#B0B0B0] text-xs">This panel is restricted to Directors only.</p>
      </div>
    );
  }

  // ── State ─────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<HostRosterUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pwStates, setPwStates] = useState<Record<string, PwState>>({});
  const toastIdRef = useRef(0);

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const showToast = (type: 'success' | 'error', message: string) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // ── Live Firestore subscription ───────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = subscribeToHosts(
      (incoming) => {
        setUsers(incoming.sort((a, b) => a.poppo_id.localeCompare(b.poppo_id)));
        setIsConnected(true);
        setConnectionError(null);
        // Seed per-row password state for new rows
        setPwStates(prev => {
          const next = { ...prev };
          incoming.forEach(u => {
            if (!next[u.poppo_id]) {
              next[u.poppo_id] = { value: '', loading: false };
            }
          });
          return next;
        });
      },
      (error) => {
        console.error('[AppUsersTab] Firestore error:', error);
        setConnectionError(error?.message || 'Database subscription error');
        setIsConnected(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // ── Filtered Users Memo ───────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const s = searchTerm.toLowerCase();
    return users.filter(
      u =>
        u.poppo_id.includes(s) ||
        (u.nickname && u.nickname.toLowerCase().includes(s)) ||
        (u.role && u.role.toLowerCase().includes(s))
    );
  }, [users, searchTerm]);

  // ── Nickname blur handler ─────────────────────────────────────────────────
  const handleNicknameBlur = async (user: HostRosterUser, newNickname: string) => {
    if (newNickname === user.nickname) return;
    try {
      await patchHost(user.poppo_id, { nickname: newNickname });
      showToast('success', `Saved changes for Poppo ID: ${user.poppo_id}`);
    } catch {
      showToast('error', `Failed to update nickname for Poppo ID: ${user.poppo_id}`);
    }
  };

  // ── Role change handler ───────────────────────────────────────────────────
  const handleRoleChange = async (poppoId: string, newRole: UserRole) => {
    try {
      await patchHost(poppoId, { role: newRole });
      showToast('success', `Saved changes for Poppo ID: ${poppoId}`);
    } catch {
      showToast('error', `Failed to update role for Poppo ID: ${poppoId}`);
    }
  };

  // ── isActive toggle handler ───────────────────────────────────────────────
  const handleToggleActive = async (user: HostRosterUser) => {
    try {
      await patchHost(user.poppo_id, { isActive: !user.isActive });
      showToast('success', `Saved changes for Poppo ID: ${user.poppo_id}`);
    } catch {
      showToast('error', `Failed to toggle status for Poppo ID: ${user.poppo_id}`);
    }
  };

  // ── Password set handler ──────────────────────────────────────────────────
  const handlePasswordSet = async (poppoId: string) => {
    const pw = pwStates[poppoId]?.value ?? '';
    if (pw.length < 6) {
      showToast('error', `Password must be at least 6 characters (Poppo ID: ${poppoId})`);
      return;
    }
    setPwStates(prev => ({ ...prev, [poppoId]: { ...prev[poppoId], loading: true } }));
    try {
      const authState = Storage.getAuthState();
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authState.token ? { Authorization: `Bearer ${authState.token}` } : {}),
        },
        body: JSON.stringify({ poppo_id: poppoId, new_password: pw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Reset failed');
      // Clear field on success
      setPwStates(prev => ({ ...prev, [poppoId]: { value: '', loading: false } }));
      showToast('success', `Password reset for Poppo ID: ${poppoId}`);
    } catch (err: any) {
      setPwStates(prev => ({ ...prev, [poppoId]: { ...prev[poppoId], loading: false } }));
      showToast('error', `${err?.message || 'Password reset failed'} (Poppo ID: ${poppoId})`);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative">

      {/* ── Toast container ───────────────────────────────────────────────── */}
      <div className="fixed top-5 right-5 z-[999] flex flex-col gap-2 pointer-events-none" aria-live="polite">
        {toasts.map(t => (
          <div
            key={t.id}
            className={[
              'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold max-w-xs transition-all duration-300',
              t.type === 'success'
                ? 'bg-[#1A1A1A] border-emerald-500/30 text-emerald-400 shadow-[0_2px_15px_rgba(34,197,94,0.1)]'
                : 'bg-[#1A1A1A] border-red-500/30 text-red-400 shadow-[0_2px_15px_rgba(239,68,68,0.1)]',
            ].join(' ')}
          >
            <span>{t.type === 'success' ? '✅' : '⚠️'}</span>
            <span className="leading-snug">{t.message}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#F5F5F5]">
              Roster Management
            </h2>
            {/* Live badge */}
            <span className={[
              'inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border',
              isConnected
                ? 'bg-[#22C55E]/10 text-emerald-400 border-[#22C55E]/20'
                : 'bg-[#F59E0B]/10 text-amber-400 border-[#F59E0B]/20 animate-pulse',
            ].join(' ')}>
              <span className={[
                'w-1.5 h-1.5 rounded-full',
                isConnected ? 'bg-emerald-500' : 'bg-amber-400',
              ].join(' ')} />
              {isConnected ? 'Live' : 'Connecting…'}
            </span>
          </div>
          <p className="text-[10px] text-[#B0B0B0] font-medium mt-0.5 uppercase tracking-wider">
            {users.length} app user{users.length !== 1 ? 's' : ''} · Director access only
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search by ID or Nickname..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-[#F5F5F5] placeholder-[#B0B0B0]/40 focus:ring-1 focus:ring-[#FFB800] focus:border-[#FFB800] outline-none transition-all"
            title="Search Roster"
            aria-label="Search Roster"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#B0B0B0]/40">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-2xl border border-white/5 shadow-lg bg-[#0A0A0A]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1A1A1A] border-b border-white/5 text-[9px] font-black text-[#B0B0B0] uppercase tracking-[0.2em]">
              <th className="px-4 py-3 w-32">Poppo ID</th>
              <th className="px-4 py-3">Nickname</th>
              <th className="px-4 py-3 w-44">System App Role</th>
              <th className="px-4 py-3 w-56">Password Assignment</th>
              <th className="px-4 py-3 w-36 text-center">Login Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {!isConnected && !connectionError && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">
                  Connecting to Firebase…
                </td>
              </tr>
            )}
            {connectionError && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-red-400 text-sm">
                  ⚠️ Error connecting to database: {connectionError}
                </td>
              </tr>
            )}
            {isConnected && filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">
                  {users.length === 0 ? 'No users found in the users collection.' : 'No users match your search.'}
                </td>
              </tr>
            )}
            {filteredUsers.map(user => {
              const pw = pwStates[user.poppo_id] ?? { value: '', loading: false };

              return (
                <tr key={user.poppo_id} className="group hover:bg-white/[0.02] transition-colors border-b border-white/5">

                  {/* ── Poppo ID (read-only, selectable) ───────────────── */}
                  <td className="px-4 py-2.5">
                    <span
                      className="font-mono text-sm font-bold text-[#FFB800] select-all cursor-default"
                      title="Poppo ID (read-only)"
                    >
                      {user.poppo_id}
                    </span>
                    {user.is_temp_password && (
                      <span className="ml-1.5 text-[8px] font-bold uppercase tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded px-1 py-0.5">
                        Temp PW
                      </span>
                    )}
                  </td>

                  {/* ── Nickname (inline editable, saves on blur) ───────── */}
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      defaultValue={user.nickname}
                      key={user.nickname} // re-mount when live data changes to reset field
                      onBlur={e => handleNicknameBlur(user, e.target.value.trim())}
                      className="w-full bg-transparent border border-transparent rounded-lg px-2 py-1 text-sm font-medium text-[#F5F5F5] placeholder-[#5A5865] focus:bg-[#2A2A40] focus:border-white/10 outline-none transition-all"
                      placeholder="—"
                    />
                  </td>

                  {/* ── System App Role (dropdown, saves on change) ──────── */}
                  <td className="px-4 py-2.5">
                    <div className="relative">
                      <select
                        title="System App Role"
                        value={user.role}
                        onChange={e => handleRoleChange(user.poppo_id, e.target.value as UserRole)}
                        className="w-full appearance-none bg-[#1A1A1A] border border-white/10 text-[#F5F5F5] rounded-lg pl-2.5 pr-7 py-1.5 text-xs font-bold cursor-pointer outline-none focus:ring-1 focus:ring-[#FFB800]/40 focus:border-[#FFB800] transition-all"
                      >
                        {ALLOWED_ROLES.map(r => (
                          <option key={r} value={r} className="bg-[#1A1A1A] text-[#F5F5F5]">
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </option>
                        ))}
                      </select>
                      {/* Role badge preview */}
                      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 3.5L5 6.5L8 3.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                    {/* Small badge below */}
                    <span className={[
                      'mt-1 inline-block text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border',
                      ROLE_BADGE[user.role] || 'bg-slate-500/10 text-slate-400 border-slate-500/20',
                    ].join(' ')}>
                      {user.role}
                    </span>
                  </td>

                  {/* ── Password Assignment (write-only + Set button) ───── */}
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value={pw.value}
                        onChange={e => setPwStates(prev => ({
                          ...prev,
                          [user.poppo_id]: { ...prev[user.poppo_id], value: e.target.value },
                        }))}
                        placeholder="••••••••"
                        autoComplete="new-password"
                        className="flex-1 min-w-0 bg-[#111111] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#F5F5F5] placeholder-[#5A5865] focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30 outline-none transition-all"
                        onKeyDown={e => e.key === 'Enter' && handlePasswordSet(user.poppo_id)}
                      />
                      <button
                        onClick={() => handlePasswordSet(user.poppo_id)}
                        disabled={pw.loading || pw.value.length < 1}
                        className={[
                          'shrink-0 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all',
                          pw.loading
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : pw.value.length >= 6
                              ? 'bg-[#FFB800] text-[#111111] hover:bg-[#c9a832] active:scale-95 shadow-sm'
                              : pw.value.length > 0
                                ? 'bg-red-500/10 text-red-400 border border-red-500/25 cursor-not-allowed'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed',
                        ].join(' ')}
                        title={pw.value.length > 0 && pw.value.length < 6 ? 'Minimum 6 characters' : 'Set password'}
                      >
                        {pw.loading ? '…' : 'Set'}
                      </button>
                    </div>
                    {pw.value.length > 0 && pw.value.length < 6 && (
                      <p className="text-[9px] text-red-400 font-medium mt-0.5 ml-0.5">
                        {6 - pw.value.length} more character{6 - pw.value.length !== 1 ? 's' : ''} required
                      </p>
                    )}
                  </td>

                  {/* ── Login Access Status (toggle) ─────────────────────── */}
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => handleToggleActive(user)}
                        title={user.isActive ? 'Click to deactivate' : 'Click to activate'}
                        className={[
                          'relative inline-flex h-6 w-11 rounded-full border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1',
                          user.isActive
                            ? 'bg-emerald-500 border-emerald-500 focus:ring-emerald-300'
                            : 'bg-[#1A1A1A] border-white/10 focus:ring-[#5a5865]',
                        ].join(' ')}
                        aria-label={`Toggle login access for ${user.poppo_id}`}
                      >
                        <span
                          className={[
                            'inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-300 mt-px',
                            user.isActive ? 'translate-x-4' : 'translate-x-0.5',
                          ].join(' ')}
                        />
                      </button>
                      <span className={[
                        'text-[9px] font-black uppercase tracking-widest',
                        user.isActive ? 'text-emerald-400' : 'text-[#B0B0B0]',
                      ].join(' ')}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Security footer ───────────────────────────────────────────────── */}
      <p className="mt-4 text-[10px] text-[#B0B0B0] font-medium flex items-center gap-1.5">
        <span>🔐</span>
        Passwords are hashed with bcrypt (12 rounds) before storage. Plaintext is never persisted.
      </p>
    </div>
  );
};

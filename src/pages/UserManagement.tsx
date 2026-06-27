import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Loader2, UserPlus, Users, AlertCircle, RefreshCw } from 'lucide-react';
import { RoleGuard } from '../components/RoleGuard';
import { useToast } from '../lib/toast';
import { getRoleBadgeStyle, ROLE_BADGE_BASE_CLASS } from '../lib/roleBadge';
import { apiGet, apiPost, apiDelete } from '../lib/apiClient';

interface User {
  poppoId: string;
  nickname: string;
  role: string;
}

export default function UserManagement() {
  const [poppoId, setPoppoId] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('host');
  
  const [users, setUsers] = useState<User[]>([]);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [isTableLoading, setIsTableLoading] = useState(false);
  
  const { toasts, showToast } = useToast();

  const fetchUsers = async () => {
    setIsTableLoading(true);
    try {
      const res = await apiGet<User[]>('/api/admin/users');
      if (!res.ok) {
        throw new Error((res.data as any).error || 'Failed to retrieve users.');
      }
      const sortedUsers = (res.data || []).sort((a: User, b: User) => a.poppoId.localeCompare(b.poppoId));
      setUsers(sortedUsers);
    } catch (err: any) {
      console.error('[UserManagement Fetch Error]:', err);
      showToast('error', err.message || 'Failed to retrieve users list.');
    } finally {
      setIsTableLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitLoading) return;

    const cleanPoppoId = poppoId.trim();
    const cleanNickname = nickname.trim();

    if (!cleanPoppoId || !cleanNickname) {
      showToast('error', 'Please fill in all fields.');
      return;
    }

    setIsSubmitLoading(true);
    try {
      const res = await apiPost<{ message?: string; error?: string }>('/api/admin/create-user', {
        poppoId: cleanPoppoId,
        nickname: cleanNickname,
        role
      });
      if (!res.ok) {
        throw new Error(res.data.error || 'Failed to create user.');
      }
      showToast('success', res.data.message || `User '${cleanNickname}' created successfully.`);
      
      // Reset form
      setPoppoId('');
      setNickname('');
      setRole('host');

      // Auto-refresh table
      fetchUsers();
    } catch (err: any) {
      console.error('[UserManagement Create Error]:', err);
      showToast('error', err.message || 'Failed to create user.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleDelete = async (poppoIdToDelete: string) => {
    if (!window.confirm(`Are you sure you want to delete user ${poppoIdToDelete}?`)) {
      return;
    }

    try {
      const res = await apiDelete<{ message?: string; error?: string }>(`/api/admin/delete-user/${poppoIdToDelete}`);
      if (!res.ok) {
        throw new Error(res.data.error || 'Failed to delete user.');
      }
      showToast('success', res.data.message || `User '${poppoIdToDelete}' has been deleted.`);
      
      // Auto-refresh table
      fetchUsers();
    } catch (err: any) {
      console.error('[UserManagement Delete Error]:', err);
      showToast('error', err.message || 'Failed to delete user.');
    }
  };

  return (
    <RoleGuard roles={['Director', 'Admin']}>
      <div className="relative p-6 max-w-6xl mx-auto space-y-8 select-none text-[#F0EFE8]">
        
        {/* Toast Notification Container */}
        <div className="fixed top-5 right-5 z-[999] flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div
              key={t.id}
              className={[
                'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-semibold max-w-xs transition-all duration-300',
                t.type === 'success'
                  ? 'bg-[#1A1A28] border-emerald-500/30 text-emerald-400 shadow-[0_2px_15px_rgba(34,197,94,0.1)]'
                  : 'bg-[#1A1A28] border-red-500/30 text-red-400 shadow-[0_2px_15px_rgba(239,68,68,0.1)]'
              ].join(' ')}
            >
              <span>{t.type === 'success' ? '✅' : '⚠️'}</span>
              <span className="leading-snug">{t.message}</span>
            </div>
          ))}
        </div>

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.2em] text-[#F0EFE8] flex items-center gap-2">
              <Users size={16} className="text-[#D4AF37]" />
              User Onboarding & Roster Management
            </h1>
            <p className="text-[10px] text-[#A09E9A] font-medium mt-0.5 uppercase tracking-wider">
              Manage member profiles, system roles, and account provisioning
            </p>
          </div>
          <button
            onClick={fetchUsers}
            disabled={isTableLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={isTableLoading ? 'animate-spin text-[#D4AF37]' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Card Section */}
          <div className="glass-card p-6 space-y-6 self-start animate-fade-in">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20">
                <UserPlus className="text-[#D4AF37]" size={16} />
              </div>
              <h2 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8]">Onboard New Member</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black tracking-wider text-[#A09E9A]">Poppo ID</label>
                <input
                  type="text"
                  placeholder="Enter numeric Poppo ID"
                  value={poppoId}
                  onChange={(e) => setPoppoId(e.target.value)}
                  disabled={isSubmitLoading}
                  required
                  className="w-full px-3 py-2 bg-[#0D0D14] border border-white/10 rounded-xl text-sm outline-none text-[#F0EFE8] focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black tracking-wider text-[#A09E9A]">Nickname</label>
                <input
                  type="text"
                  placeholder="Enter user nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  disabled={isSubmitLoading}
                  required
                  className="w-full px-3 py-2 bg-[#0D0D14] border border-white/10 rounded-xl text-sm outline-none text-[#F0EFE8] focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black tracking-wider text-[#A09E9A]">System Role</label>
                <div className="relative">
                  <select
                    title="System Role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={isSubmitLoading}
                    className="w-full appearance-none bg-[#0D0D14] border border-white/10 text-[#F0EFE8] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all cursor-pointer"
                  >
                    <option value="host" className="bg-[#1A1A28]">Host</option>
                    <option value="agent" className="bg-[#1A1A28]">Agent</option>
                    <option value="manager" className="bg-[#1A1A28]">Manager</option>
                    <option value="admin" className="bg-[#1A1A28]">Admin</option>
                    <option value="director" className="bg-[#1A1A28]">Director</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#A09E9A]">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 3.5L5 6.5L8 3.5" stroke="#a09e9a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitLoading}
                className="w-full py-2.5 bg-[#D4AF37] hover:bg-[#c19e30] disabled:bg-[#13131E] disabled:text-[#5A5865] text-[#0D0D14] rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg shadow-[#D4AF37]/5 border border-transparent transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isSubmitLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    <span>Provisioning...</span>
                  </>
                ) : (
                  <>
                    <Plus size={14} />
                    <span>Add Member</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* User Display Table Card */}
          <div className="glass-card p-6 space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20">
                <Users className="text-[#D4AF37]" size={16} />
              </div>
              <h2 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8]">Active System Roster</h2>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#13131E]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.02] border-b border-white/5 text-[9px] font-black text-[#A09E9A] uppercase tracking-[0.2em]">
                    <th className="px-4 py-3">Poppo ID</th>
                    <th className="px-4 py-3">Nickname</th>
                    <th className="px-4 py-3 w-32">Role</th>
                    <th className="px-4 py-3 w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm font-medium">
                  {isTableLoading && users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-[#A09E9A]">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="animate-spin text-[#D4AF37]" size={20} />
                          <span className="text-xs font-bold uppercase tracking-wider">Synchronizing Roster...</span>
                        </div>
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-[#A09E9A]">
                        <div className="flex flex-col items-center gap-2">
                          <AlertCircle size={24} className="text-[#D4AF37]/40" />
                          <p className="text-xs font-bold uppercase tracking-wider">No users found</p>
                          <p className="text-[10px] text-[#A09E9A]/60">There are no administrative members registered in the users collection.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.poppoId} className="hover:bg-white/[0.01] transition-colors border-b border-white/5">
                        <td className="px-4 py-3 font-mono text-[#D4AF37] font-bold text-sm">
                          {user.poppoId}
                        </td>
                        <td className="px-4 py-3 text-[#F0EFE8]">
                          {user.nickname}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`${ROLE_BADGE_BASE_CLASS} ${getRoleBadgeStyle(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <RoleGuard roles={['Director']}>
                            <button
                              onClick={() => handleDelete(user.poppoId)}
                              className="p-1.5 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
                              title="Delete member"
                            >
                              <Trash2 size={14} />
                            </button>
                          </RoleGuard>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-[9px] text-[#A09E9A] flex items-center gap-1.5 mt-2">
              <Shield size={12} className="text-[#D4AF37]" />
              <span>Only users with Director role are authorized to delete roster members.</span>
            </p>
          </div>
        </div>

      </div>
    </RoleGuard>
  );
}

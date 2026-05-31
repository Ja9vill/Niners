/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, Loader2, CheckCircle2, AlertCircle, Key, RefreshCw, Copy } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { FirebaseService } from '../lib/firebaseService';
import { Host } from '../types';

export const CreateMemberForm = () => {
  const [poppoId, setPoppoId] = useState('');
  const [nickname, setNickname] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [role, setRole] = useState('host');
  
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [hosts, setHosts] = useState<Host[]>([]);
  const [isLoadingHosts, setIsLoadingHosts] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [customPasswords, setCustomPasswords] = useState<Record<string, string>>({});

  const loadHosts = async () => {
    setIsLoadingHosts(true);
    try {
      const users = await FirebaseService.getAllRoleMetadata();
      const data = users.map(u => ({ ...u, id: u.poppo_id || u.poppoId || u.id } as Host));
      data.sort((a, b) => (a.nickname || a.name || '').localeCompare(b.nickname || b.name || ''));
      setHosts(data);
    } catch (err) {
      console.error("Failed to load hosts:", err);
    } finally {
      setIsLoadingHosts(false);
    }
  };

  useEffect(() => {
    loadHosts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!poppoId.trim() || !nickname.trim() || !temporaryPassword.trim()) {
      setErrorMsg('All fields are required.');
      return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(poppoId)) {
      setErrorMsg('Poppo ID must be alphanumeric.');
      return;
    }

    if (temporaryPassword.length < 6) {
      setErrorMsg('Temporary password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('Authentication error: No current user logged in.');
      }

      const idToken = await currentUser.getIdToken(true);

      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          poppoId: poppoId.trim(),
          nickname: nickname.trim(),
          temporaryPassword,
          role
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setSuccessMsg(`User ${data.user.nickname} created successfully!`);
      // Reset form
      setPoppoId('');
      setNickname('');
      setTemporaryPassword('');
      setRole('host');
      loadHosts();
    } catch (err: any) {
      console.error('Error creating user:', err);
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePassword = async (hostId: string, manualPassword?: string) => {
    setResettingId(hostId);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const host = hosts.find(h => h.id === hostId);
      if (!host) throw new Error("Host not found");

      let finalPwd = manualPassword;
      if (!finalPwd || finalPwd.trim() === '') {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        finalPwd = '';
        for (let i = 0; i < 8; i++) {
          finalPwd += chars.charAt(Math.floor(Math.random() * chars.length));
        }
      }

      const updatedHost: Host = {
        ...host,
        password: finalPwd,
        is_temp_password: true,
        updated_at: new Date().toISOString()
      };

      await FirebaseService.updateHost(updatedHost);
      setSuccessMsg(`Set new temporary password for ${host.nickname || host.name}: ${finalPwd} (User must copy this!)`);
      setCustomPasswords(prev => {
        const next = { ...prev };
        delete next[hostId];
        return next;
      });
      loadHosts();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate password.");
    } finally {
      setResettingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="bg-[#11111A] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative gradient */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-50" />
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20">
            <UserPlus className="text-[#D4AF37]" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Provision Member</h2>
            <p className="text-xs text-[#A09E9A] mt-1 font-medium">Create a new user account with secure defaults.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Poppo ID */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#A09E9A] uppercase tracking-widest ml-1">Poppo ID</label>
              <input
                type="text"
                value={poppoId}
                onChange={(e) => setPoppoId(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 128))}
                placeholder="Enter alphanumeric Poppo ID"
                className="w-full bg-[#0A0A0F] border border-white/10 rounded-xl px-4 py-3 text-[#F0EFE8] text-sm focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 transition-all font-mono placeholder:text-white/20"
                maxLength={128}
                required
              />
            </div>

            {/* Nickname */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#A09E9A] uppercase tracking-widest ml-1">Host Nickname</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter display name"
                className="w-full bg-[#0A0A0F] border border-white/10 rounded-xl px-4 py-3 text-[#F0EFE8] text-sm focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 transition-all placeholder:text-white/20"
                required
              />
            </div>

            {/* Temporary Password */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#A09E9A] uppercase tracking-widest ml-1">Temporary Password</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={temporaryPassword}
                  onChange={(e) => setTemporaryPassword(e.target.value)}
                  placeholder="Assign temporary password"
                  className="w-full bg-[#0A0A0F] border border-white/10 rounded-xl px-4 py-3 text-[#F0EFE8] text-sm focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 transition-all placeholder:text-white/20"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => {
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                    let pwd = '';
                    for (let i = 0; i < 8; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
                    setTemporaryPassword(pwd);
                  }}
                  className="px-4 py-3 bg-[#1A1A28] border border-white/10 rounded-xl text-xs font-bold text-[#D4AF37] hover:bg-[#222235] cursor-pointer transition-colors"
                >
                  Gen
                </button>
              </div>
            </div>

            {/* Role Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#A09E9A] uppercase tracking-widest ml-1">System Role</label>
              <div className="relative">
                <select
                  title="System Role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-[#0A0A0F] border border-white/10 rounded-xl px-4 py-3 text-[#F0EFE8] text-sm focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="host">Host</option>
                  <option value="agent">Agent</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="head admin">Head Admin</option>
                  <option value="director">Director</option>
                </select>
                <Shield className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A09E9A]/50 pointer-events-none" size={16} />
              </div>
            </div>


          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <p className="text-sm font-medium leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="shrink-0 mt-0.5" size={18} />
              <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{successMsg}</p>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#D4AF37] text-black font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(212,175,55,0.2)] cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Provisioning...</span>
              </>
            ) : (
              <>
                <UserPlus size={20} />
                <span>Create User Account</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Roster Listing for Password Generation */}
      <div className="bg-[#11111A] border border-white/10 rounded-3xl p-6 shadow-2xl relative">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <Key className="text-[#D4AF37]" size={18} />
              Provisioned Members
            </h2>
            <p className="text-[10px] text-[#A09E9A] mt-1 uppercase font-bold tracking-wider">Manage temporary access</p>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="text"
              placeholder="Search Name or Poppo ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#A09E9A]/50 focus:outline-none focus:border-[#D4AF37]/50"
            />
            <button 
              onClick={loadHosts} 
              disabled={isLoadingHosts}
              className="p-2 bg-[#1A1A28] rounded-xl text-[#A09E9A] hover:text-white cursor-pointer"
              title="Refresh List"
            >
              <RefreshCw size={16} className={isLoadingHosts ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
          {hosts.length === 0 && !isLoadingHosts ? (
            <p className="text-center text-xs text-[#A09E9A] py-8">No provisioned members found.</p>
          ) : (
            hosts.filter(h => 
              (h.nickname || h.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
              String(h.id).toLowerCase().includes(searchQuery.toLowerCase())
            ).map((host) => (
              <div key={host.id} className="bg-[#1A1A28] border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#F0EFE8] text-sm">{host.nickname || host.name}</span>
                    {host.is_temp_password && (
                      <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-[9px] font-black uppercase tracking-wider">
                        Pending Password Setup
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] font-medium text-[#A09E9A]">
                    <span className="font-mono text-indigo-400">{host.id}</span>
                    <span>•</span>
                    <span className="uppercase text-[#D4AF37]">{host.role || 'Host'}</span>
                    <span>•</span>
                    <span>{host.status}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Auto or type..."
                      value={customPasswords[host.id] || ''}
                      onChange={(e) => setCustomPasswords(prev => ({...prev, [host.id]: e.target.value}))}
                      className="w-28 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder-[#A09E9A]/50 focus:outline-none focus:border-[#D4AF37]/50"
                    />
                    <button 
                      onClick={() => {
                        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                        let randomPwd = '';
                        for (let i = 0; i < 8; i++) randomPwd += chars.charAt(Math.floor(Math.random() * chars.length));
                        setCustomPasswords(prev => ({...prev, [host.id]: randomPwd}));
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-[#A09E9A] hover:text-[#D4AF37] rounded"
                      title="Generate Random"
                    >
                      <RefreshCw size={10} />
                    </button>
                  </div>
                  <button
                    onClick={() => handleGeneratePassword(host.id, customPasswords[host.id])}
                    disabled={resettingId === host.id}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-[#D4AF37]/20 cursor-pointer"
                  >
                    {resettingId === host.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Key size={12} />
                    )}
                    Save
                  </button>
                  <button
                    onClick={() => {
                      const textToCopy = customPasswords[host.id] || host.password || '';
                      if (textToCopy) {
                        navigator.clipboard.writeText(textToCopy);
                        setSuccessMsg(`Copied password for ${host.nickname || host.name} to clipboard: ${textToCopy}`);
                      } else {
                        setErrorMsg('No temporary password available to copy.');
                      }
                    }}
                    className="flex items-center justify-center p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-all border border-transparent hover:border-indigo-500/20 cursor-pointer"
                    title="Copy Password"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

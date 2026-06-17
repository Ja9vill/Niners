import React, { useState, useEffect, useMemo } from 'react';
import { UserPlus, Shield, Loader2, CheckCircle2, AlertCircle, Key, RefreshCw, Copy, Plus, X } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { FirebaseService } from '../lib/firebaseService';
import { Host } from '../types';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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

  const [intakeRequests, setIntakeRequests] = useState<any[]>([]);
  const [isLoadingIntakes, setIsLoadingIntakes] = useState(false);

  // New states for Suggested Registrations & Spotlight Modal
  const [commissions, setCommissions] = useState<any[]>([]);
  const [isLoadingCommissions, setIsLoadingCommissions] = useState(false);
  const [intakeTab, setIntakeTab] = useState<'pending' | 'suggested'>('pending');

  const [showSpotlightModal, setShowSpotlightModal] = useState(false);
  const [spotlightPoppoId, setSpotlightPoppoId] = useState('');
  const [spotlightNickname, setSpotlightNickname] = useState('');
  const [spotlightRole, setSpotlightRole] = useState('host');
  const [spotlightTempPassword, setSpotlightTempPassword] = useState('');
  const [isCreatingSpotlightUser, setIsCreatingSpotlightUser] = useState(false);

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

  const loadIntakeRequests = async () => {
    setIsLoadingIntakes(true);
    try {
      const q = query(collection(db, 'host_requests'), where('status', '==', 'Pending'));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setIntakeRequests(list);
    } catch (err) {
      console.error("Failed to load intake requests:", err);
    } finally {
      setIsLoadingIntakes(false);
    }
  };

  const loadCommissions = async () => {
    setIsLoadingCommissions(true);
    try {
      const snap = await getDocs(collection(db, 'commissions'));
      const list: any[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setCommissions(list);
    } catch (err) {
      console.error("Failed to load commissions:", err);
    } finally {
      setIsLoadingCommissions(false);
    }
  };

  useEffect(() => {
    loadHosts();
    loadIntakeRequests();
    loadCommissions();
  }, []);

  // Compute unique Poppo IDs from commissions not in hosts collection
  const suggestedRegistrations = useMemo(() => {
    const uniqueCommsMap = new Map<string, string>();
    commissions.forEach(c => {
      const pId = String(c.poppo_id || '').trim();
      const name = String(c.poppo_name || c.nickname || '').trim();
      if (pId && !uniqueCommsMap.has(pId)) {
        uniqueCommsMap.set(pId, name);
      }
    });

    const existingUserIds = new Set(
      hosts.map(h => String(h.poppo_id || h.poppoId || h.id || '').trim())
    );

    const suggestions: { poppoId: string; nickname: string }[] = [];
    uniqueCommsMap.forEach((name, pId) => {
      if (!existingUserIds.has(pId)) {
        suggestions.push({
          poppoId: pId,
          nickname: name || `Host-${pId}`
        });
      }
    });

    suggestions.sort((a, b) => a.nickname.localeCompare(b.nickname));
    return suggestions;
  }, [commissions, hosts]);

  const handleOpenSpotlight = (poppoId: string, nickname: string) => {
    setSpotlightPoppoId(poppoId);
    setSpotlightNickname(nickname);
    setSpotlightRole('host');
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let tempPwd = '';
    for (let i = 0; i < 8; i++) {
      tempPwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSpotlightTempPassword(tempPwd);
    setShowSpotlightModal(true);
  };

  const handleCreateSpotlightUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsCreatingSpotlightUser(true);

    if (!spotlightPoppoId.trim() || !spotlightNickname.trim() || !spotlightTempPassword.trim()) {
      setErrorMsg('All fields are required.');
      setIsCreatingSpotlightUser(false);
      return;
    }

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Authentication error: No current user logged in.');

      const idToken = await currentUser.getIdToken(true);

      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          poppoId: spotlightPoppoId,
          nickname: spotlightNickname,
          temporaryPassword: spotlightTempPassword,
          role: spotlightRole
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user account.');
      }

      await FirebaseService.logSystemActivity(`Director provisioned suggested user "${spotlightNickname}" (Poppo ID: ${spotlightPoppoId}) with role "${spotlightRole}"`, 'Info');
      setSuccessMsg(`User "${spotlightNickname}" created successfully!\nTemporary Password: ${spotlightTempPassword}`);
      setShowSpotlightModal(false);
      loadHosts();
      loadCommissions();
    } catch (err: any) {
      console.error('Error creating user via spotlight:', err);
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsCreatingSpotlightUser(false);
    }
  };

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

      await FirebaseService.logSystemActivity(`Admin created/onboarded user account "${nickname}" (Poppo ID: ${poppoId.trim()}) as ${role}`, 'Info');
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

      const authState = Storage.getAuthState();
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authState.token ? { Authorization: `Bearer ${authState.token}` } : {}),
        },
        body: JSON.stringify({ poppo_id: hostId, new_password: finalPwd }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate password.');
      }

      await FirebaseService.logSystemActivity(`Admin/Director generated new temporary password for host "${host.nickname || host.name}" (Poppo ID: ${hostId})`, 'Warning');
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

  const handleApproveIntake = async (req: any) => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let tempPassword = '';
    for (let i = 0; i < 8; i++) tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Authentication error: No current user logged in.');

      const idToken = await currentUser.getIdToken(true);

      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          poppoId: req.poppoId,
          nickname: req.nickname,
          temporaryPassword: tempPassword,
          role: 'host'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user account.');
      }

      if (FirebaseService.syncHostManagerRelationship) {
        await FirebaseService.syncHostManagerRelationship(req.poppoId, req.managerId);
      }

      await setDoc(doc(db, 'host_requests', req.id), { status: 'Approved' }, { merge: true });
      await FirebaseService.logSystemActivity(`Director approved host intake request for "${req.nickname}" (Poppo ID: ${req.poppoId}) requested by Manager ID: ${req.managerId}`, 'Info');

      setSuccessMsg(`Host intake request for "${req.nickname}" approved and user created successfully!\nTemporary Password: ${tempPassword}`);
      
      loadHosts();
      loadIntakeRequests();
    } catch (err: any) {
      console.error('Error approving intake:', err);
      setErrorMsg(err.message || 'Failed to approve intake request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectIntake = async (req: any) => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    try {
      await setDoc(doc(db, 'host_requests', req.id), { status: 'Rejected' }, { merge: true });
      await FirebaseService.logSystemActivity(`Director rejected host intake request for "${req.nickname}" (Poppo ID: ${req.poppoId}) requested by Manager ID: ${req.managerId}`, 'Warning');
      setSuccessMsg(`Host intake request for "${req.nickname}" has been rejected.`);
      loadIntakeRequests();
    } catch (err: any) {
      console.error('Error rejecting intake:', err);
      setErrorMsg(err.message || 'Failed to reject intake request.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      
      {/* Pending Intake Requests & Suggested Registrations Desk */}
      <div className="bg-[#11111A] border border-white/10 rounded-3xl p-6 shadow-2xl relative">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-white/5 pb-3">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <UserPlus className="text-indigo-400" size={18} />
              Host Onboarding Queue
            </h2>
            <p className="text-[10px] text-[#A09E9A] mt-1 uppercase font-bold tracking-wider">Review manager submissions or register suggestions from financials</p>
          </div>
          
          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Tabs */}
            <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setIntakeTab('pending')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  intakeTab === 'pending'
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    : 'text-[#A09E9A] hover:text-white'
                }`}
              >
                Pending ({intakeRequests.length})
              </button>
              <button
                type="button"
                onClick={() => setIntakeTab('suggested')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  intakeTab === 'suggested'
                    ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/20'
                    : 'text-[#A09E9A] hover:text-white'
                }`}
              >
                Suggestions ({suggestedRegistrations.length})
              </button>
            </div>

            <button 
              onClick={() => {
                if (intakeTab === 'pending') {
                  loadIntakeRequests();
                } else {
                  loadCommissions();
                }
              }}
              disabled={isLoadingIntakes || isLoadingCommissions}
              className="p-2 bg-[#1A1A28] rounded-xl text-[#A09E9A] hover:text-white cursor-pointer"
              title="Refresh queue list"
            >
              <RefreshCw size={16} className={(isLoadingIntakes || isLoadingCommissions) ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {intakeTab === 'pending' ? (
          isLoadingIntakes ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="animate-spin text-indigo-400" size={20} />
              <span className="text-[9px] text-[#A09E9A] uppercase tracking-wider">Loading intake pipeline...</span>
            </div>
          ) : intakeRequests.length === 0 ? (
            <p className="text-center text-xs text-[#A09E9A] py-8 italic">No pending host intake requests found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-black text-[#A09E9A] uppercase tracking-widest bg-[#1A1A28]">
                    <th className="px-4 py-3">Host Nickname</th>
                    <th className="px-4 py-3">Poppo ID</th>
                    <th className="px-4 py-3">Requested By (Manager)</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {intakeRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-4 py-3 font-bold text-white">{req.nickname}</td>
                      <td className="px-4 py-3 font-mono font-bold text-indigo-400">{req.poppoId}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-[#F0EFE8]">{req.managerName}</div>
                        <div className="text-[9px] font-mono text-[#A09E9A]">ID: {req.managerId}</div>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => handleApproveIntake(req)}
                          className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectIntake(req)}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 text-red-400 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          isLoadingCommissions ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="animate-spin text-[#D4AF37]" size={20} />
              <span className="text-[9px] text-[#A09E9A] uppercase tracking-wider">Syncing suggestions...</span>
            </div>
          ) : suggestedRegistrations.length === 0 ? (
            <p className="text-center text-xs text-[#A09E9A] py-8 italic">No suggestions. All financial ledger users have active database accounts.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-black text-[#A09E9A] uppercase tracking-widest bg-[#1A1A28]">
                    <th className="px-4 py-3">Detected Name (Financials)</th>
                    <th className="px-4 py-3">Poppo ID</th>
                    <th className="px-4 py-3">Account Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {suggestedRegistrations.map((req) => (
                    <tr key={req.poppoId} className="hover:bg-white/[0.01] transition-colors">
                      <td className="px-4 py-3 font-bold text-[#F0EFE8]">{req.nickname}</td>
                      <td className="px-4 py-3 font-mono font-bold text-[#D4AF37]">{req.poppoId}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase tracking-wider">
                          Unregistered
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenSpotlight(req.poppoId, req.nickname)}
                          className="px-3.5 py-1.5 bg-[#D4AF37]/15 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-[#0D0D14] border border-[#D4AF37]/35 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 ml-auto"
                        >
                          <Plus size={12} />
                          Add
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

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
                    <span className={host.status === 'Active' ? "text-emerald-400 font-bold" : ""}>{host.status}</span>
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

      {/* Spotlight Onboarding Modal */}
      {showSpotlightModal && (
        <div className="fixed inset-0 bg-[#07070C]/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#11111A] border border-white/10 rounded-[32px] p-6 md:p-8 shadow-2xl space-y-6 overflow-hidden">
            {/* Decorative background gradient */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-[#D4AF37]/15 rounded-xl text-[#D4AF37] border border-[#D4AF37]/15">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#F0EFE8] uppercase tracking-wider">Suggested Onboarding</h3>
                  <p className="text-[9px] text-[#A09E9A] font-bold uppercase tracking-wider">Provision suggested account</p>
                </div>
              </div>
              <button 
                type="button"
                title="Close"
                onClick={() => setShowSpotlightModal(false)}
                className="p-1.5 hover:bg-white/5 rounded-xl text-[#A09E9A] hover:text-white cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSpotlightUser} className="space-y-4">
              {/* Poppo ID */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Poppo ID</label>
                <input
                  type="text"
                  title="Poppo ID"
                  placeholder="Poppo ID"
                  value={spotlightPoppoId}
                  disabled
                  className="w-full bg-[#07070C] border border-white/5 rounded-xl px-4 py-3 text-xs text-white/50 outline-none font-mono cursor-not-allowed"
                />
              </div>

              {/* Nickname */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Nickname</label>
                <input
                  type="text"
                  value={spotlightNickname}
                  onChange={(e) => setSpotlightNickname(e.target.value)}
                  placeholder="Enter User Nickname"
                  required
                  className="w-full bg-[#0A0A0F] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/35 transition-all font-bold"
                />
              </div>

              {/* System App Role */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Assign App Role</label>
                <select
                  title="App Role"
                  value={spotlightRole}
                  onChange={(e) => setSpotlightRole(e.target.value)}
                  className="w-full bg-[#0A0A0F] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]/50 font-bold cursor-pointer"
                >
                  <option value="host">Host / Talent</option>
                  <option value="manager">Manager</option>
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Temporary Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Temporary Password</label>
                <div className="relative">
                  <input
                    type="text"
                    value={spotlightTempPassword}
                    onChange={(e) => setSpotlightTempPassword(e.target.value)}
                    placeholder="Temporary Password"
                    required
                    className="w-full bg-[#0A0A0F] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]/50 font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                      let randomPwd = '';
                      for (let i = 0; i < 8; i++) randomPwd += chars.charAt(Math.floor(Math.random() * chars.length));
                      setSpotlightTempPassword(randomPwd);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#A09E9A] hover:text-[#D4AF37]"
                    title="Generate random password"
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSpotlightModal(false)}
                  className="flex-1 py-3 bg-[#1A1A28] hover:bg-[#222235] border border-white/5 text-[#A09E9A] hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSpotlightUser}
                  className="flex-1 py-3 btn-gold text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-lg shadow-[#D4AF37]/10 flex items-center justify-center gap-1.5"
                >
                  {isCreatingSpotlightUser ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


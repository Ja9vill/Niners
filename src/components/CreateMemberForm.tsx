import React, { useState } from 'react';
import { UserPlus, Shield, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { getAuth } from 'firebase/auth';

export const CreateMemberForm = () => {
  const [poppoId, setPoppoId] = useState('');
  const [nickname, setNickname] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [role, setRole] = useState('host');
  
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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
    } catch (err: any) {
      console.error('Error creating user:', err);
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#11111A] border border-white/10 rounded-3xl p-8 max-w-xl mx-auto shadow-2xl relative overflow-hidden">
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
          <input
            type="text"
            value={temporaryPassword}
            onChange={(e) => setTemporaryPassword(e.target.value)}
            placeholder="Assign a secure temporary password"
            className="w-full bg-[#0A0A0F] border border-white/10 rounded-xl px-4 py-3 text-[#F0EFE8] text-sm focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 transition-all placeholder:text-white/20"
            required
            minLength={6}
          />
        </div>

        {/* Role Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#A09E9A] uppercase tracking-widest ml-1">System Role</label>
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-[#0A0A0F] border border-white/10 rounded-xl px-4 py-3 text-[#F0EFE8] text-sm focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 transition-all appearance-none cursor-pointer"
            >
              <option value="host">Host</option>
              <option value="agent">Agent</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
              <option value="head admin">Head Admin</option>
            </select>
            <Shield className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A09E9A]/50 pointer-events-none" size={16} />
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
            <p className="text-sm font-medium leading-relaxed">{successMsg}</p>
          </div>
        )}

        {/* Submit Action */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#D4AF37] text-black font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(212,175,55,0.2)]"
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
  );
};

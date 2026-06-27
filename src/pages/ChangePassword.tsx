import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, Loader2, Key } from 'lucide-react';
import { auth } from '../lib/firebase';

/**
 * Custom useNavigate hook to support tab-based custom routing in App.tsx
 * without importing react-router-dom, satisfying both the navigate('/') call syntax
 * and the existing architecture.
 */
export function useNavigate() {
  return (path: string) => {
    console.log(`[Router] Navigating to path: ${path}`);
    const event = new CustomEvent('app-navigate', { detail: { path } });
    window.dispatchEvent(event);
  };
}

export default function ChangePassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password validation checks (matching backend criteria)
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!isPasswordValid) {
      setError('Password does not meet all security requirements.');
      return;
    }

    setIsLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No active authentication session found.');
      }

      // Force refresh to ensure fresh claims or get fresh token
      const idToken = await user.getIdToken(true);

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ newPassword })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Update failed, please try again.');
      }

      setSuccess('Password updated successfully!');
      
      // Force refresh client auth ID token to retrieve new custom claims
      await user.getIdToken(true);
      
      // Delay navigation slightly so user sees success state
      setTimeout(() => {
        navigate('/overview');
      }, 2000);
    } catch (err: any) {
      console.error('[ChangePassword Page Error]:', err);
      setError(err.message || 'Update failed, please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-[60vh] select-none text-[#F0EFE8] relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[#D4AF37]/5 blur-[120px]" />
      </div>
      <div className="w-full max-w-md border border-[#D4AF37]/40 rounded-[24px] p-8 space-y-6 bg-[#1A140A]/80 backdrop-blur-xl shadow-[0_0_40px_rgba(212,175,55,0.15)] relative z-10">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20">
            <Key className="text-[#D4AF37]" size={24} />
          </div>
          <h2 className="text-lg font-black tracking-widest uppercase">Change Password</h2>
          <p className="text-xs text-[#A09E9A] text-center">
            Set your new, permanent password to secure your portal access.
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center font-bold">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 text-xs bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-center font-bold">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[#D4AF37]/80 uppercase tracking-[0.20em] ml-1 block">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter secure password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                required
                className="w-full pl-4 pr-10 py-3 bg-[#0F0A06]/80 border border-[#D4AF37]/20 rounded-xl text-sm outline-none text-[#F0EFE8] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 focus:shadow-[0_0_15px_rgba(212,175,55,0.15)] placeholder-[#A09E9A]/40 backdrop-blur-sm transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 -translate-y-1/2 right-3 text-[#A09E9A] hover:text-[#F0EFE8]"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[#D4AF37]/80 uppercase tracking-[0.20em] ml-1 block">Confirm New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required
              className="w-full px-4 py-3 bg-[#0F0A06]/80 border border-[#D4AF37]/20 rounded-xl text-sm outline-none text-[#F0EFE8] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 focus:shadow-[0_0_15px_rgba(212,175,55,0.15)] placeholder-[#A09E9A]/40 backdrop-blur-sm transition-all"
            />
          </div>

          {/* Real-time Requirements Validation Display */}
          <div className="p-4 bg-[#0D0D14] border border-white/5 rounded-2xl space-y-2 text-xs text-[#A09E9A]">
            <p className="font-bold text-[10px] uppercase tracking-wider text-white/50">Password Requirements:</p>
            <div className="flex items-center gap-2">
              <span className={hasMinLength ? 'text-green-400' : 'text-white/20'}>●</span>
              <span className={hasMinLength ? 'text-[#F0EFE8]' : 'text-[#A09E9A]/60'}>At least 8 characters</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={hasUppercase ? 'text-green-400' : 'text-white/20'}>●</span>
              <span className={hasUppercase ? 'text-[#F0EFE8]' : 'text-[#A09E9A]/60'}>At least one uppercase letter (A-Z)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={hasLowercase ? 'text-green-400' : 'text-white/20'}>●</span>
              <span className={hasLowercase ? 'text-[#F0EFE8]' : 'text-[#A09E9A]/60'}>At least one lowercase letter (a-z)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={hasNumber ? 'text-green-400' : 'text-white/20'}>●</span>
              <span className={hasNumber ? 'text-[#F0EFE8]' : 'text-[#A09E9A]/60'}>At least one numeric digit (0-9)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={hasSpecial ? 'text-green-400' : 'text-white/20'}>●</span>
              <span className={hasSpecial ? 'text-[#F0EFE8]' : 'text-[#A09E9A]/60'}>At least one special character (e.g. !@#$)</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !isPasswordValid}
            className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-[#0A0A0F] text-xs font-black uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

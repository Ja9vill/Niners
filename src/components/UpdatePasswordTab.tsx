import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, Loader2, Key } from 'lucide-react';
import { PoppoAuthService } from '../lib/customAuth';
import { auth } from '../lib/firebase';
import { FirebaseService } from '../lib/firebaseService';

interface UpdatePasswordTabProps {
  onMigrationComplete: () => void;
}

export const UpdatePasswordTab: React.FC<UpdatePasswordTabProps> = ({ onMigrationComplete }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Re-auth modal state (for requires-recent-login edge case)
  const [showReAuthModal, setShowReAuthModal] = useState(false);
  const [reAuthPoppoId, setReAuthPoppoId] = useState('');
  const [reAuthPassword, setReAuthPassword] = useState('');
  const [reAuthError, setReAuthError] = useState('');
  const [isReAuthing, setIsReAuthing] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const poppoAuthService = new PoppoAuthService();

  // Real-time strength check values
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    await FirebaseService.logSystemActivity(`User submitted password migration request (Poppo ID: ${auth.currentUser?.uid || 'Unknown'})`, 'Info');

    try {
      const result = await poppoAuthService.finalizePasswordMigration(newPassword);
      if (result.success) {
        setSuccess('Password updated successfully! Redirecting...');
        await FirebaseService.logSystemActivity(`User successfully finalized permanent password migration (Poppo ID: ${auth.currentUser?.uid || 'Unknown'})`, 'Info');
        setTimeout(() => {
          onMigrationComplete();
        }, 2000);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Failed to update password.';
      
      // Check for requires-recent-login edge case
      if (errMsg.includes('requires a recent login')) {
        setError('Security action required: Please re-authenticate below.');
        await FirebaseService.logSystemActivity(`User password migration prompt: requires recent login re-authentication (Poppo ID: ${auth.currentUser?.uid || 'Unknown'})`, 'Warning');
        setReAuthPoppoId(auth.currentUser?.uid || '');
        setShowReAuthModal(true);
      } else {
        setError(errMsg);
        await FirebaseService.logSystemActivity(`User password migration failed: ${errMsg} (Poppo ID: ${auth.currentUser?.uid || 'Unknown'})`, 'Error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReAuthing) return;
    setReAuthError('');
    setIsReAuthing(true);
    await FirebaseService.logSystemActivity(`User initiated security re-authentication for password migration (Poppo ID: ${reAuthPoppoId})`, 'Info');

    try {
      // Call authentication to fetch a fresh custom token and re-login
      const result = await poppoAuthService.authenticateWithPoppo(reAuthPoppoId.trim(), reAuthPassword.trim());
      if (result.user) {
        setShowReAuthModal(false);
        setReAuthPassword('');
        setSuccess('Successfully re-authenticated! Retrying password update...');
        await FirebaseService.logSystemActivity(`User successfully re-authenticated credentials for password migration (Poppo ID: ${reAuthPoppoId})`, 'Info');
        
        // Immediately retry the password upgrade with the fresh session
        try {
          const finalResult = await poppoAuthService.finalizePasswordMigration(newPassword);
          if (finalResult.success) {
            setSuccess('Password updated successfully! Redirecting...');
            await FirebaseService.logSystemActivity(`User successfully finalized password migration after re-auth retry (Poppo ID: ${reAuthPoppoId})`, 'Info');
            setTimeout(() => {
              onMigrationComplete();
            }, 2000);
          }
        } catch (retryErr: any) {
          setError(retryErr.message || 'Re-authentication succeeded, but password update failed.');
          await FirebaseService.logSystemActivity(`User password migration retry after re-auth failed: ${retryErr.message || 'Error'} (Poppo ID: ${reAuthPoppoId})`, 'Error');
        }
      }
    } catch (reAuthErr: any) {
      setReAuthError(reAuthErr.message || 'Invalid Poppo ID or Password.');
      await FirebaseService.logSystemActivity(`User credentials re-authentication for password migration failed: ${reAuthErr.message || 'Error'} (Poppo ID: ${reAuthPoppoId})`, 'Error');
    } finally {
      setIsReAuthing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-[60vh] select-none text-[#F0EFE8]">
      {/* Re-Authentication Modal */}
      {showReAuthModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#1A1A28] border border-[#D4AF37]/15 p-6 rounded-2xl w-full max-w-sm space-y-4">
            <div className="flex items-center gap-2 text-[#D4AF37]">
              <Key size={20} />
              <h3 className="font-bold text-md tracking-wider uppercase">Re-Authenticate Session</h3>
            </div>
            <p className="text-xs text-[#A09E9A]">
              For security, you must confirm your original credentials to continue password migration.
            </p>

            {reAuthError && (
              <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                {reAuthError}
              </div>
            )}

            <form onSubmit={handleReAuthSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#A09E9A]">Poppo ID</label>
                <input
                  type="text"
                  value={reAuthPoppoId}
                  disabled={true}
                  className="w-full px-3 py-2 bg-[#0D0D14] border border-[#D4AF37]/15 rounded-xl text-sm outline-none text-[#A09E9A]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#A09E9A]">Password</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={reAuthPassword}
                  onChange={(e) => setReAuthPassword(e.target.value)}
                  disabled={isReAuthing}
                  required
                  className="w-full px-3 py-2 bg-[#0D0D14] border border-[#D4AF37]/15 rounded-xl text-sm outline-none text-[#F0EFE8] focus:border-[#D4AF37]/50"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowReAuthModal(false)}
                  className="px-4 py-2 text-xs uppercase font-bold text-[#A09E9A] hover:text-[#F0EFE8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReAuthing}
                  className="px-4 py-2 bg-[#D4AF37] hover:bg-[#bfa032] text-[#0D0D14] rounded-xl text-xs uppercase font-bold flex items-center gap-1 shadow-lg cursor-pointer"
                >
                  {isReAuthing ? <Loader2 className="animate-spin" size={14} /> : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Password Upgrade Card */}
      <div className="w-full max-w-md bg-[#1A1A28] border border-[#D4AF37]/20 p-8 rounded-3xl shadow-xl space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20">
            <ShieldCheck className="text-[#D4AF37]" size={24} />
          </div>
          <h2 className="text-lg font-black tracking-widest uppercase">Secure Your Account</h2>
          <p className="text-xs text-[#A09E9A] text-center">
            You are signed in with a temporary password. Upgrade to a permanent, secure password to access the agency features.
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 text-xs bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-[#A09E9A]">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                required
                className="w-full pl-3 pr-10 py-2 bg-[#0D0D14] border border-[#D4AF37]/15 rounded-xl text-sm outline-none text-[#F0EFE8] focus:border-[#D4AF37]/50"
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

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-[#A09E9A]">Confirm New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required
              className="w-full px-3 py-2 bg-[#0D0D14] border border-[#D4AF37]/15 rounded-xl text-sm outline-none text-[#F0EFE8] focus:border-[#D4AF37]/50"
            />
          </div>

          {/* Strength Indicators */}
          <div className="p-4 bg-[#0D0D14] border border-[#D4AF37]/10 rounded-2xl space-y-2 text-xs text-[#A09E9A]">
            <p className="font-bold text-[10px] uppercase tracking-wider text-white/50">Requirements:</p>
            <div className="flex items-center gap-2">
              <span className={hasMinLength ? 'text-green-400' : 'text-white/20'}>●</span>
              <span className={hasMinLength ? 'text-[#F0EFE8]' : 'text-[#A09E9A]/60'}>Minimum 8 characters</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={hasUppercase ? 'text-green-400' : 'text-white/20'}>●</span>
              <span className={hasUppercase ? 'text-[#F0EFE8]' : 'text-[#A09E9A]/60'}>At least one uppercase letter (A-Z)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={hasNumber ? 'text-green-400' : 'text-white/20'}>●</span>
              <span className={hasNumber ? 'text-[#F0EFE8]' : 'text-[#A09E9A]/60'}>At least one numeric digit (0-9)</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !hasMinLength || !hasUppercase || !hasNumber}
            className="w-full py-3 bg-[#D4AF37] hover:bg-[#bfa032] disabled:bg-[#1A1A28] disabled:border-[#D4AF37]/10 disabled:text-[#A09E9A]/30 text-[#0D0D14] rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg shadow-[#D4AF37]/10 disabled:shadow-none border border-transparent transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader2 className="animate-spin" size={16} /> : 'Secure My Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

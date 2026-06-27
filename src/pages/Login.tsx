import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Shield, ShieldCheck, Eye, EyeOff, Loader2,
  ArrowRight, KeyRound, CheckCircle2, RotateCcw,
} from 'lucide-react';
import { Storage } from '../lib/storage';
import { PoppoAuthService } from '../lib/customAuth';
import appLogo from '../logo.jpg';

type Phase = 'username' | 'password' | 'set-password' | 'migrate-password';

const authService = new PoppoAuthService();

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/overview';

  // ── State ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('username');
  const [poppoId, setPoppoId] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (Storage.getAuthState().level > 0) navigate(from, { replace: true });
  }, [navigate, from]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCheckUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const id = poppoId.trim();
    if (!id) { setError('Please enter your Poppo ID.'); return; }
    if (!/^\d+$/.test(id)) { setError('Poppo ID must contain only numbers.'); return; }
    setIsSubmitting(true);
    try {
      const result = await authService.checkUsername(id);
      if (!result.exists) {
        setError('Poppo ID not found. Contact your agency admin.');
        return;
      }
      if (result.blocked) {
        setError('This account is inactive. Contact your agency admin.');
        return;
      }
      setPhase(result.is_first_login ? 'set-password' : 'password');
    } catch (err: any) {
      setError(err.message || 'Failed to verify ID. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password.trim()) { setError('Please enter your password.'); return; }
    setIsSubmitting(true);
    try {
      const pw = password.trim();
      const result = await authService.authenticateWithPoppo(poppoId.trim(), pw);

      if (result.status === 'MIGRATION_REQUIRED') {
        setPhase('migrate-password');
        setIsSubmitting(false);
        return;
      }

      const s = Storage.getAuthState();
      Storage.addLog('Auth', `Logged in as ${s.nickname} (${s.role})`, s.nickname);
      navigate(from, { replace: true });
    } catch (err: any) {
      let msg = err.message || 'Login failed. Please try again.';
      if (msg.includes('Too many login attempts')) {
        // Extract out explicit error for rate limiting
        msg = 'Too many login attempts. Please wait 15 minutes before trying again.';
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newPassword || !confirmPassword) { setError('Both fields are required.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(newPassword)) { setError('Must include at least one uppercase letter.'); return; }
    if (!/[0-9]/.test(newPassword)) { setError('Must include at least one number.'); return; }
    setIsSubmitting(true);
    try {
      await authService.setInitialPassword(poppoId.trim(), newPassword, confirmPassword);
      setSuccess('Password set! Redirecting...');
      setTimeout(() => {
        const s = Storage.getAuthState();
        Storage.addLog('Auth', `First-time password set by ${s.nickname} (${s.role})`, s.nickname);
        navigate(from, { replace: true });
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Failed to set password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMigratePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newPassword || !confirmPassword) { setError('Both fields are required.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(newPassword)) { setError('Must include at least one uppercase letter.'); return; }
    if (!/[0-9]/.test(newPassword)) { setError('Must include at least one number.'); return; }
    setIsSubmitting(true);
    try {
      await authService.finalizePasswordMigration(newPassword);
      setSuccess('Account secured! Redirecting...');
      setTimeout(() => {
        const s = Storage.getAuthState();
        Storage.addLog('Auth', `Upgraded password security for ${s.nickname} (${s.role})`, s.nickname);
        navigate(from, { replace: true });
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Shared styles ──────────────────────────────────────────────────────────
  const inputCls = 'w-full bg-[#0F0A06]/80 border border-[#D4AF37]/20 rounded-xl pl-4 pr-12 py-3 text-sm tracking-widest focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 focus:shadow-[0_0_15px_rgba(212,175,55,0.15)] outline-none transition-all text-[#F0EFE8] placeholder-[#A09E9A]/40 backdrop-blur-sm';
  const labelCls = 'text-[10px] font-black text-[#D4AF37]/80 uppercase tracking-[0.20em] ml-1 block';
  const btnCls   = 'w-full py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-[#0A0A0F] text-xs font-black uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 bg-[#0A0A0F] relative overflow-hidden min-h-[100dvh]">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-[#D4AF37]/5 blur-[120px]" />
      </div>

      <div className="w-full max-w-sm border border-[#D4AF37]/40 rounded-[24px] p-6 space-y-6 bg-[#1A140A]/80 backdrop-blur-xl shadow-[0_0_40px_rgba(212,175,55,0.15)] relative z-10">

        {/* Header */}
        <div className="border-b border-t border-white/5 py-4 flex flex-col items-center justify-center gap-1 shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <img src={appLogo} alt="Niners Logo" className="h-8 w-8 rounded-lg border border-[#D4AF37]/30 shadow-[0_0_15px_rgba(212,175,55,0.2)] object-cover select-none pointer-events-none" />
            <h1 className="text-xl font-black tracking-[0.2em] text-[#D4AF37] leading-tight">NINERS</h1>
          </div>
          <h2 className="text-[10px] font-black text-[#F0EFE8] uppercase tracking-[0.15em]">NINE Talent Management</h2>
          <p className="text-[9px] font-bold text-[#A09E9A]/70 italic tracking-wider mt-0.5">"The home of quality livestreamers."</p>
        </div>

        {/* Title area */}
        <div className="flex flex-col items-center text-center space-y-3 py-1">
          <div className="flex items-center gap-2">
            {phase === 'set-password' || phase === 'migrate-password'
              ? <KeyRound className="text-[#D4AF37] w-6 h-6" strokeWidth={2} />
              : <Shield className="text-[#D4AF37] w-6 h-6" strokeWidth={2} />
            }
            <h1 className="text-lg font-black tracking-widest uppercase text-[#F0EFE8]">
              {phase === 'set-password' ? 'SET YOUR PASSWORD' : 
               phase === 'migrate-password' ? 'UPGRADE PASSWORD' : 'MEMBER LOGIN'}
            </h1>
          </div>
          <p className="text-[#A09E9A]/80 text-xs px-4 leading-relaxed font-medium">
            {phase === 'username' && 'Enter your Poppo ID to continue.'}
            {phase === 'password' && 'Welcome back! Enter your password below.'}
            {phase === 'set-password' && "Welcome to the team! Choose a secure password to activate your account."}
            {phase === 'migrate-password' && "Action required! Please upgrade to a secure password to continue."}
          </p>
        </div>

        {/* ── PHASE 1: Username ── */}
        {phase === 'username' && (
          <form onSubmit={handleCheckUsername} className="space-y-5">
            <div className="space-y-1.5">
              <label className={labelCls}>Poppo ID</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <ShieldCheck size={16} className="text-[#D4AF37]" />
                </div>
                <input
                  id="login-poppo-id"
                  type="text"
                  value={poppoId}
                  onChange={e => setPoppoId(e.target.value)}
                  placeholder="Enter Poppo ID..."
                  className={`${inputCls} pl-12`}
                  autoFocus
                  autoComplete="username"
                />
              </div>
            </div>
            {error && <p className="text-red-400 text-xs text-center font-bold animate-pulse">{error}</p>}
            <button type="submit" disabled={isSubmitting} className={btnCls}>
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              CONTINUE
            </button>
          </form>
        )}

        {/* ── PHASE 2b: Password ── */}
        {phase === 'password' && (
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Dimmed Poppo ID context */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5">
              <ShieldCheck size={14} className="text-[#D4AF37] shrink-0" />
              <span className="text-xs text-[#A09E9A]/70 font-bold tracking-wider truncate">{poppoId}</span>
              <button
                type="button"
                onClick={() => { setPhase('username'); setPassword(''); setError(''); }}
                className="ml-auto text-[#A09E9A]/40 hover:text-[#D4AF37] transition-colors"
                title="Change Poppo ID"
              >
                <RotateCcw size={12} />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password..."
                  className={inputCls}
                  autoFocus
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A09E9A] hover:text-[#F0EFE8] transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <p className="text-red-400 text-xs text-center font-bold animate-pulse">{error}</p>}
            <button type="submit" disabled={isSubmitting} className={btnCls}>
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              LOG IN
            </button>
          </form>
        )}

        {/* ── PHASE 2a / 3: Set Password or Migrate Password ── */}
        {(phase === 'set-password' || phase === 'migrate-password') && (
          <form onSubmit={phase === 'set-password' ? handleSetPassword : handleMigratePassword} className="space-y-5">
            {/* Poppo ID context */}
            <div className="flex items-center gap-2 px-3 py-2 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/20">
              <ShieldCheck size={14} className="text-[#D4AF37] shrink-0" />
              <span className="text-xs text-[#D4AF37]/80 font-bold tracking-wider truncate">{poppoId}</span>
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>New Password</label>
              <div className="relative">
                <input
                  id="set-new-password"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 number..."
                  className={inputCls}
                  autoFocus
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A09E9A] hover:text-[#F0EFE8] transition-colors">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>Confirm Password</label>
              <div className="relative">
                <input
                  id="set-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password..."
                  className={inputCls}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A09E9A] hover:text-[#F0EFE8] transition-colors">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Password hint */}
            <ul className="text-[10px] text-[#A09E9A]/50 space-y-0.5 ml-1">
              <li className={newPassword.length >= 8 ? 'text-green-400' : ''}>• Minimum 8 characters</li>
              <li className={/[A-Z]/.test(newPassword) ? 'text-green-400' : ''}>• At least one uppercase letter</li>
              <li className={/[0-9]/.test(newPassword) ? 'text-green-400' : ''}>• At least one number</li>
            </ul>

            {error && <p className="text-red-400 text-xs text-center font-bold animate-pulse">{error}</p>}
            {success && (
              <p className="text-green-400 text-xs text-center font-bold flex items-center justify-center gap-1">
                <CheckCircle2 size={13} /> {success}
              </p>
            )}
            <button type="submit" disabled={isSubmitting} className={btnCls}>
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
              ACTIVATE ACCOUNT
            </button>
          </form>
        )}

        {/* Footer links */}
        <div className="flex flex-col items-center space-y-2 pt-1 text-[10px] font-bold text-[#A09E9A]/60 tracking-wider">
          <div className="flex items-center gap-1">
            <span>No account?</span>
            <button type="button" className="text-[#A09E9A] hover:text-[#D4AF37] hover:underline transition-all">Contact Agency.</button>
          </div>
        </div>

        <div className="border-b border-t border-[#D4AF37]/10 py-1" />
      </div>
    </div>
  );
};

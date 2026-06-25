/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { Lock, User, CheckCircle2, Loader2, Shield, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Storage } from '../lib/storage';
import { motion } from 'motion/react';
import { PoppoAuthService } from '../lib/customAuth';
import { UpdatePasswordTab } from './UpdatePasswordTab';
import { FirebaseService } from '../lib/firebaseService';
import appLogo from '../logo.jpg';

const TEXT = {
  title: 'NINERS',
  memberLogin: 'MEMBER LOGIN',
  loginDescription: 'Login to access your full agency roster and account features.',
  poppoId: 'Poppo ID',
  password: 'Password',
  logIn: 'LOG IN',
  forgotPassword: 'Forgot Password?',
  noAccount: 'No account?',
  contactAgency: 'Contact Agency.',
  enterPoppoId: 'Enter Poppo ID...',
  enterPassword: 'Enter Password...',
  confirmPassword: 'Confirm Password...',
  enterConfirmPassword: 'Re-enter Password...',
  continue: 'CONTINUE',
  setPassword: 'SET PASSWORD & LOGIN',
};

interface AuthGateProps {
  children: React.ReactNode;
  onAuthChange: () => void;
}

type Phase = 'USERNAME_CHECK' | 'SET_PASSWORD' | 'ENTER_PASSWORD';

export const AuthGate: React.FC<AuthGateProps> = ({ children, onAuthChange }) => {
  const [systemError, setSystemError] = useState<string | null>(null);
  const [authState, setAuthState] = useState(Storage.getAuthState());
  const [initializing, setInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requiresMigration, setRequiresMigration] = useState(false);
  
  // Phase state
  const [phase, setPhase] = useState<Phase>('USERNAME_CHECK');
  
  // Form states
  const [poppoId, setPoppoId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const current = Storage.getAuthState();
    setAuthState(current);
    setInitializing(false);
  }, []);

  // Phase 1: Check Poppo ID existence & login state
  const handleCheckUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSystemError(null);
    setIsSubmitting(true);

    const trimmedPoppoId = poppoId.trim();
    if (!trimmedPoppoId) {
      setError('Poppo ID is required.');
      setIsSubmitting(false);
      return;
    }
    if (!/^\d+$/.test(trimmedPoppoId)) {
      setError('Poppo ID must contain only numbers.');
      setIsSubmitting(false);
      return;
    }

    try {
      const authService = new PoppoAuthService();
      const res = await authService.checkUsername(trimmedPoppoId);
      
      if (!res.exists) {
        setError(`Poppo ID '${trimmedPoppoId}' not found.`);
        setIsSubmitting(false);
        return;
      }
      
      if (res.blocked) {
        setError('Account is inactive.');
        setIsSubmitting(false);
        return;
      }

      if (res.is_first_login) {
        setPhase('SET_PASSWORD');
      } else {
        setPhase('ENTER_PASSWORD');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to check username. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Phase 2a: Set initial password and login
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const trimmedPoppoId = poppoId.trim();
    const pwd = password.trim();
    const conf = confirmPassword.trim();

    if (pwd.length < 8) {
      setError('Password must be at least 8 characters long.');
      setIsSubmitting(false);
      return;
    }
    if (!/[A-Z]/.test(pwd)) {
      setError('Password must contain at least one uppercase letter.');
      setIsSubmitting(false);
      return;
    }
    if (!/[0-9]/.test(pwd)) {
      setError('Password must contain at least one number.');
      setIsSubmitting(false);
      return;
    }
    if (pwd !== conf) {
      setError('Passwords do not match.');
      setIsSubmitting(false);
      return;
    }

    try {
      const authService = new PoppoAuthService();
      const res = await authService.setInitialPassword(trimmedPoppoId, pwd, conf);
      
      if (res.status === 'SUCCESS') {
        const newState = Storage.getAuthState();
        setAuthState(newState);
        Storage.addLog('Auth', `Registered and logged in as ${newState.nickname} (${newState.role})`, newState.nickname);
        await FirebaseService.logSystemActivity(`User set initial password and logged in: ${newState.nickname} (Poppo ID: ${newState.poppo_id}, Role: ${newState.role})`, 'Info');
        onAuthChange();
      } else {
        setError('Password setup completed, but login session could not be verified.');
        setSystemError('Password setup succeeded but login verification failed');
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to set password.';
        console.error('Set password error:', err);
        await FirebaseService.logSystemActivity(`Set password error: ${errMsg}`, 'Error');
        setSystemError(errMsg);
        setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Phase 2b: Standard login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const trimmedPoppoId = poppoId.trim();
    const trimmedPassword = password.trim();

    if (!trimmedPoppoId || !trimmedPassword) {
      setError('Both Poppo ID and Password are required.');
      setIsSubmitting(false);
      return;
    }

    try {
      const authService = new PoppoAuthService();
      let success = false;
      let errorMsg = '';

      try {
        const result = await authService.authenticateWithPoppo(trimmedPoppoId, trimmedPassword);
        
        if (result.status === 'MIGRATION_REQUIRED') {
          setRequiresMigration(true);
          return;
        }
        
        success = true;
      } catch (err: any) {
        errorMsg = err.message || 'Invalid Poppo ID or Password';
        if (errorMsg.includes('Too many login attempts')) {
          errorMsg = 'Too many login attempts. Please wait 15 minutes before trying again.';
        }
        // Log the error
        await FirebaseService.logSystemActivity(`Login error for ${trimmedPoppoId}: ${errorMsg}`, 'Warning');
      }

      if (success) {
        const newState = Storage.getAuthState();
        setAuthState(newState);
        Storage.addLog('Auth', `Logged in as ${newState.nickname} (${newState.role})`, newState.nickname);
        await FirebaseService.logSystemActivity(`User logged in: ${newState.nickname} (Poppo ID: ${newState.poppo_id}, Role: ${newState.role})`, 'Info');
        onAuthChange();
      } else {
        setError(errorMsg);
        setSystemError(errorMsg);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errMsg = err?.message || 'Login failed. Please verify connection and try again.';
      await FirebaseService.logSystemActivity(`Unexpected login error: ${errMsg}`, 'Error');
      setSystemError(errMsg);
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authState.level > 0) {
    return <>{children}</>;
  }

  if (initializing) {
    return (
      <div className="flex items-center justify-center p-12 bg-transparent min-h-[70vh]">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-12 h-12 rounded-[16px] bg-[#FFB800]/20 flex items-center justify-center"
        >
          <div className="w-6 h-6 rounded-[8px] bg-[#FFB800]" />
        </motion.div>
      </div>
    );
  }

  if (requiresMigration) {
    return (
      <div className="w-full min-h-[80vh] flex items-center justify-center bg-transparent">
        <UpdatePasswordTab 
          onMigrationComplete={async () => {
            const newState = Storage.getAuthState();
            setAuthState(newState);
            Storage.addLog('Auth', `Logged in and migrated password as ${newState.nickname}`, newState.nickname);
            await FirebaseService.logSystemActivity(`User logged in and migrated password: ${newState.nickname} (Poppo ID: ${newState.poppo_id}, Role: ${newState.role})`, 'Info');
            onAuthChange();
          }} 
        />
      </div>
    );
  }

  // Password complexity helper for SET_PASSWORD Phase
  const pwdValidation = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    match: password === confirmPassword && password.length > 0,
  };

  return (
  <>
    {systemError && (
      <div className="w-full mb-4 p-3 bg-red-900/30 text-red-200 rounded-xl text-sm text-center">
        {systemError}
      </div>
    )}
    <div className="w-full flex flex-col items-center justify-center p-4 bg-transparent relative overflow-hidden min-h-[80vh]">
      {/* Ambient glow / Fiery gold spotlight */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-[#D4AF37]/10 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-[#FF6B00]/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[#D4AF37]/5 blur-[130px]" />
      </div>

      <div className="w-full max-w-sm border border-[#D4AF37]/20 rounded-[24px] p-6 space-y-6 bg-[#120D0A]/75 backdrop-blur-xl shadow-[0_0_50px_rgba(212,175,55,0.12)] relative z-10 flex flex-col justify-between">
        
        {/* Top Header */}
        <div className="border-b border-t border-white/5 py-4 flex flex-col items-center justify-center gap-1 shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <img src={appLogo} alt="Niners Logo" className="h-8 w-8 rounded-lg border border-[#D4AF37]/30 shadow-[0_0_15px_rgba(212,175,55,0.2)] object-cover select-none pointer-events-none" />
            <h1 className="text-xl font-black tracking-[0.2em] text-[#D4AF37] leading-tight">{TEXT.title}</h1>
          </div>
          <h2 className="text-[10px] font-black text-[#F0EFE8] uppercase tracking-[0.15em]">NINE Talent Management</h2>
          <p className="text-[9px] font-bold text-[#A09E9A]/70 italic tracking-wider mt-0.5">"The home of quality livestreamers."</p>
        </div>

        {/* Member Login Title Area */}
        <div className="flex flex-col items-center text-center space-y-3 py-2">
          <div className="flex items-center gap-2 text-white">
            <Shield className="text-[#FFB800] w-6 h-6" strokeWidth={2} />
            <h1 className="text-lg font-black tracking-widest uppercase text-[#F5F5F5]">{TEXT.memberLogin}</h1>
          </div>
          <p className="text-[#A09E9A]/80 text-xs px-4 leading-relaxed font-medium">
            {phase === 'SET_PASSWORD' 
              ? 'Welcome! Please set a secure password for your first login.' 
              : phase === 'ENTER_PASSWORD'
              ? 'Please enter your password to continue.'
              : TEXT.loginDescription
            }
          </p>
        </div>

        {/* ==================== Phase 1: USERNAME_CHECK ==================== */}
        {phase === 'USERNAME_CHECK' && (
          <form onSubmit={handleCheckUsername} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#A09E9A]/60 uppercase tracking-[0.20em] ml-1 block">{TEXT.poppoId}</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 flex items-center">
                    <ShieldCheck size={16} className="text-[#D4AF37]" />
                  </div>
                  <input 
                    type="text" 
                    value={poppoId}
                    onChange={(e) => setPoppoId(e.target.value)}
                    placeholder={TEXT.enterPoppoId}
                    className="w-full bg-[#0C0806] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm font-bold tracking-widest focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 outline-none transition-all text-[#F0EFE8] placeholder-white/20"
                    autoFocus
                    required
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-xs text-center font-bold animate-pulse">{error}</p>}
            
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full btn-gold py-3.5 rounded-xl text-xs font-black uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_2px_12px_rgba(212,175,55,0.25)] cursor-pointer"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin text-[#0D0D14]" />}
              {TEXT.continue}
            </button>
          </form>
        )}

        {/* ==================== Phase 2a: SET_PASSWORD ==================== */}
        {phase === 'SET_PASSWORD' && (
          <form onSubmit={handleSetPassword} className="space-y-6">
            <div className="space-y-4">
              
              {/* Display current Poppo ID and option to change */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#A09E9A]/60 uppercase tracking-[0.20em] ml-1 block">{TEXT.poppoId}</label>
                <div className="flex items-center justify-between bg-[#0C0806] border border-white/10 rounded-xl px-4 py-3">
                  <span className="text-sm font-bold tracking-widest text-[#F0EFE8]/50">{poppoId}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPhase('USERNAME_CHECK');
                      setPassword('');
                      setConfirmPassword('');
                      setError('');
                    }}
                    className="text-[10px] font-black text-[#D4AF37] hover:underline uppercase tracking-wider"
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#A09E9A]/60 uppercase tracking-[0.20em] ml-1 block">{TEXT.password}</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={TEXT.enterPassword}
                    className="w-full bg-[#0C0806] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm tracking-widest focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 outline-none transition-all text-[#F0EFE8] placeholder-white/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A09E9A] hover:text-[#F0EFE8] transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#A09E9A]/60 uppercase tracking-[0.20em] ml-1 block">{TEXT.confirmPassword}</label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={TEXT.enterConfirmPassword}
                    className="w-full bg-[#0C0806] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm tracking-widest focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 outline-none transition-all text-[#F0EFE8] placeholder-white/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A09E9A] hover:text-[#F0EFE8] transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Requirements Checklist */}
              <div className="space-y-1.5 p-3 bg-[#0C0806] rounded-xl border border-white/5 text-[10px]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={12} className={pwdValidation.minLength ? "text-green-400" : "text-gray-500"} />
                  <span className={pwdValidation.minLength ? "text-green-300 font-bold" : "text-white/40"}>At least 8 characters</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={12} className={pwdValidation.hasUppercase ? "text-green-400" : "text-gray-500"} />
                  <span className={pwdValidation.hasUppercase ? "text-green-300 font-bold" : "text-white/40"}>At least 1 uppercase letter</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={12} className={pwdValidation.hasNumber ? "text-green-400" : "text-gray-500"} />
                  <span className={pwdValidation.hasNumber ? "text-green-300 font-bold" : "text-white/40"}>At least 1 number</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={12} className={pwdValidation.match ? "text-green-400" : "text-gray-500"} />
                  <span className={pwdValidation.match ? "text-green-300 font-bold" : "text-white/40"}>Passwords match</span>
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-xs text-center font-bold animate-pulse">{error}</p>}
            
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full btn-gold py-3.5 rounded-xl text-xs font-black uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_2px_12px_rgba(212,175,55,0.25)] cursor-pointer"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin text-[#0D0D14]" />}
              {TEXT.setPassword}
            </button>
          </form>
        )}

        {/* ==================== Phase 2b: ENTER_PASSWORD ==================== */}
        {phase === 'ENTER_PASSWORD' && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              
              {/* Display current Poppo ID and option to change */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#A09E9A]/60 uppercase tracking-[0.20em] ml-1 block">{TEXT.poppoId}</label>
                <div className="flex items-center justify-between bg-[#0C0806] border border-white/10 rounded-xl px-4 py-3">
                  <span className="text-sm font-bold tracking-widest text-[#F0EFE8]/50">{poppoId}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPhase('USERNAME_CHECK');
                      setPassword('');
                      setConfirmPassword('');
                      setError('');
                    }}
                    className="text-[10px] font-black text-[#D4AF37] hover:underline uppercase tracking-wider"
                  >
                    Change
                  </button>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#A09E9A]/60 uppercase tracking-[0.20em] ml-1 block">{TEXT.password}</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={TEXT.enterPassword}
                    className="w-full bg-[#0C0806] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm tracking-widest focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 outline-none transition-all text-[#F0EFE8] placeholder-white/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A09E9A] hover:text-[#F0EFE8] transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-xs text-center font-bold animate-pulse">{error}</p>}
            
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full btn-gold py-3.5 rounded-xl text-xs font-black uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_2px_12px_rgba(212,175,55,0.25)] cursor-pointer"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin text-[#0D0D14]" />}
              {TEXT.logIn}
            </button>
          </form>
        )}

        {/* Links */}
        <div className="flex flex-col items-center space-y-2 pt-2 text-[10px] font-bold text-[#A09E9A]/60 tracking-wider">
          {phase !== 'SET_PASSWORD' && (
            <button type="button" className="hover:text-[#D4AF37] hover:underline transition-all">{TEXT.forgotPassword}</button>
          )}
          <div className="flex items-center gap-1">
            <span>{TEXT.noAccount}</span>
            <button type="button" className="text-[#B0B0B0] hover:text-[#FFB800] hover:underline transition-all">{TEXT.contactAgency}</button>
          </div>
          <button 
            type="button" 
            onClick={async () => {
              try {
                const { getAuth, signOut } = await import('firebase/auth');
                await signOut(getAuth());
              } catch (e) {
                console.warn("Firebase signout error:", e);
              }
              localStorage.clear();
              sessionStorage.clear();
              document.cookie.split(";").forEach((cookie) => {
                const eqPos = cookie.indexOf("=");
                const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.9poppo.com";
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=9poppo.com";
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
              });
              alert("All auth sessions, local storage, and cookies for 9poppo.com have been nuked. Hard-reloading page...");
              window.location.reload();
            }}
            className="mt-2 text-red-400 hover:text-red-300 hover:underline transition-all uppercase tracking-widest text-[9px] font-black cursor-pointer"
          >
            ⚠️ Nuke Session & Reset
          </button>
        </div>

        {/* Footer border lines */}
        <div className="border-b border-t border-white/5 py-1 text-center shrink-0" />
      </div>
    </div>
  </>
  );
};
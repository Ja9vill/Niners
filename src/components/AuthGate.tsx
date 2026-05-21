import React, { useState, useEffect } from 'react';
import { Lock, Unlock, LogOut, ChevronRight, User, Globe, CheckCircle2, Loader2 } from 'lucide-react';
import { Storage } from '../lib/storage';
import { Host } from '../types';
import { FirebaseService } from '../lib/firebaseService';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { auth, signInWithGoogle } from '../lib/firebase';
import { onAuthStateChanged, signOut, getRedirectResult } from 'firebase/auth';

const DIRECTOR_IDS = ['19157913', '031907'];
const DIRECTOR_PASS = '031907';

interface AuthGateProps {
  children: React.ReactNode;
  onAuthChange: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children, onAuthChange }) => {
  const [authState, setAuthState] = useState(Storage.getAuthState());
  const [password, setPassword] = useState('');
  const [poppoId, setPoppoId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'login' | 'change_pass' | 'forgot_pass' | 'fill_profile'>('login');
  const [profileData, setProfileData] = useState({ nickname: '', team: '', manager: '', description: '' });
  const [userToUpdate, setUserToUpdate] = useState<Host | null>(null);
  const [resetRequested, setResetRequested] = useState(false);
  const [error, setError] = useState('');
  const [firebaseUser, setFirebaseUser] = useState(auth.currentUser);
  const [initializing, setInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Process redirect results for Google Sign-In
    getRedirectResult(auth).catch((err: any) => {
      console.error('Redirect result error:', err);
      if (err.code === 'auth/internal-error') {
        setError('Authentication error. If you are in an iframe, try opening in a new tab.');
      } else {
        setError(err.message || 'Google Sign-In failed.');
      }
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      
      // Automatically elevate session if verified admin email matches
      if (user?.email === 'jwavpr@gmail.com') {
        const current = Storage.getAuthState();
        if (current.role !== 'Director' || current.level !== 2) {
          const newState = { 
            level: 2, 
            role: 'Director', 
            name: user.displayName || 'Director Miss Nine', 
            poppo_id: '19157913' 
          };
          Storage.setAuthState(newState);
          setAuthState(newState);
          Storage.addLog('Auth', 'Auto-logged in via Google', 'Director Miss Nine');
          onAuthChange();
        }
      }
      setInitializing(false);
    });
    return () => unsubscribe();
  }, [onAuthChange]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Director Master Login
    if ((DIRECTOR_IDS.includes(poppoId) || poppoId.toLowerCase() === 'director') && password === DIRECTOR_PASS) {
      const newState = { level: 2, role: 'Director', name: 'Director Miss Nine', poppo_id: '19157913' };
      Storage.setAuthState(newState);
      setAuthState(newState);
      Storage.addLog('Auth', 'Logged in as Director (Bypass)', 'Director Miss Nine');
      onAuthChange();
      return;
    }

    // 2. Lookup in Roster
    const hosts = Storage.getHosts();
    const user = hosts.find(h => h.id === poppoId);

    if (!user) {
      setError('Invalid POPPO ID or Password');
      return;
    }

    if (user.password === password) {
      if (user.is_temp_password) {
        setUserToUpdate(user);
        setStep('change_pass');
      } else {
        const level = ['Director', 'Head Admin', 'Admin', 'Manager'].includes(user.position) ? 1 : 0.5;
        const newState = { 
          level, 
          role: user.position, 
          name: user.name, 
          poppo_id: user.id,
          team: user.team,
          manager: user.manager,
          anchor_type: user.anchor_type
        };
        Storage.setAuthState(newState);
        setAuthState(newState);
        Storage.addLog('Auth', `Logged in as ${user.position}`, user.name);
        onAuthChange();
      }
    } else {
      setError('Invalid POPPO ID or Password');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      await signInWithGoogle();
      // Elevation is handled by the useEffect onAuthStateChanged
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.message?.includes('auth/internal-error')) {
        setError('Authentication service error. Please try again or use ID/Password.');
      } else {
        setError(err.message || 'Google Sign-In failed.');
      }
    }
  };

  const logout = () => {
    signOut(auth);
    const newState = { level: 0, role: '', name: '', poppo_id: '' };
    Storage.setAuthState(newState);
    setAuthState(newState);
    onAuthChange();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsSubmitting(false);
      return;
    }

    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters');
      setIsSubmitting(false);
      return;
    }

    if (!userToUpdate) {
      setIsSubmitting(false);
      return;
    }

    try {
      const updatedUser: Host = {
        ...userToUpdate,
        password: newPassword,
        is_temp_password: false,
        reset_requested: false,
        updated_at: new Date().toISOString()
      };

      setProfileData({ 
        nickname: updatedUser.nickname || updatedUser.name, 
        team: updatedUser.team, 
        manager: updatedUser.manager,
        description: updatedUser.description || ''
      });
      setUserToUpdate(updatedUser);
      setStep('fill_profile');
    } catch (err: any) {
      setError(`Failed to update password: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToUpdate) return;
    
    setError('');
    setIsSubmitting(true);

    try {
      const finalUser: Host = {
        ...userToUpdate,
        nickname: profileData.nickname,
        name: profileData.nickname,
        team: profileData.team,
        manager: profileData.manager,
        description: profileData.description,
        updated_at: new Date().toISOString()
      };

      await FirebaseService.updateHost(finalUser);
      
      const level = ['Director', 'Head Admin', 'Admin', 'Manager'].includes(finalUser.position) ? 1 : 0.5;
      const newState = { 
        level, 
        role: finalUser.position, 
        name: finalUser.name, 
        poppo_id: finalUser.id,
        team: finalUser.team,
        manager: finalUser.manager,
        anchor_type: finalUser.anchor_type
      };
      
      Storage.setAuthState(newState);
      setAuthState(newState);
      Storage.addLog('Auth', `Profile updated & Logged in as ${finalUser.position}`, finalUser.name);
      onAuthChange();
    } catch (err: any) {
      setError(`Failed to update profile: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poppoId) {
      setError('Please enter your Poppo ID first');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    try {
      const hosts = await FirebaseService.getAllHosts();
      const user = hosts.find(h => h.id === poppoId);
      
      if (!user) {
        setError('Poppo ID not found in roster');
        return;
      }

      await FirebaseService.createResetRequest({
        id: crypto.randomUUID(),
        poppoId: user.id,
        hostName: user.name,
        status: 'Pending',
        requestedAt: new Date().toISOString()
      });

      await FirebaseService.updateHost({
        ...user,
        reset_requested: true
      });

      setResetRequested(true);
    } catch (err: any) {
      setError(`Request failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authState.level > 0) {
    return <>{children}</>;
  }

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1117]">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 rounded-[20px] bg-indigo-500/20 flex items-center justify-center"
        >
          <div className="w-8 h-8 rounded-[10px] bg-indigo-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0F1117] relative overflow-hidden">
      {/* Background Blobs */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm glass p-8 rounded-[32px] border border-white/10 shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-3xl mx-auto mb-6 shadow-2xl shadow-purple-500/30 ring-4 ring-white/10">9</div>
          <h1 className="text-3xl font-black tracking-tight text-white">NINE <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">AGENCY</span></h1>
          <p className="text-white/40 text-sm mt-3 font-medium">Talent Management Ecosystem</p>
        </div>

        {step === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Poppo ID</label>
                <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"><User size={18} /></div>
                   <input 
                    type="text" 
                    value={poppoId}
                    onChange={(e) => setPoppoId(e.target.value)}
                    placeholder="E.g. 19157913"
                    className="w-full glass-input pl-12 py-3.5 text-sm font-bold tracking-widest text-center"
                    autoFocus
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Password</label>
                  <button 
                    type="button" 
                    onClick={() => setStep('forgot_pass')}
                    className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"><Lock size={18} /></div>
                   <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full glass-input pl-12 py-3.5 text-sm tracking-[0.5em] text-center"
                  />
                </div>
              </div>
            </div>
            {error && <p className="text-red-400 text-xs text-center font-bold animate-pulse">{error}</p>}
            <button type="submit" className="w-full btn-primary py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-transform">Authorize Portal</button>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest"><span className="bg-[#12141C] px-4 text-white/20">Director Portal</span></div>
            </div>

            <button 
              type="button" 
              onClick={handleGoogleSignIn}
              className="w-full glass py-3 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/5 transition-all group"
            >
              <Globe size={18} className="text-white/40 group-hover:text-cyan-400 transition-colors" />
              <span className="text-xs font-bold text-white/60 group-hover:text-white transition-colors">Verified Google Access</span>
            </button>
          </form>
        ) : step === 'change_pass' ? (
          <form onSubmit={handleChangePassword} className="space-y-6 animate-in slide-in-from-right-4 duration-500">
             <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 mb-6">
               <p className="text-[11px] text-indigo-300 font-bold leading-relaxed text-center">First login detected. For security, please establish a permanent password.</p>
             </div>
             <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full glass-input py-3.5 text-center text-sm font-bold tracking-widest"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Confirm Password</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full glass-input py-3.5 text-center text-sm font-bold tracking-widest"
                />
              </div>
            </div>
            {error && <p className="text-red-400 text-xs text-center font-bold">{error}</p>}
            <button type="submit" disabled={isSubmitting} className="w-full btn-primary py-4 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              Next: Profile Basics
            </button>
            <button type="button" onClick={() => setStep('login')} className="w-full text-[10px] font-bold text-white/20 hover:text-white transition-colors">Cancel & Return</button>
          </form>
        ) : step === 'fill_profile' ? (
          <form onSubmit={handleCompleteProfile} className="space-y-6 animate-in slide-in-from-right-4 duration-500">
             <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20 mb-6 text-center">
               <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest mb-1">Onboarding Profile</h3>
               <p className="text-[10px] text-cyan-200 font-bold leading-relaxed">Let's set up your agency identity. These details will be visible to management.</p>
             </div>
             
             <div className="space-y-4 max-h-[350px] overflow-y-auto px-1 custom-scrollbar">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Agency Nickname</label>
                 <input 
                   type="text" 
                   value={profileData.nickname}
                   onChange={(e) => setProfileData({ ...profileData, nickname: e.target.value })}
                   placeholder="Your display name"
                   className="w-full glass-input py-2.5 text-sm font-bold"
                   required
                 />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Team</label>
                   <input 
                     type="text" 
                     value={profileData.team}
                     onChange={(e) => setProfileData({ ...profileData, team: e.target.value })}
                     placeholder="e.g. Alpha"
                     className="w-full glass-input py-2.5 text-xs font-bold"
                   />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Manager</label>
                   <input 
                     type="text" 
                     value={profileData.manager}
                     onChange={(e) => setProfileData({ ...profileData, manager: e.target.value })}
                     placeholder="Your manager"
                     className="w-full glass-input py-2.5 text-xs font-bold"
                   />
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Short Bio</label>
                 <textarea 
                   value={profileData.description}
                   onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                   placeholder="A bit about yourself..."
                   className="w-full glass-input py-2.5 text-xs font-medium h-20 resize-none"
                 />
               </div>
             </div>

             {error && <p className="text-red-400 text-xs text-center font-bold">{error}</p>}
             <button type="submit" disabled={isSubmitting} className="w-full btn-primary py-4 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2">
               {isSubmitting && <Loader2 size={16} className="animate-spin" />}
               Complete Onboarding
             </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-6 animate-in slide-in-from-left-4 duration-500">
             <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 mb-6">
               <p className="text-[11px] text-amber-300 font-bold leading-relaxed text-center">
                 {resetRequested 
                   ? "Reset request submitted. Please contact Miss Nine or your Manager to receive a new temporary password."
                   : "Forgot your password? Enter your Poppo ID above and we'll send a priority reset request to Agency Leadership."}
               </p>
             </div>
             
             {!resetRequested ? (
               <>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Poppo ID</label>
                    <input 
                      type="text" 
                      value={poppoId}
                      onChange={(e) => setPoppoId(e.target.value)}
                      placeholder="E.g. 19157913"
                      className="w-full glass-input py-3.5 text-center text-sm font-bold tracking-widest"
                      autoFocus
                    />
                 </div>
                 {error && <p className="text-red-400 text-xs text-center font-bold">{error}</p>}
                 <button type="submit" disabled={isSubmitting} className="w-full btn-primary py-4 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2">
                   {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                   Request New Access
                 </button>
               </>
             ) : (
               <div className="flex justify-center">
                 <CheckCircle2 size={48} className="text-emerald-400 animate-bounce" />
               </div>
             )}
             
             <button type="button" onClick={() => { setStep('login'); setResetRequested(false); }} className="w-full text-[10px] font-bold text-white/20 hover:text-white transition-colors">Return to Login</button>
          </form>
        )}
      </motion.div>
      <div className="fixed bottom-8 text-[10px] font-black text-white/10 uppercase tracking-[0.3em]">NINE Dashboard v2.1.0</div>
    </div>
  );
};

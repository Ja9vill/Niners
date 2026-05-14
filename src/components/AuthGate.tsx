import React, { useState, useEffect } from 'react';
import { Lock, Unlock, LogOut, ChevronRight, User, Globe } from 'lucide-react';
import { Storage } from '../lib/storage';
import { Host } from '../types';
import { FirebaseService } from '../lib/firebaseService';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { auth, signInWithGoogle } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

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
  const [step, setStep] = useState<'login' | 'change_pass'>('login');
  const [userToUpdate, setUserToUpdate] = useState<Host | null>(null);
  const [error, setError] = useState('');
  const [firebaseUser, setFirebaseUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Director Master Login
    if ((DIRECTOR_IDS.includes(poppoId) || poppoId.toLowerCase() === 'director') && password === DIRECTOR_PASS) {
      const newState = { level: 2, role: 'Director', name: 'Director Miss Nine', poppo_id: '19157913' };
      Storage.setAuthState(newState);
      setAuthState(newState);
      Storage.addLog('Auth', 'Logged in as Director', 'Director Miss Nine');
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
      // If the email is the director email, automatically upgrade session
      if (auth.currentUser?.email === 'jwavpr@gmail.com') {
        const newState = { level: 2, role: 'Director', name: 'Director Miss Nine (Verified)', poppo_id: '19157913' };
        Storage.setAuthState(newState);
        setAuthState(newState);
        onAuthChange();
      }
    } catch (err: any) {
      setError(`Google Sign-In failed: ${err.message}`);
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

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    if (!userToUpdate) return;

    try {
      const updatedUser: Host = {
        ...userToUpdate,
        password: newPassword,
        is_temp_password: false,
        updated_at: new Date().toISOString()
      };

      await FirebaseService.updateHost(updatedUser);
      
      const level = ['Director', 'Head Admin', 'Admin', 'Manager'].includes(updatedUser.position) ? 1 : 0.5;
      const newState = { 
        level, 
        role: updatedUser.position, 
        name: updatedUser.name, 
        poppo_id: updatedUser.id,
        team: updatedUser.team,
        manager: updatedUser.manager,
        anchor_type: updatedUser.anchor_type
      };
      
      Storage.setAuthState(newState);
      setAuthState(newState);
      Storage.addLog('Auth', `Updated password & Logged in as ${updatedUser.position}`, updatedUser.name);
      onAuthChange();
    } catch (err: any) {
      setError(`Failed to update password: ${err.message}`);
    }
  };

  if (authState.level > 0) {
    return <>{children}</>;
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
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Password</label>
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
          </form>
        ) : (
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
            <button type="submit" className="w-full btn-primary py-4 text-sm font-black uppercase tracking-widest">Update & Login</button>
            <button type="button" onClick={() => setStep('login')} className="w-full text-[10px] font-bold text-white/20 hover:text-white transition-colors">Cancel & Return</button>
          </form>
        )}
      </motion.div>
      <div className="fixed bottom-8 text-[10px] font-black text-white/10 uppercase tracking-[0.3em]">NINE Dashboard v2.1.0</div>
    </div>
  );
};

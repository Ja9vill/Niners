import React, { useState, useEffect } from 'react';
import { Lock, User, CheckCircle2, Loader2 } from 'lucide-react';
import { Storage } from '../lib/storage';
import { motion } from 'motion/react';
import { loginWithPoppoId } from '../lib/authClient';

interface AuthGateProps {
  children: React.ReactNode;
  onAuthChange: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children, onAuthChange }) => {
  const [authState, setAuthState] = useState(Storage.getAuthState());
  const [password, setPassword] = useState('');
  const [poppoId, setPoppoId] = useState('');
  const [error, setError] = useState('');
  const [initializing, setInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const current = Storage.getAuthState();
    setAuthState(current);
    setInitializing(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!poppoId || !password) {
      setError('Both Poppo ID and Password are required.');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await loginWithPoppoId(poppoId, password);

      if (result.ok && result.user) {
        const u = result.user;
        const newState = {
          level: u.level,
          role: u.role,
          name: u.nickname || 'Member',
          poppo_id: u.poppo_id,
          nickname: u.nickname,
          position: u.position,
          status: u.status,
          manager_assigned: u.manager_assigned,
          anchor_team: u.anchor_team,
          profile_photo: u.profile_photo,
          token: u.token,
        };

        Storage.setAuthState(newState);
        setAuthState(newState);
        Storage.addLog('Auth', `Logged in as ${u.nickname} (${u.role})`, u.nickname);
        onAuthChange();
      } else {
        setError(result.error || 'Invalid Poppo ID or password.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || 'Login failed. Please verify connection and try again.');
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
          <div className="w-16 h-16 rounded-[20px] bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-2xl mx-auto mb-4 shadow-xl shadow-purple-500/20 ring-2 ring-white/10">9</div>
          <h1 className="text-2xl font-black tracking-tight text-white">NINE <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">AGENCY</span></h1>
          <p className="text-white/40 text-xs mt-2 font-medium uppercase tracking-widest">Member Portal Access</p>
        </div>

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
                  required
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
                  required
                />
              </div>
            </div>
          </div>
          {error && <p className="text-red-400 text-xs text-center font-bold animate-pulse">{error}</p>}
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full btn-primary py-4 text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            Authorize Portal
          </button>
        </form>
      </motion.div>
      <div className="fixed bottom-8 text-[10px] font-black text-white/10 uppercase tracking-[0.3em]">NINE Dashboard v2.2.0</div>
    </div>
  );
};

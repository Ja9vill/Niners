import React, { useState, useEffect } from 'react';
import { Lock, Mail, User } from 'lucide-react';
import { Storage } from '../lib/storage';
import { Host } from '../types';
import { FirebaseService } from '../lib/firebaseService';
import { motion } from 'motion/react';
import {
  auth,
  signInWithGoogle,
  signInWithEmail,
  signOutFirebase,
  friendlyAuthError,
} from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const DIRECTOR_IDS = ['19157913', '031907'];
const DIRECTOR_PASS = '031907';
const DIRECTOR_EMAIL = 'jwavpr@gmail.com';

interface AuthGateProps {
  children: React.ReactNode;
  onAuthChange: () => void;
}

type AuthMethod = 'poppo' | 'email';

const matchHostByEmail = (email: string | null | undefined): Host | undefined => {
  if (!email) return undefined;
  const target = email.trim().toLowerCase();
  return Storage.getHosts().find(h => (h as any).email && String((h as any).email).toLowerCase() === target);
};

const sessionForHost = (host: Host) => {
  const level = ['Director', 'Head Admin', 'Admin', 'Manager'].includes(host.position) ? 1 : 0.5;
  return {
    level,
    role: host.position,
    name: host.name,
    poppo_id: host.id,
    team: host.team,
    manager: host.manager,
    anchor_type: host.anchor_type,
  };
};

export const AuthGate: React.FC<AuthGateProps> = ({ children, onAuthChange }) => {
  const [authState, setAuthState] = useState(Storage.getAuthState());
  const [method, setMethod] = useState<AuthMethod>('poppo');
  const [password, setPassword] = useState('');
  const [poppoId, setPoppoId] = useState('');
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'login' | 'change_pass'>('login');
  const [userToUpdate, setUserToUpdate] = useState<Host | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  // Mirror Firebase auth state into the local session so members stay signed in
  // across reloads and the logout button truly logs them out.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const current = Storage.getAuthState();
      if (user) {
        if (current.level > 0) return;
        if (user.email && user.email.toLowerCase() === DIRECTOR_EMAIL) {
          const directorState = {
            level: 2,
            role: 'Director',
            name: 'Director Miss Nine (Verified)',
            poppo_id: '19157913',
          };
          Storage.setAuthState(directorState);
          setAuthState(directorState);
          Storage.addLog('Auth', 'Signed in as Director (Google)', directorState.name);
          onAuthChange();
          return;
        }
        const host = matchHostByEmail(user.email);
        if (host) {
          const memberState = sessionForHost(host);
          Storage.setAuthState(memberState);
          setAuthState(memberState);
          Storage.addLog('Auth', `Signed in as ${host.position}`, host.name);
          onAuthChange();
          return;
        }
        // Authenticated with Firebase but not on the roster — grant a basic
        // member session so they see a signed-in state instead of the gate.
        const memberState = {
          level: 0.5,
          role: 'Member',
          name: user.displayName || user.email || 'Member',
          poppo_id: '',
        };
        Storage.setAuthState(memberState);
        setAuthState(memberState);
        Storage.addLog('Auth', 'Signed in as Member', memberState.name);
        onAuthChange();
      } else if (current.level > 0 && current.role !== 'Director' && current.role !== 'Head Admin' && current.role !== 'Admin' && current.role !== 'Manager') {
        // Firebase signed us out — clear member sessions but leave the
        // POPPO-ID-only operator sessions alone.
        const cleared = { level: 0, role: '', name: '', poppo_id: '' };
        Storage.setAuthState(cleared);
        setAuthState(cleared);
        onAuthChange();
      }
    });
    return () => unsubscribe();
  }, [onAuthChange]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if ((DIRECTOR_IDS.includes(poppoId) || poppoId.toLowerCase() === 'director') && password === DIRECTOR_PASS) {
      const newState = { level: 2, role: 'Director', name: 'Director Miss Nine', poppo_id: '19157913' };
      Storage.setAuthState(newState);
      setAuthState(newState);
      Storage.addLog('Auth', 'Logged in as Director', 'Director Miss Nine');
      onAuthChange();
      return;
    }

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
        const newState = sessionForHost(user);
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
    setError('');
    setInfo('');
    setBusy(true);
    try {
      await signInWithGoogle();
      // onAuthStateChanged handles the session update.
    } catch (err: any) {
      setError(err?.message || 'Google Sign-In failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!email || !emailPassword) {
      setError('Enter both email and password.');
      return;
    }
    setBusy(true);
    try {
      await signInWithEmail(email.trim(), emailPassword);
      // onAuthStateChanged handles the session update.
    } catch (err: any) {
      const msg = err?.message || friendlyAuthError(err);
      if (msg) setError(msg);
    } finally {
      setBusy(false);
    }
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
        updated_at: new Date().toISOString(),
      };

      await FirebaseService.updateHost(updatedUser);

      const newState = sessionForHost(updatedUser);
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

  const tabBtn = (id: AuthMethod, label: string) => (
    <button
      type="button"
      onClick={() => { setMethod(id); setError(''); setInfo(''); }}
      className={
        'flex-1 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ' +
        (method === id
          ? 'bg-white/10 text-white shadow-inner'
          : 'text-white/30 hover:text-white/70')
      }
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0F1117] relative overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm glass p-8 rounded-[32px] border border-white/10 shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-3xl mx-auto mb-6 shadow-2xl shadow-purple-500/30 ring-4 ring-white/10">9</div>
          <h1 className="text-3xl font-black tracking-tight text-white">NINE <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">AGENCY</span></h1>
          <p className="text-white/40 text-sm mt-3 font-medium">Talent Management Ecosystem</p>
        </div>

        {step === 'login' ? (
          <>
            <div className="flex items-center gap-1 mb-6 p-1 bg-white/5 rounded-2xl border border-white/5">
              {tabBtn('poppo', 'POPPO ID')}
              {tabBtn('email', 'Member')}
            </div>

            {method === 'poppo' && (
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
            )}

            {method === 'email' && (
              <div className="space-y-5">
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Email</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"><Mail size={18} /></div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="member@example.com"
                        autoComplete="email"
                        className="w-full glass-input pl-12 py-3.5 text-sm text-center"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Password</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20"><Lock size={18} /></div>
                      <input
                        type="password"
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="w-full glass-input pl-12 py-3.5 text-sm tracking-[0.4em] text-center"
                      />
                    </div>
                  </div>
                  {error && <p className="text-red-400 text-xs text-center font-bold animate-pulse">{error}</p>}
                  {info && <p className="text-indigo-300 text-[11px] text-center font-medium">{info}</p>}
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full btn-primary py-3.5 text-sm font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 active:scale-95 transition-transform disabled:opacity-50"
                  >
                    {busy ? 'Signing In…' : 'Sign In With Email'}
                  </button>
                </form>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Or</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-white text-slate-900 font-bold text-sm hover:bg-white/90 transition-colors disabled:opacity-50 active:scale-95"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.96H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.04l3.007-2.333z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
                  </svg>
                  Continue with Google
                </button>

                <p className="text-[10px] text-white/30 text-center leading-relaxed">
                  Email accounts must already exist in Firebase Auth. Contact a director if you need access.
                </p>
              </div>
            )}
          </>
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

export const logoutMember = async () => {
  try {
    await signOutFirebase();
  } catch (err) {
    console.warn('Firebase signOut failed', err);
  }
};

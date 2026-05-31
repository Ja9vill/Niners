import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithGoogle, auth } from '../lib/firebase';
import { Storage } from '../lib/storage';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';
import appLogo from '../logo.jpg';

export const Login = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      const tokenResult = await result.user.getIdTokenResult();
      
      const role = (tokenResult.claims.role as string) || 'host';
      const level = role === 'director' ? 5 : role === 'manager' ? 4 : role === 'agent' ? 3 : 1;
      
      // Update global context/storage
      Storage.setAuthState({
        level,
        role,
        name: result.user.displayName || 'User',
        poppo_id: result.user.uid, 
      });

      navigate('/app/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#11111A] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6">
            <img src={appLogo} alt="Logo" className="w-12 h-12 rounded-xl" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-widest uppercase">Nine Dashboard</h1>
          <p className="text-sm text-slate-400 mt-2 font-medium">Agency Operations Center</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-red-400 shrink-0" size={20} />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-3"
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <Shield />}
          <span>Authenticate with Google</span>
        </button>
      </div>
    </div>
  );
};

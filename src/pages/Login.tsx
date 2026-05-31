import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Storage } from '../lib/storage';
import { PoppoAuthService } from '../lib/customAuth';
import appLogo from '../logo.jpg';

const TEXT = {
  title: 'NINERS APP',
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
};

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/app/dashboard';

  const [poppoId, setPoppoId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (Storage.getAuthState().level > 0) {
      navigate(from, { replace: true });
    }
  }, [navigate, from]);

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
        await authService.authenticateWithPoppo(trimmedPoppoId, trimmedPassword);
        success = true;
      } catch (err: any) {
        errorMsg = err.message || 'Invalid Poppo ID or Password';
        
        // Only retry with leading zero if the error is exactly about invalid credentials
        if (errorMsg === 'Invalid ID or password.' || errorMsg === 'Invalid Poppo ID or password.' || errorMsg === 'Invalid Poppo ID or Password') {
          // Retry with leading zeros logic
          if (trimmedPassword.startsWith('0')) {
            const stripped = trimmedPassword.replace(/^0+/, '');
            if (stripped !== '') {
              try {
                await authService.authenticateWithPoppo(trimmedPoppoId, stripped);
                success = true;
              } catch (err2: any) {
                errorMsg = err2.message || 'Invalid Poppo ID or Password';
              }
            }
          } else {
            try {
              await authService.authenticateWithPoppo(trimmedPoppoId, '0' + trimmedPassword);
              success = true;
            } catch (err3: any) {
              errorMsg = err3.message || 'Invalid Poppo ID or Password';
            }
          }
        }
      }

      if (success) {
        const newState = Storage.getAuthState();
        Storage.addLog('Auth', `Logged in as ${newState.nickname} (${newState.role})`, newState.nickname);
        navigate(from, { replace: true });
      } else {
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err?.message || 'Login failed. Please verify connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 bg-[#0A0A0F] relative overflow-hidden min-h-[100dvh]">
      <div className="w-full max-w-sm border border-[#D4AF37]/20 rounded-[24px] p-6 space-y-6 bg-[#1A1A28] shadow-2xl relative z-10 flex flex-col justify-between">
        
        {/* Top Header Grid line style */}
        <div className="border-b border-t border-white/5 py-3 flex items-center justify-center gap-2 shrink-0">
          <img src={appLogo} alt="Niners App Logo" className="h-6 w-6 rounded-md border border-[#D4AF37]/20 object-cover select-none pointer-events-none" />
          <span className="text-xs font-black tracking-[0.25em] text-[#D4AF37]">{TEXT.title}</span>
        </div>

        {/* Member Login Title Area */}
        <div className="flex flex-col items-center text-center space-y-3 py-2">
          <div className="flex items-center gap-2 text-white">
            <Shield className="text-[#D4AF37] w-6 h-6" strokeWidth={2} />
            <h1 className="text-lg font-black tracking-widest uppercase text-[#F0EFE8]">{TEXT.memberLogin}</h1>
          </div>
          <p className="text-[#A09E9A]/80 text-xs px-4 leading-relaxed font-medium">
            {TEXT.loginDescription}
          </p>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            
            {/* Poppo ID */}
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
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm font-bold tracking-widest focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 outline-none transition-all text-[#F0EFE8] placeholder-white/20"
                  autoFocus
                  required
                />
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
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm tracking-widest focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 outline-none transition-all text-[#F0EFE8] placeholder-white/20"
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
          
          {/* Action Button */}
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-[#D4AF37] text-black text-xs font-black uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:bg-[#c4a133] cursor-pointer"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin text-[#0D0D14]" />}
            {TEXT.logIn}
          </button>
        </form>

        {/* Links */}
        <div className="flex flex-col items-center space-y-2 pt-2 text-[10px] font-bold text-[#A09E9A]/60 tracking-wider">
          <button type="button" className="hover:text-[#D4AF37] hover:underline transition-all">{TEXT.forgotPassword}</button>
          <div className="flex items-center gap-1">
            <span>{TEXT.noAccount}</span>
            <button type="button" className="text-[#A09E9A] hover:text-[#D4AF37] hover:underline transition-all">{TEXT.contactAgency}</button>
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
  );
};

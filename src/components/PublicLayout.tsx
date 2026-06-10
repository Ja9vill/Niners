import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Trophy, Calendar, PlayCircle, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import appLogo from '../logo.jpg';
import { Storage } from '../lib/storage';

export const PublicLayout = ({ children }: { children?: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const authState = Storage.getAuthState();
  const isFooterPage = ['/', '/roster', '/calendar', '/poppo-live'].includes(location.pathname);
  const isLoggedIn = authState && authState.level > 0;

  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col overflow-hidden bg-[#0A0A0F] text-[#F0EFE8] font-sans selection:bg-[#D4AF37]/30 selection:text-white">
      {/* Native App Top Bar */}
      <header className="w-full flex items-center justify-between p-4 bg-[#0F0A06]/95 border-b border-[#D4AF37]/20 backdrop-blur-md shrink-0 z-50 shadow-[0_4px_20px_rgba(212,175,55,0.08)]">
        <div className="flex items-center gap-2 md:gap-3">
          <Link to="/" className="flex items-center gap-2 md:gap-3">
          <img 
            src={appLogo} 
            alt="Nine Talent Management" 
            className="w-8 h-8 rounded-md border border-white/10 shrink-0 object-cover" 
          />
          <div className="flex flex-col">
            <span className="font-black tracking-widest text-[#D4AF37] text-[11px] uppercase leading-tight">
              NINE TALENT MANAGEMENT
            </span>
            <span className="text-[10px] text-[#A09E9A]">Official Portal</span>
          </div>
          </Link>
        </div>
        {!isLoggedIn && (
          <Link 
            to="/login"
            className="px-4 py-1.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 text-[10px] font-bold uppercase tracking-widest hover:bg-[#D4AF37]/20 transition-colors"
          >
            Login
          </Link>
        )}
      </header>

      {/* Main Scrollable Content */}
      <main 
        className="flex-1 w-full overflow-y-auto custom-scrollbar relative" 
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {!isFooterPage && (
          <div className="w-full max-w-4xl mx-auto px-4 pt-4 md:pt-6 -mb-10 relative z-20">
            <button 
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-[#D4AF37] bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 border border-[#D4AF37]/20 hover:text-white rounded-full transition-all cursor-pointer shadow-sm text-[10px] font-bold uppercase tracking-widest"
              title="Go Back"
              type="button"
            >
              <ArrowLeft size={14} strokeWidth={2.5} />
              Back
            </button>
          </div>
        )}
        {children || <Outlet />}
      </main>

      {/* Floating Glassmorphism Bottom Nav */}
      <div className="fixed bottom-4 left-0 right-0 flex items-center justify-center gap-2 px-4 pb-safe z-50 pointer-events-none">
        {[
          { to: '/', icon: Home, label: 'Home' },
          { to: '/roster', icon: Trophy, label: 'Roster' },
          { to: '/calendar', icon: Calendar, label: 'Calendar' },
          { to: '/poppo-live', icon: PlayCircle, label: 'Poppo' },
        ].map(({ to, icon: Icon, label }) => {
          const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "pointer-events-auto flex flex-col items-center justify-center flex-1 py-2 rounded-xl transition-all duration-300 backdrop-blur-md border",
                isActive
                  ? "bg-[#1C120C]/90 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.25)] scale-105"
                  : "bg-[#0F0A06]/75 border-[#D4AF37]/20 text-[#A09E9A] hover:border-[#D4AF37]/50"
              )}
            >
              <Icon size={16} className={isActive ? "text-[#D4AF37]" : "text-[#A09E9A]"} />
              <span className={cn(
                "text-[8px] font-black uppercase tracking-wider mt-0.5",
                isActive ? "text-[#D4AF37]" : "text-[#A09E9A]"
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};


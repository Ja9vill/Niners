import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Trophy, Calendar, PlayCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import appLogo from '../logo.jpg';
import { Storage } from '../lib/storage';

export const PublicLayout = ({ children }: { children?: React.ReactNode }) => {
  const location = useLocation();
  const authState = Storage.getAuthState();
  const isLoggedIn = authState && authState.level > 0;

  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col overflow-hidden bg-transparent text-[#F0EFE8] font-sans selection:bg-[#D4AF37]/30 selection:text-white">
      {/* Native App Top Bar */}
      <header className="w-full bg-[#140E0A]/90 backdrop-blur-md border-b border-white/5 shrink-0 z-50">
        <div className="w-full px-4 h-14 flex items-center justify-between pt-[env(safe-area-inset-top)]">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src={appLogo} 
              alt="Nine Talent Management" 
              className="w-8 h-8 rounded-md border border-[#D4AF37]/30 shadow-md object-cover" 
            />
            <span className="font-black tracking-widest text-[#D4AF37] text-[11px] md:text-sm uppercase">
              NINE TALENT MANAGEMENT
            </span>
          </Link>
          {!isLoggedIn && (
            <Link 
              to="/login"
              className="px-4 py-1.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 text-[10px] font-bold uppercase tracking-widest"
            >
              Login
            </Link>
          )}
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main 
        className="flex-1 w-full overflow-y-auto pb-24 custom-scrollbar" 
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {children || <Outlet />}
      </main>

      {/* Floating Bottom Tab Bar */}
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
              <span className={cn("text-[8px] font-black uppercase tracking-wider mt-0.5", isActive ? "text-[#D4AF37]" : "text-[#A09E9A]")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};


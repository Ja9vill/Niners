import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Trophy, Users, Calendar, PlayCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import appLogo from '../logo.jpg';

export const PublicLayout = () => {
  const location = useLocation();

  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col overflow-hidden bg-[#0A0A0F] text-[#F0EFE8] font-sans selection:bg-[#D4AF37]/30 selection:text-white">
      {/* Native App Top Bar */}
      <header className="w-full bg-[#0A0A0F]/90 backdrop-blur-md border-b border-white/5 shrink-0 z-50">
        <div className="w-full px-4 h-14 flex items-center justify-between pt-[env(safe-area-inset-top)]">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src={appLogo} 
              alt="Nine Talent Management" 
              className="w-8 h-8 rounded-full border border-[#D4AF37]/30 shadow-md object-cover" 
            />
            <span className="font-black tracking-widest text-[#D4AF37] text-sm uppercase">
              NINE TALENT
            </span>
          </Link>
          <Link 
            to="/login"
            className="px-4 py-1.5 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 text-[10px] font-bold uppercase tracking-widest"
          >
            Login
          </Link>
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main 
        className="flex-1 w-full overflow-y-auto custom-scrollbar" 
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <Outlet />
      </main>

      {/* Native Bottom Tab Bar */}
      <footer className="shrink-0 z-40 w-full bg-[#11111A] border-t border-white/5 min-h-[56px] pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="w-full px-2 flex items-center justify-around">
          <Link 
            to="/roster" 
            className="flex flex-col items-center justify-center gap-1 text-[#A09E9A] hover:text-[#D4AF37] transition-colors flex-1 py-1"
          >
            <Trophy size={20} className={cn(location.pathname === '/roster' && 'text-[#D4AF37]')} />
            <span className={cn("text-[9px] font-bold uppercase tracking-wider", location.pathname === '/roster' && 'text-[#D4AF37]')}>Roster</span>
          </Link>
          <Link 
            to="/calendar" 
            className="flex flex-col items-center justify-center gap-1 text-[#A09E9A] hover:text-[#D4AF37] transition-colors flex-1 py-1"
          >
            <Calendar size={20} className={cn(location.pathname === '/calendar' && 'text-[#D4AF37]')} />
            <span className={cn("text-[9px] font-bold uppercase tracking-wider", location.pathname === '/calendar' && 'text-[#D4AF37]')}>Calendar</span>
          </Link>
          <Link 
            to="/poppo-live" 
            className="flex flex-col items-center justify-center gap-1 text-[#A09E9A] hover:text-[#D4AF37] transition-colors flex-1 py-1"
          >
            <PlayCircle size={20} className={cn(location.pathname === '/poppo-live' && 'text-[#D4AF37]')} />
            <span className={cn("text-[9px] font-bold uppercase tracking-wider", location.pathname === '/poppo-live' && 'text-[#D4AF37]')}>Poppo</span>
          </Link>
        </div>
      </footer>
    </div>
  );
};

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
    <div className="fixed inset-0 w-full h-[100dvh] flex flex-col overflow-hidden bg-transparent text-[#F0EFE8] font-sans selection:bg-[#D4AF37]/30 selection:text-white">
      {/* Mobile Top Bar (Matching Dashboard Mobile Header) */}
      <header className="global-block-1 !overflow-visible md:hidden flex items-center justify-between p-4 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
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
        <div className="flex items-center gap-2">
          {!isLoggedIn ? (
            <Link 
              to="/login"
              className="global-block-1 px-4 py-1.5 rounded-xl text-[#D4AF37] hover:text-[#D4AF37] hover:scale-105 text-[10px] font-bold uppercase tracking-widest transition-all"
            >
              Login
            </Link>
          ) : (
            <Link 
              to="/dashboard"
              className="global-block-1 px-4 py-1.5 rounded-xl text-[#D4AF37] hover:text-[#D4AF37] hover:scale-105 text-[10px] font-bold uppercase tracking-widest transition-all"
            >
              Dashboard
            </Link>
          )}
        </div>
      </header>

      {/* Desktop Top Bar (Matching Dashboard Desktop Header) */}
      <header className="hidden md:flex items-center justify-between px-8 py-4 bg-[#140E0A] border-b border-[#D4AF37]/10 shrink-0 z-20 h-16 animate-fadeIn">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src={appLogo} 
              alt="Nine Talent Management" 
              className="w-8 h-8 rounded-md border border-[#D4AF37]/30 shrink-0 object-cover" 
            />
            <div className="flex flex-col">
              <span className="font-black tracking-widest text-[#D4AF37] text-[11px] uppercase leading-tight">
                NINE TALENT MANAGEMENT
              </span>
              <span className="text-[10px] text-[#A09E9A]">Official Portal</span>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {[
              { to: '/', label: 'Home' },
              { to: '/roster', label: 'Roster' },
              { to: '/calendar', label: 'Calendar' },
              { to: '/poppo-live', label: 'Poppo' },
            ].map(({ to, label }) => {
              const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
                    isActive
                      ? "bg-[#D4AF37]/10 text-[#D4AF37]"
                      : "text-[#A09E9A] hover:text-[#D4AF37] hover:bg-white/[0.02]"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {!isLoggedIn ? (
            <Link 
              to="/login"
              className="global-block-1 px-4 py-1.5 rounded-xl text-[#D4AF37] hover:text-[#D4AF37] hover:scale-105 text-[10px] font-bold uppercase tracking-widest transition-all"
            >
              Login
            </Link>
          ) : (
            <Link 
              to="/dashboard"
              className="global-block-1 px-4 py-1.5 rounded-xl text-[#D4AF37] hover:text-[#D4AF37] hover:scale-105 text-[10px] font-bold uppercase tracking-widest transition-all"
            >
              Dashboard
            </Link>
          )}
        </div>
      </header>

      {/* Main Scrollable Content */}
      <main
        className="flex-1 w-full overflow-y-auto custom-scrollbar relative" 
        ref={el => { if (el) (el.style as any).WebkitOverflowScrolling = 'touch'; }}
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

      {/* Mobile Bottom Nav (Matching Dashboard Mobile Bottom Nav layout, colors, and styling) */}
      <div className="md:hidden fixed bottom-1 left-1.5 right-1.5 pb-safe z-50 pointer-events-none">
        <div className="global-block-1 rounded-2xl pointer-events-auto flex w-full items-center justify-between gap-1.5 p-2 transition-all duration-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/60 pointer-events-none z-0"></div>
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
                  "global-block-1 flex flex-col items-center justify-center flex-1 py-2 rounded-xl transition-all duration-300 relative z-10",
                  isActive
                    ? "active-tab border-[#D4AF37]/80 text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.4)] scale-[1.03]"
                    : "text-[#A09E9A] hover:text-[#D4AF37]"
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
    </div>
  );
};


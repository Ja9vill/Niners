import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, X, Instagram, Facebook, MessageCircle, Shield, Home, Trophy, UserPlus } from 'lucide-react';
import { cn } from '../lib/utils';
import appLogo from '../logo.jpg';

export const PublicLayout = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const location = useLocation();

  // Close drawer when route changes
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Become an Agent', path: '/become-an-agent', icon: UserPlus },
    { label: 'Leaderboards', path: '/leaderboards', icon: Trophy },
    { label: 'Agency Policy', path: '/policy', icon: Shield },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#0A0A0F] text-[#F0EFE8] font-sans selection:bg-[#D4AF37]/30 selection:text-white">
      {/* Global Header */}
      <header className="sticky top-0 z-50 w-full bg-[#0A0A0F]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src={appLogo} 
              alt="Nine Talent Management" 
              className="w-9 h-9 rounded-xl border border-[#D4AF37]/30 shadow-md object-cover group-hover:scale-105 transition-transform" 
            />
            <span className="font-black tracking-widest text-[#D4AF37] text-base uppercase">
              Nine Talent
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link 
                key={link.path} 
                to={link.path}
                className={cn(
                  "text-xs font-bold uppercase tracking-widest transition-colors hover:text-[#D4AF37]",
                  location.pathname === link.path ? "text-[#D4AF37]" : "text-[#A09E9A]"
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link 
              to="/login"
              className="px-5 py-2 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 text-xs font-bold uppercase tracking-widest hover:bg-[#D4AF37]/20 transition-all"
            >
              Sign In
            </Link>
          </nav>

          {/* Mobile Hamburger Toggle */}
          <button 
            className="md:hidden p-2 -mr-2 text-[#D4AF37]"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open Navigation Menu"
          >
            <Menu size={28} />
          </button>
        </div>
      </header>

      {/* Mobile Side-Drawer Overlay */}
      <div 
        className={cn(
          "fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          isDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsDrawerOpen(false)}
      />

      {/* Mobile Side-Drawer */}
      <aside 
        className={cn(
          "fixed top-0 right-0 h-[100dvh] w-3/4 max-w-sm bg-[#11111A] border-l border-white/5 z-[110] transform transition-transform duration-300 ease-in-out md:hidden flex flex-col shadow-2xl",
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 shrink-0">
          <span className="font-black tracking-widest text-[#D4AF37] text-sm uppercase">Menu</span>
          <button 
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 -mr-2 text-[#A09E9A] hover:text-white transition-colors"
            aria-label="Close Navigation Menu"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsDrawerOpen(false)}
                className={cn(
                  "flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-bold text-sm",
                  isActive 
                    ? "bg-[#D4AF37]/10 text-[#D4AF37]" 
                    : "text-[#A09E9A] hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon size={20} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5 shrink-0">
          <Link 
            to="/login"
            onClick={() => setIsDrawerOpen(false)}
            className="w-full flex items-center justify-center py-4 rounded-xl bg-[#D4AF37] text-black font-black uppercase tracking-widest text-sm active:scale-95 transition-transform shadow-[0_0_20px_rgba(212,175,55,0.3)]"
          >
            Dashboard Login
          </Link>
        </div>
      </aside>

      {/* Main Content Render */}
      <main className="flex-1 flex flex-col w-full">
        <Outlet />
      </main>

      {/* Sticky Mobile Channels Footer */}
      <footer className="sticky bottom-0 z-40 w-full bg-[#11111A] border-t border-white/5 pb-safe">
        <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-around">
          <a 
            href="https://wa.me/message/5Y6QFQXSIEZRI1" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 text-[#25D366] hover:scale-110 transition-transform flex-1"
          >
            <MessageCircle size={22} className="fill-current" />
            <span className="text-[9px] font-bold uppercase tracking-wider">WhatsApp</span>
          </a>
          <a 
            href="https://instagram.com/9talentManagement" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 text-[#E1306C] hover:scale-110 transition-transform flex-1"
          >
            <Instagram size={22} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Instagram</span>
          </a>
          <a 
            href="https://facebook.com/9talentManagement" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 text-[#1877F2] hover:scale-110 transition-transform flex-1"
          >
            <Facebook size={22} className="fill-current" />
            <span className="text-[9px] font-bold uppercase tracking-wider">Facebook</span>
          </a>
        </div>
      </footer>
    </div>
  );
};

import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Menu, X, LogOut, LayoutDashboard, Users, User, Shield, Calendar, DollarSign, Activity, FileText
} from 'lucide-react';
import { Storage } from '../lib/storage';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../lib/utils';
import appLogo from '../logo.jpg';

export const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const authState = Storage.getAuthState();

  const handleLogout = async () => {
    await signOut(auth);
    Storage.clearAuthState();
    navigate('/login');
  };

  const getNavigationLinks = () => {
    const links = [
      { path: '/app/dashboard', label: 'Overview', icon: LayoutDashboard },
      { path: '/app/roster', label: 'Roster', icon: Users },
      { path: '/app/calendar', label: 'Calendar', icon: Calendar },
    ];
    
    const role = (authState.role || '').toLowerCase();
    
    if (role === 'director' || role === 'admin' || role === 'head admin') {
      links.push({ path: '/app/director', label: 'Hub', icon: Shield });
      links.push({ path: '/app/profiles', label: 'Manager Hub', icon: Users });
      links.push({ path: '/app/my-profile', label: 'My Profile', icon: User });
    } else if (role === 'manager' || role === 'agent') {
      links.push({ path: '/app/profiles', label: 'Hub', icon: Users });
    } else {
      links.push({ path: '/app/my-profile', label: 'Profile', icon: User });
    }

    return links;
  };

  const links = getNavigationLinks();

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0A0A0F] text-[#F0EFE8] overflow-hidden selection:bg-[#D4AF37]/30 selection:text-white">
      {authState.mockRole && (
        <div className="w-full bg-indigo-600 text-white text-xs font-bold py-2 flex items-center justify-center gap-4 z-[9999] shrink-0 sticky top-0 shadow-lg">
          <span>Viewing as: <span className="uppercase text-amber-300">{authState.role}</span></span>
          <button 
            onClick={() => {
              Storage.setMockRole(null);
              window.location.reload();
            }}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md transition-colors"
          >
            Return to Director
          </button>
        </div>
      )}
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-[#11111A] border-b border-white/5 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <img src={appLogo} alt="Nine Dashboard" className="w-8 h-8 rounded-full border border-white/10 shrink-0" />
          <div className="flex flex-col">
            <h1 className="text-[11px] font-black uppercase tracking-widest text-[#F0EFE8] leading-tight">NINE TALENT MANAGEMENT</h1>
            <div className="text-[10px] text-[#A09E9A] capitalize">{authState.role || 'Guest'}</div>
          </div>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -mr-2 text-[#A09E9A] hover:text-white">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <aside className={cn(
          "absolute md:static inset-y-0 left-0 w-64 bg-[#11111A] border-r border-white/5 z-30 transition-transform duration-300 ease-in-out flex flex-col",
          !isSidebarOpen && "-translate-x-full md:translate-x-0"
        )}>
          <div className="p-6 hidden md:flex items-center gap-3 border-b border-white/5">
            <img src={appLogo} alt="Nine Dashboard" className="w-10 h-10 rounded-full border border-[#D4AF37]/30 shrink-0" />
            <div className="flex flex-col">
              <h1 className="text-[11px] font-black uppercase tracking-widest text-[#F0EFE8] leading-tight mt-1">NINE TALENT MANAGEMENT</h1>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-2">
            <div className="mb-6 px-2">
              <div className="text-sm font-bold truncate">{authState.name}</div>
              <div className="text-xs text-[#A09E9A] capitalize">{authState.role}</div>
            </div>

            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-bold text-sm",
                    isActive 
                      ? "bg-[#D4AF37]/10 text-[#D4AF37] shadow-[inset_0_0_12px_rgba(212,175,55,0.05)]" 
                      : "text-[#A09E9A] hover:bg-white/[0.02] hover:text-[#F0EFE8]"
                  )}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="p-4 border-t border-white/5">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-3 w-full text-left rounded-xl transition-all text-red-400 hover:bg-red-500/10 font-bold text-sm"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-[#0A0A0F]">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden h-16 bg-[#11111A] border-t border-white/5 flex items-center justify-around shrink-0 px-2 pb-safe z-20">
        {links.slice(0, 4).map(tab => {
          const Icon = tab.icon;
          const isActive = location.pathname.startsWith(tab.path);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn("flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative")}
            >
              <Icon size={18} className={isActive ? "text-[#D4AF37]" : "text-[#5A5865]"} />
              <span className={cn(
                "text-[8px] font-bold uppercase tracking-wider",
                isActive ? "text-[#D4AF37]" : "text-[#5A5865]"
              )}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  Users, 
  Calendar, 
  TrendingUp, 
  LayoutDashboard, 
  Lock, 
  BookOpen,
  ArrowUpRight,
  TrendingDown,
  History,
  Activity,
  ChevronRight,
  Bell,
  Trash2,
  CheckCircle2,
  Menu,
  X,
  Globe, 
  LogOut, 
  Unlock, 
  Loader2,
  Trophy,
  UserPlus,
  Shield
} from 'lucide-react';
import { AuthGate } from './components/AuthGate';
import { Storage } from './lib/storage';
import { FirebaseService } from './lib/firebaseService';
import { CommissionEntry, Host } from './types';
import { auth, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { INITIAL_HOSTS, INITIAL_COMMISSION, TIMELINE_DATA } from './lib/constants';
import { formatNumber, cn, formatDate, formatMonth } from './lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

// Imported components
import { ProfilesTab } from './components/ProfilesTab';
import { CalendarTab } from './components/CalendarTab';
import { DataReportingTab } from './components/DataReportingTab';
import { PrivacyTab } from './components/PrivacyTab';
import { TermsTab } from './components/TermsTab';
import { HomeTab } from './components/HomeTab';
import { BecomeAgentTab } from './components/BecomeAgentTab';
import { TalentManagementTab } from './components/TalentManagementTab';
import { EventsTab } from './components/EventsTab';
import { RoleBasedHub } from './components/RoleBasedHub';
import { MemberDashboardTab } from './components/MemberDashboardTab';

type Tab = 
  // Public Layer (Footer)
  'top-niners' | 'roster' | 'calendar' | 'become-agent' | 'member-dashboard' |
  // Legal
  'privacy' | 'terms';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('top-niners');
  const [authState, setAuthState] = useState(Storage.getAuthState());
  const [hosts, setHosts] = useState<Host[]>([]);
  const [commission, setCommission] = useState<CommissionEntry[]>([]);
  const [logs, setLogs] = useState(Storage.getLogs());
  const [notifications, setNotifications] = useState(Storage.getNotifications());
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [firebaseHosts, firebaseCommissions] = await Promise.all([
          FirebaseService.getAllHosts(),
          FirebaseService.getAllCommissions()
        ]);
        
        if (firebaseHosts.length > 0) {
          Storage.setHosts(firebaseHosts);
          setHosts(firebaseHosts);
        }
        
        if (firebaseCommissions.length > 0) {
          Storage.setCommission(firebaseCommissions);
          setCommission(firebaseCommissions);
        }
      } catch (err) {
        console.warn("Using local cache reference", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [authState.level]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
    const newState = { level: 0, role: '', name: '', poppo_id: '' };
    Storage.setAuthState(newState);
    setAuthState(newState);
    setActiveTab('top-niners');
  };

  const refreshState = async () => {
    setAuthState(Storage.getAuthState());
    const [firebaseHosts, firebaseCommissions] = await Promise.all([
      FirebaseService.getAllHosts(),
      FirebaseService.getAllCommissions()
    ]);
    setHosts(firebaseHosts);
    setCommission(firebaseCommissions);
    setLogs(Storage.getLogs());
    setNotifications(Storage.getNotifications());
  };

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    Storage.setNotifications(updated);
    setNotifications(updated);
  };

  const deleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    Storage.setNotifications(updated);
    setNotifications(updated);
  };

  const renderContent = () => {
    switch (activeTab) {
      // 1. Public Viewing Layers (No Login required, no edits allowed)
      case 'top-niners': 
        return <HomeTab hosts={hosts} commissions={commission} onOpenLogin={() => setActiveTab('member-dashboard')} />;
      case 'calendar': 
        return <CalendarTab />;
      case 'roster': 
        return <ProfilesTab />;
      case 'become-agent': 
        return <BecomeAgentTab />;
      
      // 2. Member Dashboard (With internal Auth control + multi-layer operations)
      case 'member-dashboard':
        return (
          <MemberDashboardTab 
            hosts={hosts}
            commissions={commission}
            onRefresh={refreshState}
            onLogout={handleLogout}
            OverviewTabComponent={OverviewTab}
          />
        );

      // Legal pages
      case 'privacy': 
        return <PrivacyTab />;
      case 'terms': 
        return <TermsTab />;
      default: 
        return <div className="p-12 text-center text-white/30 italic">Tab missing alignment</div>;
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-mesh relative">
      {/* HEADER BAR */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 glass border-b border-white/5 shrink-0 bg-[#07080d]/85">
        <div className="flex items-center gap-3">
          {/* Nine Talent Management — Clickable Logo/brand link returns to home */}
          <button 
            onClick={() => setActiveTab('top-niners')} 
            className="flex items-center gap-2 text-left hover:opacity-80 transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center font-black text-black select-none text-xs">
              9
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-white uppercase sm:text-base">MEMBER 9 NINE</h1>
              <p className="text-[9px] font-mono font-black text-indigo-400 tracking-wider">TALENT & COMMISSION ENGINE</p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications Trigger */}
          <div className="relative">
            <button 
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) markAllRead();
              }}
              className="relative p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              <Bell size={18} />
              {notifications.some(n => !n.read) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full" />
              )}
            </button>

            {/* Notifications Panel */}
            <AnimatePresence>
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-80 max-h-[360px] overflow-y-auto bg-[#0a0c14] border border-white/10 rounded-2xl p-4 shadow-2xl z-50 custom-scrollbar space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">Channel Updates</span>
                      <button onClick={markAllRead} className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300">Mark all read</button>
                    </div>
                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div key={n.id} className="p-3 bg-white/2 hover:bg-white/5 rounded-xl text-left border border-white/5 relative group transition-all">
                          <button onClick={() => deleteNotification(n.id)} className="absolute top-2 right-2 text-white/10 group-hover:text-red-400"><Trash2 size={10} /></button>
                          <h5 className="text-[11px] font-black text-white">{n.title}</h5>
                          <p className="text-[10px] text-slate-400 leading-normal mt-0.5">{n.message}</p>
                          <span className="text-[8px] font-mono text-slate-600 block mt-1.5">{new Date(n.timestamp).toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-8 text-white/20 text-xs italic">Inbox empty</p>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Authentication State button - clicking redirects directly inside member-dashboard tab form */}
          {authState.level > 0 ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveTab('member-dashboard')}
                className="flex items-center gap-3 hover:opacity-80 text-left transition-all"
              >
                <div className="text-right hidden sm:block">
                  <span className="block text-xs font-black text-white truncate max-w-[120px]">{authState.name}</span>
                  <span className="block text-[8px] font-mono font-black text-indigo-400 uppercase tracking-widest">{authState.role}</span>
                </div>
                {authState.profile_photo && (
                  <img src={authState.profile_photo} alt={authState.name} className="w-8 h-8 rounded-xl object-cover border border-white/10" referrerPolicy="no-referrer" />
                )}
              </button>
              <button 
                onClick={handleLogout}
                className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5 rounded-xl border-white/10 hover:border-red-500/30 hover:text-red-400"
              >
                <LogOut size={12} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setActiveTab('member-dashboard')}
              className="btn-primary px-4 py-2.5 text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 rounded-xl"
            >
              <Unlock size={14} />
              Portal Login
            </button>
          )}
        </div>
      </header>

      {/* RENDER LAYOUT WITH REMOVED LEGACY SIDEBAR */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* MAIN DISPLAY AREA (Added pb-24 to prevent bottom navigation overlap) */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-28 custom-scrollbar">
          {renderContent()}

          {/* Inline short credit and legal triggers at the very bottom of pages */}
          <div className="mt-12 pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-4 text-[10px] text-slate-500 font-bold px-4">
            <div className="flex gap-4">
              <button onClick={() => setActiveTab('privacy')} className="hover:text-white transition-colors">Privacy Policy</button>
              <button onClick={() => setActiveTab('terms')} className="hover:text-white transition-colors">Terms of Operations</button>
            </div>
            <div>© 2026 MEMBER 9 INC. ALL RIGHTS RESERVED.</div>
          </div>
        </main>
      </div>

      {/* FIXED FLOATING BOTTOM FOOTER MENU (5 Tabs available to public, styled beautifully) */}
      <footer className="fixed bottom-0 left-0 right-0 z-[100] bg-[#07080d]/92 backdrop-blur-xl border-t border-white/[0.08] px-4 py-2 sm:py-3 shrink-0">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-1">
          {[
            { id: 'top-niners', label: 'Home', icon: Trophy },
            { id: 'roster', label: 'Roster', icon: Users },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
            { id: 'become-agent', label: 'Recruit', icon: UserPlus },
            { id: 'member-dashboard', label: 'Portal', icon: LayoutDashboard }
          ].map((tabItem) => {
            const Icon = tabItem.icon;
            const isActive = activeTab === tabItem.id;
            return (
              <button
                key={tabItem.id}
                id={`footer-tab-${tabItem.id}`}
                onClick={() => setActiveTab(tabItem.id as any)}
                style={{ minHeight: '44px', minWidth: '44px' }}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-1 rounded-2xl transition-all cursor-pointer",
                  isActive 
                    ? "text-indigo-400 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.1)] font-extrabold scale-102" 
                    : "text-slate-500 hover:text-white"
                )}
              >
                <Icon size={18} className={cn("mb-1 transition-transform", isActive && "scale-105")} />
                <span className="text-[9px] tracking-wider truncate font-bold uppercase block">
                  {tabItem.label}
                </span>
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}

// INLINE OPERATIONAL ANALYTICS DASHBOARD
interface OverviewTabProps {
  commissions: CommissionEntry[];
  hosts: Host[];
}

const OverviewTab: React.FC<OverviewTabProps> = ({ commissions, hosts }) => {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const years = useMemo(() => {
    return Array.from(new Set(commissions.map(c => c.month.split('-')[0]))).sort().reverse();
  }, [commissions]);

  const rawMonths = useMemo(() => {
    return Array.from(new Set(commissions.map(c => c.month))).sort().reverse();
  }, [commissions]);

  const filteredData = useMemo(() => {
    return commissions.filter(c => {
      const yr = c.month.split('-')[0];
      const matchesYear = selectedYear === 'all' || yr === selectedYear;
      const matchesMonth = selectedMonth === 'all' || c.month === selectedMonth;
      return matchesYear && matchesMonth;
    });
  }, [commissions, selectedYear, selectedMonth]);

  const stats = useMemo(() => {
    const totalPoints = filteredData.reduce((sum, c) => sum + (c.total_points || 0), 0);
    const activeMonths = Array.from(new Set(filteredData.map(c => c.month))).length;
    const peakRecord = filteredData.length > 0 ? Math.max(...filteredData.map(c => c.total_points || 0)) : 0;
    
    return {
      totalPoints,
      activeMonths,
      totalHosts: hosts.length,
      peakRecord
    };
  }, [filteredData, hosts]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Analytics Overview</h2>
          <p className="text-xs text-slate-500 font-medium">Monthly live performance points totals, agency volume, and individual performance benchmarks.</p>
        </div>
        
        {/* FILTERS */}
        <div className="flex flex-wrap gap-3">
          <select 
            value={selectedYear}
            onChange={(e) => { setSelectedYear(e.target.value); setSelectedMonth('all'); }}
            className="bg-slate-900 border border-slate-800 text-xs font-bold text-white px-3 py-2 rounded-xl outline-none"
          >
            <option value="all">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs font-bold text-white px-3 py-2 rounded-xl outline-none"
          >
            <option value="all">All Months</option>
            {rawMonths.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
          </select>
        </div>
      </div>

      {/* BENCHMARK GRID UNITS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Agency Total Points', value: formatNumber(stats.totalPoints), sub: 'points', color: 'text-indigo-400' },
          { label: 'Active Months', value: stats.activeMonths, sub: 'reporting cycles', color: 'text-pink-400' },
          { label: 'Total Hosts', value: stats.totalHosts, sub: 'registered talent', color: 'text-emerald-400' },
          { label: 'Peak Period Month Record', value: formatNumber(stats.peakRecord), sub: 'gifting', color: 'text-amber-500' }
        ].map((item, i) => (
          <div key={i} className="glass-card flex flex-col justify-between">
             <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{item.label}</span>
             <div className="flex items-baseline gap-1 mt-3">
                <span className={cn("text-xl sm:text-2xl font-black", item.color)}>{item.value}</span>
                <span className="text-[10px] font-mono text-slate-600 uppercase font-black">{item.sub}</span>
             </div>
          </div>
        ))}
      </div>

      {/* RECHARTS PLOT */}
      <div className="glass-card !p-6 space-y-4">
        <h3 className="text-xs font-black text-white/50 uppercase tracking-widest">Monthly Gifting Gaps & Timeline Progress Curve</h3>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredData}>
              <XAxis dataKey="month" tickFormatter={formatMonth} stroke="rgba(255,255,255,0.2)" fontSize={9} />
              <YAxis tickFormatter={formatNumber} stroke="rgba(255,255,255,0.2)" fontSize={9} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#07090f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px' }}
                labelStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}
              />
              <Bar dataKey="total_points" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

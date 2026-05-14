import React, { useState, useEffect } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { AuthGate } from './components/AuthGate';
import { Storage } from './lib/storage';
import { FirebaseService } from './lib/firebaseService';
import { CommissionEntry, Host } from './types';
import { auth, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { INITIAL_HOSTS, INITIAL_COMMISSION, TIMELINE_DATA } from './lib/constants';
import { formatNumber, cn, formatDate } from './lib/utils';
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
import { Globe, LogOut, Unlock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { RosterTab } from './components/RosterTab';
import { ProfilesTab } from './components/ProfilesTab';
import { TrendsTab } from './components/TrendsTab';
import { CalendarTab } from './components/CalendarTab';
import { DirectorTab } from './components/DirectorTab';
import { GlossaryTab } from './components/GlossaryTab';
import { DataReportingTab } from './components/DataReportingTab';

type Tab = 'overview' | 'roster' | 'profiles' | 'trends' | 'calendar' | 'dashboard' | 'reporting' | 'glossary';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [authState, setAuthState] = useState(Storage.getAuthState());
  const [hosts, setHosts] = useState<Host[]>([]);
  const [commission, setCommission] = useState<CommissionEntry[]>([]);
  const [logs, setLogs] = useState(Storage.getLogs());
  const [notifications, setNotifications] = useState(Storage.getNotifications());
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(auth.currentUser);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Initialize data from Firebase
  useEffect(() => {
    const loadData = async () => {
      if (authState.level === 0) return;
      
      setIsLoading(true);
      try {
        const [firebaseHosts, firebaseCommissions] = await Promise.all([
          FirebaseService.getAllHosts(),
          FirebaseService.getAllCommissions()
        ]);
        
        Storage.setHosts(firebaseHosts);
        Storage.setCommission(firebaseCommissions);
        
        setHosts(firebaseHosts);
        setCommission(firebaseCommissions);
      } catch (err) {
        console.warn("Could not sync with cloud database. Local storage will be used if available.", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [authState.level]);

  const handleLogout = async () => {
    await signOut(auth);
    const newState = { level: 0, role: '', name: '', poppo_id: '' };
    Storage.setAuthState(newState);
    setAuthState(newState);
  };

  const handleGoogleSignIn = async () => {
    setIsSyncingCloud(true);
    try {
      const result = await signInWithGoogle();
      if (result && auth.currentUser?.email === 'jwavpr@gmail.com') {
        const newState = { level: 2, role: 'Director', name: 'Director Miss Nine (Verified)', poppo_id: '19157913' };
        Storage.setAuthState(newState);
        setAuthState(newState);
      }
    } catch (err: any) {
      alert(err.message || "Google Sign-In failed.");
    } finally {
      setIsSyncingCloud(false);
    }
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
      case 'overview': return <OverviewTab commissions={commission} hosts={hosts} />;
      case 'roster': return <RosterTab />;
      case 'profiles': return <ProfilesTab />;
      case 'trends': return <TrendsTab />;
      case 'calendar': return <CalendarTab />;
      case 'dashboard': return <DirectorTab />;
      case 'reporting': return <DataReportingTab />;
      case 'glossary': return <GlossaryTab />;
      default: return (
        <div className="flex items-center justify-center h-64 text-white/30 italic">
          Section not found
        </div>
      );
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'roster', label: 'Roster', icon: Users },
    { id: 'profiles', label: 'Profiles', icon: ArrowUpRight },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
    { id: 'calendar', label: 'Events', icon: Calendar },
    { id: 'reporting', label: 'Reporting', icon: Activity },
    { id: 'dashboard', label: 'Director Hub', icon: Lock, protected: true },
    { id: 'glossary', label: 'Glossary', icon: BookOpen },
  ];

  return (
    <AuthGate onAuthChange={refreshState}>
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 shrink-0 bg-[#0F1117]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 pr-6 border-r border-slate-800">
              <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">9</div>
              <h1 className="text-lg font-bold tracking-tight text-white hidden sm:block">NINE <span className="text-slate-500 font-normal">TALENT</span></h1>
            </div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-400">
              {navItems.find(n => n.id === activeTab)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-6">
            {!firebaseUser && authState.role === 'Director' && (
              <button 
                onClick={handleGoogleSignIn}
                disabled={isSyncingCloud}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 hover:bg-indigo-500/20 transition-all disabled:opacity-50"
              >
                {isSyncingCloud ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
                {isSyncingCloud ? 'SYNCING...' : 'SYNC CLOUD'}
              </button>
            )}

            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-full hover:bg-white/5 transition-colors text-slate-400 hover:text-indigo-400"
              >
                <Bell size={20} />
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0F1117] shadow-lg shadow-red-500/20" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-[80]" onClick={() => setShowNotifications(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-80 glass-card z-[90] p-0 overflow-hidden border-white/10 shadow-2xl"
                    >
                      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Notifications</h3>
                        <button onClick={markAllRead} className="text-[10px] text-indigo-400 font-bold hover:underline">Mark all read</button>
                      </div>
                      <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {notifications.length > 0 ? (
                          notifications.map((n) => (
                            <div key={n.id} className={cn(
                              "p-4 border-b border-white/5 hover:bg-white/5 transition-colors relative group",
                              !n.read && "bg-indigo-500/5"
                            )}>
                              <div className="flex gap-3">
                                <div className={cn(
                                  "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                  n.type === 'success' ? "bg-emerald-500" : 
                                  n.type === 'warning' ? "bg-amber-500" :
                                  n.type === 'error' ? "bg-red-500" : "bg-indigo-400"
                                )} />
                                <div className="space-y-1 pr-6">
                                  <p className="text-xs font-bold text-white/90">{n.title}</p>
                                  <p className="text-[11px] text-white/50 leading-relaxed">{n.message}</p>
                                  <p className="text-[9px] text-white/20 font-mono">{formatDate(n.timestamp)}</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => deleteNotification(n.id)}
                                className="absolute right-2 top-2 p-1 text-white/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="p-12 text-center">
                            <Bell size={24} className="mx-auto text-white/10 mb-2" />
                            <p className="text-xs text-white/20 italic">No notifications yet</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest leading-none mb-1">
                {authState.role}
              </span>
              <span className="text-xs text-slate-100">{authState.name}</span>
            </div>
            
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-white/5 rounded-full transition-all text-white/30 hover:text-red-400"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Vertical Sidebar */}
          <nav className="w-64 border-r border-slate-800 flex flex-col p-4 gap-1 bg-[#0F1117] shrink-0">
            <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] px-3 mb-2 mt-4">Command Center</div>
            {navItems.map(item => {
              const Icon = item.icon;
              const isProtected = item.protected && authState.level < 2;
              return (
                <button
                  key={item.id}
                  onClick={() => !isProtected && setActiveTab(item.id as Tab)}
                  disabled={isProtected}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all relative whitespace-nowrap text-left",
                    activeTab === item.id 
                      ? "nav-item-active" 
                      : "nav-item-inactive",
                    isProtected && "opacity-20 cursor-not-allowed grayscale"
                  )}
                >
                  <Icon size={18} strokeWidth={activeTab === item.id ? 2.5 : 2} className={cn(activeTab === item.id ? "text-indigo-400" : "text-slate-500")} />
                  <span className="flex-1">{item.label}</span>
                  {item.protected && authState.level < 2 && <Lock size={12} className="opacity-50" />}
                </button>
              );
            })}
            
            <div className="mt-auto border-t border-slate-800 pt-4 pb-2">
              <div className="px-3 py-2 rounded text-xs text-slate-500 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Connection Stable
              </div>
            </div>
          </nav>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto bg-[#0A0B0E] p-8 custom-scrollbar relative">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div 
                  key="loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0A0B0E] z-10"
                >
                  <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Establishing Secure Uplink</p>
                </motion.div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-6xl mx-auto"
                >
                  {renderContent()}
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>

        {/* Footer */}
        <footer className="h-10 bg-[#0A0B0E] border-t border-slate-800 flex items-center justify-between px-8 text-[10px] text-slate-500 shrink-0 uppercase tracking-widest font-mono">
          <div className="flex items-center gap-4">
            <span>System Pulse: <span className="text-emerald-500">Stable</span></span>
            <span className="hidden sm:inline opacity-30">•</span>
            <span className="hidden sm:inline">Database Latency: 14ms</span>
          </div>
          <div>© 2026 NINE Talent Mgmt — Leadership Access Only</div>
        </footer>
      </div>
    </AuthGate>
  );
}

// Sub-components (Tabs)
const OverviewTab = ({ commissions, hosts }: { commissions: CommissionEntry[], hosts: Host[] }) => {
  const auth = Storage.getAuthState();
  const logs = Storage.getLogs();
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const availableMonths = React.useMemo(() => {
    const months = Array.from(new Set(commissions.map(c => c.month)));
    return months.sort().reverse();
  }, [commissions]);

  const filteredCommissions = React.useMemo(() => {
    if (selectedFilter === 'all') return commissions;
    return commissions.filter(c => c.month === selectedFilter);
  }, [commissions, selectedFilter]);

  const totalCommissionPoints = filteredCommissions.reduce((sum, c) => sum + c.total_points, 0);
  const activeMonths = new Set(filteredCommissions.map(c => c.month)).size;
  const peakMonthEntry = [...filteredCommissions].sort((a, b) => b.total_points - a.total_points)[0];

  const hostRankings = React.useMemo(() => {
    return hosts.map(h => {
      const hostComms = filteredCommissions.filter(c => c.poppo_id === h.id);
      const totalPts = hostComms.reduce((sum, c) => sum + (c.total_points || 0), 0);
      const monthsActive = hostComms.length;
      return {
        ...h,
        totalPoints: totalPts,
        monthsActive
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [hosts, filteredCommissions]);

  const aggregatedData = React.useMemo(() => {
    const grouped = commissions.reduce((acc: Record<string, number>, curr) => {
      acc[curr.month] = (acc[curr.month] || 0) + curr.total_points;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [commissions]);

  const kpis = [
    { 
      label: 'Agency Total Points', 
      value: totalCommissionPoints > 0 ? `${(totalCommissionPoints / 1000000).toFixed(1)}M pts` : '0 pts', 
      icon: DollarSign, 
      protected: true 
    },
    { 
      label: 'Active Months', 
      value: `${activeMonths} Months`, 
      icon: Calendar 
    },
    { 
      label: 'Total Hosts', 
      value: hosts.length.toString(), 
      icon: Users 
    },
    { 
      label: 'Peak Period', 
      value: peakMonthEntry ? formatDate(peakMonthEntry.month) : 'N/A', 
      subValue: peakMonthEntry ? `${(peakMonthEntry.total_points / 1000000).toFixed(1)}M pts` : '', 
      icon: TrendingUp 
    },
  ];

  const sortedHosts = [...hostRankings].slice(0, 10).sort((a, b) => {
    if (!sortConfig) return 0;
    
    let aVal: any = a[sortConfig.key as keyof typeof a];
    let bVal: any = b[sortConfig.key as keyof typeof b];

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column) return <span className="opacity-0 group-hover:opacity-100 ml-1">⇅</span>;
    return sortConfig.direction === 'asc' ? <span className="ml-1 text-indigo-400">↑</span> : <span className="ml-1 text-indigo-400">↓</span>;
  };

  if (hosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
        <LayoutDashboard size={64} className="text-white/5" />
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white/50">Agency Overview Empty</h3>
          <p className="text-sm text-white/20 max-w-sm mx-auto leading-relaxed">
            There is currently no data in the system. Go to the <span className="text-indigo-400 font-bold">Director Hub</span> to upload your first MasterSheet and initialize the dashboard.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
            <div className="w-1/3 h-full bg-indigo-500/50 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="glass-card flex items-center justify-between group">
            <div>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em]">{kpi.label}</p>
              <div className="mt-1 flex items-baseline gap-2">
                {kpi.protected && auth.level < 2 ? (
                  <div className="flex items-center gap-2 text-white/20">
                    <span className="text-xl font-bold blur-sm select-none">XXXXXX</span>
                    <Lock size={14} />
                  </div>
                ) : (
                  <h3 className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                    {kpi.value}
                  </h3>
                )}
                {kpi.subValue && <span className="text-xs text-cyan-400 font-medium">{kpi.subValue}</span>}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center transition-colors group-hover:bg-indigo-500/20">
              <kpi.icon size={18} className="text-white/20 group-hover:text-indigo-400 transition-colors" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Commission Timeline */}
        <div className="lg:col-span-2 glass-card space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Activity size={18} className="text-purple-400" />
              Commission Timeline
              {auth.level < 2 && <Lock size={14} className="text-white/20 ml-2" />}
            </h3>
            <div className="flex items-center gap-4 text-xs font-medium uppercase tracking-tighter text-white/30">
              <span>Aug 2025</span>
              <ChevronRight size={12} />
              <span>Apr 2026</span>
            </div>
          </div>

          <div className="h-64 w-full">
            {auth.level < 2 ? (
              <div className="w-full h-full flex flex-col items-center justify-center glass rounded-xl border border-dashed border-white/10 gap-3">
                <Lock size={24} className="text-white/20" />
                <p className="text-white/30 text-sm">Director authentication required to view financials</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={aggregatedData.map(c => ({
                  month: formatDate(c.month),
                  value: c.value
                }))}>
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="glass p-3 rounded-lg border border-white/10 shadow-xl">
                            <p className="text-xs text-white/50 mb-1">{payload[0].payload.month}</p>
                            <p className="text-sm font-bold text-cyan-400">{formatNumber(payload[0].value as number)} pts</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {aggregatedData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill="#8b5cf6" fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-4 border-t border-white/5">
             <div className="flex items-center justify-between text-xs font-semibold text-white/30 uppercase tracking-widest mb-4">
              <span>Growth Phase</span>
              <span>2025 - 2026</span>
             </div>
             <div className="relative h-2 bg-white/5 rounded-full flex items-center">
                <div className="absolute left-0 w-[10%] h-full bg-slate-500 rounded-full" />
                <div className="absolute left-[10%] w-[20%] h-full bg-purple-500 shadow-[0_0_15px_rgba(139,92,246,0.5)]" />
                <div className="absolute left-[30%] w-[30%] h-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
                <div className="absolute left-[60%] w-[40%] h-full bg-emerald-500 rounded-r-full" />

                <div className="absolute top-4 left-0 text-[10px] text-white/40">Dormant (Jan-Jul)</div>
                <div className="absolute top-4 left-[20%] text-[10px] text-white/40">Soft Launch (Aug)</div>
                <div className="absolute top-4 left-[40%] text-[10px] text-cyan-400 font-bold">Explosive (Sep)</div>
                <div className="absolute top-4 right-0 text-[10px] text-emerald-400">Stabilization</div>
             </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="glass-card flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <History size={18} className="text-amber-400" />
              Activity Log
            </h3>
            <button className="text-xs font-bold text-cyan-400 hover:underline">Show All</button>
          </div>
          <div className="space-y-4 overflow-y-auto max-h-[350px] pr-2 custom-scrollbar">
            {logs.slice(0, 15).map((log, i) => (
              <div key={log.id} className="flex gap-3 text-sm border-b border-white/5 pb-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs">
                  {log.type === 'Auth' ? '🔐' : '📝'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 line-clamp-2 leading-snug">{log.action}</p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-medium text-white/40 uppercase">
                    <span className="text-cyan-400/70">{log.user}</span>
                    <span>•</span>
                    <span>{formatDate(log.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-center py-12 text-white/20 italic">No recent activity detected</div>
            )}
          </div>
        </div>
      </div>
      
       {/* Ranking Table */}
      <div className="glass-card">
         <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
               <TrendingUp size={18} className="text-[#ec4899]" />
               Agency Contributors Ranking
               {auth.level < 2 && <Lock size={14} className="text-white/20 ml-2" />}
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">Period:</span>
              <select 
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="all">🏆 All-Time Record</option>
                {availableMonths.map(month => (
                  <option key={month} value={month}>{formatDate(month)}</option>
                ))}
              </select>
            </div>
         </div>
         {auth.level < 2 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-white/20">
               <Lock size={40} strokeWidth={1} />
               <p className="text-white/40">Authenticated access required to view ranking data</p>
            </div>
         ) : (
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="border-b border-white/10 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                   <th className="px-4 py-3 cursor-pointer group hover:text-white transition-colors" onClick={() => requestSort('rank')}>
                     Rank <SortIcon column="rank" />
                   </th>
                   <th className="px-4 py-3 cursor-pointer group hover:text-white transition-colors" onClick={() => requestSort('id')}>
                     POPPO ID <SortIcon column="id" />
                   </th>
                   <th className="px-4 py-3 cursor-pointer group hover:text-white transition-colors" onClick={() => requestSort('name')}>
                     Name <SortIcon column="name" />
                   </th>
                   <th className="px-4 py-3 text-right cursor-pointer group hover:text-white transition-colors" onClick={() => requestSort('totalPoints')}>
                     Points <SortIcon column="totalPoints" />
                   </th>
                   <th className="px-4 py-3 text-right cursor-pointer group hover:text-white transition-colors" onClick={() => requestSort('commission')}>
                     Rate <SortIcon column="commission" />
                   </th>
                   <th className="px-4 py-3 text-center cursor-pointer group hover:text-white transition-colors" onClick={() => requestSort('monthsActive')}>
                     Freq <SortIcon column="monthsActive" />
                   </th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {sortedHosts.map((host, i) => (
                    <tr key={host.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-4 py-4 font-bold text-white/50 text-base">#{hostRankings.indexOf(host) + 1}</td>
                      <td className="px-4 py-4 font-mono text-xs text-cyan-400/60">{host.id}</td>
                      <td className="px-4 py-4 font-bold text-white/90">{host.name}</td>
                      <td className="px-4 py-4 text-right font-mono text-sm text-emerald-400">
                        {formatNumber(host.totalPoints)} pts
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-[10px] text-white/40">{host.base_salary_category}</td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold">{host.monthsActive}</span>
                      </td>
                    </tr>
                 ))}
                 {sortedHosts.length === 0 && (
                   <tr>
                     <td colSpan={6} className="py-20 text-center text-white/20 italic">No rankings available for this period</td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
         )}
      </div>
    </div>
  );
};

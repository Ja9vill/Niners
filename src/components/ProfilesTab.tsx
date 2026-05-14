import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, TrendingUp, BarChart3, PieChart, Info, UserPen, Target, Plus, ChevronRight, X, Shield, Edit2, Loader2 } from 'lucide-react';
import { Host, Tier, BaseSalaryTier, HostStatus, AnchorType, PerformanceGoal, Position, CommissionEntry } from '../types';
import { Storage } from '../lib/storage';
import { FirebaseService } from '../lib/firebaseService';
import { cn, formatNumber } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { MANAGERS, BASE_SALARY_POLICIES } from '../lib/constants';

const POSITIONS: Position[] = ['Talent', 'Manager', 'Admin', 'Head Admin', 'Director', 'Sub Agent', 'Police Admin'];
const STATUSES: HostStatus[] = ['Active', 'Inconsistent', 'Released', 'Inactive'];
const ANCHORS: AnchorType[] = ['Nine Agency', 'Sub Agency', 'External'];
const TEAMS = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Director Only'];
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts';

export const ProfilesTab = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);
  const [isManagingGoals, setIsManagingGoals] = useState(false);
  const [isEditingHost, setIsEditingHost] = useState(false);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  
  // Filters
  const [tierFilter, setTierFilter] = useState<Tier[]>([]);
  const [salaryFilter, setSalaryFilter] = useState<BaseSalaryTier[]>([]);
  
  const auth = Storage.getAuthState();

  React.useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await FirebaseService.getAllHosts();
        setHosts(data);
      } catch (err) {
        console.error("Failed to load profiles:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();

    const handleDataUpdate = () => {
      load();
    };

    window.addEventListener('data-updated', handleDataUpdate);
    return () => window.removeEventListener('data-updated', handleDataUpdate);
  }, []);

  const checkPassword = (type: 'Director' | 'Leadership') => {
    const password = prompt(`Which password are you using: 031907 or 19381364?`);
    const expected = type === 'Director' ? '031907' : '19381364';
    if (password === expected) return true;
    alert('Access Denied: Incorrect password for this role.');
    return false;
  };

  const filteredGrid = useMemo(() => {
    return hosts.filter(h => {
        const matchesSearch = h.id === searchTerm || h.name.toLowerCase().includes(searchTerm.toLowerCase()) || (h.nickname?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesTier = tierFilter.length === 0 || tierFilter.includes(h.tier);
        const matchesSalary = salaryFilter.length === 0 || salaryFilter.includes(h.base_salary_category);
        return matchesSearch && matchesTier && matchesSalary;
    }).sort((a, b) => {
        const tiers: Tier[] = ['S', 'A', 'B', 'C', 'X'];
        return tiers.indexOf(a.tier) - tiers.indexOf(b.tier);
    });
  }, [hosts, searchTerm, tierFilter, salaryFilter]);

  const selectedHost = useMemo(() => hosts.find(h => h.id === selectedHostId), [hosts, selectedHostId]);
  const goals = useMemo(() => selectedHost ? Storage.getGoals(selectedHost.id) : [], [selectedHost, selectedHostId]);
  const [commissions, setCommissions] = useState<CommissionEntry[]>([]);
  const [isLoadingCommissions, setIsLoadingCommissions] = useState(false);

  useEffect(() => {
    if (selectedHostId) {
      setIsLoadingCommissions(true);
      FirebaseService.getAllCommissions().then(all => {
        const hostComms = all.filter(c => c.poppo_id === selectedHostId)
          .sort((a, b) => a.month.localeCompare(b.month));
        setCommissions(hostComms);
        setIsLoadingCommissions(false);
      });
    } else {
      setCommissions([]);
    }
  }, [selectedHostId]);

  const stats = useMemo(() => {
    if (commissions.length === 0) return { total: 0, avgHrs: 0, avgPtsHr: 0, bestMonth: 0, livePct: 0, commPct: 0 };
    const latest = commissions[commissions.length - 1];
    const totalPoints = commissions.reduce((sum, c) => sum + c.total_points, 0);
    const totalHrs = commissions.reduce((sum, c) => sum + c.live_duration, 0);
    const bestMonth = Math.max(...commissions.map(c => c.total_points));
    
    return {
      total: totalPoints,
      avgHrs: totalHrs / commissions.length,
      avgPtsHr: totalHrs > 0 ? totalPoints / totalHrs : 0,
      bestMonth,
      livePct: latest.live_earnings / (latest.agentweb_commission_earning || 1) * 100,
      commPct: latest.my_commission / (latest.agentweb_commission_earning || 1) * 100
    };
  }, [commissions]);

  const handleUpdateGoal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedHost) return;
    const formData = new FormData(e.currentTarget);
    const type = formData.get('type') as PerformanceGoal['type'];
    const target = Number(formData.get('target'));
    const current = Number(formData.get('current'));
    const period = formData.get('period') as PerformanceGoal['period'];
    const deadline = formData.get('deadline') as string;

    const existingGoals = Storage.getGoals(selectedHost.id);
    const updatedGoals = [
      ...existingGoals.filter(g => g.type !== type),
      { id: crypto.randomUUID(), hostId: selectedHost.id, type, target, current, period, deadline }
    ];
    Storage.setGoals(selectedHost.id, updatedGoals);
    
    Storage.addLog('Profiles', `Updated goals for ${selectedHost.name}`, auth.name);
    
    // Check if goal reached
    if (current >= target) {
      Storage.addNotification({
        title: 'Goal Reached!',
        message: `${selectedHost.name} has reached their ${type} goal!`,
        type: 'success'
      });
    }

    setIsManagingGoals(false);
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedHost) return;
    const formData = new FormData(e.currentTarget);
    
    const photoUrl = uploadedPhoto || (formData.get('photoUrl') as string);
    
    const updatedHost: Host = {
      ...selectedHost,
      id: formData.get('id') as string,
      name: formData.get('name') as string,
      nickname: formData.get('nickname') as string || (formData.get('name') as string),
      position: formData.get('position') as Position,
      role: formData.get('position') as Position,
      team: formData.get('team') as string,
      manager: formData.get('manager') as string,
      anchor_type: formData.get('anchor_type') as AnchorType,
      base_salary_category: formData.get('base_salary_category') as BaseSalaryTier,
      status: formData.get('status') as HostStatus,
      level: Number(formData.get('level') || selectedHost.level || 1),
      photoUrl: photoUrl,
      description: formData.get('description') as string,
      updated_at: new Date().toISOString()
    };

    try {
      await FirebaseService.updateHost(updatedHost);
      const updatedHosts = hosts.map(h => h.id === selectedHost.id ? updatedHost : h);
      setHosts(updatedHosts);
      Storage.addLog('Profiles', `Updated profile for ${updatedHost.name} (#${updatedHost.id})`, auth.name);
      setIsEditingHost(false);
      setUploadedPhoto(null);
    } catch (err) {
      alert("Failed to update profile to cloud database.");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Photo too large. Max 2MB.');
      return;
    }

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setUploadedPhoto(base64);
    } catch (err) {
      console.error('File upload failed:', err);
    }
  };

  const getGoalColor = (type: string) => {
    switch (type) {
      case 'fanbase': return 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]';
      case 'fanclub_gc': return 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]';
      case 'hours': return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
      case 'pk': return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]';
      case 'song_requests': return 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]';
      default: return 'bg-slate-500';
    }
  };

  const getLabel = (type: string) => {
    switch (type) {
      case 'fanbase': return 'Weekly Fanbase Growth';
      case 'fanclub_gc': return 'Fanclub GC Updates';
      case 'hours': return 'Hours Streamed';
      case 'pk': return 'Random PK Sessions';
      case 'song_requests': return 'Engagement: Song Requests';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center">
         <div className="relative flex-1 w-full">
           <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
           <input 
             type="text" 
             placeholder="Search by ID or Name..." 
             className="w-full glass-input pl-10 text-xs" 
             value={searchTerm} 
             onChange={(e) => setSearchTerm(e.target.value)} 
           />
         </div>
         <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 no-scrollbar">
            {['S', 'A', 'B', 'C', 'X'].map(t => (
              <button 
                key={t} 
                onClick={() => setTierFilter(prev => prev.includes(t as Tier) ? prev.filter(x => x !== t) : [...prev, t as Tier])}
                className={cn(
                  "px-3 py-1.5 rounded text-[10px] font-bold border transition-all whitespace-nowrap",
                  tierFilter.includes(t as Tier) ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-800 border-slate-700 text-slate-500"
                )}
              >
                TIER {t}
              </button>
            ))}
         </div>
      </div>

      {isLoading ? (
        <div className="p-20 text-center text-white/20 italic">Loading Host Profiles...</div>
      ) : hosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
          <UserPen size={48} className="text-white/5" />
          <h3 className="text-lg font-bold text-white/40">No Profiles Available</h3>
          <p className="text-xs text-white/20 max-w-xs leading-relaxed font-medium">Please initialize the agency roster in the Director Hub to view individual host profiles.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filteredGrid.map(host => (
            <motion.div 
              layoutId={host.id}
              key={host.id}
              onClick={() => setSelectedHostId(host.id)}
              className="group relative glass-card !p-0 overflow-hidden cursor-pointer hover:ring-1 hover:ring-indigo-500 transition-all bg-[#0F1117] border-slate-800"
            >
              <div className="aspect-[3/4] bg-slate-800 relative">
                {host.photoUrl ? (
                  <img src={host.photoUrl} alt={host.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-700 font-bold text-3xl">
                    {host.name?.[0] || '?'}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F1117] via-transparent to-transparent opacity-60" />
              </div>
              <div className="p-4 absolute bottom-0 left-0 right-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border",
                    host.tier === 'S' ? "bg-yellow-900/30 text-yellow-500 border-yellow-500/20" :
                    host.tier === 'A' ? "bg-indigo-900/30 text-indigo-400 border-indigo-400/20" :
                    host.tier === 'B' ? "bg-cyan-900/30 text-cyan-400 border-cyan-400/20" : "bg-slate-800 text-slate-500 border-slate-700"
                  )}>
                    Tier {host.tier}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">#{host.id}</span>
                </div>
                <h4 className="font-bold text-white truncate text-sm">{host.nickname || host.name}</h4>
                <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-0.5">{host.position}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Details View Modal */}
      <AnimatePresence>
        {selectedHost && (
          <div className="fixed inset-0 z-[70] flex items-center justify-end">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedHostId(null)}
              className="absolute inset-0 bg-navy/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-4xl h-full bg-[#0a0a1a] border-l border-white/10 overflow-y-auto"
            >
              <div className="sticky top-0 z-10 glass border-b border-white/10 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 overflow-hidden border border-white/10 shrink-0">
                    {selectedHost.photoUrl ? (
                      <img src={selectedHost.photoUrl} alt={selectedHost.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-slate-600">
                        {selectedHost.name?.[0] || '?'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                       {selectedHost.nickname || selectedHost.name}
                       <span className="text-white/20 text-sm font-mono">#{selectedHost.id}</span>
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500 text-[8px] font-black border border-yellow-500/20">TIER {selectedHost.tier}</span>
                      <span className="text-[10px] text-white/40 uppercase font-bold">{selectedHost.position}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedHostId(null)} className="p-2 hover:bg-white/5 rounded-full">✕</button>
              </div>

              <div className="p-8 space-y-12">
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Stats Card */}
                    <div className="lg:col-span-2 glass-card space-y-6">
                       {isLoadingCommissions ? (
                         <div className="h-64 flex flex-col items-center justify-center gap-4">
                           <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                           <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Syncing MasterSheet Data...</p>
                         </div>
                       ) : commissions.length === 0 ? (
                         <div className="h-64 flex flex-col items-center justify-center gap-4 border border-dashed border-white/5 rounded-2xl">
                           <Info className="w-8 h-8 text-white/10" />
                           <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">No Commission Data Found</p>
                         </div>
                       ) : (
                         <>
                           <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                              {[
                                { label: 'Total Points', value: formatNumber(stats.total), sub: 'pts' },
                                { label: 'Avg Live', value: stats.avgHrs.toFixed(1), sub: 'hrs' },
                                { label: 'Pts / Hr', value: formatNumber(Math.round(stats.avgPtsHr)), sub: '' },
                                { label: 'Best Month', value: formatNumber(stats.bestMonth), sub: 'pts' },
                                { label: 'Live %', value: stats.livePct.toFixed(1), sub: '%' },
                                { label: 'Comm. %', value: stats.commPct.toFixed(1), sub: '%' },
                              ].map((s, i) => (
                                <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/5">
                                   <p className="text-[10px] font-bold text-white/30 uppercase mb-1">{s.label}</p>
                                   <div className="flex items-baseline gap-1">
                                      <span className="text-lg font-bold">{s.value}</span>
                                      <span className="text-[10px] text-cyan-400">{s.sub}</span>
                                   </div>
                                </div>
                              ))}
                           </div>

                           <div className="space-y-4">
                              <h5 className="text-xs font-bold uppercase tracking-widest text-white/30">Commission Trends</h5>
                              <div className="h-48 w-full bg-white/5 rounded-2xl p-4">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={commissions}>
                                    <XAxis dataKey="month" hide />
                                    <Tooltip 
                                      contentStyle={{ backgroundColor: '#0f1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                      labelStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 'bold' }}
                                    />
                                    <Bar dataKey="total_points" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                           </div>
                         </>
                       )}
                    </div>

                    {/* Breakdown and Details */}
                    <div className="space-y-8">
                       <div className="glass-card text-center py-8">
                          <h5 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-6">Income Breakdown</h5>
                          <div className="w-40 h-40 mx-auto relative flex items-center justify-center">
                             <div className="absolute inset-0 rounded-full border-[10px] border-white/5" />
                             <div className="text-center">
                                <span className="block text-2xl font-bold">78%</span>
                                <span className="text-[10px] text-white/30 uppercase font-black">Live Performance</span>
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-8">
                             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500" /> <span className="text-[10px] text-white/50">Live: 78%</span></div>
                             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-pink-500" /> <span className="text-[10px] text-white/50">Tips: 12%</span></div>
                             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-cyan-500" /> <span className="text-[10px] text-white/50">Party: 5%</span></div>
                             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> <span className="text-[10px] text-white/50">Other: 5%</span></div>
                          </div>
                       </div>

                        <div className="glass-card">
                           <h5 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-6">Agency Record</h5>
                           <div className="space-y-4">
                              {[
                                { label: 'Position', value: selectedHost.position },
                                { label: 'Team', value: selectedHost.team },
                                { label: 'Manager', value: selectedHost.manager },
                                { label: 'Anchor Type', value: selectedHost.anchor_type },
                                { label: 'Salary Class', value: selectedHost.base_salary_category },
                                { label: 'Current Status', value: selectedHost.status },
                                { label: 'Poppo Level', value: selectedHost.level },
                                { label: 'Onboarding', value: new Date(selectedHost.created_at).toLocaleDateString() },
                                { label: 'Last Sync', value: new Date(selectedHost.updated_at).toLocaleDateString() },
                              ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 hover:bg-white/[0.02] px-2 rounded-lg transition-colors">
                                   <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">{item.label}</span>
                                   <span className="text-xs font-bold text-white/60 tracking-tight">{item.value || 'N/A'}</span>
                                </div>
                              ))}
                           </div>
                           {auth.role === 'Director' && (
                             <button 
                               onClick={() => { if (checkPassword('Director')) setIsEditingHost(true); }}
                               className="w-full mt-8 border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95"
                             >
                                <UserPen size={14} />
                                Modify Agency Record
                             </button>
                           )}
                        </div>

                        <div className="glass-card">
                           <div className="flex items-center justify-between mb-4">
                              <h5 className="text-xs font-bold uppercase tracking-widest text-white/30 flex items-center gap-2">
                                <Target size={14} className="text-pink-500" />
                                Performance Goals
                              </h5>
                              {auth.role !== 'Talent' && (
                                <button onClick={() => setIsManagingGoals(true)} className="text-[10px] font-bold text-indigo-400 hover:underline">Manage</button>
                              )}
                           </div>
                           <div className="space-y-4">
                              {goals.map(goal => (
                                <div key={goal.id} className="space-y-2">
                                   <div className="flex justify-between text-[10px]">
                                      <span className="text-white/50">{getLabel(goal.type)}</span>
                                      <span className="font-bold text-white/80">{goal.current} / {goal.target}</span>
                                   </div>
                                   <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                      <div 
                                        className={cn("h-full transition-all duration-1000", getGoalColor(goal.type))} 
                                        style={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }} 
                                      />
                                   </div>
                                </div>
                              ))}
                              {goals.length === 0 && (
                                <p className="text-[10px] text-white/20 italic text-center py-4">No goals set for this host.</p>
                              )}
                           </div>
                        </div>

                       <div className="glass-card">
                          <h5 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">Description</h5>
                          <p className="text-sm text-white/60 leading-relaxed italic">
                             {selectedHost.description || "No assessment description available for this host profile."}
                          </p>
                       </div>

                       <div className="glass-card">
                          <h5 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">Manager Notes History</h5>
                          <div className="space-y-3">
                             {Storage.getNotes(selectedHost.id).map((note, idx) => (
                               <div key={idx} className="p-3 bg-white/5 rounded-xl border border-white/5">
                                  <div className="flex justify-between items-center mb-1">
                                     <span className="text-[10px] font-bold text-indigo-400 uppercase">{note.type}</span>
                                     <span className="text-[10px] text-white/20">{new Date(note.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-xs text-white/70 leading-relaxed italic">"{note.content}"</p>
                               </div>
                             ))}
                             {Storage.getNotes(selectedHost.id).length === 0 && (
                               <p className="text-[10px] text-white/20 italic">No historical notes recorded for this host.</p>
                             )}
                          </div>
                       </div>

                       <div className="space-y-4">
                          <div className="flex items-center justify-between">
                             <h5 className="text-xs font-bold uppercase tracking-widest text-white/30">📊 Fanbase Health History</h5>
                          </div>
                          <div className="space-y-3">
                             {Storage.getFanbaseHealth(selectedHost.id).map((entry, idx) => (
                               <div key={idx} className="glass rounded-xl border border-white/5 p-4 space-y-3">
                                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                     <span className="text-[10px] font-mono text-white/20">{new Date(entry.submittedAt).toLocaleDateString()}</span>
                                     <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Subscribers: {entry.subscribers}</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-1">
                                        <p className="text-[9px] font-bold text-slate-500 uppercase">GC Members</p>
                                        <p className="text-xs">{entry.gcMembers}</p>
                                     </div>
                                     <div className="space-y-1">
                                        <p className="text-[9px] font-bold text-slate-500 uppercase">Reporter</p>
                                        <p className="text-xs">{entry.submittedBy}</p>
                                     </div>
                                  </div>
                                  <div className="space-y-1">
                                     <p className="text-[9px] font-bold text-slate-500 uppercase">Pre-stream Update</p>
                                     <p className="text-xs text-white/70 italic">"{entry.preStreamUpdate}"</p>
                                  </div>
                                  <div className="space-y-1">
                                     <p className="text-[9px] font-bold text-slate-500 uppercase">Post-stream Update</p>
                                     <p className="text-xs text-white/70 italic">"{entry.postStreamUpdate}"</p>
                                  </div>
                               </div>
                             ))}
                             {Storage.getFanbaseHealth(selectedHost.id).length === 0 && (
                               <p className="text-[10px] text-white/20 italic text-center py-4 bg-white/5 rounded-xl border border-dashed border-white/10">No fanbase health reports found.</p>
                             )}
                          </div>
                       </div>

                       <div className="space-y-4">
                          <div className="flex items-center justify-between">
                             <h5 className="text-xs font-bold uppercase tracking-widest text-white/30">🎲 Random PK Data</h5>
                          </div>
                          <div className="glass rounded-xl border border-white/5 overflow-hidden">
                             <table className="w-full text-left text-[10px]">
                                <thead className="bg-white/5 uppercase font-black text-white/20">
                                   <tr>
                                      <th className="p-2">Date</th>
                                      <th className="p-2 text-right">Win%</th>
                                      <th className="p-2 text-right">Score</th>
                                   </tr>
                                </thead>
                                <tbody>
                                   {Storage.getPKData(selectedHost.id).map((pk, i) => (
                                      <tr key={pk.id} className="border-t border-white/5">
                                         <td className="p-2 text-white/50">{new Date(pk.timestamp).toLocaleDateString()}</td>
                                         <td className="p-2 text-right font-bold text-emerald-400">{pk.win_percentage}%</td>
                                         <td className="p-2 text-right font-bold text-emerald-400">{pk.pk_score.toLocaleString()}</td>
                                      </tr>
                                   ))}
                                   {Storage.getPKData(selectedHost.id).length === 0 && (
                                      <tr><td colSpan={3} className="p-4 text-center text-white/20 italic">No PK records found</td></tr>
                                   )}
                                </tbody>
                             </table>
                          </div>
                       </div>

                       <div className="space-y-4">
                          <div className="flex items-center justify-between">
                             <h5 className="text-xs font-bold uppercase tracking-widest text-white/30">📣 Exposures & Visibility</h5>
                          </div>
                          <div className="space-y-2">
                             {Storage.getExposures(selectedHost.id).map((exp, i) => (
                               <div key={exp.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                  <div>
                                     <p className="text-xs font-bold">{exp.event_type}</p>
                                     <p className="text-[10px] text-white/30">{exp.description}</p>
                                  </div>
                                  <span className="text-[10px] font-mono text-white/20">{new Date(exp.event_date).toLocaleDateString()}</span>
                               </div>
                             ))}
                             {Storage.getExposures(selectedHost.id).length === 0 && (
                               <p className="text-[10px] text-white/20 italic text-center py-4 bg-white/5 rounded-xl border border-dashed border-white/10">No exposure logs found.</p>
                             )}
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isManagingGoals && selectedHost && (
           <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsManagingGoals(false)} className="absolute inset-0 bg-navy/80 backdrop-blur-md" />
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass w-full max-w-md rounded-3xl overflow-hidden border border-white/10 flex flex-col">
                 <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2">
                      <Plus size={18} className="text-indigo-400" />
                      Set Host Goal
                    </h3>
                    <button onClick={() => setIsManagingGoals(false)} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
                 </div>
                 <form onSubmit={handleUpdateGoal} className="p-6 space-y-4">
                    <div className="space-y-4">
                       <div>
                          <label className="text-[10px] font-bold text-white/40 uppercase block mb-1">Goal Type</label>
                          <select name="type" required className="w-full glass-input">
                             <option value="fanbase">Weekly Fanbase Growth</option>
                             <option value="fanclub_gc">Fanclub GC Updates</option>
                             <option value="hours">Hours Streamed</option>
                             <option value="pk">Random PK Sessions</option>
                             <option value="song_requests">Engagement: Song Requests</option>
                          </select>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="text-[10px] font-bold text-white/40 uppercase block mb-1">Target Value</label>
                             <input name="target" type="number" required className="w-full glass-input" placeholder="e.g. 500" />
                          </div>
                          <div>
                             <label className="text-[10px] font-bold text-white/40 uppercase block mb-1">Current Progress</label>
                             <input name="current" type="number" required className="w-full glass-input" placeholder="e.g. 0" />
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                             <label className="text-[10px] font-bold text-white/40 uppercase block mb-1">Period</label>
                             <select name="period" className="w-full glass-input">
                                <option value="Weekly">Weekly</option>
                                <option value="Daily">Daily</option>
                                <option value="Monthly">Monthly</option>
                             </select>
                          </div>
                          <div>
                             <label className="text-[10px] font-bold text-white/40 uppercase block mb-1">Deadline Date</label>
                             <input name="deadline" type="date" required className="w-full glass-input" />
                          </div>
                       </div>
                    </div>
                    <div className="pt-4 flex gap-4">
                       <button type="button" onClick={() => setIsManagingGoals(false)} className="flex-1 btn-secondary py-2">Cancel</button>
                       <button type="submit" className="flex-[2] btn-primary py-2 text-xs">Set Goal & Notify</button>
                    </div>
                 </form>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditingHost && selectedHost && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditingHost(false)} className="absolute inset-0 bg-navy/80 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-lg glass rounded-3xl overflow-hidden border border-white/10 flex flex-col shadow-2xl shadow-indigo-500/20">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2">
                  <Shield size={18} className="text-indigo-400" />
                  Modify Agency Profile
                </h3>
                <button onClick={() => setIsEditingHost(false)} className="text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateProfile} className="p-6 space-y-6 overflow-y-auto custom-scrollbar max-h-[70vh]">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Poppo ID</label>
                    <input name="id" defaultValue={selectedHost.id} required disabled className="w-full glass-input opacity-50" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Nickname</label>
                    <input name="nickname" defaultValue={selectedHost.nickname} required className="w-full glass-input" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Full Name</label>
                    <input name="name" defaultValue={selectedHost.name} required className="w-full glass-input" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Position / Role</label>
                    <select name="position" defaultValue={selectedHost.position} className="w-full glass-input font-bold">
                      {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Team Assignment</label>
                    <select name="team" defaultValue={selectedHost.team} className="w-full glass-input font-bold">
                      {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Manager</label>
                    <select name="manager" defaultValue={selectedHost.manager} className="w-full glass-input font-bold">
                      {MANAGERS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Salary Category</label>
                    <select name="base_salary_category" defaultValue={selectedHost.base_salary_category} className="w-full glass-input font-bold">
                      {BASE_SALARY_POLICIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Current Status</label>
                    <select name="status" defaultValue={selectedHost.status} className="w-full glass-input font-bold">
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Anchor Type</label>
                    <select name="anchor_type" defaultValue={selectedHost.anchor_type} className="w-full glass-input font-bold">
                      {ANCHORS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Poppo Level</label>
                    <input name="level" type="number" defaultValue={selectedHost.level} className="w-full glass-input font-bold" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Profile Photo {auth.role === 'Director' ? '(Upload or URL)' : '(Read Only)'}</label>
                    <div className="flex gap-4 items-center">
                      <div className="flex-1 space-y-2">
                        {auth.role === 'Director' ? (
                          <>
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={handleFileChange}
                              className="hidden" 
                              id="profile-photo-upload" 
                            />
                            <label 
                              htmlFor="profile-photo-upload" 
                              className="w-full h-12 glass-input flex items-center justify-center gap-3 cursor-pointer hover:bg-white/5 transition-all text-xs font-bold text-white/60"
                            >
                              <Plus size={16} />
                              Upload Binary Photo
                            </label>
                            <input 
                              name="photoUrl" 
                              id="profile-photo-url-input" 
                              defaultValue={selectedHost.photoUrl} 
                              className="w-full glass-input" 
                              placeholder="Or paste external URL..." 
                              onChange={(e) => setUploadedPhoto(null)}
                            />
                          </>
                        ) : (
                          <input 
                            name="photoUrl" 
                            defaultValue={selectedHost.photoUrl} 
                            disabled 
                            className="w-full glass-input opacity-50 cursor-not-allowed" 
                          />
                        )}
                      </div>
                      <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-2xl">
                        <img 
                          src={uploadedPhoto || selectedHost.photoUrl || ''} 
                          alt="Preview" 
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=preview';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Description / Biography</label>
                    <textarea name="description" defaultValue={selectedHost.description} className="w-full glass-input h-24 resize-none" />
                  </div>
                </div>
                <div className="pt-4 flex gap-4">
                   <button type="button" onClick={() => setIsEditingHost(false)} className="flex-1 btn-secondary py-3 text-[10px] font-black uppercase tracking-widest">Cancel</button>
                   <button type="submit" className="flex-[2] btn-primary py-3 text-[10px] font-black uppercase tracking-widest">Update Agency Profile</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

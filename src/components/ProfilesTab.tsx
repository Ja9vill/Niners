import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, TrendingUp, BarChart3, PieChart, Info, UserPen, Target, Plus, ChevronRight, X, Shield, Edit2, Loader2, Fingerprint, Star, Camera, Calendar, DollarSign, Award, BookOpen, Heart } from 'lucide-react';
import { Host, Tier, BaseSalaryTier, HostStatus, AnchorType, PerformanceGoal, Position, CommissionEntry, DirectorNote, NoteType } from '../types';
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
  ResponsiveContainer
} from 'recharts';

export const ProfilesTab = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHostId, setSelectedHostId] = useState<string | null>(null);
  const [isManagingGoals, setIsManagingGoals] = useState(false);
  const [isEditingHost, setIsEditingHost] = useState(false);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  
  // Custom Role Model Ratio calculations
  const [tierFilter, setTierFilter] = useState<Tier[]>([]);
  const [salaryFilter, setSalaryFilter] = useState<BaseSalaryTier[]>([]);
  
  const auth = Storage.getAuthState();

  useEffect(() => {
    if (!isEditingHost) {
      setUploadedPhoto(null);
    }
  }, [isEditingHost]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await FirebaseService.getAllHosts();
        setHosts(data || []);
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
  const [hostNotes, setHostNotes] = useState<DirectorNote[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState<NoteType>('Note');
  const [isAddingNote, setIsAddingNote] = useState(false);

  const loadNotes = async (id: string) => {
    setIsLoadingNotes(true);
    try {
      const data = await FirebaseService.getNotesByHost(id);
      setHostNotes(data as DirectorNote[] || []);
    } catch (err) {
      console.error("Failed to load notes:", err);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  useEffect(() => {
    if (selectedHostId) {
      setIsLoadingCommissions(true);
      FirebaseService.getAllCommissions().then(all => {
        const hostComms = all.filter(c => c.poppo_id === selectedHostId)
          .sort((a, b) => a.month.localeCompare(b.month));
        setCommissions(hostComms);
        setIsLoadingCommissions(false);
      });
      loadNotes(selectedHostId);
    } else {
      setCommissions([]);
      setHostNotes([]);
    }
  }, [selectedHostId]);

  // Derived metrics / totals
  const stats = useMemo(() => {
    if (commissions.length === 0) return { total: 0, avgHrs: 0, avgPtsHr: 0, bestMonth: 0, livePct: 0, commPct: 0 };
    const latest = commissions[commissions.length - 1];
    const totalPoints = commissions.reduce((sum, c) => sum + (Number(c.total_points) || 0), 0);
    const totalHrs = commissions.reduce((sum, c) => sum + (Number(c.live_duration) || 0), 0);
    const bestMonth = Math.max(...commissions.map(c => Number(c.total_points) || 0));
    
    const liveEarnings = Number(latest.live_earnings) || 0;
    const commissionEarning = Number(latest.agentweb_commission_earning) || 0;
    const myCommission = Number(latest.my_commission) || 0;

    const livePct = commissionEarning > 0 ? (liveEarnings / commissionEarning) * 100 : 0;
    const commPct = commissionEarning > 0 ? (myCommission / commissionEarning) * 100 : 0;
    
    return {
      total: totalPoints,
      avgHrs: totalHrs / commissions.length,
      avgPtsHr: totalHrs > 0 ? totalPoints / totalHrs : 0,
      bestMonth,
      livePct: isNaN(livePct) ? 0 : livePct,
      commPct: isNaN(commPct) ? 0 : commPct
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

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo too large. Max 5MB.');
      return;
    }

    setIsProcessingPhoto(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_SIZE = 400;

            if (width > height) {
              if (width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              }
            } else {
              if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                height = MAX_SIZE;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          };
          img.onerror = reject;
          img.src = reader.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setUploadedPhoto(base64);
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Failed to process image');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const mapTierToRatio = (tier: string) => {
    switch(tier) {
      case 'S': return 'Role Model Ratio (100%)';
      case 'A': return 'Role Model Ratio (80%)';
      case 'B': return 'Role Model Ratio (60%)';
      case 'C': return 'Role Model Ratio (40%)';
      default: return 'Role Model Ratio (0%)';
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
                {t === 'S' ? 'Ratio Model 100%' : t === 'A' ? 'Ratio Model 80%' : t === 'B' ? 'Ratio Model 60%' : `Ratio model Under 40%`}
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
          <p className="text-xs text-white/20 max-w-xs leading-relaxed font-medium">Please initialize the agency roster to view individual profiles.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 animate-fade-in">
          {filteredGrid.map(host => (
            <motion.div 
              layoutId={host.id}
              key={host.id}
              onClick={() => setSelectedHostId(host.id)}
              className="group relative glass-card !p-0 overflow-hidden cursor-pointer hover:ring-1 hover:ring-indigo-500 transition-all bg-[#0F1117] border-slate-800 flex flex-col h-full"
            >
              <div className="aspect-[3/4] bg-slate-800 relative w-full">
                {host.photoUrl ? (
                  <img src={host.photoUrl} alt={host.name} className="w-full h-full object-cover transition-all" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-700 font-bold text-3xl">
                    {host.name?.[0] || '?'}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F1117] via-transparent to-transparent opacity-60" />
              </div>
              <div className="p-4 bg-slate-950 flex flex-col justify-between flex-1">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/20">
                      {host.tier === 'S' ? 'Ratio: 100%' : host.tier === 'A' ? 'Ratio: 80%' : 'Ratio: 60%'}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">#{host.id}</span>
                  </div>
                  <h4 className="font-bold text-white truncate text-sm">{host.nickname || host.name}</h4>
                  <p className="text-[8px] text-indigo-400/70 uppercase font-black tracking-widest mt-0.5">{host.position}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Roster Profile details view modal formatted strictly in the precise sequence order 1 to 8 */}
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
              className="relative w-full max-w-4xl h-full bg-[#07080e] border-l border-white/10 overflow-y-auto"
            >
              {/* STICKY HEADER */}
              <div className="sticky top-0 z-10 glass border-b border-white/15 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 overflow-hidden border border-white/10 shrink-0">
                    {selectedHost.photoUrl ? (
                      <img src={selectedHost.photoUrl} alt={selectedHost.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-slate-600">
                        {selectedHost.name?.[0] || '?'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                       {selectedHost.nickname || selectedHost.name}
                       <span className="text-white/20 text-sm font-mono">#{selectedHost.id}</span>
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[8px] font-black border border-indigo-500/20 uppercase">
                        {mapTierToRatio(selectedHost.tier)}
                      </span>
                      <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">{selectedHost.position} // TEAM {selectedHost.team || 'Alpha'}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedHostId(null)} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white">✕</button>
              </div>

              {/* STRICT DELIVERY SEQUENCE BLOCKS */}
              <div className="p-8 space-y-12">

                {/* --- 1. BASIC PROFILE INFORMATION --- */}
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.25em] flex items-center gap-2 pb-2 border-b border-white/5">
                    <Fingerprint size={14} className="text-indigo-400" />
                    1. Basic Profile Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                       <div className="flex justify-between py-1.5 border-b border-white/5"><span className="text-white/30 text-[10px] font-black uppercase tracking-wider">Nickname</span><span className="text-xs font-bold text-white">{selectedHost.nickname || 'N/A'}</span></div>
                       <div className="flex justify-between py-1.5 border-b border-white/5"><span className="text-white/30 text-[10px] font-black uppercase tracking-wider">Full name</span><span className="text-xs font-bold text-white">{selectedHost.name}</span></div>
                       <div className="flex justify-between py-1.5 border-b border-white/5"><span className="text-white/30 text-[10px] font-black uppercase tracking-wider">Poppo ID</span><span className="text-xs font-bold text-white font-mono">{selectedHost.id}</span></div>
                       <div className="flex justify-between py-1.5"><span className="text-white/30 text-[10px] font-black uppercase tracking-wider">Position/Role</span><span className="text-xs font-bold text-white">{selectedHost.position}</span></div>
                    </div>
                    <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                       <div className="flex justify-between py-1.5 border-b border-white/5"><span className="text-white/30 text-[10px] font-black uppercase tracking-wider">Manager</span><span className="text-xs font-bold text-white">{selectedHost.manager || 'Ely'}</span></div>
                       <div className="flex justify-between py-1.5 border-b border-white/5"><span className="text-white/30 text-[10px] font-black uppercase tracking-wider">Anchor team</span><span className="text-xs font-bold text-indigo-400">{selectedHost.team || 'Alpha'}</span></div>
                       <div className="flex justify-between py-1.5 border-b border-white/5"><span className="text-white/30 text-[10px] font-black uppercase tracking-wider">Base Policy</span><span className="text-xs font-bold text-white">{selectedHost.base_salary_category || 'S idol'}</span></div>
                       <div className="flex justify-between py-1.5"><span className="text-white/30 text-[10px] font-black uppercase tracking-wider">Status</span><span className="text-xs font-bold text-emerald-400">{selectedHost.status || 'Active'}</span></div>
                    </div>
                  </div>
                  {/* Bio statement */}
                  <div className="p-5 bg-white/[0.01] border border-white/5 rounded-2xl italic text-xs text-slate-400 leading-relaxed">
                    "{selectedHost.description || 'No biography details loaded.'}"
                  </div>
                </section>


                {/* --- 2. FANBASE KPI SECTION --- */}
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.25em] flex items-center gap-2 pb-2 border-b border-white/5">
                    <Heart size={14} className="text-pink-400" />
                    2. Fanbase KPI (Foreground: Subscribers & GC Members Only)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
                    <div className="p-6 bg-[#fd2d78]/5 border border-[#fd2d78]/10 rounded-2xl">
                      <span className="text-[10px] font-black text-[#fd2d78] uppercase tracking-wider block mb-1">Subscribers</span>
                      <span className="text-2xl font-black text-white">
                        {Storage.getFanbaseHealth(selectedHost.id)?.[0]?.subscribers || 140}
                      </span>
                    </div>
                    <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider block mb-1">GC Members</span>
                      <span className="text-2xl font-black text-white">
                        {Storage.getFanbaseHealth(selectedHost.id)?.[0]?.gcMembers || 82}
                      </span>
                    </div>
                  </div>
                </section>


                {/* --- 3. EXPOSURE SUMMARY --- */}
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.25em] flex items-center gap-2 pb-2 border-b border-white/5">
                    <Camera size={14} className="text-cyan-400" />
                    3. Exposure Summary
                  </h3>
                  <div className="space-y-2">
                    {Storage.getExposures(selectedHost.id).map((exp, idx) => (
                      <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-xs font-black text-white font-sans">{exp.event_type}</p>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{exp.description}</p>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">{exp.event_date}</span>
                      </div>
                    ))}
                    {Storage.getExposures(selectedHost.id).length === 0 && (
                      <div className="p-8 text-center border border-dashed border-white/5 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-500 italic">No exposures recorded.</div>
                    )}
                  </div>
                </section>


                {/* --- 4. RANDOM PK SUMMARY --- */}
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.25em] flex items-center gap-2 pb-2 border-b border-white/5">
                    <Award size={14} className="text-amber-500" />
                    4. Random PK Summary
                  </h3>
                  <div className="overflow-hidden border border-white/5 rounded-2xl bg-[#0F1117]">
                     <table className="w-full text-left text-xs font-mono">
                       <thead className="bg-white/5 uppercase text-[9px] font-black text-slate-400">
                         <tr>
                           <th className="p-3">Session Date</th>
                           <th className="p-3 text-right">PK Win Rate</th>
                           <th className="p-3 text-right">Aggregate Score</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                         {Storage.getPKData(selectedHost.id).map((pk, idx) => (
                           <tr key={idx} className="text-slate-300">
                             <td className="p-3">{new Date(pk.timestamp).toLocaleDateString()}</td>
                             <td className="p-3 text-right font-bold text-amber-500">{pk.win_percentage}%</td>
                             <td className="p-3 text-right text-emerald-400 font-bold">{formatNumber(pk.pk_score)}</td>
                           </tr>
                         ))}
                         {Storage.getPKData(selectedHost.id).length === 0 && (
                           <tr>
                             <td colSpan={3} className="p-6 text-center text-slate-500 italic">No Random PK logs located.</td>
                           </tr>
                         )}
                       </tbody>
                     </table>
                  </div>
                </section>


                {/* --- 5. UPCOMING EVENTS --- */}
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.25em] flex items-center gap-2 pb-2 border-b border-white/5">
                    <Calendar size={14} className="text-indigo-400" />
                    5. Upcoming Calendar Events
                  </h3>
                  <div className="space-y-3">
                     {Storage.getEvents().filter(e => e.poppo_id === selectedHost.id || e.poppo_id === 'Agency').map((ev, idx) => (
                       <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex justify-between items-center">
                         <div>
                           <h4 className="font-bold text-white text-xs">{ev.title}</h4>
                           <p className="text-[10px] text-slate-400 mt-0.5">{ev.description}</p>
                         </div>
                         <div className="text-right font-mono text-[10px] text-slate-500">
                           <div>{ev.date}</div>
                           <div>{ev.time}</div>
                         </div>
                       </div>
                     ))}
                     {Storage.getEvents().filter(e => e.poppo_id === selectedHost.id || e.poppo_id === 'Agency').length === 0 && (
                       <p className="text-[10px] font-bold text-slate-500 text-center py-4 uppercase tracking-widest italic border border-dashed border-white/5 rounded-xl">No active events listed.</p>
                     )}
                  </div>
                </section>


                {/* --- 6. FINANCIAL & LIVE METRICS --- */}
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.25em] flex items-center gap-2 pb-2 border-b border-white/5">
                    <DollarSign size={14} className="text-emerald-400" />
                    6. Financial & Live Performance Metrics
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                      <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Live duration</span>
                      <span className="text-sm font-bold text-white">{stats.avgHrs.toFixed(1)} hrs</span>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                      <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Gifting point score</span>
                      <span className="text-sm font-bold text-emerald-400">{formatNumber(stats.total)}</span>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                      <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Earnings share</span>
                      <span className="text-sm font-bold text-indigo-400">{stats.livePct.toFixed(1)}%</span>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                      <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">My commission</span>
                      <span className="text-sm font-bold text-pink-400">{stats.commPct.toFixed(1)}%</span>
                    </div>
                  </div>
                  {/* Trends graph */}
                  <div className="h-40 bg-white/[0.01] border border-white/5 p-4 rounded-xl">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={commissions}>
                        <XAxis dataKey="month" hide />
                        <Tooltip contentStyle={{ backgroundColor: '#0c0d12', border: 'none', borderRadius: '12px', fontSize: '10px' }} />
                        <Bar dataKey="total_points" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>


                {/* --- 7. OVERALL TOTALS & HISTORY --- */}
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.25em] flex items-center gap-2 pb-2 border-b border-white/5">
                    <TrendingUp size={14} className="text-indigo-400" />
                    7. Cumulative Overall History
                  </h3>
                  <div className="space-y-2">
                    {commissions.map((comm, idx) => (
                      <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between font-mono text-[11px]">
                        <span className="font-bold text-white">{comm.month} Ledger</span>
                        <span className="text-emerald-400 font-bold">{formatNumber(comm.total_points)} points</span>
                        <span className="text-slate-500">{comm.live_duration} streaming hours</span>
                      </div>
                    ))}
                    {commissions.length === 0 && (
                      <p className="text-[10px] text-slate-500 text-center py-4 uppercase tracking-widest italic font-bold">No historic ledger periods processed.</p>
                    )}
                  </div>
                </section>


                {/* --- 8. DIRECTOR'S STRATEGIC NOTES --- */}
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.25em] flex items-center gap-2 pb-2 border-b border-white/5">
                    <BookOpen size={14} className="text-purple-400" />
                    8. Director's Strategic & Compliance Notes
                  </h3>
                  <div className="space-y-3">
                    {hostNotes.map((note) => (
                      <div key={note.id} className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                        <div className="flex justify-between items-center mb-1 text-[9px] font-bold text-purple-400 uppercase tracking-widest">
                          <span>{note.type} Log Entry</span>
                          <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-300 font-semibold">"{note.content}"</p>
                      </div>
                    ))}
                    {hostNotes.length === 0 && (
                      <p className="text-[10px] text-slate-500 text-center py-4 uppercase tracking-widest italic font-bold">No strategic directorship guidelines compiled.</p>
                    )}
                  </div>
                </section>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, 
  Trophy, 
  Star, 
  Calendar, 
  Users, 
  Activity, 
  Search, 
  Download, 
  ChevronRight,
  Filter,
  Monitor,
  Flame,
  LayoutGrid,
  List,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Host, CommissionEntry, ActivityLog } from '../types';
import { formatNumber, cn, formatDate, formatMonth } from '../lib/utils';
import { SheetService } from '../lib/sheetService';
import { Storage } from '../lib/storage';

interface HomeTabProps {
  hosts: Host[];
  commissions: CommissionEntry[];
  onOpenLogin: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({ hosts, commissions, onOpenLogin }) => {
  const [activeSubTab, setActiveSubTab] = useState<'niners' | 'feeds' | 'calendar' | 'roster'>('niners');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [feeds, setFeeds] = useState<ActivityLog[]>([]);

  const years = useMemo(() => {
    const y = Array.from(new Set(commissions.map(c => c.month.split('-')[0]))).sort().reverse();
    return y;
  }, [commissions]);

  const months = useMemo(() => {
    const filtered = selectedYear === 'all' ? commissions : commissions.filter(c => c.month.startsWith(selectedYear));
    const m = Array.from(new Set(filtered.map(c => c.month))).sort().reverse();
    return m;
  }, [commissions, selectedYear]);

  useEffect(() => {
    const loadFeeds = async () => {
      try {
        const logs = await SheetService.getAllLogs();
        setFeeds(logs);
      } catch (err) {
        console.error('Failed to load feeds:', err);
      }
    };
    if (activeSubTab === 'feeds') {
      loadFeeds();
    }
  }, [activeSubTab]);

  const topNiners = useMemo(() => {
    let filtered = commissions;
    if (selectedYear !== 'all') {
      filtered = filtered.filter(c => c.month.startsWith(selectedYear));
    }
    if (selectedMonth !== 'all') {
      filtered = filtered.filter(c => c.month === selectedMonth);
    }
    
    const hostPoints = hosts.map(host => {
      const hostCommissions = filtered.filter(c => c.poppo_id === host.id);
      const totalPoints = hostCommissions.reduce((sum, c) => sum + (c.total_points || 0), 0);
      const hostAgencyCommission = hostCommissions.reduce((sum, c) => sum + (c.agentweb_commission_earning || 0), 0);
      
      const totalAgencyCommissions = filtered.reduce((sum, c) => sum + (c.agentweb_commission_earning || 0), 0);
      const contribution = totalAgencyCommissions > 0 ? (hostAgencyCommission / totalAgencyCommissions) * 100 : 0;
      
      return { ...host, totalPoints, contribution, hostAgencyCommission };
    });

    return hostPoints.sort((a, b) => b.hostAgencyCommission - a.hostAgencyCommission).slice(0, 10);
  }, [hosts, commissions, selectedMonth, selectedYear]);

  const renderRankingTable = () => (
    <div className="glass-card mt-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Trophy className="text-yellow-500" size={24} />
            TOP 9 NINERS
          </h3>
          <p className="text-white/40 text-xs mt-1">Agency performance for {selectedMonth === 'all' ? 'All Time' : formatMonth(selectedMonth)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-white/20" />
          <select 
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedMonth('all');
            }}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
          >
            <option value="all">📅 All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
          >
            <option value="all">🏆 All Time Record</option>
            {months.map(m => <option key={m} value={m}>{formatMonth(m)}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-y-2">
          <thead>
            <tr className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
              <th className="px-4 py-2">Rank</th>
              <th className="px-4 py-2">Host Profile</th>
              <th className="px-4 py-2">Poppo ID</th>
              <th className="px-4 py-2 text-right">Contribution</th>
              <th className="px-4 py-2 text-right">Commission Earned</th>
            </tr>
          </thead>
          <tbody>
            {topNiners.map((host, i) => (
              <tr key={host.id} className="group transition-all hover:translate-x-1">
                <td className="px-4 py-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-black text-lg",
                    i === 0 ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" :
                    i === 1 ? "bg-slate-300 text-black shadow-lg shadow-slate-300/20" :
                    i === 2 ? "bg-amber-700 text-black shadow-lg shadow-amber-700/20" : "bg-white/5 text-white/40"
                  )}>
                    {i + 1}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                        <img 
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${host.id}`} 
                          alt={host.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {i < 3 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center border-2 border-[#0A0B0E]">
                          <Star size={10} className="text-white fill-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{host.name}</p>
                      <p className="text-[10px] text-white/20 font-mono tracking-widest">{host.position}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="font-mono text-xs text-white/30 tracking-widest">{host.id}</span>
                </td>
                <td className="px-4 py-4 text-right">
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-xs font-bold text-indigo-400">{host.contribution.toFixed(1)}%</div>
                    <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500/50" style={{ width: `${host.contribution}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-right">
                  <span className="font-mono text-sm font-black text-white/90">{formatNumber(host.hostAgencyCommission)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderBadgeBlocks = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      {[
        { title: 'PK SLAYER', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        { title: 'SPOTLIGHT ELITE', icon: Monitor, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
        { title: 'FANBASE MASTER', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
      ].map((badge, idx) => (
        <div key={idx} className="glass border-white/5 p-6 rounded-3xl relative overflow-hidden group">
          <div className={cn("absolute top-0 right-0 w-24 h-24 blur-[60px] opacity-20", badge.bg)} />
          <div className="relative z-10 flex flex-col items-center text-center gap-4">
             <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-2", badge.bg)}>
                <badge.icon className={badge.color} size={32} />
             </div>
             <div>
               <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">{badge.title}</h4>
               <p className="font-bold text-white uppercase tracking-tight">Selection Pending</p>
             </div>
             <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                <Users size={16} className="text-white/20" />
             </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderSecondTierBadges = () => (
     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      {[
        { title: 'LIVEHOUSE STAR', icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
        { title: 'ROLE MODEL', icon: Star, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        { title: 'TOP LEADER', icon: TrendingUp, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
      ].map((badge, idx) => (
        <div key={idx} className="glass border-white/5 p-6 rounded-3xl relative overflow-hidden group">
          <div className={cn("absolute top-0 right-0 w-24 h-24 blur-[60px] opacity-20", badge.bg)} />
          <div className="relative z-10 flex flex-col items-center text-center gap-4">
             <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-2", badge.bg)}>
                <badge.icon className={badge.color} size={32} />
             </div>
             <div>
               <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">{badge.title}</h4>
               <p className="font-bold text-white uppercase tracking-tight">Selection Pending</p>
             </div>
             <div className="w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                <Users size={16} className="text-white/20" />
             </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderFeeds = () => (
    <div className="space-y-8 mt-8">
      <div className="glass-card">
         <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
              <Activity className="text-indigo-400" size={24} />
              NINERS FEEDS
            </h3>
            <button 
              onClick={onOpenLogin}
              className="text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-white/40 hover:text-white transition-all"
            >
              Members Only Post
            </button>
         </div>
         <div className="space-y-6">
            {feeds.length > 0 ? (
              feeds.slice(0, 20).map((log) => (
                <div key={log.id} className="flex gap-4 p-4 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <Activity className="text-indigo-400" size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-widest text-indigo-400">{log.type}</p>
                      <span className="text-[10px] font-mono text-white/10">{formatDate(log.timestamp)}</span>
                    </div>
                    <p className="text-sm text-white/80 mt-1 leading-relaxed">{log.action}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-white/10" />
                      <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{log.user}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-20 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                <Activity size={32} className="mx-auto mb-4" />
                <p className="text-sm italic">The Agency Feed is currently silent...</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* Header Info */}
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-4">
          NINE <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-500">DASHBOARD</span>
        </h1>
        <p className="text-white/40 text-sm font-medium uppercase tracking-[0.4em]">Official Agency Ecosystem</p>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center justify-center gap-2 mb-12 flex-wrap">
        {[
          { id: 'niners', label: 'TOP NINERS', icon: Trophy },
          { id: 'feeds', label: 'FEEDS', icon: Activity },
          { id: 'calendar', label: 'CALENDAR', icon: Calendar },
          { id: 'roster', label: 'ROSTER', icon: Users },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={cn(
              "px-6 py-3 rounded-2xl flex items-center gap-3 transition-all",
              activeSubTab === tab.id 
                ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 scale-105" 
                : "bg-white/5 text-white/40 hover:bg-white/10"
            )}
          >
            <tab.icon size={16} />
            <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeSubTab === 'niners' && (
            <>
              {renderRankingTable()}
              {renderBadgeBlocks()}
              {renderSecondTierBadges()}
            </>
          )}
          {activeSubTab === 'feeds' && renderFeeds()}
          {activeSubTab === 'calendar' && (
             <div className="glass-card min-h-[400px] flex flex-col items-center justify-center text-center gap-4">
               <Calendar size={48} className="text-white/10" />
               <p className="text-white/20 italic">Global Calendar Loading...</p>
             </div>
          )}
          {activeSubTab === 'roster' && (
            <div className="glass-card">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-white uppercase tracking-widest">OFFICIAL ROSTER</h3>
                  <div className="relative w-64 lg:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search Niners..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full glass-input pl-12 py-3"
                    />
                  </div>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {hosts.filter(h => h.name.toLowerCase().includes(searchTerm.toLowerCase())).map(host => (
                    <div key={host.id} className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center gap-4 hover:border-indigo-500/30 transition-all group">
                       <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${host.id}`} alt="" />
                       </div>
                       <div>
                          <p className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors">{host.name}</p>
                          <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">{host.position}</p>
                       </div>
                    </div>
                 ))}
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

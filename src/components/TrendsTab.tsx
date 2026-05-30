import React, { useState, useMemo } from 'react';
import { TrendingUp, Award, BarChart2, Star, Ghost, AlertTriangle, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Host, Tier, CommissionEntry } from '../types';
import { Storage } from '../lib/storage';
import { FirebaseService } from '../lib/firebaseService';
import { cn, formatNumber, formatDate, formatMonth } from '../lib/utils';
import { motion } from 'motion/react';

export const TrendsTab = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [commissions, setCommissions] = useState<CommissionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  React.useEffect(() => {
    const load = async () => {
      const [hostData, commData] = await Promise.all([
        FirebaseService.getAllHosts(),
        FirebaseService.getAllCommissions()
      ]);
      setHosts(hostData);
      setCommissions(commData);
      setIsLoading(false);
    };
    load();
  }, []);

  const availableMonths = useMemo(() => {
    const months = Array.from(new Set(commissions.map(c => c.month)));
    return months.sort().reverse();
  }, [commissions]);

  const filteredCommissions = useMemo(() => {
    if (selectedFilter === 'all') return commissions;
    return commissions.filter(c => c.month === selectedFilter);
  }, [commissions, selectedFilter]);

  const rankings = useMemo(() => {
    return hosts.map(h => {
      const hostComms = filteredCommissions.filter(c => c.poppo_id === h.id);
      const totalPoints = hostComms.reduce((sum, c) => sum + (Number(c.total_points) || 0), 0);
      const totalHrs = hostComms.reduce((sum, c) => sum + (Number(c.live_duration) || 0), 0);
      const ptsPerHr = totalHrs > 0 ? totalPoints / totalHrs : 0;
      return {
        ...h,
        totalPoints,
        ptsPerHr: isNaN(ptsPerHr) ? 0 : ptsPerHr
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [hosts, filteredCommissions]);

  const elite = hosts.filter(h => h.tier === 'S' || h.tier === 'A');
  const established = hosts.filter(h => h.tier === 'B');
  const developing = hosts.filter(h => h.tier === 'C' || h.tier === 'D');
  const atRisk = hosts.filter(h => h.status === 'Inconsistent' || h.status === 'Inactive');

  if (isLoading) return <div className="p-20 text-center text-white/20 italic">Processing trends...</div>;

  if (hosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center space-y-4">
        <TrendingUp size={48} className="text-white/5" />
        <h3 className="text-lg font-bold text-white/40">No Data Detected</h3>
        <p className="text-xs text-white/20 max-w-xs leading-relaxed font-medium">Please upload a MasterSheet or link host data in the Director Hub to initialize trends and insights.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Growth Pipeline */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
           <h3 className="font-bold text-lg flex items-center gap-2 text-white/90">
             <TrendingUp size={18} className="text-indigo-400" />
             Growth Pipeline
           </h3>
           <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none">Agency Maturity Index</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           {[
             { label: '🏆 Elite', range: '20M+ pts', color: 'text-yellow-500', hosts: elite },
             { label: '⭐ Established', range: '8-15M pts', color: 'text-indigo-400', hosts: established },
             { label: '📈 Developing', range: '4-8M pts', color: 'text-emerald-400', hosts: developing },
             { label: '⚠️ At Risk', range: '< 1M pts', color: 'text-red-400', hosts: atRisk },
           ].map((stage, i) => (
             <div key={i} className="glass-card !p-6 flex flex-col h-full bg-[#0F1117] border-slate-800">
                <div className="mb-6">
                  <h4 className={cn("font-bold text-[10px] uppercase tracking-[0.2em]", stage.color)}>{stage.label}</h4>
                  <p className="text-[10px] font-black uppercase text-slate-600 tracking-widest mt-1">{stage.range}</p>
                </div>
                <div className="space-y-2 flex-1">
                  {stage.hosts.slice(0, 5).map(h => (
                    <div key={h.id} className="flex items-center gap-2 px-3 py-2 rounded bg-slate-800/20 border border-slate-800 group hover:border-indigo-500/50 transition-all">
                      <span className="text-[11px] font-bold text-slate-300 group-hover:text-white truncate">{h.name}</span>
                      <ArrowUpRight size={10} className="ml-auto text-slate-700 group-hover:text-indigo-400" />
                    </div>
                  ))}
                </div>
             </div>
           ))}
        </div>
      </section>

      {/* Detailed Rankings */}
      <section className="glass-card !p-0">
         <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="font-bold text-xl flex items-center gap-2">
              <Award size={20} className="text-purple-400" />
              Performance Rankings
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">Period:</span>
                <select 
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  title="Filter rankings by period"
                  aria-label="Filter rankings by period"
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all cursor-pointer min-w-[140px]"
                >
                  <option value="all">🏆 All-Time Record</option>
                  {availableMonths.map(month => (
                    <option key={month} value={month}>{formatMonth(month)}</option>
                  ))}
                </select>
              </div>
              <button className="btn-secondary !px-4 !py-1.5 text-xs">Export CSV</button>
            </div>
         </div>
         <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                  <th className="px-6 py-4">Rank</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4 text-right">Cumulative Pts</th>
                  <th className="px-6 py-4 text-right">Pts/hr</th>
                  <th className="px-6 py-4 text-center">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rankings.map((host, i) => (
                  <tr key={host.id} className="hover:bg-white/5 group transition-colors">
                    <td className="px-6 py-4 font-black text-white/30 truncate">#{i + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <span className="font-bold text-white/90">{host.name}</span>
                         <span className="text-[10px] font-black px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-white/40">{host.tier}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-white/70">{formatNumber(host.totalPoints)} pts</td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-cyan-400">{formatNumber(Math.round(host.ptsPerHr))}</td>
                    <td className="px-6 py-4">
                       <div className="flex justify-center">
                          {i < 3 ? <ArrowUpRight className="text-emerald-400" size={16}/> : i >= rankings.length - 3 && rankings.length > 5 ? <ArrowDownRight className="text-red-400" size={16}/> : <Minus className="text-white/20" size={16}/>}
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
         </div>

         {/* Mobile Card View */}
         <div className="sm:hidden divide-y divide-white/5">
            {rankings.map((host, i) => (
              <div key={host.id} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-black text-white/20">#{i + 1}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm truncate">{host.name}</p>
                    <p className="text-[10px] text-white/30">{host.tier} Tier</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono font-bold text-white/70">{formatNumber(host.totalPoints)}</p>
                  <p className="text-[9px] text-cyan-400 font-bold">{formatNumber(Math.round(host.ptsPerHr))} pts/hr</p>
                </div>
                <div className="pl-2">
                  {i < 3 ? <ArrowUpRight className="text-emerald-400" size={14}/> : i >= rankings.length - 3 && rankings.length > 5 ? <ArrowDownRight className="text-red-400" size={14}/> : <Minus className="text-white/20" size={14}/>}
                </div>
              </div>
            ))}
         </div>
      </section>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Trophy, 
  Star, 
  Users, 
  Filter,
  Monitor,
  Flame,
} from 'lucide-react';
import { Host, CommissionEntry } from '../types';
import { formatNumber, cn, formatMonth } from '../lib/utils';

// Constants to satisfy JSX internationalization rules
const TEXT = {
  selectionPending: 'Selection Pending',
  nine: 'NINERS',
  dashboard: 'DASHBOARD',
  officialEcosystem: 'Official Agency Ecosystem',
  agencyPerformance: 'Agency performance for',
  points: 'Points',
  contribution: 'Contribution',
  rank: 'Rank',
  hostProfile: 'Host Profile',
  poppoId: 'Poppo ID',
  champion: 'Champion',
  place2nd: '2nd Place',
  place3rd: '3rd Place',
  leaderboardTitle: 'TOP NINERS LEADERBOARD',
  ninerHost: 'NINER HOST',
};

const formatFullMonth = (yearMonth: string): string => {
  if (!yearMonth || yearMonth === 'all') return 'All Time Record';
  const [year, month] = yearMonth.split('-');
  if (!month) return yearMonth;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const mIdx = parseInt(month, 10) - 1;
  return monthNames[mIdx] ? `${monthNames[mIdx]} ${year}` : yearMonth;
};

interface HomeTabProps {
  hosts: Host[];
  commissions: CommissionEntry[];
  onOpenLogin: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({ hosts, commissions, onOpenLogin }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const months = useMemo(() => {
    const m = Array.from(new Set(commissions.map(c => c.month))).sort().reverse();
    return m;
  }, [commissions]);

  const topNiners = useMemo(() => {
    const filtered = selectedMonth === 'all' ? commissions : commissions.filter(c => c.month === selectedMonth);
    const hostPoints = hosts.map(host => {
      const pts = filtered
        .filter(c => c.poppo_id === host.id)
        .reduce((sum, c) => sum + (c.total_points || 0), 0);
      const totalAgencyPts = filtered.reduce((sum, c) => sum + (c.total_points || 0), 0);
      const contribution = totalAgencyPts > 0 ? (pts / totalAgencyPts) * 100 : 0;
      return { ...host, totalPoints: pts, contribution };
    });
    return hostPoints.sort((a, b) => b.contribution - a.contribution).slice(0, 10);
  }, [hosts, commissions, selectedMonth]);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* Header Info */}
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-4">
          {TEXT.nine} <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-500">{TEXT.dashboard}</span>
        </h1>
        <p className="text-white/40 text-sm font-medium uppercase tracking-[0.4em]">{TEXT.officialEcosystem}</p>
      </div>

      {/* Leaderboard Header Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 glass-card p-6 rounded-3xl border border-white/5 shadow-xl">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Trophy className="text-yellow-500 animate-pulse" size={28} />
            {TEXT.leaderboardTitle}
          </h2>
          <p className="text-white/40 text-xs mt-1 font-medium">
            {TEXT.agencyPerformance} {selectedMonth === 'all' ? 'All Time Record' : formatFullMonth(selectedMonth)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-white/40" />
          <div className="relative flex items-center">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              title="Filter by Month"
              className="bg-[#1A1A1A]/80 border border-white/10 rounded-xl pl-4 pr-10 py-2 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer appearance-none"
            >
              <option value="all" className="bg-[#111111] text-white">🏆 All Time Record</option>
              {months.map(m => (
                <option key={m} value={m} className="bg-[#111111] text-white">
                  📅 {formatFullMonth(m)}
                </option>
              ))}
            </select>
            <div className="absolute right-3 pointer-events-none text-white/40 flex items-center">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="glass-card border border-white/5 shadow-2xl rounded-3xl overflow-hidden mb-8 bg-[#111111]/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-black text-white/40 uppercase tracking-[0.2em] bg-white/2">
                <th className="px-6 py-4 text-center w-20">Rank</th>
                <th className="px-6 py-4">Host Profile (Nickname)</th>
                <th className="px-6 py-4">Poppo ID</th>
                <th className="px-6 py-4 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {topNiners.length > 0 ? (
                topNiners.map((host, idx) => {
                  const rankNum = idx + 1;
                  const rankBadgeClass = 
                    rankNum === 1 ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" :
                    rankNum === 2 ? "bg-slate-300/10 text-slate-300 border border-slate-300/20" :
                    rankNum === 3 ? "bg-amber-700/10 text-amber-600 border border-amber-700/20" :
                    "bg-white/5 text-white/40 border border-white/5";

                  return (
                    <tr key={host.id} className="group hover:bg-white/2 transition-colors">
                      <td className="px-6 py-4 text-center">
                        <span className={cn("inline-flex items-center justify-center w-8 h-8 rounded-full font-black text-sm", rankBadgeClass)}>
                          {rankNum === 1 ? "🥇" : rankNum === 2 ? "🥈" : rankNum === 3 ? "🥉" : rankNum}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl bg-white/5 border overflow-hidden shrink-0 shadow-lg",
                            rankNum === 1 ? "border-yellow-500/30" :
                            rankNum === 2 ? "border-slate-300/30" :
                            rankNum === 3 ? "border-amber-700/30" : "border-white/10"
                          )} style={{ aspectRatio: '1 / 1' }}>
                            <img 
                              src={host.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${host.id}`} 
                              alt={host.nickname || host.name}
                              className="w-full h-full object-cover"
                              style={{ aspectRatio: '1 / 1', objectFit: 'cover' }}
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div>
                            <p className="font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight text-sm">
                              {host.nickname || host.name}
                            </p>
                            <p className="text-[10px] text-white/20 font-mono tracking-widest">{host.position || TEXT.ninerHost}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-white/40 tracking-widest">{host.id}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-mono text-sm font-black text-white">{formatNumber(host.totalPoints)}</span>
                          <span className="text-[9px] font-bold text-indigo-400/80">{host.contribution.toFixed(1)}% contribution</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-white/20 italic text-sm">
                    No data recorded for this timeframe.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Honors Grid - directly below the Leaderboard table within the same view */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Trophy className="text-[#FFB800]" size={20} />
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">Monthly Achievements</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { title: 'PK Slayer', emoji: '⚔️', color: 'from-orange-500/10 to-transparent border-orange-500/20' },
            { title: 'Spotlight Elite', emoji: '✨', color: 'from-cyan-500/10 to-transparent border-cyan-500/20' },
            { title: 'Fanbase Master', emoji: '📈', color: 'from-emerald-500/10 to-transparent border-emerald-500/20' },
            { title: 'Livehouse Star', emoji: '🎤', color: 'from-yellow-500/10 to-transparent border-yellow-500/20' },
            { title: 'Role Model', emoji: '🌟', color: 'from-purple-500/10 to-transparent border-purple-500/20' },
            { title: 'Top Leader', emoji: '👑', color: 'from-indigo-500/10 to-transparent border-indigo-500/20' },
          ].map((item, idx) => (
            <div key={idx} className={cn("glass border p-5 rounded-2xl relative overflow-hidden group bg-gradient-to-br transition-all hover:scale-[1.02] bg-[#111111]/60", item.color)}>
              {/* Subtle hover background glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              
              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#FFB800]/60">Monthly Honor</h4>
                  <p className="font-black text-white text-base tracking-tight uppercase">{item.title}</p>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase text-amber-500 tracking-wider">Pending</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl border border-white/10 group-hover:bg-[#FFB800]/10 group-hover:border-[#FFB800]/30 transition-all duration-300 transform group-hover:scale-110 group-hover:rotate-6 shadow-md shrink-0">
                  {item.emoji}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

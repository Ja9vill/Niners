import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Loader2, TrendingUp, Users, Star, Zap, Award } from 'lucide-react';
import { FirebaseService } from '../lib/firebaseService';
import { Host } from '../types';
import { OverviewTab } from '../NineDashboardV1';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts';

const MONTH_ORDER = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatPts(n: number) {
  if (!n || n === 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return Number(n).toLocaleString();
}

function fmtH(hours: number) {
  if (!hours || hours === 0) return '—';
  return `${hours}h`;
}

// Flexible field reader — tries multiple field name variants
function f(r: any, ...keys: string[]): number {
  for (const k of keys) {
    const v = r?.earningsBreakdown?.[k] ?? r?.[k];
    if (v !== undefined && v !== null && v !== '') return Number(v);
  }
  return 0;
}

const getLiveDuration  = (r: any) => f(r, 'liveDurationMinutes','liveDuration','live_duration','live_hours','Live Duration','live duration');
const getPoints        = (r: any) => f(r, 'totalEarningsOfPoints','total_earnings_of_points','totalPoints','total_points','points','Total Earnings Of Points','total earnings of points');
const getAgentComm     = (r: any) => f(r, 'agentCommission','agent_commission','agentComm','commission','Commission','Agent Commission');
const getLiveEarnings  = (r: any) => f(r, 'liveEarnings','live_earnings','Live Earnings','liveearnings');
const getPartyEarnings = (r: any) => f(r, 'partyEarnings','party_earnings','Party Earnings','partyearnings');
const getPrivateChat   = (r: any) => f(r, 'privateChatEarnings','private_chat_earnings','privateChat','Private Chat','private chat','Private Chat Earnings');
const getTips          = (r: any) => f(r, 'tips','Tips','tip');
const getPlatformReward = (r: any) => f(r, 'platformReward','platform_reward','Platform Reward','platformreward');
const getOtherEarnings = (r: any) => f(r, 'otherEarnings','other_earnings','Other Earnings','otherearnings');
const getPlatformHourly = (r: any) => f(r, 'platformHourlySalary','platform_hourly_salary','Platform Hourly Salary','platformhourlysalary','platformHourly');
const getSuperSalary   = (r: any) => f(r, 'superSalary','super_salary','Super Salary','supersalary');
const getSuperRank     = (r: any) => f(r, 'superRank','super_rank','Super Rank','superrank');

export const Overview = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedHosts, fetchedCommissions, fetchedReports] = await Promise.all([
          FirebaseService.getAllHosts(),
          FirebaseService.getAllCommissions(),
          FirebaseService.getAllPerformanceReports()
        ]);
        setHosts(fetchedHosts);
        setCommissions(fetchedCommissions);
        // Filter out schema template docs
        setReports(fetchedReports.filter(r => r.docId !== '_schema_template' && r.poppoId));
      } catch (err) {
        console.error("Error fetching overview data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Available years from reports
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(reports.map(r => String(r.year)).filter(Boolean)));
    return years.sort().reverse();
  }, [reports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      if (selectedYear !== 'all' && String(r.year) !== selectedYear) return false;
      if (selectedMonth !== 'all' && r.monthName !== selectedMonth) return false;
      return true;
    });
  }, [reports, selectedYear, selectedMonth]);

  // Agency-wide KPIs
  const totalPoints = useMemo(() =>
    filteredReports.reduce((sum, r) => sum + getPoints(r), 0)
  , [filteredReports]);

  const totalLiveHrs = useMemo(() =>
    filteredReports.reduce((sum, r) => sum + getLiveDuration(r), 0)
  , [filteredReports]);

  const totalPartyHrs = useMemo(() =>
    filteredReports.reduce((sum, r) => sum + Number(r.partyHostDurationMinutes || r.partyDuration || r.party_duration || 0), 0)
  , [filteredReports]);

  const uniqueHosts = useMemo(() =>
    new Set(filteredReports.map(r => r.poppoId)).size
  , [filteredReports]);

  // Build lookup: poppoId → nickname from the hosts/users collection
  const hostLookup = useMemo(() => {
    const map = new Map<string, string>();
    hosts.forEach(h => {
      const id = String(h.id || (h as any).poppo_id || (h as any).poppoId || '');
      const nick = (h as any).nickname || h.name || '';
      if (id) map.set(id, nick);
    });
    return map;
  }, [hosts]);

  // Top performers — resolve nickname from hostLookup first
  const topPerformers = useMemo(() => {
    const byHost: Record<string, { poppoId: string; name: string; points: number; liveHrs: number; months: number }> = {};
    filteredReports.forEach(r => {
      const id = r.poppoId;
      const name = hostLookup.get(String(id)) || r.hostName || id;
      if (!byHost[id]) byHost[id] = { poppoId: id, name, points: 0, liveHrs: 0, months: 0 };
      byHost[id].points += getPoints(r);
      byHost[id].liveHrs += getLiveDuration(r);
      byHost[id].months += 1;
    });
    return Object.values(byHost).sort((a, b) => b.points - a.points);
  }, [filteredReports, hostLookup]);

  // Monthly trend data
  const monthlyTrend = useMemo(() => {
    const grouped: Record<string, number> = {};
    reports.forEach(r => {
      if (selectedYear !== 'all' && String(r.year) !== selectedYear) return;
      const key = `${r.monthName} ${r.year}`;
      grouped[key] = (grouped[key] || 0) + Number(r.earningsBreakdown?.totalEarningsOfPoints || 0);
    });
    return Object.entries(grouped)
      .map(([label, points]) => ({ label, points }))
      .sort((a, b) => {
        const [aM, aY] = a.label.split(' ');
        const [bM, bY] = b.label.split(' ');
        if (aY !== bY) return Number(aY) - Number(bY);
        return MONTH_ORDER.indexOf(aM) - MONTH_ORDER.indexOf(bM);
      });
  }, [reports, selectedYear]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
        <p className="text-sm font-bold text-[#A09E9A] uppercase tracking-widest">Loading Dashboard...</p>
      </div>
    );
  }

  // If no performance report data, fallback to old overview
  if (reports.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="text-[#D4AF37]" size={24} />
          <h2 className="text-2xl font-black text-white uppercase tracking-widest">Dashboard Overview</h2>
        </div>
        <OverviewTab commissions={commissions} hosts={hosts} />
      </div>
    );
  }

  // Aggregate all earnings breakdown fields
  const sum = (fn: (r: any) => number) => filteredReports.reduce((s, r) => s + fn(r), 0);

  const kpis = [
    { label: 'Total Agency Points', value: formatPts(sum(getPoints)), icon: Star, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10' },
    { label: 'Live Hours', value: fmtH(sum(getLiveDuration)), icon: Zap, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { label: 'Agency Commission', value: formatPts(sum(getAgentComm)), icon: Award, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Active Hosts', value: String(uniqueHosts), icon: Users, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ];

  const earningsBreakdown = [
    { label: 'LIVE\nEARNINGS',          value: sum(getLiveEarnings),   color: '#06b6d4' },
    { label: 'PARTY\nEARNINGS',         value: sum(getPartyEarnings),  color: '#8b5cf6' },
    { label: 'PRIVATE\nCHAT',           value: sum(getPrivateChat),    color: '#ec4899' },
    { label: 'TIPS',                    value: sum(getTips),           color: '#f59e0b' },
    { label: 'PLATFORM\nREWARD',        value: sum(getPlatformReward), color: '#10b981' },
    { label: 'OTHER\nEARNINGS',         value: sum(getOtherEarnings),  color: '#a78bfa' },
    { label: 'PLATFORM\nHOURLY SALARY', value: sum(getPlatformHourly), color: '#38bdf8' },
    { label: 'SUPER\nSALARY',           value: sum(getSuperSalary),    color: '#D4AF37' },
    { label: 'SUPER\nRANK',             value: sum(getSuperRank),      color: '#fb923c' },
  ];

  const CHART_COLORS = ['#D4AF37','#6366f1','#ec4899','#10b981','#f59e0b','#06b6d4','#a78bfa'];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="text-[#D4AF37]" size={24} />
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-widest">Dashboard Overview</h2>
            <p className="text-xs text-[#A09E9A] font-mono">{reports.length} performance records loaded</p>
          </div>
        </div>
        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="bg-[#1A1A28] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-[#F0EFE8] outline-none focus:border-[#D4AF37] cursor-pointer"
          >
            <option value="all">All Years</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-[#1A1A28] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-[#F0EFE8] outline-none focus:border-[#D4AF37] cursor-pointer"
          >
            <option value="all">All Months</option>
            {MONTH_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="bg-[#1A1A28] border border-white/5 rounded-2xl p-4 flex items-center gap-3 hover:border-white/10 transition-all">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', kpi.bg)}>
                <Icon size={18} className={kpi.color} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#A09E9A] uppercase tracking-widest">{kpi.label}</p>
                <p className={cn('text-xl font-black', kpi.color)}>{kpi.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Earnings Breakdown Grid */}
      <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-4">
        <p className="text-[9px] font-black text-[#A09E9A]/50 uppercase tracking-[0.2em] mb-3">Earnings Breakdown</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          {earningsBreakdown.map((item, i) => (
            <div
              key={i}
              className="bg-[#0D0D14] border border-white/5 rounded-xl p-3 flex flex-col items-center text-center hover:border-white/10 transition-all group"
            >
              <p
                className="text-[8px] font-black uppercase tracking-wider leading-tight mb-2 whitespace-pre-line"
                style={{ color: item.color + 'aa' }}
              >
                {item.label}
              </p>
              <p
                className="text-sm font-black leading-none"
                style={{ color: item.color }}
              >
                {item.value > 0 ? formatPts(item.value) : '—'}
              </p>
            </div>
          ))}
        </div>
      </div>


      {monthlyTrend.length > 0 && (
        <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-purple-400" />
            <h3 className="font-bold text-[#F0EFE8] text-sm uppercase tracking-widest">Monthly Points Trend</h3>
            <span className="text-[10px] text-[#A09E9A] ml-auto font-mono">All hosts combined</span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#A09E9A', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#A09E9A' }} axisLine={false} tickLine={false} tickFormatter={v => formatPts(v)} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#13131E', borderColor: '#ffffff20', borderRadius: '12px', fontSize: '11px' }}
                  formatter={(v: number) => [`${formatPts(v)} pts`, 'Points']}
                  labelStyle={{ color: '#D4AF37', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                  {monthlyTrend.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Performers Ranking */}
      <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <Award size={16} className="text-[#D4AF37]" />
          <h3 className="font-bold text-[#F0EFE8] text-sm uppercase tracking-widest">Agency Leaderboard</h3>
          <span className="text-[10px] text-[#A09E9A] ml-auto">{topPerformers.length} hosts</span>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-4 items-center px-3 mb-2 text-[9px] font-black uppercase tracking-widest text-[#A09E9A]/50">
          <span className="w-6 text-center">#</span>
          <span>Nickname</span>
          <span className="text-right w-24">Live Duration</span>
          <span className="text-right w-24">Total Points</span>
        </div>

        <div className="space-y-1.5">
          {topPerformers.slice(0, 15).map((h, idx) => {
            const maxPts = topPerformers[0]?.points || 1;
            const pct = (h.points / maxPts) * 100;
            const medals = ['🥇', '🥈', '🥉'];
            return (
              <div
                key={h.poppoId}
                className={cn(
                  "grid grid-cols-[auto_1fr_auto_auto] gap-x-4 items-center rounded-xl p-3 transition-all border",
                  idx === 0 ? "bg-[#D4AF37]/5 border-[#D4AF37]/20" :
                  idx === 1 ? "bg-white/[0.02] border-white/5" :
                  idx === 2 ? "bg-white/[0.01] border-white/5" :
                  "border-transparent hover:bg-white/[0.02]"
                )}
              >
                {/* Rank */}
                <span className="text-sm font-black text-[#A09E9A]/50 w-6 text-center shrink-0">
                  {medals[idx] || `#${idx + 1}`}
                </span>

                {/* Nickname + ID + Progress */}
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-black text-[#F0EFE8] truncate">{h.name}</span>
                    <span className="text-[9px] text-[#A09E9A]/40 font-mono shrink-0">ID {h.poppoId}</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: idx === 0 ? '#D4AF37' : idx === 1 ? '#6366f1' : idx === 2 ? '#ec4899' : '#374151'
                      }}
                    />
                  </div>
                </div>

                {/* Live Duration */}
                <div className="text-right w-24 shrink-0">
                  <p className="text-xs font-black text-cyan-400">{fmtH(h.liveHrs)}</p>
                  <p className="text-[9px] text-[#A09E9A]/40 uppercase tracking-wider">Live</p>
                </div>

                {/* Total Points */}
                <div className="text-right w-24 shrink-0">
                  <p className="text-sm font-black text-[#D4AF37]">{formatPts(h.points)}</p>
                  <p className="text-[9px] text-[#A09E9A]/40 uppercase tracking-wider">{h.months} mo</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>



      {/* Breakdown Table */}
      {filteredReports.length > 0 && (
        <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <LayoutDashboard size={16} className="text-emerald-400" />
            <h3 className="font-bold text-[#F0EFE8] text-sm uppercase tracking-widest">All Records</h3>
            <span className="text-[10px] text-[#A09E9A] ml-auto">{filteredReports.length} entries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[#A09E9A] uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-2 px-2">Host</th>
                  <th className="py-2 px-2">Period</th>
                  <th className="py-2 px-2">Level</th>
                  <th className="py-2 px-2">Live Hrs</th>
                  <th className="py-2 px-2">Party Hrs</th>
                  <th className="py-2 px-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[...filteredReports]
                  .sort((a, b) => {
                    if (a.year !== b.year) return b.year - a.year;
                    return MONTH_ORDER.indexOf(b.monthName) - MONTH_ORDER.indexOf(a.monthName);
                  })
                  .slice(0, 50)
                  .map((r, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2 px-2">
                        <div>
                          <p className="font-bold text-[#F0EFE8] truncate max-w-[120px]">
                            {hostLookup.get(String(r.poppoId)) || r.hostName || r.poppoId}
                          </p>
                          <p className="text-[9px] text-[#A09E9A]/50 font-mono">{r.poppoId}</p>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-[#A09E9A]">{r.monthName} {r.year}</td>
                      <td className="py-2 px-2 text-[#A09E9A]">Lvl {r.level || '-'}</td>
                      <td className="py-2 px-2 text-cyan-400 font-mono">{fmtH(getLiveDuration(r))}</td>
                      <td className="py-2 px-2 text-purple-400 font-mono">{fmtH(Number(r.partyHostDurationMinutes || r.partyDuration || 0))}</td>
                      <td className="py-2 px-2 text-right font-black text-[#D4AF37] font-mono">
                        {getPoints(r).toLocaleString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {filteredReports.length > 50 && (
              <p className="text-center text-[10px] text-[#A09E9A]/40 mt-3 italic">Showing top 50 of {filteredReports.length} records</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

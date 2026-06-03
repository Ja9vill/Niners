import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Loader2, TrendingUp, Users, Star, Zap, Award } from 'lucide-react';
import { FirebaseService } from '../lib/firebaseService';
import { Host } from '../types';
import { OverviewTab } from '../NineDashboardV1';
import { cn } from '../lib/utils';
import { Storage } from '../lib/storage';
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts';

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

const formatXAxisLabel = (label: string): string => {
  if (!label) return '';
  const parts = label.split(' ');
  if (parts.length === 2) {
    const month = parts[0];
    const year = parts[1];
    const shortMonth = month.slice(0, 3);
    const shortYear = year.slice(-2);
    return `${shortMonth} '${shortYear}`;
  }
  return label;
};

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
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [selectedMonthData, setSelectedMonthData] = useState<any | null>(null);

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

        // One-time automatic database relations backfill for director / head admin
        const currentAuth = Storage.getAuthState();
        const roleLower = String(currentAuth?.role || '').toLowerCase();
        const isDirectorOrHeadAdmin = ['director', 'head admin', 'head_admin'].includes(roleLower);
        
        if (isDirectorOrHeadAdmin && !localStorage.getItem('relation_backfill_done_v2') && fetchedHosts.length > 0) {
          localStorage.setItem('relation_backfill_done_v2', 'true');
          (async () => {
            try {
              console.log("[BACKFILL] Starting automatic manager-host relations sync...");
              const managerHostsMap: Record<string, string[]> = {};
              fetchedHosts.forEach((h: any) => {
                const mgrId = h.assignedManagerId || h.assigned_manager_poppo_id || null;
                const hostId = h.id || h.poppo_id || h.poppoId;
                if (mgrId && hostId) {
                  if (!managerHostsMap[mgrId]) {
                    managerHostsMap[mgrId] = [];
                  }
                  if (!managerHostsMap[mgrId].includes(hostId)) {
                    managerHostsMap[mgrId].push(hostId);
                  }
                }
              });

              const allUsers = await FirebaseService.getAllRoleMetadata();
              const managersList = allUsers.filter(u => {
                const rLower = (u.role || '').toLowerCase();
                return rLower === 'manager' || rLower === 'agent';
              });

              let count = 0;
              for (const mgr of managersList) {
                const mgrId = mgr.poppo_id || mgr.poppoId || mgr.id;
                if (mgrId) {
                  const assignedHostsList = managerHostsMap[mgrId] || [];
                  await FirebaseService.updateManagerHostFields(mgrId, null, null, assignedHostsList);
                  count++;
                }
              }
              console.log(`[BACKFILL] Successfully backfilled ${count} manager relationships.`);
            } catch (backfillErr) {
              console.error("[BACKFILL] Failed to automatically sync manager relationships:", backfillErr);
            }
          })();
        }

        // Automatic manager/agent self-sync on login
        if ((roleLower === 'manager' || roleLower === 'agent') && currentAuth?.poppo_id && !localStorage.getItem(`self_backfill_done_${currentAuth.poppo_id}`) && fetchedHosts.length > 0) {
          localStorage.setItem(`self_backfill_done_${currentAuth.poppo_id}`, 'true');
          (async () => {
            try {
              console.log(`[BACKFILL] Starting manager self-sync for ID: ${currentAuth.poppo_id}`);
              const myHosts = fetchedHosts.filter((h: any) => {
                const mgrId = h.assignedManagerId || h.assigned_manager_poppo_id || null;
                return String(mgrId) === String(currentAuth.poppo_id);
              }).map((h: any) => h.id || h.poppo_id || h.poppoId);
              
              await FirebaseService.updateManagerHostFields(currentAuth.poppo_id, null, null, myHosts);
              console.log(`[BACKFILL] Manager self-sync complete for ${myHosts.length} hosts.`);
            } catch (err) {
              console.error("[BACKFILL] Manager self-sync failed:", err);
            }
          })();
        }
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
      grouped[key] = (grouped[key] || 0) + getPoints(r);
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

  // Precompute monthly total commissions
  const monthlyTotalCommission = useMemo(() => {
    const map = new Map<string, number>();
    reports.forEach(r => {
      const key = `${r.monthName} ${r.year}`;
      const comm = getAgentComm(r);
      map.set(key, (map.get(key) || 0) + comm);
    });
    return map;
  }, [reports]);

  // Keep spotlight synchronized when monthlyTrend loads/re-calculates
  useEffect(() => {
    if (monthlyTrend.length > 0) {
      setSelectedMonthData(monthlyTrend[monthlyTrend.length - 1]);
    } else {
      setSelectedMonthData(null);
    }
  }, [monthlyTrend]);

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
            title="Filter by Year"
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="bg-[#1A1A28] border border-[#D4AF37]/20 rounded-lg px-3 py-1.5 text-xs font-bold text-[#F0EFE8] outline-none focus:border-[#D4AF37] cursor-pointer"
          >
            <option value="all">All Years</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            title="Filter by Month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-[#1A1A28] border border-[#D4AF37]/20 rounded-lg px-3 py-1.5 text-xs font-bold text-[#F0EFE8] outline-none focus:border-[#D4AF37] cursor-pointer"
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
            <div key={i} className="bg-[#1A1A28] border border-[#D4AF37]/10 rounded-2xl p-4 flex items-center gap-3 hover:border-[#D4AF37]/20 transition-all">
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
      <div className="bg-[#1A1A28]/80 backdrop-blur-md border border-[#D4AF37]/15 shadow-2xl rounded-2xl p-5 relative overflow-hidden">
        {/* Subtle background glow for the entire section */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#D4AF37]/5 blur-3xl rounded-full pointer-events-none"></div>
        <p className="text-[9px] font-black text-[#A09E9A] uppercase tracking-[0.2em] mb-4 relative z-10 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse"></span>
          Earnings Breakdown
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3 relative z-10">
          {earningsBreakdown.map((item, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-xl p-3.5 flex flex-col items-center text-center transition-all duration-300 group hover:-translate-y-1 cursor-default shadow-lg backdrop-blur-sm"
              {...({ style: {
                background: `linear-gradient(135deg, ${item.color}15 0%, #0D0D14 100%)`,
                borderColor: `${item.color}30`,
                borderWidth: '1px',
                borderStyle: 'solid',
                boxShadow: `0 4px 12px ${item.color}05`
              } })}
            >
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none" 
                {...({ style: { background: `radial-gradient(circle at center, ${item.color} 0%, transparent 70%)` } })}
              />
              <p
                className="text-[8px] font-black uppercase tracking-widest leading-tight mb-2.5 whitespace-pre-line drop-shadow-sm transition-colors group-hover:text-white z-10"
                {...({ style: { color: item.color + 'cc' } })}
              >
                {item.label}
              </p>
              <p
                className="text-sm sm:text-base font-black leading-none drop-shadow-md z-10"
                {...({ style: { color: item.color } })}
              >
                {item.value > 0 ? formatPts(item.value) : '—'}
              </p>
              {/* Bottom accent line */}
              <div 
                className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 ease-out"
                {...({ style: { backgroundColor: item.color } })}
              ></div>
            </div>
          ))}
        </div>
      </div>


      {monthlyTrend.length > 0 && (
        <div className="bg-[#1A1A28] border border-[#D4AF37]/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-[#D4AF37]" />
              <h3 className="font-bold text-[#F0EFE8] text-sm uppercase tracking-widest">Monthly Points Trend</h3>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[#A09E9A] font-mono hidden sm:inline">All hosts combined</span>
              <div className="flex bg-[#0D0D14] p-0.5 rounded-lg border border-[#D4AF37]/15">
                <button
                  onClick={() => setChartType('area')}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                    chartType === 'area'
                      ? "bg-[#D4AF37] text-[#0D0D14] shadow-sm"
                      : "text-[#A09E9A] hover:text-[#F0EFE8]"
                  )}
                >
                  Area
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                    chartType === 'bar'
                      ? "bg-[#D4AF37] text-[#0D0D14] shadow-sm"
                      : "text-[#A09E9A] hover:text-[#F0EFE8]"
                  )}
                >
                  Bar
                </button>
              </div>
            </div>
          </div>

          <div className="h-56 sm:h-64">
            {chartType === 'area' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={monthlyTrend}
                  margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload.length > 0) {
                      setSelectedMonthData(state.activePayload[0].payload);
                    }
                  }}
                >
                  <defs>
                    <linearGradient id="trendAreaColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                  <XAxis dataKey="label" tickFormatter={formatXAxisLabel} tick={{ fontSize: 9, fill: '#A09E9A', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#A09E9A' }} axisLine={false} tickLine={false} tickFormatter={v => formatPts(v)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#13131E', borderColor: 'rgba(212, 175, 55, 0.2)', borderRadius: '12px', fontSize: '11px' }}
                    itemStyle={{ color: '#F0EFE8' }}
                    formatter={(v: number) => [`${formatPts(v)} pts`, 'Points']}
                    labelStyle={{ color: '#D4AF37', fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="points" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#trendAreaColor)" activeDot={{ r: 6, fill: '#D4AF37', stroke: '#0D0D14', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyTrend}
                  margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload.length > 0) {
                      setSelectedMonthData(state.activePayload[0].payload);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                  <XAxis dataKey="label" tickFormatter={formatXAxisLabel} tick={{ fontSize: 9, fill: '#A09E9A', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#A09E9A' }} axisLine={false} tickLine={false} tickFormatter={v => formatPts(v)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#13131E', borderColor: 'rgba(212, 175, 55, 0.2)', borderRadius: '12px', fontSize: '11px' }}
                    itemStyle={{ color: '#F0EFE8' }}
                    formatter={(v: number) => [`${formatPts(v)} pts`, 'Points']}
                    labelStyle={{ color: '#D4AF37', fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                    {monthlyTrend.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                        fillOpacity={0.8}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {selectedMonthData && (() => {
            const currentAuth = Storage.getAuthState();
            const [mName, yStr] = selectedMonthData.label.split(' ');
            const userMonthReports = reports.filter(r => 
              String(r.poppoId) === String(currentAuth?.poppo_id) &&
              r.monthName === mName &&
              String(r.year) === yStr
            );
            const userComm = userMonthReports.reduce((sum, r) => sum + getAgentComm(r), 0);
            const totalMonthComm = monthlyTotalCommission.get(selectedMonthData.label) || 0;
            const sharePct = totalMonthComm > 0 ? (userComm / totalMonthComm) * 100 : 0;
            const hasContribution = userComm > 0;

            return (
              <div className="mt-4 p-4 bg-[#0D0D14] border border-[#D4AF37]/15 rounded-xl flex flex-col gap-2.5 transition-all animate-fade-in">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-[10px] font-black text-[#A09E9A] uppercase tracking-wider">Spotlight: {selectedMonthData.label}</p>
                    <p className="text-base font-black text-[#D4AF37] mt-0.5">{Number(selectedMonthData.points).toLocaleString()} Points</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-[#A09E9A]/60 uppercase tracking-widest">YOUR SHARE CONTRIBUTION OF SELECTED PERIOD</p>
                    {hasContribution ? (
                      <p className="text-base font-black text-white mt-0.5">
                        {sharePct.toFixed(2)}% <span className="text-xs text-[#A09E9A]/50 font-normal">({userComm.toLocaleString()} commission)</span>
                      </p>
                    ) : (
                      <p className="text-xs font-bold text-[#A09E9A]/40 mt-0.5 uppercase">No Data Available</p>
                    )}
                  </div>
                </div>
                {!hasContribution && (
                  <div className="pt-2 border-t border-[#D4AF37]/10 mt-1">
                    <p className="text-[10px] text-[#A09E9A]/70 leading-relaxed italic">
                      If you have not contributed to this period, for sure you have contributed with your hard work and dedication to representing the management with high standards.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Top Performers Ranking */}
      <div className="bg-[#1A1A28] border border-[#D4AF37]/10 rounded-2xl p-5">
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
            
            // Highlight top 9 in gradient border & background; ranks 10 to 15 have no highlight
            const rowStyle = idx < 9
              ? idx === 0
                ? "bg-gradient-to-r from-[#D4AF37]/15 via-[#D4AF37]/4 to-[#1A1A28]/40 border-[#D4AF37]/35 shadow-md shadow-[#D4AF37]/5"
                : idx < 3
                  ? "bg-gradient-to-r from-purple-500/10 via-purple-500/2 to-[#1A1A28]/20 border-purple-500/25"
                  : "bg-gradient-to-r from-[#D4AF37]/8 via-transparent to-transparent border-[#D4AF37]/15"
              : "bg-transparent border-[#D4AF37]/5 hover:bg-white/[0.02]";

            return (
              <div
                key={h.poppoId}
                className={cn(
                  "grid grid-cols-[auto_1fr_auto_auto] gap-x-4 items-center rounded-xl p-3 transition-all border",
                  rowStyle
                )}
              >
                {/* Rank */}
                <span className="text-sm font-black text-[#A09E9A]/50 w-6 text-center shrink-0">
                  {medals[idx] || `#${idx + 1}`}
                </span>

                {/* Nickname + ID + Progress */}
                <div className="min-w-0">
                  <div className="flex flex-col mb-1">
                    <span className="text-sm font-black text-[#F0EFE8] truncate">{h.name}</span>
                    <span className="text-[9px] text-[#A09E9A]/40 font-mono mt-0.5">ID: {h.poppoId}</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      {...({ style: {
                        width: `${pct}%`,
                        background: idx === 0 ? '#D4AF37' : idx === 1 ? '#8b5cf6' : idx === 2 ? '#ec4899' : '#374151'
                      } })}
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
        <div className="bg-[#1A1A28] border border-[#D4AF37]/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <LayoutDashboard size={16} className="text-emerald-400" />
            <h3 className="font-bold text-[#F0EFE8] text-sm uppercase tracking-widest">All Records</h3>
            <span className="text-[10px] text-[#A09E9A] ml-auto">{filteredReports.length} entries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[#D4AF37]/10 text-[#A09E9A] uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-2 px-2">Host</th>
                  <th className="py-2 px-2">Period</th>
                  <th className="py-2 px-2">Level</th>
                  <th className="py-2 px-2">Live Hrs</th>
                  <th className="py-2 px-2">Share %</th>
                  <th className="py-2 px-2 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D4AF37]/10">
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
                      <td className="py-2 px-2 text-purple-400 font-mono">
                        {(() => {
                          const key = `${r.monthName} ${r.year}`;
                          const total = monthlyTotalCommission.get(key) || 0;
                          const hostComm = getAgentComm(r);
                          const pct = total > 0 ? (hostComm / total) * 100 : 0;
                          return `${pct.toFixed(2)}%`;
                        })()}
                      </td>
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

import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, Loader2, TrendingUp, Users, Star, Zap, Award, Clock } from 'lucide-react';
import { FirebaseService } from '../lib/firebaseService';
import { Host } from '../types';
import { OverviewTab } from '../NineDashboardV1';
import { HostProfileView } from '../components/HostProfileView';
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
  const [lbYear, setLbYear] = useState<string>('all');
  const [lbMonth, setLbMonth] = useState<string>('all');
  const [spotlightHost, setSpotlightHost] = useState<Host | null>(null);
  const [showRecords, setShowRecords] = useState<boolean>(false);
  const [recordsSortOption, setRecordsSortOption] = useState<'default' | 'name' | 'share'>('default');
  const [selectedTierForList, setSelectedTierForList] = useState<string | null>(null);

  const handleSpotlightClick = (poppoId: string) => {
    const host = hosts.find(h => String(h.poppo_id || h.id || h.poppoId) === String(poppoId));
    if (host) setSpotlightHost(host);
  };

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

  // Leaderboard specific filtered reports
  const lbReports = useMemo(() => {
    return reports.filter(r => {
      if (lbYear !== 'all' && String(r.year) !== lbYear) return false;
      if (lbMonth !== 'all' && r.monthName !== lbMonth) return false;
      return true;
    });
  }, [reports, lbYear, lbMonth]);

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
    const byHost: Record<string, { poppoId: string; name: string; points: number; liveHrs: number; months: number; commission: number }> = {};
    lbReports.forEach(r => {
      const id = r.poppoId;
      const name = hostLookup.get(String(id)) || r.hostName || id;
      if (!byHost[id]) byHost[id] = { poppoId: id, name, points: 0, liveHrs: 0, months: 0, commission: 0 };
      byHost[id].points += getPoints(r);
      byHost[id].liveHrs += getLiveDuration(r);
      byHost[id].months += 1;
      byHost[id].commission += getAgentComm(r);
    });
    return Object.values(byHost).sort((a, b) => b.commission - a.commission);
  }, [lbReports, hostLookup]);

  const lbTotalPeriodCommission = useMemo(() => {
    return lbReports.reduce((sum, r) => sum + getAgentComm(r), 0);
  }, [lbReports]);

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

  const sortedReports = useMemo(() => {
    const data = [...reports];
    if (recordsSortOption === 'name') {
      data.sort((a, b) => {
        const nameA = (hostLookup.get(String(a.poppoId)) || a.hostName || a.poppoId || '').toLowerCase();
        const nameB = (hostLookup.get(String(b.poppoId)) || b.hostName || b.poppoId || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else if (recordsSortOption === 'share') {
      data.sort((a, b) => {
        const keyA = `${a.monthName} ${a.year}`;
        const totalA = monthlyTotalCommission.get(keyA) || 0;
        const hostCommA = getAgentComm(a);
        const pctA = totalA > 0 ? (hostCommA / totalA) : 0;

        const keyB = `${b.monthName} ${b.year}`;
        const totalB = monthlyTotalCommission.get(keyB) || 0;
        const hostCommB = getAgentComm(b);
        const pctB = totalB > 0 ? (hostCommB / totalB) : 0;

        if (pctB !== pctA) {
          return pctB - pctA;
        }
        const nameA = (hostLookup.get(String(a.poppoId)) || a.hostName || a.poppoId || '').toLowerCase();
        const nameB = (hostLookup.get(String(b.poppoId)) || b.hostName || b.poppoId || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else {
      data.sort((a, b) => {
        if (a.year !== b.year) return Number(b.year) - Number(a.year);
        return MONTH_ORDER.indexOf(b.monthName) - MONTH_ORDER.indexOf(a.monthName);
      });
    }
    return data;
  }, [reports, recordsSortOption, hostLookup, monthlyTotalCommission]);

  // Compute Base Salary Tiers strictly for S idol, Esports, Star Host, Rocket Host
  const baseSalaryTiersData = useMemo(() => {
    const data: Record<string, { count: number; hosts: Host[] }> = {
      'S idol': { count: 0, hosts: [] },
      'Esports': { count: 0, hosts: [] },
      'Star Host': { count: 0, hosts: [] },
      'Rocket Host': { count: 0, hosts: [] }
    };
    
    hosts.forEach(h => {
      const tierRaw = h.tier_pay || (h as any).tierPay || (h as any).tier_Pay;
      if (!tierRaw) return;
      const tierLower = String(tierRaw).trim().toLowerCase();
      
      if (tierLower.includes('s idol') || tierLower.includes('sidol')) {
        data['S idol'].count++;
        data['S idol'].hosts.push(h);
      } else if (tierLower.includes('esports')) {
        data['Esports'].count++;
        data['Esports'].hosts.push(h);
      } else if (tierLower.includes('star')) {
        data['Star Host'].count++;
        data['Star Host'].hosts.push(h);
      } else if (tierLower.includes('rocket')) {
        data['Rocket Host'].count++;
        data['Rocket Host'].hosts.push(h);
      }
    });
    
    return data;
  }, [hosts]);

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



  const CHART_COLORS = ['#D4AF37','#6366f1','#ec4899','#10b981','#f59e0b','#06b6d4','#a78bfa'];

  return (
    <div className="flex flex-col gap-6">
      {/* INJECTED DYNAMIC CSS TO BYPASS INLINE STYLES LINTER */}
      <style>{`
        .global-block-1 {
          background: linear-gradient(to bottom right, #3A2A18, #221A15);
          border: 1px solid rgba(255, 184, 0, 0.12);
        }
        .global-block-1:hover {
          border-color: rgba(255, 184, 0, 0.35);
        }
        .global-block-2 {
          background: linear-gradient(to bottom right, #3D221C, #221515);
          border: 1px solid rgba(255, 123, 0, 0.12);
        }
        .global-block-2:hover {
          border-color: rgba(255, 123, 0, 0.35);
        }
        .global-block-3 {
          background: linear-gradient(to bottom right, #3A1C28, #20131A);
          border: 1px solid rgba(255, 59, 92, 0.12);
        }
        .global-block-3:hover {
          border-color: rgba(255, 59, 92, 0.35);
        }

        .global-tier-1 {
          background: linear-gradient(to bottom right, #3B1B3A, #1A101C);
          border: 1px solid rgba(245, 0, 87, 0.15);
        }
        .global-tier-1:hover, .global-tier-1.active-tier {
          border-color: rgba(245, 0, 87, 0.45);
          box-shadow: 0 0 10px rgba(245, 0, 87, 0.1);
        }
        .global-tier-2 {
          background: linear-gradient(to bottom right, #2E203B, #17111E);
          border: 1px solid rgba(213, 0, 249, 0.15);
        }
        .global-tier-2:hover, .global-tier-2.active-tier {
          border-color: rgba(213, 0, 249, 0.45);
          box-shadow: 0 0 10px rgba(213, 0, 249, 0.1);
        }
        .global-tier-3 {
          background: linear-gradient(to bottom right, #373322, #1B1A12);
          border: 1px solid rgba(255, 234, 0, 0.15);
        }
        .global-tier-3:hover, .global-tier-3.active-tier {
          border-color: rgba(255, 234, 0, 0.45);
          box-shadow: 0 0 10px rgba(255, 234, 0, 0.1);
        }
        .global-tier-4 {
          background: linear-gradient(to bottom right, #1E2838, #0E131C);
          border: 1px solid rgba(0, 229, 255, 0.15);
        }
        .global-tier-4:hover, .global-tier-4.active-tier {
          border-color: rgba(0, 229, 255, 0.45);
          box-shadow: 0 0 10px rgba(0, 229, 255, 0.1);
        }
      `}</style>

      {/* Base Salary Tiers Block */}
      <div className="glass-card relative overflow-hidden">
        {/* Subtle background glow for the entire section */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#D4AF37]/5 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none"></div>
        
        <p className="text-[9px] font-black text-[#A09E9A] uppercase tracking-[0.2em] mb-4 relative z-10 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse"></span>
          BASE SALARY TIERS
        </p>

        <div className="grid grid-cols-4 gap-3 relative z-10">
          {[
            { label: 'S idol', key: 'S idol', class: 'global-tier-1', color: '#F50057' },
            { label: 'Esports', key: 'Esports', class: 'global-tier-2', color: '#D500F9' },
            { label: 'Star Host', key: 'Star Host', class: 'global-tier-3', color: '#FFEA00' },
            { label: 'Rocket Host', key: 'Rocket Host', class: 'global-tier-4', color: '#00E5FF' }
          ].map((item, idx) => {
            const dataVal = baseSalaryTiersData[item.key];
            const isActive = selectedTierForList === item.key;
            return (
              <div
                key={idx}
                onClick={() => setSelectedTierForList(isActive ? null : item.key)}
                className={cn(
                  "relative overflow-hidden flex flex-col items-center justify-center text-center rounded-xl px-2 py-3 transition-all duration-300 group cursor-pointer border select-none hover:-translate-y-0.5",
                  item.class,
                  isActive && "active-tier"
                )}
              >
                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest leading-tight mb-2 text-[#A09E9A] drop-shadow-md z-10 transition-colors group-hover:text-white">
                  {item.label}
                </p>
                <p
                  className="text-sm sm:text-2xl md:text-3xl font-black leading-none drop-shadow-md z-10"
                  style={{ color: item.color }}
                >
                  {dataVal?.count || 0}
                </p>
              </div>
            );
          })}
        </div>

        {/* Expanded Tier Members List */}
        {selectedTierForList && (
          <div className="bg-[#0D0D14]/95 border border-[#D4AF37]/15 rounded-xl p-4 mt-3 transition-all duration-300 relative z-10">
            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
              <p className="text-[10px] font-black text-[#A09E9A] uppercase tracking-wider">
                {selectedTierForList} Tier Members ({baseSalaryTiersData[selectedTierForList]?.hosts.length || 0})
              </p>
              <button
                onClick={() => setSelectedTierForList(null)}
                className="text-[#A09E9A] hover:text-white text-[10px] uppercase font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            {baseSalaryTiersData[selectedTierForList]?.hosts.length === 0 ? (
              <p className="text-xs text-[#A09E9A]/50 italic py-2">No members in this tier category.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                {baseSalaryTiersData[selectedTierForList]?.hosts
                  .slice()
                  .sort((a, b) => {
                    const nameA = (a.nickname || a.name || 'Unnamed').toLowerCase();
                    const nameB = (b.nickname || b.name || 'Unnamed').toLowerCase();
                    return nameA.localeCompare(nameB);
                  })
                  .map((h, idx) => {
                  const nickname = h.nickname || h.name || 'Unnamed';
                  return (
                    <div
                      key={h.id || idx}
                      onClick={() => handleSpotlightClick((h as any).poppo_id || h.id || '')}
                      className="bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-[#D4AF37]/20 rounded-lg px-3 py-2 cursor-pointer transition-all duration-200 flex items-center gap-2 group/member"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 opacity-65 group-hover/member:scale-125 transition-transform"></span>
                      <span className="text-xs font-black text-[#F0EFE8] truncate group-hover/member:text-[#D4AF37]">
                        {nickname}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Header with Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="text-[#D4AF37]" size={24} />
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-widest">Dashboard Overview</h2>
            <p className="text-xs text-[#A09E9A] font-mono">{reports.length} performance records loaded</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            title="Filter by Year"
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            className="bg-[#0D0D14] border border-[#D4AF37]/20 rounded-lg px-3 py-1.5 text-xs font-bold text-[#F0EFE8] outline-none focus:border-[#D4AF37] cursor-pointer shadow-inner"
          >
            <option value="all">All Years</option>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            title="Filter by Month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="bg-[#0D0D14] border border-[#D4AF37]/20 rounded-lg px-3 py-1.5 text-xs font-bold text-[#F0EFE8] outline-none focus:border-[#D4AF37] cursor-pointer shadow-inner"
          >
            <option value="all">All Months</option>
            {MONTH_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* Agency Performance Metrics */}
      <div className="glass-card relative overflow-hidden">
        {/* Subtle background glow for the entire section */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#D4AF37]/5 blur-3xl rounded-full pointer-events-none"></div>
        <p className="text-[9px] font-black text-[#A09E9A] uppercase tracking-[0.2em] mb-4 sm:mb-5 relative z-10 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse"></span>
          AGENCY PERFORMANCE METRICS
        </p>

        <div className="grid grid-cols-3 gap-3 relative z-10">
          {/* COLUMN 1: REVENUE */}
          <div className="flex flex-col gap-2.5 min-w-0">
            <h4 className="text-[9px] sm:text-[10px] font-bold text-[#A09E9A] uppercase tracking-widest pl-2 border-l-2 border-[#FFB800]/40 mb-1">
              REVENUE
            </h4>
            
            {/* Row 1 Block 1: Total Agency Pts. */}
            <div className="global-block-1 relative overflow-hidden rounded-xl p-2.5 sm:p-4 flex flex-col justify-between min-h-[84px] sm:min-h-[104px] transition-all duration-300 group hover:-translate-y-0.5 shadow-lg border">
              <Star className="absolute top-2 right-2 w-4 h-4 opacity-[0.07] pointer-events-none" style={{ color: '#FFB800' }} />
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-[#A09E9A] leading-tight pr-4">
                Total Agency Pts.
              </p>
              <p className="text-sm sm:text-2xl md:text-3xl font-black leading-none mt-2 truncate" style={{ color: '#FFB800' }}>
                {formatPts(sum(getPoints))}
              </p>
            </div>

            {/* Row 2 Block 1: Agency Commission */}
            <div className="global-block-1 relative overflow-hidden rounded-xl p-2.5 sm:p-4 flex flex-col justify-between min-h-[84px] sm:min-h-[104px] transition-all duration-300 group hover:-translate-y-0.5 shadow-lg border">
              <Award className="absolute top-2 right-2 w-4 h-4 opacity-[0.07] pointer-events-none" style={{ color: '#FFB800' }} />
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-[#A09E9A] leading-tight pr-4">
                Agency Commission
              </p>
              <p className="text-sm sm:text-2xl md:text-3xl font-black leading-none mt-2 truncate" style={{ color: '#FFB800' }}>
                {formatPts(sum(getAgentComm))}
              </p>
            </div>
          </div>

          {/* COLUMN 2: INCENTIVES */}
          <div className="flex flex-col gap-2.5 min-w-0">
            <h4 className="text-[9px] sm:text-[10px] font-bold text-[#A09E9A] uppercase tracking-widest pl-2 border-l-2 border-[#FF7B00]/40 mb-1">
              INCENTIVES
            </h4>

            {/* Row 1 Block 2: Super Salary */}
            <div className="global-block-2 relative overflow-hidden rounded-xl p-2.5 sm:p-4 flex flex-col justify-between min-h-[84px] sm:min-h-[104px] transition-all duration-300 group hover:-translate-y-0.5 shadow-lg border">
              <Zap className="absolute top-2 right-2 w-4 h-4 opacity-[0.07] pointer-events-none" style={{ color: '#FF7B00' }} />
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-[#A09E9A] leading-tight pr-4">
                Super Salary
              </p>
              <p className="text-sm sm:text-2xl md:text-3xl font-black leading-none mt-2 truncate" style={{ color: '#FF7B00' }}>
                {formatPts(sum(getSuperSalary))}
              </p>
            </div>

            {/* Row 2 Block 2: Super Rank */}
            <div className="global-block-2 relative overflow-hidden rounded-xl p-2.5 sm:p-4 flex flex-col justify-between min-h-[84px] sm:min-h-[104px] transition-all duration-300 group hover:-translate-y-0.5 shadow-lg border">
              <TrendingUp className="absolute top-2 right-2 w-4 h-4 opacity-[0.07] pointer-events-none" style={{ color: '#FF7B00' }} />
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-[#A09E9A] leading-tight pr-4">
                Super Rank
              </p>
              <p className="text-sm sm:text-2xl md:text-3xl font-black leading-none mt-2 truncate" style={{ color: '#FF7B00' }}>
                {formatPts(sum(getSuperRank))}
              </p>
            </div>
          </div>

          {/* COLUMN 3: ACTIVE MEMBERS */}
          <div className="flex flex-col gap-2.5 min-w-0">
            <h4 className="text-[9px] sm:text-[10px] font-bold text-[#A09E9A] uppercase tracking-widest pl-2 border-l-2 border-[#FF3B5C]/40 mb-1">
              ACTIVE MEMBERS
            </h4>

            {/* Row 1 Block 3: Active Host */}
            <div className="global-block-3 relative overflow-hidden rounded-xl p-2.5 sm:p-4 flex flex-col justify-between min-h-[84px] sm:min-h-[104px] transition-all duration-300 group hover:-translate-y-0.5 shadow-lg border">
              <Users className="absolute top-2 right-2 w-4 h-4 opacity-[0.07] pointer-events-none" style={{ color: '#FF3B5C' }} />
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-[#A09E9A] leading-tight pr-4">
                Active Host
              </p>
              <p className="text-sm sm:text-2xl md:text-3xl font-black leading-none mt-2 truncate" style={{ color: '#FF3B5C' }}>
                {String(uniqueHosts)}
              </p>
            </div>

            {/* Row 2 Block 3: Total Live Hours */}
            <div className="global-block-3 relative overflow-hidden rounded-xl p-2.5 sm:p-4 flex flex-col justify-between min-h-[84px] sm:min-h-[104px] transition-all duration-300 group hover:-translate-y-0.5 shadow-lg border">
              <Clock className="absolute top-2 right-2 w-4 h-4 opacity-[0.07] pointer-events-none" style={{ color: '#FF3B5C' }} />
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-[#A09E9A] leading-tight pr-4">
                Total Live Hours
              </p>
              <p className="text-sm sm:text-2xl md:text-3xl font-black leading-none mt-2 truncate" style={{ color: '#FF3B5C' }}>
                {fmtH(sum(getLiveDuration))}
              </p>
            </div>
          </div>
        </div>
      </div>


      {monthlyTrend.length > 0 && (
        <div className="glass-card">
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

        </div>
      )}

      {/* Merged Agency Leaderboard & Spotlight Block */}
      <div className="glass-card relative overflow-hidden flex flex-col gap-4">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>
        
        {/* Combined Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-[#D4AF37]/10 pb-4">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-[#D4AF37]" />
            <h3 className="font-bold text-[#F0EFE8] text-sm uppercase tracking-widest whitespace-nowrap">Host Leaderboard & Contribution</h3>
          </div>
          <div className="flex items-center gap-2 relative z-10">
            <select
              title="Leaderboard Year"
              value={lbYear}
              onChange={e => setLbYear(e.target.value)}
              className="bg-[#0D0D14] border border-[#D4AF37]/20 rounded-lg px-3 py-1.5 text-xs font-bold text-[#F0EFE8] outline-none focus:border-[#D4AF37] cursor-pointer shadow-inner"
            >
              <option value="all">All Years</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select
              title="Leaderboard Month"
              value={lbMonth}
              onChange={e => setLbMonth(e.target.value)}
              className="bg-[#0D0D14] border border-[#D4AF37]/20 rounded-lg px-3 py-1.5 text-xs font-bold text-[#F0EFE8] outline-none focus:border-[#D4AF37] cursor-pointer shadow-inner"
            >
              <option value="all">All Months</option>
              {MONTH_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <span className="text-[10px] text-[#A09E9A] font-mono whitespace-nowrap ml-1">
              ({topPerformers.length} hosts)
            </span>
          </div>
        </div>

        {/* Spotlight Logic */}
        {(() => {
          const currentAuth = Storage.getAuthState();
          
          // User's commission for the selected period
          const userPeriodReports = lbReports.filter(r => String(r.poppoId) === String(currentAuth?.poppo_id));
          const userComm = userPeriodReports.reduce((sum, r) => sum + getAgentComm(r), 0);
          
          const sharePct = lbTotalPeriodCommission > 0 ? (userComm / lbTotalPeriodCommission) * 100 : 0;
          const hasContribution = userComm > 0;
          
          return (
            <div className="bg-[#0D0D14] border border-[#D4AF37]/15 rounded-xl p-4 flex flex-row justify-between items-center gap-4 transition-all">
              <div className="flex flex-col">
                <p className="text-base font-black text-[#D4AF37]">{lbTotalPeriodCommission.toLocaleString()} Pts</p>
                <p className="text-[10px] font-bold text-[#A09E9A]/60 uppercase tracking-widest mt-0.5">Agency Commission</p>
              </div>
              <div className="flex flex-col text-right items-end">
                <p className="text-[10px] font-bold text-[#A09E9A]/60 uppercase tracking-widest">Your Share Contribution</p>
                <p className="text-base font-black text-white mt-0.5">
                  {hasContribution ? sharePct.toFixed(2) : "0.00"}%
                </p>
              </div>
            </div>
          );
        })()}

        {/* Leaderboard Section */}
        <div className="mt-2">
          {/* Column Headers */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-1.5 sm:gap-x-4 items-center px-3 mb-2 text-[9px] font-black uppercase tracking-widest text-[#A09E9A]/50">
            <span className="w-5 sm:w-6 text-center">#</span>
            <span>Nickname</span>
            <span className="text-right w-12 sm:w-20">Live Hrs</span>
            <span className="text-right w-16 sm:w-24">Points</span>
            <span className="text-right w-14 sm:w-20">Share %</span>
          </div>

          <div className="space-y-1.5">
            {topPerformers.slice(0, 15).map((h, idx) => {
              const maxComm = topPerformers[0]?.commission || 1;
              const pct = (h.commission / maxComm) * 100;
              const medals = ['🥇', '🥈', '🥉'];
              
              // Define fading colors for Top 9: Light Yellow -> Gold -> Orange -> Red
              const top9Styles = [
                "bg-gradient-to-r from-[#fef08a]/15 via-[#fef08a]/4 to-[#1A1A28]/40 border-[#fef08a]/35 shadow-md shadow-[#fef08a]/5",
                "bg-gradient-to-r from-[#facc15]/15 via-[#facc15]/4 to-[#1A1A28]/40 border-[#facc15]/35 shadow-md shadow-[#facc15]/5",
                "bg-gradient-to-r from-[#D4AF37]/15 via-[#D4AF37]/4 to-[#1A1A28]/40 border-[#D4AF37]/35 shadow-md shadow-[#D4AF37]/5",
                "bg-gradient-to-r from-[#fb923c]/15 via-[#fb923c]/4 to-[#1A1A28]/40 border-[#fb923c]/30",
                "bg-gradient-to-r from-[#f97316]/15 via-[#f97316]/4 to-[#1A1A28]/40 border-[#f97316]/30",
                "bg-gradient-to-r from-[#ea580c]/15 via-[#ea580c]/4 to-[#1A1A28]/40 border-[#ea580c]/30",
                "bg-gradient-to-r from-[#f87171]/15 via-[#f87171]/4 to-[#1A1A28]/40 border-[#f87171]/30",
                "bg-gradient-to-r from-[#ef4444]/15 via-[#ef4444]/4 to-[#1A1A28]/40 border-[#ef4444]/30",
                "bg-gradient-to-r from-[#dc2626]/15 via-[#dc2626]/4 to-[#1A1A28]/40 border-[#dc2626]/30"
              ];
              
              const top9Colors = [
                '#fef08a', '#facc15', '#D4AF37', '#fb923c', '#f97316', '#ea580c', '#f87171', '#ef4444', '#dc2626'
              ];

              const rowStyle = idx < 9
                ? top9Styles[idx]
                : idx < 15
                  ? "bg-gradient-to-r from-[#D4AF37]/8 via-transparent to-transparent border-[#D4AF37]/15"
                  : "bg-transparent border-[#D4AF37]/5 hover:bg-white/[0.02]";

              return (
                <div
                  key={h.poppoId}
                  onClick={() => { if(idx < 9) handleSpotlightClick(h.poppoId); }}
                  className={cn(
                    "grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-1.5 sm:gap-x-4 items-center rounded-xl p-2 sm:p-3 transition-all border",
                    rowStyle,
                    idx < 9 && "cursor-pointer hover:scale-[1.01] hover:brightness-110"
                  )}
                >
                  <span className="text-sm font-black text-[#A09E9A]/50 w-5 sm:w-6 text-center shrink-0">
                    {medals[idx] || `#${idx + 1}`}
                  </span>

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
                          background: idx < 9 ? top9Colors[idx] : '#374151'
                        } })}
                      />
                    </div>
                  </div>

                  <div className="text-right w-12 sm:w-20 shrink-0">
                    <p className="text-xs font-black text-purple-400">{fmtH(h.liveHrs)}</p>
                    <p className="text-[9px] text-[#A09E9A]/40 uppercase tracking-wider hidden sm:block">Live</p>
                  </div>

                  <div className="text-right w-16 sm:w-24 shrink-0">
                    <p className="text-sm font-black text-[#D4AF37]">{formatPts(h.points)}</p>
                    <p className="text-[9px] text-[#A09E9A]/40 uppercase tracking-wider hidden sm:block">{h.months} mo</p>
                  </div>

                  <div className="text-right w-14 sm:w-20 shrink-0">
                    <p className="text-xs font-black text-cyan-400">
                      {(() => {
                        const sharePct = lbTotalPeriodCommission > 0 ? (h.commission / lbTotalPeriodCommission) * 100 : 0;
                        return `${sharePct.toFixed(2)}%`;
                      })()}
                    </p>
                    <p className="text-[9px] text-[#A09E9A]/40 uppercase tracking-wider hidden sm:block">Share</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>



      {/* Breakdown Table */}
      {reports.length > 0 && (
        <div className="border border-[#D4AF37]/15 rounded-2xl p-5 relative overflow-hidden backdrop-blur-md shadow-2xl" style={{ background: 'linear-gradient(to bottom right, #1E1C24, #121017)' }}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <LayoutDashboard size={16} className="text-emerald-400" />
              <h3 className="font-bold text-[#F0EFE8] text-sm uppercase tracking-widest">All Records</h3>
              <span className="text-[10px] text-[#A09E9A] font-mono">({reports.length} entries)</span>
            </div>
            
            <div className="flex items-center gap-3">
              {showRecords && (
                <select
                  title="Sort Records"
                  value={recordsSortOption}
                  onChange={e => setRecordsSortOption(e.target.value as any)}
                  className="bg-[#0D0D14] border border-[#D4AF37]/20 rounded-lg px-3 py-1.5 text-xs font-bold text-[#F0EFE8] outline-none focus:border-[#D4AF37] cursor-pointer shadow-inner"
                >
                  <option value="default">Default Sort</option>
                  <option value="name">Name A-Z</option>
                  <option value="share">Share % (High to Low)</option>
                </select>
              )}
              <button
                onClick={() => setShowRecords(!showRecords)}
                className="bg-[#0D0D14] border border-[#D4AF37]/20 hover:border-[#D4AF37] px-4 py-1.5 rounded-lg text-xs font-bold text-[#F0EFE8] transition-all cursor-pointer hover:bg-white/[0.02] shadow-sm select-none"
              >
                {showRecords ? 'Hide Records' : 'Show Records'}
              </button>
            </div>
          </div>

          {showRecords && (
            <div className="overflow-x-auto transition-all duration-300">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#D4AF37]/10 text-[#A09E9A] uppercase tracking-wider text-[10px] font-bold" style={{ background: 'linear-gradient(to right, rgba(212, 175, 55, 0.08), transparent)' }}>
                    <th className="py-2 px-2">Host</th>
                    <th className="py-2 px-2">Period</th>
                    <th className="py-2 px-2">Live Hrs</th>
                    <th className="py-2 px-2">Share %</th>
                    <th className="py-2 px-2 text-right">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D4AF37]/10">
                  {sortedReports
                    .slice(0, 50)
                    .map((r, i) => (
                      <tr key={i} className="hover:bg-gradient-to-r hover:from-white/[0.02] hover:to-transparent transition-colors">
                        <td className="py-2 px-2">
                          <div>
                            <p className="font-bold text-[#F0EFE8] truncate max-w-[120px]">
                              {hostLookup.get(String(r.poppoId)) || r.hostName || r.poppoId}
                            </p>
                            <p className="text-[9px] text-[#A09E9A]/50 font-mono">{r.poppoId}</p>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-[#A09E9A]">{r.monthName} {r.year}</td>
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
              {reports.length > 50 && (
                <p className="text-center text-[10px] text-[#A09E9A]/40 mt-3 italic">Showing top 50 of {reports.length} records</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* SPOTLIGHT MODAL */}
      {spotlightHost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <HostProfileView 
            host={spotlightHost} 
            isReadOnly={false} 
            onClose={() => setSpotlightHost(null)} 
            onProfileUpdated={() => {}}
            isSpotlight={true}
            hidePerformanceStats={true}
          />
        </div>
      )}
    </div>
  );
};

export default Overview;

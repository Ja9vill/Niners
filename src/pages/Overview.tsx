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

const GlassDropdown = ({ value, onChange, options, title }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative h-full" ref={ref}>
      <div 
        className="flex items-center gap-3 bg-[rgba(10,5,5,0.5)] border border-[#FFB800]/20 rounded-lg px-4 py-2 backdrop-blur-md shadow-[0_4px_10px_rgba(0,0,0,0.3)] text-xs sm:text-sm font-black text-[#FFB800] outline-none hover:bg-white/5 transition-all cursor-pointer select-none h-full"
        onClick={() => setIsOpen(!isOpen)}
        title={title}
      >
        <span>{options.find((o: any) => String(o.value) === String(value))?.label || value}</span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-max min-w-[120px] glass-card rounded-lg overflow-hidden flex flex-col py-1 z-50 transition-all duration-300" style={{
          background: 'linear-gradient(to bottom right, rgba(20, 10, 5, 0.95), rgba(0, 0, 0, 0.98))',
          backdropFilter: 'blur(40px)',
          borderTop: '1px solid rgba(250, 204, 21, 0.3)',
          borderLeft: '1px solid rgba(250, 204, 21, 0.1)',
          borderColor: 'rgba(234, 179, 8, 0.2)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.9), inset 0 0 15px rgba(250, 204, 21, 0.1)'
        }}>
          {options.map((o: any) => (
            <div 
              key={o.value}
              className={`px-4 py-2 text-xs font-bold cursor-pointer transition-all ${String(value) === String(o.value) ? 'bg-[#FFB800]/20 text-[#FFB800]' : 'text-[#A09E9A] hover:bg-[#FFB800]/10 hover:text-white'}`}
              onClick={() => {
                onChange(o.value);
                setIsOpen(false);
              }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const Overview = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [selectedMonthData, setSelectedMonthData] = useState<any | null>(null);
  const [lbPeriod, setLbPeriod] = useState<string>('all');
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
      if (r.report_type === 'weekly') return false; // Prevent duplicating weekly into monthly totals
      if (selectedYear !== 'all' && String(r.year) !== selectedYear) return false;
      if (selectedMonth !== 'all' && r.monthName !== selectedMonth) return false;
      return true;
    });
  }, [reports, selectedYear, selectedMonth]);

  // Leaderboard specific filtered reports
  const lbReports = useMemo(() => {
    return reports.filter(r => {
      if (r.report_type === 'weekly') return false; // Prevent duplicating weekly into monthly totals
      if (lbPeriod !== 'all') {
        const [pMon, pYr] = lbPeriod.split(' ');
        if (String(r.year) !== pYr) return false;
        if (!r.monthName?.startsWith(pMon)) return false;
      }
      return true;
    });
  }, [reports, lbPeriod]);

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
      
      // Only include top-level commission for leaderboard? Or all commission? 
      // User says: "that commission was theirs (the agent) and not to the agency"
      // Wait, if it's the *host's* commission leaderboard, we should show whatever agent commission they generated, regardless of who owns it, OR we only show Nine Agency.
      // Let's just include all commission here for the host's performance, but split the totals.
      byHost[id].commission += getAgentComm(r);
    });
    return Object.values(byHost).sort((a, b) => b.commission - a.commission);
  }, [lbReports, hostLookup]);

  const lbTotalPeriodCommission = useMemo(() => {
    return lbReports.reduce((sum, r) => sum + (r.owner_role !== 'Agent' ? getAgentComm(r) : 0), 0);
  }, [lbReports]);

  // Splits for top KPI row
  const totalAgencyCommission = useMemo(() => {
    return filteredReports.reduce((sum, r) => sum + (r.owner_role !== 'Agent' ? getAgentComm(r) : 0), 0);
  }, [filteredReports]);

  const totalAgentCommission = useMemo(() => {
    return filteredReports.reduce((sum, r) => sum + (r.owner_role === 'Agent' ? getAgentComm(r) : 0), 0);
  }, [filteredReports]);

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
        <OverviewTab commissions={commissions} hosts={hosts} />
      </div>
    );
  }

  // Aggregate all earnings breakdown fields
  const sum = (fn: (r: any) => number) => filteredReports.reduce((s, r) => s + fn(r), 0);



  const CHART_COLORS = ['#D4AF37','#6366f1','#ec4899','#10b981','#f59e0b','#06b6d4','#a78bfa'];

  return (
    <div className="flex flex-col gap-3">
      {/* INJECTED DYNAMIC CSS TO BYPASS INLINE STYLES LINTER */}
      <style>{`
        .global-block-1, .global-block-2, .global-block-3 {
          transform: perspective(1000px) translateZ(0);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .global-block-1 {
          background: 
            radial-gradient(circle at 10% 10%, rgba(250,204,21,0.15) 0%, transparent 50%),
            linear-gradient(135deg, rgba(133, 77, 14, 0.15) 0%, rgba(66, 32, 6, 0.3) 100%);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border: 1px solid rgba(250, 204, 21, 0.1);
          border-top: 1px solid rgba(250, 204, 21, 0.6);
          border-left: 1px solid rgba(250, 204, 21, 0.4);
          box-shadow: 
            inset 0 0 20px rgba(250, 204, 21, 0.15),
            inset 0 2px 6px rgba(250, 204, 21, 0.4),
            0 15px 35px rgba(0, 0, 0, 0.7),
            0 0 30px rgba(234, 179, 8, 0.3);
        }
        .global-block-1:hover {
          transform: perspective(1000px) translateY(-6px) scale(1.02) rotateX(4deg);
          border-top-color: rgba(250, 204, 21, 0.9);
          box-shadow: 
            inset 0 0 30px rgba(250, 204, 21, 0.3),
            inset 0 4px 10px rgba(250, 204, 21, 0.6),
            0 25px 50px rgba(0, 0, 0, 0.9),
            0 0 50px rgba(234, 179, 8, 0.6);
        }
        
        .global-block-2 {
          background: 
            radial-gradient(circle at 10% 10%, rgba(249,115,22,0.15) 0%, transparent 50%),
            linear-gradient(135deg, rgba(194, 65, 12, 0.15) 0%, rgba(124, 45, 18, 0.3) 100%);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border: 1px solid rgba(249, 115, 22, 0.1);
          border-top: 1px solid rgba(249, 115, 22, 0.6);
          border-left: 1px solid rgba(249, 115, 22, 0.4);
          box-shadow: 
            inset 0 0 20px rgba(249, 115, 22, 0.15),
            inset 0 2px 6px rgba(249, 115, 22, 0.4),
            0 15px 35px rgba(0, 0, 0, 0.7),
            0 0 30px rgba(249, 115, 22, 0.3);
        }
        .global-block-2:hover {
          transform: perspective(1000px) translateY(-6px) scale(1.02) rotateX(4deg);
          border-top-color: rgba(249, 115, 22, 0.9);
          box-shadow: 
            inset 0 0 30px rgba(249, 115, 22, 0.3),
            inset 0 4px 10px rgba(249, 115, 22, 0.6),
            0 25px 50px rgba(0, 0, 0, 0.9),
            0 0 50px rgba(249, 115, 22, 0.6);
        }
        
        .global-block-3 {
          background: 
            radial-gradient(circle at 10% 10%, rgba(225,29,72,0.15) 0%, transparent 50%),
            linear-gradient(135deg, rgba(190, 18, 60, 0.15) 0%, rgba(136, 19, 55, 0.3) 100%);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border: 1px solid rgba(225, 29, 72, 0.1);
          border-top: 1px solid rgba(225, 29, 72, 0.6);
          border-left: 1px solid rgba(225, 29, 72, 0.4);
          box-shadow: 
            inset 0 0 20px rgba(225, 29, 72, 0.15),
            inset 0 2px 6px rgba(225, 29, 72, 0.4),
            0 15px 35px rgba(0, 0, 0, 0.7),
            0 0 30px rgba(225, 29, 72, 0.3);
        }
        .global-block-3:hover {
          transform: perspective(1000px) translateY(-6px) scale(1.02) rotateX(4deg);
          border-top-color: rgba(225, 29, 72, 0.9);
          box-shadow: 
            inset 0 0 30px rgba(225, 29, 72, 0.3),
            inset 0 4px 10px rgba(225, 29, 72, 0.6),
            0 25px 50px rgba(0, 0, 0, 0.9),
            0 0 50px rgba(225, 29, 72, 0.6);
        }

        /* 4D Sheen Effect */
        .global-block-1::after, .global-block-2::after, .global-block-3::after, .global-placeholder::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 50%; height: 100%;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent);
          transform: skewX(-20deg);
          transition: 0.5s ease-out;
          pointer-events: none;
        }
        .global-block-1:hover::after, .global-block-2:hover::after, .global-block-3:hover::after, .global-placeholder:hover::after {
          left: 200%;
        }

        .global-placeholder {
          transform: perspective(1000px) translateZ(0);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .global-placeholder:hover {
          transform: perspective(1000px) translateY(-4px) scale(1.01) rotateX(2deg);
          border-top-color: rgba(255, 184, 0, 0.8);
          box-shadow: 
            inset 0 0 30px rgba(255, 184, 0, 0.2),
            inset 0 4px 10px rgba(255, 184, 0, 0.4),
            0 15px 40px rgba(0, 0, 0, 0.8),
            0 0 40px rgba(255, 184, 0, 0.4);
        }

        .global-tier-1, .global-tier-2, .global-tier-3, .global-tier-4 {
          transform: perspective(1000px) translateZ(0);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        .global-tier-1 {
          background: 
            radial-gradient(circle at 10% 10%, rgba(244,114,182,0.2) 0%, transparent 50%),
            linear-gradient(135deg, rgba(244, 114, 182, 0.2) 0%, rgba(159, 18, 57, 0.4) 100%);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border: 1px solid rgba(244, 114, 182, 0.1);
          border-top: 1px solid rgba(244, 114, 182, 0.6);
          border-left: 1px solid rgba(244, 114, 182, 0.4);
          box-shadow: 
            inset 0 0 20px rgba(244, 114, 182, 0.15),
            inset 0 2px 6px rgba(244, 114, 182, 0.4),
            0 15px 35px rgba(0, 0, 0, 0.7),
            0 0 30px rgba(244, 114, 182, 0.4);
        }
        .global-tier-1:hover, .global-tier-1.active-tier {
          transform: perspective(1000px) translateY(-6px) scale(1.02) rotateX(4deg);
          border-top-color: rgba(244, 114, 182, 0.9);
          box-shadow: 
            inset 0 0 30px rgba(244, 114, 182, 0.3),
            inset 0 4px 10px rgba(244, 114, 182, 0.6),
            0 25px 50px rgba(0, 0, 0, 0.9),
            0 0 50px rgba(244, 114, 182, 0.8);
        }

        .global-tier-2 {
          background: 
            radial-gradient(circle at 10% 10%, rgba(168,85,247,0.2) 0%, transparent 50%),
            linear-gradient(135deg, rgba(167, 139, 250, 0.2) 0%, rgba(88, 28, 135, 0.4) 100%);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border: 1px solid rgba(168, 85, 247, 0.1);
          border-top: 1px solid rgba(168, 85, 247, 0.6);
          border-left: 1px solid rgba(168, 85, 247, 0.4);
          box-shadow: 
            inset 0 0 20px rgba(168, 85, 247, 0.15),
            inset 0 2px 6px rgba(168, 85, 247, 0.4),
            0 15px 35px rgba(0, 0, 0, 0.7),
            0 0 30px rgba(168, 85, 247, 0.4);
        }
        .global-tier-2:hover, .global-tier-2.active-tier {
          transform: perspective(1000px) translateY(-6px) scale(1.02) rotateX(4deg);
          border-top-color: rgba(168, 85, 247, 0.9);
          box-shadow: 
            inset 0 0 30px rgba(168, 85, 247, 0.3),
            inset 0 4px 10px rgba(168, 85, 247, 0.6),
            0 25px 50px rgba(0, 0, 0, 0.9),
            0 0 50px rgba(168, 85, 247, 0.8);
        }

        .global-tier-3 {
          background: 
            radial-gradient(circle at 10% 10%, rgba(250,204,21,0.2) 0%, transparent 50%),
            linear-gradient(135deg, rgba(253, 224, 71, 0.2) 0%, rgba(161, 98, 7, 0.4) 100%);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border: 1px solid rgba(250, 204, 21, 0.1);
          border-top: 1px solid rgba(250, 204, 21, 0.6);
          border-left: 1px solid rgba(250, 204, 21, 0.4);
          box-shadow: 
            inset 0 0 20px rgba(250, 204, 21, 0.15),
            inset 0 2px 6px rgba(250, 204, 21, 0.4),
            0 15px 35px rgba(0, 0, 0, 0.7),
            0 0 30px rgba(250, 204, 21, 0.4);
        }
        .global-tier-3:hover, .global-tier-3.active-tier {
          transform: perspective(1000px) translateY(-6px) scale(1.02) rotateX(4deg);
          border-top-color: rgba(250, 204, 21, 0.9);
          box-shadow: 
            inset 0 0 30px rgba(250, 204, 21, 0.3),
            inset 0 4px 10px rgba(250, 204, 21, 0.6),
            0 25px 50px rgba(0, 0, 0, 0.9),
            0 0 50px rgba(250, 204, 21, 0.8);
        }

        .global-tier-4 {
          background: 
            radial-gradient(circle at 10% 10%, rgba(14,165,233,0.2) 0%, transparent 50%),
            linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(3, 105, 161, 0.4) 100%);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border: 1px solid rgba(14, 165, 233, 0.1);
          border-top: 1px solid rgba(14, 165, 233, 0.6);
          border-left: 1px solid rgba(14, 165, 233, 0.4);
          box-shadow: 
            inset 0 0 20px rgba(14, 165, 233, 0.15),
            inset 0 2px 6px rgba(14, 165, 233, 0.4),
            0 15px 35px rgba(0, 0, 0, 0.7),
            0 0 30px rgba(14, 165, 233, 0.4);
        }
        .global-tier-4:hover, .global-tier-4.active-tier {
          transform: perspective(1000px) translateY(-6px) scale(1.02) rotateX(4deg);
          border-top-color: rgba(14, 165, 233, 0.9);
          box-shadow: 
            inset 0 0 30px rgba(14, 165, 233, 0.3),
            inset 0 4px 10px rgba(14, 165, 233, 0.6),
            0 25px 50px rgba(0, 0, 0, 0.9),
            0 0 50px rgba(14, 165, 233, 0.8);
        }

        /* 4D Sheen Effect */
        .global-tier-1::after, .global-tier-2::after, .global-tier-3::after, .global-tier-4::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 50%; height: 100%;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.4), transparent);
          transform: skewX(-20deg);
          transition: 0.5s ease-out;
          pointer-events: none;
        }
        .global-tier-1:hover::after, .global-tier-2:hover::after, .global-tier-3:hover::after, .global-tier-4:hover::after {
          left: 200%;
        }
      `}</style>

      {/* Base Salary Tiers Block */}
      <div className="glass-card relative overflow-hidden transition-all duration-500" style={{
        background: 'linear-gradient(to bottom right, rgba(20, 10, 5, 0.4), rgba(40, 10, 15, 0.5))',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(250, 204, 21, 0.3)',
        borderLeft: '1px solid rgba(250, 204, 21, 0.1)',
        borderColor: 'rgba(234, 179, 8, 0.2)',
        boxShadow: 'inset 0 1px 1px rgba(250, 204, 21, 0.2), 0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(250, 204, 21, 0.05)'
      }}>
        {/* Subtle background glow for the entire section */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#D4AF37]/5 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/5 blur-3xl rounded-full pointer-events-none"></div>
        
        <div className="global-placeholder flex w-full items-center justify-center gap-2 bg-gradient-to-br from-[#FFB800]/10 to-transparent border border-[#FFB800]/20 border-t-[#FFB800]/40 rounded-xl px-4 py-3 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,184,0,0.3)] mb-4 relative z-10 overflow-hidden cursor-pointer">
          <p className="font-['Lexend'] text-lg sm:text-xl font-bold text-[#FFB700] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] [-webkit-text-stroke:0.3px_black] uppercase tracking-[0.2em] flex items-center gap-2 m-0">
            AGENCY DASHBOARD OVERVIEW
          </p>
        </div>

        <div className="grid grid-cols-4 gap-3 relative z-10">
          {[
            { label: 'S idol', key: 'S idol', class: 'global-tier-1', color: '#F50057', Icon: Award },
            { label: 'Esports', key: 'Esports', class: 'global-tier-2', color: '#D500F9', Icon: Zap },
            { label: 'Star Host', key: 'Star Host', class: 'global-tier-3', color: '#FFEA00', Icon: Star },
            { label: 'Rocket Host', key: 'Rocket Host', class: 'global-tier-4', color: '#00E5FF', Icon: TrendingUp }
          ].map((item, idx) => {
            const dataVal = baseSalaryTiersData[item.key];
            const isActive = selectedTierForList === item.key;
            return (
              <div
                key={idx}
                onClick={() => setSelectedTierForList(isActive ? null : item.key)}
                className={cn(
                  "relative overflow-hidden rounded-xl p-2.5 sm:p-4 flex flex-col justify-between min-h-[84px] sm:min-h-[104px] transition-all duration-300 group cursor-pointer shadow-lg border hover:-translate-y-0.5 select-none text-left",
                  item.class,
                  isActive && "active-tier"
                )}
              >
                <item.Icon className="absolute top-2 right-2 w-4 h-4 opacity-[0.07] pointer-events-none" style={{ color: item.color }} />
                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-[#E8E6E3] leading-tight pr-4 relative z-10">
                  {item.label}
                </p>
                <p className="text-sm sm:text-2xl md:text-3xl font-black leading-none mt-2 truncate relative z-10" style={{ color: item.color }}>
                  {dataVal?.count || 0}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-3 relative z-10 mt-3">
          {/* COLUMN 1: REVENUE */}
          <div className="flex flex-col gap-2.5 min-w-0">
            {/* Row 1 Block 1: Total Agency Pts. */}
            <div className="global-block-1 relative overflow-hidden rounded-xl p-2.5 sm:p-4 flex flex-col justify-between min-h-[84px] sm:min-h-[104px] transition-all duration-300 group hover:-translate-y-0.5 shadow-lg border">
              <Star className="absolute top-2 right-2 w-4 h-4 opacity-[0.07] pointer-events-none" style={{ color: '#FFB800' }} />
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-[#E8E6E3] leading-tight pr-4 relative z-10">
                Total Agency Pts.
              </p>
              <p className="text-sm sm:text-2xl md:text-3xl font-black leading-none mt-2 truncate" style={{ color: '#FFB800' }}>
                {formatPts(sum(getPoints))}
              </p>
            </div>

            {/* Row 2 Block 1: Agency Commission */}
            <div className="global-block-1 relative overflow-hidden rounded-xl p-2.5 sm:p-4 flex flex-col justify-between min-h-[84px] sm:min-h-[104px] transition-all duration-300 group hover:-translate-y-0.5 shadow-lg border">
              <Award className="absolute top-2 right-2 w-4 h-4 opacity-[0.07] pointer-events-none" style={{ color: '#FFB800' }} />
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-[#E8E6E3] leading-tight pr-4 relative z-10">
                AGENCY COMMISSION
              </p>
              <p className="text-sm sm:text-2xl md:text-3xl font-black leading-none mt-2 truncate" style={{ color: '#FFB800' }}>
                {formatPts(totalAgencyCommission)}
              </p>
            </div>
          </div>

          {/* COLUMN 2: INCENTIVES */}
          <div className="flex flex-col gap-2.5 min-w-0">
            {/* Row 1 Block 2: Super Salary */}
            <div className="global-block-2 relative overflow-hidden rounded-xl p-2.5 sm:p-4 flex flex-col justify-between min-h-[84px] sm:min-h-[104px] transition-all duration-300 group hover:-translate-y-0.5 shadow-lg border">
              <Zap className="absolute top-2 right-2 w-4 h-4 opacity-[0.07] pointer-events-none" style={{ color: '#FF7B00' }} />
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-[#E8E6E3] leading-tight pr-4 relative z-10">
                Super Salary
              </p>
              <p className="text-sm sm:text-2xl md:text-3xl font-black leading-none mt-2 truncate" style={{ color: '#FF7B00' }}>
                {formatPts(sum(getSuperSalary))}
              </p>
            </div>

            {/* Row 2 Block 2: Super Rank */}
            <div className="global-block-2 relative overflow-hidden rounded-xl p-2.5 sm:p-4 flex flex-col justify-between min-h-[84px] sm:min-h-[104px] transition-all duration-300 group hover:-translate-y-0.5 shadow-lg border">
              <TrendingUp className="absolute top-2 right-2 w-4 h-4 opacity-[0.07] pointer-events-none" style={{ color: '#FF7B00' }} />
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-[#E8E6E3] leading-tight pr-4 relative z-10">
                Super Rank
              </p>
              <p className="text-sm sm:text-2xl md:text-3xl font-black leading-none mt-2 truncate" style={{ color: '#FF7B00' }}>
                {formatPts(sum(getSuperRank))}
              </p>
            </div>
          </div>

          {/* COLUMN 3: ACTIVE MEMBERS */}
          <div className="flex flex-col gap-2.5 min-w-0">
            {/* Row 1 Block 3: Active Host */}
            <div className="global-block-3 relative overflow-hidden rounded-xl p-2.5 sm:p-4 flex flex-col justify-between min-h-[84px] sm:min-h-[104px] transition-all duration-300 group hover:-translate-y-0.5 shadow-lg border">
              <Users className="absolute top-2 right-2 w-4 h-4 opacity-[0.07] pointer-events-none" style={{ color: '#FF3B5C' }} />
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-[#E8E6E3] leading-tight pr-4 relative z-10">
                Active Host
              </p>
              <p className="text-sm sm:text-2xl md:text-3xl font-black leading-none mt-2 truncate" style={{ color: '#FF3B5C' }}>
                {String(uniqueHosts)}
              </p>
            </div>

            {/* Row 2 Block 3: Total Live Hours */}
            <div className="global-block-3 relative overflow-hidden rounded-xl p-2.5 sm:p-4 flex flex-col justify-between min-h-[84px] sm:min-h-[104px] transition-all duration-300 group hover:-translate-y-0.5 shadow-lg border">
              <Clock className="absolute top-2 right-2 w-4 h-4 opacity-[0.07] pointer-events-none" style={{ color: '#FF3B5C' }} />
              <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-[#E8E6E3] leading-tight pr-4 relative z-10">
                Total Live Hours
              </p>
              <p className="text-sm sm:text-2xl md:text-3xl font-black leading-none mt-2 truncate" style={{ color: '#FF3B5C' }}>
                {fmtH(sum(getLiveDuration))}
              </p>
            </div>
          </div>
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



      {monthlyTrend.length > 0 && (
        <div className="glass-card p-5 relative overflow-hidden transition-all duration-500" style={{
          background: 'linear-gradient(to bottom right, rgba(20, 10, 5, 0.4), rgba(40, 10, 15, 0.5))',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(250, 204, 21, 0.3)',
          borderLeft: '1px solid rgba(250, 204, 21, 0.1)',
          borderColor: 'rgba(234, 179, 8, 0.2)',
          boxShadow: 'inset 0 1px 1px rgba(250, 204, 21, 0.2), 0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(250, 204, 21, 0.05)'
        }}>
          <div className="global-placeholder flex w-full items-center justify-between gap-2 bg-gradient-to-br from-[#FFB800]/10 to-transparent border border-[#FFB800]/20 border-t-[#FFB800]/40 rounded-xl px-4 py-2 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,184,0,0.3)] mb-4 relative z-10 overflow-hidden cursor-pointer">
            <p className="font-['Lexend'] text-sm sm:text-base font-bold text-[#FFB700] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] [-webkit-text-stroke:0.3px_black] uppercase tracking-[0.2em] m-0">MONTHLY TRENDS</p>
            
            <div className="flex justify-end items-center gap-1.5 relative z-20">
              <button
                onClick={() => setChartType('area')}
                className={cn(
                  "px-5 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-300 relative overflow-hidden group cursor-pointer select-none",
                  chartType === 'area'
                    ? "global-block-2 text-white opacity-100 scale-105"
                    : "global-block-2 text-white/50 opacity-50 hover:opacity-80"
                )}
              >
                <span className="relative z-10 drop-shadow-md">Area</span>
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={cn(
                  "px-5 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-300 relative overflow-hidden group cursor-pointer select-none",
                  chartType === 'bar'
                    ? "global-block-1 text-white opacity-100 scale-105"
                    : "global-block-1 text-white/50 opacity-50 hover:opacity-80"
                )}
              >
                <span className="relative z-10 drop-shadow-md">Bar</span>
              </button>
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
                  <defs>
                    <linearGradient id="barGlassGold" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#FFB800" stopOpacity={0.8}/>
                      <stop offset="50%" stopColor="#D4AF37" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="#854D0E" stopOpacity={0.8}/>
                    </linearGradient>
                    <filter id="barGlassGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.8" />
                      <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#FFB800" floodOpacity="0.3" />
                      <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#FFFFFF" floodOpacity="0.4" />
                    </filter>
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
                  <Bar 
                    dataKey="points" 
                    radius={[6, 6, 0, 0]} 
                    fill="url(#barGlassGold)" 
                    filter="url(#barGlassGlow)"
                    stroke="#FFB800"
                    strokeWidth={1}
                    strokeOpacity={0.5}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

        </div>
      )}

      {/* Merged Agency Leaderboard & Spotlight Block */}
      <div className="glass-card relative overflow-hidden flex flex-col gap-4 transition-all duration-500" style={{
        background: 'linear-gradient(to bottom right, rgba(20, 10, 5, 0.4), rgba(40, 10, 15, 0.5))',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(250, 204, 21, 0.3)',
        borderLeft: '1px solid rgba(250, 204, 21, 0.1)',
        borderColor: 'rgba(234, 179, 8, 0.2)',
        boxShadow: 'inset 0 1px 1px rgba(250, 204, 21, 0.2), 0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(250, 204, 21, 0.05)'
      }}>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>
        
        {/* Combined Header */}
        <div className="global-placeholder flex w-full items-center justify-between gap-2 bg-gradient-to-br from-[#FFB800]/10 to-transparent border border-[#FFB800]/20 border-t-[#FFB800]/40 rounded-xl px-4 py-2 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,184,0,0.3)] relative z-10 overflow-hidden cursor-pointer">
          <p className="font-['Lexend'] text-sm sm:text-base font-bold text-[#FFB700] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] [-webkit-text-stroke:0.3px_black] uppercase tracking-[0.2em] flex items-center gap-2 m-0">
            NINERS LEADERBOARD
          </p>
          <div className="flex items-center gap-2 relative z-20">
            <select
              title="Leaderboard Period"
              value={lbPeriod}
              onChange={e => setLbPeriod(e.target.value)}
              className="bg-[#0D0D14] border border-[#D4AF37]/20 rounded-lg px-3 py-1.5 text-xs font-bold text-[#FFB700] outline-none focus:border-[#D4AF37] cursor-pointer shadow-inner"
            >
              <option value="all">All Time</option>
              {['Aug 2025', 'Sept 2025', 'Oct 2025', 'Dec 2025', 'Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
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
            <div className="bg-[#0D0D14] border border-[#D4AF37]/15 rounded-xl p-4 pt-6 -mt-4 flex flex-row justify-between items-center gap-4 transition-all relative z-0">
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
                    <div className="h-1.5 bg-black/40 rounded-full overflow-hidden shadow-inner border border-white/5">
                      <div
                        className="h-full rounded-full relative overflow-hidden"
                        {...({ style: {
                          width: `${pct}%`,
                          background: idx < 9 
                            ? `linear-gradient(90deg, ${top9Colors[idx]}40, ${top9Colors[idx]})` 
                            : '#374151',
                          boxShadow: idx < 9 ? `0 0 10px ${top9Colors[idx]}60, inset 0 1px 1px rgba(255,255,255,0.4)` : 'none'
                        } })}
                      >
                        <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent"></div>
                      </div>
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
        <div className="glass-card p-5 relative overflow-hidden transition-all duration-500 mt-12 mb-6" style={{
          background: 'linear-gradient(to bottom right, rgba(20, 10, 5, 0.4), rgba(40, 10, 15, 0.5))',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(250, 204, 21, 0.3)',
          borderLeft: '1px solid rgba(250, 204, 21, 0.1)',
          borderColor: 'rgba(234, 179, 8, 0.2)',
          borderBottom: '1px solid rgba(250, 204, 21, 0.2)',
          boxShadow: 'inset 0 1px 1px rgba(250, 204, 21, 0.2), 0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(250, 204, 21, 0.05)'
        }}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 bg-[rgba(10,5,5,0.5)] border border-[#FFB800]/20 rounded-lg px-4 py-2 backdrop-blur-md shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFB800] animate-pulse shadow-[0_0_8px_rgba(255,184,0,0.8)] shrink-0"></span>
              <h3 className="font-black text-[#FFB800] drop-shadow-[0_0_8px_rgba(255,184,0,0.5)] text-sm uppercase tracking-widest m-0">All Records</h3>
              <span className="text-[10px] text-[#A09E9A] font-mono ml-1">({reports.length} entries)</span>
            </div>
            
            <div className="flex items-center gap-3">
              {showRecords && (
                <GlassDropdown
                  title="Sort Records"
                  value={recordsSortOption}
                  onChange={(val: any) => setRecordsSortOption(val)}
                  options={[
                    { value: 'default', label: 'Default Sort' },
                    { value: 'name', label: 'Name A-Z' },
                    { value: 'share', label: 'Share % (High to Low)' }
                  ]}
                />
              )}
              <button
                onClick={() => setShowRecords(!showRecords)}
                className="bg-[#0D0D14]/80 border border-[#FFB800]/30 hover:bg-white/5 hover:border-[#FFB800]/60 px-4 py-1.5 rounded-lg text-xs font-black text-[#FFB800] transition-all cursor-pointer shadow-[inset_0_0_10px_rgba(255,184,0,0.1)] select-none uppercase tracking-wider"
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
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-10 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-7xl relative my-auto">
            <HostProfileView 
              host={spotlightHost} 
            isReadOnly={false} 
            onClose={() => setSpotlightHost(null)} 
            onProfileUpdated={() => {}}
            isSpotlight={true}
            hidePerformanceStats={true}
          />
          </div>
        </div>
      )}
    </div>
  );
};

export default Overview;

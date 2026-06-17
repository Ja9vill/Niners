<<<<<<< HEAD
/* eslint-disable */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Shield, X, TrendingUp, Users } from 'lucide-react';
import { Host, Role, BaseSalaryTier, HostStatus, AnchorType, Tier } from '../types';
import { Storage } from '../lib/storage';
=======
import React, { useState, useEffect, useMemo } from 'react';
<<<<<<< HEAD
import { Search, Filter, Loader2, Star, Users, LayoutGrid } from 'lucide-react';
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
=======
import { createPortal } from 'react-dom';
import { Search, Filter, Loader2, Star, Users, LayoutGrid, Medal, Ribbon, Gamepad2, Rocket } from 'lucide-react';
>>>>>>> 2b42d3ae84c3e300e1faeb35e7009a759158d1e9
import { FirebaseService } from '../lib/firebaseService';
import { cn } from '../lib/utils';
import { Host } from '../types';
import { HostProfileView } from './HostProfileView';

const getTierBlockStyles = (tierInput: string) => {
  const norm = String(tierInput || '').toLowerCase();
  if (norm.includes('star')) {
    return "global-tier-3";
  }
  if (norm.includes('s idol') || norm.includes('idol')) {
    return "global-tier-1";
  }
  if (norm.includes('rocket')) {
    return "global-tier-4";
  }
  if (norm.includes('esports') || norm.includes('esport')) {
    return "global-tier-2";
  }
  if (norm.includes('regular')) {
    return "bg-green-600/20 text-green-300 border border-green-600/50 shadow-[0_0_10px_rgba(22,163,74,0.2)]";
  }
  return "bg-[#1A1A28] border border-white/5 hover:border-indigo-500/30";
};

const getTierFilterStyle = (tierInput: string, isSelected: boolean) => {
  const lower = String(tierInput || '').toLowerCase();
  
  let baseClass = "";
  if (lower.includes('star')) baseClass = "text-[#FFEA00] bg-[#FFEA00]/20 border-[#FFEA00]/50 shadow-[0_0_12px_rgba(255,234,0,0.5)]";
  else if (lower.includes('s idol') || lower.includes('idol')) baseClass = "text-[#FF007F] bg-[#FF007F]/20 border-[#FF007F]/50 shadow-[0_0_12px_rgba(255,0,127,0.5)]";
  else if (lower.includes('rocket')) baseClass = "text-[#60A5FA] bg-[#1E3A8A]/60 border-[#60A5FA]/60 shadow-[0_0_12px_rgba(96,165,250,0.5)]";
  else if (lower.includes('esports') || lower.includes('esport')) baseClass = "text-[#B026FF] bg-[#B026FF]/20 border-[#B026FF]/50 shadow-[0_0_12px_rgba(176,38,255,0.5)]";
  else if (lower.includes('regular')) baseClass = "text-[#34D399] bg-[#34D399]/20 border-[#34D399]/50 shadow-[0_0_12px_rgba(52,211,153,0.5)]";
  else baseClass = "text-white bg-white/10 border-white/20";

  if (!isSelected) {
    const unselectedClass = baseClass
      .replace(/shadow-\[.*?\]/, 'shadow-none')
      .replace(/border-\[.*?\]\/\d+/, 'border-transparent');
    return `${unselectedClass} opacity-50 hover:opacity-80 cursor-pointer`;
  }
  
  return `${baseClass} opacity-100 ring-1 ring-white/30`;
};

const formatBadgeTitle = (title: string) => {
  if (!title) return '';
  const match = title.match(/Top (\d+) Niner/i);
  if (match) {
    return `Top ${match[1]} Niner`;
  }
  return title
    .replace(/\bJanuary\b/i, 'Jan')
    .replace(/\bFebruary\b/i, 'Feb')
    .replace(/\bMarch\b/i, 'Mar')
    .replace(/\bApril\b/i, 'Apr')
    .replace(/\bJune\b/i, 'Jun')
    .replace(/\bJuly\b/i, 'Jul')
    .replace(/\bAugust\b/i, 'Aug')
    .replace(/\bSeptember\b/i, 'Sep')
    .replace(/\bOctober\b/i, 'Oct')
    .replace(/\bNovember\b/i, 'Nov')
    .replace(/\bDecember\b/i, 'Dec');
};

const formatDateYYYYMMDD = (dateInput: any) => {
  if (!dateInput) return '';
  try {
    let date: Date;
    if (dateInput?.seconds) {
      date = new Date(dateInput.seconds * 1000);
    } else if (dateInput?.toDate) {
      date = dateInput.toDate();
    } else {
      date = new Date(dateInput);
    }
    if (isNaN(date.getTime())) return String(dateInput);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch (e) {
    return String(dateInput);
  }
};

const formatTimeslot = (timeStr: string) => {
  if (!timeStr) return 'TBA Manila Time PHT';
  const clean = timeStr.trim();
  
  // Extract time part and strip/ignore any existing timezone string to avoid duplicates or misformatting
  let timePart = clean;
  const tzMatch = clean.match(/\s*(pht|pst|gmt|utc|est|philippine|manila.*)$/i);
  if (tzMatch) {
    timePart = clean.substring(0, tzMatch.index).trim();
  }
  
  let formattedTime = timePart;
  const ampmMatch = timePart.match(/^(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)/i);
  if (ampmMatch) {
    const hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const ampm = ampmMatch[3].toUpperCase().replace(/\./g, '');
    const hoursStr = String(hours).padStart(2, '0');
    formattedTime = `${hoursStr}:${minutes} ${ampm}`;
  } else {
    const match = timePart.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const hoursStr = String(hours).padStart(2, '0');
      formattedTime = `${hoursStr}:${minutes} ${ampm}`;
    }
  }
  
  return `${formattedTime} Manila Time PHT`;
};

export const RosterTab: React.FC<RosterTabProps> = ({ isReadOnly = false }) => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [roleFilter, setRoleFilter] = useState<'all' | 'hosts' | 'team_leaders'>('all');
  const [selectedTiers, setSelectedTiers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Spotlight State
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);

  // Dynamic portal target setup to resolve iframe/mobile layout clipping
<<<<<<< HEAD
  const containerRef = useRef<HTMLDivElement>(null);
=======
  const containerRef = React.useRef<HTMLDivElement>(null);
>>>>>>> 2b42d3ae84c3e300e1faeb35e7009a759158d1e9
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      setPortalTarget(containerRef.current.ownerDocument.body);
    } else {
      setPortalTarget(document.body);
    }
<<<<<<< HEAD
  }, [spotlightHost]);
=======
  }, [selectedHost]);

  // Top Niners & Badges
  const [allAwards, setAllAwards] = useState<any[]>([]);

  const [allReports, setAllReports] = useState<any[]>([]);

  const top9NinerData = useMemo(() => {
    if (!allReports || allReports.length === 0) return [];
    
    // Find the latest month
    let maxYear = 0;
    let maxMonth = 0;
    allReports.forEach(r => {
      if (r.year > maxYear) {
        maxYear = r.year;
        maxMonth = r.month;
      } else if (r.year === maxYear && r.month > maxMonth) {
        maxMonth = r.month;
      }
    });

    if (maxYear === 0) return [];

    // Filter to latest month
    const latestReports = allReports.filter(r => r.year === maxYear && r.month === maxMonth);
    
    // Aggregate by poppoId
    const commByHost: Record<string, number> = {};
    latestReports.forEach(r => {
      const comm = Number(r.agentCommission || r.agent_commission || r.agentComm || r.commission || r.Commission || 0);
      const id = String(r.poppoId || r.poppo_id);
      commByHost[id] = (commByHost[id] || 0) + comm;
    });

    // Sort by commission descending and take top 9
    const sorted = Object.entries(commByHost)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 9)
      .map(([id, comm], index) => ({ id, rank: index + 1 }));

    return sorted;
  }, [allReports]);

  const top9NinerIds = useMemo(() => top9NinerData.map(d => d.id), [top9NinerData]);
  const [showTopNiners, setShowTopNiners] = useState(() => {
    return window.location.search.includes('filter=top-niners');
  });
>>>>>>> 2b42d3ae84c3e300e1faeb35e7009a759158d1e9

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const [users, awards, reports] = await Promise.all([
          FirebaseService.getAllRoleMetadata(),
          FirebaseService.getAllAssignedAwards(),
          FirebaseService.getAllPerformanceReports()
        ]);
        setHosts(users.map(u => ({ ...u, id: u.poppo_id || u.poppoId || u.id } as Host)));
        setAllAwards(awards);
        setAllReports(reports);
      } catch (err: any) {
        console.error("Failed to load users from Firebase:", err);
        setError(err.message || 'Failed to connect to Database');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const openSpotlight = (host: Host) => {
    setSelectedHost(host);
  };

  const closeSpotlight = () => {
    setSelectedHost(null);
  };

  const filteredHosts = useMemo(() => {
    return hosts.filter(host => {
      // 0. Top Niners Filter
      if (showTopNiners) {
        if (!top9NinerIds.includes(String(host.id))) return false;
      }

      // 1. Search Filter
      if (searchTerm.trim()) {
        const searchStr = searchTerm.toLowerCase();
        const hostName = (host.nickname || host.name || '').toLowerCase();
        const hostIdStr = String(host.id || '');
        const matchesSearch = hostName.includes(searchStr) || hostIdStr.includes(searchStr);
        if (!matchesSearch) return false;
      }

      // 2. Role Filter
      if (roleFilter !== 'all') {
        const roleStr = (host.role || '').toLowerCase();
        const isHost = roleStr === 'host' || roleStr === 'talent';
        if (roleFilter === 'hosts' && !isHost) return false;
        if (roleFilter === 'team_leaders' && isHost) return false;
      }

      // 3. Tier Pay Filter
      if (selectedTiers.length > 0) {
        const tierPay = (host.tier_pay || '').toLowerCase();
        const matchesTier = selectedTiers.some(t => tierPay.includes(t.toLowerCase().replace(' host', '')));
        if (!matchesTier) return false;
      }

      return true;
    }).sort((a, b) => {
      // Top Niners Sort overrides everything
      if (showTopNiners) {
        const indexA = top9NinerIds.indexOf(String(a.id));
        const indexB = top9NinerIds.indexOf(String(b.id));
        return indexA - indexB;
      }

      // 0. Active first
      const aIsActive = (a.status || '').toLowerCase() === 'active';
      const bIsActive = (b.status || '').toLowerCase() === 'active';
      if (aIsActive !== bIsActive) {
        return aIsActive ? -1 : 1;
      }

      // 1. Role 'host' first
      const aIsHost = ['host', 'talent'].includes((a.role || '').toLowerCase().trim());
      const bIsHost = ['host', 'talent'].includes((b.role || '').toLowerCase().trim());
      if (aIsHost !== bIsHost) {
        return aIsHost ? -1 : 1;
      }

      // 2. Photo presence (photo first)
      const aHasPhoto = !!a.photoUrl;
      const bHasPhoto = !!b.photoUrl;
      if (aHasPhoto !== bHasPhoto) {
        return aHasPhoto ? -1 : 1;
      }
      
      // 3. Alphabetical by nickname/name
      const aName = (a.nickname || a.name || '').toLowerCase();
      const bName = (b.nickname || b.name || '').toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [hosts, searchTerm, roleFilter, selectedTiers, showTopNiners, top9NinerIds]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 size={48} className="animate-spin text-indigo-500" />
        <p className="text-[#A09E9A] text-sm animate-pulse">Loading Roster from Database...</p>
      </div>
    );
  }

<<<<<<< HEAD
  const sortedTalents = useMemo(() => {
    const list = [...talents];
    if (!sortConfig) return list;
    const { key, direction } = sortConfig;

    return list.sort((a, b) => {
      let aValue: any = '';
      let bValue: any = '';
      
      if (key === 'status') {
        aValue = a.status;
        bValue = b.status;
      } else if (key === 'nickname') {
        aValue = a.nickname || a.name;
        bValue = b.nickname || b.name;
      } else if (key === 'team') {
        aValue = a.team;
        bValue = b.team;
      } else if (key === 'base_salary_category') {
        aValue = a.base_salary_category;
        bValue = b.base_salary_category;
      } else if (key === 'manager') {
        aValue = a.manager;
        bValue = b.manager;
      } else if (key === 'id') {
        aValue = a.id;
        bValue = b.id;
      } else if (key === 'name') {
        aValue = a.name;
        bValue = b.name;
      } else if (key === 'level') {
        aValue = a.level;
        bValue = b.level;
      } else if (key === 'anchor_type') {
        aValue = a.anchor_type;
        bValue = b.anchor_type;
      } else if (key === 'role') {
        aValue = a.role;
        bValue = b.role;
      }
      
      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      if (key === 'id' || key === 'level') {
        const aNum = Number(aValue);
        const bNum = Number(bValue);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return direction === 'asc' ? aNum - bNum : bNum - aNum;
        }
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [talents, sortConfig]);

  if (isLoading) return <div className="p-20 text-center text-[#B0B0B0]/40 italic">Loading Roster MasterSheet...</div>;

  return (
    <div ref={containerRef} className="space-y-8">
      {/* Top Header for Public View */}
      {auth.level === 0 && (
        <div className="border-b border-t border-white/5 py-3 flex items-center justify-between px-2">
          <span className="text-xs font-black tracking-[0.25em] text-[#B0B0B0]/50">NINERS APP</span>
        </div>
      )}

      {/* Leadership Section */}
      {leadership.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#B0B0B0] flex items-center gap-2">
            <Shield size={14} className="text-indigo-400" />
            Leadership & Administration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {leadership.map(m => (
              <div key={m.id} className="glass-card !p-4 flex items-center gap-4 group bg-[#1A1A1A] border border-white/5 hover:border-[#FFB800]/30 hover:border-indigo-500/20 transition-all duration-300">
                <div className="w-10 h-10 rounded bg-[#111111] flex items-center justify-center font-bold text-[#B0B0B0] overflow-hidden shrink-0 border border-white/5">
                  {m.photoUrl ? (
                    <img src={m.photoUrl} alt={m.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    m.name?.[0] || '?'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[#F5F5F5] truncate text-sm">{m.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{m.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Roster Table Section */}
      <section className="glass-card !p-0 overflow-hidden bg-[#0A0A0A] border border-white/5 shadow-2xl">
        
        {/* Roster Subtitle and Title area */}
        <div className="px-6 py-5 border-b border-white/5 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[#F5F5F5]">
            <Users className="text-[#FFB800] w-5 h-5" />
            <h3 className="text-sm font-black uppercase tracking-widest">ROSTER</h3>
          </div>
          <p className="text-[#B0B0B0]/30 text-[10px] uppercase font-bold tracking-wider">Public Talent Directory</p>
        </div>

        {/* Filter Toolbar matching wireframe */}
        <div className="px-6 py-4 border-b border-white/5 flex flex-col xl:flex-row items-center gap-4 justify-between bg-[#1A1A1A]/20">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5 w-full xl:w-auto">
            {/* Search Input */}
            <div className="relative w-full md:w-60">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B0B0]" />
              <input 
                type="text" 
                placeholder="Search by ID or Nickname..." 
                className="w-full bg-[#111111] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800] outline-none text-[#F5F5F5] transition-all placeholder-white/20" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>

            {/* Role Filters & Sorters */}
            <div className="flex flex-wrap items-center gap-3 border-l border-white/5 pl-5">
              {/* Role Dropdown Filter */}
              <div className="relative flex items-center">
                <select 
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  title="Filter by Role Type"
                  className="bg-[#111111] border border-white/10 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-[#F5F5F5] outline-none focus:ring-1 focus:ring-[#FFB800] cursor-pointer appearance-none font-sans"
                >
                  <option value="all" className="bg-[#111111]">All Roles</option>
                  <option value="talent" className="bg-[#111111]">Talents Only</option>
                  <option value="leader" className="bg-[#111111]">Team Leaders Only</option>
                </select>
                <div className="absolute right-2.5 pointer-events-none text-[#B0B0B0]/40 flex items-center">
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>

              {/* Sort Selector Dropdown */}
              <div className="relative flex items-center">
                <select 
                  value={sortConfig ? `${sortConfig.key}_${sortConfig.direction}` : 'id_asc'}
                  onChange={(e) => {
                    const [key, direction] = e.target.value.split('_');
                    setSortConfig({ key: key as any, direction: direction as any });
                  }}
                  title="Sort Roster"
                  className="bg-[#111111] border border-white/10 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-[#F5F5F5] outline-none focus:ring-1 focus:ring-[#FFB800] cursor-pointer appearance-none font-sans"
                >
                  <option value="id_asc" className="bg-[#111111]">ID (Asc)</option>
                  <option value="id_desc" className="bg-[#111111]">ID (Desc)</option>
                  <option value="nickname_asc" className="bg-[#111111]">Name (A-Z)</option>
                  <option value="nickname_desc" className="bg-[#111111]">Name (Z-A)</option>
                  <option value="role_asc" className="bg-[#111111]">Role (A-Z)</option>
                  <option value="role_desc" className="bg-[#111111]">Role (Z-A)</option>
                  <option value="status_asc" className="bg-[#111111]">Status (A-Z)</option>
                  <option value="status_desc" className="bg-[#111111]">Status (Z-A)</option>
                  <option value="level_desc" className="bg-[#111111]">Level (Highest)</option>
                </select>
                <div className="absolute right-2.5 pointer-events-none text-[#B0B0B0]/40 flex items-center">
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Category Buttons */}
            <div className="flex flex-wrap items-center gap-2 border-l border-white/5 pl-5">
              <button 
                onClick={() => togglePolicyFilter('Star Host')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border cursor-pointer",
                  activePolicyFilters.includes('Star Host')
                    ? "bg-gradient-to-br from-yellow-400 to-amber-600 border-yellow-300 text-white shadow-[0_0_12px_rgba(250,204,21,0.6)]"
                    : "bg-[#1A1A1A] border-white/5 text-[#B0B0B0]/60 hover:text-[#F5F5F5] hover:bg-[#222222]"
                )}
              >
                Star Host
              </button>
              <button 
                onClick={() => togglePolicyFilter('Rocket Host')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border cursor-pointer",
                  activePolicyFilters.includes('Rocket Host')
                    ? "bg-gradient-to-br from-sky-400 to-blue-600 border-sky-300 text-white shadow-[0_0_12px_rgba(56,189,248,0.6)]"
                    : "bg-[#1A1A1A] border-white/5 text-[#B0B0B0]/60 hover:text-[#F5F5F5] hover:bg-[#222222]"
                )}
              >
                Rocket Host
              </button>
              <button 
                onClick={() => togglePolicyFilter('S idol')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border cursor-pointer",
                  activePolicyFilters.includes('S idol')
                    ? "bg-gradient-to-br from-pink-400 to-pink-700 border-pink-300 text-white shadow-[0_0_12px_rgba(244,114,182,0.6)]"
                    : "bg-[#1A1A1A] border-white/5 text-[#B0B0B0]/60 hover:text-[#F5F5F5] hover:bg-[#222222]"
                )}
              >
                S idol
              </button>
              <button 
                onClick={() => togglePolicyFilter('Esports')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border cursor-pointer",
                  activePolicyFilters.includes('Esports')
                    ? "bg-gradient-to-br from-violet-500 to-purple-700 border-violet-400 text-white shadow-[0_0_12px_rgba(139,92,246,0.6)]"
                    : "bg-[#1A1A1A] border-white/5 text-[#B0B0B0]/60 hover:text-[#F5F5F5] hover:bg-[#222222]"
                )}
              >
                Esports
              </button>
              <button 
                onClick={() => togglePolicyFilter('Regular Host')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border cursor-pointer",
                  activePolicyFilters.includes('Regular Host')
                    ? "bg-gradient-to-br from-emerald-400 to-emerald-700 border-emerald-300 text-white shadow-[0_0_12px_rgba(52,211,153,0.6)]"
                    : "bg-[#1A1A1A] border-white/5 text-[#B0B0B0]/60 hover:text-[#F5F5F5] hover:bg-[#222222]"
                )}
              >
                Regular Host
              </button>
            </div>
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden xl:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              {auth.level > 0 ? (
                <tr className="text-[10px] font-black text-[#B0B0B0]/30 uppercase tracking-[0.2em] border-b border-white/5">
                  <th className="px-6 py-5 cursor-pointer hover:text-[#F5F5F5] transition-colors" onClick={() => handleSort('status')}>Status</th>
                  <th className="px-6 py-5 cursor-pointer hover:text-[#F5F5F5] transition-colors" onClick={() => handleSort('nickname')}>Talent Profile</th>
                  <th className="px-6 py-5 cursor-pointer hover:text-[#F5F5F5] transition-colors" onClick={() => handleSort('role')}>Role</th>
                  <th className="px-6 py-5 cursor-pointer hover:text-[#F5F5F5] transition-colors" onClick={() => handleSort('team')}>Team</th>
                  <th className="px-6 py-5 cursor-pointer hover:text-[#F5F5F5] transition-colors" onClick={() => handleSort('base_salary_category')}>Base Policy</th>
                  <th className="px-6 py-5 cursor-pointer hover:text-[#F5F5F5] transition-colors" onClick={() => handleSort('manager')}>Management</th>
                </tr>
              ) : (
                <tr className="text-[10px] font-black text-[#B0B0B0]/30 uppercase tracking-[0.2em] border-b border-white/5">
                  <th className="px-6 py-5 cursor-pointer hover:text-[#F5F5F5] transition-colors" onClick={() => handleSort('id')}>Poppo ID</th>
                  <th className="px-6 py-5 cursor-pointer hover:text-[#F5F5F5] transition-colors" onClick={() => handleSort('nickname')}>Nickname</th>
                  <th className="px-6 py-5 cursor-pointer hover:text-[#F5F5F5] transition-colors" onClick={() => handleSort('role')}>Role</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedTalents.map(host => (
                auth.level > 0 ? (
                  // Authorized detailed row (view-only)
                  <tr key={host.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => setSpotlightHost(host)}>
                    <td className="px-6 py-4">
                      <span className={cn("px-2 py-0.5 rounded text-[9px] uppercase font-black tracking-widest",
                        host.status === 'Active' ? "bg-emerald-500/10 text-emerald-500" :
                        host.status === 'Inconsistent' ? "bg-amber-500/10 text-amber-500" :
                        host.status === 'Released' ? "bg-red-500/10 text-red-500" : "bg-[#1A1A1A] text-[#B0B0B0]/40"
                      )}>{host.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#111111] flex items-center justify-center font-black text-[#B0B0B0]/20 overflow-hidden shrink-0 border border-white/5 shadow-inner">
                          {host.photoUrl ? (
                            <img src={host.photoUrl} alt={host.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            host.nickname?.[0] || '?'
                          )}
                        </div>
                        <div>
                          <div className="font-black text-[#F5F5F5] text-sm tracking-tight group-hover:text-[#FFB800] transition-colors">{host.nickname}</div>
                          <div className="text-[10px] font-mono text-[#B0B0B0]/40 tracking-tighter">ID: {host.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold text-[#B0B0B0]/60 uppercase tracking-widest">{host.role}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/10">
                        {host.team || 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black text-[#F5F5F5]/70 tracking-widest uppercase">
                        {host.base_salary_category || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                        <span className="text-xs font-bold text-[#B0B0B0]/60">{host.manager}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // Public simplified row matching Image 4
                  <tr key={host.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => setSpotlightHost(host)}>
                    <td className="px-6 py-5 font-mono text-sm text-[#FFB800] font-semibold">{host.id}</td>
                    <td className="px-6 py-5 font-bold text-[#F5F5F5] group-hover:text-[#FFB800] transition-colors">{host.nickname || host.name}</td>
                    <td className="px-6 py-5 text-[#B0B0B0]/60 text-xs font-medium">
                      {host.role === 'Talent' ? `Host (${host.base_salary_category || 'Star Host'})` : host.role}
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
          {sortedTalents.map(host => (
            auth.level > 0 ? (
              // Authorized detailed card (view-only)
              <div key={host.id} className="glass-card hover:border-indigo-500/20 transition-all duration-300 cursor-pointer" onClick={() => setSpotlightHost(host)}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#111111] flex items-center justify-center font-black text-[#B0B0B0]/20 overflow-hidden border border-white/5 shadow-inner">
                      {host.photoUrl ? (
                        <img src={host.photoUrl} alt={host.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        host.nickname?.[0] || '?'
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-[#F5F5F5] text-base tracking-tight group-hover:text-[#FFB800] transition-colors">{host.nickname}</h4>
                      <p className="text-[10px] font-mono text-[#B0B0B0]/45">ID: {host.id}</p>
                    </div>
                  </div>
                  <span className={cn("px-2 py-0.5 rounded text-[8px] uppercase font-black tracking-widest",
                    host.status === 'Active' ? "bg-emerald-500/10 text-emerald-500" :
                    host.status === 'Inconsistent' ? "bg-amber-500/10 text-amber-500" :
                    host.status === 'Released' ? "bg-red-500/10 text-red-500" : "bg-[#1A1A1A] text-[#B0B0B0]/40"
                  )}>{host.status}</span>
                </div>

                <div className="grid grid-cols-2 gap-y-3 text-[10px]">
                  <div className="space-y-1">
                    <p className="text-[#B0B0B0]/40 uppercase tracking-widest font-bold font-mono">Role</p>
                    <p className="text-[#F5F5F5] font-bold">{host.role}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[#B0B0B0]/40 uppercase tracking-widest font-bold font-mono">Team</p>
                    <p className="text-indigo-400 font-bold">{host.team || 'Unassigned'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[#B0B0B0]/40 uppercase tracking-widest font-bold font-mono">Management</p>
                    <p className="text-[#F5F5F5] font-bold">{host.manager}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[#B0B0B0]/40 uppercase tracking-widest font-bold font-mono">Policy</p>
                    <p className="text-[#F5F5F5] font-bold">{host.base_salary_category || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ) : (
              // Public simplified card matching Image 4
              <div 
                key={host.id} 
                onClick={() => setSpotlightHost(host)}
                className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4 flex items-center justify-between hover:border-[#FFB800]/45 hover:bg-[#222222]/40 transition-all cursor-pointer"
              >
                <div>
                  <h4 className="font-bold text-[#F5F5F5] text-sm tracking-tight">{host.nickname || host.name}</h4>
                  <p className="text-[10px] font-mono text-[#FFB800] font-semibold mt-0.5">ID: {host.id}</p>
                </div>
                <span className="text-[10px] font-bold text-[#B0B0B0]/60 uppercase">
                  {host.role === 'Talent' ? 'Host' : host.role}
                </span>
              </div>
            )
          ))}
        </div>
      </section>

      {/* Public Spotlight Modal mapping Image 4 / 5 */}
      <AnimatePresence>
        {spotlightHost && portalTarget && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSpotlightHost(null)} 
              className="absolute inset-0 bg-[#08080F]/80 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="relative w-full max-w-lg z-10 max-h-[90vh] overflow-y-auto"
            >
              <HostProfileView host={spotlightHost} onClose={() => setSpotlightHost(null)} />
            </motion.div>
          </div>,
          portalTarget
        )}
      </AnimatePresence>
=======
  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center">
        <h3 className="text-red-400 font-bold mb-2">System Error</h3>
        <p className="text-sm text-[#A09E9A]">{error}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-6 relative">
      {/* FILTER MENU BLOCKS */}
      <div className="global-block-1 relative z-10 flex flex-col gap-2.5 overflow-hidden p-4">
        {/* Subtle background glow for the filter section */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#D4AF37]/5 blur-3xl rounded-full pointer-events-none"></div>

        {/* Search & Role Filter Row */}
        <div className="global-placeholder flex w-full items-center justify-between gap-2 bg-gradient-to-br from-[#FFB800]/10 to-transparent border border-[#FFB800]/20 border-t-[#FFB800]/40 rounded-xl px-4 py-2 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,184,0,0.3)] relative z-10 overflow-hidden">
          <div className="relative flex-1 flex items-center">
            <Search className="text-[#FFB700] drop-shadow-[0_0_8px_rgba(255,184,0,0.5)] mr-3 shrink-0" size={18} />
            <input
              type="text"
              placeholder="Search Host ID or Nickname..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none text-sm text-[#F0EFE8] placeholder:text-[#A09E9A]/60 focus:outline-none focus:ring-0"
            />
          </div>
          
          <div className="w-32 sm:w-48 shrink-0 flex items-center justify-end border-l border-[#FFB800]/20 pl-4">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              title="Filter by Role"
              className="w-full bg-transparent border-none text-xs text-[#FFB700] font-bold focus:outline-none cursor-pointer uppercase tracking-wider text-right appearance-none text-align-last-right"
            >
              <option value="all" className="bg-black text-[#FFB700]">All Members</option>
              <option value="hosts" className="bg-black text-[#FFB700]">Hosts</option>
              <option value="team_leaders" className="bg-black text-[#FFB700]">Team Leaders</option>
            </select>
          </div>
        </div>

        {/* Tier Pay Category & Top Niners */}
        <div className="w-full z-10">
          <div className="flex flex-wrap gap-1.5 items-center">
            {[
              { name: 'S idol', icon: Ribbon },
              { name: 'Esports', icon: Gamepad2 },
              { name: 'Star Host', icon: Star },
              { name: 'Rocket Host', icon: Rocket },
              { name: 'Regular Host', icon: Users }
            ].map(tierObj => {
              const tier = tierObj.name;
              const Icon = tierObj.icon;
              const isSelected = selectedTiers.includes(tier);
              return (
                <button
                  key={tier}
                  onClick={() => {
                    if (isSelected) setSelectedTiers(prev => prev.filter(t => t !== tier));
                    else setSelectedTiers(prev => [...prev, tier]);
                  }}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border backdrop-blur-sm shadow-sm flex items-center gap-1 transition-all",
                    getTierFilterStyle(tier, isSelected)
                  )}
                >
                  <Star size={8} />
                  {tier}
                </button>
              );
            })}
            
            <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
            
            <button
              onClick={() => {
                const newValue = !showTopNiners;
                setShowTopNiners(newValue);
                if (newValue) {
                  const url = new URL(window.location.href);
                  url.searchParams.set('filter', 'top-niners');
                  window.history.replaceState({}, '', url);
                } else {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('filter');
                  window.history.replaceState({}, '', url);
                }
              }}
              className={cn(
                "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border backdrop-blur-sm shadow-sm flex items-center gap-1 transition-all",
                showTopNiners
                  ? "text-[#D4AF37] bg-[#D4AF37]/20 border-[#D4AF37]/50 shadow-[0_0_12px_rgba(212,175,55,0.5)] opacity-100 ring-1 ring-white/30"
                  : "text-[#D4AF37] bg-[#D4AF37]/20 border-transparent shadow-none opacity-50 hover:opacity-80 cursor-pointer"
              )}
            >
              <Medal size={8} />
              TOP NINERS
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center px-2">
        <h2 className="text-[#F0EFE8] font-black text-lg tracking-wider flex items-center gap-2">
          <LayoutGrid className="text-indigo-500" size={20} />
          ROSTER DIRECTORY
        </h2>
        <span className="text-[#A09E9A] text-xs font-mono">{filteredHosts.length} profiles found</span>
      </div>

      {/* MINIMUM 2-BLOCK PER ROW GRID UNDER THE FILTERS */}
      {filteredHosts.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 text-[#A09E9A]/30">
            <Filter size={32} />
          </div>
          <p className="text-[#A09E9A]/70 font-bold">No profiles to show.</p>
          <p className="text-xs text-[#A09E9A]/40 mt-1">Please adjust your filters or search query above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredHosts.map(host => {
            const tierPay = String(host.tier_pay || 'N/A');
            const getTierStyle = () => {
              return 'border-[#D4AF37]/40 bg-gradient-to-br from-[#FF6B00]/20 via-[#D4AF37]/10 to-transparent shadow-[0_4px_15px_rgba(0,0,0,0.5),0_0_15px_rgba(212,175,55,0.2)]';
            };
            return (
              <div
                key={host.id}
                onClick={() => openSpotlight(host)}
                className={cn(
                  "aspect-square relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 group flex flex-col justify-between border",
                  getTierStyle()
                )}
              >
                {/* Background Photo */}
                {host.photoUrl ? (
                  <img 
                    src={host.photoUrl} 
                    alt="" 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 z-0" 
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[#A09E9A]/20 bg-gradient-to-br from-[#1A1A28] to-[#0D0D14] z-0">
                    <Users size={40} className="opacity-30" />
                  </div>
                )}

                {/* Top Overlay (17% total height, top 12% is solid black, remaining 5% fades) */}
                <div className="absolute top-0 inset-x-0 h-[17%] pointer-events-none roster-top-overlay" />
                
                {/* Bottom Overlay (30% total height, bottom 20% is solid black, remaining 10% fades) */}
                <div className="absolute bottom-0 inset-x-0 h-[30%] pointer-events-none roster-bottom-overlay" />

                {/* Top Labels */}
                <div className="relative z-10 w-full px-3 pt-1.5 pb-3 flex justify-between items-start pointer-events-none">
                  {/* Status indicator or Badge on top-left */}
                  <div className="flex flex-col gap-1 items-start">
                    {/* Top Niner (Dynamic Share%) and Manual Badges (Active or Last Month) */}
                    {(() => {
                      const dynamicTopNiner = top9NinerData.find(d => String(d.id) === String(host.id));

                      const now = new Date();
                      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
                      const current = now.getTime();

                      const hostAwards = allAwards.filter(a => {
                        if (String(a.hostId || a.poppoId) !== String(host.id)) return false;
                        
                        let isActive = false;
                        if (a.startDate && a.endDate) {
                          const start = new Date(a.startDate).getTime();
                          const end = new Date(a.endDate).getTime();
                          if (current >= start && current <= end + 86400000) isActive = true;
                        }
                        
                        let isRecentlyAssigned = false;
                        const assignedDate = new Date(a.awardedAt || a.dateAwarded || a.assignedAt || 0).getTime();
                        if (assignedDate >= lastMonthStart) {
                          isRecentlyAssigned = true;
                        }

                        return isActive || isRecentlyAssigned;
                      });

                      // Filter out any manual awards that are Top Niner badges (since Top Niner badge is dynamically rendered)
                      const manualAwards = hostAwards.filter(a => {
                        const title = String(a.title || a.awardName || a.name || '');
                        return !/Top (\d+) Niner/i.test(title);
                      });

                      // Sort manual awards by time period descending (most recent first)
                      const sortedManualAwards = [...manualAwards].sort((a, b) => {
                        const dateA = a.startDate || a.awardedAt || a.dateAwarded || a.assignedAt || '';
                        const dateB = b.startDate || b.awardedAt || b.dateAwarded || b.assignedAt || '';
                        return dateB.localeCompare(dateA);
                      });

                      if (!dynamicTopNiner && sortedManualAwards.length === 0) return null;

                      return (
                        <>
                          {dynamicTopNiner && (() => {
                            const rank = dynamicTopNiner.rank;
                            let badgeColorStyle = 'text-[#D4AF37] bg-[#D4AF37]/20 border-[#D4AF37]/50 shadow-[0_0_12px_rgba(212,175,55,0.5)]'; // Gold for Top 1-3
                            if (rank >= 4 && rank <= 6) badgeColorStyle = 'text-[#F97316] bg-[#F97316]/20 border-[#F97316]/50 shadow-[0_0_12px_rgba(249,115,22,0.5)]'; // Orange for Top 4-6
                            else if (rank >= 7) badgeColorStyle = 'text-[#EF4444] bg-[#EF4444]/20 border-[#EF4444]/50 shadow-[0_0_12px_rgba(239,68,68,0.5)]'; // Red for Top 7-9

                            return (
                              <div className={cn("px-1 py-0.5 sm:px-1.5 sm:py-0.5 rounded text-[6.5px] sm:text-[8px] font-black uppercase tracking-wider border backdrop-blur-sm shadow-sm flex items-center gap-0.5 sm:gap-1", badgeColorStyle)}>
                                <Medal className="w-1.5 h-1.5 sm:w-2 sm:h-2 shrink-0" />
                                Top {rank} Niner
                              </div>
                            );
                          })()}

                          {sortedManualAwards.map(a => {
                            let badgeColorStyle = 'border-amber-500 text-amber-200 bg-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.6)]';
                            if (a.awardColor === 'Purple' || a.color === 'Purple') badgeColorStyle = 'border-purple-500 text-purple-200 bg-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.6)]';
                            else if (a.awardColor === 'Emerald' || a.color === 'Emerald') badgeColorStyle = 'border-emerald-500 text-emerald-200 bg-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.6)]';
                            else if (a.awardColor === 'Blue' || a.color === 'Blue') badgeColorStyle = 'border-blue-500 text-blue-200 bg-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.6)]';
                            else if (a.awardColor === 'Red' || a.color === 'Red') badgeColorStyle = 'border-red-500 text-red-200 bg-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
                            else if (a.awardColor === 'Orange' || a.color === 'Orange') badgeColorStyle = 'border-orange-500 text-orange-200 bg-orange-500/30 shadow-[0_0_8px_rgba(249,115,22,0.6)]';

                            return (
                              <div key={a.id} className={cn("px-1 py-0.5 sm:px-1.5 sm:py-0.5 rounded text-[6px] sm:text-[7.5px] font-black uppercase tracking-wider border backdrop-blur-sm flex items-center gap-0.5 sm:gap-1", badgeColorStyle)}>
                                <Star className="w-1.5 h-1.5 sm:w-2 sm:h-2 shrink-0 drop-shadow-md" />
                                {formatBadgeTitle(a.title || a.awardName || a.name)}
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                    
                    {/* Status */}
                    {host.status && String(host.status).toLowerCase() !== 'active' && (
                      <div className="flex items-center gap-0.5 sm:gap-1 bg-black/40 backdrop-blur-md px-1 sm:px-1.5 py-0.5 rounded-full border border-red-500/30">
                        <span className="w-1 h-1 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></span>
                        <span className="text-[5.5px] sm:text-[6.5px] font-black text-red-400 uppercase tracking-widest">{host.status}</span>
                      </div>
                    )}
                  </div>

                  {/* Tier Pay badge top right */}
                  {host.tier_pay && (() => {
                    const tier = String(host.tier_pay);
                    if (tier.toLowerCase().includes('regular')) return null;
                    const getTierStyle = (t: string) => {
                      const lower = t.toLowerCase();
                      if (lower.includes('star')) return 'text-[#FFEA00] bg-[#FFEA00]/20 border-[#FFEA00]/50 shadow-[0_0_12px_rgba(255,234,0,0.5)]';
                      if (lower.includes('rocket')) return 'text-[#60A5FA] bg-[#1E3A8A]/60 border-[#60A5FA]/60 shadow-[0_0_12px_rgba(96,165,250,0.5)]';
                      if (lower.includes('s idol')) return 'text-[#FF007F] bg-[#FF007F]/20 border-[#FF007F]/50 shadow-[0_0_12px_rgba(255,0,127,0.5)]';
                      if (lower.includes('esports')) return 'text-[#B026FF] bg-[#B026FF]/20 border-[#B026FF]/50 shadow-[0_0_12px_rgba(176,38,255,0.5)]';
                      if (lower.includes('regular')) return 'text-[#34D399] bg-[#34D399]/20 border-[#34D399]/50 shadow-[0_0_12px_rgba(52,211,153,0.5)]';
                      return 'text-white bg-white/10 border-white/20';
                    };

                    return (
                      <div className={cn("px-1 py-0.5 sm:px-1.5 sm:py-0.5 rounded text-[6.5px] sm:text-[8px] font-black uppercase tracking-wider border backdrop-blur-sm shadow-sm flex items-center gap-0.5 sm:gap-1", getTierStyle(tier))}>
                        <Star className="w-1.5 h-1.5 sm:w-2 sm:h-2 shrink-0" />
                        {tier}
                      </div>
                    );
                  })()}
                </div>

                {/* Bottom Labels */}
                <div className="relative z-10 w-full p-3 mt-auto flex flex-col items-start text-left pointer-events-none">
                  <h3 className="text-white font-black text-sm truncate w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mb-1">
                    {host.nickname || host.name}
                  </h3>
                  
                  {/* ID and Role Split Badge */}
                  <div className="flex items-center rounded-md overflow-hidden border border-[#D4AF37]/45 text-[8.5px] font-black shadow-md mt-0.5">
                    {/* Left side: ID (gold font with black fill background and gold border) */}
                    <div className="px-2 py-0.5 bg-black text-[#D4AF37] border-r border-[#D4AF37]/45 font-mono font-bold">
                      {host.id}
                    </div>
                    {/* Right side: Role (black font and background is filled gold) */}
                    <div className="px-2 py-0.5 bg-[#D4AF37] text-black uppercase tracking-wider">
                      {host.role || 'Host'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SPOTLIGHT MODAL */}
      {selectedHost && portalTarget && createPortal(
        <div className="fixed inset-0 z-[9999]">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={closeSpotlight}></div>
          <div className="absolute inset-0 overflow-y-auto p-4 py-10 pb-24">
            <div className="w-full mx-auto flex justify-center min-h-full relative z-10">
              <HostProfileView 
                host={selectedHost} 
                isReadOnly={isReadOnly} 
                onClose={closeSpotlight} 
                hidePerformanceStats={true}
              />
            </div>
          </div>
        </div>,
        portalTarget
      )}
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
    </div>
  );
};

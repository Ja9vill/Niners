import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Filter, Loader2, Star, Users, LayoutGrid, Medal, Ribbon, Gamepad2, Rocket } from 'lucide-react';
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

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center">
        <h3 className="text-red-400 font-bold mb-2">System Error</h3>
        <p className="text-sm text-[#A09E9A]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
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
              className="w-full bg-transparent border-none text-xs text-[#FFB700] font-bold focus:outline-none cursor-pointer uppercase tracking-wider text-right appearance-none"
              style={{ textAlignLast: 'right' }}
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
                    "relative flex items-center justify-between min-w-[110px] px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border overflow-hidden shadow-md",
                    getTierFilterStyle(tier, isSelected)
                  )}
                >
                  <span className="relative z-10 text-left w-full">{tier}</span>
                  <Icon size={16} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none" />
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
                "relative flex items-center justify-between min-w-[110px] px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border overflow-hidden",
                showTopNiners
                  ? "text-[#D4AF37] bg-[#D4AF37]/20 border-[#D4AF37]/50 shadow-[0_0_12px_rgba(212,175,55,0.5)] opacity-100 ring-1 ring-white/30"
                  : "text-[#D4AF37] bg-[#D4AF37]/20 border-transparent shadow-none opacity-50 hover:opacity-80 cursor-pointer"
              )}
            >
              <span className="relative z-10 text-left w-full">TOP NINERS</span>
              <Medal size={16} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none" />
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
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    style={{ zIndex: 0 }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[#A09E9A]/20 bg-gradient-to-br from-[#1A1A28] to-[#0D0D14]" style={{ zIndex: 0 }}>
                    <Users size={40} className="opacity-30" />
                  </div>
                )}

                {/* Top Overlay (17% total height, top 12% is solid black, remaining 5% fades) */}
                <div className="absolute top-0 inset-x-0 h-[17%] pointer-events-none" style={{ background: 'linear-gradient(to bottom, #000000 0%, #000000 70.6%, transparent 100%)', zIndex: 1 }} />
                
                {/* Bottom Overlay (30% total height, bottom 20% is solid black, remaining 10% fades) */}
                <div className="absolute bottom-0 inset-x-0 h-[30%] pointer-events-none" style={{ background: 'linear-gradient(to top, #000000 0%, #000000 66.7%, transparent 100%)', zIndex: 1 }} />

                {/* Top Labels */}
                <div className="relative z-10 w-full px-3 pt-1.5 pb-3 flex justify-between items-start pointer-events-none">
                  {/* Status indicator or Badge on top-left */}
                  <div className="flex flex-col gap-1 items-start">
                    {/* Top Niner (Dynamic Share%) or Manual Badges (Active or Last Month) */}
                    {(() => {
                      const dynamicTopNiner = top9NinerData.find(d => String(d.id) === String(host.id));
                      if (dynamicTopNiner) {
                        const rank = dynamicTopNiner.rank;
                        let badgeColorStyle = 'text-[#D4AF37] bg-[#D4AF37]/20 border-[#D4AF37]/50 shadow-[0_0_12px_rgba(212,175,55,0.5)]'; // Gold for Top 1-3
                        if (rank >= 4 && rank <= 6) badgeColorStyle = 'text-[#F97316] bg-[#F97316]/20 border-[#F97316]/50 shadow-[0_0_12px_rgba(249,115,22,0.5)]'; // Orange for Top 4-6
                        else if (rank >= 7) badgeColorStyle = 'text-[#EF4444] bg-[#EF4444]/20 border-[#EF4444]/50 shadow-[0_0_12px_rgba(239,68,68,0.5)]'; // Red for Top 7-9

                        return (
                          <div className={cn("px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border backdrop-blur-sm shadow-sm flex items-center gap-1", badgeColorStyle)}>
                            <Medal size={8} />
                            Top {rank} Niner
                          </div>
                        );
                      }

                      const now = new Date();
                      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
                      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                      const current = now.getTime();

                      const hostAwards = allAwards.filter(a => {
                        if (String(a.hostId || a.poppoId) !== String(host.id)) return false;
                        
                        let isActive = false;
                        if (a.startDate && a.endDate) {
                          const start = new Date(a.startDate).getTime();
                          const end = new Date(a.endDate).getTime();
                          // Expand end date boundary to end of day to be generous
                          if (current >= start && current <= end + 86400000) isActive = true;
                        }
                        
                        let isRecentlyAssigned = false;
                        const assignedDate = new Date(a.awardedAt || a.dateAwarded || a.assignedAt || 0).getTime();
                        if (assignedDate >= lastMonthStart) {
                          isRecentlyAssigned = true;
                        }

                        // We will count it if it is strictly active, OR if it was assigned within the last month or so.
                        return isActive || isRecentlyAssigned;
                      });

                      if (hostAwards.length > 0) {
                        const latestAward = hostAwards.sort((a, b) => {
                          const aIsTopNiner = /Top (\d+) Niner/i.test(String(a.title || a.awardName || a.name || ''));
                          const bIsTopNiner = /Top (\d+) Niner/i.test(String(b.title || b.awardName || b.name || ''));
                          if (aIsTopNiner && !bIsTopNiner) return -1;
                          if (!aIsTopNiner && bIsTopNiner) return 1;
                          return new Date(b.awardedAt || b.dateAwarded || b.assignedAt || 0).getTime() - new Date(a.awardedAt || a.dateAwarded || a.assignedAt || 0).getTime();
                        })[0];
                        
                        // Prevent duplicate dynamic badge if they somehow manually assigned a Top Niner badge as well
                        if (/Top (\d+) Niner/i.test(String(latestAward.title || latestAward.awardName || latestAward.name || ''))) {
                          return null;
                        }

                        let badgeColorStyle = 'border-amber-500 text-amber-200 bg-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.6)]';
                        if (latestAward.awardColor === 'Purple' || latestAward.color === 'Purple') badgeColorStyle = 'border-purple-500 text-purple-200 bg-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.6)]';
                        else if (latestAward.awardColor === 'Emerald' || latestAward.color === 'Emerald') badgeColorStyle = 'border-emerald-500 text-emerald-200 bg-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.6)]';
                        else if (latestAward.awardColor === 'Blue' || latestAward.color === 'Blue') badgeColorStyle = 'border-blue-500 text-blue-200 bg-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.6)]';
                        else if (latestAward.awardColor === 'Red' || latestAward.color === 'Red') badgeColorStyle = 'border-red-500 text-red-200 bg-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
                        else if (latestAward.awardColor === 'Orange' || latestAward.color === 'Orange') badgeColorStyle = 'border-orange-500 text-orange-200 bg-orange-500/30 shadow-[0_0_8px_rgba(249,115,22,0.6)]';

                        return (
                          <div className={cn("px-1.5 py-0.5 rounded text-[7.5px] font-black uppercase tracking-wider border backdrop-blur-sm flex items-center gap-1", badgeColorStyle)}>
                            <Star size={8} className="drop-shadow-md" />
                            {formatBadgeTitle(latestAward.title || latestAward.awardName || latestAward.name)}
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    {/* Status */}
                    {host.status && String(host.status).toLowerCase() !== 'active' && (
                      <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-red-500/30">
                        <span className="w-1 h-1 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></span>
                        <span className="text-[6.5px] font-black text-red-400 uppercase tracking-widest">{host.status}</span>
                      </div>
                    )}
                  </div>

                  {/* Tier Pay badge top right */}
                  {host.tier_pay && (() => {
                    const tier = String(host.tier_pay);
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
                      <div className={cn("px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border backdrop-blur-sm shadow-sm flex items-center gap-1", getTierStyle(tier))}>
                        <Star size={8} />
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
      {selectedHost && createPortal(
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
        document.body
      )}
    </div>
  );
};

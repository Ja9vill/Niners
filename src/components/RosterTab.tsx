import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Loader2, Star, Users, LayoutGrid } from 'lucide-react';
import { FirebaseService } from '../lib/firebaseService';
import { cn } from '../lib/utils';
import { Host } from '../types';
import { HostProfileView } from './HostProfileView';

const getTierBlockStyles = (tierInput: string) => {
  const norm = String(tierInput || '').toLowerCase();
  if (norm.includes('star')) {
    return {
      border: 'border-[#D4AF37]/20 hover:border-[#D4AF37]/50',
      bg: 'bg-gradient-to-br from-[#D4AF37]/8 via-transparent to-transparent'
    };
  }
  if (norm.includes('s idol') || norm.includes('idol')) {
    return {
      border: 'border-[#ec4899]/20 hover:border-[#ec4899]/50',
      bg: 'bg-gradient-to-br from-[#ec4899]/8 via-transparent to-transparent'
    };
  }
  if (norm.includes('rocket')) {
    return {
      border: 'border-[#3b82f6]/20 hover:border-[#3b82f6]/50',
      bg: 'bg-gradient-to-br from-[#3b82f6]/8 via-transparent to-transparent'
    };
  }
  if (norm.includes('esports') || norm.includes('esport')) {
    return {
      border: 'border-[#a855f7]/20 hover:border-[#a855f7]/50',
      bg: 'bg-gradient-to-br from-[#a855f7]/8 via-transparent to-transparent'
    };
  }
  if (norm.includes('regular')) {
    return {
      border: 'border-[#10b981]/20 hover:border-[#10b981]/50',
      bg: 'bg-gradient-to-br from-[#10b981]/8 via-transparent to-transparent'
    };
  }
  return {
    border: 'border-white/5 hover:border-indigo-500/30',
    bg: 'bg-[#1A1A28]'
  };
};

const getTierFilterStyle = (tierInput: string, isSelected: boolean) => {
  if (!isSelected) {
    return "bg-black/20 text-[#A09E9A] border-white/10 hover:border-white/30 hover:text-[#F0EFE8]";
  }
  
  const lower = String(tierInput || '').toLowerCase();
  
  // star host - gold to yellow gold
  if (lower.includes('star')) return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]";
  
  // rocket host- blue to dark blue
  if (lower.includes('rocket')) return "bg-blue-600/20 text-blue-300 border-blue-600/50 shadow-[0_0_10px_rgba(37,99,235,0.2)]";
  
  // s idol- pink to dark pink
  if (lower.includes('idol')) return "bg-pink-600/20 text-pink-300 border-pink-600/50 shadow-[0_0_10px_rgba(219,39,119,0.2)]";
  
  // esports- purple to violet
  if (lower.includes('esport')) return "bg-purple-600/20 text-purple-300 border-purple-600/50 shadow-[0_0_10px_rgba(147,51,234,0.2)]";
  
  // regular host - green
  if (lower.includes('regular')) return "bg-green-600/20 text-green-300 border-green-600/50 shadow-[0_0_10px_rgba(22,163,74,0.2)]";
  
  // influencer is light yellow and white
  if (lower.includes('influencer')) return "bg-yellow-100/20 text-yellow-100 border-yellow-100/50 shadow-[0_0_10px_rgba(254,240,138,0.2)]";

  // Default fallback
  return "bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.2)]";
};

const formatBadgeTitle = (title: string) => {
  if (!title) return '';
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

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const users = await FirebaseService.getAllRoleMetadata();
        setHosts(users.map(u => ({ ...u, id: u.poppo_id || u.poppoId || u.id } as Host)));
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
    });
  }, [hosts, searchTerm, roleFilter, selectedTiers]);

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
      <div className="bg-[#1A1A28]/80 backdrop-blur-md p-5 rounded-2xl border border-[#D4AF37]/40 shadow-[0_0_15px_rgba(212,175,55,0.15)] sticky top-0 z-10 flex flex-col gap-4 relative overflow-hidden">
        {/* Subtle background glow for the filter section */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#D4AF37]/5 blur-3xl rounded-full pointer-events-none"></div>

        {/* Search & Role Filter Row */}
        <div className="flex flex-row gap-3 items-center z-10 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400/50" size={16} />
            <input
              type="text"
              placeholder="Search Host ID or Nickname..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-3 bg-black/30 border border-white/10 rounded-xl text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500/50 focus:bg-black/50 transition-all w-full shadow-inner"
            />
          </div>
          
          <div className="w-32 sm:w-48 shrink-0">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              title="Filter by Role"
              className="w-full py-3 px-4 bg-[#0D0D14] border border-white/10 rounded-xl text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500/50 focus:bg-black/50 transition-all cursor-pointer shadow-inner font-bold"
            >
              <option value="all" className="bg-[#1A1A28] text-[#F0EFE8]">All Members</option>
              <option value="hosts" className="bg-[#1A1A28] text-[#F0EFE8]">Hosts</option>
              <option value="team_leaders" className="bg-[#1A1A28] text-[#F0EFE8]">Team Leaders</option>
            </select>
          </div>
        </div>

        {/* Tier Pay Category */}
        <div className="w-full z-10">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A]/50 mb-2 flex items-center gap-1.5"><Star size={12}/> Tier Pay Category</h3>
          <div className="flex flex-wrap gap-2">
            {['Star Host', 'Rocket Host', 'S idol', 'Esports', 'Influencer', 'Regular Host'].map(tier => {
              const isSelected = selectedTiers.includes(tier);
              return (
                <button
                  key={tier}
                  onClick={() => {
                    if (isSelected) setSelectedTiers(prev => prev.filter(t => t !== tier));
                    else setSelectedTiers(prev => [...prev, tier]);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border",
                    getTierFilterStyle(tier, isSelected)
                  )}
                >
                  {tier}
                </button>
              );
            })}
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
            const blockStyles = getTierBlockStyles(tierPay);
            return (
              <div
                key={host.id}
                onClick={() => openSpotlight(host)}
                className={cn(
                  "aspect-square relative rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-1 transition-all duration-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border backdrop-blur-md bg-white/[0.01] hover:bg-white/[0.03] group flex flex-col justify-between",
                  blockStyles.border,
                  blockStyles.bg
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
                <div className="relative z-10 w-full px-3 pt-1.5 pb-3 flex justify-between items-center pointer-events-none">
                  {/* Status indicator on top-left */}
                  {host.status === 'Active' ? (
                    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                      <span className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
                      <span className="text-[6.5px] font-black text-emerald-400 uppercase tracking-widest">Active</span>
                    </div>
                  ) : (
                    <div></div>
                  )}

                  {/* Tier Pay badge top right (excluding Regular Host) */}
                  {host.tier_pay && host.tier_pay !== 'Regular Host' && (() => {
                    const tier = String(host.tier_pay);
                    const getTierStyle = (t: string) => {
                      const lower = t.toLowerCase();
                      if (lower.includes('star')) return 'text-yellow-400 bg-yellow-400/20 border-yellow-400/45';
                      if (lower.includes('rocket')) return 'text-cyan-400 bg-cyan-400/20 border-cyan-400/45';
                      if (lower.includes('s idol')) return 'text-pink-300 bg-pink-500/20 border-pink-500/45';
                      if (lower.includes('esports')) return 'text-[#00f2fe] bg-[#00f2fe]/20 border-[#00f2fe]/45 shadow-[0_0_8px_rgba(0,242,254,0.4)]';
                      if (lower.includes('regular')) return 'text-emerald-400 bg-emerald-400/20 border-emerald-400/45';
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
                    <div className="px-2 py-0.5 bg-black text-[#D4AF37] border-r border-[#D4AF37]/45 font-mono">
                      ID: {host.id}
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
      {selectedHost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <HostProfileView 
            host={selectedHost} 
            isReadOnly={isReadOnly} 
            onClose={closeSpotlight} 
            hidePerformanceStats={true}
          />
        </div>
      )}
    </div>
  );
};

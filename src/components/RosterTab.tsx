import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Loader2, Trophy, Star, Target, Users, LayoutGrid, X, Facebook, Instagram, Music, Phone, Clock, FileText } from 'lucide-react';
import { FirebaseService } from '../lib/firebaseService';
import { cn } from '../lib/utils';
import { Host, EventsCalendarPublic, AgencyAward } from '../types';

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
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['Host', 'Team Leader']);
  const [selectedTiers, setSelectedTiers] = useState<string[]>([
    'Star Host', 'Rocket Host', 'S idol', 'Esports', 'Influencer', 'Regular Host'
  ]);
  const [searchTerm, setSearchTerm] = useState('');

  // Spotlight State
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [isSpotlightLoading, setIsSpotlightLoading] = useState(false);
  const [hostEvents, setHostEvents] = useState<EventsCalendarPublic[]>([]);
  const [hostAwards, setHostAwards] = useState<AgencyAward[]>([]);

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

  const openSpotlight = async (host: Host) => {
    setSelectedHost(host);
    setIsSpotlightLoading(true);
    try {
      const [events, awards] = await Promise.all([
        FirebaseService.getCalendarEvents(),
        FirebaseService.getHostAwards ? FirebaseService.getHostAwards(host.id) : Promise.resolve([])
      ]);

      // Filter events where host might be involved
      const relatedEvents = events.filter((e: any) => {
        const pIdStr = String(host.id);
        const p1 = Array.isArray(e.participants) ? e.participants.map(String) : [];
        const p2 = Array.isArray(e.participantIds) ? e.participantIds.map(String) : [];
        const p3 = Array.isArray(e.participants_id) ? e.participants_id.map(String) : [];
        return String(e.poppo_id) === pIdStr || 
               String(e.event_host_id) === pIdStr || 
               String(e.hostId) === pIdStr || 
               p1.includes(pIdStr) || 
               p2.includes(pIdStr) || 
               p3.includes(pIdStr) || 
               (e.title && e.title.includes(host.nickname || host.name));
      });
      setHostEvents(relatedEvents);
      setHostAwards(awards || []);
    } catch (err) {
      console.error("Failed to fetch spotlight details", err);
    } finally {
      setIsSpotlightLoading(false);
    }
  };

  const closeSpotlight = () => {
    setSelectedHost(null);
    setHostEvents([]);
    setHostAwards([]);
  };

  const filteredHosts = useMemo(() => {
    if (selectedRoles.length === 0 && selectedTiers.length === 0 && !searchTerm.trim()) {
      return []; // Return empty if no filters applied
    }

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
      if (selectedRoles.length > 0) {
        const roleStr = (host.role || '').toLowerCase();
        const isHost = roleStr === 'host' || roleStr === 'talent';
        
        let matchesRole = false;
        if (selectedRoles.includes('Host') && isHost) matchesRole = true;
        if (selectedRoles.includes('Team Leader') && !isHost) matchesRole = true;
        
        if (!matchesRole) return false;
      }

      // 3. Tier Pay Filter
      if (selectedTiers.length > 0) {
        const tierPay = (host.tier_pay || host.tierPay || '').toLowerCase();
        const matchesTier = selectedTiers.some(t => tierPay.includes(t.toLowerCase().replace(' host', '')));
        if (!matchesTier) return false;
      }

      return true;
    });
  }, [hosts, searchTerm, selectedRoles, selectedTiers]);

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

        {/* Search Block */}
        <div className="relative w-full z-10">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400/50" size={16} />
          <input
            type="text"
            placeholder="Search Host ID or Nickname..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-3 bg-black/30 border border-white/10 rounded-xl text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500/50 focus:bg-black/50 transition-all w-full shadow-inner"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Role Checkboxes */}
          <div className="flex-1">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A]/50 mb-2 flex items-center gap-1.5"><Filter size={12}/> Role Filter</h3>
            <div className="flex flex-wrap gap-4">
              {['Host', 'Team Leader'].map(role => (
                <label key={role} className="flex items-center gap-2 cursor-pointer group">
                  <div className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                    selectedRoles.includes(role) ? "bg-indigo-500 border-indigo-500" : "bg-black/20 border-white/20 group-hover:border-white/40"
                  )}>
                    {selectedRoles.includes(role) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className={cn("text-xs font-bold transition-colors", selectedRoles.includes(role) ? "text-[#F0EFE8]" : "text-[#A09E9A] group-hover:text-[#F0EFE8]")}>{role}</span>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedRoles.includes(role)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedRoles(prev => [...prev, role]);
                      else setSelectedRoles(prev => prev.filter(r => r !== role));
                    }}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Tier Pay Blocks */}
          <div className="flex-[2]">
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
          <p className="text-xs text-[#A09E9A]/40 mt-1">Please select at least one role, tier, or enter a search term above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredHosts.map(host => {
            const tierPay = String(host.tier_pay || host.tierPay || 'N/A');
            const blockStyles = getTierBlockStyles(tierPay);
            return (
              <div
                key={host.id}
                onClick={() => openSpotlight(host)}
                className={cn(
                  "border rounded-2xl p-4 flex flex-col items-center text-center gap-2 cursor-pointer hover:bg-white/[0.02] transition-all hover:-translate-y-1 shadow-lg shadow-black/20 relative",
                  blockStyles.border,
                  blockStyles.bg
                )}
              >
                {/* Role badge top right absolute */}
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[8px] font-black uppercase tracking-wider shadow-sm">
                    {host.role || 'Host'}
                  </span>
                </div>

                <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-black/40 border border-white/10 flex-shrink-0 mt-2" style={{ aspectRatio: '1 / 1' }}>
                  {host.photoUrl ? (
                    <img src={host.photoUrl} alt="" className="w-full h-full object-cover" style={{ aspectRatio: '1 / 1', objectFit: 'cover' }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#A09E9A]/30">
                      <Users size={24} />
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center w-full px-1 min-w-0 mt-1">
                  <h3 className="text-[#F0EFE8] font-bold text-sm truncate w-full mb-0.5">
                    {host.nickname || host.name}
                  </h3>
                  <div className="text-[#A09E9A] text-[10px] font-mono mb-2">ID: {host.id}</div>

                  <div className="flex items-center justify-center gap-2 w-full">
                    {(() => {
                      const tier = String((host as any).tier_pay || host.tierPay || 'N/A');

                      const getTierStyle = (t: string) => {
                        const lower = t.toLowerCase();
                        if (lower.includes('star')) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
                        if (lower.includes('rocket')) return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30';
                        if (lower.includes('s idol')) return 'text-pink-500 bg-pink-500/10 border-pink-500/30';
                        if (lower.includes('esports')) return 'text-[#00f2fe] bg-[#00f2fe]/10 border-[#00f2fe]/30 shadow-[0_0_8px_rgba(0,242,254,0.4)]';
                        if (lower.includes('regular')) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
                        return 'text-[#A09E9A] bg-white/5 border-white/10';
                      };

                      return (
                        <div className={cn("flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-md border", getTierStyle(tier))}>
                          <Star size={10} />
                          {tier}
                        </div>
                      );
                    })()}
                    {host.status === 'Active' && (
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SPOTLIGHT MODAL */}
      {selectedHost && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 sm:pt-32 pb-8 px-4 sm:px-8 bg-black/80 backdrop-blur-sm overflow-hidden">
          <div className="bg-[#13131E] border border-white/10 rounded-3xl w-full max-w-3xl max-h-[calc(100vh-10rem)] sm:max-h-[calc(100vh-12rem)] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 to-transparent relative">

              <button
                onClick={closeSpotlight}
                title="Close Spotlight"
                aria-label="Close Spotlight"
                className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 rounded-xl hover:bg-white/10 text-[#A09E9A] hover:text-white transition-colors z-10 bg-black/20 sm:bg-transparent"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 w-full pt-6 sm:pt-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-black/40 border border-white/10 overflow-hidden shadow-xl shrink-0" style={{ aspectRatio: '1 / 1' }}>
                  {selectedHost.photoUrl ? (
                    <img src={selectedHost.photoUrl} alt="" className="w-full h-full object-cover" style={{ aspectRatio: '1 / 1', objectFit: 'cover' }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#A09E9A]/30">
                      <Users size={32} />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left pr-0 sm:pr-12 w-full">
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight break-all">{selectedHost.nickname || selectedHost.name}</h2>
                  <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-2">
                    <span className="font-mono text-indigo-400 text-xs sm:text-sm">{selectedHost.id}</span>
                    <span className="px-3 py-1 rounded-full bg-white/10 text-white/70 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                      {selectedHost.role || 'Host'}
                    </span>
                  </div>
                  {/* Social Links rendering */}
                  {selectedHost.social_links && (
                    <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 mt-3 sm:mt-4">
                      {selectedHost.social_links.fb && (
                        <a href={selectedHost.social_links.fb} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors" title="Facebook">
                          <Facebook size={16} />
                        </a>
                      )}
                      {selectedHost.social_links.ig && (
                        <a href={selectedHost.social_links.ig.startsWith('http') ? selectedHost.social_links.ig : `https://instagram.com/${selectedHost.social_links.ig.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 rounded-lg transition-colors" title="Instagram">
                          <Instagram size={16} />
                        </a>
                      )}
                      {selectedHost.social_links.tiktok && (
                        <a href={selectedHost.social_links.tiktok.startsWith('http') ? selectedHost.social_links.tiktok : `https://tiktok.com/@${selectedHost.social_links.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-[#00f2fe]/10 text-[#00f2fe] hover:bg-[#00f2fe]/20 rounded-lg transition-colors" title="TikTok">
                          <Music size={16} />
                        </a>
                      )}
                      {selectedHost.social_links.whatsapp && (
                        <a href={selectedHost.social_links.whatsapp.startsWith('http') ? selectedHost.social_links.whatsapp : `https://wa.me/${selectedHost.social_links.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-colors" title="WhatsApp">
                          <Phone size={16} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6 sm:space-y-8">

              {/* Bio Section */}
              {selectedHost.bio && (
                <div className="bg-[#11111A] border border-white/5 p-4 sm:p-5 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                  <p className="text-[#F0EFE8] text-sm leading-relaxed whitespace-pre-wrap italic">"{selectedHost.bio}"</p>
                </div>
              )}

              {/* Primary Info Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-[#1A1A28] border border-white/5 p-3 sm:p-4 rounded-2xl">
                  <div className="text-[9px] sm:text-[10px] font-black text-[#A09E9A] uppercase tracking-wider mb-1">Assigned Manager</div>
                  <div className="text-[#F0EFE8] font-bold text-xs sm:text-sm">{(selectedHost as any).assigned_manager_nickname || selectedHost.manager || 'N/A'}</div>
                </div>
                <div className="bg-[#1A1A28] border border-white/5 p-3 sm:p-4 rounded-2xl">
                  <div className="text-[9px] sm:text-[10px] font-black text-[#A09E9A] uppercase tracking-wider mb-1">Team Anchor</div>
                  <div className="text-[#F0EFE8] font-bold text-xs sm:text-sm">{(selectedHost as any).team_anchor || selectedHost.anchor_type || 'N/A'}</div>
                </div>
                <div className="bg-[#1A1A28] border border-white/5 p-3 sm:p-4 rounded-2xl">
                  <div className="text-[9px] sm:text-[10px] font-black text-[#A09E9A] uppercase tracking-wider mb-1">Status</div>
                  <div className={cn(
                    "font-bold text-xs sm:text-sm",
                    selectedHost.status === 'Active' ? 'text-emerald-400' : 'text-amber-400'
                  )}>
                    {selectedHost.status || 'Unknown'}
                  </div>
                </div>
                <div className="bg-[#1A1A28] border border-white/5 p-3 sm:p-4 rounded-2xl">
                  <div className="text-[9px] sm:text-[10px] font-black text-[#A09E9A] uppercase tracking-wider mb-1">Poppo Level</div>
                  <div className="text-white font-black text-lg sm:text-xl">{selectedHost.level || 0}</div>
                </div>
              </div>

              {/* Fanbase Metrics */}
              <div>
                <h3 className="text-xs sm:text-sm font-black text-[#F0EFE8] uppercase tracking-widest flex items-center gap-2 mb-3 sm:mb-4">
                  <Users className="text-pink-500" size={16} /> Fanbase Metrics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="bg-gradient-to-br from-pink-500/10 to-transparent border border-pink-500/20 p-3 sm:p-4 rounded-2xl flex flex-row sm:flex-col justify-between items-center sm:items-start">
                    <div className="text-xs text-pink-400 font-bold">Followers</div>
                    <div className="text-xl sm:text-2xl font-black text-white">{selectedHost.followers_count?.toLocaleString() || '0'}</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 p-3 sm:p-4 rounded-2xl flex flex-row sm:flex-col justify-between items-center sm:items-start">
                    <div className="text-xs text-purple-400 font-bold">FC Subscribers</div>
                    <div className="text-xl sm:text-2xl font-black text-white">{(selectedHost as any).fc_subscribers?.toLocaleString() || '0'}</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 p-3 sm:p-4 rounded-2xl flex flex-row sm:flex-col justify-between items-center sm:items-start">
                    <div className="text-xs text-blue-400 font-bold">FC Members</div>
                    <div className="text-xl sm:text-2xl font-black text-white">{(selectedHost as any).fc_members?.toLocaleString() || '0'}</div>
                  </div>
                </div>
              </div>

              {/* Streaming Hours */}
              {selectedHost.streaming_hours && selectedHost.streaming_hours.length > 0 && (
                <div>
                  <h3 className="text-sm font-black text-[#F0EFE8] uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Clock className="text-amber-500" size={16} /> Streaming Schedule
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {selectedHost.streaming_hours.map((slot, i) => (
                      <div key={i} className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                        <div className="text-xs font-bold text-[#F0EFE8]">{slot.from}</div>
                        <div className="text-[10px] text-amber-500/60 font-black my-0.5">TO</div>
                        <div className="text-xs font-bold text-[#F0EFE8]">{slot.to}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exposures & Awards Split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Exposures */}
                <div>
                  <h3 className="text-sm font-black text-[#F0EFE8] uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Target className="text-emerald-500" size={16} /> Exposures
                  </h3>
                  <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-4 min-h-[200px]">
                    {isSpotlightLoading ? (
                      <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-emerald-500/50" /></div>
                    ) : hostEvents.length > 0 ? (
                      <div className="space-y-3">
                        {hostEvents.map((evt, i) => (
                          <div key={i} className="bg-white/5 border border-white/10 p-3 rounded-xl">
                            <div className="flex justify-between items-start mb-1 gap-3">
                              <h4 className="font-bold text-[#F0EFE8] text-sm truncate">
                                {selectedHost.nickname || selectedHost.name} - {evt.eventTitle || evt.title || evt.eventType || evt.description || 'Event'}
                              </h4>
                              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 shrink-0">
                                {evt.status || 'Scheduled'}
                              </span>
                            </div>
                             <div className="text-xs text-[#A09E9A]">
                              {formatDateYYYYMMDD(evt.eventDate || evt.date || evt.startDate)} . {formatTimeslot(evt.timeslot || evt.time)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-[#A09E9A]/40 text-xs italic">
                        No upcoming or past events logged.
                      </div>
                    )}
                  </div>
                </div>

                {/* Badges & Awards */}
                <div>
                  <h3 className="text-sm font-black text-[#F0EFE8] uppercase tracking-widest flex items-center gap-2 mb-4">
                    <Trophy className="text-amber-500" size={16} /> Agency Badges & Awards
                  </h3>
                  <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-4 min-h-[200px]">
                    {isSpotlightLoading ? (
                      <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-amber-500/50" /></div>
                    ) : hostAwards.length > 0 ? (
                      <div className="flex flex-wrap gap-2.5">
                        {hostAwards.map((award: any, i: number) => {
                          const ICON_MAP: Record<string, string> = { trophy: '🏆', star: '⭐', medal: '🥇', crown: '👑', badge: '🎖️' };
                          const topNinerMatch = award.title?.match(/top\s*(\d+)\s*niner[s]?\s*(?:[-–|:]\s*)?(.+)?/i);

                          if (topNinerMatch) {
                            const rank = parseInt(topNinerMatch[1], 10);
                            if (rank <= 9) {
                              const dateStr = topNinerMatch[2] || (award.dateAwarded ? new Date(award.dateAwarded).getFullYear().toString() : 'Unknown Date');
                              
                              // Top 9 Niner Badge (Pure CSS matching leaderboard)
                              let bgStyle = '';
                              if (rank === 1) {
                                bgStyle = 'bg-gradient-to-r from-[#FFD700] via-[#F97316] to-[#EF4444] text-white border-transparent shadow-[0_0_12px_rgba(249,115,22,0.45)] drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.8)]';
                              } else if (rank === 2) {
                                bgStyle = 'bg-gradient-to-r from-[#facc15]/15 via-[#facc15]/4 to-[#1A1A28]/40 border-[#facc15]/35 text-[#facc15] shadow-md shadow-[#facc15]/5';
                              } else if (rank === 3) {
                                bgStyle = 'bg-gradient-to-r from-[#D4AF37]/15 via-[#D4AF37]/4 to-[#1A1A28]/40 border-[#D4AF37]/35 text-[#D4AF37] shadow-md shadow-[#D4AF37]/5';
                              } else if (rank === 4) {
                                bgStyle = 'bg-gradient-to-r from-[#fb923c]/15 via-[#fb923c]/4 to-[#1A1A28]/40 border-[#fb923c]/30 text-[#fb923c]';
                              } else if (rank === 5) {
                                bgStyle = 'bg-gradient-to-r from-[#f97316]/15 via-[#f97316]/4 to-[#1A1A28]/40 border-[#f97316]/30 text-[#f97316]';
                              } else if (rank === 6) {
                                bgStyle = 'bg-gradient-to-r from-[#ea580c]/15 via-[#ea580c]/4 to-[#1A1A28]/40 border-[#ea580c]/30 text-[#ea580c]';
                              } else if (rank === 7) {
                                bgStyle = 'bg-gradient-to-r from-[#f87171]/15 via-[#f87171]/4 to-[#1A1A28]/40 border-[#f87171]/30 text-[#f87171]';
                              } else if (rank === 8) {
                                bgStyle = 'bg-gradient-to-r from-[#ef4444]/15 via-[#ef4444]/4 to-[#1A1A28]/40 border-[#ef4444]/30 text-[#ef4444]';
                              } else if (rank === 9) {
                                bgStyle = 'bg-gradient-to-r from-[#dc2626]/15 via-[#dc2626]/4 to-[#1A1A28]/40 border-[#dc2626]/30 text-[#dc2626]';
                              }

                              return (
                                <div key={i} className={cn("relative group flex items-center justify-center rounded-xl px-4 py-0.5 h-[28px] cursor-pointer transition-transform hover:scale-105 border min-w-[110px]", bgStyle)}>
                                  <span className="font-black uppercase tracking-widest text-[10px] text-center px-1">
                                    {formatBadgeTitle(award.title || award.name || award.awardName || `Top ${rank} Niner`)}
                                  </span>
                                  {/* CSS Tooltip */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 bg-[#0F0F1A] border border-white/10 text-[#F0EFE8] text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap pointer-events-none z-[100] flex flex-col items-center gap-0.5">
                                    <span className="font-black text-[#D4AF37] uppercase tracking-widest text-[8px]">Monthly Honors</span>
                                    <span className="font-mono text-[#A09E9A]">{dateStr}</span>
                                    {award.description && <span className="text-[9px] font-normal text-white/60">{award.description}</span>}
                                  </div>
                                </div>
                              );
                            }
                          }

                          // Legacy Award Badge
                          return (
                            <div key={i} className="flex flex-col items-center gap-1.5 bg-[#0D0D14] border border-[#D4AF37]/15 rounded-xl p-3 w-[88px] text-center hover:border-[#D4AF37]/40 transition-all group relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#D4AF37]/50 to-transparent" />
                              <span className="text-2xl group-hover:scale-110 transition-transform inline-block mt-1">{ICON_MAP[award.iconType] || '🎖️'}</span>
                              <p className="text-[8px] font-black text-[#F0EFE8] leading-tight mt-1">{formatBadgeTitle(award.title || award.name || award.awardName)}</p>
                              {(award.dateAwarded || award.awardedAt) && (
                                <p className="text-[7px] text-[#A09E9A]/40 font-mono">{new Date(award.dateAwarded || award.awardedAt).getFullYear()}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-[#A09E9A]/40 text-xs italic">
                        No awards received yet.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

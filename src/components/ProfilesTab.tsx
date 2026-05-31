import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Loader2, Trophy, Star, Target, Users, LayoutGrid, X } from 'lucide-react';
import { FirebaseService } from '../lib/firebaseService';
import { cn } from '../lib/utils';
import { Host, EventsCalendarPublic, AgencyAward } from '../types';

interface ProfilesTabProps {
  isReadOnly?: boolean;
}

export const ProfilesTab: React.FC<ProfilesTabProps> = ({ isReadOnly = false }) => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [roleFilter, setRoleFilter] = useState<'All Members' | 'Show hosts' | 'Show team leaders'>('All Members');
  const [tierFilter, setTierFilter] = useState<string>('All Tiers');
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
        FirebaseService.getPublicCalendarEvents(),
        FirebaseService.getAwards ? FirebaseService.getAwards(host.id) : Promise.resolve([])
      ]);
      
      // Filter events where host might be involved
      // Note: Assuming events have a 'hostIds' or similar property, otherwise just showing recent
      const relatedEvents = events.filter(e => 
        (e.hostId && e.hostId === host.id) || 
        (e.title && e.title.includes(host.nickname || host.name))
      );
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
    return hosts.filter(host => {
      // 1. Search Filter
      const searchStr = searchTerm.toLowerCase();
      const hostName = (host.nickname || host.name || '').toLowerCase();
      const hostIdStr = String(host.id || '');
      const matchesSearch = hostName.includes(searchStr) || hostIdStr.includes(searchStr);
      if (!matchesSearch) return false;

      // 2. Role Filter
      const roleStr = (host.role || '').toLowerCase();
      if (roleFilter === 'Show hosts' && roleStr !== 'host') return false;
      if (roleFilter === 'Show team leaders' && roleStr === 'host') return false;

      // 3. Tier Pay Filter
      if (tierFilter !== 'All Tiers') {
        const tierPay = (host.tier_pay || host.base_salary_category || host.baseSalary || '').toLowerCase();
        if (tierPay !== tierFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [hosts, searchTerm, roleFilter, tierFilter]);

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#1A1A28] p-4 rounded-2xl border border-white/5 sticky top-0 z-10">
        
        {/* Search Block */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A09E9A]/50" size={16} />
          <input
            type="text"
            placeholder="Search Host ID or Nickname..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 bg-black/20 border border-white/10 rounded-xl text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500/50 w-full"
          />
        </div>

        {/* Role Filter Block */}
        <div className="relative w-full">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A09E9A]/50" size={16} />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            title="Filter by Role"
            aria-label="Filter by Role"
            className="pl-9 pr-4 py-2 bg-black/20 border border-white/10 rounded-xl text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500/50 w-full appearance-none"
          >
            <option value="All Members">All Members</option>
            <option value="Show hosts">Show hosts</option>
            <option value="Show team leaders">Show team leaders</option>
          </select>
        </div>

        {/* Tier Pay Filter Block */}
        <div className="relative w-full">
          <Star className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A09E9A]/50" size={16} />
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            title="Filter by Tier"
            aria-label="Filter by Tier"
            className="pl-9 pr-4 py-2 bg-black/20 border border-white/10 rounded-xl text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500/50 w-full appearance-none"
          >
            <option value="All Tiers">All Tiers</option>
            <option value="Star Host">Star Host</option>
            <option value="Rocket Host">Rocket Host</option>
            <option value="S idol">S idol</option>
            <option value="Esports">Esports</option>
            <option value="Influencer">Influencer</option>
            <option value="Regular Host">Regular Host</option>
          </select>
        </div>
      </div>

      <div className="flex justify-between items-center px-2">
        <h2 className="text-[#F0EFE8] font-black text-lg tracking-wider flex items-center gap-2">
          <LayoutGrid className="text-indigo-500" size={20} />
          ROSTER DIRECTORY
        </h2>
        <span className="text-[#A09E9A] text-xs font-mono">{filteredHosts.length} profiles found</span>
      </div>

      {/* 2-BLOCK PER ROW GRID UNDER THE FILTERS */}
      {filteredHosts.length === 0 ? (
        <div className="py-20 text-center text-[#A09E9A]/40">
          No hosts match the selected filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHosts.map(host => (
            <div
              key={host.id}
              onClick={() => openSpotlight(host)}
              className="bg-[#1A1A28] border border-white/5 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-white/[0.02] hover:border-indigo-500/30 transition-all hover:scale-[1.01] shadow-lg shadow-black/20"
            >
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-black/40 border border-white/10 flex-shrink-0">
                {host.photoUrl ? (
                  <img src={host.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#A09E9A]/30">
                    <Users size={24} />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[#F0EFE8] font-bold text-lg truncate">
                    {host.nickname || host.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-wider">
                    {host.role || 'Host'}
                  </span>
                </div>
                <div className="text-[#A09E9A] text-xs font-mono">ID: {host.id}</div>
                
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[10px] text-amber-400 font-bold bg-amber-400/10 px-2 py-1 rounded-md border border-amber-400/20">
                    <Star size={10} />
                    {(host as any).tier_pay || host.base_salary_category || host.baseSalary || 'N/A'}
                  </div>
                  {host.status === 'Active' && (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SPOTLIGHT MODAL */}
      {selectedHost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#13131E] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-start bg-gradient-to-r from-indigo-500/10 to-transparent">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-black/40 border border-white/10 overflow-hidden shadow-xl">
                  {selectedHost.photoUrl ? (
                    <img src={selectedHost.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#A09E9A]/30">
                      <Users size={32} />
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white tracking-tight">{selectedHost.nickname || selectedHost.name}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="font-mono text-indigo-400 text-sm">{selectedHost.id}</span>
                    <span className="px-3 py-1 rounded-full bg-white/10 text-white/70 text-xs font-bold uppercase tracking-wider">
                      {selectedHost.role || 'Host'}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={closeSpotlight}
                title="Close Spotlight"
                aria-label="Close Spotlight"
                className="p-2 rounded-xl hover:bg-white/10 text-[#A09E9A] hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
              
              {/* Primary Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#1A1A28] border border-white/5 p-4 rounded-2xl">
                  <div className="text-[10px] font-black text-[#A09E9A] uppercase tracking-wider mb-1">Assigned Manager</div>
                  <div className="text-[#F0EFE8] font-bold text-sm">{(selectedHost as any).assigned_manager_nickname || selectedHost.manager || 'N/A'}</div>
                </div>
                <div className="bg-[#1A1A28] border border-white/5 p-4 rounded-2xl">
                  <div className="text-[10px] font-black text-[#A09E9A] uppercase tracking-wider mb-1">Team Anchor</div>
                  <div className="text-[#F0EFE8] font-bold text-sm">{(selectedHost as any).team_anchor || selectedHost.anchor_type || 'N/A'}</div>
                </div>
                <div className="bg-[#1A1A28] border border-white/5 p-4 rounded-2xl">
                  <div className="text-[10px] font-black text-[#A09E9A] uppercase tracking-wider mb-1">Status</div>
                  <div className={cn(
                    "font-bold text-sm",
                    selectedHost.status === 'Active' ? 'text-emerald-400' : 'text-amber-400'
                  )}>
                    {selectedHost.status || 'Unknown'}
                  </div>
                </div>
                <div className="bg-[#1A1A28] border border-white/5 p-4 rounded-2xl">
                  <div className="text-[10px] font-black text-[#A09E9A] uppercase tracking-wider mb-1">Poppo Level</div>
                  <div className="text-white font-black text-xl">{selectedHost.level || 0}</div>
                </div>
              </div>

              {/* Fanbase Metrics */}
              <div>
                <h3 className="text-sm font-black text-[#F0EFE8] uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Users className="text-pink-500" size={16} /> Fanbase Metrics
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-pink-500/10 to-transparent border border-pink-500/20 p-4 rounded-2xl">
                    <div className="text-xs text-pink-400 font-bold mb-1">Followers</div>
                    <div className="text-2xl font-black text-white">{selectedHost.followers_count?.toLocaleString() || '0'}</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 p-4 rounded-2xl">
                    <div className="text-xs text-purple-400 font-bold mb-1">FC Subscribers</div>
                    <div className="text-2xl font-black text-white">{(selectedHost as any).fc_subscribers?.toLocaleString() || '0'}</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 p-4 rounded-2xl">
                    <div className="text-xs text-blue-400 font-bold mb-1">FC Members</div>
                    <div className="text-2xl font-black text-white">{(selectedHost as any).fc_members?.toLocaleString() || '0'}</div>
                  </div>
                </div>
              </div>

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
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-bold text-[#F0EFE8] text-sm">{evt.title}</h4>
                              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">{evt.status}</span>
                            </div>
                            <div className="text-xs text-[#A09E9A]">{new Date(evt.startDate).toLocaleDateString()} - {evt.type}</div>
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
                      <div className="flex flex-wrap gap-3">
                        {hostAwards.map((award, i) => (
                          <div key={i} className="flex flex-col items-center gap-2 bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/20 p-3 rounded-xl w-[100px] text-center">
                            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/40">
                              <Trophy size={20} className="text-amber-400" />
                            </div>
                            <div className="text-[10px] font-bold text-amber-100 leading-tight">
                              {award.title}
                            </div>
                            <div className="text-[9px] font-mono text-amber-500/50">
                              {new Date(award.awardedAt).getFullYear()}
                            </div>
                          </div>
                        ))}
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

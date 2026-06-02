import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Loader2, Star, Users, LayoutGrid } from 'lucide-react';
import { FirebaseService } from '../lib/firebaseService';
import { Host } from '../types';
import { HostProfileView } from './HostProfileView';

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

  useEffect(() => {
    fetchUsers();
  }, []);

  const openSpotlight = (host: Host) => {
    setSelectedHost(host);
  };

  const closeSpotlight = () => {
    setSelectedHost(null);
  };

  const handleProfileUpdated = async () => {
    try {
      const users = await FirebaseService.getAllRoleMetadata();
      const updatedHosts = users.map(u => ({ ...u, id: u.poppo_id || u.poppoId || u.id } as Host));
      setHosts(updatedHosts);
      if (selectedHost) {
        const updated = updatedHosts.find(h => h.id === selectedHost.id);
        if (updated) {
          setSelectedHost(updated);
        }
      }
    } catch (err) {
      console.error("Failed to refresh users after profile update:", err);
    }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <HostProfileView 
            host={selectedHost} 
            isReadOnly={isReadOnly} 
            onClose={closeSpotlight} 
            onProfileUpdated={handleProfileUpdated}
          />
        </div>
      )}
    </div>
  );
};

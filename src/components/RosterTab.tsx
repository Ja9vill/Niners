/* eslint-disable */
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Shield, X, TrendingUp, Users } from 'lucide-react';
import { Host, Role, BaseSalaryTier, HostStatus, AnchorType, Tier } from '../types';
import { Storage } from '../lib/storage';
import { FirebaseService } from '../lib/firebaseService';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { HostProfileView } from './HostProfileView';

export const RosterTab = () => {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'talent' | 'leader'>('all');
  const [activePolicyFilters, setActivePolicyFilters] = useState<string[]>([]);
  const [spotlightHost, setSpotlightHost] = useState<Host | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Host | 'role'; direction: 'asc' | 'desc' } | null>(null);
  const auth = Storage.getAuthState();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await FirebaseService.getAllHosts();
        setHosts(data);
      } catch (err) {
        console.error("Failed to load roster:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();

    const handleDataUpdate = () => {
      load();
    };

    window.addEventListener('data-updated', handleDataUpdate);
    return () => window.removeEventListener('data-updated', handleDataUpdate);
  }, []);

  const togglePolicyFilter = (policy: string) => {
    if (activePolicyFilters.includes(policy)) {
      setActivePolicyFilters(activePolicyFilters.filter(p => p !== policy));
    } else {
      setActivePolicyFilters([...activePolicyFilters, policy]);
    }
  };

  const leadership = useMemo(() => {
    return hosts.filter(h => h.role && h.role !== 'Talent');
  }, [hosts]);

  const filteredHosts = useMemo(() => {
    return hosts.filter(h => 
      h.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      h.id.includes(searchTerm) ||
      (h.nickname && h.nickname.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [hosts, searchTerm]);
  

  const talents = useMemo(() => {
    return filteredHosts.filter(h => {
      const isTalent = h.role === 'Talent';
      const isTeamLeader = h.role !== 'Talent';
      
      // Role filter dropdown (Public/Global Roster filters)
      if (roleFilter === 'talent' && !isTalent) return false;
      if (roleFilter === 'leader' && !isTeamLeader) return false;
      
      if (activePolicyFilters.length > 0) {
        const matchesPolicy = activePolicyFilters.some(policy => {
          if (policy === 'Esports') {
            return h.base_salary_category === 'ESport Host';
          }
          if (policy === 'Regular Host') {
            return h.base_salary_category === 'Regular Host' || h.base_salary_category === 'N/A' || !h.base_salary_category;
          }
          return h.base_salary_category === policy;
        });
        if (!matchesPolicy) return false;
      }
      return true;
    });
  }, [filteredHosts, roleFilter, activePolicyFilters]);

  const handleSort = (key: keyof Host | 'role') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

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

  if (isLoading) return <div className="p-20 text-center text-[#A09E9A]/40 italic">Loading Roster MasterSheet...</div>;

  return (
    <div className="space-y-8">
      {/* Top Header for Public View */}
      {auth.level === 0 && (
        <div className="border-b border-t border-white/5 py-3 flex items-center justify-between px-2">
          <span className="text-xs font-black tracking-[0.25em] text-[#A09E9A]/50">NINERS APP</span>
        </div>
      )}

      {/* Leadership Section */}
      {leadership.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#A09E9A] flex items-center gap-2">
            <Shield size={14} className="text-indigo-400" />
            Leadership & Administration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {leadership.map(m => (
              <div key={m.id} className="glass-card !p-4 flex items-center gap-4 group bg-[#1A1A28] border border-white/5 hover:border-[#D4AF37]/30 hover:border-indigo-500/20 transition-all duration-300">
                <div className="w-10 h-10 rounded bg-[#0D0D14] flex items-center justify-center font-bold text-[#A09E9A] overflow-hidden shrink-0 border border-white/5">
                  {m.photoUrl ? (
                    <img src={m.photoUrl} alt={m.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    m.name?.[0] || '?'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[#F0EFE8] truncate text-sm">{m.name}</h4>
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
      <section className="glass-card !p-0 overflow-hidden bg-[#13131E] border border-white/5 shadow-2xl">
        
        {/* Roster Subtitle and Title area */}
        <div className="px-6 py-5 border-b border-white/5 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[#F0EFE8]">
            <Users className="text-[#D4AF37] w-5 h-5" />
            <h3 className="text-sm font-black uppercase tracking-widest">ROSTER</h3>
          </div>
          <p className="text-[#A09E9A]/30 text-[10px] uppercase font-bold tracking-wider">Public Talent Directory</p>
        </div>

        {/* Filter Toolbar matching wireframe */}
        <div className="px-6 py-4 border-b border-white/5 flex flex-col xl:flex-row items-center gap-4 justify-between bg-[#1A1A28]/20">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5 w-full xl:w-auto">
            {/* Search Input */}
            <div className="relative w-full md:w-60">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A09E9A]" />
              <input 
                type="text" 
                placeholder="Search by ID or Nickname..." 
                className="w-full bg-[#0D0D14] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none text-[#F0EFE8] transition-all placeholder-white/20" 
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
                  className="bg-[#0D0D14] border border-white/10 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-[#F0EFE8] outline-none focus:ring-1 focus:ring-[#D4AF37] cursor-pointer appearance-none font-sans"
                >
                  <option value="all" className="bg-[#0f1117]">All Roles</option>
                  <option value="talent" className="bg-[#0f1117]">Talents Only</option>
                  <option value="leader" className="bg-[#0f1117]">Team Leaders Only</option>
                </select>
                <div className="absolute right-2.5 pointer-events-none text-[#A09E9A]/40 flex items-center">
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
                  className="bg-[#0D0D14] border border-white/10 rounded-xl pl-3 pr-8 py-2 text-xs font-bold text-[#F0EFE8] outline-none focus:ring-1 focus:ring-[#D4AF37] cursor-pointer appearance-none font-sans"
                >
                  <option value="id_asc" className="bg-[#0f1117]">ID (Asc)</option>
                  <option value="id_desc" className="bg-[#0f1117]">ID (Desc)</option>
                  <option value="nickname_asc" className="bg-[#0f1117]">Name (A-Z)</option>
                  <option value="nickname_desc" className="bg-[#0f1117]">Name (Z-A)</option>
                  <option value="role_asc" className="bg-[#0f1117]">Role (A-Z)</option>
                  <option value="role_desc" className="bg-[#0f1117]">Role (Z-A)</option>
                  <option value="status_asc" className="bg-[#0f1117]">Status (A-Z)</option>
                  <option value="status_desc" className="bg-[#0f1117]">Status (Z-A)</option>
                  <option value="level_desc" className="bg-[#0f1117]">Level (Highest)</option>
                </select>
                <div className="absolute right-2.5 pointer-events-none text-[#A09E9A]/40 flex items-center">
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
                    ? "bg-yellow-500/10 border-yellow-500/50 text-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.15)]"
                    : "bg-[#1A1A28] border-white/5 text-[#A09E9A]/60 hover:text-[#F0EFE8] hover:bg-[#222235]"
                )}
              >
                Star Host
              </button>
              <button 
                onClick={() => togglePolicyFilter('Rocket Host')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border cursor-pointer",
                  activePolicyFilters.includes('Rocket Host')
                    ? "bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                    : "bg-[#1A1A28] border-white/5 text-[#A09E9A]/60 hover:text-[#F0EFE8] hover:bg-[#222235]"
                )}
              >
                Rocket Host
              </button>
              <button 
                onClick={() => togglePolicyFilter('S idol')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border cursor-pointer",
                  activePolicyFilters.includes('S idol')
                    ? "bg-pink-500/10 border-pink-500/50 text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.15)]"
                    : "bg-[#1A1A28] border-white/5 text-[#A09E9A]/60 hover:text-[#F0EFE8] hover:bg-[#222235]"
                )}
              >
                S idol
              </button>
              <button 
                onClick={() => togglePolicyFilter('Esports')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border cursor-pointer",
                  activePolicyFilters.includes('Esports')
                    ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                    : "bg-[#1A1A28] border-white/5 text-[#A09E9A]/60 hover:text-[#F0EFE8] hover:bg-[#222235]"
                )}
              >
                Esports
              </button>
              <button 
                onClick={() => togglePolicyFilter('Regular Host')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border cursor-pointer",
                  activePolicyFilters.includes('Regular Host')
                    ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                    : "bg-[#1A1A28] border-white/5 text-[#A09E9A]/60 hover:text-[#F0EFE8] hover:bg-[#222235]"
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
                <tr className="text-[10px] font-black text-[#A09E9A]/30 uppercase tracking-[0.2em] border-b border-white/5">
                  <th className="px-6 py-5 cursor-pointer hover:text-[#F0EFE8] transition-colors" onClick={() => handleSort('status')}>Status</th>
                  <th className="px-6 py-5 cursor-pointer hover:text-[#F0EFE8] transition-colors" onClick={() => handleSort('nickname')}>Talent Profile</th>
                  <th className="px-6 py-5 cursor-pointer hover:text-[#F0EFE8] transition-colors" onClick={() => handleSort('role')}>Role</th>
                  <th className="px-6 py-5 cursor-pointer hover:text-[#F0EFE8] transition-colors" onClick={() => handleSort('team')}>Team</th>
                  <th className="px-6 py-5 cursor-pointer hover:text-[#F0EFE8] transition-colors" onClick={() => handleSort('base_salary_category')}>Base Policy</th>
                  <th className="px-6 py-5 cursor-pointer hover:text-[#F0EFE8] transition-colors" onClick={() => handleSort('manager')}>Management</th>
                </tr>
              ) : (
                <tr className="text-[10px] font-black text-[#A09E9A]/30 uppercase tracking-[0.2em] border-b border-white/5">
                  <th className="px-6 py-5 cursor-pointer hover:text-[#F0EFE8] transition-colors" onClick={() => handleSort('id')}>Poppo ID</th>
                  <th className="px-6 py-5 cursor-pointer hover:text-[#F0EFE8] transition-colors" onClick={() => handleSort('nickname')}>Nickname</th>
                  <th className="px-6 py-5 cursor-pointer hover:text-[#F0EFE8] transition-colors" onClick={() => handleSort('role')}>Role</th>
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
                        host.status === 'Released' ? "bg-red-500/10 text-red-500" : "bg-[#1A1A28] text-[#A09E9A]/40"
                      )}>{host.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#0D0D14] flex items-center justify-center font-black text-[#A09E9A]/20 overflow-hidden shrink-0 border border-white/5 shadow-inner">
                          {host.photoUrl ? (
                            <img src={host.photoUrl} alt={host.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            host.nickname?.[0] || '?'
                          )}
                        </div>
                        <div>
                          <div className="font-black text-[#F0EFE8] text-sm tracking-tight group-hover:text-[#D4AF37] transition-colors">{host.nickname}</div>
                          <div className="text-[10px] font-mono text-[#A09E9A]/40 tracking-tighter">ID: {host.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold text-[#A09E9A]/60 uppercase tracking-widest">{host.role}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/10">
                        {host.team || 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black text-[#F0EFE8]/70 tracking-widest uppercase">
                        {host.base_salary_category || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                        <span className="text-xs font-bold text-[#A09E9A]/60">{host.manager}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // Public simplified row matching Image 4
                  <tr key={host.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => setSpotlightHost(host)}>
                    <td className="px-6 py-5 font-mono text-sm text-[#D4AF37] font-semibold">{host.id}</td>
                    <td className="px-6 py-5 font-bold text-[#F0EFE8] group-hover:text-[#D4AF37] transition-colors">{host.nickname || host.name}</td>
                    <td className="px-6 py-5 text-[#A09E9A]/60 text-xs font-medium">
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
                    <div className="w-12 h-12 rounded-xl bg-[#0D0D14] flex items-center justify-center font-black text-[#A09E9A]/20 overflow-hidden border border-white/5 shadow-inner">
                      {host.photoUrl ? (
                        <img src={host.photoUrl} alt={host.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        host.nickname?.[0] || '?'
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-[#F0EFE8] text-base tracking-tight group-hover:text-[#D4AF37] transition-colors">{host.nickname}</h4>
                      <p className="text-[10px] font-mono text-[#A09E9A]/45">ID: {host.id}</p>
                    </div>
                  </div>
                  <span className={cn("px-2 py-0.5 rounded text-[8px] uppercase font-black tracking-widest",
                    host.status === 'Active' ? "bg-emerald-500/10 text-emerald-500" :
                    host.status === 'Inconsistent' ? "bg-amber-500/10 text-amber-500" :
                    host.status === 'Released' ? "bg-red-500/10 text-red-500" : "bg-[#1A1A28] text-[#A09E9A]/40"
                  )}>{host.status}</span>
                </div>

                <div className="grid grid-cols-2 gap-y-3 text-[10px]">
                  <div className="space-y-1">
                    <p className="text-[#A09E9A]/40 uppercase tracking-widest font-bold font-mono">Role</p>
                    <p className="text-[#F0EFE8] font-bold">{host.role}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[#A09E9A]/40 uppercase tracking-widest font-bold font-mono">Team</p>
                    <p className="text-indigo-400 font-bold">{host.team || 'Unassigned'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[#A09E9A]/40 uppercase tracking-widest font-bold font-mono">Management</p>
                    <p className="text-[#F0EFE8] font-bold">{host.manager}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[#A09E9A]/40 uppercase tracking-widest font-bold font-mono">Policy</p>
                    <p className="text-[#F0EFE8] font-bold">{host.base_salary_category || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ) : (
              // Public simplified card matching Image 4
              <div 
                key={host.id} 
                onClick={() => setSpotlightHost(host)}
                className="bg-[#1A1A28] border border-white/5 rounded-xl p-4 flex items-center justify-between hover:border-[#D4AF37]/45 hover:bg-[#222235]/40 transition-all cursor-pointer"
              >
                <div>
                  <h4 className="font-bold text-[#F0EFE8] text-sm tracking-tight">{host.nickname || host.name}</h4>
                  <p className="text-[10px] font-mono text-[#D4AF37] font-semibold mt-0.5">ID: {host.id}</p>
                </div>
                <span className="text-[10px] font-bold text-[#A09E9A]/60 uppercase">
                  {host.role === 'Talent' ? 'Host' : host.role}
                </span>
              </div>
            )
          ))}
        </div>
      </section>

      {/* Public Spotlight Modal mapping Image 4 / 5 */}
      <AnimatePresence>
        {spotlightHost && (
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
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

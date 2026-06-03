import React, { useState, useMemo } from 'react';
import { Host, HostStatus, Role } from '../types';
import { Search, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { FirebaseService } from '../lib/firebaseService';
import { cn, formatDate } from '../lib/utils';

interface RosterManagementTabProps {
  hosts: Host[];
  onUpdate: () => void;
  auditLogAction: (actionType: string, beforeValue: any, afterValue: any) => Promise<void>;
}

export const RosterManagementTab: React.FC<RosterManagementTabProps> = ({ hosts, onUpdate, auditLogAction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  
  // Local state for edits
  const [editedHosts, setEditedHosts] = useState<Record<string, Partial<Host>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Managers/Agents list for the 'Assigned Manager' dropdown
  const managerOptions = useMemo(() => {
    return hosts
      .filter(h => h && (h.role === 'Manager' || h.role === 'Agent'))
      .map(h => ({ id: h.id, name: h.nickname || h.name || h.id || '' }));
  }, [hosts]);

  // Filter out Directors and apply search/role filters
  const filteredHosts = useMemo(() => {
    return hosts.filter(h => {
      if (!h) return false;
      const roleStr = String(h.role || '').toLowerCase();
      if (roleStr === 'director') return false;
      
      const nickname = String(h.nickname || h.name || '').toLowerCase();
      const name = String(h.name || '').toLowerCase();
      const poppoId = String(h.id || '');
      const search = searchTerm.toLowerCase();
      
      const matchesSearch = nickname.includes(search) || 
                            name.includes(search) ||
                            poppoId.includes(searchTerm);
      
      const matchesRole = roleFilter === 'All' || h.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [hosts, searchTerm, roleFilter]);

  const handleFieldChange = (hostId: string, field: keyof Host, value: any) => {
    setEditedHosts(prev => ({
      ...prev,
      [hostId]: {
        ...(prev[hostId] || {}),
        [field]: value
      }
    }));
  };

  const handleSaveChanges = async () => {
    const hostIdsToUpdate = Object.keys(editedHosts);
    if (hostIdsToUpdate.length === 0) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const updatedHostsList: Host[] = [];
      for (const id of hostIdsToUpdate) {
        const original = hosts.find(h => h.id === id);
        if (original) {
          const updatedHost = { 
            ...original, 
            ...editedHosts[id],
            updated_at: new Date().toISOString()
          };
          updatedHostsList.push(updatedHost);
          
          await auditLogAction('UPDATE_ROSTER_MEMBER', original, updatedHost);
        }
      }

      await FirebaseService.saveHosts(updatedHostsList);
      
      setEditedHosts({});
      setSaveSuccess(true);
      onUpdate();
      
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving roster updates:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const getDisplayValue = (host: Host, field: keyof Host) => {
    return editedHosts[host.id]?.[field] !== undefined 
      ? editedHosts[host.id]![field] 
      : host[field];
  };

  const hasUnsavedChanges = Object.keys(editedHosts).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1A1A28] p-4 rounded-2xl border border-white/5">
        <div className="flex flex-wrap gap-4 w-full sm:w-auto">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A09E9A]/50" size={16} />
            <input
              type="text"
              placeholder="Search by ID or Nickname..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-black/20 border border-white/10 rounded-xl text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500/50 w-full sm:w-64"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500/50"
          >
            <option value="All">All Roles</option>
            <option value="Talent">Talent</option>
            <option value="Manager">Manager</option>
            <option value="Agent">Agent</option>
            <option value="Admin">Admin</option>
            <option value="Head Admin">Head Admin</option>
          </select>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {saveSuccess && (
            <span className="text-emerald-400 text-xs font-bold flex items-center gap-1 animate-pulse">
              <CheckCircle2 size={14} /> Saved!
            </span>
          )}
          <button
            onClick={handleSaveChanges}
            disabled={!hasUnsavedChanges || isSaving}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all",
              hasUnsavedChanges
                ? "bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer"
                : "bg-white/5 text-[#A09E9A]/50 cursor-not-allowed"
            )}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="tech-card !p-0 overflow-hidden relative">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap min-w-max">
            <thead className="bg-[#13131E] border-b border-white/5 sticky top-0 z-20">
              <tr className="text-[10px] font-black text-[#A09E9A]/60 uppercase tracking-[0.1em]">
                <th className="px-6 py-4 sticky left-0 z-30 bg-[#1A1A28] border-r border-white/5 shadow-[4px_0_10px_rgba(0,0,0,0.2)]">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Team Anchor</th>
                <th className="px-6 py-4">Tier / Pay</th>
                <th className="px-6 py-4">Assigned Manager</th>
                <th className="px-6 py-4">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredHosts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#A09E9A]/30 italic text-xs">
                    No users found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredHosts.map(host => {
                  const isTalent = getDisplayValue(host, 'role') === 'Talent' || getDisplayValue(host, 'role') === 'host';
                  const isEdited = !!editedHosts[host.id];
                  
                  return (
                    <tr key={host.id} className={cn(
                      "transition-colors",
                      isEdited ? "bg-indigo-500/[0.03]" : "hover:bg-white/[0.02]"
                    )}>
                      <td className="px-6 py-3 sticky left-0 z-10 bg-[#1A1A28] border-r border-white/5 shadow-[4px_0_10px_rgba(0,0,0,0.2)]">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#F0EFE8]">{host.nickname || host.name}</span>
                          <span className="text-[#A09E9A]/40 font-normal">-</span>
                          <span className="font-mono text-[10px] text-indigo-400 font-semibold">{host.id}</span>
                        </div>
                      </td>

                      <td className="px-6 py-3">
                        <select
                          value={getDisplayValue(host, 'role') as string}
                          onChange={(e) => handleFieldChange(host.id, 'role', e.target.value)}
                          className="bg-transparent border border-transparent hover:border-white/10 focus:border-indigo-500 rounded px-2 py-1 outline-none text-[#F0EFE8]"
                        >
                          {['Talent', 'Manager', 'Agent', 'Admin', 'Head Admin'].map(r => (
                            <option key={r} value={r} className="bg-[#1A1A28]">{r}</option>
                          ))}
                        </select>
                      </td>

                      <td className="px-6 py-3">
                        <select
                          value={getDisplayValue(host, 'status') as string}
                          onChange={(e) => handleFieldChange(host.id, 'status', e.target.value)}
                          className={cn(
                            "bg-transparent border border-transparent hover:border-white/10 focus:border-indigo-500 rounded px-2 py-1 outline-none font-bold",
                            getDisplayValue(host, 'status') === 'Active' ? 'text-emerald-400' :
                            getDisplayValue(host, 'status') === 'Inconsistent' ? 'text-amber-400' :
                            getDisplayValue(host, 'status') === 'Releasing' ? 'text-orange-400' :
                            'text-red-400'
                          )}
                        >
                          {['Active', 'Inconsistent', 'Inactive', 'Releasing', 'Released'].map(s => (
                            <option key={s} value={s} className="bg-[#1A1A28]">{s}</option>
                          ))}
                        </select>
                      </td>

                      <td className="px-6 py-3">
                        <div className="flex flex-col gap-1">
                          <select
                            value={getDisplayValue(host, 'anchor_type') as string}
                            onChange={(e) => handleFieldChange(host.id, 'anchor_type', e.target.value)}
                            className="bg-transparent border border-transparent hover:border-white/10 focus:border-indigo-500 rounded px-2 py-1 outline-none text-[#A09E9A]"
                          >
                            <option value="Nine Agency" className="bg-[#1A1A28]">Nine Agency</option>
                            <option value="Sub Agency" className="bg-[#1A1A28]">Sub Agency</option>
                            <option value="External" className="bg-[#1A1A28]">External</option>
                          </select>
                          <input
                            type="text"
                            value={getDisplayValue(host, 'team') as string}
                            onChange={(e) => handleFieldChange(host.id, 'team', e.target.value)}
                            className="bg-transparent border border-transparent hover:border-white/10 focus:border-indigo-500 rounded px-2 py-1 outline-none text-[#F0EFE8] w-32"
                            placeholder="Team Name"
                          />
                        </div>
                      </td>

                      <td className="px-6 py-3">
                        <div className="flex flex-col gap-1">
                          <select
                            value={getDisplayValue(host, 'tier') as string}
                            onChange={(e) => handleFieldChange(host.id, 'tier', e.target.value)}
                            className="bg-transparent border border-transparent hover:border-white/10 focus:border-indigo-500 rounded px-2 py-1 outline-none text-[#D4AF37] font-bold w-16"
                          >
                            {['S', 'A', 'B', 'C', 'X'].map(t => (
                              <option key={t} value={t} className="bg-[#1A1A28]">Tier {t}</option>
                            ))}
                          </select>
                          <select
                            value={getDisplayValue(host, 'base_salary_category') as string}
                            onChange={(e) => handleFieldChange(host.id, 'base_salary_category', e.target.value)}
                            className="bg-transparent border border-transparent hover:border-white/10 focus:border-indigo-500 rounded px-2 py-1 outline-none text-[#A09E9A] text-[10px]"
                          >
                            <option value="N/A" className="bg-[#1A1A28]">N/A</option>
                            <option value="Rocket Host" className="bg-[#1A1A28]">Rocket Host</option>
                            <option value="Star Host" className="bg-[#1A1A28]">Star Host</option>
                            <option value="S idol" className="bg-[#1A1A28]">S idol</option>
                            <option value="ESport Host" className="bg-[#1A1A28]">ESport Host</option>
                            <option value="Regular Host" className="bg-[#1A1A28]">Regular Host</option>
                          </select>
                        </div>
                      </td>

                      <td className="px-6 py-3">
                        {isTalent ? (
                          <select
                            value={getDisplayValue(host, 'manager') as string}
                            onChange={(e) => handleFieldChange(host.id, 'manager', e.target.value)}
                            className="bg-transparent border border-transparent hover:border-white/10 focus:border-indigo-500 rounded px-2 py-1 outline-none text-[#F0EFE8] max-w-[150px]"
                          >
                            <option value="Nine Management" className="bg-[#1A1A28]">Nine Management</option>
                            {managerOptions.map(m => (
                              <option key={m.id} value={m.name} className="bg-[#1A1A28]">{m.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[#A09E9A]/40 text-[10px] px-2 italic">Not Applicable</span>
                        )}
                      </td>

                      <td className="px-6 py-3 text-[#A09E9A]/50 font-mono text-[10px]">
                        {formatDate(host.updated_at || host.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

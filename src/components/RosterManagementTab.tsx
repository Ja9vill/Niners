/* eslint-disable */
import React, { useState, useMemo, useEffect } from 'react';
import { Loader2, Save, Search, UserCircle, CheckCircle2, Database, UploadCloud, X, Camera } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { FirebaseService } from '../lib/firebaseService';
import { Storage } from '../lib/storage';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Host } from '../types';

const HOSTS_DATA = [
  { id: "14129568", name: "Alli", role: "Host" },
  { id: "2934176", name: "Allyy", role: "Host" },
  { id: "62652388", name: "Amitzuke", role: "Host" },
  { id: "26645601", name: "Angel", role: "Host" },
  { id: "66988219", name: "Angel.", role: "Host" },
  { id: "43798318", name: "Anjie", role: "Host" },
  { id: "9616469", name: "April", role: "Host" },
  { id: "41339005", name: "Arnel", role: "Host" },
  { id: "4498750", name: "Boyeet", role: "Host" },
  { id: "26744344", name: "Denj", role: "Host" },
  { id: "2716708", name: "Dhal", role: "Host" },
  { id: "20901441", name: "Erich", role: "Host" },
  { id: "23500951", name: "Gelica", role: "Host" },
  { id: "2886088", name: "Gracia", role: "Host" },
  { id: "726356", name: "HoneyLou", role: "Host" },
  { id: "1089154", name: "Jaa", role: "Host" },
  { id: "8170164", name: "Jaebum", role: "Host" },
  { id: "29517964", name: "Jake", role: "Host" },
  { id: "14508056", name: "Javier", role: "Host" },
  { id: "45982313", name: "Jey Em", role: "Host" },
  { id: "10417278", name: "JLord", role: "Host" },
  { id: "68345832", name: "Johnny", role: "Host" },
  { id: "53065612", name: "Joji", role: "Host" },
  { id: "51327969", name: "Jolly", role: "Host" },
  { id: "28207417", name: "Junel", role: "Host" },
  { id: "8081331", name: "Katieyow", role: "Host" },
  { id: "3613056", name: "Katy", role: "Host" },
  { id: "5825737", name: "Ken", role: "Host" },
  { id: "42205198", name: "Khey Gee", role: "Host" },
  { id: "65340031", name: "Kimpoy", role: "Host" },
  { id: "2711029", name: "Kitty", role: "Host" },
  { id: "2339155", name: "Kler", role: "Host" },
  { id: "8246228", name: "Kuya July", role: "Host" },
  { id: "18898805", name: "Lica", role: "Host" },
  { id: "11836486", name: "Lin", role: "Host" },
  { id: "50040181", name: "Lyka", role: "Host" },
  { id: "17443588", name: "Mai", role: "Host" },
  { id: "30333133", name: "Martin", role: "Host" },
  { id: "2608827", name: "Mikka", role: "Host" },
  { id: "40158690", name: "Nhics", role: "Host" },
  { id: "21302889", name: "Nicky", role: "Host" },
  { id: "4728141", name: "Nicole", role: "Host" }
];

interface RosterManagementTabProps {
  hosts?: Host[];
  onUpdate: () => void;
  auditLogAction: (actionType: string, beforeValue: any, afterValue: any) => Promise<void>;
}

export const RosterManagementTab: React.FC<RosterManagementTabProps> = ({ onUpdate, auditLogAction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  
  // Local state for edits
  const [editedHosts, setEditedHosts] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Upload State
  const [selectedHostForUpload, setSelectedHostForUpload] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        setFetchError(null);
        const fetchedUsers = await FirebaseService.getAllRoleMetadata();
        if (!fetchedUsers || fetchedUsers.length === 0) {
          setFetchError("getAllRoleMetadata returned 0 users. Likely a permissions issue or empty database.");
        }
        const mappedUsers = fetchedUsers.map(u => ({ ...u, id: u.poppo_id || u.poppoId || u.id }));
        setUsers(mappedUsers);
      } catch (error: any) {
        console.error("Error fetching users:", error);
        setFetchError(error.message || String(error));
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [saveSuccess]); // Refetch when save is successful

  // Managers/Agents list for the 'Assigned Manager' dropdown
  const managerOptions = useMemo(() => {
    return users
      .filter(h => (h.role || '').toLowerCase() === 'manager' || (h.role || '').toLowerCase() === 'agent')
      .map(h => ({ id: h.poppo_id || h.poppoId || h.id, name: h.nickname || h.name }));
  }, [users]);

  // Filter out Directors and apply search/role filters
  const filteredHosts = useMemo(() => {
    return users.filter(h => {
      if (h.role?.toLowerCase() === 'director') return false;
      
      const hostId = String(h.poppo_id || h.poppoId || h.id || '');
      const hostName = String(h.nickname || h.name || '');
      const matchesSearch = (hostName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             hostId.includes(searchTerm));
      
      const matchesRole = roleFilter === 'All' || (h.role || '').toLowerCase() === roleFilter.toLowerCase();

      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const handleFieldChange = (hostId: string, field: string, value: any) => {
    setEditedHosts(prev => ({
      ...prev,
      [hostId]: {
        ...(prev[hostId] || {}),
        [field]: value
      }
    }));
  };

  const handleManagerChange = (hostId: string, managerId: string) => {
    const selectedManager = managerOptions.find(m => m.id === managerId);
    setEditedHosts(prev => ({
      ...prev,
      [hostId]: {
        ...(prev[hostId] || {}),
        assigned_manager_poppo_id: managerId,
        assigned_manager_nickname: selectedManager ? selectedManager.name : ''
      }
    }));
  };

  const handleSaveChanges = async () => {
    const hostIdsToUpdate = Object.keys(editedHosts);
    if (hostIdsToUpdate.length === 0) return;

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      for (const id of hostIdsToUpdate) {
        const original = users.find(h => (h.poppo_id || h.poppoId || h.id) === id);
        if (original) {
          const updatedData = { 
            ...editedHosts[id],
            updated_at: new Date().toISOString()
          };
          
          const updatedRole = updatedData.role || original.role || "host";
          
          try {
            await FirebaseService.updateRoleMetadata(updatedRole, id, updatedData);
          } catch (firebaseErr: any) {
            console.warn(`Firebase rejected update for ${id}, falling back to local storage:`, firebaseErr);
            // Fallback: update local storage directly
            const currentLocalHosts = Storage.getHosts();
            const hostIndex = currentLocalHosts.findIndex(h => h.id === id);
            if (hostIndex >= 0) {
              currentLocalHosts[hostIndex] = { ...currentLocalHosts[hostIndex], ...updatedData };
            } else {
              currentLocalHosts.push({ ...original, ...updatedData });
            }
            Storage.setHosts(currentLocalHosts);
          }

          if (auditLogAction) {
            await auditLogAction('UPDATE_ROSTER_MEMBER', original, { ...original, ...updatedData });
          }
        }
      }
      
      setEditedHosts({});
      setSaveSuccess(true);
      onUpdate();
      
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error("Error saving roster updates:", error);
      alert(`Failed to save changes: ${error.message || String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getDisplayValue = (host: any, field: string) => {
    const id = host.poppo_id || host.poppoId || host.id;
    return editedHosts[id]?.[field] !== undefined 
      ? editedHosts[id][field] 
      : host[field];
  };

  const handlePhotoClick = (host: any) => {
    setSelectedHostForUpload(host);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedHostForUpload) return;
    
    setIsUploading(true);
    try {
      const id = selectedHostForUpload.poppo_id || selectedHostForUpload.poppoId || selectedHostForUpload.id;
      const name = selectedHostForUpload.nickname || selectedHostForUpload.name;
      const role = selectedHostForUpload.role || 'host';
      
      const downloadURL = await FirebaseService.uploadProfilePhoto(file, id, name, role);
      
      // Update local state instantly so the UI reflects the change without a full refetch
      setUsers(prev => prev.map(u => 
        (u.poppo_id || u.poppoId || u.id) === id 
          ? { ...u, photoUrl: downloadURL } 
          : u
      ));
      
      setSelectedHostForUpload(null);
      if (auditLogAction) {
        await auditLogAction('UPLOAD_PROFILE_PHOTO', null, { hostId: id, url: downloadURL });
      }
    } catch (error: any) {
      alert("Failed to upload photo: " + (error.message || String(error)));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-[#1A1A28] p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A09E9A]/50" size={14} />
            <input
              type="text"
              placeholder="Search ID or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-black/20 border border-white/10 rounded-lg text-[11px] text-[#F0EFE8] focus:outline-none focus:border-indigo-500/50 w-48"
            />
          </div>

          {/* Role Filter */}
          <select
            title="Filter by Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-[#F0EFE8] focus:outline-none focus:border-indigo-500/50"
          >
            <option value="All">All Roles</option>
            <option value="Host">Host</option>
            <option value="Manager">Manager</option>
            <option value="Agent">Agent</option>
            <option value="Head Admin">Head Admin</option>
          </select>
          
          <div className="text-[10px] text-[#A09E9A]/60 font-mono ml-2">
            ({filteredHosts.length} users)
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end min-h-[36px]">
          {saveSuccess && (
            <span className="text-emerald-400 text-xs font-bold flex items-center gap-1 animate-pulse">
              <CheckCircle2 size={14} /> Saved!
            </span>
          )}
          {hasUnsavedChanges && (
            <button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all",
                isSaving ? "bg-white/5 text-[#A09E9A]/50 cursor-not-allowed" : "bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer"
              )}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
      </div>

      <div className="tech-card !p-0 overflow-hidden relative">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap min-w-max">
            <thead className="bg-[#13131E] border-b border-white/5 sticky top-0 z-20">
              <tr className="text-[10px] font-black text-[#A09E9A]/60 uppercase tracking-[0.1em]">
                <th className="px-6 py-4 bg-[#1A1A28] border-r border-white/5 w-[80px] min-w-[80px]">Poppo ID</th>
                <th className="px-6 py-4 sticky left-0 z-30 bg-[#1A1A28] border-r border-white/5 shadow-[4px_0_10px_rgba(0,0,0,0.2)] w-[120px] min-w-[120px]">Nickname</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Team Anchor</th>
                <th className="px-6 py-4">Tier / Pay</th>
                <th className="px-6 py-4">Assigned Manager (Name)</th>
                <th className="px-6 py-4">Manager Poppo ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {fetchError ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-red-400 italic text-xs font-bold">
                    System Error: {fetchError}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-[#A09E9A]/30 italic text-xs">
                    Roster is empty. Ensure data is loaded properly.
                  </td>
                </tr>
              ) : filteredHosts.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-[#A09E9A]/30 italic text-xs">
                    No users found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredHosts.map(host => {
                  const isHostRole = (getDisplayValue(host, 'role') as string)?.toLowerCase() === 'host';
                  const isEdited = !!editedHosts[host.id];
                  
                  return (
                    <tr key={host.id} className={cn(
                      "transition-colors",
                      isEdited ? "bg-indigo-500/[0.03]" : "hover:bg-white/[0.02]"
                    )}>
                      <td className="px-6 py-3 bg-[#1A1A28] border-r border-white/5 w-[80px] min-w-[80px]">
                        <span className="font-mono text-[11px] text-indigo-400 font-bold">{host.id}</span>
                      </td>

                      <td className="px-6 py-3 sticky left-0 z-10 bg-[#1A1A28] border-r border-white/5 shadow-[4px_0_10px_rgba(0,0,0,0.2)] w-[120px] min-w-[120px]">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handlePhotoClick(host)}
                            className="relative group w-8 h-8 rounded-full border border-white/10 flex-shrink-0 overflow-hidden cursor-pointer bg-white/5 hover:border-indigo-400 transition-colors"
                            title="Update Profile Photo"
                          >
                            {host.photoUrl ? (
                              <img src={host.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <UserCircle size={16} className="text-[#A09E9A]/50 group-hover:text-indigo-400" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Camera size={14} className="text-white" />
                            </div>
                          </button>
                          <span className="font-bold text-[#F0EFE8] truncate">{host.nickname || host.name}</span>
                        </div>
                      </td>

                      <td className="px-6 py-3">
                        <div className="px-3 py-1 inline-flex rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-[#A09E9A] uppercase tracking-wider">
                          {getDisplayValue(host, 'role') as string || 'Host'}
                        </div>
                      </td>

                      <td className="px-6 py-3">
                        <select
                          title="Change Status"
                          value={getDisplayValue(host, 'status') as string || 'Active'}
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
                        <input
                          type="text"
                          value={getDisplayValue(host, 'team_anchor') as string || ''}
                          onChange={(e) => handleFieldChange(host.id, 'team_anchor', e.target.value)}
                          className="bg-transparent border border-transparent hover:border-white/10 focus:border-indigo-500 rounded px-2 py-1 outline-none text-[#F0EFE8] w-32"
                          placeholder="Team / Anchor"
                        />
                      </td>

                      <td className="px-6 py-3">
                        <select
                          title="Select Tier"
                          value={getDisplayValue(host, 'tier_pay') as string || ''}
                          onChange={(e) => handleFieldChange(host.id, 'tier_pay', e.target.value)}
                          className="bg-transparent border border-transparent hover:border-white/10 focus:border-indigo-500 rounded px-2 py-1 outline-none text-[#F0EFE8] w-32"
                        >
                          <option value="" className="bg-[#1A1A28]">Select Tier...</option>
                          {['Star Host', 'Rocket Host', 'S idol', 'Esports', 'Regular Host', 'Influencer'].map(t => (
                            <option key={t} value={t} className="bg-[#1A1A28]">{t}</option>
                          ))}
                        </select>
                      </td>

                      <td className="px-6 py-3">
                        {isHostRole ? (
                          <select
                            title="Select Manager by Name"
                            value={getDisplayValue(host, 'assigned_manager_poppo_id') as string || ''}
                            onChange={(e) => handleManagerChange(host.id, e.target.value)}
                            className="bg-transparent border border-transparent hover:border-white/10 focus:border-indigo-500 rounded px-2 py-1 outline-none text-[#F0EFE8] w-40"
                          >
                            <option value="" className="bg-[#1A1A28]">No Manager</option>
                            {managerOptions.map(m => (
                              <option key={m.id} value={m.id} className="bg-[#1A1A28]">{m.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[#A09E9A]/40 text-[10px] px-2 italic">N/A</span>
                        )}
                      </td>

                      <td className="px-6 py-3">
                        {isHostRole ? (
                          <select
                            title="Select Manager by ID"
                            value={getDisplayValue(host, 'assigned_manager_poppo_id') as string || ''}
                            onChange={(e) => handleManagerChange(host.id, e.target.value)}
                            className="bg-transparent border border-transparent hover:border-white/10 focus:border-indigo-500 rounded px-2 py-1 outline-none text-[#F0EFE8] w-32 font-mono text-xs"
                          >
                            <option value="" className="bg-[#1A1A28]">No ID</option>
                            {managerOptions.map(m => (
                              <option key={m.id} value={m.id} className="bg-[#1A1A28]">{m.id}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[#A09E9A]/40 text-[10px] px-2 italic">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Upload Spotlight Modal */}
      {selectedHostForUpload && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#13131E] border border-white/10 rounded-3xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-white/5 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-white">Update Profile Photo</h3>
                <p className="text-xs text-[#A09E9A] mt-1 font-mono">
                  ID: {selectedHostForUpload.poppo_id || selectedHostForUpload.poppoId || selectedHostForUpload.id}
                </p>
              </div>
              <button 
                onClick={() => !isUploading && setSelectedHostForUpload(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-[#A09E9A] hover:text-white transition-colors disabled:opacity-50"
                disabled={isUploading}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-500/30 mb-6 bg-black/50 relative group">
                {selectedHostForUpload.photoUrl ? (
                  <img src={selectedHostForUpload.photoUrl} alt="" className={cn("w-full h-full object-cover transition-opacity", isUploading && "opacity-50")} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserCircle size={64} className="text-[#A09E9A]/30" />
                  </div>
                )}
                
                {isUploading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                    <Loader2 size={24} className="text-indigo-400 animate-spin mb-2" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Uploading...</span>
                  </div>
                )}
              </div>

              <div className="text-center space-y-4">
                <p className="text-sm text-[#F0EFE8]">
                  Select a new profile photo for <strong className="text-indigo-400">{selectedHostForUpload.nickname || selectedHostForUpload.name}</strong>.
                </p>
                <p className="text-xs text-[#A09E9A]">
                  The image will be automatically optimized for SEO and saved to their official profile.
                </p>
              </div>
            </div>

            <div className="p-5 border-t border-white/5 bg-[#1A1A28] flex justify-end gap-3">
              <button
                onClick={() => setSelectedHostForUpload(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#A09E9A] hover:text-white hover:bg-white/5 transition-colors"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={cn(
                  "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all",
                  isUploading ? "bg-white/5 text-[#A09E9A]/50 cursor-not-allowed" : "bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                )}
              >
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                {isUploading ? 'Processing...' : 'Select File'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

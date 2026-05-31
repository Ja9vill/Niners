/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { X, UserCircle, Save, Loader2, Calendar, Star, Medal, Trophy, Crown, CheckCircle2 } from 'lucide-react';
import { Host, ExposureEntry, AgencyAward, FanbaseHealthEntry } from '../types';
import { cn } from '../lib/utils';
import { FirebaseService } from '../lib/firebaseService';

interface HostSpotlightModalProps {
  host: Host;
  onClose: () => void;
  onSave: (hostId: string, updates: Partial<Host>) => Promise<void>;
  managerOptions: { id: string; name: string }[];
}

export const HostSpotlightModal: React.FC<HostSpotlightModalProps> = ({
  host,
  onClose,
  onSave,
  managerOptions
}) => {
  const [editedData, setEditedData] = useState<Partial<Host>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [exposures, setExposures] = useState<ExposureEntry[]>([]);
  const [awards, setAwards] = useState<AgencyAward[]>([]);
  const [fanbase, setFanbase] = useState<FanbaseHealthEntry | null>(null);
  const [isLoadingExtras, setIsLoadingExtras] = useState(true);

  useEffect(() => {
    const fetchExtras = async () => {
      try {
        setIsLoadingExtras(true);
        const [exp, awd, fbList] = await Promise.all([
          FirebaseService.getExposures(host.id),
          (FirebaseService as any).getAwards ? (FirebaseService as any).getAwards(host.id) : [],
          FirebaseService.getFanbaseHealth(host.id)
        ]);
        setExposures(exp);
        setAwards(awd);
        if (fbList && fbList.length > 0) {
          setFanbase(fbList[0]);
        }
      } catch (err) {
        console.error("Failed to load spotlight extras:", err);
      } finally {
        setIsLoadingExtras(false);
      }
    };
    fetchExtras();
  }, [host.id]);

  const handleFieldChange = (field: keyof Host, value: string) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const getDisplayValue = (field: keyof Host) => {
    return editedData[field] !== undefined ? editedData[field] : host[field];
  };

  const handleSaveClick = async () => {
    if (Object.keys(editedData).length === 0) return;
    setIsSaving(true);
    try {
      await onSave(host.id, editedData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = Object.keys(editedData).length > 0;
  const isHostRole = (host.role || '').toLowerCase() === 'host';

  const upcomingExposures = exposures.filter(e => new Date(e.event_date) >= new Date());
  const pastExposures = exposures.filter(e => new Date(e.event_date) < new Date());

  const getIcon = (type: string) => {
    switch (type) {
      case 'trophy': return <Trophy className="text-yellow-400" size={24} />;
      case 'star': return <Star className="text-blue-400" size={24} />;
      case 'crown': return <Crown className="text-amber-400" size={24} />;
      default: return <Medal className="text-indigo-400" size={24} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#13131E] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl flex flex-col">
        
        {/* Header Section */}
        <div className="sticky top-0 z-10 bg-[#13131E]/90 backdrop-blur-md border-b border-white/5 p-6 flex justify-between items-start">
          <div className="flex items-center gap-6">
            {host.photoUrl ? (
              <img src={host.photoUrl} alt="" className="w-24 h-24 rounded-full border-4 border-indigo-500/30 object-cover shadow-[0_0_20px_rgba(99,102,241,0.2)]" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border-4 border-white/10 flex-shrink-0">
                <UserCircle size={48} className="text-[#A09E9A]/50" />
              </div>
            )}
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight">{host.nickname || host.name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest border border-indigo-500/30">
                  {host.role}
                </span>
                <span className="font-mono text-[#A09E9A] text-sm">ID: {host.id}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-[#A09E9A] hover:text-white">
              <X size={24} />
            </button>
            {hasChanges && (
              <button
                onClick={handleSaveClick}
                disabled={isSaving}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all mt-4",
                  isSaving ? "bg-white/5 text-[#A09E9A]/50 cursor-not-allowed" : "bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer"
                )}
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />}
                {isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save Changes"}
              </button>
            )}
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Quick Edits & Fanbase Metrics */}
          <div className="space-y-6">
            <div className="bg-[#1A1A28] rounded-2xl p-5 border border-white/5 shadow-inner">
              <h3 className="text-xs font-black text-[#A09E9A] uppercase tracking-widest mb-4">Management Info</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] text-[#A09E9A]/60 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={getDisplayValue('status') as string || 'Active'}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F0EFE8] focus:outline-none focus:border-indigo-500/50"
                  >
                    {['Active', 'Inconsistent', 'Inactive', 'Releasing', 'Released'].map(s => (
                      <option key={s} value={s} className="bg-[#1A1A28]">{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#A09E9A]/60 uppercase tracking-wider mb-1">Tier / Pay</label>
                  <select
                    value={getDisplayValue('tier_pay' as any) as string || ''}
                    onChange={(e) => handleFieldChange('tier_pay' as any, e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F0EFE8] focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="" className="bg-[#1A1A28]">Select Tier...</option>
                    {['Star Host', 'Rocket Host', 'S idol', 'Esports', 'Regular Host', 'Influencer'].map(t => (
                      <option key={t} value={t} className="bg-[#1A1A28]">{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#A09E9A]/60 uppercase tracking-wider mb-1">Team Anchor</label>
                  <input
                    type="text"
                    value={getDisplayValue('team_anchor' as any) as string || ''}
                    onChange={(e) => handleFieldChange('team_anchor' as any, e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F0EFE8] focus:outline-none focus:border-indigo-500/50"
                    placeholder="Team / Anchor"
                  />
                </div>
                {isHostRole && (
                  <div>
                    <label className="block text-[10px] text-[#A09E9A]/60 uppercase tracking-wider mb-1">Assigned Manager</label>
                    <select
                      value={getDisplayValue('assigned_manager_poppo_id' as any) as string || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const matched = managerOptions.find(m => m.id === val);
                        handleFieldChange('assigned_manager_poppo_id' as any, val);
                        handleFieldChange('assigned_manager' as any, matched ? matched.name : '');
                      }}
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm text-[#F0EFE8] focus:outline-none focus:border-indigo-500/50"
                    >
                      <option value="" className="bg-[#1A1A28]">No Manager</option>
                      {managerOptions.map(m => (
                        <option key={m.id} value={m.id} className="bg-[#1A1A28]">{m.name} ({m.id})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/5 rounded-2xl p-5 border border-indigo-500/20">
              <h3 className="text-xs font-black text-indigo-300 uppercase tracking-widest mb-4">Fanbase Metrics</h3>
              {isLoadingExtras ? (
                <div className="flex justify-center py-4"><Loader2 className="animate-spin text-indigo-400" /></div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                    <span className="text-xs text-[#A09E9A]">Total Followers</span>
                    <span className="font-bold text-white text-lg">{host.followers_count || 0}</span>
                  </div>
                  <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                    <span className="text-xs text-[#A09E9A]">FC Subscribers</span>
                    <span className="font-bold text-indigo-400 text-lg">{fanbase?.subscribers || 0}</span>
                  </div>
                  <div className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                    <span className="text-xs text-[#A09E9A]">FC GC Members</span>
                    <span className="font-bold text-purple-400 text-lg">{fanbase?.gcMembers || 0}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Middle & Right Column: Exposures & Awards */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Awards & Badges Block */}
            <div className="bg-[#1A1A28] rounded-2xl p-6 border border-white/5 shadow-inner">
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <Medal size={18} className="text-yellow-400" /> Agency Badges & Awards
              </h3>
              {isLoadingExtras ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#A09E9A]" /></div>
              ) : awards.length === 0 ? (
                <div className="text-center py-8 text-[#A09E9A]/50 text-xs italic bg-black/20 rounded-xl border border-white/5">
                  No awards or badges earned yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {awards.map(award => (
                    <div key={award.id} className="bg-gradient-to-b from-white/10 to-transparent p-4 rounded-xl border border-white/10 flex flex-col items-center text-center gap-2 hover:bg-white/10 transition-colors cursor-pointer group">
                      <div className="p-3 bg-black/40 rounded-full border border-white/10 group-hover:scale-110 transition-transform">
                        {getIcon(award.iconType)}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-white">{award.title}</div>
                        <div className="text-[10px] text-[#A09E9A] mt-1">{award.dateAwarded}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Exposures Block */}
            <div className="bg-[#1A1A28] rounded-2xl p-6 border border-white/5 shadow-inner">
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-blue-400" /> Exposures
              </h3>
              {isLoadingExtras ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-[#A09E9A]" /></div>
              ) : exposures.length === 0 ? (
                <div className="text-center py-8 text-[#A09E9A]/50 text-xs italic bg-black/20 rounded-xl border border-white/5">
                  No exposure events logged.
                </div>
              ) : (
                <div className="space-y-6">
                  {upcomingExposures.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3">Upcoming Events</h4>
                      <div className="space-y-3">
                        {upcomingExposures.map(exp => (
                          <div key={exp.id} className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex justify-between items-center">
                            <div>
                              <div className="font-bold text-emerald-100">{exp.event_type}</div>
                              <div className="text-xs text-emerald-400/70 mt-1">{exp.description}</div>
                            </div>
                            <div className="font-mono text-xs text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-lg">
                              {exp.event_date}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pastExposures.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-[#A09E9A] uppercase tracking-wider mb-3">Past Events</h4>
                      <div className="space-y-3">
                        {pastExposures.map(exp => (
                          <div key={exp.id} className="bg-black/20 border border-white/5 p-4 rounded-xl flex justify-between items-center">
                            <div>
                              <div className="font-bold text-white/80">{exp.event_type}</div>
                              <div className="text-xs text-[#A09E9A]/70 mt-1">{exp.description}</div>
                            </div>
                            <div className="font-mono text-xs text-[#A09E9A] bg-white/5 px-3 py-1 rounded-lg">
                              {exp.event_date}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

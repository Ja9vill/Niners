/* eslint-disable */
/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { X, Calendar, ChevronLeft, Edit2, Loader2 } from 'lucide-react';
import { Host, CommissionEntry, CalendarEvent } from '../types';
import { FirebaseService } from '../lib/firebaseService';
import { Storage } from '../lib/storage';
import { cn, formatNumber } from '../lib/utils';
import { MANAGERS, BASE_SALARY_POLICIES } from '../lib/constants';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface HostProfileViewProps {
  host: Host;
  isReadOnly?: boolean;
  onClose?: () => void;
  onProfileUpdated?: () => void;
}

export const HostProfileView: React.FC<HostProfileViewProps> = ({ 
  host, 
  isReadOnly = false, 
  onClose,
  onProfileUpdated 
}) => {
  const [performanceReports, setPerformanceReports] = useState<any[]>([]);
  const [participatedEvents, setParticipatedEvents] = useState<any[]>([]);
  const [pkData, setPkData] = useState<{ win_percentage: number; pk_score: number; sessions: number }>({
    win_percentage: 73,
    pk_score: 1800000,
    sessions: 45
  });
  const [isLoading, setIsLoading] = useState(true);

  // Profile Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState(host.nickname || host.name || '');
  const [editPhotoUrl, setEditPhotoUrl] = useState(host.photoUrl || '');
  const [editDescription, setEditDescription] = useState(host.description || '');
  const [editRole, setEditRole] = useState<string>(host.role || 'Talent');
  const [editTeam, setEditTeam] = useState<string>(host.team || 'Unassigned');
  const [editManager, setEditManager] = useState<string>(host.manager || 'Nine Management');
  const [editBaseSalaryCategory, setEditBaseSalaryCategory] = useState<string>(host.base_salary_category || 'N/A');
  const [editStatus, setEditStatus] = useState<string>(host.status || 'Active');
  const [editTier, setEditTier] = useState<string>(host.tier || 'X');
  const [editLevel, setEditLevel] = useState<number>(host.level || 1);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  // RPK Reporting States
  const [isRpkFormOpen, setIsRpkFormOpen] = useState(false);
  const [isSubmittingRpk, setIsSubmittingRpk] = useState(false);
  const [rpkFormData, setRpkFormData] = useState({
    from_date: '',
    to_date: '',
    pk_wins_percent: '',
    pk_points: '',
    pk_sessions: ''
  });

  // Fanbase Reporting States
  const [isFanbaseFormOpen, setIsFanbaseFormOpen] = useState(false);
  const [isSubmittingFanbase, setIsSubmittingFanbase] = useState(false);
  const [fanbaseFormData, setFanbaseFormData] = useState({
    from_date: '',
    to_date: '',
    total_followers: '',
    fanclub_subscribers: '',
    fanclub_gc_members: '',
    gc_activity_count_host: '',
    gc_activity_count_fans: '',
    notes: ''
  });

  useEffect(() => {
    // Reset edit values when host changes
    setEditNickname(host.nickname || host.name || '');
    setEditPhotoUrl(host.photoUrl || '');
    setEditDescription(host.description || '');
    setEditRole(host.role || 'Talent');
    setEditTeam(host.team || 'Unassigned');
    setEditManager(host.manager || 'Nine Management');
    setEditBaseSalaryCategory(host.base_salary_category || 'N/A');
    setEditStatus(host.status || 'Active');
    setEditTier(host.tier || 'X');
    setEditLevel(host.level || 1);
    setIsEditing(false);
    
    const loadProfileData = async () => {
      setIsLoading(true);
      try {
        // Section 1: Query performance_reports by poppoId
        const perfQuery = query(
          collection(db, 'performance_reports'), 
          where('poppoId', '==', host.id)
        );
        const perfSnap = await getDocs(perfQuery);
        const perfList: any[] = [];
        perfSnap.forEach(doc => {
          perfList.push({ id: doc.id, ...doc.data() });
        });
        perfList.sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });
        setPerformanceReports(perfList);

        // Section 2: Query events collection using array-contains for specific poppoId in participantIds
        const eventsQuery = query(
          collection(db, 'events'), 
          where('participantIds', 'array-contains', host.id)
        );
        const eventsSnap = await getDocs(eventsQuery);
        const eventsList: any[] = [];
        eventsSnap.forEach(doc => {
          eventsList.push({ id: doc.id, ...doc.data() });
        });
        setParticipatedEvents(eventsList);

        // Load PK data from local or fallback to mockup stats
        const localPks = Storage.getPKData(host.id);
        if (localPks && localPks.length > 0) {
          setPkData({
            win_percentage: localPks[0].win_percentage,
            pk_score: localPks[0].pk_score,
            sessions: localPks[0].sessions
          });
        }
      } catch (err) {
        console.error("Failed to load host profile data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfileData();
  }, [host.id]);



  // Profile photo file uploader
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo too large. Max 5MB.');
      return;
    }

    setIsProcessingPhoto(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_SIZE = 400;

            if (width > height) {
              if (width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              }
            } else {
              if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                width = MAX_SIZE;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          };
          img.onerror = reject;
          img.src = reader.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setEditPhotoUrl(base64);
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Failed to process image');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  // Save changes to Firestore and AuthState
  const handleSaveChanges = async () => {
    if (!editNickname.trim()) {
      alert("Nickname cannot be empty.");
      return;
    }
    setIsSaving(true);
    try {
      const updatedHost: Host = {
        ...host,
        nickname: editNickname.trim(),
        name: editNickname.trim() || host.name,
        photoUrl: editPhotoUrl,
        description: editDescription,
        role: editRole as any,
        team: editTeam,
        manager: editManager,
        base_salary_category: editBaseSalaryCategory as any,
        status: editStatus as any,
        tier: editTier as any,
        level: Number(editLevel) || 1,
        updated_at: new Date().toISOString()
      };

      await FirebaseService.updateHost(updatedHost);

      // If editing current logged in user's profile, update authState
      const currentAuth = Storage.getAuthState();
      if (currentAuth.poppo_id === host.id) {
        const newAuth = {
          ...currentAuth,
          name: editNickname.trim(),
          nickname: editNickname.trim(),
          profile_photo: editPhotoUrl
        };
        Storage.setAuthState(newAuth);
      }

      setIsEditing(false);
      if (onProfileUpdated) {
        onProfileUpdated();
      }
    } catch (err) {
      console.error("Failed to update profile:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Submit RPK Report
  const handleRpkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rpkFormData.from_date || !rpkFormData.to_date) {
      alert("From Date and To Date are required.");
      return;
    }
    setIsSubmittingRpk(true);
    try {
      const currentAuth = Storage.getAuthState();
      const reportData = {
        reporter_id: currentAuth?.poppo_id || "Unknown",
        reporter_name: currentAuth?.name || currentAuth?.nickname || "Unknown",
        reporter_role: currentAuth?.role || "Unknown",
        poppo_id: host.id,
        nickname: host.nickname || host.name,
        from_date: rpkFormData.from_date,
        to_date: rpkFormData.to_date,
        pk_wins_percent: rpkFormData.pk_wins_percent,
        pk_points: rpkFormData.pk_points,
        pk_sessions: rpkFormData.pk_sessions
      };
      
      await FirebaseService.submitRpkReport(host.id, rpkFormData.from_date, rpkFormData.to_date, reportData);
      
      setIsRpkFormOpen(false);
      setRpkFormData({from_date: '', to_date: '', pk_wins_percent: '', pk_points: '', pk_sessions: ''});
      alert("RPK Report submitted successfully.");
    } catch(err) {
      console.error(err);
      alert("Failed to submit RPK Report");
    } finally {
      setIsSubmittingRpk(false);
    }
  };

  // Submit Fanbase Report
  const handleFanbaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fanbaseFormData.from_date || !fanbaseFormData.to_date) {
      alert("From Date and To Date are required.");
      return;
    }
    setIsSubmittingFanbase(true);
    try {
      const currentAuth = Storage.getAuthState();
      const reportData = {
        reporter_id: currentAuth?.poppo_id || "Unknown",
        reporter_name: currentAuth?.name || currentAuth?.nickname || "Unknown",
        reporter_role: currentAuth?.role || "Unknown",
        poppo_id: host.id,
        nickname: host.nickname || host.name,
        from_date: fanbaseFormData.from_date,
        to_date: fanbaseFormData.to_date,
        total_followers: fanbaseFormData.total_followers,
        fanclub_subscribers: fanbaseFormData.fanclub_subscribers,
        fanclub_gc_members: fanbaseFormData.fanclub_gc_members,
        gc_activity_count_host: fanbaseFormData.gc_activity_count_host,
        gc_activity_count_fans: fanbaseFormData.gc_activity_count_fans,
        notes: fanbaseFormData.notes
      };
      
      await FirebaseService.submitFanbaseReport(host.id, fanbaseFormData.from_date, fanbaseFormData.to_date, reportData);
      
      setIsFanbaseFormOpen(false);
      setFanbaseFormData({
        from_date: '', to_date: '', total_followers: '', fanclub_subscribers: '', 
        fanclub_gc_members: '', gc_activity_count_host: '', gc_activity_count_fans: '', notes: ''
      });
      alert("Fanbase Report submitted successfully.");
    } catch(err) {
      console.error(err);
      alert("Failed to submit Fanbase Report");
    } finally {
      setIsSubmittingFanbase(false);
    }
  };

  const isSpotlight = !!onClose;

  const renderIdentityCard = () => (
    <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-4 flex gap-4 items-start shadow-md relative group/card">
      {/* Edit / Save Options */}
      {!isReadOnly && (
        <div className="absolute top-4 right-4 z-10">
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="p-1.5 bg-[#222235] hover:bg-[#2A2A3F] text-[#A09E9A] hover:text-[#D4AF37] rounded-lg transition-all border border-white/10 cursor-pointer"
              title="Edit Profile"
            >
              <Edit2 size={12} />
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button 
                onClick={handleSaveChanges}
                disabled={isSaving || isProcessingPhoto}
                className="px-2 py-1 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded text-[8px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                title="Save Changes"
              >
                {isSaving ? '...' : 'Save'}
              </button>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setEditNickname(host.nickname || host.name || '');
                  setEditPhotoUrl(host.photoUrl || '');
                  setEditDescription(host.description || '');
                }}
                className="px-2 py-1 bg-[#222235] hover:bg-[#2A2A3F] text-[#A09E9A] hover:text-[#F0EFE8] rounded text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer"
                title="Cancel"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Host Photo Section */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <span className="text-[8px] font-black text-[#A09E9A]/60 uppercase tracking-widest leading-none">HOST PHOTO</span>
        <div className="w-16 h-16 rounded-full bg-[#0D0D14] border-2 border-[#D4AF37]/30 flex items-center justify-center font-bold text-[#F0EFE8] overflow-hidden shadow-lg shadow-[#D4AF37]/5 relative">
          {isProcessingPhoto && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 size={16} className="animate-spin text-[#D4AF37]" />
            </div>
          )}
          {editPhotoUrl ? (
            <img src={editPhotoUrl} alt={host.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="text-lg text-[#A09E9A] font-bold">{editNickname?.[0]?.toUpperCase() || host.name?.[0] || 'JD'}</div>
          )}
        </div>
        
        {isEditing && (
          <div className="flex flex-col items-center gap-1 mt-1">
            <label className="px-2 py-0.5 bg-[#222235] border border-white/10 hover:bg-[#2A2A3F] rounded text-[7px] font-black uppercase tracking-wider cursor-pointer text-[#F0EFE8]">
              Upload
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
            <input 
              type="text" 
              placeholder="URL..." 
              value={editPhotoUrl}
              onChange={(e) => setEditPhotoUrl(e.target.value)}
              className="w-14 bg-[#0D0D14] border border-white/10 rounded px-1 py-0.5 text-[6.5px] text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              title="Profile Photo URL"
            />
          </div>
        )}
      </div>

      {/* Identity Details */}
      <div className="flex-1 min-w-0 space-y-2.5 pr-8">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest block mb-0.5">NICKNAME</span>
            {isEditing ? (
              <input 
                type="text"
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                className="w-full bg-[#0D0D14] border border-white/10 rounded px-2 py-1 text-xs font-bold text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                required
                title="Nickname"
                placeholder="Nickname"
              />
            ) : (
              <span className="text-sm font-black text-[#F0EFE8] truncate block leading-tight">{host.nickname || host.name}</span>
            )}
          </div>
          <div>
            <span className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest block mb-0.5">POPPO ID</span>
            <span className="text-sm font-black text-[#F0EFE8] truncate block leading-tight">{host.id}</span>
          </div>
        </div>

        {isEditing ? (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 text-[10px] text-[#A09E9A]">

            <div className="space-y-1">
              <label htmlFor="edit-role" className="text-[#A09E9A] font-bold uppercase tracking-wider block">Role:</label>
              <select
                id="edit-role"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full bg-[#0D0D14] border border-white/10 rounded px-1.5 py-1 text-[11px] text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              >
                {['Talent', 'Manager', 'Admin', 'Head Admin', 'Director', 'Agent'].map(r => (
                  <option key={r} value={r} className="bg-[#1A1A28] text-[#F0EFE8]">{r}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-sal" className="text-[#A09E9A] font-bold uppercase tracking-wider block">Base Salary Category:</label>
              <select
                id="edit-sal"
                value={editBaseSalaryCategory}
                onChange={(e) => setEditBaseSalaryCategory(e.target.value)}
                className="w-full bg-[#0D0D14] border border-white/10 rounded px-1.5 py-1 text-[11px] text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              >
                {BASE_SALARY_POLICIES.map(policy => (
                  <option key={policy} value={policy} className="bg-[#1A1A28] text-[#F0EFE8]">{policy}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-mgr" className="text-[#A09E9A] font-bold uppercase tracking-wider block">Assigned Manager:</label>
              <select
                id="edit-mgr"
                value={editManager}
                onChange={(e) => setEditManager(e.target.value)}
                className="w-full bg-[#0D0D14] border border-white/10 rounded px-1.5 py-1 text-[11px] text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              >
                {MANAGERS.map(mgr => (
                  <option key={mgr} value={mgr} className="bg-[#1A1A28] text-[#F0EFE8]">{mgr}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-team" className="text-[#A09E9A] font-bold uppercase tracking-wider block">Team / Anchor Group:</label>
              <input
                id="edit-team"
                type="text"
                value={editTeam}
                onChange={(e) => setEditTeam(e.target.value)}
                className="w-full bg-[#0D0D14] border border-white/10 rounded px-1.5 py-1 text-[11px] text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-status" className="text-[#A09E9A] font-bold uppercase tracking-wider block">Status:</label>
              <select
                id="edit-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full bg-[#0D0D14] border border-white/10 rounded px-1.5 py-1 text-[11px] text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              >
                {['Active', 'Inconsistent', 'Released', 'Inactive'].map(s => (
                  <option key={s} value={s} className="bg-[#1A1A28] text-[#F0EFE8]">{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-tier" className="text-[#A09E9A] font-bold uppercase tracking-wider block">Tier:</label>
              <select
                id="edit-tier"
                value={editTier}
                onChange={(e) => setEditTier(e.target.value)}
                className="w-full bg-[#0D0D14] border border-white/10 rounded px-1.5 py-1 text-[11px] text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              >
                {['S', 'A', 'B', 'C', 'X'].map(t => (
                  <option key={t} value={t} className="bg-[#1A1A28] text-[#F0EFE8]">{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-lvl" className="text-[#A09E9A] font-bold uppercase tracking-wider block">Level Snap:</label>
              <input
                id="edit-lvl"
                type="number"
                value={editLevel}
                onChange={(e) => setEditLevel(parseInt(e.target.value) || 1)}
                className="w-full bg-[#0D0D14] border border-white/10 rounded px-1.5 py-1 text-[11px] text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 pt-2 border-t border-white/5 text-[10px] text-[#A09E9A]">
            <div className="flex items-center gap-1.5">
              <span className="text-[#A09E9A] font-bold uppercase tracking-wider">Role:</span>
              <span className="text-[#D4AF37] font-semibold">{host.role === 'Talent' ? 'Star Host' : host.role}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#A09E9A] font-bold uppercase tracking-wider">Base Salary Category:</span>
              <span className="text-[#F0EFE8] font-semibold">{host.base_salary_category || 'Regular Host'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#A09E9A] font-bold uppercase tracking-wider">Assigned Manager:</span>
              <span className="text-[#F0EFE8] font-semibold">{host.manager}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#A09E9A] font-bold uppercase tracking-wider">Team / Anchor Group:</span>
              <span className="text-indigo-400 font-semibold">{host.team} (Tier: {host.tier}, Level: {host.level})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#A09E9A] font-bold uppercase tracking-wider">Status:</span>
              <span className={cn("font-semibold", host.status === 'Active' ? "text-emerald-400" : "text-amber-400")}>{host.status}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderBiographyCard = () => {
    if (!host.description && !isEditing) return null;
    return (
      <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-4 space-y-2 shadow-md">
        <h4 className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest leading-none">BIOGRAPHY</h4>
        {isEditing ? (
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Introduce yourself to the agency..."
            rows={3}
            className="w-full bg-[#0D0D14] border border-white/10 rounded-xl p-2 text-xs text-[#F0EFE8] resize-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none"
          />
        ) : (
          <p className="text-xs text-[#A09E9A] leading-relaxed italic">
            "{host.description || 'No biography or talent assessment provided.'}"
          </p>
        )}
      </div>
    );
  };

  const renderPerformanceHistory = () => (
    <div className="space-y-3 bg-[#1A1A28]/50 border border-white/5 p-4 rounded-2xl">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#A09E9A] font-outfit">Performance History (Section 1)</h4>
        <span className="text-[8px] font-bold text-[#D4AF37] border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          Firestore Query: poppoId
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs mt-2">
          <thead>
            <tr className="border-b border-white/5 text-[#A09E9A] font-bold uppercase tracking-wider">
              <th className="py-2 px-1">Period</th>
              <th className="py-2 px-1">Level</th>
              <th className="py-2 px-1">Live Duration</th>
              <th className="py-2 px-1">Party Duration</th>
              <th className="py-2 px-1 text-right">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300">
            {performanceReports.length > 0 ? (
              performanceReports.map((r, i) => (
                <tr key={i} className="hover:bg-white/2 transition-colors">
                  <td className="py-2.5 px-1 capitalize">{r.periodType} ({r.month}/{r.year})</td>
                  <td className="py-2.5 px-1">Lvl {r.level}</td>
                  <td className="py-2.5 px-1">{(Number(r.liveDurationMinutes || 0) / 60).toFixed(1)} Hrs</td>
                  <td className="py-2.5 px-1">{(Number(r.partyHostDurationMinutes || 0) / 60).toFixed(1)} Hrs</td>
                  <td className="py-2.5 px-1 text-right font-mono text-emerald-400">
                    {Number(r.earningsBreakdown?.totalEarningsOfPoints || 0).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#A09E9A]/40 italic">No historical performance records found in database.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderEarningsTrend = () => {
    if (!performanceReports || performanceReports.length === 0) return null;

    // Filter to last 6 months and sort chronologically
    const last6Months = [...performanceReports]
      .filter((_, idx) => idx < 6)
      .reverse();

    const chartData = last6Months.map(report => ({
      month: `${report.year}-${String(report.month).padStart(2, '0')}`,
      earnings: Number(report.earningsBreakdown?.totalEarningsOfPoints || 0)
    }));

    if (chartData.length === 0) return null;

    // Calculate 3-month average
    const last3Data = chartData.slice(-3);
    const threeMonthAvg = last3Data.length > 0
      ? last3Data.reduce((sum, item) => sum + item.earnings, 0) / last3Data.length
      : 0;

    return (
      <div className="space-y-4 bg-[#1A1A28]/50 border border-white/5 p-5 rounded-2xl">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#A09E9A] font-outfit">Earnings Trend (Last 6 Months)</h4>
          <span className="text-[8px] font-bold text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            3-Mo Avg: {formatNumber(Math.round(threeMonthAvg))}
          </span>
        </div>
        
        <div className="h-48 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 9, fill: '#A09E9A', fontWeight: 'bold' }}
                axisLine={{ stroke: '#ffffff20' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 9, fill: '#A09E9A', fontWeight: 'bold' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#13131E', borderColor: '#ffffff20', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}
                itemStyle={{ color: '#F0EFE8' }}
                labelStyle={{ color: '#D4AF37', marginBottom: '4px' }}
                formatter={(value: number) => [formatNumber(value), 'Points']}
              />
              {threeMonthAvg > 0 && (
                <ReferenceLine 
                  y={threeMonthAvg} 
                  stroke="#D4AF37" 
                  strokeDasharray="3 3" 
                  opacity={0.5} 
                  label={{ position: 'top', value: '3-Mo Avg', fill: '#D4AF37', fontSize: 8, fontWeight: 'bold', offset: 5 }}
                />
              )}
              <Line 
                type="monotone" 
                dataKey="earnings" 
                stroke="#6366f1" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#13131E', stroke: '#6366f1', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#6366f1', stroke: '#F0EFE8', strokeWidth: 2 }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderRandomPK = () => (
    <div className="space-y-3 flex-1">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#A09E9A] font-outfit">RANDOM PK PERFORMANCE</h4>
        <div className="px-2.5 py-0.5 text-[8px] font-bold text-[#D4AF37] border border-[#D4AF37]/30 bg-[#D4AF37]/10 rounded-full uppercase tracking-wider">
          PUBLIC SUMMARY
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-2">
        <button 
          onClick={() => setIsFanbaseFormOpen(true)}
          className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
        >
          Submit Fanbase Report
        </button>
        <button 
          onClick={() => setIsRpkFormOpen(true)}
          className="px-3 py-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
        >
          Submit RPK Report
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2.5 bg-[#1A1A28]/50 border border-white/5 p-3 rounded-2xl">
        {[
          { label: 'PK WIN %', value: `${pkData.win_percentage}%`, subLabel: 'Monthly' },
          { label: 'PK SCORE', value: formatNumber(pkData.pk_score), subLabel: 'Monthly' },
          { label: 'PK SESSIONS', value: String(pkData.sessions), subLabel: 'Weekly' },
        ].map((cell, idx) => (
          <div key={idx} className="bg-[#222235]/40 border border-white/5 p-3 rounded-xl flex flex-col justify-between min-h-[78px] hover:border-[#D4AF37]/20 transition-colors shadow-sm">
            <span className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest leading-none">{cell.label}</span>
            <span className="text-xs md:text-sm font-black text-[#F0EFE8] tracking-tight mt-2.5 block">
              {cell.value}
            </span>
            <span className="text-[7px] font-bold text-[#A09E9A]/60 uppercase tracking-wider mt-1">{cell.subLabel}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEventExposure = () => (
    <div className="space-y-3 bg-[#1A1A28]/50 border border-white/5 p-4 rounded-2xl flex-1">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#A09E9A] font-outfit">Event Exposure (Section 2)</h4>
        <span className="text-[8px] font-bold text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          Total: {participatedEvents.length}
        </span>
      </div>
      <div className="space-y-2 mt-2 max-h-48 overflow-y-auto custom-scrollbar">
        {participatedEvents.length > 0 ? (
          participatedEvents.map((e, idx) => {
            const eventDate = e.eventDate instanceof Timestamp ? e.eventDate.toDate().toLocaleDateString() : (e.eventDate ? new Date(e.eventDate).toLocaleDateString() : 'N/A');
            return (
              <div key={idx} className="bg-[#222235]/40 border border-white/5 p-3 rounded-xl flex items-center justify-between hover:border-[#D4AF37]/20 transition-colors shadow-sm">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#F0EFE8] leading-tight truncate">{e.description || e.eventType}</p>
                  <p className="text-[8px] text-[#A09E9A] font-medium mt-1 truncate">{eventDate} • {e.timeslot}</p>
                </div>
                <span className="text-[8px] font-black uppercase tracking-wider bg-[#1A1A28] border border-white/5 px-2 py-0.5 rounded text-[#A09E9A] shrink-0">
                  {e.status}
                </span>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-[#A09E9A]/40 italic text-center py-6">No historical event participations found for this host.</p>
        )}
      </div>
    </div>
  );

  const renderRpkModal = () => {
    if (!isRpkFormOpen) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-[#13131E] border border-white/10 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative">
          <button 
            title="Close"
            onClick={() => setIsRpkFormOpen(false)}
            className="absolute top-4 right-4 p-1.5 bg-[#1A1A28] border border-white/10 rounded-full text-[#A09E9A] hover:text-[#F0EFE8] cursor-pointer"
          >
            <X size={14} />
          </button>
          
          <h3 className="text-sm font-black uppercase tracking-wider text-[#F0EFE8] mb-1">Submit RPK Report</h3>
          <p className="text-[10px] text-[#A09E9A] mb-4">Submitting performance data for Host: <span className="text-[#D4AF37] font-bold">{host.nickname || host.name}</span></p>

          <form onSubmit={handleRpkSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">From Date (DD-MM-YYYY)</label>
                <input 
                  type="text" 
                  required
                  placeholder="DD-MM-YYYY"
                  value={rpkFormData.from_date}
                  onChange={(e) => setRpkFormData({...rpkFormData, from_date: e.target.value})}
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">To Date (DD-MM-YYYY)</label>
                <input 
                  type="text" 
                  required
                  placeholder="DD-MM-YYYY"
                  value={rpkFormData.to_date}
                  onChange={(e) => setRpkFormData({...rpkFormData, to_date: e.target.value})}
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">PK Wins %</label>
              <input 
                type="text" 
                placeholder="e.g. 75%"
                value={rpkFormData.pk_wins_percent}
                onChange={(e) => setRpkFormData({...rpkFormData, pk_wins_percent: e.target.value})}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">PK Points</label>
              <input 
                type="text" 
                placeholder="Total PK Points"
                value={rpkFormData.pk_points}
                onChange={(e) => setRpkFormData({...rpkFormData, pk_points: e.target.value})}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">PK Sessions</label>
              <input 
                type="text" 
                placeholder="Total Sessions"
                value={rpkFormData.pk_sessions}
                onChange={(e) => setRpkFormData({...rpkFormData, pk_sessions: e.target.value})}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              />
            </div>

            <button 
              type="submit"
              disabled={isSubmittingRpk}
              className="w-full mt-2 py-2.5 bg-[#D4AF37] hover:bg-[#C5A028] text-black rounded-xl text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmittingRpk ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  const renderFanbaseModal = () => {
    if (!isFanbaseFormOpen) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-[#13131E] border border-white/10 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
          <button 
            title="Close"
            onClick={() => setIsFanbaseFormOpen(false)}
            className="absolute top-4 right-4 p-1.5 bg-[#1A1A28] border border-white/10 rounded-full text-[#A09E9A] hover:text-[#F0EFE8] cursor-pointer"
          >
            <X size={14} />
          </button>
          
          <h3 className="text-sm font-black uppercase tracking-wider text-[#F0EFE8] mb-1">Submit Fanbase Report</h3>
          <p className="text-[10px] text-[#A09E9A] mb-4">Submitting data for Host: <span className="text-indigo-400 font-bold">{host.nickname || host.name}</span></p>

          <form onSubmit={handleFanbaseSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">From Date (DD-MM-YYYY)</label>
                <input 
                  type="text" 
                  required
                  placeholder="DD-MM-YYYY"
                  value={fanbaseFormData.from_date}
                  onChange={(e) => setFanbaseFormData({...fanbaseFormData, from_date: e.target.value})}
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">To Date (DD-MM-YYYY)</label>
                <input 
                  type="text" 
                  required
                  placeholder="DD-MM-YYYY"
                  value={fanbaseFormData.to_date}
                  onChange={(e) => setFanbaseFormData({...fanbaseFormData, to_date: e.target.value})}
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Total Followers</label>
              <input 
                type="text" 
                placeholder="0"
                value={fanbaseFormData.total_followers}
                onChange={(e) => setFanbaseFormData({...fanbaseFormData, total_followers: e.target.value})}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Fanclub Subs</label>
                <input 
                  type="text" 
                  placeholder="0"
                  value={fanbaseFormData.fanclub_subscribers}
                  onChange={(e) => setFanbaseFormData({...fanbaseFormData, fanclub_subscribers: e.target.value})}
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Fanclub GC</label>
                <input 
                  type="text" 
                  placeholder="0"
                  value={fanbaseFormData.fanclub_gc_members}
                  onChange={(e) => setFanbaseFormData({...fanbaseFormData, fanclub_gc_members: e.target.value})}
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">GC Host Activity</label>
                <input 
                  type="text" 
                  placeholder="0"
                  value={fanbaseFormData.gc_activity_count_host}
                  onChange={(e) => setFanbaseFormData({...fanbaseFormData, gc_activity_count_host: e.target.value})}
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">GC Fans Activity</label>
                <input 
                  type="text" 
                  placeholder="0"
                  value={fanbaseFormData.gc_activity_count_fans}
                  onChange={(e) => setFanbaseFormData({...fanbaseFormData, gc_activity_count_fans: e.target.value})}
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Notes</label>
              <textarea 
                placeholder="Optional notes..."
                rows={2}
                value={fanbaseFormData.notes}
                onChange={(e) => setFanbaseFormData({...fanbaseFormData, notes: e.target.value})}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <button 
              type="submit"
              disabled={isSubmittingFanbase}
              className="w-full mt-2 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmittingFanbase ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className={cn(
      "w-full text-[#F0EFE8] flex flex-col",
      isSpotlight 
        ? "bg-[#13131E] p-5 space-y-5 relative max-w-md mx-auto border border-white/5 rounded-[24px] shadow-2xl overflow-hidden" 
        : "space-y-6 max-w-4xl mx-auto pb-12 pt-2"
    )}>
      
      {/* Top Header Grid line style */}
      {isSpotlight ? (
        <div className="flex items-center justify-between pb-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            {onClose && (
              <button 
                onClick={onClose}
                className="p-1.5 rounded-full bg-[#1A1A28] hover:bg-[#222235] text-[#A09E9A] hover:text-[#F0EFE8] transition-all border border-white/10 cursor-pointer"
                aria-label="Back to Roster"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-black text-[#F0EFE8] leading-tight tracking-[0.05em]">NINERS</span>
              <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">APP</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#A09E9A]">PUBLIC VIEW</span>
            {onClose && (
              <button 
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-[#1A1A28] border border-white/10 flex items-center justify-center text-[#A09E9A] hover:text-[#F0EFE8] hover:border-[#D4AF37]/45 hover:bg-[#222235] transition-all shadow-md cursor-pointer"
                aria-label="Close Profile Spotlight"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between pb-4 border-b border-white/5 shrink-0">
          <div className="flex flex-col">
            <span className="text-lg font-black text-[#F0EFE8] leading-tight tracking-[0.05em]">MY PROFILE & SETTINGS</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Niners App Portal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D4AF37]/80 bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-3 py-1.5 rounded-full">
              Authenticated Profile
            </span>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]/45">Syncing Profile Metrics...</p>
        </div>
      ) : (
        <div className={cn(
          isSpotlight 
            ? "space-y-5 overflow-y-auto pr-0.5 py-1 custom-scrollbar max-h-[72vh]" 
            : "grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2"
        )}>
          {isSpotlight ? (
            <>
              {renderIdentityCard()}
              {renderBiographyCard()}
              {renderPerformanceHistory()}
              {renderEarningsTrend()}
              <div className="flex flex-col md:flex-row gap-6">
                {renderRandomPK()}
                {renderEventExposure()}
              </div>
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-full mt-4 py-3 bg-[#222235] hover:bg-[#2A2A3F] border border-white/10 hover:border-[#D4AF37]/40 text-[#F0EFE8] hover:text-[#D4AF37] rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer text-center"
                >
                  Close Profile Spotlight
                </button>
              )}
            </>
          ) : (
            <>
              {/* Left Column (Identity & Bio) */}
              <div className="space-y-6 lg:col-span-1">
                {renderIdentityCard()}
                {renderBiographyCard()}
              </div>
              
              {/* Right Column (Metrics & Performance) */}
              <div className="space-y-6 lg:col-span-2">
                {renderEarningsTrend()}
                {renderPerformanceHistory()}
                <div className="flex flex-col md:flex-row gap-6">
                  {renderRandomPK()}
                  {renderEventExposure()}
                </div>
              </div>
            </>
          )}
        </div>
      )}
      
      {renderRpkModal()}
      {renderFanbaseModal()}
    </div>
  );
};

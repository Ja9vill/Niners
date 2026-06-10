import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trophy, Calendar, Search, Trash2, ChevronDown, Check, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { DateRangePicker } from './InteractiveDatePicker';
import { FirebaseService } from '../lib/firebaseService';
import { Host, AwardBadge, AwardAssignment } from '../types';
import { db } from '../lib/firebase';
import { doc, deleteDoc, writeBatch } from 'firebase/firestore';

export const BadgeAndTaskControlPanel = () => {
  const [primaryTab, setPrimaryTab] = useState<'badges' | 'tasks'>('badges');
  const [subTab, setSubTab] = useState<'create' | 'unassigned' | 'assigned'>('create');
  const [createMode, setCreateMode] = useState<'single' | 'bulk'>('single');
  const [isLoading, setIsLoading] = useState(true);

  // Data Arrays
  const [unassignedBadges, setUnassignedBadges] = useState<AwardBadge[]>([]);
  const [assignedBadges, setAssignedBadges] = useState<AwardAssignment[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);

  // Form State - CREATE
  const [badgeName, setBadgeName] = useState('');
  const [badgeColor, setBadgeColor] = useState('Gold');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [bulkMonth, setBulkMonth] = useState('');
  const [bulkYear, setBulkYear] = useState('');

  // Form State - ASSIGN (Modal)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [badgeToAssign, setBadgeToAssign] = useState<AwardBadge | null>(null);
  const [searchMember, setSearchMember] = useState('');
  const [selectedHostId, setSelectedHostId] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Revoke Mode & Delete Selection
  const [isRevokeMode, setIsRevokeMode] = useState(false);
  const [selectedUnassignedIds, setSelectedUnassignedIds] = useState<string[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Load Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [h, a, aa] = await Promise.all([
        FirebaseService.getHosts(),
        FirebaseService.getAwards(),
        FirebaseService.getAwardAssignments()
      ]);
      setHosts(h);
      setAssignedBadges(aa);
      
      // Filter out awards that have already been assigned to show in unassigned
      const assignedAwardIds = new Set(aa.map(x => x.awardId));
      setUnassignedBadges(a.filter(badge => !assignedAwardIds.has(badge.id)));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handlers
  const handleCreateBadge = async () => {
    if (createMode === 'single' && (!badgeName || !startDate || !endDate)) return;
    if (createMode === 'bulk' && (!bulkMonth || !bulkYear)) return;

    setIsProcessing(true);
    try {
      if (createMode === 'single') {
        const awardId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
        const newBadge: AwardBadge = {
          id: awardId,
          name: badgeName,
          color: badgeColor,
          startDate,
          endDate,
          createdAt: new Date().toISOString()
        };
        await FirebaseService.saveAwards([newBadge]);
        setBadgeName('');
        setStartDate('');
        setEndDate('');
      } else {
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const monthIndex = parseInt(bulkMonth, 10) - 1;
        const monthName = months[monthIndex];
        const yearNum = parseInt(bulkYear, 10);
        const pad = (n: number) => String(n).padStart(2, '0');
        const startDateStr = `${yearNum}-${pad(parseInt(bulkMonth))}-01`;
        const lastDay = new Date(yearNum, monthIndex + 1, 0).getDate();
        const endDateStr = `${yearNum}-${pad(parseInt(bulkMonth))}-${pad(lastDay)}`;
        
        const newAwardsList: AwardBadge[] = [];
        for (let rank = 1; rank <= 9; rank++) {
          const awardId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
          let color = 'Gold';
          if (rank >= 4 && rank <= 6) color = 'Orange';
          else if (rank >= 7) color = 'Red';
          
          newAwardsList.push({
            id: awardId,
            name: `Top ${rank} Niner - ${monthName} ${bulkYear}`,
            color,
            startDate: startDateStr,
            endDate: endDateStr,
            createdAt: new Date().toISOString()
          });
        }
        await FirebaseService.saveAwards(newAwardsList);
        setBulkMonth('');
        setBulkYear('');
      }
      
      await loadData();
      setSubTab('unassigned');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssignBadge = async () => {
    if (!badgeToAssign || !selectedHostId) return;
    const hostInfo = hosts.find(h => h.id === selectedHostId);
    if (!hostInfo) return;

    setIsProcessing(true);
    try {
      const assignmentId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      const newAssignment: AwardAssignment = {
        id: assignmentId,
        awardId: badgeToAssign.id,
        awardName: badgeToAssign.name,
        awardColor: badgeToAssign.color,
        hostId: hostInfo.id,
        hostNickname: hostInfo.nickname || hostInfo.name,
        startDate: badgeToAssign.startDate,
        endDate: badgeToAssign.endDate,
        assignedAt: new Date().toISOString()
      };

      await FirebaseService.saveAwardAssignments([newAssignment]);
      await loadData(); // Refresh to move it to assigned
      
      // Reset Modal
      setBadgeToAssign(null);
      setSearchMember('');
      setSelectedHostId('');
      setIsAssignModalOpen(false);
      setSubTab('assigned');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUnassignedIds.length === 0) return;
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      selectedUnassignedIds.forEach(id => {
        batch.delete(doc(db, 'awards', id));
      });
      await batch.commit();
      setSelectedUnassignedIds([]);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkRevoke = async () => {
    if (selectedUnassignedIds.length === 0) return;
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      selectedUnassignedIds.forEach(id => {
        batch.delete(doc(db, 'award_assignments', id));
      });
      await batch.commit();
      setSelectedUnassignedIds([]);
      await loadData(); // Reload will bring the badges back to unassigned
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedUnassignedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredHosts = useMemo(() => {
    if (!searchMember) return [];
    const q = searchMember.toLowerCase();
    return hosts.filter(h => {
      const isTargetRole = String(h.role || '').toLowerCase().replace('_', ' ') !== 'director';
      if (!isTargetRole) return false;
      return (
        (h.name && h.name.toLowerCase().includes(q)) || 
        (h.nickname && h.nickname.toLowerCase().includes(q)) || 
        (h.poppo_id && String(h.poppo_id).toLowerCase().includes(q)) ||
        (h.poppoId && String(h.poppoId).toLowerCase().includes(q)) ||
        (h.id && String(h.id).toLowerCase().includes(q))
      );
    });
  }, [searchMember, hosts]);

  if (isLoading && unassignedBadges.length === 0 && assignedBadges.length === 0) {
    return (
      <div className="w-full bg-[#0D0D14] text-white p-6 rounded-2xl border border-white/5 shadow-2xl flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
      </div>
    );
  }

  return (
    <div className="w-full bg-[#0A0A0F]/90 backdrop-blur-xl text-white p-6 rounded-2xl border-2 border-[#D4AF37]/30 shadow-[0_0_25px_rgba(212,175,55,0.2)] relative">
      
      {/* 1. Header & Primary Navigation */}
      <header className="space-y-6">
        <div className="space-y-1 text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#F0EFE8]">BADGE & TASK ASSIGNMENT</h1>
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#A09E9A]/50">
            Admin Delegation Control Panel
          </p>
        </div>

        <div className="flex bg-[#1A1A28] p-1.5 rounded-full border border-white/5 overflow-hidden">
          <button
            onClick={() => setPrimaryTab('badges')}
            className={cn(
              "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-full transition-all duration-300",
              primaryTab === 'badges' 
                ? "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]" 
                : "text-[#A09E9A]/50 hover:text-white border border-transparent"
            )}
          >
            Badges
          </button>
          <button
            onClick={() => setPrimaryTab('tasks')}
            className={cn(
              "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-full transition-all duration-300",
              primaryTab === 'tasks' 
                ? "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]" 
                : "text-[#A09E9A]/50 hover:text-white border border-transparent"
            )}
          >
            Task
          </button>
        </div>
      </header>

      {primaryTab === 'badges' && (
        <div className="space-y-8 mt-8">
          {/* 2. Secondary Navigation (Merged 3 Sub-tabs) */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 overflow-x-auto custom-scrollbar">
            <button
              onClick={() => {
                setSubTab('create');
                setIsRevokeMode(false);
                setSelectedUnassignedIds([]);
              }}
              className={cn(
                "flex-1 min-w-[100px] py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-lg transition-all",
                subTab === 'create' 
                  ? "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/50" 
                  : "text-[#A09E9A]/50 hover:text-white border border-transparent"
              )}
            >
              Create
            </button>
            <button
              onClick={() => {
                setSubTab('unassigned');
                setIsRevokeMode(false);
                setSelectedUnassignedIds([]);
              }}
              className={cn(
                "flex-1 min-w-[120px] py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5",
                subTab === 'unassigned' 
                  ? "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/50" 
                  : "text-[#A09E9A]/50 hover:text-white border border-transparent"
              )}
            >
              Unassigned 
              <span className="text-[9px] bg-black/40 px-1.5 rounded">{unassignedBadges.length}</span>
            </button>
            <button
              onClick={() => {
                setSubTab('assigned');
                setIsRevokeMode(false);
                setSelectedUnassignedIds([]);
              }}
              className={cn(
                "flex-1 min-w-[120px] py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5",
                subTab === 'assigned' 
                  ? "bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/50" 
                  : "text-[#A09E9A]/50 hover:text-white border border-transparent"
              )}
            >
              Assigned 
              <span className="text-[9px] bg-black/40 px-1.5 rounded">{assignedBadges.length}</span>
            </button>
          </div>

          {/* 3. 'CREATE' View UI */}
          {subTab === 'create' && (
            <div className="space-y-6 bg-white/[0.02] p-5 rounded-2xl border border-white/5 animate-in fade-in">
              
              {/* Creation Mode Toggle */}
              <div className="space-y-1.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <label className="text-[9px] font-black uppercase text-[#A09E9A]/60 tracking-wider">Creation Mode</label>
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 w-fit">
                  <button
                    onClick={() => setCreateMode('single')}
                    className={cn(
                      "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                      createMode === 'single'
                        ? "bg-[#D4AF37] text-black"
                        : "text-[#A09E9A]/60 hover:text-white"
                    )}
                  >
                    Single
                  </button>
                  <button
                    onClick={() => setCreateMode('bulk')}
                    className={cn(
                      "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                      createMode === 'bulk'
                        ? "bg-[#D4AF37] text-black"
                        : "text-[#A09E9A]/60 hover:text-white"
                    )}
                  >
                    Bulk Top 9
                  </button>
                </div>
              </div>

              {/* Form Inputs */}
              {createMode === 'single' ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-[#A09E9A]/60 tracking-wider">Badge Name</label>
                    <input 
                      type="text" 
                      value={badgeName}
                      onChange={(e) => setBadgeName(e.target.value)}
                      placeholder="e.g. Star Host" 
                      className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-3 text-sm text-[#F0EFE8] placeholder:text-[#A09E9A]/30 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-[#A09E9A]/60 tracking-wider">Badge Color</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Trophy size={16} className={cn(
                          badgeColor === 'Gold' ? "text-[#D4AF37]" : badgeColor === 'Orange' ? "text-orange-400" : "text-red-500"
                        )} />
                      </div>
                      <select 
                        title="Badge Color"
                        value={badgeColor}
                        onChange={(e) => setBadgeColor(e.target.value)}
                        className="w-full bg-transparent border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-[#F0EFE8] appearance-none focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30 transition-colors cursor-pointer"
                      >
                        <option value="Gold" className="bg-[#0D0D14]">Gold</option>
                        <option value="Orange" className="bg-[#0D0D14]">Orange</option>
                        <option value="Red" className="bg-[#0D0D14]">Red</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <ChevronDown size={14} className="text-[#A09E9A]/50" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-[#A09E9A]/60 tracking-wider">Effectivity Period</label>
                    <DateRangePicker 
                      startDate={startDate}
                      endDate={endDate}
                      onChange={(s, e) => {
                        setStartDate(s);
                        setEndDate(e);
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-[#A09E9A]/60 tracking-wider">Select Period</label>
                    <div className="flex gap-2">
                      <select 
                        title="Bulk Month"
                        value={bulkMonth}
                        onChange={e => setBulkMonth(e.target.value)}
                        className="flex-1 bg-transparent border border-white/10 rounded-xl px-4 py-3 text-sm text-[#F0EFE8] appearance-none focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30 transition-colors cursor-pointer"
                      >
                        <option value="" className="bg-[#0D0D14]">Select Month</option>
                        {Array.from({length: 12}).map((_, i) => (
                          <option key={i} value={String(i + 1).padStart(2, '0')} className="bg-[#0D0D14]">
                            {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                      <select 
                        title="Bulk Year"
                        value={bulkYear}
                        onChange={e => setBulkYear(e.target.value)}
                        className="w-1/3 bg-transparent border border-white/10 rounded-xl px-4 py-3 text-sm text-[#F0EFE8] appearance-none focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/30 transition-colors cursor-pointer"
                      >
                        <option value="" className="bg-[#0D0D14]">Year</option>
                        {['2025', '2026', '2027'].map(y => (
                          <option key={y} value={y} className="bg-[#0D0D14]">{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-xs text-[#A09E9A] leading-relaxed">
                    This will automatically generate 9 custom badges (Top 1 to 9 Niner) colored by rank thresholds for the selected month.
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button 
                onClick={handleCreateBadge}
                disabled={isProcessing || (createMode === 'single' ? (!badgeName || !startDate || !endDate) : (!bulkMonth || !bulkYear))}
                className="w-full py-4 flex justify-center items-center gap-2 bg-[#D4AF37] disabled:bg-[#D4AF37]/50 disabled:cursor-not-allowed hover:bg-[#F2CD5C] text-black rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] active:scale-[0.98]">
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : null}
                {createMode === 'single' ? 'Create Badge' : 'Generate 9 Badges'}
              </button>
            </div>
          )}

          {/* 4. 'UNASSIGNED' View UI */}
          {subTab === 'unassigned' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-start gap-3 px-1">
                <label className="flex items-center gap-2 cursor-pointer group bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                  <input 
                    type="checkbox" 
                    checked={isRevokeMode}
                    onChange={(e) => {
                      setIsRevokeMode(e.target.checked);
                      setSelectedUnassignedIds([]); 
                    }}
                    className="w-3.5 h-3.5 rounded border-white/20 bg-black/50 text-[#FFB800] focus:ring-[#FFB800] focus:ring-offset-0" 
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A] group-hover:text-white transition-colors">Remove</span>
                </label>

                {isRevokeMode && selectedUnassignedIds.length > 0 && (
                  <button 
                    onClick={handleBulkDelete}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:bg-red-500/30 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 size={12} className="animate-spin" /> : null}
                    Remove
                  </button>
                )}
              </div>

              {unassignedBadges.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-4 bg-[#0A0806] rounded-2xl border border-[#1A140A]">
                  {unassignedBadges.map((badge) => {
                    const isSelected = selectedUnassignedIds.includes(badge.id);
                    return (
                      <button
                        key={badge.id}
                        disabled={isProcessing}
                        onClick={() => {
                          if (isRevokeMode) {
                            toggleSelection(badge.id);
                          } else {
                            setBadgeToAssign(badge);
                            setIsAssignModalOpen(true);
                          }
                        }}
                        className={cn(
                          "px-4 py-3 sm:py-4 rounded-[1.5rem] border text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all text-center flex items-center justify-center",
                          isSelected 
                            ? "border-white/10 bg-[#0A0806] text-[#A09E9A] shadow-none"
                            : "border-[#FFB800] text-[#FFB800] shadow-[0_0_20px_rgba(255,184,0,0.3)] bg-black hover:bg-[#1A140A]"
                        )}
                      >
                        <span className="drop-shadow-md truncate">{badge.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-2xl p-8 text-center">
                  <p className="text-xs text-[#A09E9A]/40 font-medium italic">No unassigned badges available.</p>
                </div>
              )}
            </div>
          )}

          {/* 5. 'ASSIGNED' View UI */}
          {subTab === 'assigned' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-start gap-3 px-1">
                <label className="flex items-center gap-2 cursor-pointer group bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                  <input 
                    type="checkbox" 
                    checked={isRevokeMode}
                    onChange={(e) => {
                      setIsRevokeMode(e.target.checked);
                      setSelectedUnassignedIds([]); 
                    }}
                    className="w-3.5 h-3.5 rounded border-white/20 bg-black/50 text-[#FFB800] focus:ring-[#FFB800] focus:ring-offset-0" 
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A] group-hover:text-white transition-colors">Revoke</span>
                </label>

                {isRevokeMode && selectedUnassignedIds.length > 0 && (
                  <button 
                    onClick={handleBulkRevoke}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:bg-red-500/30 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 size={12} className="animate-spin" /> : null}
                    Revoke
                  </button>
                )}
              </div>
              
              {assignedBadges.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-4 bg-[#0A0806] rounded-2xl border border-[#1A140A]">
                  {assignedBadges.map(assignment => {
                    const isSelected = selectedUnassignedIds.includes(assignment.id);
                    return (
                      <button
                        key={assignment.id}
                        disabled={isProcessing}
                        onClick={() => {
                          if (isRevokeMode) {
                            toggleSelection(assignment.id);
                          }
                        }}
                        className={cn(
                          "px-4 py-3 sm:py-4 rounded-[1.5rem] border text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all text-center flex items-center justify-center",
                          isSelected 
                            ? "border-white/10 bg-[#0A0806] text-[#A09E9A] shadow-none"
                            : "border-[#FFB800] text-[#FFB800] shadow-[0_0_20px_rgba(255,184,0,0.3)] bg-black hover:bg-[#1A140A]"
                        )}
                      >
                        <span className="drop-shadow-md truncate">{assignment.awardName}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-2xl p-8 text-center">
                  <p className="text-xs text-[#A09E9A]/40 font-medium italic">No active assignments.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {primaryTab === 'tasks' && (
        <div className="py-20 mt-8 text-center text-[#A09E9A]/40 text-sm font-medium border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
          Task delegation controls will appear here.
        </div>
      )}

      {/* 6. Spotlight Modal for ASSIGN */}
      {isAssignModalOpen && badgeToAssign && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#0A0A0F]/90 backdrop-blur-xl border border-[#D4AF37]/20 rounded-3xl w-full max-w-md shadow-[0_0_20px_rgba(212,175,55,0.15)] overflow-hidden" ref={searchContainerRef}>
            <div className="p-5 border-b border-[#D4AF37]/20 flex items-center justify-between bg-transparent">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
                <Trophy size={16} className="text-[#D4AF37]" />
                Assign Badge
              </h3>
              <button 
                title="Close Modal"
                onClick={() => {
                  setIsAssignModalOpen(false);
                  setBadgeToAssign(null);
                  setSelectedHostId('');
                  setSearchMember('');
                }} 
                className="text-[#A09E9A] hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-[#A09E9A]/60 tracking-wider">Selected Badge</label>
                <input 
                  title="Selected Badge"
                  placeholder="Selected Badge"
                  type="text" 
                  value={badgeToAssign.name} 
                  disabled 
                  className="w-full bg-[#0D0D14] border border-[#D4AF37]/20 rounded-xl px-4 py-3 text-sm text-[#D4AF37] opacity-70" 
                />
              </div>
              
              <div className="space-y-1.5 relative">
                <label className="text-[9px] font-black uppercase text-[#A09E9A]/60 tracking-wider">Search Member</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-[#A09E9A]/50" />
                  </div>
                  <input 
                    type="text" 
                    value={searchMember}
                    onChange={(e) => {
                      setSearchMember(e.target.value);
                      setIsDropdownOpen(true);
                      if (selectedHostId) setSelectedHostId('');
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder="Search nickname, name or ID..." 
                    className="w-full bg-[#0D0D14] border border-[#D4AF37]/20 rounded-xl pl-10 pr-4 py-3 text-sm text-[#F0EFE8] placeholder:text-[#A09E9A]/30 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 transition-colors shadow-inner"
                  />
                </div>
                
                {/* Autocomplete Dropdown */}
                {isDropdownOpen && searchMember && (
                  <div className="absolute z-[110] w-full mt-2 bg-[#0D0D14]/95 backdrop-blur-xl border border-[#D4AF37]/20 rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.15)] max-h-48 overflow-y-auto custom-scrollbar">
                    {filteredHosts.length > 0 ? (
                      filteredHosts.map(host => (
                        <button
                          key={host.id}
                          onClick={() => {
                            const actualId = host.poppo_id || host.poppoId || host.id;
                            setSelectedHostId(host.id);
                            setSearchMember(`${host.nickname || host.name} (${actualId})`);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-[#D4AF37]/10 transition-colors flex items-center justify-between group"
                        >
                          <div>
                            <p className="text-sm font-bold text-[#F0EFE8] group-hover:text-[#D4AF37] transition-colors">{host.nickname || host.name}</p>
                            <p className="text-[10px] text-[#A09E9A]">ID: {host.poppo_id || host.poppoId || host.id}</p>
                          </div>
                          {selectedHostId === host.id && <Check size={14} className="text-[#D4AF37]" />}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-xs text-[#A09E9A]">No members found.</div>
                    )}
                  </div>
                )}
              </div>
              
              <button 
                onClick={handleAssignBadge}
                disabled={!selectedHostId || isProcessing}
                className="w-full py-4 flex justify-center items-center gap-2 bg-[#D4AF37] disabled:bg-[#D4AF37]/50 disabled:cursor-not-allowed hover:bg-[#F2CD5C] text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] active:scale-[0.98]"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : null}
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search } from 'lucide-react';
import { LivehouseRequest } from '../types';
import { Storage } from '../lib/storage';
import { FirebaseService, generateSubmissionId } from '../lib/firebaseService';

interface LivehouseBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillDate: string;
  prefillTimeslot: string;
  auth: any;
  hosts: any[];
  livehouseRequests: LivehouseRequest[];
  setLivehouseRequests: (reqs: LivehouseRequest[]) => void;
}

export const LivehouseBookingModal: React.FC<LivehouseBookingModalProps> = ({
  isOpen, onClose, prefillDate, prefillTimeslot, auth, hosts, livehouseRequests, setLivehouseRequests
}) => {
  const [date, setDate] = useState(prefillDate || '');
  const [timeslot, setTimeslot] = useState(prefillTimeslot || '');
  const [targetPoppoId, setTargetPoppoId] = useState('');
  const [targetHostName, setTargetHostName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedType, setSelectedType] = useState<'SOLO LIVEHOUSE' | 'PARTY LIVEHOUSE'>('SOLO LIVEHOUSE');

  const isHostRole = ['host', 'talent'].includes(String(auth?.role || '').toLowerCase());
  const isLoggedIn = !!auth?.poppo_id;

  useEffect(() => {
    if (isOpen) {
      setDate(prefillDate || new Date().toISOString().split('T')[0]);
      setTimeslot(prefillTimeslot || '');
      setNotes('');
      if (isHostRole) {
        setTargetPoppoId(auth?.poppo_id || '');
        setTargetHostName(auth?.nickname || auth?.name || '');
      } else {
        setTargetPoppoId('');
        setTargetHostName('');
        setSearchQuery('');
        setIsDropdownOpen(false);
      }
    }
  }, [isOpen, prefillDate, prefillTimeslot, isHostRole, auth]);

  const filteredHosts = hosts.filter(h => {
    if (!searchQuery) return true;
    const sq = searchQuery.toLowerCase();
    const id = String(h.id || h.poppo_id || '').toLowerCase();
    const name = String(h.nickname || h.name || '').toLowerCase();
    return id.includes(sq) || name.includes(sq);
  }).slice(0, 10);

  const handleSelectHost = (host: any) => {
    setTargetPoppoId(host.id || host.poppo_id || '');
    setTargetHostName(host.nickname || host.name || '');
    setSearchQuery('');
    setIsDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeslot || !date) {
      alert("Please ensure Date and Timeslot are provided.");
      return;
    }
    if (!targetPoppoId || !targetHostName) {
      alert("Please select a Host for this request.");
      return;
    }

    const hostPoppoId = targetPoppoId;
    const hostName = targetHostName;

    // Find assigned manager Poppo ID
    const currentHost = hosts.find(h => h.id === hostPoppoId || h.poppo_id === hostPoppoId);
    const managerName = currentHost?.manager || 'Director Miss Nine';
    const managerHost = hosts.find(h => h.nickname === managerName || h.name === managerName);
    const managerId = managerHost?.id || managerHost?.poppo_id || '19157913'; 

    const reporterPoppoId = !isHostRole ? auth?.poppo_id : auth?.poppo_id;
    const reporterRoleStr = !isHostRole ? auth?.role : 'Host';
    const reporterNameStr = !isHostRole ? (auth?.nickname || auth?.name) : (auth?.nickname || auth?.name);

    const newRequest: LivehouseRequest = {
      id: generateSubmissionId(reporterPoppoId, reporterRoleStr, reporterNameStr),
      poppoId: hostPoppoId,
      name: hostName,
      date,
      timeslot,
      status: 'Pending Approval',
      managerId,
      notes,
      livehouseType: selectedType,
      proposedBy: isHostRole ? 'Host' : String(auth?.role || 'User'),
      reporterId: !isHostRole ? auth?.poppo_id : undefined,
      reporterName: !isHostRole ? (auth?.nickname || auth?.name) : undefined,
      reporterRole: !isHostRole ? auth?.role : undefined,
      timestamp: new Date().toISOString()
    };

    const updatedRequests = [...livehouseRequests, newRequest];
    setLivehouseRequests(updatedRequests);
    Storage.setLivehouseRequests(updatedRequests);

    try {
      await FirebaseService.saveLivehouseRequests(updatedRequests);
      await FirebaseService.logSystemActivity(`Host requested livehouse timeslot: ${timeslot} on ${date} (Host: ${hostName}, Poppo ID: ${hostPoppoId}, Type: ${selectedType}, Notes: "${notes}")`, 'Info');
    } catch (err) {
      console.error("Firestore sync failed for reservation request:", err);
    }

    Storage.addLog('Calendar', `Requested livehouse slot: ${timeslot} on ${date}`, hostName);
    Storage.addNotification({
      title: 'New Livehouse Request',
      message: `Host ${hostName} (${hostPoppoId}) requested Livehouse slot on ${date} at ${timeslot}.`,
      type: 'info'
    });

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card w-full max-w-lg rounded-3xl overflow-hidden z-10 max-h-[90vh] overflow-y-auto custom-scrollbar p-0 bg-[#0A0B0E] border border-[#D4AF37]/30 shadow-2xl shadow-[#D4AF37]/10">
            <div className="p-6 border-b border-[#D4AF37]/20 font-black text-[#D4AF37] uppercase tracking-widest text-[12px] bg-[#1a120e]">
              REQUEST NEW LIVEHOUSE EVENT
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <fieldset disabled={!isLoggedIn} className="space-y-5 group">
                
                {!isLoggedIn && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center mb-4">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">You must be logged in to request a Livehouse Event</span>
                  </div>
                )}
              
              {!isHostRole && (
                <div className="grid grid-cols-3 gap-4 mb-2 p-3 rounded-xl border border-white/10 bg-white/5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Reporter ID</label>
                    <div className="text-[11px] font-bold text-white/70">{auth?.poppo_id}</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Reporter Name</label>
                    <div className="text-[11px] font-bold text-white/70">{auth?.nickname || auth?.name}</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Role</label>
                    <div className="text-[11px] font-bold text-white/70">{auth?.role}</div>
                  </div>
                </div>
              )}

              {isHostRole ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Poppo ID (Locked)</label>
                    <input 
                      disabled 
                      value={targetPoppoId} 
                      className="w-full bg-black/50 border border-[#D4AF37]/20 rounded-xl px-4 py-3 text-xs text-white/50 cursor-not-allowed" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Host Name (Locked)</label>
                    <input 
                      disabled 
                      value={targetHostName} 
                      className="w-full bg-black/50 border border-[#D4AF37]/20 rounded-xl px-4 py-3 text-xs text-white/50 cursor-not-allowed" 
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 relative">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Search & Select Host</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search size={14} className="text-[#D4AF37]/50" />
                    </div>
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                      placeholder="Search by name, nickname or Poppo ID..."
                      className="w-full bg-[#181B24] border border-[#D4AF37]/20 focus:border-[#D4AF37]/60 rounded-xl pl-9 pr-4 py-3 text-xs text-white transition-all"
                    />
                  </div>
                  
                  {isDropdownOpen && searchQuery && (
                    <div className="absolute z-50 mt-1 w-full bg-[#0A0B0E] border border-[#D4AF37]/30 rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
                      {filteredHosts.length > 0 ? (
                        filteredHosts.map(h => (
                          <div 
                            key={h.id || h.poppo_id}
                            onMouseDown={() => handleSelectHost(h)}
                            className="px-4 py-2 hover:bg-[#D4AF37]/20 cursor-pointer border-b border-white/5 last:border-0 flex justify-between items-center"
                          >
                            <span className="text-xs text-white font-bold">{h.nickname || h.name}</span>
                            <span className="text-[10px] text-[#D4AF37]">{h.id || h.poppo_id}</span>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-xs text-white/50 text-center">No hosts found</div>
                      )}
                    </div>
                  )}
                  
                  {targetPoppoId && (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="bg-black/40 border border-[#D4AF37]/20 rounded-lg px-3 py-2">
                        <span className="block text-[8px] text-white/40 uppercase tracking-widest">Selected Poppo ID</span>
                        <span className="text-xs text-[#D4AF37] font-bold">{targetPoppoId}</span>
                      </div>
                      <div className="bg-black/40 border border-[#D4AF37]/20 rounded-lg px-3 py-2">
                        <span className="block text-[8px] text-white/40 uppercase tracking-widest">Selected Host Name</span>
                        <span className="text-xs text-[#D4AF37] font-bold">{targetHostName}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Date</label>
                  <input 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    type={prefillDate ? 'text' : 'date'}
                    disabled={!!prefillDate}
                    className="w-full bg-[#181B24] border border-[#D4AF37]/20 focus:border-[#D4AF37]/60 rounded-xl px-4 py-3 text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all" 
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Timeslot</label>
                  <input 
                    value={timeslot} 
                    onChange={(e) => setTimeslot(e.target.value)}
                    placeholder="e.g. 07:00 PM - 08:00 PM"
                    disabled={!!prefillTimeslot}
                    className="w-full bg-[#181B24] border border-[#D4AF37]/20 focus:border-[#D4AF37]/60 rounded-xl px-4 py-3 text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all" 
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Livehouse Type</label>
                <select 
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="w-full bg-[#181B24] border border-[#D4AF37]/20 focus:border-[#D4AF37]/60 rounded-xl px-4 py-3 text-xs font-bold text-white transition-all cursor-pointer"
                >
                  <option value="SOLO LIVEHOUSE">SOLO LIVEHOUSE</option>
                  <option value="PARTY LIVEHOUSE">PARTY LIVEHOUSE</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Additional Notes</label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requirements, guests, or themes?" 
                  rows={3} 
                  className="w-full bg-[#181B24] border border-[#D4AF37]/20 focus:border-[#D4AF37]/60 rounded-xl px-4 py-3 text-xs text-white custom-scrollbar resize-none transition-all" 
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button type="button" onClick={onClose} className="flex-1 py-3 bg-black/40 hover:bg-black/60 border border-white/10 hover:border-white/20 text-white/70 text-xs font-black uppercase tracking-widest rounded-xl transition-all">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!isLoggedIn}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                    isLoggedIn 
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#b8960c] hover:brightness-110 text-[#0c0806] shadow-[0_0_20px_rgba(212,175,55,0.3)]' 
                      : 'bg-black/40 border border-white/10 text-white/30 cursor-not-allowed'
                  }`}
                >
                  {isLoggedIn ? 'Submit Request' : 'Login Required'}
                </button>
              </div>
              </fieldset>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

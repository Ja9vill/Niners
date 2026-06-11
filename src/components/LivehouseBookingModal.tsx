import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LivehouseRequest } from '../types';
import { Storage } from '../lib/storage';
import { FirebaseService } from '../lib/firebaseService';

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
  const [notes, setNotes] = useState('');
  const [selectedType, setSelectedType] = useState<'SOLO LIVEHOUSE' | 'PARTY LIVEHOUSE'>('SOLO LIVEHOUSE');

  // Update local state when prefills change, though typically they mount with the component
  React.useEffect(() => {
    if (isOpen) {
      setDate(prefillDate || new Date().toISOString().split('T')[0]);
      setTimeslot(prefillTimeslot || '');
      setNotes('');
    }
  }, [isOpen, prefillDate, prefillTimeslot]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeslot || !date) {
      alert("Please ensure Date and Timeslot are provided.");
      return;
    }

    const hostPoppoId = auth.poppo_id;
    const hostName = auth.nickname || auth.name || 'Niner Host';

    // Find assigned manager Poppo ID
    const currentHost = hosts.find(h => h.id === hostPoppoId || h.poppo_id === hostPoppoId);
    const managerName = currentHost?.manager || 'Director Miss Nine';
    const managerHost = hosts.find(h => h.nickname === managerName || h.name === managerName);
    const managerId = managerHost?.id || managerHost?.poppo_id || '19157913'; 

    const newRequest: LivehouseRequest = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      poppoId: hostPoppoId,
      name: hostName,
      date,
      timeslot,
      status: 'Pending Approval',
      managerId,
      notes,
      livehouseType: selectedType,
      proposedBy: 'Host',
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
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Poppo ID (Locked)</label>
                  <input 
                    disabled 
                    value={auth.poppo_id || ''} 
                    className="w-full bg-black/50 border border-[#D4AF37]/20 rounded-xl px-4 py-3 text-xs text-white/50 cursor-not-allowed" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Host Name (Locked)</label>
                  <input 
                    disabled 
                    value={auth.nickname || auth.name || ''} 
                    className="w-full bg-black/50 border border-[#D4AF37]/20 rounded-xl px-4 py-3 text-xs text-white/50 cursor-not-allowed" 
                  />
                </div>
              </div>

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
                <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-[#D4AF37] to-[#b8960c] hover:brightness-110 text-[#0c0806] text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)]">
                  Submit Request
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

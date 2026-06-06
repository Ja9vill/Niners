import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Plus, Trash2, Send, Info, AlertCircle } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Storage } from '../lib/storage';
import { FirebaseService } from '../lib/firebaseService';
import { SingleDatePicker } from './InteractiveDatePicker';
import { cn } from '../lib/utils';

interface AddEventFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const AddEventForm: React.FC<AddEventFormProps> = ({ onSuccess, onCancel }) => {
  const [hosts, setHosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const auth = Storage.getAuthState();

  // Load database hosts on mount
  useEffect(() => {
    const loadHosts = async () => {
      setIsLoading(true);
      setErrors([]);
      try {
        const usersList = await FirebaseService.getAllRoleMetadata();
        const filteredHosts = usersList.filter(u => {
          const r = String(u.role || '').toLowerCase();
          return r === 'host' || r === 'talent';
        });
        setHosts(filteredHosts);
      } catch (err: any) {
        console.error('[AddEventForm] Error loading hosts:', err);
        setErrors([err.message || 'Failed to sync registry details from Database']);
      } finally {
        setIsLoading(false);
      }
    };
    loadHosts();
  }, []);

  // Form State
  const [eventDate, setEventDate] = useState('');
  const [eventTimeHour, setEventTimeHour] = useState('09');
  const [eventTimeMinute, setEventTimeMinute] = useState('00');
  const [eventTimeAmpm, setEventTimeAmpm] = useState('AM');
  const [eventType, setEventType] = useState('SOLO LIVEHOUSE');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  
  // SOLO LIVEHOUSE states
  const [soloPoppoId, setSoloPoppoId] = useState('');
  const [soloNickname, setSoloNickname] = useState('');

  // Other types states
  interface ParticipantSlot {
    type: 'agency' | 'manual';
    poppoId: string;
    name: string;
  }
  const [participantsList, setParticipantsList] = useState<ParticipantSlot[]>([{ type: 'agency', poppoId: '', name: '' }]);

  // SOLO LIVEHOUSE cross-autofill logic
  const handleSoloPoppoIdChange = (val: string) => {
    setSoloPoppoId(val);
    const match = hosts.find(h => String(h.id) === val.trim());
    if (match) {
      setSoloNickname(match.nickname || match.name || '');
    }
  };

  const handleSoloNicknameChange = (val: string) => {
    setSoloNickname(val);
    const match = hosts.find(h => String(h.nickname || h.name).toLowerCase() === val.trim().toLowerCase());
    if (match) {
      setSoloPoppoId(String(match.id));
    }
  };

  const computedTimeStr = `${eventTimeHour}:${eventTimeMinute} ${eventTimeAmpm} Manila Time`;

  // Dynamic Event ID Preview
  const computedEventId = useMemo(() => {
    if (!eventDate) return '(Select a date to generate ID)';
    const cleanDate = eventDate.replace(/[^a-zA-Z0-9]/g, '-');
    const cleanTime = computedTimeStr.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const cleanType = eventType.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    const now = new Date();
    const timestamp = now.getTime();
    const hhmmss = now.toTimeString().split(' ')[0]; // hh:mm:ss format
    return `${cleanDate}_${cleanTime}_${cleanType}_${timestamp}_${hhmmss}`;
  }, [eventDate, computedTimeStr, eventType]);

  const handleAddParticipantSlot = () => {
    if (participantsList.length < 9) {
      setParticipantsList([...participantsList, { type: 'agency', poppoId: '', name: '' }]);
    }
  };

  const handleRemoveParticipantSlot = (index: number) => {
    if (participantsList.length > 1) {
      setParticipantsList(participantsList.filter((_, idx) => idx !== index));
    } else {
      setParticipantsList([{ type: 'agency', poppoId: '', name: '' }]);
    }
  };

  const handleParticipantChange = (index: number, field: keyof ParticipantSlot, val: string) => {
    const updated = [...participantsList];
    updated[index] = { ...updated[index], [field]: val };
    
    // Auto-fill name if changing agency poppoId
    if (field === 'poppoId' && updated[index].type === 'agency') {
      const match = hosts.find(h => String(h.id) === val);
      updated[index].name = match ? (match.nickname || match.name || '') : '';
    }
    
    setParticipantsList(updated);
  };

  const handleParticipantTypeToggle = (index: number, type: 'agency' | 'manual') => {
    const updated = [...participantsList];
    updated[index] = { type, poppoId: '', name: '' };
    setParticipantsList(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMsg('');

    if (!eventDate) {
      setErrors(['Please select an event date.']);
      return;
    }

    let validParticipants: string[] = [];
    let firstParticipantNickname = '';

    if (eventType === 'SOLO LIVEHOUSE') {
      if (!soloPoppoId.trim()) {
        setErrors(['Poppo ID is required for SOLO LIVEHOUSE.']);
        return;
      }
      validParticipants = [soloPoppoId.trim()];
      const match = hosts.find(h => String(h.id) === soloPoppoId.trim());
      firstParticipantNickname = match ? (match.nickname || match.name || '') : soloNickname.trim() || 'Solo Host';
    } else {
      // Filter valid participants (non-empty poppoId)
      const nonHex = participantsList.filter(p => p.poppoId.trim() !== '');
      if (nonHex.length === 0) {
        setErrors(['At least one host participant is required.']);
        return;
      }
      validParticipants = nonHex.map(p => p.poppoId.trim());

      // Check for duplicate participants
      const uniqueParticipants = Array.from(new Set(validParticipants));
      if (uniqueParticipants.length !== validParticipants.length) {
        setErrors(['Duplicate participants are not allowed.']);
        return;
      }
      const first = nonHex[0];
      const match = hosts.find(h => String(h.id) === first.poppoId.trim());
      firstParticipantNickname = match ? (match.nickname || match.name || '') : first.name.trim() || 'Host';
    }

    setIsProcessing(true);

    try {
      const defaultTitle = `${firstParticipantNickname} - ${eventType}`;
      const finalTitle = eventTitle.trim() || defaultTitle;

      let finalDescription = eventDescription.trim() || 'No description provided.';
      if (eventType !== 'SOLO LIVEHOUSE') {
        const externalList = participantsList.filter(p => p.type === 'manual' && p.poppoId && p.name);
        if (externalList.length > 0) {
          finalDescription += `\n\nExternal Participants:\n` + externalList.map(p => `• ${p.name} (#${p.poppoId})`).join('\n');
        }
      }

      const newCalendarEvent = {
        event_id: computedEventId,
        poppo_id: validParticipants[0],
        event_host_id: validParticipants[0],
        title: finalTitle,
        description: finalDescription,
        date: eventDate,
        time: computedTimeStr,
        type: eventType,
        location: 'VIRTUAL ROOM (LIVEHOUSE)',
        created_by_name: auth.nickname || auth.name || 'Admin',
        created_by_role: auth.role || 'Admin',
        created_by_id: auth.poppo_id || 'SystemAdmin',
        visibility: 'All' as const,
        participants: validParticipants,
        participantIds: validParticipants,
        timestamp: new Date().toISOString()
      };

      // Direct Firestore write to calendar collection
      await setDoc(doc(db, 'calendar', computedEventId), newCalendarEvent);

      await FirebaseService.logSystemActivity(
        `Calendar event manually created: "${finalTitle}" (Type: ${eventType}, Date: ${eventDate}, Time: ${computedTimeStr}, Participants: ${validParticipants.join(', ')})`,
        'Info'
      );

      Storage.addLog('Calendar', `Created event: ${finalTitle}`, auth.nickname || auth.name);
      setSuccessMsg(`Successfully created event "${finalTitle}"!`);
      
      // Reset form
      setEventDate('');
      setEventTitle('');
      setEventDescription('');
      setSoloPoppoId('');
      setSoloNickname('');
      setParticipantsList([{ type: 'agency', poppoId: '', name: '' }]);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('[AddEventForm] Submit Error:', err);
      setErrors([err.message || 'Failed to submit event to database']);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading && hosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="relative w-8 h-8 animate-spin rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" />
        <p className="text-[10px] uppercase tracking-wider text-[#A09E9A]">Syncing Hosts list...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 relative z-10 text-left">
      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs font-bold flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Errors Notification */}
      {errors.length > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold space-y-1.5">
          {errors.map((err, i) => (
            <div key={i} className="flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{err}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Event Title */}
        <div className="space-y-1.5">
          <label htmlFor="event-title" className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Event Title (Optional)</label>
          <input
            id="event-title"
            type="text"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            placeholder="e.g. Host PK Championship (Leave blank for default)"
            className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all"
          />
        </div>

        {/* Event Type */}
        <div className="space-y-1.5">
          <label htmlFor="event-type" className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Event Type</label>
          <select
            id="event-type"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all font-bold cursor-pointer"
          >
            <option value="SOLO LIVEHOUSE">SOLO LIVEHOUSE</option>
            <option value="PARTY LIVEHOUSE">PARTY LIVEHOUSE</option>
            <option value="OFFICIAL PK">OFFICIAL PK</option>
            <option value="AGENCY EVENT">AGENCY EVENT</option>
            <option value="POPPO EVENT">POPPO EVENT</option>
            <option value="EXTERNAL EVENT">EXTERNAL EVENT</option>
          </select>
        </div>

        {/* Event Date */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Date of Event</label>
          <SingleDatePicker
            value={eventDate}
            onChange={(val) => setEventDate(val)}
            placeholder="Select Event Date"
            required
          />
        </div>

        {/* Event Time */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Time of Event (Manila Time)</label>
          <div className="flex gap-2">
            <select
              value={eventTimeHour}
              onChange={(e) => setEventTimeHour(e.target.value)}
              title="Hour"
              className="flex-1 bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 font-bold"
            >
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <select
              value={eventTimeMinute}
              onChange={(e) => setEventTimeMinute(e.target.value)}
              title="Minute"
              className="flex-1 bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 font-bold"
            >
              {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              value={eventTimeAmpm}
              onChange={(e) => setEventTimeAmpm(e.target.value)}
              title="AM or PM"
              className="flex-1 bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 font-bold"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label htmlFor="event-description" className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Event Description (Optional)</label>
        <textarea
          id="event-description"
          rows={3}
          value={eventDescription}
          onChange={(e) => setEventDescription(e.target.value)}
          placeholder="Log event parameters, rules, bonuses, or locations..."
          className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all resize-none"
        />
      </div>

      {/* Participants */}
      {eventType === 'SOLO LIVEHOUSE' ? (
        <div className="space-y-4 bg-[#0D0D14]/50 p-6 rounded-2xl border border-white/5">
          <div className="border-b border-white/5 pb-2">
            <span className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest">Solo Livehouse Host Details (Cross-Autofills)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="solo-poppo-id" className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Poppo ID</label>
              <input
                id="solo-poppo-id"
                type="text"
                value={soloPoppoId}
                onChange={(e) => handleSoloPoppoIdChange(e.target.value)}
                placeholder="Enter Poppo ID..."
                className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="solo-nickname" className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Nickname</label>
              <input
                id="solo-nickname"
                type="text"
                value={soloNickname}
                onChange={(e) => handleSoloNicknameChange(e.target.value)}
                placeholder="Enter Nickname..."
                className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 bg-[#0D0D14]/50 p-6 rounded-2xl border border-white/5">
          <div className="flex justify-between items-center border-b border-white/5 pb-2">
            <span className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest">Niners Hosts Participants (Up to 9)</span>
            <button
              type="button"
              onClick={handleAddParticipantSlot}
              disabled={participantsList.length >= 9}
              className="px-3 py-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={12} /> Add Participant
            </button>
          </div>

          <div className="space-y-4">
            {participantsList.map((slot, index) => (
              <div key={index} className="bg-[#07070B] border border-white/5 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-white/40 uppercase">Participant #{index + 1}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleParticipantTypeToggle(index, 'agency')}
                      className={cn(
                        "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border transition-all cursor-pointer",
                        slot.type === 'agency'
                          ? "bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]"
                          : "bg-transparent border-white/10 text-white/45 hover:text-white/70"
                      )}
                    >
                      Agency Host
                    </button>
                    <button
                      type="button"
                      onClick={() => handleParticipantTypeToggle(index, 'manual')}
                      className={cn(
                        "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border transition-all cursor-pointer",
                        slot.type === 'manual'
                          ? "bg-[#ec4899]/10 border-[#ec4899]/30 text-[#ec4899]"
                          : "bg-transparent border-white/10 text-white/45 hover:text-white/70"
                      )}
                    >
                      Manual/External
                    </button>
                    {participantsList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipantSlot(index)}
                        className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-md transition-all cursor-pointer shrink-0 ml-2"
                        title="Remove participant slot"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {slot.type === 'agency' ? (
                    <div className="sm:col-span-2">
                      <select
                        value={slot.poppoId}
                        onChange={(e) => handleParticipantChange(index, 'poppoId', e.target.value)}
                        title={`Select agency host ${index + 1}`}
                        className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] font-bold cursor-pointer"
                      >
                        <option value="">-- Choose Host --</option>
                        {hosts.map(h => (
                          <option key={h.id} value={h.id}>{h.nickname || h.name} ({h.id})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <label htmlFor={`manual-id-${index}`} className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest block">Poppo ID</label>
                        <input
                          id={`manual-id-${index}`}
                          type="text"
                          value={slot.poppoId}
                          onChange={(e) => handleParticipantChange(index, 'poppoId', e.target.value)}
                          placeholder="External Poppo ID..."
                          className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor={`manual-name-${index}`} className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest block">Name/Nickname</label>
                        <input
                          id={`manual-name-${index}`}
                          type="text"
                          value={slot.name}
                          onChange={(e) => handleParticipantChange(index, 'name', e.target.value)}
                          placeholder="External Nickname..."
                          className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated ID Preview */}
      <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2">
          <Info size={14} className="text-[#D4AF37]" />
          <span className="font-bold text-[#A09E9A]">Auto-Generated Event ID:</span>
        </div>
        <span className="font-mono text-[11px] text-[#F0EFE8] tracking-tight bg-black/40 px-3 py-1 rounded border border-white/5 select-all overflow-x-auto whitespace-nowrap scrollbar-none">
          {computedEventId}
        </span>
      </div>

      {/* Autofills metadata display */}
      <div className="flex flex-wrap gap-4 text-[10px] font-bold text-[#A09E9A] uppercase tracking-wider bg-black/20 p-4 rounded-xl border border-white/5">
        <span>Submitted by: <span className="text-[#F0EFE8] font-bold">{auth.role || 'Guest'} {auth.nickname || auth.name || 'Niner'} ({auth.poppo_id || 'SystemAdmin'})</span></span>
      </div>

      {/* Submit / Cancel Buttons */}
      <div className="flex gap-4 justify-end pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 sm:flex-initial px-6 py-3.5 rounded-xl bg-slate-900 border border-slate-800 text-white/40 font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isProcessing}
          className="flex-1 sm:flex-initial px-8 py-3.5 btn-gold rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg"
        >
          <Send size={14} className="text-[#0D0D14]" />
          {isProcessing ? 'Processing...' : 'Create Event Entry'}
        </button>
      </div>
    </form>
  );
};

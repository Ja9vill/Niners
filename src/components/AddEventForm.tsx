import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Plus, Send, Info, AlertCircle, Search, UserMinus, CheckCircle2 } from 'lucide-react';
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
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const auth = Storage.getAuthState();

  // Load database metadata on mount
  useEffect(() => {
    const loadMetadata = async () => {
      setIsLoading(true);
      setErrors([]);
      try {
        const usersList = await FirebaseService.getAllRoleMetadata();
        setAllUsers(usersList);
      } catch (err: any) {
        console.error('[AddEventForm] Error loading metadata:', err);
        setErrors([err.message || 'Failed to sync registry details from Database']);
      } finally {
        setIsLoading(false);
      }
    };
    loadMetadata();
  }, []);

  // Form State
  const [eventDate, setEventDate] = useState('');
  const [eventTimeHour, setEventTimeHour] = useState('09');
  const [eventTimeMinute, setEventTimeMinute] = useState('00');
  const [eventTimeAmpm, setEventTimeAmpm] = useState('AM');
  const [eventType, setEventType] = useState('SOLO LIVEHOUSE');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  
  // Participant Selection States
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantRoleFilter, setParticipantRoleFilter] = useState('All Roles');
  const [selectedParticipants, setSelectedParticipants] = useState<any[]>([]);

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

  // Filter users based on search query and role filter (excluding director role)
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const userRole = String(u.role || '').toLowerCase();
      // Exclude director role
      if (userRole === 'director') return false;

      // Filter by role selection
      if (participantRoleFilter !== 'All Roles') {
        if (participantRoleFilter === 'hosts' && userRole !== 'host' && userRole !== 'talent') return false;
        if (participantRoleFilter === 'managers' && userRole !== 'manager') return false;
        if (participantRoleFilter === 'agents' && userRole !== 'agent') return false;
        if (participantRoleFilter === 'admins' && userRole !== 'admin' && userRole !== 'head admin') return false;
      }

      // Search matching poppoId or nickname
      const searchStr = participantSearch.toLowerCase().trim();
      if (searchStr) {
        const nickname = String(u.nickname || u.name || '').toLowerCase();
        const poppoId = String(u.poppo_id || u.poppoId || u.id || '').toLowerCase();
        return nickname.includes(searchStr) || poppoId.includes(searchStr);
      }

      return true;
    });
  }, [allUsers, participantSearch, participantRoleFilter]);

  const handleAddParticipant = (user: any) => {
    if (selectedParticipants.some(a => a.id === user.id)) return;
    setSelectedParticipants([...selectedParticipants, user]);
  };

  const handleRemoveParticipant = (userId: string) => {
    setSelectedParticipants(selectedParticipants.filter(a => a.id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMsg('');

    if (!eventDate) {
      setErrors(['Please select an event date.']);
      return;
    }

    if (selectedParticipants.length === 0) {
      setErrors(['At least one host participant is required.']);
      return;
    }
    const validParticipants = selectedParticipants.map(p => String(p.poppo_id || p.id).trim());

    // Check for duplicate participants
    const uniqueParticipants = Array.from(new Set(validParticipants));
    if (uniqueParticipants.length !== validParticipants.length) {
      setErrors(['Duplicate participants are not allowed.']);
      return;
    }
    const first = selectedParticipants[0];
    const firstParticipantNickname = first.nickname || first.name || 'Host';

    setIsProcessing(true);

    try {
      const defaultTitle = `${firstParticipantNickname} - ${eventType}`;
      const finalTitle = eventTitle.trim() || defaultTitle;

      const finalDescription = eventDescription.trim() || 'No description provided.';

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
      setSelectedParticipants([]);
      
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

  if (isLoading && allUsers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="relative w-8 h-8 animate-spin rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" />
        <p className="text-[10px] uppercase tracking-wider text-[#A09E9A]">Syncing Members list...</p>
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
            className="w-full glass-input text-xs"
          />
        </div>

        {/* Event Type */}
        <div className="space-y-1.5">
          <label htmlFor="event-type" className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Event Type</label>
          <select
            id="event-type"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full glass-input text-xs font-bold cursor-pointer appearance-none"
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
              className="flex-1 glass-input text-xs font-bold text-center cursor-pointer appearance-none"
            >
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <select
              value={eventTimeMinute}
              onChange={(e) => setEventTimeMinute(e.target.value)}
              title="Minute"
              className="flex-1 glass-input text-xs font-bold text-center cursor-pointer appearance-none"
            >
              {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              value={eventTimeAmpm}
              onChange={(e) => setEventTimeAmpm(e.target.value)}
              title="AM or PM"
              className="flex-1 glass-input text-xs font-bold text-center cursor-pointer appearance-none"
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
          className="w-full glass-input text-xs min-h-[100px] resize-none"
        />
      </div>

      {/* Participants */}
      <div className="space-y-4 bg-[#0D0D14]/50 p-6 rounded-2xl border border-white/5">
        <span className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest block border-b border-white/5 pb-2">ADD PARTICIPANTS</span>
        
        {/* Search & Filter Row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
            <input
              type="text"
              value={participantSearch}
              onChange={(e) => setParticipantSearch(e.target.value)}
              placeholder="Search nickname or poppoId..."
              className="w-full bg-[#0A0B0E] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
            />
          </div>

          <select
            value={participantRoleFilter}
            onChange={(e) => setParticipantRoleFilter(e.target.value)}
            title="Role Filter"
            className="bg-[#0A0B0E] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#F0EFE8] outline-none font-bold cursor-pointer"
          >
            <option value="All Roles">All Roles</option>
            <option value="hosts">Hosts</option>
            <option value="managers">Managers</option>
            <option value="agents">Agents</option>
            <option value="admins">Admins</option>
          </select>
        </div>

        {/* Member Grid/List */}
        <div className="max-h-[220px] overflow-y-auto border border-white/5 rounded-xl bg-black/40 custom-scrollbar divide-y divide-white/5">
          {filteredUsers.length > 0 ? (
            filteredUsers.map(user => {
              const isAdded = selectedParticipants.some(a => a.id === user.id);
              return (
                <div key={user.id} className="flex items-center justify-between p-3 text-xs hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    {user.photoUrl || user.photo_url ? (
                      <img
                        src={user.photoUrl || user.photo_url}
                        alt={user.nickname || user.name}
                        className="w-8 h-8 rounded-full object-cover border border-[#D4AF37]/20 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/25 flex items-center justify-center shrink-0 font-bold text-xs uppercase">
                        {(user.nickname || user.name || 'N')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-[#F0EFE8]">{user.nickname || user.name}</div>
                      <div className="text-[10px] font-mono text-[#A09E9A] flex items-center gap-1.5 mt-0.5">
                        <span>ID: {user.poppo_id || user.id}</span>
                        <span>•</span>
                        <span className="text-indigo-400 capitalize">{user.role || 'Host'}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddParticipant(user)}
                    disabled={isAdded}
                    className={cn(
                      "p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 border",
                      isAdded
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-default"
                        : "bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border-[#D4AF37]/20 text-[#D4AF37]"
                    )}
                  >
                    {isAdded ? <CheckCircle2 size={13} /> : <Plus size={13} />}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-[#A09E9A]/30 italic text-xs">No matching users found.</div>
          )}
        </div>

        {/* Selection Summary */}
        <div className="flex flex-col border border-white/5 rounded-xl bg-black/40 p-4 min-h-[150px] mt-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
            <span className="text-[9px] font-black text-white/50 uppercase tracking-wider">SELECTED PARTICIPANTS ({selectedParticipants.length})</span>
            {selectedParticipants.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedParticipants([])}
                className="text-[9px] font-black text-red-400 hover:underline uppercase tracking-wider cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-[190px] pr-1 space-y-2 custom-scrollbar">
            {selectedParticipants.length > 0 ? (
              selectedParticipants.map(user => (
                <div key={user.id} className="flex items-center justify-between bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-xs hover:border-[#D4AF37]/20 transition-all">
                  <div className="flex items-center gap-2.5">
                    {user.photoUrl || user.photo_url ? (
                      <img
                        src={user.photoUrl || user.photo_url}
                        alt={user.nickname || user.name}
                        className="w-6 h-6 rounded-full object-cover border border-[#D4AF37]/10 shrink-0"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/25 flex items-center justify-center shrink-0 font-bold text-[9px] uppercase">
                        {(user.nickname || user.name || 'N')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <span className="font-bold text-[#F0EFE8]">{user.nickname || user.name}</span>
                      <span className="text-[9px] text-[#A09E9A] font-mono ml-2">(#{user.poppo_id || user.id})</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(user.id)}
                    className="p-1 text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                    title="Remove Participant"
                  >
                    <UserMinus size={13} />
                  </button>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-[#A09E9A]/35 italic text-xs py-8">
                <span>No participants selected.</span>
                <span className="text-[10px] mt-1">Search and click the add icon (+) above.</span>
              </div>
            )}
          </div>
        </div>
      </div>

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
          {isProcessing ? 'Processing...' : 'Add Event'}
        </button>
      </div>
    </form>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Send, AlertCircle, Search, UserMinus, Crown, ExternalLink } from 'lucide-react';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Storage } from '../lib/storage';
import { FirebaseService } from '../lib/firebaseService';
import { SingleDatePicker } from './InteractiveDatePicker';
import { cn } from '../lib/utils';

interface AddEventFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const EVENT_TYPES = [
  'Solo Livehouse',
  'Party Livehouse',
  'Official PK',
  'Agency Event',
  'Poppo Event',
  'External Event',
];

export const AddEventForm: React.FC<AddEventFormProps> = ({ onSuccess, onCancel }) => {
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const auth = Storage.getAuthState();

  useEffect(() => {
    const loadMetadata = async () => {
      setIsLoading(true);
      setErrors([]);
      try {
        const usersList = await FirebaseService.getAllRoleMetadata();
        setAllUsers(usersList);
      } catch (err: any) {
        setErrors([err.message || 'Failed to sync registry details from Database']);
      } finally {
        setIsLoading(false);
      }
    };
    loadMetadata();
  }, []);

  // Form State
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState('Solo Livehouse');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');

  // Time pickers — From / To
  const [fromHour, setFromHour] = useState('09');
  const [fromMinute, setFromMinute] = useState('00');
  const [fromAmpm, setFromAmpm] = useState('AM');
  const [toHour, setToHour] = useState('10');
  const [toMinute, setToMinute] = useState('00');
  const [toAmpm, setToAmpm] = useState('AM');

  // Participant Selection
  const [participantSearch, setParticipantSearch] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<any[]>([]);
  const [eventHostId, setEventHostId] = useState<string>('');
  const [eventHostName, setEventHostName] = useState<string>('');
  const [isExternalHost, setIsExternalHost] = useState(false);

  // External participant modal
  const [showExternalModal, setShowExternalModal] = useState(false);
  const [extPoppoId, setExtPoppoId] = useState('');
  const [extNickname, setExtNickname] = useState('');

  const fromTimeStr = `${fromHour}:${fromMinute} ${fromAmpm}`;
  const toTimeStr = `${toHour}:${toMinute} ${toAmpm}`;

  // Auto-generated event ID (Firestore auto-ID)
  const eventId = useMemo(() => doc(collection(db, 'calendar')).id, []);

  // Filter users (include all roles including Director)
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const searchStr = participantSearch.toLowerCase().trim();
      if (!searchStr) return false;
      const nickname = String(u.nickname || u.name || '').toLowerCase();
      const poppoId = String(u.poppo_id || u.poppoId || u.id || '').toLowerCase();
      return nickname.includes(searchStr) || poppoId.includes(searchStr);
    });
  }, [allUsers, participantSearch]);

  const isSoloLivehouse = eventType === 'Solo Livehouse';

  const handleAddParticipant = (user: any) => {
    if (isSoloLivehouse && selectedParticipants.length >= 1) return;
    if (selectedParticipants.some(a => a.poppo_id === (user.poppo_id || user.id))) return;
    const participant = { ...user, poppo_id: user.poppo_id || user.id, is_external: false };
    const updated = [...selectedParticipants, participant];
    setSelectedParticipants(updated);
    if (isSoloLivehouse || updated.length === 1) {
      setEventHostId(participant.poppo_id);
      setEventHostName(participant.nickname || participant.name || '');
      setIsExternalHost(false);
    }
  };

  const handleAddExternalParticipant = () => {
    if (!extPoppoId.trim() || !extNickname.trim()) return;
    if (isSoloLivehouse && selectedParticipants.length >= 1) return;
    if (selectedParticipants.some(a => a.poppo_id === extPoppoId.trim())) return;
    const participant = {
      poppo_id: extPoppoId.trim(),
      nickname: extNickname.trim(),
      role: 'External',
      photoUrl: null,
      is_external: true,
    };
    const updated = [...selectedParticipants, participant];
    setSelectedParticipants(updated);
    if (isSoloLivehouse || updated.length === 1) {
      setEventHostId(participant.poppo_id);
      setEventHostName(participant.nickname);
      setIsExternalHost(true);
    }
    setExtPoppoId('');
    setExtNickname('');
    setShowExternalModal(false);
  };

  const handleRemoveParticipant = (poppoId: string) => {
    const updated = selectedParticipants.filter(a => a.poppo_id !== poppoId);
    setSelectedParticipants(updated);
    if (eventHostId === poppoId) {
      if (updated.length > 0) {
        setEventHostId(updated[0].poppo_id);
        setEventHostName(updated[0].nickname || updated[0].name || '');
        setIsExternalHost(!!updated[0].is_external);
      } else {
        setEventHostId('');
        setEventHostName('');
        setIsExternalHost(false);
      }
    }
  };

  const handleSetHost = (poppoId: string) => {
    const p = selectedParticipants.find(a => a.poppo_id === poppoId);
    if (p) {
      setEventHostId(p.poppo_id);
      setEventHostName(p.nickname || p.name || '');
      setIsExternalHost(!!p.is_external);
    }
  };

  const parseTimeToMinutes = (hour: string, minute: string, ampm: string): number => {
    let h = parseInt(hour, 10);
    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    return h * 60 + parseInt(minute, 10);
  };

  const validate = (): string[] => {
    const errs: string[] = [];
    if (!eventType) errs.push('Event type is required.');
    if (!eventDate) errs.push('Event date is required.');
    if (!fromHour || !toHour) errs.push('Event time is required.');
    if (selectedParticipants.length === 0) errs.push('At least one participant is required.');
    if (!eventHostId) errs.push('Please select the host for this event.');
    if (isSoloLivehouse && selectedParticipants.length > 1) errs.push('Solo Livehouse can only have one participant.');
    const fromMin = parseTimeToMinutes(fromHour, fromMinute, fromAmpm);
    const toMin = parseTimeToMinutes(toHour, toMinute, toAmpm);
    if (toMin <= fromMin) errs.push('End time must be later than start time.');
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMsg('');

    const errs = validate();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    setIsProcessing(true);

    try {
      const finalTitle = eventTitle.trim() || `${eventHostName} - ${eventType}`;
      const finalDescription = eventDescription.trim() || 'No description provided.';
      const participantIds = selectedParticipants.map(p => p.poppo_id);
      const participantNicknames = selectedParticipants.map(p => p.nickname || p.name || p.poppo_id);

      const newEvent = {
        event_id: eventId,
        event_type: eventType,
        event_title: finalTitle,
        event_description: finalDescription,
        event_date: eventDate,
        from_time: fromTimeStr,
        to_time: toTimeStr,
        event_host_id: eventHostId,
        event_host_name: eventHostName,
        is_external_host: isExternalHost,
        participant_ids: participantIds,
        participant_nicknames: participantNicknames,
        created_by_id: auth.poppo_id || 'SystemAdmin',
        created_by_name: auth.nickname || auth.name || 'Admin',
        created_by_role: auth.role || 'Admin',
        timestamp: new Date().toISOString(),
        notified30min: false,
        notifiedStart: false,
      };

      await setDoc(doc(db, 'calendar', eventId), newEvent);

      await FirebaseService.logSystemActivity(
        `Calendar event created: "${finalTitle}" (Type: ${eventType}, Date: ${eventDate}, Time: ${fromTimeStr} - ${toTimeStr}, Participants: ${participantIds.join(', ')})`,
        'Info'
      );

      Storage.addLog('Calendar', `Created event: ${finalTitle}`, auth.nickname || auth.name);
      setSuccessMsg(`Event successfully added.`);

      setEventDate('');
      setEventTitle('');
      setEventDescription('');
      setSelectedParticipants([]);
      setEventHostId('');
      setEventHostName('');

      if (onSuccess) onSuccess();
    } catch (err: any) {
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
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs font-bold flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

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
        {/* Event Type */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Event Type</label>
          <select
            value={eventType}
            onChange={(e) => {
              setEventType(e.target.value);
              if (e.target.value === 'Solo Livehouse' && selectedParticipants.length > 1) {
                const first = selectedParticipants[0];
                setSelectedParticipants([first]);
                setEventHostId(first?.poppo_id || '');
                setEventHostName(first?.nickname || first?.name || '');
                setIsExternalHost(!!first?.is_external);
              }
            }}
            className="w-full glass-input text-xs font-bold cursor-pointer appearance-none"
          >
            {EVENT_TYPES.map(t => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Event Title */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Event Title (Optional)</label>
          <input
            type="text"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            placeholder="Leave blank for default"
            className="w-full glass-input text-xs"
          />
        </div>

        {/* Event Date */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Event Date</label>
          <SingleDatePicker
            value={eventDate}
            onChange={(val) => setEventDate(val)}
            placeholder="YYYY-MM-DD"
            required
          />
        </div>

        {/* Event Time — From / To */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Event Time (Manila)</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider ml-1">From</span>
              <div className="flex gap-1 mt-1">
                <select value={fromHour} onChange={e => setFromHour(e.target.value)} className="flex-1 glass-input text-xs font-bold text-center cursor-pointer appearance-none">
                  {['01','02','03','04','05','06','07','08','09','10','11','12'].map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={fromMinute} onChange={e => setFromMinute(e.target.value)} className="flex-1 glass-input text-xs font-bold text-center cursor-pointer appearance-none">
                  {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={fromAmpm} onChange={e => setFromAmpm(e.target.value)} className="flex-1 glass-input text-xs font-bold text-center cursor-pointer appearance-none">
                  <option value="AM">AM</option><option value="PM">PM</option>
                </select>
              </div>
            </div>
            <div>
              <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider ml-1">To</span>
              <div className="flex gap-1 mt-1">
                <select value={toHour} onChange={e => setToHour(e.target.value)} className="flex-1 glass-input text-xs font-bold text-center cursor-pointer appearance-none">
                  {['01','02','03','04','05','06','07','08','09','10','11','12'].map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={toMinute} onChange={e => setToMinute(e.target.value)} className="flex-1 glass-input text-xs font-bold text-center cursor-pointer appearance-none">
                  {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={toAmpm} onChange={e => setToAmpm(e.target.value)} className="flex-1 glass-input text-xs font-bold text-center cursor-pointer appearance-none">
                  <option value="AM">AM</option><option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Event Description (Optional)</label>
        <textarea
          rows={3}
          value={eventDescription}
          onChange={(e) => setEventDescription(e.target.value)}
          placeholder="Leave blank for default description"
          className="w-full glass-input text-xs min-h-[80px] resize-none"
        />
      </div>

      {/* Participants */}
      <div className="space-y-4 bg-[#0D0D14]/50 p-6 rounded-2xl border border-white/5">
        <span className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest block border-b border-white/5 pb-2">
          ADD PARTICIPANTS {isSoloLivehouse && <span className="text-[#D4AF37]">(Max 1 — Solo)</span>}
        </span>

        {/* Search + External button */}
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
          <button
            type="button"
            onClick={() => setShowExternalModal(true)}
            className="shrink-0 px-3 py-2.5 bg-gradient-to-r from-[#1A1510] to-[#0A0806] border border-[#D4AF37]/30 hover:border-[#D4AF37]/60 rounded-xl text-[10px] font-black text-[#D4AF37] uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ExternalLink size={13} />
            External
          </button>
        </div>

        {/* External Participant Modal */}
        {showExternalModal && (
          <div className="p-4 bg-black/60 border border-[#D4AF37]/20 rounded-xl space-y-3">
            <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest">Add External Participant</span>
            <input
              type="text"
              value={extPoppoId}
              onChange={(e) => setExtPoppoId(e.target.value)}
              placeholder="poppo_id"
              className="w-full glass-input text-xs"
            />
            <input
              type="text"
              value={extNickname}
              onChange={(e) => setExtNickname(e.target.value)}
              placeholder="nickname"
              className="w-full glass-input text-xs"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowExternalModal(false)} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white/40 hover:text-white cursor-pointer">Cancel</button>
              <button type="button" onClick={handleAddExternalParticipant} disabled={!extPoppoId.trim() || !extNickname.trim()} className="px-3 py-1.5 bg-[#D4AF37]/20 border border-[#D4AF37]/40 rounded-lg text-[10px] font-black uppercase tracking-wider text-[#D4AF37] cursor-pointer disabled:opacity-40">Add</button>
            </div>
          </div>
        )}

        {/* Search Results */}
        {participantSearch.trim() && (
          <div className="max-h-[220px] overflow-y-auto border border-white/5 rounded-xl bg-black/40 custom-scrollbar divide-y divide-white/5">
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => {
                const isAdded = selectedParticipants.some(a => a.poppo_id === (user.poppo_id || user.id));
                const isBlocked = isSoloLivehouse && selectedParticipants.length >= 1 && !isAdded;
                return (
                  <div key={user.id} className="flex items-center justify-between p-3 text-xs hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      {user.photoUrl || user.photo_url ? (
                        <img src={user.photoUrl || user.photo_url} alt={user.nickname || user.name} className="w-8 h-8 rounded-full object-cover border border-[#D4AF37]/20 shrink-0" />
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
                      disabled={isAdded || isBlocked}
                      className={cn(
                        "p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 border",
                        isAdded
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-default"
                          : isBlocked
                            ? "bg-white/5 border-white/10 text-white/20 cursor-not-allowed"
                            : "bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border-[#D4AF37]/20 text-[#D4AF37]"
                      )}
                    >
                      {isAdded ? <Plus size={13} className="rotate-45" /> : <Plus size={13} />}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-[#A09E9A]/30 italic text-xs">No matching users found.</div>
            )}
          </div>
        )}

        {/* Selected Participants */}
        <div className="flex flex-col border border-white/5 rounded-xl bg-black/40 p-4 min-h-[120px] mt-4">
          <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
            <span className="text-[9px] font-black text-white/50 uppercase tracking-wider">SELECTED ({selectedParticipants.length})</span>
            {selectedParticipants.length > 0 && (
              <button type="button" onClick={() => { setSelectedParticipants([]); setEventHostId(''); setEventHostName(''); }} className="text-[9px] font-black text-red-400 hover:underline uppercase tracking-wider cursor-pointer">Clear All</button>
            )}
          </div>
          <div className="overflow-y-auto max-h-[190px] pr-1 space-y-2 custom-scrollbar">
            {selectedParticipants.length > 0 ? (
              selectedParticipants.map(p => {
                const isHost = p.poppo_id === eventHostId;
                return (
                  <div key={p.poppo_id} className={cn("flex items-center justify-between bg-white/5 border px-3 py-2 rounded-xl text-xs transition-all", isHost ? "border-[#D4AF37]/40" : "border-white/10 hover:border-[#D4AF37]/20")}>
                    <div className="flex items-center gap-2.5">
                      {p.photoUrl || p.photo_url ? (
                        <img src={p.photoUrl || p.photo_url} alt={p.nickname || p.name} className="w-6 h-6 rounded-full object-cover border border-[#D4AF37]/10 shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/25 flex items-center justify-center shrink-0 font-bold text-[9px] uppercase">
                          {(p.nickname || p.name || 'N')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-[#F0EFE8]">{p.nickname || p.name}</span>
                        <span className="text-[9px] text-[#A09E9A] font-mono ml-2">(#{p.poppo_id})</span>
                        {p.role === 'External' && <span className="text-[9px] text-[#D4AF37] ml-1.5">[External]</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Gold Crown — Set Host */}
                      <button
                        type="button"
                        onClick={() => handleSetHost(p.poppo_id)}
                        className={cn("p-1.5 rounded-md transition-colors cursor-pointer", isHost ? "text-[#D4AF37] bg-[#D4AF37]/15" : "text-white/30 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10")}
                        title={isHost ? 'Host' : 'Set as Host'}
                      >
                        <Crown size={14} />
                      </button>
                      {/* Red — Remove */}
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(p.poppo_id)}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                        title="Remove Participant"
                      >
                        <UserMinus size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-[#A09E9A]/35 italic text-xs py-8">
                <span>No participants selected.</span>
                <span className="text-[10px] mt-1">Search and add members above.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auto-Generated Event ID */}
      <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle size={14} className="text-[#D4AF37]" />
          <span className="font-bold text-[#A09E9A]">Event ID:</span>
        </div>
        <span className="font-mono text-[11px] text-[#F0EFE8] tracking-tight bg-black/40 px-3 py-1 rounded border border-white/5 select-all break-all">
          {eventId}
        </span>
      </div>

      {/* Submission Metadata */}
      <div className="flex flex-wrap gap-4 text-[10px] font-bold text-[#A09E9A] uppercase tracking-wider bg-black/20 p-4 rounded-xl border border-white/5">
        <span>Created by: <span className="text-[#F0EFE8]">{auth.role} {auth.nickname || auth.name || 'Niner'} ({auth.poppo_id || 'SystemAdmin'})</span></span>
      </div>

      {/* Submit / Cancel */}
      <div className="flex gap-4 justify-end pt-4">
        {onCancel && (
          <button type="button" onClick={onCancel} className="flex-1 sm:flex-initial px-6 py-3.5 rounded-xl bg-slate-900 border border-slate-800 text-white/40 font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">
            Cancel
          </button>
        )}
        <button type="submit" disabled={isProcessing} className="flex-1 sm:flex-initial px-8 py-3.5 btn-gold rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg">
          <Send size={14} className="text-[#0D0D14]" />
          {isProcessing ? 'Processing...' : 'Add Event'}
        </button>
      </div>
    </form>
  );
};

/* eslint-disable i18next/no-literal-string */
import React, { useState, useEffect } from 'react';
import { Storage } from '../lib/storage';
import { FirebaseService } from '../lib/firebaseService';
import { CalendarEvent, EventType, Host } from '../types';
import { Plus, Check, X, Calendar, AlertCircle, Trash2, Clock, Users } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const EventsTab = () => {
  const auth = Storage.getAuthState();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedAttendees, setSelectedAttendees] = useState<Host[]>([]);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const roster = await FirebaseService.getAllHosts();
        setHosts(roster || []);
        
        // Use Storage cache as single source of truth for events array, synced of course
        const registeredEvents = Storage.getEvents();
        setEvents(registeredEvents || []);
      } catch (err) {
        setEvents(Storage.getEvents());
      }
    };
    loadData();
  }, []);

  const handleCreateEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dateStr = formData.get('date') as string;

    const newEvent: CalendarEvent = {
      event_id: crypto.randomUUID(),
      poppo_id: formData.get('poppo_id') as string || 'Agency',
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      date: dateStr,
      time: formData.get('time') as string,
      created_by_name: auth.name,
      created_by_role: auth.role,
      visibility: formData.get('visibility') as any || 'All',
      timestamp: new Date().toISOString()
    };

    // Save
    const updated = [newEvent, ...events];
    Storage.setEvents(updated);
    setEvents(updated);
    
    // Sync array to cloud database using custom batch saver
    FirebaseService.saveCalendarEvents(updated).catch(err => {
      console.warn("Retrying later", err);
    });

    // Save to Log
    Storage.addLog('Events Workspace', `Created operational event: ${newEvent.title}`, auth.name);
    Storage.addNotification({
      title: 'New Event Logged',
      message: `Operational event '${newEvent.title}' scheduled on ${dateStr}.`,
      type: 'success'
    });

    setIsAdding(false);
    setSelectedAttendees([]);
    setSuccess('Operational event registered successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (!confirm('Are you sure you want to delete this operational event?')) return;
    const updated = events.filter(e => e.event_id !== eventId);
    Storage.setEvents(updated);
    setEvents(updated);
    
    FirebaseService.saveCalendarEvents(updated).catch(err => {
      console.warn("Retrying later", err);
    });
    
    Storage.addLog('Events Workspace', `Deleted operational event #${eventId.substring(0,8)}`, auth.name);
  };

  const handleAddAttendee = (host: Host) => {
    if (!selectedAttendees.some(h => h.id === host.id)) {
      setSelectedAttendees([...selectedAttendees, host]);
    }
    setAttendeeSearch('');
  };

  const filteredHosts = hosts.filter(h => 
    h.name.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
    h.id.includes(attendeeSearch)
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Events Operational Workspace</h2>
          <p className="text-xs text-slate-500 font-medium">Add, schedule and track operational coverage & official platforms events.</p>
        </div>
        {['Director', 'Head Admin', 'Admin', 'Manager'].includes(auth.role) && (
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="btn-primary px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2"
          >
            <Plus size={14} />
            Add Event
          </button>
        )}
      </div>

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs font-semibold">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Overlay/Section */}
        {isAdding && (
          <div className="lg:col-span-1 glass-card border border-white/10 !p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <h3 className="font-bold text-white text-sm">New Operational Event</h3>
              <button onClick={() => setIsAdding(false)} aria-label="Close event form" className="text-white/40 hover:text-white"><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Event Title</label>
                <input required name="title" className="w-full glass-input" placeholder="e.g. Solo Livehouse Stream" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Host Poppo ID (or 'Agency')</label>
                <input required name="poppo_id" defaultValue="Agency" aria-label="Host Poppo ID" placeholder="Agency" className="w-full glass-input font-mono" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Event Date</label>
                  <input required name="date" type="date" aria-label="Event Date" className="w-full glass-input" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Event Time</label>
                  <input required name="time" placeholder="e.g. 19:00 PM" className="w-full glass-input font-mono" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Visibility Level</label>
                <select name="visibility" aria-label="Visibility Level" className="w-full glass-input font-bold">
                  <option value="All">All Members (Public)</option>
                  <option value="Leadership">Leadership Only</option>
                  <option value="Director Only">Director Only</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1 font-mono">Description / Notes</label>
                <textarea required name="description" className="w-full glass-input h-20 resize-none" placeholder="Provide overview or guidelines..." />
              </div>

              {/* Roster Attendance Search */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest pl-1">Agency Attendees</label>
                <input 
                  type="text" 
                  value={attendeeSearch}
                  onChange={(e) => setAttendeeSearch(e.target.value)}
                  placeholder="Type name or Poppo ID..." 
                  className="w-full glass-input"
                />
                {attendeeSearch && (
                  <div className="max-h-32 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl p-2 space-y-1">
                    {filteredHosts.slice(0, 5).map(h => (
                      <button 
                        key={h.id}
                        type="button" 
                        onClick={() => handleAddAttendee(h)}
                        className="w-full text-left p-1 rounded hover:bg-slate-800 text-xs font-semibold flex justify-between"
                      >
                        <span>{h.name}</span>
                        <span className="text-slate-500">#{h.id}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {selectedAttendees.map(h => (
                    <span key={h.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded text-[10px]">
                      {h.name}
                      <button type="button" aria-label={`Remove ${h.name} from attendees`} onClick={() => setSelectedAttendees(selectedAttendees.filter(x => x.id !== h.id))}><X size={8} /></button>
                    </span>
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full btn-primary py-3 text-xs font-black uppercase tracking-widest">
                Save Operational Event
              </button>
            </form>
          </div>
        )}

        {/* List of Scheduled Events */}
        <div className={cn("glass-card", isAdding ? "lg:col-span-2" : "lg:col-span-3")}>
          <div className="pb-4 border-b border-white/5 flex items-center gap-2 mb-6">
            <Calendar className="text-indigo-400" size={18} />
            <h3 className="font-bold text-white text-md">Active Events Ledger</h3>
          </div>

          <div className="space-y-4">
            {events.length > 0 ? (
              events.map((event, idx) => {
                const canDelete = ['Director', 'Head Admin'].includes(auth.role) || event.created_by_name === auth.name;
                return (
                  <div key={idx} className="p-5 bg-white/5 border border-white/5 rounded-2xl flex items-start justify-between gap-4 group hover:bg-white/10 transition-colors">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 bg-indigo-600/25 border border-indigo-500/20 text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-widest">
                          {event.visibility === 'All' ? 'Public' : `${event.visibility}`}
                        </span>
                        <h4 className="font-bold text-white text-sm sm:text-base tracking-tight">{event.title}</h4>
                      </div>
                      
                      <p className="text-xs text-slate-400 leading-relaxed max-w-xl">{event.description}</p>
                      
                      <div className="flex flex-wrap gap-4 text-[10px] font-mono font-bold text-slate-500 uppercase">
                        <span className="flex items-center gap-1"><Clock size={12} /> {event.date} • {event.time}</span>
                        <span>•</span>
                        <span>Target: ID #{event.poppo_id}</span>
                        <span>•</span>
                        <span>Created by {event.created_by_name} ({event.created_by_role})</span>
                      </div>
                    </div>
                    {canDelete && (
                      <button 
                        onClick={() => handleDeleteEvent(event.event_id)}
                        aria-label={`Delete event: ${event.title}`}
                        className="p-1.5 text-white/15 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 text-white/25 italic">No operational events have been registered yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, MapPin, Clock, Tag } from 'lucide-react';
import { CalendarEvent, EventType } from '../types';
import { Storage } from '../lib/storage';
import { cn, formatDate } from '../lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

const EVENT_COLORS: Record<EventType, string> = {
  'Solo Livehouse': 'bg-[#f97316]',
  'Party Livehouse': 'bg-[#ec4899]',
  'Poppo Official Event': 'bg-[#3b82f6]',
  'Niners Day': 'bg-[#eab308]',
  'Agency Event': 'bg-[#10b981]',
  'External Event': 'bg-[#8b5cf6]',
  'PK Tournament': 'bg-[#f43f5e]',
  'Platform Feature': 'bg-[#06b6d4]',
  'Collaboration': 'bg-[#6366f1]'
};

export const CalendarTab = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(Storage.getEvents());
  const [isAdding, setIsAdding] = useState(false);
  const [activeFilters, setActiveFilters] = useState<EventType[]>([]);
  const auth = Storage.getAuthState();

  const filteredEvents = events.filter(e => activeFilters.length === 0 || activeFilters.includes(e.type));

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const getEventsForDay = (day: Date) => filteredEvents.filter(e => isSameDay(new Date(e.date), day));

  const toggleFilter = (type: EventType) => {
    setActiveFilters(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const isTalent = auth.role === 'Talent';

    const newEvent: CalendarEvent = {
        event_id: isTalent ? auth.poppo_id : crypto.randomUUID(),
        poppo_id: isTalent ? auth.poppo_id : (formData.get('hostId') as string || 'Agency'),
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        date: formData.get('date') as string,
        time: formData.get('time') as string,
        created_by_name: auth.name,
        created_by_role: auth.role,
        visibility: formData.get('visibility') as any || 'All',
        timestamp: new Date().toISOString()
    };
    
    // For talent-created events, replace existing event with same ID if any
    let updated;
    if (isTalent) {
      updated = events.filter(ev => ev.event_id !== newEvent.event_id);
      updated.push(newEvent);
    } else {
      updated = [...events, newEvent];
    }
    
    Storage.setEvents(updated);
    setEvents(updated);
    Storage.addLog('Calendar', `Created event: ${newEvent.title}`, auth.name);
    setIsAdding(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Sidebar: Details */}
      <div className="glass-card flex flex-col gap-8 order-2 lg:order-1">
        <div>
           <h4 className="font-bold text-white/50 text-[10px] uppercase tracking-widest mb-4">Filter by Type</h4>
           <div className="flex flex-wrap gap-2">
              {Object.keys(EVENT_COLORS).map(type => (
                <button
                  key={type}
                  onClick={() => toggleFilter(type as EventType)}
                  className={cn(
                    "px-2 py-1 rounded text-[9px] font-bold uppercase transition-all border",
                    activeFilters.includes(type as EventType)
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-slate-800 border-slate-700 text-slate-500"
                  )}
                >
                  {type}
                </button>
              ))}
              {activeFilters.length > 0 && (
                <button 
                  onClick={() => setActiveFilters([])}
                  className="px-2 py-1 rounded text-[9px] font-bold uppercase text-indigo-400 hover:text-indigo-300"
                >
                  Clear All
                </button>
              )}
           </div>
        </div>

        <div>
           <h4 className="font-bold text-white/50 text-[10px] uppercase tracking-widest mb-4">Today's Schedule</h4>
           <div className="space-y-4">
              {getEventsForDay(new Date()).length === 0 ? (
                <p className="text-white/20 text-xs italic">No events scheduled for today</p>
              ) : (
                getEventsForDay(new Date()).map(e => (
                  <div key={e.event_id} className="p-3 bg-white/5 rounded-xl border-l-4 border-l-transparent" style={{ borderLeftColor: EVENT_COLORS[e.visibility === 'Leadership' ? 'Collaboration' : 'Solo Livehouse']?.replace('bg-', '') || '#6366f1' }}>
                    <h5 className="font-bold text-sm">{e.title}</h5>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-white/40">
                       <Clock size={10} />
                       <span>{e.time}</span>
                    </div>
                  </div>
                ))
              )}
           </div>
        </div>

        <div>
           <h4 className="font-bold text-white/50 text-[10px] uppercase tracking-widest mb-4">Upcoming (Next 7 Days)</h4>
           <div className="space-y-4">
                <p className="text-white/20 text-xs italic">Niners Day (Weekly) • Next: Sunday</p>
           </div>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="lg:col-span-3 space-y-6 order-1 lg:order-2">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <h2 className="text-2xl font-black text-white/90">{format(currentDate, 'MMMM yyyy')}</h2>
               <div className="flex items-center gap-1">
                 <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1 hover:bg-white/5 rounded-full"><ChevronLeft size={20}/></button>
                 <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1 hover:bg-white/5 rounded-full"><ChevronRight size={20}/></button>
                 <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold bg-white/5 rounded-full hover:bg-white/10 transition-colors">Today</button>
               </div>
            </div>
            <button onClick={() => setIsAdding(true)} className="btn-primary flex items-center gap-2">
              <Plus size={18} />
              <span className="hidden sm:inline">Add Event</span>
            </button>
         </div>

         <div className="glass rounded-3xl border border-white/5 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-white/5 bg-white/2">
               {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                 <div key={d} className="py-4 text-center text-[10px] font-black uppercase text-white/30 tracking-widest">{d}</div>
               ))}
            </div>
            <div className="grid grid-cols-7 grid-rows-5 h-[600px]">
               {days.map((day, i) => {
                 const dayEvents = getEventsForDay(day);
                 return (
                   <div key={i} className={cn(
                     "border-r border-b border-white/5 p-2 flex flex-col gap-1 transition-colors hover:bg-white/2",
                     !isSameMonth(day, currentDate) && "opacity-20",
                     isSameDay(day, new Date()) && "bg-purple-500/5"
                   )}>
                      <span className={cn(
                        "text-xs font-bold ml-1 mb-1",
                        isSameDay(day, new Date()) ? "text-purple-400" : "text-white/40"
                      )}>{format(day, 'd')}</span>
                      <div className="space-y-1">
                         {dayEvents.slice(0, 3).map(e => (
                           <div key={e.event_id} className={cn("h-1.5 rounded-full bg-indigo-500")} title={e.title} />
                         ))}
                         {dayEvents.length > 3 && <div className="text-[8px] text-white/20 text-center font-bold">+{dayEvents.length - 3} more</div>}
                      </div>
                   </div>
                 );
               })}
            </div>
         </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdding(false)} className="absolute inset-0 bg-navy/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass w-full max-w-lg rounded-3xl overflow-hidden border border-white/10">
              <div className="p-6 border-b border-white/5 font-black text-white uppercase tracking-widest text-[11px]">Create New Event Entry</div>
              <form onSubmit={handleCreate} className="p-6 space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Event Title</label>
                  <input name="title" required className="w-full glass-input" placeholder="e.g. Niners Day Celebration" />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Target Poppo ID</label>
                    <input 
                      name="hostId" 
                      required={auth.role !== 'Talent'} 
                      disabled={auth.role === 'Talent'}
                      defaultValue={auth.role === 'Talent' ? auth.poppo_id : ''}
                      className="w-full glass-input" 
                      placeholder="Agency" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Event Date</label>
                    <input name="date" type="date" required className="w-full glass-input" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Time (12h format)</label>
                    <input name="time" placeholder="10:00 AM" required className="w-full glass-input font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Visibility</label>
                    <select name="visibility" className="w-full glass-input font-bold">
                       <option value="All">Everyone (Public)</option>
                       <option value="Leadership">Leadership Only</option>
                       <option value="Director">Director Only</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Description / Notes</label>
                  <textarea name="description" className="w-full glass-input h-24 resize-none" placeholder="Details about the event requirements..." />
                </div>

                <div className="pt-4 flex gap-4">
                   <button type="button" onClick={() => setIsAdding(false)} className="flex-1 px-6 py-4 rounded-2xl bg-white/5 text-white/40 font-black uppercase text-[10px] tracking-widest border border-white/5 hover:bg-white/10 transition-colors">Cancel</button>
                   <button type="submit" className="flex-[2] btn-primary py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-500/20">Authorize & Create</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

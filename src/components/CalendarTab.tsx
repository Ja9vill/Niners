import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Info } from 'lucide-react';
import { CalendarEvent } from '../types';
import { Storage } from '../lib/storage';
import { cn } from '../lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { motion } from 'motion/react';

export const CalendarTab = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(Storage.getEvents());

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const getEventsForDay = (day: Date) => events.filter(e => isSameDay(new Date(e.date), day));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase flex items-center gap-2">
            <CalendarIcon className="text-indigo-400" size={24} />
            Agency Events Calendar
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Browse upcoming streams, activities, collaborations, and platform official features.
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all">
            <ChevronLeft size={16}/>
          </button>
          <span className="text-xs font-black text-white px-2 uppercase tracking-wider">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all">
            <ChevronRight size={16}/>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Calendar Grid */}
        <div className="lg:col-span-3 glass-card !p-6">
          <div className="grid grid-cols-7 text-center border-b border-white/5 pb-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 min-h-[300px]">
            {days.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());
              return (
                <div 
                  key={idx} 
                  className={cn(
                    "min-h-[64px] p-2 bg-slate-950/40 rounded-xl border border-white/5 flex flex-col justify-between transition-all hover:bg-slate-900/45",
                    isToday ? "ring-1 ring-indigo-500" : ""
                  )}
                >
                  <span className={cn(
                    "text-xs font-mono font-bold",
                    isToday ? "text-indigo-400" : "text-slate-400"
                  )}>
                    {format(day, 'd')}
                  </span>
                  
                  <div className="space-y-1 mt-1">
                    {dayEvents.slice(0, 2).map((e, index) => (
                      <div 
                        key={index} 
                        className="h-1.5 rounded-full bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.5)]" 
                        title={`${e.title}: ${e.description}`}
                      />
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[8px] text-slate-500 font-bold block">+{dayEvents.length - 2} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Details panel */}
        <div className="glass-card !p-6 space-y-6">
          <div className="border-b border-white/5 pb-3">
             <h4 className="font-black text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
               <Info size={14} className="text-indigo-400" />
               Daily Briefing
             </h4>
          </div>

          <div className="space-y-4">
             {getEventsForDay(new Date()).length === 0 ? (
               <p className="text-slate-500 text-xs italic">No streaming events scheduled for today.</p>
             ) : (
               getEventsForDay(new Date()).map((e, idx) => (
                 <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-1">
                   <span className="text-[8px] font-mono font-black text-indigo-400 uppercase tracking-widest">
                     Target ID #{e.poppo_id}
                   </span>
                   <h5 className="font-bold text-white text-xs">{e.title}</h5>
                   <p className="text-[10px] text-slate-400">{e.description}</p>
                   <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold mt-1 uppercase font-mono">
                      <Clock size={10} />
                      <span>{e.time}</span>
                   </div>
                 </div>
               ))
             )}
          </div>
        </div>

      </div>
    </div>
  );
};

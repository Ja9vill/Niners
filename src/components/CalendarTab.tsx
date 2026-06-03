import React, { useState, useMemo, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, MapPin, Info, User, X, Globe } from 'lucide-react';
import { CalendarEvent, EventType, Host, LivehouseRequest } from '../types';
import { Storage } from '../lib/storage';
import { FirebaseService } from '../lib/firebaseService';
import { cn } from '../lib/utils';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { SingleDatePicker } from './InteractiveDatePicker';
import { AddEventForm } from './AddEventForm';
import { EVENT_COLORS, TIMESLOTS } from '../lib/constants';

const TIMEZONES = [
  { label: 'Philippines (Manila)', value: 'Asia/Manila' },
  { label: 'Cali (Pacific)', value: 'America/Los_Angeles' },
  { label: 'Chicago (Central)', value: 'America/Chicago' },
  { label: 'NYC (Eastern)', value: 'America/New_York' },
  { label: 'UK (London)', value: 'Europe/London' },
  { label: 'Nigeria (Lagos)', value: 'Africa/Lagos' },
  { label: 'Pakistan (Karachi)', value: 'Asia/Karachi' },
  { label: 'Nepal (Kathmandu)', value: 'Asia/Kathmandu' },
  { label: 'HongKong', value: 'Asia/Hong_Kong' },
  { label: 'Brazil (Sao Paulo)', value: 'America/Sao_Paulo' },
];



interface CalendarTabProps {
  isReadOnly?: boolean;
  hosts?: Host[];
}

export const CalendarTab: React.FC<CalendarTabProps> = ({ isReadOnly = false, hosts = [] }) => {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(Storage.getEvents());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedTimezone, setSelectedTimezone] = useState(TIMEZONES[0].value);
  
  // Modals States
  const [isAdding, setIsAdding] = useState(false);
  
  // Multi-select Participants State
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  
  const auth = Storage.getAuthState();
 
  // Livehouse Reservations States
  const [livehouseRequests, setLivehouseRequests] = useState<LivehouseRequest[]>(Storage.getLivehouseRequests());
  const [isReservingLivehouse, setIsReservingLivehouse] = useState(false);
  const [reserveDate, setReserveDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [reserveTimeslot, setReserveTimeslot] = useState('');
  const [reserveNotes, setReserveNotes] = useState('');
  const [selectedLivehouseType, setSelectedLivehouseType] = useState<'SOLO LIVEHOUSE' | 'PARTY LIVEHOUSE'>('SOLO LIVEHOUSE');
 
  // Proposal States (Alternative slot proposal by Manager/Admin)
  const [proposingRequestId, setProposingRequestId] = useState<string | null>(null);
  const [proposalDate, setProposalDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [proposalTimeslot, setProposalTimeslot] = useState('');
  const [eventDate, setEventDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  // Reset selected participants when modal closes/opens
  useEffect(() => {
    if (!isAdding) {
      setSelectedParticipants([]);
    }
  }, [isAdding]);

  // Load events & livehouse requests from Firestore on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const firestoreEvents = await FirebaseService.getCalendarEvents();
        if (firestoreEvents && firestoreEvents.length > 0) {
          Storage.setEvents(firestoreEvents);
          setEvents(firestoreEvents);
        } else {
          // If Firestore is empty, check if we have events in local storage
          const stored = Storage.getEvents();
          if (stored.length > 0) {
            setEvents(stored);
            await FirebaseService.saveCalendarEvents(stored);
          } else {
            // Both are empty, no mock events
            Storage.setEvents([]);
            setEvents([]);
            await FirebaseService.saveCalendarEvents([]);
          }
        }
      } catch (err) {
        console.error("Failed to sync calendar events from Firestore:", err);
        const stored = Storage.getEvents();
        if (stored.length > 0) {
          setEvents(stored);
        }
      }

      try {
        const firestoreReqs = await FirebaseService.getLivehouseRequests();
        if (firestoreReqs && firestoreReqs.length > 0) {
          Storage.setLivehouseRequests(firestoreReqs);
          setLivehouseRequests(firestoreReqs);
        } else {
          const storedReqs = Storage.getLivehouseRequests();
          if (storedReqs.length > 0) {
            setLivehouseRequests(storedReqs);
            await FirebaseService.saveLivehouseRequests(storedReqs);
          }
        }
      } catch (err) {
        console.error("Failed to sync livehouse requests from Firestore:", err);
        const storedReqs = Storage.getLivehouseRequests();
        setLivehouseRequests(storedReqs);
      }
    };
    loadData();
  }, []);

  const filteredEvents = useMemo(() => {
    return events;
  }, [events]);

  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(currentDate, { weekStartsOn: 1 }),
      end: endOfWeek(currentDate, { weekStartsOn: 1 })
    });
  }, [currentDate]);

  const getEventsForDay = (day: Date) => {
    const formattedStr = format(day, 'yyyy-MM-dd');
    return filteredEvents.filter(e => e.date === formattedStr);
  };

  const handleDateClick = (day: Date) => {
    setSelectedDate(day);
    setSelectedEventId(null);
  };

  const goToPreviousWeek = () => {
    setCurrentDate(prev => subWeeks(prev, 1));
    setSelectedEventId(null);
  };

  const goToNextWeek = () => {
    setCurrentDate(prev => addWeeks(prev, 1));
    setSelectedEventId(null);
  };

  const goToPreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
    setSelectedEventId(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
    setSelectedEventId(null);
  };

  const monthDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
    });
  }, [currentDate]);
  // Livehouse Reservation availability checker
  const getTimeslotAvailability = (targetDate: string) => {
    // Find approved calendar events for targetDate of type Solo/Party Livehouse
    const dayEvents = events.filter(event => {
      if (event.date !== targetDate) return false;
      const typeLower = String(event.type || '').toLowerCase();
      return typeLower === 'solo livehouse' || typeLower === 'party livehouse';
    });

    const calendarEventsCount = dayEvents.reduce((acc, event) => {
      const timeKey = event.time;
      acc[timeKey] = (acc[timeKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find all approved livehouse requests in database
    const approvedRequests = livehouseRequests.filter(req => req.date === targetDate && req.status === 'Approved');
    const approvedRequestsCount = approvedRequests.reduce((acc, req) => {
      const timeKey = req.timeslot;
      acc[timeKey] = (acc[timeKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find pending requests count
    const pendingRequests = livehouseRequests.filter(req => req.date === targetDate && req.status === 'Pending Approval');
    const pendingRequestsCount = pendingRequests.reduce((acc, req) => {
      const timeKey = req.timeslot;
      acc[timeKey] = (acc[timeKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Collect event titles for each timeslot
    const timeslotTitles = TIMESLOTS.reduce((acc, slot) => {
      const titles: string[] = [];
      dayEvents.forEach(e => {
        if (e.time === slot && e.title) titles.push(e.title);
      });
      approvedRequests.forEach(r => {
        if (r.timeslot === slot) {
          const reqTitle = `Livehouse: ${r.name}`;
          if (!titles.includes(reqTitle)) {
            titles.push(reqTitle);
          }
        }
      });
      acc[slot] = titles;
      return acc;
    }, {} as Record<string, string[]>);

    return TIMESLOTS.map(slot => {
      const calendarCount = calendarEventsCount[slot] || 0;
      const requestCount = approvedRequestsCount[slot] || 0;
      const count = Math.max(calendarCount, requestCount);
      const isTaken = count >= 2;
      const pendingCount = pendingRequestsCount[slot] || 0;
      const eventTitles = timeslotTitles[slot] || [];

      return {
        slot,
        count,
        isTaken,
        pendingCount,
        eventTitles,
        label: isTaken ? `${slot} [Fully Booked / Taken]` : `${slot} (${2 - count} slots available)`
      };
    });
  };
  // Submit new Livehouse Scheduling Request
  const handleReserveLivehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reserveTimeslot) {
      alert("Please select a timeslot block.");
      return;
    }
    const hostPoppoId = auth.poppo_id;
    const hostName = auth.nickname || auth.name || 'Niner Host';

    // Find assigned manager Poppo ID
    const currentHost = hosts.find(h => h.id === hostPoppoId);
    const managerName = currentHost?.manager || 'Director Miss Nine';
    const managerHost = hosts.find(h => h.nickname === managerName || h.name === managerName);
    const managerId = managerHost?.id || '19157913'; // fallback to director

    const newRequest: LivehouseRequest = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      poppoId: hostPoppoId,
      name: hostName,
      date: reserveDate,
      timeslot: reserveTimeslot,
      status: 'Pending Approval',
      managerId,
      notes: reserveNotes,
      livehouseType: selectedLivehouseType,
      proposedBy: 'Host',
      timestamp: new Date().toISOString()
    };

    const updatedRequests = [...livehouseRequests, newRequest];
    setLivehouseRequests(updatedRequests);
    Storage.setLivehouseRequests(updatedRequests);

    try {
      await FirebaseService.saveLivehouseRequests(updatedRequests);
      await FirebaseService.logSystemActivity(`Host requested livehouse timeslot: ${reserveTimeslot} on ${reserveDate} (Host: ${hostName}, Poppo ID: ${hostPoppoId}, Type: ${selectedLivehouseType}, Notes: "${reserveNotes}")`, 'Info');
    } catch (err) {
      console.error("Firestore sync failed for reservation request:", err);
    }

    Storage.addLog('Calendar', `Requested livehouse slot: ${reserveTimeslot} on ${reserveDate}`, hostName);
    
    // System notification dispatch to manager, head admin, and director
    Storage.addNotification({
      title: 'New Livehouse Request',
      message: `Host ${hostName} (${hostPoppoId}) requested Livehouse slot on ${reserveDate} at ${reserveTimeslot}.`,
      type: 'info'
    });

    setIsReservingLivehouse(false);
    setReserveTimeslot('');
    setReserveNotes('');
  };

  // Approve Livehouse Reservation Request
  const handleApproveRequest = async (reqId: string) => {
    const req = livehouseRequests.find(r => r.id === reqId);
    if (!req) return;

    const updatedRequests = livehouseRequests.map(r => 
      r.id === reqId ? { ...r, status: 'Approved' as const } : r
    );
    setLivehouseRequests(updatedRequests);
    Storage.setLivehouseRequests(updatedRequests);
    // Create Calendar Event
    const newEvent: CalendarEvent = {
      event_id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      poppo_id: req.poppoId,
      event_host_id: req.poppoId,
      title: `Livehouse: ${req.name}`,
      description: req.notes || 'Livehouse timeslot approved.',
      date: req.date,
      time: req.timeslot,
      type: (req.livehouseType || 'SOLO LIVEHOUSE') as EventType,
      location: 'VIRTUAL ROOM (LIVEHOUSE)',
      created_by_name: auth.nickname || auth.name || 'Admin',
      created_by_role: auth.role || 'Admin',
      created_by_id: auth.poppo_id || auth.userId || 'Unknown',
      visibility: 'All',
      participants: [req.poppoId],
      participantIds: [req.poppoId],
      timestamp: new Date().toISOString()
    };

    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);
    Storage.setEvents(updatedEvents);

    try {
      await FirebaseService.saveLivehouseRequests(updatedRequests);
      await FirebaseService.saveCalendarEvents(updatedEvents);
      await FirebaseService.logSystemActivity(`Admin approved livehouse reservation request ID: ${req.id} for Host: ${req.name} (Poppo ID: ${req.poppoId}) on ${req.date} at ${req.timeslot}`, 'Info');
    } catch (err) {
      console.error("Firestore sync failed on approval:", err);
    }

    Storage.addLog('Calendar', `Approved Livehouse slot for ${req.name} on ${req.date} at ${req.timeslot}`, auth.name);

    Storage.addNotification({
      title: 'Reservation Approved',
      message: `Livehouse slot for ${req.name} on ${req.date} at ${req.timeslot} has been approved.`,
      type: 'success'
    });
  };

  // Deny Livehouse Reservation Request
  const handleDenyRequest = async (reqId: string) => {
    const req = livehouseRequests.find(r => r.id === reqId);
    if (!req) return;

    const updatedRequests = livehouseRequests.map(r => 
      r.id === reqId ? { ...r, status: 'Closed' as const } : r
    );
    setLivehouseRequests(updatedRequests);
    Storage.setLivehouseRequests(updatedRequests);

    try {
      await FirebaseService.saveLivehouseRequests(updatedRequests);
      await FirebaseService.logSystemActivity(`Admin denied/closed livehouse reservation request ID: ${req.id} for Host: ${req.name} (Poppo ID: ${req.poppoId}) on ${req.date} at ${req.timeslot}`, 'Info');
    } catch (err) {
      console.error("Firestore sync failed on denial:", err);
    }

    Storage.addLog('Calendar', `Denied Livehouse slot request for ${req.name}`, auth.name);

    Storage.addNotification({
      title: 'Reservation Denied',
      message: `Livehouse request for ${req.name} on ${req.date} has been closed.`,
      type: 'warning'
    });
  };

  // Propose different timeslot from Management
  const handleProposeTimeslot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposingRequestId) return;
    const req = livehouseRequests.find(r => r.id === proposingRequestId);
    if (!req) return;

    const updatedRequests = livehouseRequests.map(r => 
      r.id === proposingRequestId 
        ? { 
            ...r, 
            status: 'New Timeslot Proposed' as const,
            proposedDate: proposalDate,
            proposedTimeslot: proposalTimeslot,
            proposedBy: auth.role
          } 
        : r
    );
    setLivehouseRequests(updatedRequests);
    Storage.setLivehouseRequests(updatedRequests);

    try {
      await FirebaseService.saveLivehouseRequests(updatedRequests);
      await FirebaseService.logSystemActivity(`Admin proposed alternative timeslot for request ID: ${req.id}: ${proposalTimeslot} on ${proposalDate} (Host: ${req.name}, Poppo ID: ${req.poppoId})`, 'Info');
    } catch (err) {
      console.error("Firestore sync failed on slot proposal:", err);
    }

    Storage.addLog('Calendar', `Proposed new slot: ${proposalTimeslot} on ${proposalDate} for ${req.name}`, auth.name);

    Storage.addNotification({
      title: 'Alternative Timeslot Proposed',
      message: `Proposed slot ${proposalTimeslot} on ${proposalDate} to host ${req.name}.`,
      type: 'info'
    });

    setProposingRequestId(null);
    setProposalTimeslot('');
  };

  // Host Accept Proposal
  const handleHostAcceptProposal = async (reqId: string) => {
    const req = livehouseRequests.find(r => r.id === reqId);
    if (!req || !req.proposedDate || !req.proposedTimeslot) return;

    const updatedRequests = livehouseRequests.map(r => 
      r.id === reqId 
        ? { 
            ...r, 
            date: r.proposedDate!, 
            timeslot: r.proposedTimeslot!,
            status: 'Host Accepted Proposal' as const,
            proposedDate: undefined,
            proposedTimeslot: undefined,
            proposedBy: 'Host'
          } 
        : r
    );
    setLivehouseRequests(updatedRequests);
    Storage.setLivehouseRequests(updatedRequests);

    try {
      await FirebaseService.saveLivehouseRequests(updatedRequests);
      await FirebaseService.logSystemActivity(`Host accepted proposed alternative timeslot for request ID: ${req.id}: ${req.proposedTimeslot} on ${req.proposedDate} (Host: ${req.name}, Poppo ID: ${req.poppoId})`, 'Info');
    } catch (err) {
      console.error("Firestore sync failed on proposal acceptance:", err);
    }

    Storage.addLog('Calendar', `Accepted proposed slot: ${req.proposedTimeslot} on ${req.proposedDate}`, req.name);

    Storage.addNotification({
      title: 'Proposal Accepted by Host',
      message: `Host ${req.name} accepted proposed slot. Awaiting final approval.`,
      type: 'info'
    });
  };

  // Host Deny Proposal
  const handleHostDenyProposal = async (reqId: string) => {
    const req = livehouseRequests.find(r => r.id === reqId);
    if (!req) return;

    const updatedRequests = livehouseRequests.map(r => 
      r.id === reqId ? { ...r, status: 'Closed' as const } : r
    );
    setLivehouseRequests(updatedRequests);
    Storage.setLivehouseRequests(updatedRequests);

    try {
      await FirebaseService.saveLivehouseRequests(updatedRequests);
      await FirebaseService.logSystemActivity(`Host denied proposed alternative timeslot for request ID: ${req.id} (Host: ${req.name}, Poppo ID: ${req.poppoId})`, 'Warning');
    } catch (err) {
      console.error("Firestore sync failed on proposal denial:", err);
    }

    Storage.addLog('Calendar', `Denied proposed slot`, req.name);

    Storage.addNotification({
      title: 'Proposal Denied by Host',
      message: `Host ${req.name} denied proposed slot. Request closed.`,
      type: 'warning'
    });
  };

  // Filter requests visible to the logged in user based on role mapping
  const visibleRequests = useMemo(() => {
    const roleLower = String(auth.role || '').toLowerCase();
    const isDirectorOrAdmin = ['director', 'founder', 'head admin', 'head_admin', 'admin'].includes(roleLower) || auth.level >= 2;
    const isManagerOrAgent = ['manager', 'agent'].includes(roleLower);
    const isHost = ['talent', 'host'].includes(roleLower);

    if (isDirectorOrAdmin) {
      return livehouseRequests;
    } else if (isManagerOrAgent) {
      return livehouseRequests.filter(req => req.managerId === auth.poppo_id || req.poppoId === auth.poppo_id);
    } else if (isHost) {
      return livehouseRequests.filter(req => req.poppoId === auth.poppo_id);
    }
    return [];
  }, [livehouseRequests, auth]);

  // Create Event Form submission
  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const isTalent = auth.role === 'Talent';

    const newEvent: CalendarEvent = {
      event_id: crypto.randomUUID(),
      poppo_id: isTalent ? auth.poppo_id : (formData.get('hostId') as string || 'Agency'),
      event_host_id: formData.get('eventHostId') as string || '',
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      type: formData.get('type') as string || 'Agency Event',
      location: formData.get('location') as string || 'ONLINE',
      created_by_name: auth.name,
      created_by_role: auth.role,
      created_by_id: auth.poppo_id || auth.userId || 'Unknown',
      visibility: formData.get('visibility') as any || 'All',
      participants: [...selectedParticipants],
      participantIds: [...selectedParticipants], // alias for Firestore array-contains queries
      timestamp: new Date().toISOString()
    };
    
    const updated = [...events, newEvent];
    Storage.setEvents(updated);
    setEvents(updated);
    Storage.addLog('Calendar', `Created event: ${newEvent.title}`, auth.name);
    FirebaseService.saveCalendarEvents(updated).then(async () => {
      await FirebaseService.logSystemActivity(`Created calendar event entry: "${newEvent.title}" on ${newEvent.date} at ${newEvent.time} (Type: ${newEvent.type}, Location: ${newEvent.location}, Participants: ${newEvent.participants.join(', ')})`, 'Info');
    }).catch(err => {
      console.error("Failed to save calendar events to Firestore:", err);
    });
    setIsAdding(false);
    setSelectedEventId(newEvent.event_id);
    setSelectedDate(new Date(newEvent.date + 'T00:00:00'));
  };

  const selectedDayEvents = getEventsForDay(selectedDate);
  const selectedEvent = events.find(e => e.event_id === selectedEventId);

  return (
    <div className="space-y-6">
      {/* Top Header for Public View */}
      {isReadOnly && (
        <div className="border-b border-t border-[#D4AF37]/15 py-3 flex items-center justify-between px-2">
          <span className="text-xs font-black tracking-[0.25em] text-white/50">NINERS APP</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Main Calendar Section */}
        <div className="space-y-6">
          {/* View Toggles & Navigation controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between bg-[#0F1117] border border-[#D4AF37]/15 p-4 rounded-2xl gap-4 shadow-xl">
            <div className="flex items-center gap-2 bg-[#0A0B0E] p-1.5 rounded-xl border border-[#D4AF37]/10 w-full sm:w-auto">
              <button 
                onClick={() => setViewMode('week')}
                className={cn(
                  "flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer",
                  viewMode === 'week' ? "bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20" : "text-white/40 hover:text-white hover:bg-white/5"
                )}
              >
                Week
              </button>
              <button 
                onClick={() => setViewMode('month')}
                className={cn(
                  "flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer",
                  viewMode === 'month' ? "bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20" : "text-white/40 hover:text-white hover:bg-white/5"
                )}
              >
                Month
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button 
                title="Previous"
                onClick={viewMode === 'week' ? goToPreviousWeek : goToPreviousMonth} 
                className="p-2 bg-[#0A0B0E] border border-[#D4AF37]/10 hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5 rounded-xl transition-all cursor-pointer"
              >
                <ChevronLeft size={16} className="text-[#D4AF37]" />
              </button>
              <div className="text-center min-w-[150px]">
                <h2 className="text-sm font-black text-white tracking-widest uppercase">
                  {viewMode === 'week' 
                    ? `${format(weekDays[0], 'MMM d')} - ${format(weekDays[6], 'MMM d, yyyy')}`
                    : format(currentDate, 'MMMM yyyy')}
                </h2>
              </div>
              <button 
                title="Next"
                onClick={viewMode === 'week' ? goToNextWeek : goToNextMonth} 
                className="p-2 bg-[#0A0B0E] border border-[#D4AF37]/10 hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5 rounded-xl transition-all cursor-pointer"
              >
                <ChevronRight size={16} className="text-[#D4AF37]" />
              </button>
            </div>
          </div>

          {/* Calendar Grids */}
          {viewMode === 'week' ? (
            /* 7-Day Calendar Grid */
            <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 custom-scrollbar">
              <div className="grid grid-cols-7 gap-2 md:gap-4 bg-[#0B0D12] p-4 rounded-3xl border border-[#D4AF37]/10 shadow-xl min-w-[700px]">
                {weekDays.map((day, idx) => {
                  const dayName = format(day, 'EEEE');
                  const dayAbbr = format(day, 'EEE').toUpperCase();
                  const dayNum = format(day, 'd');
                  const isSelected = isSameDay(day, selectedDate);
                  const dayEventsCount = getEventsForDay(day).length;

                  return (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/30 text-center truncate w-full">
                        {dayName}
                      </span>
                      <button
                        onClick={() => handleDateClick(day)}
                        className={cn(
                          "w-full py-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all border cursor-pointer select-none relative bg-gradient-to-br",
                          isSelected 
                            ? "from-indigo-950 to-slate-900 ring-1 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] border-transparent" 
                            : "from-[#0F1117] to-[#13161F] border-[#D4AF37]/10 hover:border-purple-500/50 hover:from-slate-900 hover:to-indigo-950/40 text-white"
                        )}
                      >
                        <span className={cn("text-[9px] font-black tracking-widest uppercase", isSelected ? "text-purple-400" : "text-white/40")}>{dayAbbr}</span>
                        <span className={cn("text-lg font-black tracking-tight", isSelected ? "text-white" : "")}>{dayNum}</span>
                        {dayEventsCount > 0 && !isSelected && <span className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Monthly Grid View */
            <div className="bg-[#0B0D12] p-4 rounded-3xl border border-[#D4AF37]/10 shadow-xl">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                  <div key={day} className="text-center text-[9px] font-black uppercase tracking-widest text-white/30 py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {monthDays.map((day, idx) => {
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isSelected = isSameDay(day, selectedDate);
                  const dayEvents = getEventsForDay(day);
                  const isToday = isSameDay(day, new Date());

                  return (
                    <button
                      key={idx}
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        "aspect-square p-1 sm:p-2 rounded-xl border flex flex-col items-center justify-start gap-1 transition-all cursor-pointer relative group bg-gradient-to-br",
                        !isCurrentMonth ? "opacity-30 border-transparent hover:opacity-100" : "border-[#D4AF37]/5 hover:border-purple-500/50",
                        isSelected ? "from-indigo-950 to-slate-900 ring-1 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] border-transparent" : "from-[#0F1117] to-[#13161F] hover:from-slate-900 hover:to-indigo-950/40",
                        isToday && !isSelected && "ring-1 ring-[#ec4899] border-transparent"
                      )}
                    >
                      <span className={cn(
                        "text-xs sm:text-sm font-black tracking-tight mt-1",
                        isSelected ? "text-purple-400" : isToday ? "text-[#ec4899]" : "text-white"
                      )}>
                        {format(day, 'd')}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-0.5 sm:gap-1 mt-auto w-full px-1">
                          {dayEvents.slice(0, 3).map((e, i) => {
                            const config = EVENT_COLORS[e.type || ''] || { gradient: 'from-slate-400 to-slate-500' };
                            return <div key={i} className={cn("w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gradient-to-br", config.gradient)} />;
                          })}
                          {dayEvents.length > 3 && <span className="text-[8px] text-white/40 font-bold leading-none pl-0.5">+{dayEvents.length - 3}</span>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scheduled Events Panel */}
          <div className="bg-gradient-to-br from-[#0F1117] to-[#12141A] rounded-3xl border border-purple-500/20 p-5 space-y-4 shadow-[0_0_20px_rgba(168,85,247,0.1)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-purple-500/20 pb-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-white/90">
                  Scheduled Events
                </h3>
              </div>
              
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-purple-400" />
                <select 
                  title="Select timezone"
                  aria-label="Select timezone"
                  value={selectedTimezone}
                  onChange={(e) => setSelectedTimezone(e.target.value)}
                  className="bg-[#0A0B0E] border border-purple-500/30 rounded-lg px-2 py-1 text-[10px] font-bold text-white/80 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none cursor-pointer tracking-widest uppercase appearance-none"
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {selectedDayEvents.length > 0 ? (
                selectedDayEvents
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map(e => {
                  const colorConfig = EVENT_COLORS[e.type || ''] || { text: 'text-white/40', bg: 'bg-white/5', gradient: 'from-slate-600 to-slate-400' };
                  
                  // For the timezone display mock
                  const timezoneLabel = TIMEZONES.find(t => t.value === selectedTimezone)?.label.split(' ')[0] || '';
                  const rawTime = e.time.replace(' (Manila Time)', '');
                  const displayTime = selectedTimezone === 'Asia/Manila' ? e.time : `${rawTime} (${timezoneLabel} Time)`;

                  return (
                    <button
                      key={e.event_id}
                      onClick={() => setSelectedEventId(e.event_id)}
                      className="w-full text-left p-4 rounded-xl bg-gradient-to-r from-[#0A0B0E] to-[#13161F] border border-[#D4AF37]/5 hover:border-purple-500/50 transition-all flex gap-4 group items-center cursor-pointer shadow-lg hover:shadow-purple-500/10"
                    >
                      <div className={cn("w-1 h-10 rounded-full shrink-0 bg-gradient-to-b", colorConfig.gradient)} />
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-black text-white truncate group-hover:text-purple-400 transition-colors">{e.title}</h4>
                          <p className="text-[10px] text-slate-300 mt-0.5 line-clamp-1">{e.description || 'No description provided.'}</p>
                        </div>
                        <div className="flex flex-col sm:items-end gap-1 shrink-0">
                          <span className="text-xs font-black text-purple-300 tracking-wider bg-purple-500/10 px-2 py-1 rounded-md border border-purple-500/20">{displayTime}</span>
                        </div>
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#13161F] border border-white/5 flex items-center justify-center">
                    <CalendarIcon size={20} className="text-white/20" />
                  </div>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-black">No events scheduled</p>
                </div>
              )}
            </div>
            
            {/* Action Buttons for interactive page only */}
            {!isReadOnly && (
              <div className="pt-4 border-t border-purple-500/10 flex flex-col sm:flex-row gap-3">
                {auth.level > 0 && (
                  <button 
                    onClick={() => setIsAdding(true)} 
                    className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black uppercase tracking-wider text-xs py-3.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all transform active:scale-95 border border-purple-400/50"
                  >
                    <Plus size={16} />
                    Add Event Entry
                  </button>
                )}

                {['talent', 'host'].includes(auth.role?.toLowerCase() || '') && (
                  <button 
                    onClick={() => setIsReservingLivehouse(true)} 
                    className="flex-1 bg-slate-900 border border-purple-500/50 hover:bg-purple-500/10 text-purple-400 hover:text-white font-black uppercase tracking-[0.2em] text-xs py-3.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-xl transition-all transform active:scale-95"
                  >
                    <Clock size={16} />
                    SCHEDULE LIVEHOUSE
                  </button>
                )}
              </div>
            )}
          </div>
      </div>
      </div>

      {/* Create Event Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdding(false)} className="absolute inset-0 bg-[#0A0B0E]/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#0F1117] border border-[#D4AF37]/20 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="p-6 border-b border-[#D4AF37]/20 font-black text-white uppercase tracking-widest text-[10px]">Schedule New Calendar Event</div>
              <div className="p-6">
                <AddEventForm 
                  onSuccess={() => {
                    setIsAdding(false);
                    // Simple reload to refresh the calendar data visually
                    window.location.reload();
                  }}
                  onCancel={() => setIsAdding(false)}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reserve Livehouse Timeslot Modal */}
      <AnimatePresence>
        {isReservingLivehouse && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReservingLivehouse(false)} className="absolute inset-0 bg-[#0A0B0E]/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#0F1117] border border-[#D4AF37]/20 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="p-6 border-b border-[#D4AF37]/20 font-black text-white uppercase tracking-widest text-[10px]">SCHEDULE LIVEHOUSE</div>
              <form onSubmit={handleReserveLivehouse} className="p-6 space-y-5">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="res-poppo-id" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Poppo ID</label>
                    <input 
                      id="res-poppo-id"
                      disabled 
                      value={auth.poppo_id} 
                      className="w-full bg-[#0A0B0E] border border-[#D4AF37]/15 rounded-xl px-4 py-3 text-sm text-white/50 cursor-not-allowed outline-none" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="res-host-name" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Host Name</label>
                    <input 
                      id="res-host-name"
                      disabled 
                      value={auth.nickname || auth.name} 
                      className="w-full bg-[#0A0B0E] border border-[#D4AF37]/15 rounded-xl px-4 py-3 text-sm text-white/50 cursor-not-allowed outline-none" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="reserve-livehouse-type" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Livehouse Type</label>
                    <select 
                      id="reserve-livehouse-type"
                      value={selectedLivehouseType}
                      onChange={(e) => setSelectedLivehouseType(e.target.value as any)}
                      title="Livehouse Type" 
                      className="w-full bg-[#0A0B0E] border border-[#D4AF37]/15 rounded-xl px-4 py-3 text-sm focus:border-[#D4AF37] outline-none text-white font-bold cursor-pointer"
                    >
                      <option value="SOLO LIVEHOUSE" className="bg-[#0f1117]">SOLO LIVEHOUSE</option>
                      <option value="PARTY LIVEHOUSE" className="bg-[#0f1117]">PARTY LIVEHOUSE</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="reserve-date" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Date Selector</label>
                    <SingleDatePicker 
                      id="reserve-date" 
                      name="reserveDate"
                      value={reserveDate} 
                      onChange={(val) => setReserveDate(val)} 
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest block">Select Timeslot</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {getTimeslotAvailability(reserveDate).map(t => {
                      const displaySlot = t.slot.replace(' (Manila Time)', '');
                      const isSelected = reserveTimeslot === t.slot;
                      
                      let statusText = '2 Available';
                      let statusClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                      if (t.isTaken) {
                        statusText = 'Not Available';
                        statusClass = 'text-red-400 bg-red-500/10 border-red-500/20';
                      } else if (2 - t.count === 1) {
                        statusText = 'Only 1 Available';
                        statusClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                      }

                      return (
                        <button
                          key={t.slot}
                          type="button"
                          disabled={t.isTaken}
                          onClick={() => setReserveTimeslot(t.slot)}
                          className={cn(
                            "p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2.5 relative overflow-hidden",
                            t.isTaken
                              ? "bg-[#0A0B0E]/40 border-red-500/10 cursor-not-allowed opacity-50"
                              : isSelected
                                ? "bg-[#181B24] border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.15)] text-white"
                                : "bg-[#0A0B0E] border-[#D4AF37]/10 hover:border-[#D4AF37]/20 hover:bg-[#12151D] text-white/70"
                          )}
                        >
                          <div className="flex justify-between items-start gap-2 w-full">
                            <span className="font-mono text-xs font-black tracking-tight">{displaySlot}</span>
                            <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shrink-0", statusClass)}>
                              {statusText}
                            </span>
                          </div>

                          {t.pendingCount > 0 && (
                            <div className="text-[9px] font-bold text-amber-500 bg-amber-500/5 px-2 py-1 rounded-md border border-amber-500/10 w-fit">
                              {t.pendingCount} pending request{t.pendingCount > 1 ? 's' : ''}
                            </div>
                          )}

                          {t.eventTitles.length > 0 && (
                            <div className="space-y-1 mt-1 border-t border-white/5 pt-1.5 w-full">
                              <span className="block text-[8px] font-black text-white/30 uppercase tracking-wider">Booked Events:</span>
                              {t.eventTitles.map((title, i) => (
                                <p key={i} className="text-[9px] font-bold text-white/60 truncate" title={title}>
                                  • {title}
                                </p>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="reserve-notes" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Description / Special Request Notes</label>
                  <textarea 
                    id="reserve-notes" 
                    value={reserveNotes} 
                    onChange={(e) => setReserveNotes(e.target.value)} 
                    title="Reservation Notes" 
                    className="w-full bg-[#0A0B0E] border border-[#D4AF37]/15 rounded-xl p-4 text-sm focus:border-[#D4AF37] outline-none text-white h-24 resize-none placeholder-white/20" 
                    placeholder="Provide details for your livehouse set..." 
                  />
                </div>

                <div className="pt-2 flex gap-4">
                  <button type="button" onClick={() => setIsReservingLivehouse(false)} className="flex-1 px-6 py-4 rounded-xl bg-slate-900 border border-[#D4AF37]/15 text-white/40 font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">Cancel</button>
                  <button type="submit" className="flex-[2] bg-slate-900 border border-[#D4AF37] hover:bg-[#D4AF37]/5 text-[#D4AF37] hover:text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all cursor-pointer">Submit Schedule Request</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Event Spotlight Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setSelectedEventId(null)} 
              className="absolute inset-0 bg-[#0A0B0E]/90 backdrop-blur-md cursor-pointer" 
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative w-full max-w-2xl bg-[#0F1117] border border-[#D4AF37]/20 rounded-3xl shadow-[0_0_50px_rgba(212,175,55,0.1)] z-10 max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-transparent to-[#D4AF37]/5 pointer-events-none" />
              
              <div className="p-5 sm:p-6 border-b border-[#D4AF37]/10 flex items-center justify-between bg-black/20 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]", EVENT_COLORS[selectedEvent.type || '']?.text || "text-white bg-white")} />
                  <span className="font-black text-white uppercase tracking-widest text-xs sm:text-sm">Event Spotlight</span>
                </div>
                <button 
                  title="Close"
                  onClick={() => setSelectedEventId(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar flex-1 relative z-10 space-y-8">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                      EVENT_COLORS[selectedEvent.type || '']?.bg || "bg-white/10",
                      EVENT_COLORS[selectedEvent.type || '']?.text || "text-white"
                    )}>
                      {selectedEvent.type || 'Standard Event'}
                    </span>
                    <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest bg-white/5 px-2 py-1 rounded border border-[#D4AF37]/15">
                      ID: {selectedEvent.event_id}
                    </span>
                  </div>
                  
                  <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                    {selectedEvent.title}
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-2">Schedule</span>
                      <div className="bg-[#0A0B0E]/60 border border-[#D4AF37]/10 rounded-2xl p-4 space-y-2">
                        <div className="flex items-center gap-3 text-white">
                          <CalendarIcon size={16} className="text-white/40" />
                          <span className="font-mono font-bold text-sm">{format(parseISO(selectedEvent.date), 'EEEE, MMMM d, yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-3 text-white/80">
                          <Clock size={16} className="text-white/40" />
                          <span className="font-mono font-semibold text-xs">{selectedEvent.time || 'Time TBD'}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-2">Location</span>
                      <div className="flex items-center gap-2.5 font-bold text-white uppercase bg-[#0A0B0E]/60 px-4 py-3 rounded-2xl border border-[#D4AF37]/10 w-fit">
                        <MapPin size={16} className="text-red-400" />
                        <span className="text-sm">{selectedEvent.location || 'Online'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-2">Description</span>
                      <p className="font-medium text-white/70 leading-relaxed bg-[#0A0B0E]/60 border border-[#D4AF37]/10 rounded-2xl p-4 text-sm min-h-[100px]">
                        {selectedEvent.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[9px] font-black uppercase tracking-wider text-white/40 mb-1">Host ID</span>
                        <span className="inline-flex px-3 py-2 bg-[#0A0B0E]/60 border border-[#D4AF37]/10 rounded-xl font-mono font-bold text-white/90 text-xs">
                          {selectedEvent.poppo_id}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-black uppercase tracking-wider text-white/40 mb-1">Visibility</span>
                        <span className="inline-flex px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl font-bold text-xs uppercase">
                          {selectedEvent.visibility}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedEvent.participants && selectedEvent.participants.length > 0 && (
                  <div className="pt-6 border-t border-[#D4AF37]/10">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-3">
                      Participants ({selectedEvent.participants.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.participants.map(poppoId => {
                        const pHost = (hosts || []).find(h => h.id === poppoId);
                        const dispName = pHost ? `${pHost.nickname || pHost.name}` : `User #${poppoId}`;
                        return (
                          <div key={poppoId} className="bg-[#0A0B0E] border border-[#D4AF37]/20 rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-[120px]">
                            <span className="text-xs font-black text-white truncate max-w-[150px]">{dispName}</span>
                            <span className="text-[9px] font-mono text-white/40">ID: {poppoId}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-6 mt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-white/60 text-[10px] font-bold uppercase tracking-wider">
                    <User size={12} className="text-white/40" />
                    <span>Created by: {selectedEvent.created_by_name} <span className="text-[#D4AF37] ml-1">[{selectedEvent.created_by_role}]</span></span>
                  </div>
                  <span className="font-mono text-white/30 text-[9px]">
                    Created: {new Date(selectedEvent.timestamp || new Date()).toLocaleString()}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

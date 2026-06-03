import React, { useState, useMemo, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, MapPin, Info, User } from 'lucide-react';
import { CalendarEvent, EventType, Host, LivehouseRequest } from '../types';
import { Storage } from '../lib/storage';
import { FirebaseService } from '../lib/firebaseService';
import { cn, formatNumber } from '../lib/utils';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { SingleDatePicker } from './InteractiveDatePicker';
import { AddEventForm } from './AddEventForm';

const EVENT_COLORS: Record<string, { bg: string; text: string; gradient: string; cardGradient: string; border: string; borderHover: string }> = {
  'OFFICIAL PK': { 
    bg: 'bg-[#f43f5e]/10 border-[#f43f5e]/20', 
    text: 'text-[#f43f5e]', 
    gradient: 'from-[#f43f5e] to-[#fda4af]',
    cardGradient: 'bg-gradient-to-br from-[#f43f5e]/10 via-[#f43f5e]/2 to-[#0F1117]',
    border: 'border-[#f43f5e]/20',
    borderHover: 'hover:border-[#f43f5e]/40'
  },
  'SOLO LIVEHOUSE': { 
    bg: 'bg-[#f97316]/10 border-[#f97316]/20', 
    text: 'text-[#f97316]', 
    gradient: 'from-[#f97316] to-[#fdba74]',
    cardGradient: 'bg-gradient-to-br from-[#f97316]/10 via-[#f97316]/2 to-[#0F1117]',
    border: 'border-[#f97316]/20',
    borderHover: 'hover:border-[#f97316]/40'
  },
  'PARTY LIVEHOUSE': { 
    bg: 'bg-[#ec4899]/10 border-[#ec4899]/20', 
    text: 'text-[#ec4899]', 
    gradient: 'from-[#ec4899] to-[#fbcfe8]',
    cardGradient: 'bg-gradient-to-br from-[#ec4899]/10 via-[#ec4899]/2 to-[#0F1117]',
    border: 'border-[#ec4899]/20',
    borderHover: 'hover:border-[#ec4899]/40'
  },
  'AGENCY EVENT': { 
    bg: 'bg-[#10b981]/10 border-[#10b981]/20', 
    text: 'text-[#10b981]', 
    gradient: 'from-[#10b981] to-[#6ee7b7]',
    cardGradient: 'bg-gradient-to-br from-[#10b981]/10 via-[#10b981]/2 to-[#0F1117]',
    border: 'border-[#10b981]/20',
    borderHover: 'hover:border-[#10b981]/40'
  },
  'POPPO EVENT': { 
    bg: 'bg-[#3b82f6]/10 border-[#3b82f6]/20', 
    text: 'text-[#3b82f6]', 
    gradient: 'from-[#3b82f6] to-[#93c5fd]',
    cardGradient: 'bg-gradient-to-br from-[#3b82f6]/10 via-[#3b82f6]/2 to-[#0F1117]',
    border: 'border-[#3b82f6]/20',
    borderHover: 'hover:border-[#3b82f6]/40'
  },
  'EXTERNAL EVENT': { 
    bg: 'bg-[#8b5cf6]/10 border-[#8b5cf6]/20', 
    text: 'text-[#8b5cf6]', 
    gradient: 'from-[#8b5cf6] to-[#c084fc]',
    cardGradient: 'bg-gradient-to-br from-[#8b5cf6]/10 via-[#8b5cf6]/2 to-[#0F1117]',
    border: 'border-[#8b5cf6]/20',
    borderHover: 'hover:border-[#8b5cf6]/40'
  }
};

const TIMESLOTS = [
  '09:00 AM - 10:00 AM (Manila Time)',
  '10:00 AM - 11:00 AM (Manila Time)',
  '11:00 AM - 12:00 PM (Manila Time)',
  '02:00 PM - 03:00 PM (Manila Time)',
  '03:00 PM - 04:00 PM (Manila Time)',
  '04:00 PM - 05:00 PM (Manila Time)',
  '05:00 PM - 06:00 PM (Manila Time)',
  '07:00 PM - 08:00 PM (Manila Time)',
  '08:00 PM - 09:00 PM (Manila Time)',
  '09:00 PM - 10:00 PM (Manila Time)',
  '10:00 PM - 11:00 PM (Manila Time)'
];

interface CalendarTabProps {
  isReadOnly?: boolean;
  hosts?: Host[];
}

export const CalendarTab: React.FC<CalendarTabProps> = ({ isReadOnly = false, hosts = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(Storage.getEvents());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  
  // Modals States
  const [isAdding, setIsAdding] = useState(false);
  
  // Multi-select Participants State
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  
  const [activeFilters, setActiveFilters] = useState<EventType[]>([]);
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
    return events.filter(e => activeFilters.length === 0 || activeFilters.includes(e.type as EventType));
  }, [events, activeFilters]);

  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: startOfWeek(currentDate, { weekStartsOn: 0 }),
      end: endOfWeek(currentDate, { weekStartsOn: 0 })
    });
  }, [currentDate]);

  const getEventsForDay = (day: Date) => {
    const formattedStr = format(day, 'yyyy-MM-dd');
    return filteredEvents.filter(e => e.date === formattedStr);
  };

  const toggleFilter = (type: EventType) => {
    setActiveFilters(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
    setSelectedEventId(null);
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Calendar Section */}
        <div className="lg:col-span-3 space-y-6">
          {/* Week Selector / Navigation controls */}
          <div className="flex items-center justify-between bg-[#0F1117] border border-[#D4AF37]/15 p-4 rounded-2xl">
            <button 
              onClick={goToPreviousWeek} 
              className="p-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer"
              title="Previous Week"
              aria-label="Previous Week"
            >
              <ChevronLeft size={20} className="text-white/60 hover:text-white" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-black text-white tracking-widest uppercase">
                {format(weekDays[0], 'MMMM d')} - {format(weekDays[6], 'MMMM d, yyyy')}
              </h2>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">Week View</p>
            </div>
            <button 
              onClick={goToNextWeek} 
              className="p-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer"
              title="Next Week"
              aria-label="Next Week"
            >
              <ChevronRight size={20} className="text-white/60 hover:text-white" />
            </button>
          </div>

          {/* 7-Day Calendar Grid */}
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
                      "w-full py-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all border cursor-pointer select-none relative",
                      isSelected 
                        ? "bg-[#181B24] border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.15)] text-[#D4AF37]" 
                        : "bg-[#0F1117] border-[#D4AF37]/10 hover:border-[#D4AF37]/20 hover:bg-[#13161F] text-white"
                    )}
                    title={`Select ${dayName}`}
                    aria-label={`Select ${dayName}`}
                  >
                    <span className={cn(
                      "text-[9px] font-black tracking-widest uppercase",
                      isSelected ? "text-[#D4AF37]" : "text-white/40"
                    )}>
                      {dayAbbr}
                    </span>
                    <span className="text-lg font-black tracking-tight">
                      {dayNum}
                    </span>
                    {dayEventsCount > 0 && !isSelected && (
                      <span className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

          {/* Events Section Heading */}
          <div className="flex items-center justify-between border-b border-[#D4AF37]/15 pb-3">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
              Scheduled Events ({format(selectedDate, 'EEEE, MMMM d')})
            </h3>
            <span className="text-[10px] font-bold text-white/40 uppercase font-mono">
              {selectedDayEvents.length} {selectedDayEvents.length === 1 ? 'Event' : 'Events'}
            </span>
          </div>

          {/* Events List */}
          <div className="space-y-4">
            {selectedDayEvents.length > 0 ? (
              selectedDayEvents.map(e => {
                const isEventSelected = selectedEventId === e.event_id;
                
                const colorConfig = EVENT_COLORS[e.type || ''] || {
                  bg: 'bg-[#D4AF37]/5 border-[#D4AF37]/10',
                  text: 'text-white/40',
                  gradient: 'from-slate-600 to-slate-400',
                  cardGradient: 'bg-gradient-to-br from-[#D4AF37]/5 via-transparent to-[#0F1117]',
                  border: 'border-[#D4AF37]/10',
                  borderHover: 'hover:border-[#D4AF37]/20'
                };
                
                return (
                  <button
                    key={e.event_id}
                    onClick={() => setSelectedEventId(e.event_id)}
                    className={cn(
                      "w-full text-left p-5 rounded-2xl relative overflow-hidden transition-all flex items-stretch gap-4 border cursor-pointer group shadow-lg",
                      colorConfig.cardGradient,
                      isEventSelected 
                        ? "border-[#D4AF37] ring-1 ring-[#D4AF37]/30 bg-[#13161C] shadow-[0_0_15px_rgba(212,175,55,0.15)]" 
                        : cn(colorConfig.border, colorConfig.borderHover)
                    )}
                  >
                    <div className={cn("w-1.5 rounded-full shrink-0 bg-gradient-to-b", colorConfig.gradient)} />
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-4">
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                          colorConfig.bg,
                          colorConfig.text
                        )}>
                          {e.type || 'Event'}
                        </span>
                        <span className="font-mono text-xs font-bold text-[#67e8f9]">
                          {e.time || '02:00 PM - 04:00 PM (Manila Time)'}
                        </span>
                      </div>
                      
                      <div>
                        <h4 className="font-black text-white text-base tracking-tight uppercase group-hover:text-[#D4AF37] transition-colors">
                          {e.title}
                        </h4>
                        <p className="text-xs text-white/55 font-medium leading-relaxed mt-1">
                          {e.description}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-white/40 tracking-wider uppercase pt-1">
                        <svg className="w-3.5 h-3.5 text-white/30 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>{e.location || 'ONLINE'}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="bg-[#0F1117]/30 border border-dashed border-[#D4AF37]/10 rounded-2xl py-12 text-center">
                <CalendarIcon className="mx-auto text-white/10 mb-2" size={28} />
                <p className="text-xs text-white/20 italic">No events scheduled for this date.</p>
              </div>
            )}
          </div>

          {/* Detailed Interactive Card */}
          <div className="bg-[#0F1117] border border-[#D4AF37]/10 rounded-3xl p-6 shadow-xl relative overflow-hidden bg-gradient-to-br from-[#0F1117] to-[#12141A]">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/2 via-transparent to-[#D4AF37]/2 pointer-events-none" />
            
            {selectedEvent ? (
              <div className="space-y-5 relative z-10">
                <div className="flex items-center justify-between border-b border-[#D4AF37]/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Info size={14} className="text-[#D4AF37]" />
                    <span className="text-[10px] font-black uppercase text-[#D4AF37] tracking-widest">
                      Complete Event Metadata
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-[#D4AF37]/15">
                    ID: {selectedEvent.event_id}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-4">
                    <div>
                      <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Event Title</span>
                      <p className="font-extrabold text-white text-base uppercase tracking-tight">{selectedEvent.title}</p>
                    </div>
                    <div>
                      <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Description / Notes</span>
                      <p className="font-medium text-white/60 leading-relaxed bg-[#0A0B0E]/60 border border-[#D4AF37]/10 rounded-xl p-3.5">
                        {selectedEvent.description || 'No description provided.'}
                      </p>
                    </div>
                    {selectedEvent.location && (
                      <div>
                        <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Location Details</span>
                        <div className="flex items-center gap-1.5 font-bold text-white uppercase bg-[#0A0B0E]/30 px-3 py-2 rounded-xl border border-[#D4AF37]/10 w-fit">
                          <MapPin size={13} className="text-red-400" />
                          <span>{selectedEvent.location}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4 md:border-l md:border-[#D4AF37]/10 md:pl-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Target Date</span>
                        <p className="font-mono font-bold text-white bg-[#0A0B0E]/40 px-2.5 py-1.5 rounded-lg border border-[#D4AF37]/10 w-fit">{selectedEvent.date}</p>
                      </div>
                      <div>
                        <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Scheduled Time</span>
                        <p className="font-mono font-bold text-white bg-[#0A0B0E]/40 px-2.5 py-1.5 rounded-lg border border-[#D4AF37]/10 w-fit">{selectedEvent.time || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Host ID</span>
                        <span className="inline-flex px-2.5 py-1.5 bg-[#0A0B0E]/40 border border-[#D4AF37]/10 rounded-lg font-mono font-bold text-white/80">
                          {selectedEvent.poppo_id}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">System Visibility</span>
                        <span className="inline-flex px-2.5 py-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg font-bold">
                          {selectedEvent.visibility}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Event Category</span>
                        <span className="inline-flex px-2.5 py-1.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] rounded-lg font-bold">
                          {selectedEvent.type || 'Standard Event'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Authorized By</span>
                        <div className="flex items-center gap-1.5 text-white/80 font-bold">
                          <User size={13} className="text-white/45" />
                          <span>
                            {selectedEvent.created_by_name}{' '}
                            <span className="text-[9px] text-[#D4AF37] font-black uppercase">[{selectedEvent.created_by_role}]</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedEvent.event_host_id && (
                      <div>
                        <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Event Host ID</span>
                        <p className="font-mono font-bold text-white bg-[#0A0B0E]/40 px-2.5 py-1.5 rounded-lg border border-[#D4AF37]/10 w-fit">
                          {selectedEvent.event_host_id}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Created Timestamp</span>
                      <p className="font-mono text-white/40 text-[10px] bg-[#0A0B0E]/30 px-2.5 py-1 rounded-lg border border-[#D4AF37]/10 w-fit">
                        {new Date(selectedEvent.timestamp || new Date()).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Niners Participants display */}
                  {selectedEvent.participants && selectedEvent.participants.length > 0 && (
                    <div className="md:col-span-2 pt-2 border-t border-[#D4AF37]/10">
                      <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-2">Niners Participants ({selectedEvent.participants.length})</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedEvent.participants.map(poppoId => {
                          const pHost = (hosts || []).find(h => h.id === poppoId);
                          const dispName = pHost ? `${pHost.nickname || pHost.name} (#${poppoId})` : `#${poppoId}`;
                          return (
                            <span key={poppoId} className="bg-slate-800/60 border border-[#D4AF37]/15 rounded-lg px-2.5 py-1 text-[10px] font-semibold text-white/90">
                              {dispName}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-10 text-center space-y-2 relative z-10">
                <CalendarIcon className="mx-auto text-white/10 animate-pulse" size={32} />
                <p className="text-xs text-white/30 italic">Tap any scheduled event card above to reveal full interactive metadata details.</p>
              </div>
            )}
          </div>

          {/* Livehouse Reservation Requests Queue Panel */}
          {!isReadOnly && auth.role && (
            <div className="bg-[#0F1117] border border-[#D4AF37]/10 rounded-3xl p-6 shadow-xl bg-gradient-to-br from-[#0F1117] to-[#12141A] mt-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/2 via-transparent to-[#D4AF37]/2 pointer-events-none" />
              
              <div className="flex items-center justify-between border-b border-[#D4AF37]/10 pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-[#ec4899]" />
                  <span className="text-[10px] font-black uppercase text-white tracking-widest">
                    Livehouse Reservation Requests Queue
                  </span>
                </div>
                <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-[#D4AF37]/15 font-bold">
                  Requests: {visibleRequests.length}
                </span>
              </div>

              {visibleRequests.length > 0 ? (
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                  {visibleRequests.map(req => {
                    const isOwnRequest = req.poppoId === auth.poppo_id;
                    const roleLower = String(auth.role || '').toLowerCase();
                    const canManage = ['director', 'founder', 'head admin', 'head_admin', 'admin', 'manager', 'agent'].includes(roleLower) || auth.level >= 2;
                    const canApprove = ['director', 'founder', 'head admin', 'head_admin'].includes(roleLower);
                    
                    let statusColor = 'bg-slate-500/10 border-slate-500/20 text-slate-400';
                    if (req.status === 'Approved') statusColor = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                    if (req.status === 'Pending Approval' || req.status === 'Host Accepted Proposal') statusColor = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                    if (req.status === 'New Timeslot Proposed') statusColor = 'bg-pink-500/10 border-pink-500/20 text-pink-400';
                    if (req.status === 'Closed') statusColor = 'bg-red-500/10 border-red-500/20 text-red-400';

                    return (
                      <div key={req.id} className="bg-[#0A0B0E]/60 border border-[#D4AF37]/10 rounded-2xl p-4 space-y-3 shadow-lg relative group hover:border-[#ec4899]/30 transition-all font-sans">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className={cn("px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider", statusColor)}>
                              {req.status}
                            </span>
                            <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider font-mono">
                              ID: {req.id.slice(0, 8)}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-white/30">
                            {new Date(req.timestamp).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1">
                            <p className="font-extrabold text-white uppercase text-sm tracking-tight">{req.name} <span className="text-[10px] text-white/40 font-mono font-bold font-sans tracking-normal">(#{req.poppoId})</span></p>
                            <p className="text-white/60 text-xs">
                              Requested Set: <span className="font-extrabold text-[#ec4899] uppercase">{req.timeslot}</span> on <span className="font-bold text-white font-mono">{req.date}</span>
                            </p>
                            {req.notes && (
                              <p className="text-white/45 italic leading-relaxed text-[11px] bg-black/20 p-2 rounded-lg mt-1.5">
                                "{req.notes}"
                              </p>
                            )}
                          </div>

                          {/* Proposed status detail */}
                          {req.status === 'New Timeslot Proposed' && (
                            <div className="bg-pink-500/5 border border-pink-500/10 rounded-xl p-3 space-y-1.5 self-center">
                              <span className="block text-[8px] font-black uppercase text-pink-400 tracking-wider">Alternative Proposal</span>
                              <p className="text-xs text-white/80 font-semibold">
                                Manager Proposed: <span className="font-mono text-white font-bold">{req.proposedDate}</span> at <span className="text-pink-400 font-extrabold">{req.proposedTimeslot}</span>
                              </p>
                              <span className="text-[9px] text-white/40 font-medium block">Proposed by: {req.proposedBy || 'Management'}</span>
                            </div>
                          )}

                          {/* Host actions on proposals */}
                          {req.status === 'New Timeslot Proposed' && isOwnRequest && (
                            <div className="flex items-center gap-2 pt-1 self-center justify-end">
                              <button 
                                onClick={() => handleHostAcceptProposal(req.id)}
                                className="bg-slate-900 border border-[#D4AF37] hover:bg-[#D4AF37]/10 text-[#D4AF37] text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg cursor-pointer transition-all active:scale-95 shadow-lg shadow-[#D4AF37]/5"
                              >
                                Accept proposal
                              </button>
                              <button 
                                onClick={() => handleHostDenyProposal(req.id)}
                                className="bg-slate-900 border border-red-500/50 hover:bg-red-500/10 text-red-400 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg cursor-pointer transition-all active:scale-95"
                              >
                                Deny
                              </button>
                            </div>
                          )}

                          {/* Manager Actions on request */}
                          {(req.status === 'Pending Approval' || req.status === 'Host Accepted Proposal') && canManage && (
                            <div className="flex flex-wrap items-center gap-2 pt-1 self-center justify-end">
                              {canApprove && (
                                <button 
                                  onClick={() => handleApproveRequest(req.id)}
                                  className="bg-slate-900 border border-emerald-500/70 hover:bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg cursor-pointer transition-all active:scale-95 shadow-lg shadow-emerald-500/5"
                                >
                                  Approve slot
                                </button>
                              )}
                              <button 
                                onClick={() => setProposingRequestId(req.id)}
                                className="bg-slate-900 border border-pink-500/50 hover:bg-pink-500/10 text-pink-400 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg cursor-pointer transition-all active:scale-95"
                              >
                                Propose Alt
                              </button>
                              <button 
                                onClick={() => handleDenyRequest(req.id)}
                                className="bg-slate-900 border border-red-500/50 hover:bg-red-500/10 text-red-400 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg cursor-pointer transition-all active:scale-95"
                              >
                                Deny
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Propose different slot inline mini-form */}
                        {proposingRequestId === req.id && (
                          <div className="bg-[#12141C] border border-[#D4AF37]/15 rounded-xl p-4 mt-3 space-y-3">
                            <h5 className="text-[10px] font-black text-white/50 uppercase tracking-widest">Propose Alternative Timeslot</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label htmlFor={`prop-date-${req.id}`} className="text-[8px] font-black text-white/40 uppercase tracking-wider block">Proposal Date</label>
                                <SingleDatePicker 
                                  id={`prop-date-${req.id}`}
                                  name="proposedDate"
                                  value={proposalDate} 
                                  onChange={(val) => setProposalDate(val)} 
                                  required 
                                  title="Proposal Date" 
                                />
                              </div>
                              <div className="space-y-1">
                                <label htmlFor={`prop-timeslot-${req.id}`} className="text-[8px] font-black text-white/40 uppercase tracking-wider block">Timeslot Option</label>
                                <select 
                                  id={`prop-timeslot-${req.id}`}
                                  value={proposalTimeslot} 
                                  onChange={(e) => setProposalTimeslot(e.target.value)} 
                                  required 
                                  title="Proposal Timeslot Option" 
                                  className="w-full bg-[#0A0B0E] border border-[#D4AF37]/15 rounded-lg px-3 py-2 text-xs focus:border-[#D4AF37] outline-none text-white font-bold cursor-pointer"
                                >
                                  <option value="">-- Choose timeslot --</option>
                                  {getTimeslotAvailability(proposalDate).map(t => (
                                    <option 
                                      key={t.slot} 
                                      value={t.slot} 
                                      disabled={t.isTaken} 
                                      className={cn("bg-[#0f1117]", t.isTaken ? "text-red-500/50" : "text-white")}
                                    >
                                      {t.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button 
                                type="button" 
                                onClick={() => setProposingRequestId(null)} 
                                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-[#D4AF37]/15 text-white/45 text-[9px] font-black uppercase tracking-wider hover:bg-slate-800 transition-colors"
                              >
                                Cancel
                              </button>
                              <button 
                                type="button" 
                                onClick={handleProposeTimeslot}
                                disabled={!proposalTimeslot}
                                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-[#ec4899] text-[#ec4899] hover:text-white text-[9px] font-black uppercase tracking-wider hover:bg-[#ec4899]/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Submit Proposal
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-white/20 italic text-xs">
                  No active livehouse reservation requests in your queue.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: Event Options & Create */}
        <div className="space-y-6">
          {/* Filter options */}
          <div className="bg-[#0F1117] border border-[#D4AF37]/15 p-4 rounded-2xl space-y-3 shadow-lg">
            <h4 className="font-black text-white/40 text-[9px] uppercase tracking-widest">Filter by Type</h4>
            <div className="flex flex-col gap-1.5">
              {Object.keys(EVENT_COLORS).map(type => {
                const isActive = activeFilters.includes(type as EventType);
                const colorConfig = EVENT_COLORS[type];
                return (
                  <button
                    key={type}
                    onClick={() => toggleFilter(type as EventType)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border border-transparent cursor-pointer",
                      isActive
                        ? "bg-slate-800 border-[#D4AF37]/20 text-white"
                        : "bg-[#0A0B0E] border-[#D4AF37]/10 text-slate-500 hover:text-white/60"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className={cn("w-1.5 h-1.5 rounded-full bg-gradient-to-b", colorConfig.gradient)} />
                      {type}
                    </span>
                  </button>
                );
              })}
              {activeFilters.length > 0 && (
                <button 
                  onClick={() => { setActiveFilters([]); setSelectedEventId(null); }}
                  className="mt-2 text-center text-[9px] font-black uppercase text-[#D4AF37] hover:underline cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons for interactive page only */}
          {!isReadOnly && (
            <div className="space-y-3">
              {auth.level > 0 && (
                <button 
                  onClick={() => setIsAdding(true)} 
                  className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-black font-black uppercase tracking-wider text-xs py-3.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#D4AF37]/5 transition-all transform active:scale-95"
                >
                  <Plus size={16} />
                  Add Event Entry
                </button>
              )}

              {['talent', 'host'].includes(auth.role?.toLowerCase() || '') && (
                <button 
                  onClick={() => setIsReservingLivehouse(true)} 
                  className="w-full bg-slate-900 border border-[#D4AF37] hover:bg-[#D4AF37]/5 text-[#D4AF37] hover:text-white font-black uppercase tracking-[0.2em] text-xs py-3.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-xl transition-all transform active:scale-95"
                >
                  <Plus size={16} />
                  SCHEDULE LIVEHOUSE
                </button>
              )}
            </div>
          )}
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
    </div>
  );
};

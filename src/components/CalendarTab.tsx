import React, { useState, useMemo, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, MapPin, Info, User, X, Globe, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { CalendarEvent, EventType, Host, LivehouseRequest } from '../types';
import { Storage } from '../lib/storage';
import { FirebaseService } from '../lib/firebaseService';
import { cn } from '../lib/utils';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { SingleDatePicker } from './InteractiveDatePicker';
import { AddEventForm } from './AddEventForm';
import { EVENT_COLORS, TIMESLOTS } from '../lib/constants';
import { collection, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';



const TIMESLOT_BLOCKS = [
  {
    name: 'Morning',
    slots: [
      '09:00 AM - 10:00 AM (Manila Time)',
      '10:00 AM - 11:00 AM (Manila Time)',
      '11:00 AM - 12:00 PM (Manila Time)'
    ]
  },
  {
    name: 'Afternoon',
    slots: [
      '02:00 PM - 03:00 PM (Manila Time)',
      '03:00 PM - 04:00 PM (Manila Time)',
      '04:00 PM - 05:00 PM (Manila Time)',
      '05:00 PM - 06:00 PM (Manila Time)'
    ]
  },
  {
    name: 'Evening',
    slots: [
      '07:00 PM - 08:00 PM (Manila Time)',
      '08:00 PM - 09:00 PM (Manila Time)',
      '09:00 PM - 10:00 PM (Manila Time)',
      '10:00 PM - 11:00 PM (Manila Time)'
    ]
  }
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
  const [timeDisplayMode, setTimeDisplayMode] = useState<'Manila' | 'Local'>('Manila');
  
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
      const evDate = event.date || event.event_date;
      if (evDate !== targetDate) return false;
      const evType = event.eventType || event.type || event.type_of_event || '';
      const typeLower = String(evType).trim().toLowerCase();
      return typeLower === 'solo livehouse' || typeLower === 'party livehouse';
    });

    const calendarEventsCount = dayEvents.reduce((acc, event) => {
      const timeKey = event.time || '';
      acc[timeKey] = (acc[timeKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find pending requests count
    const pendingRequests = livehouseRequests.filter(req => req.date === targetDate && req.status === 'Pending Approval');
    const pendingRequestsCount = pendingRequests.reduce((acc, req) => {
      const timeKey = req.timeslot || '';
      acc[timeKey] = (acc[timeKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Collect event titles for each timeslot
    const timeslotTitles = TIMESLOTS.reduce((acc, slot) => {
      const titles: string[] = [];
      dayEvents.forEach(e => {
        if (e.time === slot && e.title) titles.push(e.title);
      });
      acc[slot] = titles;
      return acc;
    }, {} as Record<string, string[]>);

    return TIMESLOTS.map(slot => {
      const count = calendarEventsCount[slot] || 0;
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
      created_by_id: auth.poppo_id || auth.id || 'Unknown',
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
      created_by_id: auth.poppo_id || auth.id || 'Unknown',
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

  // Edit Event States
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editParticipants, setEditParticipants] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editErrors, setEditErrors] = useState<string[]>([]);
  const [editParticipantSearch, setEditParticipantSearch] = useState('');
  const [editParticipantRoleFilter, setEditParticipantRoleFilter] = useState('All Roles');
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Load all users metadata for participant search in edit mode
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersList = await FirebaseService.getAllRoleMetadata();
        setAllUsers(usersList || []);
      } catch (err) {
        console.error("Failed to load users for editing:", err);
      }
    };
    if (auth) {
      loadUsers();
    }
  }, [auth]);

  useEffect(() => {
    setIsEditing(false);
    setEditErrors([]);
  }, [selectedEventId]);

  // Attendance Logging States
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceModalEvent, setAttendanceModalEvent] = useState<CalendarEvent | null>(null);
  const [attSearch, setAttSearch] = useState('');
  const [attRoleFilter, setAttRoleFilter] = useState('All Roles');
  const [attAttendees, setAttAttendees] = useState<any[]>([]);
  const [attFeedback, setAttFeedback] = useState('');
  const [isAttProcessing, setIsAttProcessing] = useState(false);
  const [attErrors, setAttErrors] = useState<string[]>([]);
  const [attSuccessMsg, setAttSuccessMsg] = useState('');

  // Load attendance records from Firestore on mount
  useEffect(() => {
    const loadAttendance = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'attendance'));
        const list = snapshot.docs.map(d => d.data());
        setAttendanceRecords(list);
      } catch (err) {
        console.error("Failed to load attendance logs in CalendarTab:", err);
      }
    };
    loadAttendance();
  }, []);

  const userRole = String(auth?.role || '').toLowerCase();
  const isAdminOrDirector = ['admin', 'head admin', 'head_admin', 'director'].includes(userRole);

  const attFilteredUsers = useMemo(() => {
    return allUsers
      .filter(u => {
        const uRole = String(u.role || '').toLowerCase();
        if (uRole === 'director') return false;

        if (attRoleFilter !== 'All Roles') {
          if (attRoleFilter === 'hosts' && uRole !== 'host' && uRole !== 'talent') return false;
          if (attRoleFilter === 'managers' && uRole !== 'manager') return false;
          if (attRoleFilter === 'agents' && uRole !== 'agent') return false;
          if (attRoleFilter === 'admins' && uRole !== 'admin' && uRole !== 'head admin') return false;
        }

        const searchStr = attSearch.toLowerCase().trim();
        if (searchStr) {
          const nickname = String(u.nickname || u.name || '').toLowerCase();
          const poppoId = String(u.poppo_id || u.poppoId || u.id || '').toLowerCase();
          return nickname.includes(searchStr) || poppoId.includes(searchStr);
        }

        return true;
      })
      .sort((a, b) => {
        const aRole = String(a.role || '').toLowerCase();
        const bRole = String(b.role || '').toLowerCase();
        const aIsHost = aRole === 'host' || aRole === 'talent';
        const bIsHost = bRole === 'host' || bRole === 'talent';
        const aHasPhoto = !!a.photoUrl;
        const bHasPhoto = !!b.photoUrl;

        const aFirst = aIsHost && aHasPhoto;
        const bFirst = bIsHost && bHasPhoto;

        if (aFirst && !bFirst) return -1;
        if (!aFirst && bFirst) return 1;

        const aName = String(a.nickname || a.name || '').toLowerCase();
        const bName = String(b.nickname || b.name || '').toLowerCase();
        return aName.localeCompare(bName);
      });
  }, [allUsers, attSearch, attRoleFilter]);

  const handleAddAttAttendee = (user: any) => {
    const pId = String(user.poppo_id || user.poppoId || user.id);
    if (attAttendees.some(a => String(a.poppo_id || a.id) === pId)) return;
    setAttAttendees([...attAttendees, user]);
  };

  const handleRemoveAttAttendee = (userId: string) => {
    setAttAttendees(attAttendees.filter(a => String(a.poppo_id || a.id) !== String(userId)));
  };

  const handleAttendanceClick = (event: CalendarEvent) => {
    setAttendanceModalEvent(event);
    setAttErrors([]);
    setAttSuccessMsg('');
    setAttSearch('');
    setAttRoleFilter('All Roles');

    // Pre-populate if attendance log already exists
    const existing = attendanceRecords.find(r => r.eventId === event.event_id);
    if (existing) {
      setAttFeedback(existing.eventFeedback || '');
      const resolved = (existing.attendees || []).map((att: any) => ({
        id: att.poppoId,
        poppo_id: att.poppoId,
        nickname: att.nickname,
        role: att.role
      }));
      setAttAttendees(resolved);
    } else {
      setAttFeedback('');
      setAttAttendees([]);
    }
    
    setAttendanceModalOpen(true);
  };

  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttErrors([]);
    setAttSuccessMsg('');

    if (!attendanceModalEvent) {
      setAttErrors(['No event selected.']);
      return;
    }
    if (attAttendees.length === 0) {
      setAttErrors(['Please add at least one attendee.']);
      return;
    }

    setIsAttProcessing(true);

    try {
      const eventId = attendanceModalEvent.event_id;
      const eventTitle = attendanceModalEvent.title || 'Unknown Event';
      const eventDate = attendanceModalEvent.date || '';
      const timeslot = attendanceModalEvent.time || '';

      const existing = attendanceRecords.find(r => r.eventId === eventId);
      const attendanceId = existing?.attendanceId || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));

      const attendanceData = {
        attendanceId,
        eventId,
        eventTitle,
        eventDate,
        timeslot,
        attendees: attAttendees.map(a => ({
          poppoId: String(a.poppo_id || a.id).trim(),
          nickname: a.nickname || a.name,
          role: a.role
        })),
        attendeeIds: attAttendees.map(a => String(a.poppo_id || a.id).trim()),
        eventFeedback: attFeedback.trim(),
        reporterId: auth.poppo_id || auth.id || 'SystemAdmin',
        reporterName: auth.nickname || auth.name || 'Admin',
        reporterRole: auth.role || 'Admin',
        submittedAt: Timestamp.now(),
        timestamp: new Date().toISOString()
      };

      await setDoc(doc(db, 'attendance', attendanceId), attendanceData);

      await FirebaseService.logSystemActivity(
        `Logged attendance for Event: "${eventTitle}" on ${eventDate} at ${timeslot} - Attendees: ${attAttendees.map(a => `${a.nickname || a.name} (#${a.poppo_id || a.id})`).join(', ')}`,
        'Info'
      );
      Storage.addLog('Attendance', `Logged attendance for event: ${eventTitle}`, auth.nickname || auth.name);

      // Update local state attendanceRecords
      const updatedRecords = attendanceRecords.filter(r => r.attendanceId !== attendanceId);
      updatedRecords.push(attendanceData);
      setAttendanceRecords(updatedRecords);

      setAttSuccessMsg(`Successfully logged attendance for event "${eventTitle}"!`);
      setTimeout(() => {
        setAttendanceModalOpen(false);
      }, 1500);
    } catch (err: any) {
      console.error('[CalendarTab] Attendance Submit Error:', err);
      setAttErrors([err.message || 'Failed to log attendance to database']);
    } finally {
      setIsAttProcessing(false);
    }
  };

  // Helper to parse event time for time-check comparison
  const getEventTimeParsed = (dateStr: string, timeStr: string, getStart: boolean): Date => {
    let hour = getStart ? 0 : 23;
    let minute = getStart ? 0 : 59;
    let ampm = getStart ? 'AM' : 'PM';

    try {
      const parts = timeStr.split('-');
      let timePart = '';
      if (getStart) {
        timePart = parts[0].trim();
      } else {
        timePart = parts.length > 1 ? parts[1].trim() : parts[0].trim();
      }
      timePart = timePart.replace(/\([^)]*\)/g, '').trim();

      const ampmMatch = timePart.match(/(AM|PM)/i);
      if (ampmMatch) {
        ampm = ampmMatch[0].toUpperCase();
      }
      const cleanTime = timePart.replace(/(AM|PM)/i, '').trim();
      const [hStr, mStr] = cleanTime.split(':');
      
      let parsedHour = parseInt(hStr, 10);
      let parsedMinute = mStr ? parseInt(mStr, 10) : 0;

      if (!isNaN(parsedHour)) {
        if (ampm === 'PM' && parsedHour < 12) parsedHour += 12;
        if (ampm === 'AM' && parsedHour === 12) parsedHour = 0;
        hour = parsedHour;
      }
      if (!isNaN(parsedMinute)) {
        minute = parsedMinute;
      }
    } catch (err) {
      console.error("Error parsing event time:", err);
    }

    const pad = (num: number) => String(num).padStart(2, '0');
    const isoString = `${dateStr}T${pad(hour)}:${pad(minute)}:00+08:00`;
    return new Date(isoString);
  };

  const formatTimeRangeToLocal = (dateStr: string, timeStr: string) => {
    const startParsed = getEventTimeParsed(dateStr, timeStr, true);
    const endParsed = getEventTimeParsed(dateStr, timeStr, false);
    
    const formatOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    const localStart = startParsed.toLocaleTimeString([], formatOpts);

    // Get strictly local date strings
    const localYear = startParsed.getFullYear();
    const localMonth = String(startParsed.getMonth() + 1).padStart(2, '0');
    const localDay = String(startParsed.getDate()).padStart(2, '0');
    const localDateStr = `${localYear}-${localMonth}-${localDay}`;
    
    let dateLabel = '';
    if (localDateStr !== dateStr) {
      const formattedLocalDate = startParsed.toLocaleDateString([], { month: 'short', day: 'numeric' });
      dateLabel = ` [${formattedLocalDate}]`;
    }

    if (!timeStr.includes('-')) {
        return `${localStart}${dateLabel} (Local Time)`;
    }

    const localEnd = endParsed.toLocaleTimeString([], formatOpts);
    return `${localStart} - ${localEnd}${dateLabel} (Local Time)`;
  };

  const canModifyEvent = !isReadOnly && selectedEvent && (
    ['director', 'head admin', 'head_admin'].includes(String(auth?.role || '').toLowerCase()) ||
    String(auth?.poppo_id || auth?.id || '') === String(selectedEvent.created_by_id)
  );

  const editFilteredUsers = useMemo(() => {
    return allUsers
      .filter(u => {
        const userRole = String(u.role || '').toLowerCase();
        if (userRole === 'director') return false;

        if (editParticipantRoleFilter !== 'All Roles') {
          if (editParticipantRoleFilter === 'hosts' && userRole !== 'host' && userRole !== 'talent') return false;
          if (editParticipantRoleFilter === 'managers' && userRole !== 'manager') return false;
          if (editParticipantRoleFilter === 'agents' && userRole !== 'agent') return false;
          if (editParticipantRoleFilter === 'admins' && userRole !== 'admin' && userRole !== 'head admin') return false;
        }

        const searchStr = editParticipantSearch.toLowerCase().trim();
        if (searchStr) {
          const nickname = String(u.nickname || u.name || '').toLowerCase();
          const poppoId = String(u.poppo_id || u.poppoId || u.id || '').toLowerCase();
          return nickname.includes(searchStr) || poppoId.includes(searchStr);
        }

        return true;
      })
      .sort((a, b) => {
        const aRole = String(a.role || '').toLowerCase();
        const bRole = String(b.role || '').toLowerCase();
        const aIsHost = aRole === 'host' || aRole === 'talent';
        const bIsHost = bRole === 'host' || bRole === 'talent';
        const aHasPhoto = !!a.photoUrl;
        const bHasPhoto = !!b.photoUrl;

        const aFirst = aIsHost && aHasPhoto;
        const bFirst = bIsHost && bHasPhoto;

        if (aFirst && !bFirst) return -1;
        if (!aFirst && bFirst) return 1;

        const aName = String(a.nickname || a.name || '').toLowerCase();
        const bName = String(b.nickname || b.name || '').toLowerCase();
        return aName.localeCompare(bName);
      });
  }, [allUsers, editParticipantSearch, editParticipantRoleFilter]);

  const handleAddEditParticipant = (poppoId: string) => {
    if (editParticipants.includes(poppoId)) return;
    setEditParticipants([...editParticipants, poppoId]);
  };

  const handleRemoveEditParticipant = (poppoId: string) => {
    setEditParticipants(editParticipants.filter(id => id !== poppoId));
  };

  const handleEditClick = () => {
    if (!selectedEvent) return;
    setEditTitle(selectedEvent.title || '');
    setEditType(selectedEvent.type || selectedEvent.type_of_event || 'STANDARD EVENT');
    setEditDate(selectedEvent.date || selectedEvent.event_date || '');
    setEditTime(selectedEvent.time || '');
    setEditLocation(selectedEvent.location || '');
    setEditDescription(selectedEvent.description || '');
    setEditParticipants(selectedEvent.participants || selectedEvent.participants_id || []);
    setIsEditing(true);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    const confirmDelete = window.confirm(`Are you sure you want to delete the event "${selectedEvent.title}"?`);
    if (!confirmDelete) return;

    try {
      const token = auth?.token || Storage.getAuthState()?.token;
      const response = await fetch("/api/admin/delete-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ eventId: selectedEvent.event_id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete the event.");
      }

      // Sync local state
      const updatedEvents = events.filter(e => e.event_id !== selectedEvent.event_id);
      setEvents(updatedEvents);
      Storage.setEvents(updatedEvents);
      
      // Log local activity
      Storage.addLog('Calendar', `Deleted event: ${selectedEvent.title}`, auth?.nickname || auth?.name || 'Admin');
      await FirebaseService.logSystemActivity(
        `Calendar event deleted: "${selectedEvent.title}" (ID: ${selectedEvent.event_id})`,
        'Info'
      );

      // Close modal
      setSelectedEventId(null);
      alert("Event successfully deleted!");
    } catch (err: any) {
      console.error("Failed to delete event:", err);
      alert(err.message || "Failed to delete event.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditErrors([]);
    setIsSavingEdit(true);

    if (!editTitle.trim()) {
      setEditErrors(['Event title is required.']);
      setIsSavingEdit(false);
      return;
    }
    if (!editDate) {
      setEditErrors(['Event date is required.']);
      setIsSavingEdit(false);
      return;
    }
    if (editParticipants.length === 0) {
      setEditErrors(['At least one participant is required.']);
      setIsSavingEdit(false);
      return;
    }

    try {
      const token = auth?.token || Storage.getAuthState()?.token;
      const response = await fetch("/api/admin/update-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          eventId: selectedEvent.event_id,
          updatedFields: {
            title: editTitle,
            type: editType,
            date: editDate,
            time: editTime,
            location: editLocation,
            description: editDescription,
            participants: editParticipants,
            participantIds: editParticipants
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update event.");
      }

      // Sync local state
      const updatedEvents = events.map(ev => {
        if (ev.event_id === selectedEvent.event_id) {
          return {
            ...ev,
            title: editTitle,
            type: editType,
            type_of_event: editType,
            date: editDate,
            event_date: editDate,
            time: editTime,
            location: editLocation,
            description: editDescription,
            participants: editParticipants,
            participants_id: editParticipants,
            participantIds: editParticipants
          };
        }
        return ev;
      });

      setEvents(updatedEvents);
      Storage.setEvents(updatedEvents);

      Storage.addLog('Calendar', `Updated event: ${editTitle}`, auth?.nickname || auth?.name || 'Admin');
      await FirebaseService.logSystemActivity(
        `Calendar event updated: "${editTitle}" (Date: ${editDate}, Time: ${editTime}, Type: ${editType}, Location: ${editLocation}, Participants: ${editParticipants.join(', ')})`,
        'Info'
      );

      setIsEditing(false);
      alert("Event updated successfully!");
    } catch (err: any) {
      console.error("Failed to update event:", err);
      setEditErrors([err.message || "Failed to update event."]);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6 calendar-container">
      <style>{`
        /* Force 60% black background for the entire calendar page elements to let global gradients show */
        body,
        .app-bg,
        main {
          background-color: rgba(0, 0, 0, 0.6) !important;
        }
        /* Scoped style overrides for Calendar and its subcomponents (like AddEventForm) to match the global gold & charcoal brand theme */
        .calendar-container select,
        .calendar-container input,
        .calendar-container textarea {
          background-color: rgba(0, 0, 0, 0.6) !important;
          border-color: rgba(212, 175, 55, 0.25) !important;
          color: #f0efe8 !important;
        }
        .calendar-container select:focus,
        .calendar-container input:focus,
        .calendar-container textarea:focus {
          border-color: rgba(212, 175, 55, 0.6) !important;
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.08) !important;
        }
        .calendar-container select option {
          background-color: #000000 !important;
          color: #f0efe8 !important;
        }
        /* Override bg classes to 60% black */
        .calendar-container .bg-black\\/85,
        .calendar-container .bg-\\[\\#0D0D14\\],
        .calendar-container .bg-\\[\\#0A0B0E\\],
        .calendar-container .bg-slate-900,
        .calendar-container .bg-\\[\\#13161F\\] {
          background-color: rgba(0, 0, 0, 0.6) !important;
        }
        .calendar-container .bg-\\[\\#0A0B0E\\]\\/60 {
          background-color: rgba(0, 0, 0, 0.6) !important;
        }
        .calendar-container .bg-\\[\\#181B24\\] {
          background-color: #1a120e !important;
        }
        .calendar-container .bg-\\[\\#12151D\\]:hover {
          background-color: #090605 !important;
        }
        /* Override border colors */
        .calendar-container .border-purple-500\\/10,
        .calendar-container .border-purple-500\\/20,
        .calendar-container .border-purple-500\\/30,
        .calendar-container .border-purple-500\\/50 {
          border-color: rgba(212, 175, 55, 0.15) !important;
        }
        /* Override purple/indigo text & backgrounds to brand gold */
        .calendar-container .text-purple-400,
        .calendar-container .text-purple-300 {
          color: #D4AF37 !important;
        }
        .calendar-container .bg-purple-500\\/20 {
          background-color: rgba(212, 175, 55, 0.1) !important;
          border-color: rgba(212, 175, 55, 0.2) !important;
        }
        .calendar-container .bg-gradient-to-r.from-purple-600.to-indigo-600 {
          background: linear-gradient(135deg, #d4af37, #b8960c) !important;
          color: #0c0806 !important;
        }
        .calendar-container .border-purple-500\\/50 {
          border-color: rgba(212, 175, 55, 0.3) !important;
        }
      `}</style>


      <div className="space-y-6">
        {/* Main Calendar Section */}
        <div className="space-y-6">
          {/* Monthly Grid View */}
          <div className="bg-black/20 backdrop-blur-xl p-5 rounded-3xl border border-[#D4AF37]/20 shadow-[0_0_30px_rgba(212,175,55,0.05)] animate-fade-in space-y-4">
            {/* Header with Navigation & Month/Year */}
            <div className="flex items-center justify-between border-b border-[#D4AF37]/10 pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon className="text-[#D4AF37] w-4.5 h-4.5" />
                <h2 className="text-sm font-black text-[#F0EFE8] tracking-widest uppercase">
                  {format(currentDate, 'MMMM yyyy')}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  title="Previous Month"
                  onClick={goToPreviousMonth} 
                  className="p-2 bg-[#0e0a08]/90 border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 rounded-xl transition-all cursor-pointer"
                >
                  <ChevronLeft size={14} className="text-[#D4AF37]" />
                </button>
                <button 
                  title="Next Month"
                  onClick={goToNextMonth} 
                  className="p-2 bg-[#0e0a08]/90 border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 rounded-xl transition-all cursor-pointer"
                >
                  <ChevronRight size={14} className="text-[#D4AF37]" />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                <div key={day} className="text-center text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/60 py-2">
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
                        !isCurrentMonth ? "border-white/5 hover:border-[#D4AF37]/20" : "border-[#D4AF37]/10 hover:border-[#D4AF37]/50",
                        isSelected ? "from-[#2d1c0c] to-[#1a120e] ring-1 ring-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.3)] border-transparent" : "from-black/60 to-black/30 hover:from-[#2d1c0c]/80 hover:to-[#1a120e]/80 text-[#F0EFE8]",
                        isToday && !isSelected && "ring-1 ring-[#FF6B00] border-transparent"
                      )}
                    >
                      <span className={cn(
                        "text-xs sm:text-sm font-black tracking-tight mt-1",
                        isSelected ? "text-white" : isToday ? "text-[#FF6B00]" : !isCurrentMonth ? "text-white/40" : "text-white"
                      )}>
                        {format(day, 'd')}
                      </span>
                      {dayEvents.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-0.5 sm:gap-1 mt-auto w-full px-1">
                          {dayEvents.slice(0, 3).map((e, i) => {
                            const config = EVENT_COLORS[e.type || ''] || { gradient: 'from-[#D4AF37] to-[#b8960c]' };
                            return <div key={i} className={cn("w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gradient-to-br shadow-sm", config.gradient)} />;
                          })}
                          {dayEvents.length > 3 && <span className="text-[8px] text-[#A09E9A] font-bold leading-none pl-0.5">+{dayEvents.length - 3}</span>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

          {/* Scheduled Events Panel */}
          <div className="bg-black/20 backdrop-blur-xl rounded-3xl border border-[#D4AF37]/25 p-5 space-y-4 shadow-[0_0_30px_rgba(212,175,55,0.05)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#D4AF37]/5 via-transparent to-orange-500/5 pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#D4AF37]/15 pb-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8]">
                  Scheduled Events
                </h3>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTimeDisplayMode('Manila')}
                  className={cn("btn-capsule-gold", timeDisplayMode === 'Manila' && "active")}
                >
                  Manila Time
                </button>
                <button
                  onClick={() => setTimeDisplayMode('Local')}
                  className={cn("btn-capsule-gold", timeDisplayMode === 'Local' && "active")}
                >
                  Local Time
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {selectedDayEvents.length > 0 ? (
                selectedDayEvents
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map(e => {
                  const colorConfig = EVENT_COLORS[e.type || ''] || { text: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/10', gradient: 'from-[#D4AF37] to-[#b8960c]' };
                  
                  // For the timezone display mock
                  const displayTime = timeDisplayMode === 'Manila' 
                    ? e.time 
                    : formatTimeRangeToLocal(e.date || e.event_date || '', e.time || '');

                  const startTimeParsed = getEventTimeParsed(e.date || e.event_date || '', e.time || '', true);
                  const isOngoingOrPast = new Date() >= startTimeParsed;

                  return (
                    <div
                      key={e.event_id}
                      onClick={() => setSelectedEventId(e.event_id)}
                      className="w-full text-left p-4 rounded-xl bg-gradient-to-r from-black/90 to-black/80 border border-[#D4AF37]/15 hover:border-[#D4AF37]/50 transition-all flex gap-4 group items-center cursor-pointer shadow-lg hover:shadow-[#D4AF37]/5"
                    >
                      <div className={cn("w-1 h-10 rounded-full shrink-0 bg-gradient-to-b", colorConfig.gradient)} />
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-black text-white truncate group-hover:text-[#D4AF37] transition-colors">{e.title}</h4>
                          <p className="text-[10px] text-slate-300 mt-0.5 line-clamp-1">{e.description || 'No description provided.'}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-black text-[#D4AF37] tracking-wider bg-[#0e0a08]/90 border border-[#D4AF37]/20 px-2 py-1 rounded-md">{displayTime}</span>
                          {isOngoingOrPast && (
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                handleAttendanceClick(e);
                              }}
                              className="btn-capsule-gold z-10 shrink-0"
                            >
                              Attendance
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#0e0a08]/90 border border-white/5 flex items-center justify-center">
                    <CalendarIcon size={20} className="text-white/20" />
                  </div>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-black">No events scheduled</p>
                </div>
              )}
            </div>
            
            {/* Action Buttons for interactive page only */}
            {!isReadOnly && (
              <div className="pt-4 border-t border-[#D4AF37]/15 flex items-center justify-end gap-3 flex-wrap">
                {auth.level > 0 && (
                  <button 
                    onClick={() => setIsAdding(true)} 
                    className="px-4 py-2 border border-[#D4AF37]/30 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] font-black text-[10px] uppercase tracking-widest hover:border-[#D4AF37]/50 rounded-xl transition-all active:scale-[0.99] cursor-pointer flex items-center gap-2 shadow-md shadow-[#D4AF37]/5"
                  >
                    <Plus size={14} />
                    Add Event
                  </button>
                )}

                {['talent', 'host'].includes(auth.role?.toLowerCase() || '') && (
                  <button 
                    onClick={() => setIsReservingLivehouse(true)} 
                    className="px-4 py-2 bg-black/20 border border-white/10 hover:bg-[#1a120e] hover:border-white/20 text-[#A09E9A] hover:text-[#F0EFE8] font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-[0.99] cursor-pointer flex items-center gap-2 shadow-md"
                  >
                    <Clock size={14} />
                    Schedule Livehouse
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdding(false)} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card w-full max-w-lg rounded-3xl overflow-hidden z-10 max-h-[90vh] overflow-y-auto custom-scrollbar p-0">
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReservingLivehouse(false)} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card w-full max-w-lg rounded-3xl overflow-hidden z-10 max-h-[90vh] overflow-y-auto custom-scrollbar p-0">
              <div className="p-6 border-b border-[#D4AF37]/20 font-black text-white uppercase tracking-widest text-[10px]">SCHEDULE LIVEHOUSE</div>
              <form onSubmit={handleReserveLivehouse} className="p-6 space-y-5">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="res-poppo-id" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Poppo ID</label>
                    <input 
                      id="res-poppo-id"
                      disabled 
                      value={auth.poppo_id} 
                      className="w-full glass-input text-xs cursor-not-allowed opacity-50" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="res-host-name" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Host Name</label>
                    <input 
                      id="res-host-name"
                      disabled 
                      value={auth.nickname || auth.name} 
                      className="w-full glass-input text-xs cursor-not-allowed opacity-50" 
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
                      className="w-full glass-input text-xs font-bold cursor-pointer appearance-none"
                    >
                      <option value="SOLO LIVEHOUSE" className="bg-[#0e0a08] text-[#F0EFE8]">SOLO LIVEHOUSE</option>
                      <option value="PARTY LIVEHOUSE" className="bg-[#0e0a08] text-[#F0EFE8]">PARTY LIVEHOUSE</option>
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
                  
                  {/* Timezone Notice */}
                  <div className="text-[11px] font-bold text-[#D4AF37]/90 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl px-4 py-2.5 flex items-center gap-2 mb-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
                    All times are in Manila Time (PHT)
                  </div>

                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {TIMESLOT_BLOCKS.map(block => {
                      const blockSlots = getTimeslotAvailability(reserveDate).filter(t => block.slots.includes(t.slot));
                      
                      return (
                        <div key={block.name} className="space-y-2">
                          <h4 className="text-[9px] font-black text-[#D4AF37]/75 uppercase tracking-widest border-b border-[#D4AF37]/10 pb-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]/40" />
                            {block.name}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {blockSlots.map(t => {
                              const displaySlot = t.slot.replace(' (Manila Time)', '');
                              const isSelected = reserveTimeslot === t.slot;
                              
                              let statusText = '2 Available';
                              let statusClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                              if (t.count >= 2) {
                                statusText = 'Full';
                                statusClass = 'text-red-400 bg-red-500/10 border-red-500/20';
                              } else if (t.count === 1) {
                                statusText = '1 slot left';
                                statusClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                              }

                              return (
                                <button
                                  key={t.slot}
                                  type="button"
                                  disabled={t.count >= 2}
                                  onClick={() => setReserveTimeslot(t.slot)}
                                  className={cn(
                                    "p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2.5 relative overflow-hidden",
                                    t.count >= 2
                                      ? "bg-[#0A0B0E]/40 border-red-500/10 cursor-not-allowed opacity-50"
                                      : isSelected
                                        ? "bg-[#181B24] border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.15)] text-white"
                                        : "bg-[#0A0B0E] border-[#D4AF37]/10 hover:border-[#D4AF37]/20 hover:bg-[#12151D] text-white/70"
                                  )}
                                >
                                  <div className="flex justify-between items-start gap-2.5 w-full">
                                    <span className="font-mono text-xs font-black tracking-tight">{displaySlot}</span>
                                    <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shrink-0", statusClass)}>
                                      {statusText}
                                    </span>
                                  </div>

                                  {t.pendingCount > 0 && (
                                    <div className="text-[9px] font-bold text-amber-500 bg-amber-500/5 px-2 py-1 rounded border border-amber-500/10 w-fit">
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
                    placeholder="e.g. Any specific requests for the livehouse?" 
                    className="w-full glass-input text-xs min-h-[100px] resize-none"
                  />
                </div>

                <div className="pt-2 flex gap-4">
                  <button type="button" onClick={() => setIsReservingLivehouse(false)} className="flex-1 px-6 py-4 rounded-xl bg-[#0e0a08]/90 border border-white/10 text-[#A09E9A] font-black uppercase text-[10px] tracking-widest hover:bg-[#1a120e] hover:border-white/20 hover:text-[#F0EFE8] transition-colors cursor-pointer">Cancel</button>
                  <button type="submit" className="flex-[2] bg-[#D4AF37] hover:bg-[#FFEA00] text-black font-black uppercase text-[10px] tracking-[0.2em] py-4 rounded-xl shadow-xl transition-all cursor-pointer">Submit Schedule Request</button>
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
              className="absolute inset-0 bg-black/20 backdrop-blur-md cursor-pointer" 
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative w-full max-w-2xl glass-card z-10 max-h-[90vh] overflow-hidden flex flex-col p-0"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[#D4AF37]/5 via-transparent to-orange-500/5 pointer-events-none" />
              
              <div className="p-5 sm:p-6 border-b border-[#D4AF37]/10 flex items-center justify-between bg-black/20 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]", EVENT_COLORS[selectedEvent.type || '']?.text || "text-[#D4AF37] bg-[#D4AF37]")} />
                  <span className="font-black text-[#F0EFE8] uppercase tracking-widest text-xs sm:text-sm">Event Spotlight</span>
                </div>
                <button 
                  title="Close"
                  onClick={() => setSelectedEventId(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-[#A09E9A] hover:text-[#F0EFE8] cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar flex-1 relative z-10 space-y-8">
                {isEditing ? (
                  <form onSubmit={handleEditSubmit} className="space-y-4 text-left">
                    {editErrors.length > 0 && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                        {editErrors.join(', ')}
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-2">Event Title</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        required
                        disabled
                        className="w-full glass-input text-xs cursor-not-allowed opacity-50"
                        placeholder="e.g. Host PK Battle"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-2">Event Type</label>
                        <select
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                          disabled
                          className="w-full glass-input text-xs cursor-not-allowed opacity-50 appearance-none"
                        >
                          <option value="SOLO LIVEHOUSE">SOLO LIVEHOUSE</option>
                          <option value="PARTY LIVEHOUSE">PARTY LIVEHOUSE</option>
                          <option value="AGENCY EVENT">AGENCY EVENT</option>
                          <option value="STANDARD EVENT">STANDARD EVENT</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-2">Date</label>
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          required
                          disabled
                          className="w-full glass-input text-xs cursor-not-allowed opacity-50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-2">Time</label>
                        <input
                          type="text"
                          value={editTime}
                          onChange={(e) => setEditTime(e.target.value)}
                          required
                          disabled
                          className="w-full glass-input text-xs cursor-not-allowed opacity-50"
                          placeholder="e.g. 09:00 AM - 10:00 AM (Manila Time)"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-2">Location</label>
                        <input
                          type="text"
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          required
                          disabled
                          className="w-full glass-input text-xs cursor-not-allowed opacity-50"
                          placeholder="e.g. Virtual Room"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-2">Description</label>
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full glass-input text-xs min-h-[100px] resize-none"
                        placeholder="Add details about this event..."
                      />
                    </div>

                    {/* Participants Selection inside Edit Mode */}
                    <div className="pt-4 border-t border-[#D4AF37]/10">
                      <span className="block text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-3">
                        Edit Participants
                      </span>
                      
                      {/* Search & Filter Row */}
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={editParticipantSearch}
                          onChange={(e) => setEditParticipantSearch(e.target.value)}
                          placeholder="Search nickname or poppoId..."
                          className="flex-1 glass-input text-xs px-3 py-2"
                        />
                        <select
                          value={editParticipantRoleFilter}
                          onChange={(e) => setEditParticipantRoleFilter(e.target.value)}
                          className="glass-input text-xs px-3 py-2 appearance-none cursor-pointer"
                        >
                          <option value="All Roles">All Roles</option>
                          <option value="hosts">Hosts</option>
                          <option value="managers">Managers</option>
                          <option value="agents">Agents</option>
                          <option value="admins">Admins</option>
                        </select>
                      </div>

                      {/* Member List Grid (scrollable) */}
                      <div className="bg-[#0A0B0E]/60 border border-white/5 rounded-xl max-h-[150px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {editFilteredUsers.slice(0, 10).map((u: any) => {
                          const poppoId = String(u.poppo_id || u.poppoId || u.id);
                          const isSelected = editParticipants.includes(poppoId);
                          return (
                            <div key={u.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                {u.photoUrl ? (
                                  <img src={u.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-white/10" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                                    <span className="text-[10px] font-bold text-purple-300">{(u.nickname || u.name || '?')[0].toUpperCase()}</span>
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-white truncate">{u.nickname || u.name}</p>
                                  <p className="text-[9px] text-white/40 font-mono">ID: {poppoId} | <span className="uppercase">{u.role}</span></p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => isSelected ? handleRemoveEditParticipant(poppoId) : handleAddEditParticipant(poppoId)}
                                className={cn(
                                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                                  isSelected 
                                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" 
                                    : "bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/30"
                                )}
                              >
                                {isSelected ? '-' : '+'}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Selected Participants Block */}
                      <div className="mt-3 bg-[#0A0B0E] border border-white/10 rounded-xl p-3">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-white/40 mb-2">
                          Selected Participants ({editParticipants.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {editParticipants.map(poppoId => {
                            const pHost = (hosts || []).find(h => String(h.id) === String(poppoId) || String(h.poppo_id) === String(poppoId));
                            const dispName = pHost ? `${pHost.nickname || pHost.name}` : `User #${poppoId}`;
                            return (
                              <div key={poppoId} className="flex items-center gap-1.5 bg-[#0c0806] border border-[#D4AF37]/20 rounded-lg px-2 py-1">
                                <span className="text-[10px] font-bold text-white truncate max-w-[120px]">{dispName}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEditParticipant(poppoId)}
                                  className="text-white/40 hover:text-red-400 font-bold text-xs shrink-0 cursor-pointer"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingEdit}
                        className="px-4 py-2 btn-gold disabled:opacity-50 text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2"
                      >
                        {isSavingEdit ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider",
                          EVENT_COLORS[selectedEvent.type || '']?.bg || "bg-purple-500/10",
                          EVENT_COLORS[selectedEvent.type || '']?.text || "text-purple-400"
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

                    {canModifyEvent && (
                      <div className="flex gap-3 justify-end pt-4 border-t border-[#D4AF37]/10">
                        <button
                          type="button"
                          onClick={handleEditClick}
                          className="px-4 py-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 text-[#D4AF37] font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Edit2 size={14} />
                          Edit Event
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteEvent}
                          className="px-4 py-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Trash2 size={14} />
                          Delete Event
                        </button>
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
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Attendance Modal */}
      <AnimatePresence>
        {attendanceModalOpen && attendanceModalEvent && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAttendanceModalOpen(false)}
              className="absolute inset-0 bg-[#0A0B0E]/90 backdrop-blur-md cursor-pointer"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl glass-card z-10 max-h-[90vh] overflow-hidden flex flex-col p-0"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-[#D4AF37]/5 via-transparent to-orange-500/5 pointer-events-none" />
              
              <div className="p-5 sm:p-6 border-b border-[#D4AF37]/10 flex items-center justify-between bg-black/20 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={20} className="text-[#D4AF37]" />
                  <span className="font-black text-white uppercase tracking-widest text-xs sm:text-sm">
                    {isAdminOrDirector ? 'Record Event Attendance' : 'Attendance Logs'}
                  </span>
                </div>
                <button
                  title="Close"
                  onClick={() => setAttendanceModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar flex-1 relative z-10 space-y-6">
                <div className="p-4 bg-[#0A0B0E]/60 border border-[#D4AF37]/10 rounded-2xl">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-[#D4AF37] mb-1">Event Details</span>
                  <h3 className="text-base font-black text-white uppercase">{attendanceModalEvent.title}</h3>
                  <p className="text-xs text-white/60 font-mono mt-1">
                    {attendanceModalEvent.date} | {attendanceModalEvent.time}
                  </p>
                </div>

                {isAdminOrDirector ? (
                  /* Admin/Director logging form */
                  <form onSubmit={handleAttendanceSubmit} className="space-y-4 text-left">
                    {attErrors.length > 0 && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                        {attErrors.join(', ')}
                      </div>
                    )}
                    {attSuccessMsg && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">
                        {attSuccessMsg}
                      </div>
                    )}

                    {/* Member search and filter grid (replicated from Admin Hub) */}
                    <div>
                      <span className="block text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-3">
                        ADD PARTICIPANTS
                      </span>
                      
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={attSearch}
                          onChange={(e) => setAttSearch(e.target.value)}
                          placeholder="Search nickname or poppoId..."
                          className="flex-1 glass-input text-xs px-3 py-2"
                        />
                        <select
                          value={attRoleFilter}
                          onChange={(e) => setAttRoleFilter(e.target.value)}
                          className="glass-input text-xs px-3 py-2 appearance-none cursor-pointer"
                        >
                          <option value="All Roles">All Roles</option>
                          <option value="hosts">Hosts</option>
                          <option value="managers">Managers</option>
                          <option value="agents">Agents</option>
                          <option value="admins">Admins</option>
                        </select>
                      </div>

                      {/* Member list grid scrollable */}
                      <div className="bg-[#0A0B0E]/60 border border-white/5 rounded-xl max-h-[150px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {attFilteredUsers.slice(0, 10).map((u: any) => {
                          const poppoId = String(u.poppo_id || u.poppoId || u.id);
                          const isSelected = attAttendees.some(a => String(a.poppo_id || a.id) === poppoId);
                          return (
                            <div key={u.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                {u.photoUrl ? (
                                  <img src={u.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-white/10" />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                                    <span className="text-[10px] font-bold text-purple-300">{(u.nickname || u.name || '?')[0].toUpperCase()}</span>
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-white truncate">{u.nickname || u.name}</p>
                                  <p className="text-[9px] text-white/40 font-mono">ID: {poppoId} | <span className="uppercase">{u.role}</span></p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => isSelected ? handleRemoveAttAttendee(poppoId) : handleAddAttAttendee(u)}
                                className={cn(
                                  "p-1.5 rounded-lg transition-colors cursor-pointer",
                                  isSelected 
                                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" 
                                    : "bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/30"
                                )}
                              >
                                {isSelected ? '-' : '+'}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Selected Participants Block */}
                      <div className="mt-3 bg-[#0A0B0E] border border-white/10 rounded-xl p-3">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-white/40 mb-2">
                          SELECTED PARTICIPANTS ({attAttendees.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {attAttendees.map(a => {
                            const pId = a.poppo_id || a.id;
                            const dispName = a.nickname || a.name || `User #${pId}`;
                            return (
                              <div key={pId} className="flex items-center gap-1.5 bg-[#0c0806] border border-[#D4AF37]/20 rounded-lg px-2 py-1">
                                <span className="text-[10px] font-bold text-white truncate max-w-[120px]">{dispName}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAttAttendee(pId)}
                                  className="text-white/40 hover:text-red-400 font-bold text-xs shrink-0 cursor-pointer"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-2">Event Feedback / Notes</label>
                      <textarea
                        value={attFeedback}
                        onChange={(e) => setAttFeedback(e.target.value)}
                        className="w-full bg-[#0A0B0E] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none min-h-[80px]"
                        placeholder="Add notes about event completion, issues, or details..."
                      />
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => setAttendanceModalOpen(false)}
                        className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isAttProcessing}
                        className="px-4 py-2 btn-gold disabled:opacity-50 text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2"
                      >
                        {isAttProcessing 
                          ? 'Processing...' 
                          : (attendanceModalEvent && attendanceRecords.some(r => r.eventId === attendanceModalEvent.event_id)
                              ? 'Update Attendance' 
                              : 'Submit Attendance')}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Viewer Read-Only Logs */
                  <div className="space-y-4 text-left">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">
                      Attended Members
                    </span>
                    {(() => {
                      const record = attendanceRecords.find(r => r.eventId === attendanceModalEvent.event_id);
                      if (record && record.attendees && record.attendees.length > 0) {
                        return (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {record.attendees.map((att: any) => {
                                const pHost = (hosts || []).find(h => String(h.id) === String(att.poppoId) || String(h.poppo_id) === String(att.poppoId));
                                return (
                                  <div key={att.poppoId} className="flex items-center gap-3 p-3 bg-[#0A0B0E]/60 border border-white/5 rounded-xl">
                                    {pHost?.photoUrl ? (
                                      <img src={pHost.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                                        <span className="text-xs font-bold text-purple-300">{(att.nickname || '?')[0].toUpperCase()}</span>
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-xs font-black text-white truncate">{att.nickname}</p>
                                      <p className="text-[9px] text-white/40 font-mono">ID: {att.poppoId} | <span className="uppercase">{att.role}</span></p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {record.eventFeedback && (
                              <div className="mt-4 p-4 bg-[#0A0B0E]/40 border border-white/5 rounded-2xl">
                                <span className="block text-[9px] font-black uppercase tracking-wider text-white/40 mb-1">Event Notes</span>
                                <p className="text-xs text-white/70 leading-relaxed italic">"{record.eventFeedback}"</p>
                              </div>
                            )}
                          </div>
                        );
                      } else {
                        return (
                          <div className="p-8 bg-[#0A0B0E]/40 border border-white/5 rounded-2xl text-center">
                            <p className="text-xs text-white/30 uppercase tracking-widest font-black">No attendance logs recorded for this event yet.</p>
                          </div>
                        );
                      }
                    })()}
                    
                    <div className="flex justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => setAttendanceModalOpen(false)}
                        className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

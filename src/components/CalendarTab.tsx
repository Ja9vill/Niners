import React, { useState, useMemo, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, MapPin, Info, User, X, Globe, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { CalendarEvent, EventType, Host, LivehouseRequest } from '../types';
import { Storage } from '../lib/storage';
import { FirebaseService, generateSubmissionId } from '../lib/firebaseService';
import { cn } from '../lib/utils';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
<<<<<<< HEAD
import { LivehouseMatrixService, LivehouseMatrixRow } from '../lib/sheetsService';
=======
import { SingleDatePicker } from './InteractiveDatePicker';
import { AddEventForm } from './AddEventForm';
import { EVENT_COLORS, TIMESLOTS } from '../lib/constants';
import { collection, getDocs, getDoc, doc, setDoc, Timestamp, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
<<<<<<< HEAD
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
=======
import { LivehouseCalendar } from './LivehouseCalendar';
import { LivehouseBookingModal } from './LivehouseBookingModal';

>>>>>>> 2b42d3ae84c3e300e1faeb35e7009a759158d1e9


const TIMESLOT_BLOCKS = [
  {
    name: 'Morning',
    slots: [
      '9AM - 10AM',
      '10AM - 11AM',
      '11AM - 12PM'
    ]
  },
  {
    name: 'Afternoon',
    slots: [
      '2PM - 3PM',
      '3PM - 4PM',
      '4PM - 5PM',
      '5PM - 6PM'
    ]
  },
  {
    name: 'Evening',
    slots: [
      '7PM - 8PM',
      '8PM - 9PM',
      '9PM - 10PM',
      '10PM - 11PM'
    ]
  }
];

export const parseTimeStringToHourMin = (timeStr: string) => {
  const match = timeStr.match(/(\d+)(?::(\d+))?\s*(AM|PM)?/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  let m = match[2] ? parseInt(match[2], 10) : 0;
  const isPM = match[3] && match[3].toUpperCase() === 'PM';
  const isAM = match[3] && match[3].toUpperCase() === 'AM';
  if (isPM && h < 12) h += 12;
  if ((isAM || (!isAM && !isPM && h === 12)) && h === 12) h = 0;
  return { h, m };
};

export const getTargetDisplayDate = (event: CalendarEvent, mode: 'Manila' | 'Local'): string => {
  const rawDate = event.date || event.event_date || '';
  if (!rawDate) return '';
  if (mode === 'Manila') return rawDate;
  
  const timeStr = event.time || event.description || '';
  const firstTimePart = timeStr === '00:00' ? '00:00' : timeStr.split('-')[0].trim();
  const parsedTime = parseTimeStringToHourMin(firstTimePart);
  
  if (!parsedTime) return rawDate;
  
  const isoString = `${rawDate}T${parsedTime.h.toString().padStart(2, '0')}:${parsedTime.m.toString().padStart(2, '0')}:00+08:00`;
  const dateObj = new Date(isoString);
  
  if (isNaN(dateObj.getTime())) return rawDate;
  
  return format(dateObj, 'yyyy-MM-dd');
};



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
  
  const localTzAbbr = useMemo(() => {
    try {
      const shortCode = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
        .formatToParts(new Date())
        .find(p => p.type === 'timeZoneName')?.value;
        
      if (shortCode) {
        return shortCode;
      }
      return 'LOCAL';
    } catch {
      return 'LOCAL';
    }
  }, []);
  
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
<<<<<<< HEAD
  const [selectedLivehouseType, setSelectedLivehouseType] = useState<'Solo Livehouse' | 'Party Livehouse'>('Solo Livehouse');

  // Live Livehouse Matrix (fetched from Google Apps Script Web App)
  const [livehouseMatrix, setLivehouseMatrix] = useState<LivehouseMatrixRow[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(false);
=======
  const [selectedLivehouseType, setSelectedLivehouseType] = useState<'SOLO LIVEHOUSE' | 'PARTY LIVEHOUSE'>('SOLO LIVEHOUSE');
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
 
  // Proposal States (Alternative slot proposal by Manager/Admin)
  const [proposingRequestId, setProposingRequestId] = useState<string | null>(null);
  const [proposalDate, setProposalDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [proposalTimeslot, setProposalTimeslot] = useState('');
  const [eventDate, setEventDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  // Dual-Tab State
  const [activeTab, setActiveTab] = useState<'AGENCY' | 'LIVEHOUSE'>('AGENCY');

  // Spotlight State
  const [spotlightEvent, setSpotlightEvent] = useState<CalendarEvent | null>(null);

  // Expandable Modal States
  const [isAttendanceExpanded, setIsAttendanceExpanded] = useState(false);
  const [isEditExpanded, setIsEditExpanded] = useState(false);
  const [editEventDesc, setEditEventDesc] = useState('');
  const [editEventParticipants, setEditEventParticipants] = useState<string[]>([]);

  // Attendance Modal States
  // (Moved further down to group with other attendance states)

  // Attendance Reporting States
  const [attendanceRecord, setAttendanceRecord] = useState<any>(null);

  const handleSpotlightClick = async (event: CalendarEvent) => {
    setSpotlightEvent(event);
    setIsAttendanceExpanded(false);
    setIsEditExpanded(false);
    setAttendanceRecord(null);
    setAttErrors([]);
    setAttSuccessMsg('');
    setAttSearch('');
    setAttRoleFilter('All Roles');

    try {
      let data = null;
      const docRef = doc(db, 'attendance', event.event_id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        data = docSnap.data();
      } else {
        const q = query(collection(db, 'attendance'), where('eventId', '==', event.event_id));
        const qs = await getDocs(q);
        if (!qs.empty) {
          data = qs.docs[0].data();
        }
      }

      if (data) {
        setAttendanceRecord(data);
        
        // Map any available schema to the attAttendees format
        let rawAttendees = data.attendees || [];
        if (rawAttendees.length === 0) {
          const ids = data.attendeeIds || data.actualParticipants || [];
          rawAttendees = ids.map((pid: string) => ({ poppoId: pid }));
        }

        if (rawAttendees.length > 0) {
           const initialParticipants = rawAttendees.map((att: any) => {
             const pid = att.poppoId || att.poppo_id || att.id;
             const u = allUsers.find(user => (user.poppo_id || user.poppoId || user.id) === pid);
             return {
               id: pid,
               poppo_id: pid,
               nickname: u ? (u.nickname || u.name) : (att.nickname || pid),
               role: u ? u.role : (att.role || '')
             };
           });
           setAttAttendees(initialParticipants);
        } else {
           setAttAttendees([]);
        }
        setAttFeedback(data.eventFeedback || data.adminFeedback || '');
      } else {
        // It's a new attendance report. Supporters default to empty.
        setAttAttendees([]);
        setAttFeedback('');
      }
    } catch (e) {
      console.error("Failed to fetch attendance record:", e);
    }
  };
  const handleOpenAttendanceModal = async (e: React.MouseEvent, event: CalendarEvent) => {
    e.stopPropagation();
    setAttendanceModalEvent(event);
    setAttendanceModalOpen(true);
    setAttErrors([]);
    setAttSuccessMsg('');
    setAttSearch('');
    setAttRoleFilter('All Roles');

    try {
      let data = null;
      const docRef = doc(db, 'attendance', event.event_id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        data = docSnap.data();
      } else {
        const q = query(collection(db, 'attendance'), where('eventId', '==', event.event_id));
        const qs = await getDocs(q);
        if (!qs.empty) {
          data = qs.docs[0].data();
        }
      }

      if (data) {
        
        let rawAttendees = data.attendees || [];
        if (rawAttendees.length === 0) {
          const ids = data.attendeeIds || data.actualParticipants || [];
          rawAttendees = ids.map((pid: string) => ({ poppoId: pid }));
        }

        if (rawAttendees.length > 0) {
           const initialParticipants = rawAttendees.map((att: any) => {
             const pid = att.poppoId || att.poppo_id || att.id;
             const u = allUsers.find(user => (user.poppo_id || user.poppoId || user.id) === pid);
             return {
               id: pid,
               poppo_id: pid,
               nickname: u ? (u.nickname || u.name) : (att.nickname || pid),
               role: u ? u.role : (att.role || '')
             };
           });
           setAttAttendees(initialParticipants);
        } else {
           setAttAttendees([]);
        }
        setAttFeedback(data.eventFeedback || data.adminFeedback || '');
      } else {
        setAttAttendees([]);
        setAttFeedback('');
      }
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
    }
  };
  const handleSubmitAttendance = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAttErrors([]);
    setAttSuccessMsg('');

    if (!attendanceModalEvent) return;
    if (attAttendees.length === 0) {
      setAttErrors(['Please add at least one attendee.']);
      return;
    }

    setIsAttProcessing(true);
    try {
      const currentAuth = Storage.getAuthState();
      const existing = attendanceRecords.find(r => r.eventId === attendanceModalEvent.event_id);
      const attendanceId = existing?.attendanceId || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));
      const docId = existing?.attendanceId ? existing.attendanceId : generateSubmissionId(currentAuth?.poppo_id || '', currentAuth?.role || '', currentAuth?.name || currentAuth?.nickname || '');

      const payload = {
        attendanceId: docId,
        eventId: attendanceModalEvent.event_id,
        eventTitle: attendanceModalEvent.title || 'Unknown Event',
        eventDate: attendanceModalEvent.date,
        timeslot: attendanceModalEvent.time,
        eventType: attendanceModalEvent.type || 'Event',
        description: attendanceModalEvent.description || '',
        participantIds: attendanceModalEvent.participants || [],
        participants: attendanceModalEvent.participants || [],
        status: 'Approved',
        attendeeIds: attAttendees.map(p => p.poppoId || p.poppo_id || p.id), // For backward compatibility
        attendees: attAttendees.map(a => ({
          poppoId: a.poppo_id || a.id,
          nickname: a.nickname || a.name || 'Unknown',
          role: a.role || 'Unknown'
        })),
        adminFeedback: attFeedback, // For backward compatibility
        eventFeedback: attFeedback,
        createdBy: spotlightEvent?.createdBy || currentAuth?.name || 'Admin',
        attendanceSubmittedBy: {
          poppoId: currentAuth?.poppo_id || '',
          name: currentAuth?.name || currentAuth?.nickname || '',
          role: currentAuth?.role || ''
        },
        timestamp: new Date().toISOString()
      };

      // If we are updating an existing record, we should write to the exact same doc ID to avoid duplicates.
      // If it's a new record, we use the new standardized docId format.
      // However, previously records were saved with `event_id` as the docId.
      const targetDocId = existing ? (existing.id || existing.eventId || docId) : docId;
      await setDoc(doc(db, 'attendance', targetDocId), payload, { merge: true });
      
      // Update local state and trigger UI changes
      setAttendanceRecord(payload);
      setAttSuccessMsg('Attendance saved successfully!');
      
      // Update the attendanceRecords array locally so it reflects immediately
      setAttendanceRecords(prev => {
        const idx = prev.findIndex(r => r.eventId === attendanceModalEvent.event_id);
        if (idx >= 0) {
          const newArr = [...prev];
          newArr[idx] = payload;
          return newArr;
        }
        return [...prev, payload];
      });

      // Give them a moment to read the success message before collapsing
      setTimeout(() => {
        setAttendanceModalOpen(false);
      }, 1500);

    } catch (err) {
      console.error("Failed to save attendance:", err);
      setAttErrors(['Error saving attendance. Please check console.']);
    } finally {
      setIsAttProcessing(false);
    }
  };

  // Reset selected participants when modal closes/opens
  useEffect(() => {
    if (!isAdding) {
      setSelectedParticipants([]);
    }
  }, [isAdding]);

  // Fetch livehouse matrix from Google Apps Script on mount
  useEffect(() => {
    setMatrixLoading(true);
    LivehouseMatrixService.fetchSchedule()
      .then(rows => setLivehouseMatrix(rows))
      .finally(() => setMatrixLoading(false));
  }, []);

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
    return filteredEvents.filter(e => {
      const targetDate = getTargetDisplayDate(e, timeDisplayMode);
      return targetDate === formattedStr;
    });
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
  // Prefers live data from the Google Apps Script matrix; falls back to local counts.
  const getTimeslotAvailability = (targetDate: string) => {
<<<<<<< HEAD
    const liveRows = LivehouseMatrixService.getDateAvailability(livehouseMatrix, targetDate);

    if (liveRows.length > 0) {
      // Live data path — trust the sheet directly
      return liveRows.map(row => ({
        slot: row.manilaLabel,
        count: (row.slot1Available ? 0 : 1) + (row.slot2Available ? 0 : 1),
        isTaken: row.fullyBooked,
        label: row.fullyBooked
          ? `${row.manilaLabel} [Fully Booked]`
          : `${row.manilaLabel} (${row.slot1Available && row.slot2Available ? 2 : 1} slot${row.slot1Available && row.slot2Available ? 's' : ''} available)`,
        // Pass through for reservation display
        slot1Available: row.slot1Available,
        slot1PoppoId:   row.slot1PoppoId,
        slot2Available: row.slot2Available,
        slot2PoppoId:   row.slot2PoppoId,
        source: row.source_origin,
      }));
    }

    // Fallback: derive counts from local calendar events + approved requests
    const calendarEventsCount = events.reduce((acc, event) => {
      if (event.date === targetDate && (event.type === 'Solo Livehouse' || event.type === 'Party Livehouse')) {
        acc[event.time] = (acc[event.time] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const approvedRequestsCount = livehouseRequests.reduce((acc, req) => {
      if (req.date === targetDate && req.status === 'Approved') {
        acc[req.timeslot] = (acc[req.timeslot] || 0) + 1;
      }
=======
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
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
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
<<<<<<< HEAD
      const count = Math.max(
        calendarEventsCount[slot] || 0,
        approvedRequestsCount[slot] || 0
      );
=======
      const count = calendarEventsCount[slot] || 0;
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
      const isTaken = count >= 2;
      const pendingCount = pendingRequestsCount[slot] || 0;
      const eventTitles = timeslotTitles[slot] || [];

      return {
        slot,
        count,
        isTaken,
<<<<<<< HEAD
        label: isTaken ? `${slot} [Fully Booked / Taken]` : `${slot} (${2 - count} slots available)`,
        slot1Available: count < 1,
        slot1PoppoId: '',
        slot2Available: count < 2,
        slot2PoppoId: '',
        source: 'LOCAL_FALLBACK' as const,
=======
        pendingCount,
        eventTitles,
        label: isTaken ? `${slot} [Fully Booked / Taken]` : `${slot} (${2 - count} slots available)`
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
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
    const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    const newEvent: CalendarEvent = {
      id: newId,
      event_id: newId,
      poppo_id: req.poppoId,
      event_host_id: req.poppoId,
      title: `Livehouse: ${req.name}`,
      description: req.notes || 'Livehouse timeslot approved.',
      date: req.date,
      event_date: req.date,
      time: req.timeslot,
      type: (req.livehouseType || 'SOLO LIVEHOUSE') as EventType,
      type_of_event: req.livehouseType || 'SOLO LIVEHOUSE',
      location: 'VIRTUAL ROOM (LIVEHOUSE)',
      created_by_name: auth.nickname || auth.name || 'Admin',
      created_by_role: auth.role || 'Admin',
      created_by_id: auth.poppo_id || auth.id || 'Unknown',
      visibility: 'All',
      participants: [req.poppoId],
      participantIds: [req.poppoId],
      participants_id: [req.poppoId],
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

    const newId = crypto.randomUUID();
    const newEvent: CalendarEvent = {
      id: newId,
      event_id: newId,
      poppo_id: isTalent ? auth.poppo_id : (formData.get('hostId') as string || 'Agency'),
      event_host_id: formData.get('eventHostId') as string || '',
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      date: formData.get('date') as string,
      event_date: formData.get('date') as string,
      time: formData.get('time') as string,
      type: formData.get('type') as string || 'Agency Event',
      type_of_event: formData.get('type') as string || 'Agency Event',
      location: formData.get('location') as string || 'ONLINE',
      created_by_name: auth.name,
      created_by_role: auth.role,
      created_by_id: auth.poppo_id || auth.id || 'Unknown',
      visibility: formData.get('visibility') as any || 'All',
      participants: [...selectedParticipants],
      participantIds: [...selectedParticipants], // alias for Firestore array-contains queries
      participants_id: [...selectedParticipants],
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
      const reporterPoppoId = auth.poppo_id || auth.id || 'SystemAdmin';
      const reporterRoleStr = auth.role || 'Admin';
      const reporterNameStr = auth.nickname || auth.name || 'Admin';
      const attendanceId = existing?.attendanceId || generateSubmissionId(reporterPoppoId, reporterRoleStr, reporterNameStr);

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

      {/* Combined Calendar Block */}
      <div className="bg-black/20 backdrop-blur-xl p-5 rounded-3xl border border-[#D4AF37]/20 shadow-[0_0_30px_rgba(212,175,55,0.05)] animate-fade-in space-y-6">
        {/* Dual-Tab Navigation */}
        <div className="flex items-center gap-1 bg-[#0e0a08]/90 p-1 rounded-lg border border-[#D4AF37]/20 w-max mx-auto">
          <button
            onClick={() => setActiveTab('AGENCY')}
            className={cn(
              "px-5 py-1.5 rounded-md text-[10px] font-black tracking-widest uppercase transition-all duration-300",
              activeTab === 'AGENCY'
                ? "bg-[#D4AF37]/20 text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                : "text-[#F0EFE8]/40 hover:text-[#D4AF37]/70 hover:bg-[#D4AF37]/5"
            )}
          >
            AGENCY CALENDAR
          </button>
          <button
            onClick={() => setActiveTab('LIVEHOUSE')}
            className={cn(
              "px-5 py-1.5 rounded-md text-[10px] font-black tracking-widest uppercase transition-all duration-300",
              activeTab === 'LIVEHOUSE'
                ? "bg-[#D4AF37]/20 text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                : "text-[#F0EFE8]/40 hover:text-[#D4AF37]/70 hover:bg-[#D4AF37]/5"
            )}
          >
            LIVEHOUSE CALENDAR
          </button>
        </div>

<<<<<<< HEAD
      <div className="space-y-6">
        {/* Main Calendar Section */}
<<<<<<< HEAD
        <div className="lg:col-span-3 space-y-6">
          {/* Week Selector / Navigation controls */}
          <div className="flex items-center justify-between bg-[#111111] border border-slate-800 p-4 rounded-2xl">
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
=======
        <div className="space-y-6">
          {/* View Toggles & Navigation controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between bg-[#0F1117] border border-[#D4AF37]/40 p-4 rounded-2xl gap-4 shadow-[0_0_15px_rgba(212,175,55,0.15)]">
            <div className="flex items-center gap-2 bg-[#0A0B0E] p-1.5 rounded-xl border border-[#D4AF37]/20 w-full sm:w-auto">
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
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
            </div>

<<<<<<< HEAD
          {/* 7-Day Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 md:gap-4 bg-[#0A0A0A] p-4 rounded-3xl border border-white/5 shadow-xl">
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
                        ? "bg-[#181B24] border-[#FFB800] shadow-[0_0_15px_rgba(212,175,55,0.15)] text-[#FFB800]" 
                        : "bg-[#111111] border-white/5 hover:border-white/10 hover:bg-[#0A0A0A] text-white"
                    )}
                    title={`Select ${dayName}`}
                    aria-label={`Select ${dayName}`}
                  >
                    <span className={cn(
                      "text-[9px] font-black tracking-widest uppercase",
                      isSelected ? "text-[#FFB800]" : "text-white/40"
                    )}>
                      {dayAbbr}
                    </span>
                    <span className="text-lg font-black tracking-tight">
                      {dayNum}
                    </span>
                    {dayEventsCount > 0 && !isSelected && (
                      <span className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full bg-[#FFB800]" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Events Section Heading */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
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
                  bg: 'bg-white/5 border-white/5',
                  text: 'text-white/40',
                  gradient: 'from-slate-600 to-slate-400'
                };
                
                return (
                  <button
                    key={e.event_id}
                    onClick={() => setSelectedEventId(e.event_id)}
                    className={cn(
                      "w-full text-left bg-[#111111]/80 p-5 rounded-2xl relative overflow-hidden transition-all flex items-stretch gap-4 border cursor-pointer group shadow-lg",
                      isEventSelected 
                        ? "border-[#FFB800] bg-[#1A1A1A] shadow-[0_0_15px_rgba(212,175,55,0.15)]" 
                        : "border-white/5 hover:border-white/10 hover:bg-[#222222]"
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
                          {e.time || '14:00 - 16:00'}
                        </span>
                      </div>
                      
                      <div>
                        <h4 className="font-black text-white text-base tracking-tight uppercase group-hover:text-[#FFB800] transition-colors">
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
              <div className="bg-[#111111]/30 border border-dashed border-white/5 rounded-2xl py-12 text-center">
                <CalendarIcon className="mx-auto text-white/10 mb-2" size={28} />
                <p className="text-xs text-white/20 italic">No events scheduled for this date.</p>
=======
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
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
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

<<<<<<< HEAD
          {/* Detailed Interactive Card */}
          <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden bg-gradient-to-br from-[#111111] to-[#12141A]">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/2 via-transparent to-[#FFB800]/2 pointer-events-none" />
            
            {selectedEvent ? (
              <div className="space-y-5 relative z-10">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Info size={14} className="text-[#FFB800]" />
                    <span className="text-[10px] font-black uppercase text-[#FFB800] tracking-widest">
                      Complete Event Metadata
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5">
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
                      <p className="font-medium text-white/60 leading-relaxed bg-[#0A0B0E]/60 border border-white/5 rounded-xl p-3.5">
                        {selectedEvent.description || 'No description provided.'}
                      </p>
                    </div>
                    {selectedEvent.location && (
                      <div>
                        <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Location Details</span>
                        <div className="flex items-center gap-1.5 font-bold text-white uppercase bg-[#0A0B0E]/30 px-3 py-2 rounded-xl border border-white/5 w-fit">
                          <MapPin size={13} className="text-red-400" />
                          <span>{selectedEvent.location}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4 md:border-l md:border-white/5 md:pl-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Target Date</span>
                        <p className="font-mono font-bold text-white bg-[#0A0B0E]/40 px-2.5 py-1.5 rounded-lg border border-white/5 w-fit">{selectedEvent.date}</p>
                      </div>
                      <div>
                        <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Scheduled Time</span>
                        <p className="font-mono font-bold text-white bg-[#0A0B0E]/40 px-2.5 py-1.5 rounded-lg border border-white/5 w-fit">{selectedEvent.time || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Host ID</span>
                        <span className="inline-flex px-2.5 py-1.5 bg-[#0A0B0E]/40 border border-white/5 rounded-lg font-mono font-bold text-white/80">
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
                        <span className="inline-flex px-2.5 py-1.5 bg-[#FFB800]/10 border border-[#FFB800]/20 text-[#FFB800] rounded-lg font-bold">
                          {selectedEvent.type || 'Standard Event'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Authorized By</span>
                        <div className="flex items-center gap-1.5 text-white/80 font-bold">
                          <User size={13} className="text-white/45" />
                          <span>
                            {selectedEvent.created_by_name}{' '}
                            <span className="text-[9px] text-[#FFB800] font-black uppercase">[{selectedEvent.created_by_role}]</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {selectedEvent.event_host_id && (
                      <div>
                        <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Event Host ID</span>
                        <p className="font-mono font-bold text-white bg-[#0A0B0E]/40 px-2.5 py-1.5 rounded-lg border border-white/5 w-fit">
                          {selectedEvent.event_host_id}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-1">Created Timestamp</span>
                      <p className="font-mono text-white/40 text-[10px] bg-[#0A0B0E]/30 px-2.5 py-1 rounded-lg border border-white/5 w-fit">
                        {new Date(selectedEvent.timestamp || new Date()).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Niners Participants display */}
                  {selectedEvent.participants && selectedEvent.participants.length > 0 && (
                    <div className="md:col-span-2 pt-2 border-t border-white/5">
                      <span className="block text-[9px] font-black uppercase tracking-wider text-white/30 mb-2">Niners Participants ({selectedEvent.participants.length})</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedEvent.participants.map(poppoId => {
                          const pHost = (hosts || []).find(h => h.id === poppoId);
                          const dispName = pHost ? `${pHost.nickname || pHost.name} (#${poppoId})` : `#${poppoId}`;
                          return (
                            <span key={poppoId} className="bg-slate-800/60 border border-slate-700 rounded-lg px-2.5 py-1 text-[10px] font-semibold text-white/90">
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
          {!isReadOnly && auth.level > 0 && (
            <div className="bg-[#111111] border border-white/5 rounded-3xl p-6 shadow-xl bg-gradient-to-br from-[#111111] to-[#12141A] mt-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/2 via-transparent to-[#FFB800]/2 pointer-events-none" />
              
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-[#ec4899]" />
                  <span className="text-[10px] font-black uppercase text-white tracking-widest">
                    Livehouse Reservation Requests Queue
                  </span>
                </div>
                <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/5 font-bold">
                  Requests: {visibleRequests.length}
                </span>
              </div>

              {visibleRequests.length > 0 ? (
                <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                  {visibleRequests.map(req => {
                    const isOwnRequest = req.poppoId === auth.poppo_id;
                    const canManage = auth.role === 'Director' || auth.role === 'Founder' || auth.role === 'Head Admin' || auth.role === 'Admin' || auth.role === 'Manager' || auth.level >= 2;
                    
                    let statusColor = 'bg-slate-500/10 border-slate-500/20 text-slate-400';
                    if (req.status === 'Approved') statusColor = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                    if (req.status === 'Pending Approval' || req.status === 'Host Accepted Proposal') statusColor = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                    if (req.status === 'New Timeslot Proposed') statusColor = 'bg-pink-500/10 border-pink-500/20 text-pink-400';
                    if (req.status === 'Closed') statusColor = 'bg-red-500/10 border-red-500/20 text-red-400';

                    return (
                      <div key={req.id} className="bg-[#0A0B0E]/60 border border-white/5 rounded-2xl p-4 space-y-3 shadow-lg relative group hover:border-[#ec4899]/30 transition-all">
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
                                className="bg-slate-900 border border-[#FFB800] hover:bg-[#FFB800]/10 text-[#FFB800] text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg cursor-pointer transition-all active:scale-95 shadow-lg shadow-[#FFB800]/5"
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
                              <button 
                                onClick={() => handleApproveRequest(req.id)}
                                className="bg-slate-900 border border-emerald-500/70 hover:bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg cursor-pointer transition-all active:scale-95 shadow-lg shadow-emerald-500/5"
                              >
                                Approve slot
                              </button>
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
                          <div className="bg-[#12141C] border border-slate-800 rounded-xl p-4 mt-3 space-y-3">
                            <h5 className="text-[10px] font-black text-white/50 uppercase tracking-widest">Propose Alternative Timeslot</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label htmlFor={`prop-date-${req.id}`} className="text-[8px] font-black text-white/40 uppercase tracking-wider block">Proposal Date</label>
                                <input 
                                  id={`prop-date-${req.id}`}
                                  type="date" 
                                  value={proposalDate} 
                                  onChange={(e) => setProposalDate(e.target.value)} 
                                  required 
                                  title="Proposal Date" 
                                  className="w-full bg-[#0A0B0E] border border-slate-800 rounded-lg px-3 py-2 text-xs focus:border-[#FFB800] outline-none text-white font-mono" 
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
                                  className="w-full bg-[#0A0B0E] border border-slate-800 rounded-lg px-3 py-2 text-xs focus:border-[#FFB800] outline-none text-white font-bold cursor-pointer"
                                >
                                  <option value="">-- Choose timeslot --</option>
                                  {getTimeslotAvailability(proposalDate).map(t => (
                                    <option 
                                      key={t.slot} 
                                      value={t.slot} 
                                      disabled={t.isTaken} 
                                      className={cn("bg-[#111111]", t.isTaken ? "text-red-500/50" : "text-white")}
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
                                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white/45 text-[9px] font-black uppercase tracking-wider hover:bg-slate-800 transition-colors"
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
=======
          {/* Calendar Grids */}
          {viewMode === 'week' ? (
            /* 7-Day Calendar Grid */
            <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 custom-scrollbar">
              <div className="grid grid-cols-7 gap-2 md:gap-4 bg-[#0B0D12] p-4 rounded-3xl border border-[#D4AF37]/40 shadow-[0_0_15px_rgba(212,175,55,0.15)] min-w-[700px]">
                {weekDays.map((day, idx) => {
                  const dayName = format(day, 'EEEE');
                  const dayAbbr = format(day, 'EEE').toUpperCase();
                  const dayNum = format(day, 'd');
                  const isSelected = isSameDay(day, selectedDate);
                  const dayEventsCount = getEventsForDay(day).length;

                  return (
                    <div key={idx} className="flex flex-col items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.1em] text-[#D4AF37]/60 text-center truncate w-full">
                        {dayName}
                      </span>
                      <button
                        onClick={() => handleDateClick(day)}
                        className={cn(
                          "w-full py-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all border cursor-pointer select-none relative bg-gradient-to-br",
                          isSelected 
                            ? "from-indigo-950 to-slate-900 ring-1 ring-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] border-transparent" 
                            : "from-[#0F1117] to-[#13161F] border-[#D4AF37]/10 hover:border-purple-500/50 hover:from-slate-900 hover:to-indigo-950/40 text-white"
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
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
=======
      {activeTab === 'LIVEHOUSE' ? (
        <LivehouseCalendar 
          allUsers={allUsers}
          onOpenBookingModal={(date, timeslot) => {
            // Adapt the existing state
            setReserveDate(new Date(date));
            setReserveTimeslot(timeslot);
            setIsReservingLivehouse(true);
          }}
        />
      ) : (
        <div className="space-y-6">
          {/* Monthly Grid View */}
          <div className="animate-fade-in space-y-4 bg-gradient-to-b from-[#0a0806]/90 to-[#050403]/90 backdrop-blur-2xl border border-[#D4AF37]/20 rounded-3xl p-4 sm:p-5 shadow-[0_0_40px_rgba(212,175,55,0.08)] relative overflow-hidden">
            {/* Subtle Fiery Glow Background accents */}
            <div className="absolute top-0 left-1/4 w-1/2 h-32 bg-[#FF8C00]/5 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-1/2 h-32 bg-[#D4AF37]/5 blur-[80px] pointer-events-none" />

            {/* Header with Navigation & Month/Year */}
            <div className="grid grid-cols-2 items-center justify-between border-b border-[#D4AF37]/10 pb-2 gap-2 sm:gap-4 w-full">
              {/* Month Navigation (Left Col) */}
              <div className="flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 bg-[#14100c]/60 p-1 rounded-2xl border border-[#D4AF37]/10 backdrop-blur-md justify-self-start max-w-full overflow-hidden">
                <button 
                  title="Previous Month"
                  onClick={goToPreviousMonth} 
                  className="p-1 sm:p-1.5 hover:bg-[#D4AF37]/20 rounded-xl transition-all text-[#D4AF37] cursor-pointer"
                >
                  <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
                </button>
                
                <div className="flex items-center gap-1 sm:gap-2 px-1 overflow-hidden">
                  <h2 className="text-[11px] sm:text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF0B3] to-[#D4AF37] tracking-widest uppercase truncate">
                    {format(currentDate, 'MMM yyyy')}
                  </h2>
                </div>
                
                <button 
                  title="Next Month"
                  onClick={goToNextMonth} 
                  className="p-1 sm:p-1.5 hover:bg-[#D4AF37]/20 rounded-xl transition-all text-[#D4AF37] cursor-pointer"
                >
                  <ChevronRight size={18} className="sm:w-5 sm:h-5" />
                </button>
              </div>
  
              {/* Timezone Toggle (Right Col) */}
              <div className="flex w-full sm:w-auto bg-[#0a0806]/80 p-1.5 sm:p-2 rounded-2xl border border-white/5 backdrop-blur-xl shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] justify-self-center sm:justify-self-end">
                <button 
                  onClick={() => setTimeDisplayMode('Manila')}
                  className={cn(
                    "flex-1 text-center px-4 sm:px-8 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] rounded-xl transition-all duration-300 truncate",
                    timeDisplayMode === 'Manila'
                      ? "bg-gradient-to-br from-[#D4AF37]/25 to-[#FF8C00]/10 border border-[#D4AF37]/40 shadow-[0_0_15px_rgba(255,140,0,0.15),inset_0_0_10px_rgba(212,175,55,0.2)] text-transparent bg-clip-text bg-gradient-to-b from-[#FFF0B3] to-[#D4AF37]"
                      : "bg-transparent border border-transparent text-white/40 hover:text-[#D4AF37]/80 hover:bg-white/5 cursor-pointer"
                  )}
                >
                  UTC+8
                </button>
                <button 
                  onClick={() => setTimeDisplayMode('Local')}
                  className={cn(
                    "flex-1 text-center px-4 sm:px-8 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] rounded-xl transition-all duration-300 truncate",
                    timeDisplayMode === 'Local'
                      ? "bg-gradient-to-br from-[#D4AF37]/25 to-[#FF8C00]/10 border border-[#D4AF37]/40 shadow-[0_0_15px_rgba(255,140,0,0.15),inset_0_0_10px_rgba(212,175,55,0.2)] text-transparent bg-clip-text bg-gradient-to-b from-[#FFF0B3] to-[#D4AF37]"
                      : "bg-transparent border border-transparent text-white/40 hover:text-[#D4AF37]/80 hover:bg-white/5 cursor-pointer"
                  )}
                >
                  {localTzAbbr}
                </button>
              </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 mt-4">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} className="text-center text-[9px] sm:text-[10px] font-black text-[#D4AF37]/60 uppercase tracking-widest">{d}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
              {monthDays.map((day, idx) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const dayNum = parseInt(dayStr.split('-')[2], 10);
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                
                let borderClass = "border-white/10";
                let bgClass = "bg-gradient-to-br from-[#2a221b]/90 to-[#1a140f]/90 backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.4),inset_0_0_15px_rgba(255,255,255,0.03)]";
                let textClass = isCurrentMonth ? "text-white/90" : "text-white/30";
                
                if (isToday) {
                   borderClass = "border-[#FFD700]/50"; 
                   bgClass = "bg-gradient-to-br from-[#D4AF37]/15 via-[#1a1208]/80 to-[#FF8C00]/15 backdrop-blur-xl shadow-[0_0_20px_rgba(212,175,55,0.15),inset_0_0_15px_rgba(212,175,55,0.1)]";
                   textClass = "text-transparent bg-clip-text bg-gradient-to-b from-[#FFF0B3] to-[#D4AF37]";     
                } else if (isSelected) {
                   borderClass = "border-[#FF8C00]/50"; 
                   bgClass = "bg-gradient-to-br from-[#FF8C00]/15 via-[#1a0f08]/80 to-[#FF4500]/15 backdrop-blur-xl shadow-[0_0_20px_rgba(255,140,0,0.15),inset_0_0_15px_rgba(255,140,0,0.1)]";
                   textClass = "text-transparent bg-clip-text bg-gradient-to-b from-[#FFD700] to-[#FF8C00]";         
                }

                const dayEvents = getEventsForDay(day);

                return (
                  <button
                    key={idx}
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      "aspect-square rounded-xl sm:rounded-2xl flex flex-col items-center justify-center border transition-all cursor-pointer relative group hover:border-[#D4AF37]/30",
                      bgClass, borderClass
                    )}
                  >
                    <span className={cn(
                      "text-sm sm:text-xl font-black drop-shadow-md leading-none transition-transform group-hover:scale-105",
                      textClass
                    )}>
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="absolute bottom-1.5 flex gap-0.5">
                         {dayEvents.slice(0,3).map((e,i) => {
                           const config = EVENT_COLORS[e.type || ''] || { gradient: 'from-[#D4AF37] to-[#b8960c]' };
                           return <div key={i} className={cn("w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-gradient-to-br", config.gradient)} />
                         })}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Header Banner */}
          <div className="mb-4 sticky top-0 z-10 flex flex-col gap-1">
            <div className="flex items-center justify-center bg-gradient-to-r from-[#0a0806]/95 via-[#1a1208]/95 to-[#0a0806]/95 backdrop-blur-xl py-3 rounded-2xl border border-[#D4AF37]/30 shadow-[0_5px_15px_rgba(0,0,0,0.6),inset_0_0_15px_rgba(212,175,55,0.05)]">
               <div className="text-xs sm:text-[13px] font-black tracking-[0.15em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#FFF0B3] via-[#D4AF37] to-[#FF8C00] text-center px-4">
                  {(() => {
                    const activeDateStr = format(selectedDate, 'yyyy-MM-dd');
                    const localAgnosticDate = parseISO(activeDateStr);
                    if (timeDisplayMode === 'Manila') {
                      return `${format(localAgnosticDate, 'MMMM dd, yyyy')} | UTC+8 Manila, PH`;
                    } else {
                      return `${format(localAgnosticDate, 'MMMM dd, yyyy')} | ${localTzAbbr}`;
                    }
                  })()}
               </div>
>>>>>>> 2b42d3ae84c3e300e1faeb35e7009a759158d1e9
            </div>
          </div>

<<<<<<< HEAD
        {/* Sidebar: Event Options & Create */}
        <div className="space-y-6">
          {/* Filter options */}
          <div className="bg-[#111111] border border-slate-800 p-4 rounded-2xl space-y-3 shadow-lg">
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
                        ? "bg-slate-800 border-slate-700 text-white"
                        : "bg-[#0A0B0E] border-slate-900 text-slate-500 hover:text-white/60"
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
                  className="mt-2 text-center text-[9px] font-black uppercase text-[#FFB800] hover:underline cursor-pointer"
=======
          {/* Scheduled Events Panel */}
<<<<<<< HEAD
          <div className="bg-gradient-to-br from-[#0F1117] to-[#12141A] rounded-3xl border border-[#D4AF37]/40 p-5 space-y-4 shadow-[0_0_15px_rgba(212,175,55,0.15)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#D4AF37]/20 pb-4 gap-4">
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
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>
            </div>
=======
          <div className="bg-black/20 backdrop-blur-xl rounded-3xl border border-[#D4AF37]/25 p-5 space-y-4 shadow-[0_0_30px_rgba(212,175,55,0.05)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#D4AF37]/5 via-transparent to-orange-500/5 pointer-events-none" />
>>>>>>> 2b42d3ae84c3e300e1faeb35e7009a759158d1e9

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {selectedDayEvents.length > 0 ? (
                selectedDayEvents
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map(e => {
                    const colorConfig = EVENT_COLORS[e.type || ''] || { gradient: 'from-[#D4AF37] to-[#b8960c]', text: 'text-[#D4AF37]' };
                    const displayTime = e.time === '00:00' ? 'TBD' : e.time;
                    
                    let eventDateObj = new Date();
                    const firstTimePart = e.time === '00:00' ? '00:00' : e.time.split('-')[0].trim();
                    const parsedStart = parseTimeStringToHourMin(firstTimePart);
                    if (parsedStart) {
                       eventDateObj = new Date(`${e.date}T${parsedStart.h.toString().padStart(2, '0')}:${parsedStart.m.toString().padStart(2, '0')}:00+08:00`);
                    } else {
                       eventDateObj = new Date(`${e.date}T00:00:00+08:00`);
                    }

                    // Determine if the event is "upcoming" or "past/ongoing"
                    const isUpcoming = eventDateObj > new Date();
                    
                    // Find host profile data
                    const hostPoppoId = e.poppo_id || e.host_poppo_id || e.createdBy;
                    const hostUser = allUsers.find(u => (u.poppo_id || u.poppoId || u.id) === hostPoppoId);
                    const hostName = hostUser ? (hostUser.nickname || hostUser.name) : (e.createdByName || 'Niner');
                    const hostPhoto = hostUser ? (hostUser.photoUrl || hostUser.profilePhotoUrl || hostUser.photoURL) : null;
                    const avatarUrl = hostPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(hostName)}&background=0a0806&color=D4AF37`;
                    
                    const eventAttendance = attendanceRecords.find(r => r.eventId === e.event_id);
                    const displayAttendees = eventAttendance ? (eventAttendance.attendees || eventAttendance.attendeeIds || eventAttendance.actualParticipants || []) : [];

                    return (
                      <div
                        key={e.event_id}
                        onClick={() => handleSpotlightClick(e)}
                        className={cn(
                          "w-full flex gap-4 items-center p-3 sm:p-4 rounded-2xl border transition-all cursor-pointer backdrop-blur-md hover:shadow-[0_0_15px_rgba(212,175,55,0.05)]",
                          isUpcoming ? "bg-gradient-to-r from-[#1a1208]/90 to-[#0a0806]/90 border-[#D4AF37]/20 hover:border-[#D4AF37]/40" 
                                     : "bg-gradient-to-r from-black/80 to-black/60 border-white/5 hover:border-[#D4AF37]/20"
                        )}
                      >
                        {/* Profile Column */}
                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-[#D4AF37]/50 p-0.5 bg-[#0a0806]">
                            <img src={avatarUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
                          </div>
                          <span className="text-[8px] sm:text-[9px] text-white/50 uppercase tracking-widest bg-white/5 px-1 py-0.5 rounded border border-white/5 whitespace-nowrap">
                            ID: {hostPoppoId || 'N/A'}
                          </span>
                        </div>

                        {/* Details Column */}
                        <div className="flex flex-col min-w-0 flex-1 justify-center">
                          <div className="flex items-start justify-between w-full">
                            <h4 className="text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF0B3] to-[#FFD700] uppercase tracking-widest truncate mb-1">
                              {hostName}
                            </h4>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn("text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border whitespace-nowrap", colorConfig.text, "border-current/20 bg-current/5")}>
                              {e.type || 'Event'}
                            </span>
                            <span className="text-[9px] sm:text-[10px] font-black text-[#FF8C00] tracking-widest bg-[#FF8C00]/10 border border-[#FF8C00]/20 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                              {timeDisplayMode === 'Local' ? (() => {
                                if (displayTime === 'TBD' || !displayTime) return displayTime;
                                try {
                                  const formatLocal = (timeStr: string) => {
                                    const parsed = parseTimeStringToHourMin(timeStr);
                                    if (!parsed) return timeStr;
                                    const isoString = `${e.date}T${parsed.h.toString().padStart(2, '0')}:${parsed.m.toString().padStart(2, '0')}:00+08:00`;
                                    const dateObj = new Date(isoString);
                                    let localH = dateObj.getHours();
                                    const localM = dateObj.getMinutes();
                                    const mStr = localM > 0 ? `:${localM.toString().padStart(2, '0')}` : '';
                                    let result = '';
                                    if (localH === 0) result = `12${mStr}AM`;
                                    else if (localH === 12) result = `12${mStr}PM`;
                                    else result = localH < 12 ? `${localH}${mStr}AM` : `${localH - 12}${mStr}PM`;

                                    const localDateStr = format(dateObj, 'yyyy-MM-dd');
                                    if (localDateStr !== e.date) {
                                      result += ` (${format(dateObj, 'MMM d')})`;
                                    }
                                    return result;
                                  };

                                  const parts = displayTime.split('-').map(s => s.trim());
                                  if (parts.length === 1) {
                                    return formatLocal(parts[0]);
                                  } else if (parts.length === 2) {
                                    return `${formatLocal(parts[0])} - ${formatLocal(parts[1])}`;
                                  }
                                  return displayTime;
                                } catch {
                                  return displayTime;
                                }
                              })() : displayTime}
                            </span>
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
<<<<<<< HEAD
<<<<<<< HEAD
                    className="w-full bg-[#FFB800] hover:bg-[#FFB800]/80 text-black font-black uppercase tracking-wider text-xs py-3.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#FFB800]/5 transition-all transform active:scale-95"
=======
                    className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black uppercase tracking-wider text-xs py-3.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all transform active:scale-95 border border-purple-400/50"
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
=======
                    className="px-4 py-2 border border-[#D4AF37]/30 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] font-black text-[10px] uppercase tracking-widest hover:border-[#D4AF37]/50 rounded-xl transition-all active:scale-[0.99] cursor-pointer flex items-center gap-2 shadow-md shadow-[#D4AF37]/5"
>>>>>>> 2b42d3ae84c3e300e1faeb35e7009a759158d1e9
                  >
                    <Plus size={14} />
                    Add Event
                  </button>
                )}

                {['talent', 'host'].includes(auth.role?.toLowerCase() || '') && (
                  <button 
<<<<<<< HEAD
                    onClick={() => setIsRequestingTimeslot(true)} 
                    className="w-full border border-[#FFB800]/50 hover:border-[#FFB800] text-[#FFB800] hover:bg-[#FFB800]/5 font-black uppercase tracking-wider text-xs py-3.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all transform active:scale-95"
=======
                    onClick={() => setIsReservingLivehouse(true)} 
<<<<<<< HEAD
                    className="flex-1 bg-slate-900 border border-purple-500/50 hover:bg-purple-500/10 text-purple-400 hover:text-white font-black uppercase tracking-[0.2em] text-xs py-3.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-xl transition-all transform active:scale-95"
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
=======
                    className="px-4 py-2 bg-black/20 border border-white/10 hover:bg-[#1a120e] hover:border-white/20 text-[#A09E9A] hover:text-[#F0EFE8] font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-[0.99] cursor-pointer flex items-center gap-2 shadow-md"
>>>>>>> 2b42d3ae84c3e300e1faeb35e7009a759158d1e9
                  >
                    <Clock size={14} />
                    Schedule Livehouse
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* Spotlight Modal */}
      <AnimatePresence>
      {spotlightEvent && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6" onClick={() => {
           setSpotlightEvent(null);
           setIsAttendanceExpanded(false);
           setIsEditExpanded(false);
        }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 10 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.95, opacity: 0, y: 10 }} 
            className="w-full max-w-md bg-[#050301] border border-[#D4AF37]/30 shadow-[0_0_50px_rgba(255,140,0,0.2),inset_0_0_20px_rgba(212,175,55,0.1)] rounded-3xl flex flex-col relative z-10 max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const hostPoppoId = spotlightEvent.poppo_id || spotlightEvent.host_poppo_id || spotlightEvent.createdBy;
              const hostUser = allUsers.find(u => (u.poppo_id || u.poppoId || u.id) === hostPoppoId);
              const hostName = hostUser ? (hostUser.nickname || hostUser.name) : (spotlightEvent.createdByName || 'Niner');
              const hostPhoto = hostUser ? (hostUser.photoUrl || hostUser.profilePhotoUrl || hostUser.photoURL) : null;
              const avatarUrl = hostPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(hostName)}&background=0a0806&color=D4AF37`;
              const eventDateObj = new Date(`${spotlightEvent.date}T${spotlightEvent.time === '00:00' ? '00:00' : spotlightEvent.time.split(' - ')[0]}`);
              const isUpcoming = eventDateObj > new Date();
              
              const loggedInUserRole = String(auth?.role || '').toLowerCase();
              const isStrictDirectorOrHeadAdmin = loggedInUserRole === 'director' || loggedInUserRole === 'head admin' || loggedInUserRole === 'head_admin';
              const isDirectorOrHeadAdmin = isStrictDirectorOrHeadAdmin || loggedInUserRole === 'admin';
              const isCreator = String(auth?.poppo_id || auth?.id) === String(spotlightEvent.createdBy || hostPoppoId);
              
              let canEdit = isUpcoming && (isDirectorOrHeadAdmin || isCreator);
              if (spotlightEvent.is_automated) {
                // Automated events can ONLY be edited by the Director or Head Admin
                canEdit = isStrictDirectorOrHeadAdmin;
              }

              return (
                <div className="p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                  {/* Header/Close */}
                  <div className="w-full flex flex-col items-end gap-2 absolute top-4 right-4 z-20">
                    <button 
                      title="Close"
                      onClick={() => {
                        setSpotlightEvent(null);
                        setIsAttendanceExpanded(false);
                        setIsEditExpanded(false);
                      }} className="text-white/30 hover:text-[#D4AF37] transition-colors p-1 bg-white/5 hover:bg-white/10 rounded-full">
                      <X size={20} />
                    </button>
                    
                    {(!isUpcoming || eventDateObj <= new Date()) && isDirectorOrHeadAdmin && (
                      <button
                        onClick={(clickEvent) => handleOpenAttendanceModal(clickEvent, spotlightEvent)}
                        className="px-3 py-1.5 bg-gradient-to-r from-[#FF8C00]/20 to-[#D4AF37]/20 hover:from-[#FF8C00]/30 hover:to-[#D4AF37]/30 border border-[#D4AF37]/50 text-[#FFD700] font-black text-[10px] uppercase tracking-wider rounded-lg transition-all shadow-[0_0_15px_rgba(255,140,0,0.2)] flex items-center gap-1.5 mt-1"
                      >
                        <CheckCircle2 size={12} />
                        Attendance
                      </button>
                    )}
                  </div>
                  
                  <>
                    {/* Top Right Edit Button (if applicable) */}
                    {canEdit && !isEditExpanded && (
                      <div className="absolute top-4 right-14 z-20">
                         <button 
                           title="Edit Event"
                           onClick={() => {
                             setEditEventDesc(spotlightEvent.description || '');
                             setEditEventParticipants(spotlightEvent.participants || []);
                             setIsEditExpanded(true);
                           }} 
                           className="text-white/30 hover:text-[#D4AF37] transition-colors p-1 bg-white/5 hover:bg-white/10 rounded-full"
                         >
                           <Edit2 size={16} />
                         </button>
                      </div>
                    )}

                    {/* Profile Info Row */}
                    <div className="flex flex-row items-center w-full gap-5 sm:gap-6 mt-[-10px]">
                      {/* Photo */}
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-[#D4AF37]/80 p-1 shadow-[0_0_20px_rgba(212,175,55,0.3)] shrink-0 bg-[#0a0806]">
                        <img 
                          src={avatarUrl} 
                          alt="Profile"
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>

                      {/* Name & ID */}
                      <div className="flex flex-col">
                        <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFF0B3] to-[#FFD700] uppercase tracking-widest leading-tight drop-shadow-md">
                          {hostName}
                        </h3>
                        <div className="text-[#A09E9A] font-medium tracking-widest text-[10px] sm:text-xs mt-1.5 bg-black/40 px-2 py-1 rounded-full border border-white/5 inline-flex w-max">
                          ID: <span className="text-white ml-1">{hostPoppoId || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent my-1" />

                    {/* Event Details */}
                    <div className="w-full bg-[#0a0806]/60 rounded-2xl border border-[#D4AF37]/10 p-5 flex flex-col gap-4 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-[#D4AF37]/10 rounded-xl text-[#D4AF37] border border-[#D4AF37]/20">
                          <CalendarIcon size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]/60 font-black mb-1">Event Type</span>
                          <span className="text-sm font-black text-white/90 uppercase tracking-widest">{spotlightEvent.type || 'Event'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-gradient-to-br from-[#FF8C00]/10 to-[#FF4500]/10 rounded-xl text-[#FF8C00] border border-[#FF8C00]/20">
                          <Clock size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-[#FF8C00]/60 font-black mb-1">Date & Time</span>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-black text-[#FF8C00] uppercase tracking-widest">{format(new Date(spotlightEvent.date), 'MMM dd, yyyy')}</span>
                            <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FF8C00] flex items-center gap-1">
                              {timeDisplayMode === 'Local' ? (() => {
                                const displayTime = spotlightEvent.time;
                                if (displayTime === 'TBD' || !displayTime) return displayTime;
                                try {
                                  // using global parseTimeStringToHourMin

                                  const formatLocal = (timeStr: string) => {
                                    const parsed = parseTimeStringToHourMin(timeStr);
                                    if (!parsed) return timeStr;
                                    const isoString = `${spotlightEvent.date}T${parsed.h.toString().padStart(2, '0')}:${parsed.m.toString().padStart(2, '0')}:00+08:00`;
                                    const dateObj = new Date(isoString);
                                    let localH = dateObj.getHours();
                                    const localM = dateObj.getMinutes();
                                    const mStr = localM > 0 ? `:${localM.toString().padStart(2, '0')}` : '';
                                    let result = '';
                                    if (localH === 0) result = `12${mStr}AM`;
                                    else if (localH === 12) result = `12${mStr}PM`;
                                    else result = localH < 12 ? `${localH}${mStr}AM` : `${localH - 12}${mStr}PM`;

                                    const localDateStr = format(dateObj, 'yyyy-MM-dd');
                                    if (localDateStr !== spotlightEvent.date) {
                                      result += ` (${format(dateObj, 'MMM d')})`;
                                    }
                                    return result;
                                  };

                                  const parts = displayTime.split('-').map(s => s.trim());
                                  if (parts.length === 1) {
                                    return formatLocal(parts[0]);
                                  } else if (parts.length === 2) {
                                    return `${formatLocal(parts[0])} - ${formatLocal(parts[1])}`;
                                  }
                                  return displayTime;
                                } catch {
                                  return displayTime;
                                }
                              })() : spotlightEvent.time}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expandable Edit Section */}
                    {isEditExpanded && (
                       <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="flex flex-col gap-4 mt-2">
                          <div className="bg-[#1a1208]/50 border border-[#D4AF37]/20 rounded-xl p-4">
                            <h4 className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-black mb-2">Edit Event Description</h4>
                            <textarea
                              value={editEventDesc}
                              onChange={(e) => setEditEventDesc(e.target.value)}
                              className="w-full bg-black/50 border border-[#D4AF37]/20 rounded-lg p-2 text-white text-xs min-h-[60px] focus:outline-none focus:border-[#D4AF37]/50"
                              placeholder="Update description..."
                            />
                            {/* Note: Update logic mapped to standard FirebaseService updates if required */}
                            <button 
                              onClick={() => {
                                // Simulate Save
                                setIsEditExpanded(false);
                                setSpotlightEvent({ ...spotlightEvent, description: editEventDesc });
                              }}
                              className="w-full mt-3 py-2 bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 border border-[#D4AF37]/50 text-[#D4AF37] text-[10px] uppercase tracking-widest font-black rounded-lg transition-colors"
                            >
                              Save Changes
                            </button>
                          </div>
                          <button 
                            onClick={() => {
                              // Simulate Delete
                              setSpotlightEvent(null);
                              setIsEditExpanded(false);
                            }}
                            className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 text-[10px] uppercase tracking-widest font-black rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                             <Trash2 size={14} /> Delete Event
                          </button>
                       </motion.div>
                    )}

                    {/* Participants Section */}
                    {spotlightEvent.participants && spotlightEvent.participants.length > 0 && (
                      <div className="mt-2">
                        <h5 className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest mb-3 border-b border-white/5 pb-2">Performers / Hosts</h5>
                        <div className={`grid gap-3 ${spotlightEvent.participants.length <= 4 ? 'grid-cols-4' : 'grid-cols-4 sm:grid-cols-6'}`}>
                          {spotlightEvent.participants.map((pid, idx) => {
                            const pUser = allUsers.find(u => String(u.poppo_id || u.poppoId || u.id) === String(pid));
                            const pName = pUser ? (pUser.nickname || pUser.name) : pid;
                            const pPhoto = pUser ? (pUser.photoUrl || pUser.profilePhotoUrl || pUser.photoURL) : null;
                            const avatar = pPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(pName)}&background=0a0806&color=D4AF37`;
                            const isLarge = spotlightEvent.participants.length <= 4;
                            return (
                              <div key={idx} className="flex flex-col items-center justify-start gap-1.5 p-1 transition-transform hover:scale-105">
                                <img src={avatar} alt={pName} className={`${isLarge ? 'w-14 h-14 sm:w-16 sm:h-16' : 'w-10 h-10'} rounded-full border border-[#D4AF37]/30 object-cover shadow-[0_0_10px_rgba(212,175,55,0.1)]`} />
                                <span className={`${isLarge ? 'text-[10px] sm:text-xs' : 'text-[9px]'} font-bold text-white/80 text-center leading-tight line-clamp-1 w-full`} title={pName}>{pName}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Attendance Section */}
                    {(attendanceRecord || isUpcoming === false) && (
                      <div className="mt-4">
                        <h5 className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest mb-3 border-b border-white/5 pb-2">Attendance</h5>
                        <div className="flex flex-col gap-2">
                          {(() => {
                            const displayAttendees = attendanceRecord ? (
                              attendanceRecord.attendees || 
                              attendanceRecord.attendeeIds || 
                              attendanceRecord.actualParticipants || 
                              attendanceRecord.participants || 
                              attendanceRecord.participantIds || 
                              []
                            ) : [];
                              
                            if (displayAttendees && displayAttendees.length > 0) {
                              const isLarge = displayAttendees.length <= 4;
                              return (
                                <div className={`grid gap-3 ${isLarge ? 'grid-cols-4' : 'grid-cols-4 sm:grid-cols-6'}`}>
                                  {displayAttendees.map((att: any, idx: number) => {
                                    const pid = typeof att === 'string' ? att : (att.poppoId || att.poppo_id || att.id || att.participantId);
                                    const pUser = allUsers.find(u => String(u.poppo_id || u.poppoId || u.id) === String(pid));
                                    const pName = pUser ? (pUser.nickname || pUser.name) : pid;
                                    const pPhoto = pUser ? (pUser.photoUrl || pUser.profilePhotoUrl || pUser.photoURL) : null;
                                    const avatar = pPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(pName)}&background=0a0806&color=D4AF37`;
                                    
                                    return (
                                      <div key={idx} className="flex flex-col items-center justify-start gap-1.5 p-1 transition-transform hover:scale-105">
                                        <img src={avatar} alt={pName} className={`${isLarge ? 'w-14 h-14 sm:w-16 sm:h-16' : 'w-10 h-10'} rounded-full border border-[#D4AF37]/30 object-cover shadow-[0_0_10px_rgba(212,175,55,0.1)]`} />
                                        <span className={`${isLarge ? 'text-[10px] sm:text-xs' : 'text-[9px]'} font-bold text-white/80 text-center leading-tight line-clamp-1 w-full`} title={pName}>{pName}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              );
                            } else {
                              return <div className="text-center text-[10px] text-white/30 italic p-4 bg-white/5 rounded-xl border border-white/5">No attendance records yet.</div>;
                            }
                          })()}
                        </div>
                      </div>
                    )}

                     <div className="w-full flex justify-center mt-4 pt-3 border-t border-white/5">
                        <span className="text-[8px] sm:text-[9px] font-mono text-white/20 uppercase tracking-widest">
                           Event ID: {spotlightEvent.event_id}
                        </span>
                     </div>
                  </>
                </div>
                );
              })()}
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Create Event Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
<<<<<<< HEAD
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdding(false)} className="absolute inset-0 bg-[#0A0B0E]/80 backdrop-blur-sm" />
<<<<<<< HEAD
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#111111] border border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="p-6 border-b border-slate-800 font-black text-white uppercase tracking-widest text-[10px]">Create New Event Entry</div>
              <form onSubmit={handleCreate} className="p-6 space-y-5">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="event-title" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Event Title</label>
                    <input id="event-title" name="title" required className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#FFB800] outline-none text-white placeholder-white/20" placeholder="e.g. PK Battle" title="Event Title" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="event-type" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Event Type</label>
                    <select id="event-type" name="type" title="Event Type" className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#FFB800] outline-none text-white font-bold cursor-pointer">
                      {Object.keys(EVENT_COLORS).map(type => (
                        <option key={type} value={type} className="bg-[#111111] text-white">{type}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="event-host-id" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Host ID (Poppo ID)</label>
                    <input 
                      id="event-host-id"
                      name="hostId" 
                      required={auth.role !== 'Talent'} 
                      disabled={auth.role === 'Talent'}
                      defaultValue={auth.role === 'Talent' ? auth.poppo_id : ''}
                      className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#FFB800] outline-none text-white" 
                      placeholder="e.g. 19157913" 
                      title="Host ID"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="event-ev-host-id" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Event Host ID (Info Only)</label>
                    <input 
                      id="event-ev-host-id"
                      name="eventHostId" 
                      className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#FFB800] outline-none text-white placeholder-white/20" 
                      placeholder="e.g. 1234567" 
                      title="Event Host ID"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="event-date" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Event Date</label>
                    <input id="event-date" name="date" type="date" required className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#FFB800] outline-none text-white" title="Event Date" placeholder="Event Date" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="event-time" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Time Block</label>
                    <input id="event-time" name="time" placeholder="14:00 - 16:00" required className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#FFB800] outline-none text-white font-bold" title="Event Time" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="event-location" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Location Details</label>
                    <input id="event-location" name="location" placeholder="e.g. CHANNEL ROOM 109" required className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#FFB800] outline-none text-white font-bold" title="Location Details" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="event-visibility" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Visibility</label>
                    <select id="event-visibility" name="visibility" title="Event visibility level" className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#FFB800] outline-none text-white font-bold cursor-pointer">
                       <option value="All">Everyone (Public)</option>
                       <option value="Leadership">Leadership Only</option>
                       <option value="Director">Director Only</option>
                     </select>
                  </div>
                </div>

                {/* Niners Participants selector */}
                <div className="space-y-1.5">
                  <label htmlFor="event-participants-add" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">
                    Niners Participants ({selectedParticipants.length} / 9)
                  </label>
                  <select
                    id="event-participants-add"
                    value=""
                    title="Add Niners Participants"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && selectedParticipants.length < 9 && !selectedParticipants.includes(val)) {
                        setSelectedParticipants([...selectedParticipants, val]);
                      }
                    }}
                    disabled={selectedParticipants.length >= 9}
                    className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#FFB800] outline-none text-white font-bold cursor-pointer disabled:opacity-40"
                  >
                    <option value="">-- Add Participant Host --</option>
                    {(hosts || []).map(h => (
                      <option key={h.id} value={h.id} className="bg-[#111111] text-white">
                        {h.nickname || h.name} (#{h.id})
                      </option>
                    ))}
                  </select>
                  
                  {/* Stacking visual blocks display below */}
                  {selectedParticipants.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedParticipants.map(poppoId => {
                        const pHost = (hosts || []).find(h => h.id === poppoId);
                        const dispName = pHost ? `${pHost.nickname || pHost.name} (#${poppoId})` : `#${poppoId}`;
                        return (
                          <span key={poppoId} className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-[10px] font-black text-white flex items-center gap-1.5 shadow-sm">
                            <span>{dispName}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedParticipants(selectedParticipants.filter(id => id !== poppoId))}
                              className="text-slate-400 hover:text-red-400 font-extrabold text-[10px] transition-colors shrink-0"
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="event-description" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Description / Notes</label>
                  <textarea id="event-description" name="description" title="Description and notes" className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl p-4 text-sm focus:border-[#FFB800] outline-none text-white h-24 resize-none placeholder-white/20" placeholder="Details about the event requirements..." />
                </div>

                <div className="pt-2 flex gap-4">
                   <button type="button" onClick={() => setIsAdding(false)} className="flex-1 px-6 py-4 rounded-xl bg-slate-900 border border-slate-800 text-white/40 font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">Cancel</button>
                   <button type="submit" className="flex-[2] bg-slate-900 border border-[#FFB800] hover:bg-[#FFB800]/5 text-[#FFB800] hover:text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all cursor-pointer">Authorize & Create</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Request Livehouse Timeslot Modal */}
      <AnimatePresence>
        {isRequestingTimeslot && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsRequestingTimeslot(false)} className="absolute inset-0 bg-[#0A0B0E]/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#111111] border border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="p-6 border-b border-slate-800 font-black text-white uppercase tracking-widest text-[10px]">Request Livehouse Timeslot</div>
              <form onSubmit={handleRequestTimeslot} className="p-6 space-y-5">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="req-theme" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Performance Theme / Title</label>
                    <input id="req-theme" name="title" required className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#FFB800] outline-none text-white placeholder-white/20" placeholder="e.g. Summer Acoustic Vibes" title="Performance Theme" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="req-livehouse-type" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Livehouse Type</label>
                    <select id="req-livehouse-type" name="livehouseType" title="Livehouse Type" className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#FFB800] outline-none text-white font-bold cursor-pointer">
                      <option value="Solo Livehouse" className="bg-[#111111] text-white">Solo Livehouse</option>
                      <option value="Party Livehouse" className="bg-[#111111] text-white">Party Livehouse</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="req-host-id" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Host ID (Poppo ID)</label>
                    <input 
                      id="req-host-id"
                      name="hostId" 
                      required={auth.role !== 'Talent'} 
                      disabled={auth.role === 'Talent'}
                      defaultValue={auth.role === 'Talent' ? auth.poppo_id : ''}
                      className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#FFB800] outline-none text-white" 
                      placeholder="Enter Poppo ID..." 
                      title="Target Poppo ID"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="req-ev-host-id" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Event Host ID (Info Only)</label>
                    <input 
                      id="req-ev-host-id"
                      name="eventHostId" 
                      className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#FFB800] outline-none text-white placeholder-white/20" 
                      placeholder="e.g. 1234567" 
                      title="Event Host ID"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="req-date" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Requested Date</label>
                    <input id="req-date" name="date" type="date" required className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#FFB800] outline-none text-white" title="Requested Date" placeholder="Requested Date" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="req-time" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Requested Timeslot Block</label>
                    <select id="req-time" name="time" title="Requested Timeslot Block" className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#FFB800] outline-none text-white font-bold cursor-pointer">
                      <option value="14:00 - 16:00" className="bg-[#111111] text-white">14:00 - 16:00</option>
                      <option value="16:00 - 18:00" className="bg-[#111111] text-white">16:00 - 18:00</option>
                      <option value="18:00 - 20:00" className="bg-[#111111] text-white">18:00 - 20:00</option>
                      <option value="20:00 - 22:00" className="bg-[#111111] text-white">20:00 - 22:00</option>
                      <option value="22:00 - 00:00" className="bg-[#111111] text-white">22:00 - 00:00</option>
                    </select>
                  </div>
                </div>

                {/* Niners Participants selector */}
                <div className="space-y-1.5">
                  <label htmlFor="req-participants-add" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">
                    Niners Participants ({selectedParticipants.length} / 9)
                  </label>
                  <select
                    id="req-participants-add"
                    value=""
                    title="Add Niners Participants"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && selectedParticipants.length < 9 && !selectedParticipants.includes(val)) {
                        setSelectedParticipants([...selectedParticipants, val]);
                      }
                    }}
                    disabled={selectedParticipants.length >= 9}
                    className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#FFB800] outline-none text-white font-bold cursor-pointer disabled:opacity-40"
                  >
                    <option value="">-- Add Participant Host --</option>
                    {(hosts || []).map(h => (
                      <option key={h.id} value={h.id} className="bg-[#111111] text-white">
                        {h.nickname || h.name} (#{h.id})
                      </option>
                    ))}
                  </select>
                  
                  {/* Stacking visual blocks display below */}
                  {selectedParticipants.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedParticipants.map(poppoId => {
                        const pHost = (hosts || []).find(h => h.id === poppoId);
                        const dispName = pHost ? `${pHost.nickname || pHost.name} (#${poppoId})` : `#${poppoId}`;
                        return (
                          <span key={poppoId} className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-[10px] font-black text-white flex items-center gap-1.5 shadow-sm">
                            <span>{dispName}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedParticipants(selectedParticipants.filter(id => id !== poppoId))}
                              className="text-slate-400 hover:text-red-400 font-extrabold text-[10px] transition-colors shrink-0"
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="req-notes" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Special Notes / Equipment Requests</label>
                  <textarea id="req-notes" name="notes" title="Special Notes / Equipment Requests" className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl p-4 text-sm focus:border-[#FFB800] outline-none text-white h-24 resize-none placeholder-white/20" placeholder="e.g. Need high fidelity mic presets..." />
                </div>

                <div className="pt-2 flex gap-4">
                   <button type="button" onClick={() => setIsRequestingTimeslot(false)} className="flex-1 px-6 py-4 rounded-xl bg-slate-900 border border-slate-800 text-white/40 font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">Cancel</button>
                   <button type="submit" className="flex-[2] bg-slate-900 border border-[#FFB800] hover:bg-[#FFB800]/5 text-[#FFB800] hover:text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all cursor-pointer">Submit Timeslot Request</button>
                </div>
              </form>
=======
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#0F1117] border border-[#D4AF37]/20 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
=======
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdding(false)} className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card w-full max-w-lg rounded-3xl overflow-hidden z-10 max-h-[90vh] overflow-y-auto custom-scrollbar p-0">
>>>>>>> 2b42d3ae84c3e300e1faeb35e7009a759158d1e9
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
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reserve Livehouse Timeslot Modal */}
<<<<<<< HEAD
      <AnimatePresence>
        {isReservingLivehouse && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReservingLivehouse(false)} className="absolute inset-0 bg-[#0A0B0E]/80 backdrop-blur-sm" />
<<<<<<< HEAD
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#111111] border border-slate-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="p-6 border-b border-slate-800 font-black text-white uppercase tracking-widest text-[10px]">Reserve Livehouse Timeslot</div>
=======
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#0F1117] border border-[#D4AF37]/20 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="p-6 border-b border-[#D4AF37]/20 font-black text-white uppercase tracking-widest text-[10px]">SCHEDULE LIVEHOUSE</div>
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
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
<<<<<<< HEAD
                      className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#FFB800] outline-none text-white font-bold cursor-pointer"
                    >
                      <option value="Solo Livehouse" className="bg-[#111111]">Solo Livehouse</option>
                      <option value="Party Livehouse" className="bg-[#111111]">Party Livehouse</option>
=======
                      className="w-full bg-[#0A0B0E] border border-[#D4AF37]/15 rounded-xl px-4 py-3 text-sm focus:border-[#D4AF37] outline-none text-white font-bold cursor-pointer"
                    >
                      <option value="SOLO LIVEHOUSE" className="bg-[#0f1117]">SOLO LIVEHOUSE</option>
                      <option value="PARTY LIVEHOUSE" className="bg-[#0f1117]">PARTY LIVEHOUSE</option>
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
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
<<<<<<< HEAD
                      className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#FFB800] outline-none text-white font-mono" 
                      title="Reserve Date" 
=======
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
                    />
                  </div>
                </div>

<<<<<<< HEAD
                <div className="space-y-1.5">
                  <label htmlFor="reserve-timeslot" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Timeslot (Select Available)</label>
                  <select 
                    id="reserve-timeslot" 
                    value={reserveTimeslot} 
                    onChange={(e) => setReserveTimeslot(e.target.value)} 
                    required 
                    title="Reserve Timeslot" 
                    className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-[#FFB800] outline-none text-white font-bold cursor-pointer font-mono"
                  >
                    <option value="" className="text-white/40 font-sans">-- Choose a timeslot --</option>
                    {getTimeslotAvailability(reserveDate).map(t => (
                      <option 
                        key={t.slot} 
                        value={t.slot} 
                        disabled={t.isTaken} 
                        className={cn("bg-[#111111]", t.isTaken ? "text-red-500/50" : "text-white")}
                      >
                        {t.label}
                      </option>
                    ))}
                  </select>
=======
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
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="reserve-notes" className="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-1">Description / Special Request Notes</label>
                  <textarea 
                    id="reserve-notes" 
                    value={reserveNotes} 
                    onChange={(e) => setReserveNotes(e.target.value)} 
                    title="Reservation Notes" 
<<<<<<< HEAD
                    className="w-full bg-[#0A0B0E] border border-slate-800 rounded-xl p-4 text-sm focus:border-[#FFB800] outline-none text-white h-24 resize-none placeholder-white/20" 
=======
                    className="w-full bg-[#0A0B0E] border border-[#D4AF37]/15 rounded-xl p-4 text-sm focus:border-[#D4AF37] outline-none text-white h-24 resize-none placeholder-white/20" 
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
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
=======
      <LivehouseBookingModal
        isOpen={isReservingLivehouse}
        onClose={() => setIsReservingLivehouse(false)}
        prefillDate={typeof reserveDate === 'string' ? reserveDate : format(reserveDate, 'yyyy-MM-dd')}
        prefillTimeslot={reserveTimeslot}
        auth={auth}
        hosts={allUsers}
        livehouseRequests={livehouseRequests}
        setLivehouseRequests={setLivehouseRequests}
      />
>>>>>>> 2b42d3ae84c3e300e1faeb35e7009a759158d1e9

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
                          title="Edit Event Type"
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
                          title="Edit Event Date"
                          placeholder="YYYY-MM-DD"
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
                          title="Participant Role Filter"
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
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setAttendanceModalOpen(false)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative w-full max-w-xl bg-gradient-to-b from-[#0e0a08]/95 to-[#050403]/95 border border-[#D4AF37]/20 rounded-3xl overflow-hidden z-10 max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(212,175,55,0.1)]"
            >
              <div className="p-5 border-b border-[#D4AF37]/10 flex items-center justify-between bg-black/40">
                <div className="flex flex-col">
                  <h4 className="text-[12px] uppercase tracking-widest text-[#D4AF37] font-black">{attendanceRecord ? 'Update' : 'Report'} Attendance</h4>
                  <span className="text-[10px] font-bold text-white/50">{attendanceModalEvent.title || 'Event'} • {attendanceModalEvent.time}</span>
                </div>
                <button type="button" title="Close" onClick={() => setAttendanceModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"><X size={16} /></button>
              </div>
              
              <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
                <form onSubmit={handleSubmitAttendance} className="space-y-6">
                  {attErrors.length > 0 && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-medium">
                      {attErrors.map((err, i) => <div key={i}>• {err}</div>)}
                    </div>
                  )}
                  {attSuccessMsg && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs font-medium flex items-center gap-2">
                      <CheckCircle2 size={16} /> {attSuccessMsg}
                    </div>
                  )}

                  {/* Member search and filter grid */}
                  <div className="space-y-3">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-white/40">
                      Add Attendees
                    </span>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={attSearch}
                        onChange={(e) => setAttSearch(e.target.value)}
                        placeholder="Search nickname or poppoId..."
                        className="flex-1 bg-black/50 border border-white/10 focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 rounded-xl text-sm px-4 py-3 text-white placeholder-white/20 outline-none transition-all"
                      />
                      <select
                        title="Attendance Role Filter"
                        value={attRoleFilter}
                        onChange={(e) => setAttRoleFilter(e.target.value)}
                        className="bg-black/50 border border-white/10 focus:border-[#D4AF37]/50 rounded-xl text-sm px-4 py-3 text-white outline-none transition-all cursor-pointer appearance-none min-w-[120px]"
                      >
                        <option value="All Roles">All Roles</option>
                        <option value="hosts">Hosts</option>
                        <option value="managers">Managers</option>
                        <option value="agents">Agents</option>
                        <option value="admins">Admins</option>
                      </select>
                    </div>

                    {/* Member list grid scrollable */}
                    <div className="bg-[#0A0B0E]/60 border border-white/5 rounded-2xl max-h-[180px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                      {attFilteredUsers.length === 0 ? (
                         <div className="p-4 text-center text-xs text-white/30 italic">No users found</div>
                      ) : (
                        attFilteredUsers.slice(0, 15).map((u: any) => {
                          const poppoId = String(u.poppo_id || u.poppoId || u.id);
                          const isSelected = attAttendees.some(a => String(a.poppo_id || a.id) === poppoId);
                          return (
                            <div key={u.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group">
                              <div className="flex items-center gap-3 min-w-0">
                                {u.photoUrl ? (
                                  <img src={u.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10" />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                                    <span className="text-[10px] font-bold text-purple-300">{(u.nickname || u.name || '?')[0].toUpperCase()}</span>
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-white truncate">{u.nickname || u.name}</p>
                                  <p className="text-[10px] text-white/40 font-mono">ID: {poppoId} | <span className="uppercase">{u.role}</span></p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setAttAttendees(attAttendees.filter(a => String(a.poppo_id || a.id) !== poppoId));
                                  } else {
                                    setAttAttendees([...attAttendees, u]);
                                  }
                                }}
                                className={cn(
                                  "w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border",
                                  isSelected 
                                    ? "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30" 
                                    : "bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 group-hover:bg-[#D4AF37]/20"
                                )}
                              >
                                {isSelected ? <X size={14} /> : <Plus size={14} />}
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Selected Participants Block */}
                    {attAttendees.length > 0 && (
                      <div className="mt-4 bg-[#0A0B0E] border border-white/5 rounded-2xl p-4">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-[#D4AF37] mb-3 flex items-center justify-between">
                          <span>Selected ({attAttendees.length})</span>
                          <button type="button" onClick={() => setAttAttendees([])} className="text-white/30 hover:text-red-400 normal-case tracking-normal text-[10px] transition-colors">Clear All</button>
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {attAttendees.map(a => {
                            const pId = a.poppo_id || a.id || a.poppoId;
                            const u = allUsers.find(user => (user.poppo_id || user.poppoId || user.id) === pId) || a;
                            const dispName = u.nickname || u.name || `User #${pId}`;
                            const pPhoto = u.photoUrl || u.profilePhotoUrl || u.photoURL;
                            const avatar = pPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(dispName)}&background=0a0806&color=D4AF37`;
                            
                            return (
                              <div key={pId} className="flex items-center justify-between bg-gradient-to-r from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/20 rounded-xl p-2 group">
                                <div className="flex items-center gap-3 min-w-0">
                                  <img src={avatar} alt={dispName} className="w-8 h-8 rounded-full border border-[#D4AF37]/30 object-cover shrink-0" />
                                  <span className="text-xs font-bold text-[#D4AF37] truncate">{dispName}</span>
                                </div>
                                 <button
                                  type="button"
                                  title="Remove Attendee"
                                  onClick={() => setAttAttendees(attAttendees.filter(user => String(user.poppo_id || user.id || user.poppoId) !== String(pId)))}
                                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-black/50 text-white/40 hover:text-red-400 hover:bg-red-500/10 font-bold transition-all shrink-0 cursor-pointer opacity-0 group-hover:opacity-100"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-white/40">Event Feedback / Notes</label>
                    <textarea
                      value={attFeedback}
                      onChange={(e) => setAttFeedback(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/50 outline-none min-h-[100px] transition-all"
                      placeholder="Add notes about event completion, issues, or details..."
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setAttendanceModalOpen(false)}
                      className="px-6 py-3 mr-3 rounded-xl text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAttProcessing || attAttendees.length === 0}
                      className="px-8 py-3 bg-gradient-to-r from-[#D4AF37] to-[#b8960c] hover:brightness-110 text-black text-xs uppercase tracking-widest font-black rounded-xl transition-all shadow-[0_0_15px_rgba(212,175,55,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAttProcessing 
                        ? <><Loader2 size={16} className="animate-spin" /> Processing</> 
                        : (attendanceRecord ? 'Update Attendance' : 'Submit Attendance')}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, MapPin, Info, User, X, Globe, Edit2, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { CalendarEvent, EventType, Host, LivehouseRequest } from '../types';
import { Storage } from '../lib/storage';
import { FirebaseService, generateSubmissionId } from '../lib/firebaseService';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { SingleDatePicker } from './InteractiveDatePicker';
import { AddEventForm } from './AddEventForm';
import { EVENT_COLORS, TIMESLOTS, TIMEZONES } from '../lib/constants';
import { collection, getDocs, getDoc, doc, setDoc, Timestamp, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LivehouseCalendar } from './LivehouseCalendar';
import { LivehouseBookingModal } from './LivehouseBookingModal';
import { CalendarHeaderGroup } from './CalendarHeaderGroup';
import { DailyScheduleGroup } from './DailyScheduleGroup';
import { useCalendarEngine } from '../hooks/useCalendarEngine';
import { formatLocalTime, getLocalTimezoneAbbreviation, parseTimeStringToHourMin } from '../lib/timezoneUtils';


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

export function formatTimezoneLabel(tz: string): string {
  try {
    const now = new Date();
    const longParts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'long' }).formatToParts(now);
    const shortParts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(now);
    const offsetParts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(now);

    const abbr = shortParts.find(p => p.type === 'timeZoneName')?.value || '';
    const fullName = longParts.find(p => p.type === 'timeZoneName')?.value || '';
    const offset = offsetParts.find(p => p.type === 'timeZoneName')?.value || '';

    if (abbr && fullName) {
      return `${abbr} (${fullName}): ${offset}`;
    }
    return tz;
  } catch {
    return tz;
  }
}

export const getTargetDisplayDate = (event: CalendarEvent, mode: string): string => {
  const rawDate = event.date || event.event_date || '';
  if (!rawDate) return '';
  if (mode === 'Asia/Manila') return rawDate;

  const timeStr = event.time || event.description || '';
  const firstTimePart = timeStr === '00:00' ? '00:00' : timeStr.split('-')[0].trim();
  const parsedTime = parseTimeStringToHourMin(firstTimePart);

  if (!parsedTime) return rawDate;

  const isoString = `${rawDate}T${parsedTime.h.toString().padStart(2, '0')}:${parsedTime.m.toString().padStart(2, '0')}:00+08:00`;
  const dateObj = new Date(isoString);

  if (isNaN(dateObj.getTime())) return rawDate;

  try {
    return dateObj.toLocaleDateString('en-CA', { timeZone: mode });
  } catch {
    return format(dateObj, 'yyyy-MM-dd');
  }
};



interface CalendarTabProps {
  isReadOnly?: boolean;
  hosts?: Host[];
}

export const CalendarTab: React.FC<CalendarTabProps> = ({ isReadOnly = false, hosts = [] }) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      return Storage.getEvents();
    } catch (err) {
      console.error('[CalendarTab] Failed to load events from storage:', err);
      return [];
    }
  });

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const userTz = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; }
  }, []);
  const [timeDisplayMode, setTimeDisplayMode] = useState<string>('Asia/Manila');

  const otherTzLabel = useMemo(() => {
    const other = timeDisplayMode === 'Asia/Manila' ? userTz : 'Asia/Manila';
    return formatTimezoneLabel(other);
  }, [timeDisplayMode, userTz]);

  // Modals States
  const [isAdding, setIsAdding] = useState(false);

  // Multi-select Participants State
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  const auth = useMemo(() => Storage.getAuthState(), []);

  // Livehouse Reservations States
  const [livehouseRequests, setLivehouseRequests] = useState<LivehouseRequest[]>(() => {
    try {
      return Storage.getLivehouseRequests();
    } catch (err) {
      console.error('[CalendarTab] Failed to load livehouse requests from storage:', err);
      return [];
    }
  });
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

  // Dual-Tab State
  const [activeTab, setActiveTab] = useState<'AGENCY' | 'LIVEHOUSE'>('AGENCY');

  // Spotlight State
  const [spotlightEvent, setSpotlightEvent] = useState<CalendarEvent | null>(null);

  // Expandable Modal States
  const [isAttendanceExpanded, setIsAttendanceExpanded] = useState(false);
  const [isEditExpanded, setIsEditExpanded] = useState(false);
  const [editEventDesc, setEditEventDesc] = useState('');
  const [editEventParticipants, setEditEventParticipants] = useState<string[]>([]);

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

  // Attendance Modal States
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

  // Attendance Reporting States
  const [attendanceRecord, setAttendanceRecord] = useState<any>(null);

  const handleSpotlightClick = async (event: CalendarEvent) => {
    setSpotlightEvent(event);
    setSelectedEventId(event.event_id || null);
    setIsAttendanceExpanded(false);
    setIsEditExpanded(false);
    setAttendanceRecord(null);
    setAttAttendees([]);
    setAttFeedback('');
    setAttErrors([]);
    setAttSuccessMsg('');
    setAttSearch('');
    setAttRoleFilter('All Roles');

    try {
      let data = null;

      // 0. Try local cache first (attendanceRecords loaded on mount)
      if (event.event_id) {
        const localMatch = attendanceRecords.find(r => r.event_id === event.event_id || r.eventId === event.event_id);
        if (localMatch) {
          data = { ...localMatch };
        }
      }

      // 1. Try direct doc lookup by event_id as document ID
      if (!data && event.event_id) {
        try {
          const docRef = doc(db, 'attendance', event.event_id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            data = { ...docSnap.data(), id: docSnap.id };
          }
        } catch (e) { /* permission denied or not found */ }
      }

      // 2. Fallback: query by event_id or eventId field
      if (!data && event.event_id) {
        try {
          const q = query(collection(db, 'attendance'), where('event_id', '==', event.event_id));
          const qs = await getDocs(q);
          if (!qs.empty) {
            data = { ...qs.docs[0].data(), id: qs.docs[0].id };
          }
        } catch (e) { /* permission denied or not found */ }
      }

      // 2b. Fallback: query by eventId (camelCase)
      if (!data && event.event_id) {
        try {
          const q2 = query(collection(db, 'attendance'), where('eventId', '==', event.event_id));
          const qs2 = await getDocs(q2);
          if (!qs2.empty) {
            data = { ...qs2.docs[0].data(), id: qs2.docs[0].id };
          }
        } catch (e) { /* permission denied or not found */ }
      }

      if (data) {
        setAttendanceRecord(data);

        // Map any available schema to the attAttendees format
        // attendees can be: string[] of poppo_ids OR { poppoId, nickname, role }[] 
        let rawAttendees = data.attendees || [];
        if (rawAttendees.length === 0) {
          const ids = data.attendeeIds || data.actualParticipants || [];
          rawAttendees = ids.map((pid: string) => ({ poppoId: pid }));
        }

        if (rawAttendees.length > 0) {
          const initialParticipants = rawAttendees.map((att: any) => {
            // Handle both plain strings and objects
            const pid = typeof att === 'string' ? att : (att.poppoId || att.poppo_id || att.id || '');
            const u = allUsers.find(user => String(user.poppo_id || user.poppoId || user.id) === String(pid));
            return {
              id: pid,
              poppo_id: pid,
              nickname: u ? (u.nickname || u.name) : (typeof att === 'object' ? (att.nickname || att.name || pid) : pid),
              role: u ? u.role : (typeof att === 'object' ? (att.role || '') : ''),
              photoUrl: u ? (u.photoUrl || u.profilePhotoUrl || u.photoURL) : null,
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

      // 0. Try local cache first (attendanceRecords loaded on mount)
      if (event.event_id) {
        const localMatch = attendanceRecords.find(r => r.event_id === event.event_id || r.eventId === event.event_id);
        if (localMatch) {
          data = { ...localMatch };
        }
      }

      // 1. Try direct doc lookup by event_id as document ID
      if (!data && event.event_id) {
        try {
          const docRef = doc(db, 'attendance', event.event_id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            data = { ...docSnap.data(), id: docSnap.id };
          }
        } catch (e) { /* permission denied or not found */ }
      }

      // 2. Fallback: query by event_id or eventId field
      if (!data && event.event_id) {
        try {
          const q = query(collection(db, 'attendance'), where('event_id', '==', event.event_id));
          const qs = await getDocs(q);
          if (!qs.empty) {
            data = { ...qs.docs[0].data(), id: qs.docs[0].id };
          }
        } catch (e) { /* permission denied or not found */ }
      }

      // 2b. Fallback: query by eventId (camelCase)
      if (!data && event.event_id) {
        try {
          const q2 = query(collection(db, 'attendance'), where('eventId', '==', event.event_id));
          const qs2 = await getDocs(q2);
          if (!qs2.empty) {
            data = { ...qs2.docs[0].data(), id: qs2.docs[0].id };
          }
        } catch (e) { /* permission denied or not found */ }
      }

      if (data) {

        // Map any available schema to the attAttendees format
        let rawAttendees = data.attendees || [];
        if (rawAttendees.length === 0) {
          const ids = data.attendeeIds || data.actualParticipants || [];
          rawAttendees = ids.map((pid: string) => ({ poppoId: pid }));
        }

        if (rawAttendees.length > 0) {
          const initialParticipants = rawAttendees.map((att: any) => {
            // Handle both plain strings and objects
            const pid = typeof att === 'string' ? att : (att.poppoId || att.poppo_id || att.id || '');
            const u = allUsers.find(user => String(user.poppo_id || user.poppoId || user.id) === String(pid));
            return {
              id: pid,
              poppo_id: pid,
              nickname: u ? (u.nickname || u.name) : (typeof att === 'object' ? (att.nickname || att.name || pid) : pid),
              role: u ? u.role : (typeof att === 'object' ? (att.role || '') : ''),
              photoUrl: u ? (u.photoUrl || u.profilePhotoUrl || u.photoURL) : null,
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
      const existing = attendanceRecords.find(r => r.event_id === attendanceModalEvent.event_id || r.eventId === attendanceModalEvent.event_id);
      const attendanceId = existing?.attendanceId || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));
      const docId = existing?.attendanceId ? existing.attendanceId : generateSubmissionId(currentAuth?.poppo_id || '', currentAuth?.role || '', currentAuth?.name || currentAuth?.nickname || '');

      const payload = {
        attendanceId: docId,
        event_id: attendanceModalEvent.event_id,
        eventId: attendanceModalEvent.event_id,
        eventTitle: attendanceModalEvent.title || 'Unknown Event',
        eventDate: attendanceModalEvent.date,
        timeslot: attendanceModalEvent.time,
        eventType: attendanceModalEvent.type || 'Event',
        description: attendanceModalEvent.description || '',
        participant_ids: attendanceModalEvent.participant_ids || [],
        status: 'Approved',
        attendeeIds: attAttendees.map(p => p.poppoId || p.poppo_id || p.id), // For backward compatibility
        attendees: attAttendees.map(a => ({
          poppoId: a.poppo_id || a.id,
          nickname: a.nickname || a.name || 'Unknown',
          role: a.role || 'Unknown'
        })),
        adminFeedback: attFeedback, // For backward compatibility
        eventFeedback: attFeedback,
        createdBy: spotlightEvent?.created_by_name || currentAuth?.name || 'Admin',
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
      const targetDocId = existing ? (existing.id || existing.event_id || existing.eventId || docId) : (attendanceModalEvent.event_id || docId);
      await setDoc(doc(db, 'attendance', targetDocId), payload, { merge: true });

      // Update local state and trigger UI changes
      setAttendanceRecord({ ...payload, id: targetDocId });
      setAttSuccessMsg('Attendance saved successfully!');

      // Update the attendanceRecords array locally so it reflects immediately
      setAttendanceRecords(prev => {
        const idx = prev.findIndex(r => r.event_id === attendanceModalEvent.event_id || r.eventId === attendanceModalEvent.event_id);
        if (idx >= 0) {
          const newArr = [...prev];
          newArr[idx] = { ...payload, id: targetDocId };
          return newArr;
        }
        return [...prev, { ...payload, id: targetDocId }];
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

  // Set initialization complete on mount
  useEffect(() => {
    setIsInitializing(false);
  }, []);

  // Load events & livehouse requests from Firestore on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const firestoreEvents = await FirebaseService.getCalendarEvents();
        // Deduplicate by (date+from_time+to_time+host) composite key to catch duplicates
        const seen = new Set<string>();
        const deduped = (firestoreEvents || []).filter(e => {
          const key = `${e.date || e.event_date || ''}_${e.from_time || ''}_${e.to_time || ''}_${e.event_host_id || e.poppo_id || ''}_${e.event_host_name || ''}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        if (deduped.length > 0) {
          Storage.setEvents(deduped);
          setEvents(deduped);
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

  const engine = useCalendarEngine({
    events,
    livehouseSchedule: [],
    loggedInPoppoId: auth?.poppo_id || ''
  });

  const currentDate = useMemo(() => {
    const first = engine.days.find(Boolean);
    if (!first || !first.date) return new Date();
    return new Date(first.date + 'T00:00:00');
  }, [engine.days]);

  const handlePrevMonth = () => engine.goPrevMonth();
  const handleNextMonth = () => engine.goNextMonth();

  const handleDateClick = (day: Date) => {
    setSelectedDate(day);
    engine.setSelectedDate(format(day, 'yyyy-MM-dd'));
    setSelectedEventId(null);
  };
  // Livehouse Reservation availability checker
  // Prefers live data from the Google Apps Script matrix; falls back to local counts.
  const getTimeslotAvailability = (targetDate: string) => {
    // Find approved calendar events for targetDate of type Solo/Party Livehouse
    const dayEvents = events.filter(event => {
      const evDate = event.date || event.event_date;
      if (evDate !== targetDate) return false;
      const evType = event.type || event.type_of_event || '';
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
    const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    const newEvent: CalendarEvent = {
      id: newId,
      event_id: newId,
      event_type: req.livehouseType || 'Solo Livehouse',
      event_title: `Livehouse: ${req.name}`,
      event_description: req.notes || 'Livehouse timeslot approved.',
      event_date: req.date,
      from_time: req.timeslot?.split(' - ')?.[0] || req.timeslot || '',
      to_time: req.timeslot?.split(' - ')?.[1] || '',
      event_host_id: req.poppoId,
      event_host_name: req.name || '',
      is_external_host: false,
      participant_ids: [req.poppoId],
      participant_nicknames: [req.name || req.poppoId],
      created_by_id: auth.poppo_id || auth.id || 'Unknown',
      created_by_name: auth.nickname || auth.name || 'Admin',
      created_by_role: auth.role || 'Admin',
      timestamp: new Date().toISOString(),
      notified30min: false,
      notifiedStart: false,
      // Backward-compat aliases
      poppo_id: req.poppoId,
      title: `Livehouse: ${req.name}`,
      description: req.notes || 'Livehouse timeslot approved.',
      date: req.date,
      time: req.timeslot,
      type: (req.livehouseType || 'SOLO LIVEHOUSE') as EventType,
      type_of_event: req.livehouseType || 'SOLO LIVEHOUSE',
      location: 'VIRTUAL ROOM (LIVEHOUSE)',
      visibility: 'All',
      participants: [req.poppoId],
      participantIds: [req.poppoId],
      participants_id: [req.poppoId],
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
    const formTitle = formData.get('title') as string || '';
    const formDate = formData.get('date') as string || '';
    const formTime = formData.get('time') as string || '';
    const formType = formData.get('type') as string || 'Agency Event';
    const formHostId = formData.get('eventHostId') as string || '';
    const hostId = isTalent ? auth.poppo_id : (formHostId || 'Agency');
    const timeParts = formTime.split(' - ');
    const newEvent: CalendarEvent = {
      id: newId,
      event_id: newId,
      event_type: formType,
      event_title: formTitle,
      event_description: formData.get('description') as string || '',
      event_date: formDate,
      from_time: timeParts[0] || formTime,
      to_time: timeParts[1] || '',
      event_host_id: hostId,
      event_host_name: '',
      is_external_host: false,
      participant_ids: [...selectedParticipants],
      participant_nicknames: [],
      created_by_id: auth.poppo_id || auth.id || 'Unknown',
      created_by_name: auth.name,
      created_by_role: auth.role,
      timestamp: new Date().toISOString(),
      notified30min: false,
      notifiedStart: false,
      // Backward-compat aliases
      poppo_id: hostId,
      title: formTitle,
      description: formData.get('description') as string || '',
      date: formDate,
      time: formTime,
      type: formType,
      type_of_event: formType,
      location: formData.get('location') as string || 'ONLINE',
      visibility: formData.get('visibility') as any || 'All',
      participants: [...selectedParticipants],
      participantIds: [...selectedParticipants],
      participants_id: [...selectedParticipants],
    };

    const updated = [...events, newEvent];
    Storage.setEvents(updated);
    setEvents(updated);
    Storage.addLog('Calendar', `Created event: ${newEvent.title}`, auth.name);
    FirebaseService.saveCalendarEvents(updated).then(async () => {
      await FirebaseService.logSystemActivity(`Created calendar event entry: "${newEvent.title}" on ${newEvent.date} at ${newEvent.time} (Type: ${newEvent.type}, Location: ${newEvent.location}, Participants: ${(newEvent.participant_ids || []).join(', ')})`, 'Info');
    }).catch(err => {
      console.error("Failed to save calendar events to Firestore:", err);
    });
    setIsAdding(false);
    setSelectedEventId(newEvent.event_id);
    setSelectedDate(new Date(newEvent.date + 'T00:00:00'));
  };

  const selectedEvent = events.find(e => e.event_id === selectedEventId);

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

  // Load attendance records from server API on mount (client SDK lacks permission for attendance collection)
  useEffect(() => {
    const loadAttendance = async () => {
      try {
        const currentAuth = Storage.getAuthState();
        const token = currentAuth?.token || '';
        const res = await fetch('/api/attendance', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          console.warn("Attendance API returned", res.status);
          return;
        }
        const rawData = await res.json();
        const list = (Array.isArray(rawData) ? rawData : []).map((d: any) => ({
          ...d,
          id: d.id || '',
          eventId: d.event_id || d.eventId || '',
          event_id: d.event_id || d.eventId || ''
        }));
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
    const existing = attendanceRecords.find(r => r.event_id === event.event_id || r.eventId === event.event_id);
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

      const existing = attendanceRecords.find(r => r.event_id === eventId || r.eventId === eventId);
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
    setEditParticipants(selectedEvent.participant_ids || []);
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
            participant_ids: editParticipants
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
            participant_ids: editParticipants
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

  // Loading state to prevent blank page during initialization
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-theme={activeTab === 'LIVEHOUSE' ? 'livehouse' : 'agency'} className="space-y-6 calendar-container w-full md:max-w-3xl xl:max-w-5xl 2xl:max-w-6xl mx-auto px-2 sm:px-4">
      <style>{`
        body,
        .app-bg,
        main {
          background-color: rgba(0, 0, 0, 0.6) !important;
        }
      `}</style>

      <style>{`
        .calendar-container select,
        .calendar-container input,
        .calendar-container textarea {
          background-color: rgba(0, 0, 0, 0.6) !important;
          color: #f0efe8 !important;
        }
        .calendar-container select option {
          background-color: #000000 !important;
          color: #f0efe8 !important;
        }

        /* ===== AGENCY - GOLD THEME (default) ===== */
        .calendar-container select,
        .calendar-container input,
        .calendar-container textarea {
          border-color: rgba(212, 175, 55, 0.25) !important;
        }
        .calendar-container select:focus,
        .calendar-container input:focus,
        .calendar-container textarea:focus {
          border-color: rgba(212, 175, 55, 0.6) !important;
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.08) !important;
        }
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

        /* ===== LIVEHOUSE - CRIMSON THEME ===== */
        .calendar-container[data-theme="crimson"] select,
        .calendar-container[data-theme="crimson"] input,
        .calendar-container[data-theme="crimson"] textarea {
          border-color: rgba(178, 34, 34, 0.3) !important;
        }
        .calendar-container[data-theme="crimson"] select:focus,
        .calendar-container[data-theme="crimson"] input:focus,
        .calendar-container[data-theme="crimson"] textarea:focus {
          border-color: rgba(178, 34, 34, 0.6) !important;
          box-shadow: 0 0 0 3px rgba(178, 34, 34, 0.08) !important;
        }

        /* CalendarHeaderGroup - container */
        .calendar-container[data-theme="crimson"] [class*="border-\\[\\#D4AF37\\]"],
        .calendar-container[data-theme="crimson"] [class*="border-\\[#D4AF37\\]"] {
          border-color: rgba(178, 34, 34, var(--tw-border-opacity, 0.2)) !important;
        }
        .calendar-container[data-theme="crimson"] [class*="text-\\[\\#D4AF37\\]"],
        .calendar-container[data-theme="crimson"] [class*="text-\\[#D4AF37\\]"] {
          color: #B22222 !important;
        }
        .calendar-container[data-theme="crimson"] [class*="bg-\\[\\#D4AF37\\]"] {
          background-color: rgba(178, 34, 34, var(--tw-bg-opacity, 0.2)) !important;
        }
        .calendar-container[data-theme="crimson"] [class*="hover\\:text-\\[\\#D4AF37\\]"]:hover {
          color: #B22222 !important;
        }
        .calendar-container[data-theme="crimson"] [class*="hover\\:bg-\\[\\#D4AF37\\]"]:hover {
          background-color: rgba(178, 34, 34, 0.2) !important;
        }
        .calendar-container[data-theme="crimson"] [class*="from-\\[\\#FFF0B3\\]"],
        .calendar-container[data-theme="crimson"] [class*="from-\\[#FFF0B3\\]"] {
          --tw-gradient-from: #FF6B6B !important;
        }
        .calendar-container[data-theme="crimson"] [class*="to-\\[\\#D4AF37\\]"],
        .calendar-container[data-theme="crimson"] [class*="to-\\[#D4AF37\\]"],
        .calendar-container[data-theme="crimson"] [class*="to-\\[\\#b8960c\\]"] {
          --tw-gradient-to: #B22222 !important;
        }
        .calendar-container[data-theme="crimson"] [style*="background: linear-gradient(135deg, #d4af37, #b8960c)"] {
          background: linear-gradient(135deg, #B22222, #8B0000) !important;
          color: #fff !important;
        }
        .calendar-container[data-theme="crimson"] .shadow-\\[0_0_15px_rgba\\(212\\,175\\,55\\,0\\.2\\)\\] {
          box-shadow: 0 0 15px rgba(178, 34, 34, 0.2) !important;
        }
        .calendar-container[data-theme="crimson"] [class*="shadow-\\[0_0_15px_rgba\\(212"] {
          box-shadow: 0 0 15px rgba(178, 34, 34, 0.2) !important;
        }
        .calendar-container[data-theme="crimson"] .shadow-\\[0_0_30px_rgba\\(212\\,175\\,55\\,0\\.05\\)\\] {
          box-shadow: 0 0 30px rgba(178, 34, 34, 0.08) !important;
        }
        .calendar-container[data-theme="crimson"] .border-\\[\\#FFD700\\]\\/50,
        .calendar-container[data-theme="crimson"] [class*="border-\\[#FFD700\\]"] {
          border-color: rgba(220, 20, 60, 0.5) !important;
        }
        .calendar-container[data-theme="crimson"] .border-\\[\\#FF8C00\\]\\/50,
        .calendar-container[data-theme="crimson"] [class*="border-\\[#FF8C00\\]"] {
          border-color: rgba(255, 68, 68, 0.5) !important;
        }
        .calendar-container[data-theme="crimson"] .from-\\[\\#D4AF37\\]\\/15 {
          --tw-gradient-from: rgba(178, 34, 34, 0.15) !important;
        }
        .calendar-container[data-theme="crimson"] .to-\\[\\#FF8C00\\]\\/15 {
          --tw-gradient-to: rgba(255, 68, 68, 0.15) !important;
        }
        .calendar-container[data-theme="crimson"] .from-\\[\\#FF8C00\\]\\/15 {
          --tw-gradient-from: rgba(255, 68, 68, 0.15) !important;
        }
        .calendar-container[data-theme="crimson"] .to-\\[\\#FF4500\\]\\/15 {
          --tw-gradient-to: rgba(139, 0, 0, 0.15) !important;
        }
        .calendar-container[data-theme="crimson"] .from-\\[\\#FFF0B3\\] {
          --tw-gradient-from: #FF6B6B !important;
        }
        .calendar-container[data-theme="crimson"] .to-\\[\\#D4AF37\\] {
          --tw-gradient-to: #B22222 !important;
        }
        .calendar-container[data-theme="crimson"] .from-\\[\\#FFD700\\] {
          --tw-gradient-from: #DC143C !important;
        }
        .calendar-container[data-theme="crimson"] .to-\\[\\#FF8C00\\] {
          --tw-gradient-to: #FF4444 !important;
        }
        .calendar-container[data-theme="crimson"] .text-\\[\\#D4AF37\\]\\/60 {
          color: rgba(178, 34, 34, 0.6) !important;
        }
        .calendar-container[data-theme="crimson"] .text-\\[\\#D4AF37\\]\\/70 {
          color: rgba(178, 34, 34, 0.7) !important;
        }
        .calendar-container[data-theme="crimson"] .shadow-\\[0_0_20px_rgba\\(212\\,175\\,55\\,0\\.15\\),inset_0_0_15px_rgba\\(212\\,175\\,55\\,0\\.1\\)\\] {
          box-shadow: 0 0 20px rgba(178, 34, 34, 0.15), inset 0 0 15px rgba(178, 34, 34, 0.1) !important;
        }
        .calendar-container[data-theme="crimson"] .shadow-\\[0_0_20px_rgba\\(255\\,140\\,0\\,0\\.15\\),inset_0_0_15px_rgba\\(255\\,140\\,0\\,0\\.1\\)\\] {
          box-shadow: 0 0 20px rgba(255, 68, 68, 0.15), inset 0 0 15px rgba(255, 68, 68, 0.1) !important;
        }
        .calendar-container[data-theme="crimson"] .shadow-md {
          --tw-shadow-color: rgba(178, 34, 34, 0.2) !important;
        }
        .calendar-container[data-theme="crimson"] .shadow-\\[0_0_4px_rgba\\(212\\,175\\,55\\,0\\.6\\)\\] {
          box-shadow: 0 0 4px rgba(178, 34, 34, 0.6) !important;
        }
        /* Remove dark blue tones */
        .calendar-container .border-purple-500\\/10,
        .calendar-container .border-purple-500\\/20,
        .calendar-container .border-purple-500\\/30,
        .calendar-container .border-purple-500\\/50 {
          border-color: rgba(212, 175, 55, 0.15) !important;
        }
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
        .calendar-container[data-theme="crimson"] .text-purple-400,
        .calendar-container[data-theme="crimson"] .text-purple-300 {
          color: #B22222 !important;
        }
        .calendar-container[data-theme="crimson"] .border-purple-500\\/50,
        .calendar-container[data-theme="crimson"] .border-purple-500\\/10,
        .calendar-container[data-theme="crimson"] .border-purple-500\\/20,
        .calendar-container[data-theme="crimson"] .border-purple-500\\/30 {
          border-color: rgba(178, 34, 34, 0.2) !important;
        }
        .calendar-container[data-theme="crimson"] .bg-purple-500\\/20 {
          background-color: rgba(178, 34, 34, 0.1) !important;
          border-color: rgba(178, 34, 34, 0.2) !important;
        }
      `}</style>

      {/* Shared Calendar Header (both tabs) */}
      <CalendarHeaderGroup
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentDate={currentDate}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        selectedDate={selectedDate}
        onDateSelect={handleDateClick}
        events={events}
        engineDays={engine.days}
        onAddEvent={() => setIsAdding(true)}
        isReadOnly={isReadOnly}
        showAddButton={auth.level > 0}
        onTimezoneToggle={() => setTimeDisplayMode(prev => prev === 'Asia/Manila' ? userTz : 'Asia/Manila')}
        timezoneLabel={otherTzLabel}
      />

      {/* Conditional content based on tab */}
      {activeTab === 'AGENCY' ? (
        <DailyScheduleGroup
          selectedDate={selectedDate}
          events={events}
          onAddEvent={() => setIsAdding(true)}
          isReadOnly={isReadOnly}
          localTimezoneMode={timeDisplayMode !== 'Asia/Manila'}
          allUsers={allUsers}
          attendanceRecords={attendanceRecords}
          onEventClick={handleSpotlightClick}
          auth={auth}
        />
      ) : (
        <LivehouseCalendar
          allUsers={allUsers}
          events={events}
          selectedDateStr={engine.selectedDate}
          onOpenBookingModal={(date, timeslot) => {
            setReserveDate(date);
            setReserveTimeslot(timeslot);
            setIsReservingLivehouse(true);
          }}
          timeDisplayMode={timeDisplayMode}
          userTz={userTz}
        />
      )}

      {/* Create Event Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdding(false)} className="absolute inset-0 bg-[#0A0B0E]/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card w-full max-w-lg rounded-3xl overflow-hidden z-10 max-h-[90vh] overflow-y-auto custom-scrollbar p-0">
              <div className="p-6 border-b border-[#D4AF37]/20 font-black text-white uppercase tracking-widest text-[10px]">Schedule New Calendar Event</div>
              <div className="p-6">
                <AddEventForm
                  onSuccess={() => {
                    setIsAdding(false);
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
      <LivehouseBookingModal
        isOpen={isReservingLivehouse}
        onClose={() => setIsReservingLivehouse(false)}
        prefillDate={typeof reserveDate === 'string' ? reserveDate : format(reserveDate, 'yyyy-MM-dd')}
        prefillTimeslot={reserveTimeslot}
        auth={auth}
        allUsers={allUsers}
        livehouseRequests={livehouseRequests}
        setLivehouseRequests={setLivehouseRequests}
      />

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

              <div className="overflow-y-auto custom-scrollbar flex-1 relative z-10">
                {(() => {
                  const hostPoppoId = selectedEvent.poppo_id || selectedEvent.created_by_id;
                  const hostUser = allUsers.find(u => (u.poppo_id || u.poppoId || u.id) === hostPoppoId);
                  const hostName = hostUser ? (hostUser.nickname || hostUser.name) : (selectedEvent.created_by_name || 'Niner');
                  const hostPhoto = hostUser ? (hostUser.photoUrl || hostUser.profilePhotoUrl || hostUser.photoURL) : null;
                  const avatarUrl = hostPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(hostName)}&background=0a0806&color=D4AF37`;
                  const eventDateStr = selectedEvent.date || selectedEvent.event_date || '';
                  const eventTimeStr = selectedEvent.time || '00:00';
                  const eventDateObj = new Date(`${eventDateStr}T${eventTimeStr === '00:00' ? '00:00' : eventTimeStr.split(' - ')[0]}`);
                  const isUpcoming = eventDateObj > new Date();

                  const loggedInUserRole = String(auth?.role || '').toLowerCase();
                  const isStrictDirectorOrHeadAdmin = loggedInUserRole === 'director' || loggedInUserRole === 'head admin' || loggedInUserRole === 'head_admin';
                  const isDirectorOrHeadAdmin = isStrictDirectorOrHeadAdmin || loggedInUserRole === 'admin';
                  const isCreator = String(auth?.poppo_id || auth?.id) === String(selectedEvent.created_by_id || hostPoppoId);

                  let canEdit = isUpcoming && (isDirectorOrHeadAdmin || isCreator);
                  if (selectedEvent.is_automated) {
                    canEdit = isStrictDirectorOrHeadAdmin;
                  }

                  return (
                    <div className="p-5 sm:p-8 flex flex-col gap-6 relative">
                      {/* Submit/Update Attendance button (past events only) */}
                      {(!isUpcoming || eventDateObj <= new Date()) && isDirectorOrHeadAdmin && (
                        <div className="absolute top-4 right-4 z-20">
                          <button
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation();
                              handleOpenAttendanceModal(clickEvent, selectedEvent);
                            }}
                            className="px-3 py-1.5 bg-gradient-to-r from-[#FF8C00]/20 to-[#D4AF37]/20 hover:from-[#FF8C00]/30 hover:to-[#D4AF37]/30 border border-[#D4AF37]/50 text-[#FFD700] font-black text-[10px] uppercase tracking-wider rounded-lg transition-all shadow-[0_0_15px_rgba(255,140,0,0.2)] flex items-center gap-1.5"
                          >
                            <CheckCircle2 size={12} />
                            {attendanceRecord ? 'Update Attendance' : 'Submit Attendance'}
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
                        {/* Event Title */}
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-[#D4AF37]/10 rounded-xl text-[#D4AF37] border border-[#D4AF37]/20">
                            <CalendarIcon size={18} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]/60 font-black mb-1">Event Title</span>
                            <span className="text-sm font-black text-white/90 uppercase tracking-widest">{selectedEvent.event_title || selectedEvent.title || 'Untitled'}</span>
                          </div>
                        </div>

                        {/* Event Type */}
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-[#D4AF37]/10 rounded-xl text-[#D4AF37] border border-[#D4AF37]/20">
                            <CalendarIcon size={18} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]/60 font-black mb-1">Event Type</span>
                            <span className="text-sm font-black text-white/90 uppercase tracking-widest">{selectedEvent.event_type || selectedEvent.type || 'Event'}</span>
                          </div>
                        </div>

                        {/* Date & Time */}
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-gradient-to-br from-[#FF8C00]/10 to-[#FF4500]/10 rounded-xl text-[#FF8C00] border border-[#FF8C00]/20">
                            <Clock size={18} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-[#FF8C00]/60 font-black mb-1">Date & Time</span>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs font-black text-[#FF8C00] uppercase tracking-widest">{eventDateStr ? format(new Date(eventDateStr), 'MMMM dd, yyyy') : 'Date TBD'}</span>
                              <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FF8C00]">
                                {(() => {
                                  const displayTime = selectedEvent.from_time && selectedEvent.to_time
                                    ? `${selectedEvent.from_time} - ${selectedEvent.to_time}`
                                    : (selectedEvent.time || 'TBD');
                                  if (displayTime === 'TBD' || !displayTime) return displayTime;
                                  return formatLocalTime(displayTime, selectedEvent.date);
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        {selectedEvent.event_description || selectedEvent.description ? (
                          <div className="flex items-start gap-4">
                            <div className="p-2.5 bg-white/5 rounded-xl text-white/40 border border-white/10 mt-0.5">
                              <Info size={18} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black mb-1">Description</span>
                              <span className="text-xs font-medium text-white/70 leading-relaxed">{selectedEvent.event_description || selectedEvent.description}</span>
                            </div>
                          </div>
                        ) : null}

                        {/* Host */}
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 bg-[#D4AF37]/10 rounded-xl text-[#D4AF37] border border-[#D4AF37]/20">
                            <User size={18} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37]/60 font-black mb-1">Host</span>
                            <span className="text-sm font-black text-white/90">{selectedEvent.event_host_name || hostName}</span>
                            <span className="text-[10px] text-[#A09E9A] font-mono">ID: {selectedEvent.event_host_id || selectedEvent.poppo_id || ''}</span>
                          </div>
                        </div>
                      </div>

                      {/* Participants Section */}
                      {(() => {
                        const pIds = selectedEvent.participant_ids || [];
                        const pNicknames = selectedEvent.participant_nicknames || [];
                        if (pIds.length === 0) return null;
                        return (
                          <div className="mt-2">
                            <h5 className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest mb-3 border-b border-white/5 pb-2">
                              Participants ({pIds.length})
                            </h5>
                            <div className="grid gap-3 grid-cols-4 sm:grid-cols-6">
                              {pIds.map((pid: string, idx: number) => {
                                const nickFromArray = pNicknames[idx];
                                const pUser = allUsers.find(u => String(u.poppo_id || u.poppoId || u.id) === String(pid));
                                const pName = nickFromArray || (pUser ? (pUser.nickname || pUser.name) : pid);
                                const pPhoto = pUser ? (pUser.photoUrl || pUser.profilePhotoUrl || pUser.photoURL) : null;
                                const avatar = pPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(pName)}&background=0a0806&color=D4AF37`;
                                return (
                                  <div key={idx} className="flex flex-col items-center justify-start gap-1.5 p-1 transition-transform hover:scale-105">
                                    <img src={avatar} alt={pName} className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border border-[#D4AF37]/30 object-cover shadow-[0_0_10px_rgba(212,175,55,0.1)]" />
                                    <span className="text-[9px] sm:text-[10px] font-bold text-white/80 text-center leading-tight line-clamp-1 w-full" title={pName}>{pName}</span>
                                  </div>
                                )
                              })}
                            </div>
                        </div>
                      );
                    })()}

                      {/* Attendance Section */}
                      {(attendanceRecord || attAttendees.length > 0 || !isUpcoming) && (
                          <div className="mt-4">
                            <h5 className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest mb-3 border-b border-white/5 pb-2">Attendance</h5>
                            <div className="flex flex-col gap-2">
                              {(() => {
                                const displayAttendees = attAttendees.length > 0 ? attAttendees : [];
                                const noRawData = !attendanceRecord || (
                                  !attendanceRecord.attendees &&
                                  !attendanceRecord.attendeeIds &&
                                  !attendanceRecord.actualParticipants &&
                                  !attendanceRecord.participant_ids
                                );

                                if (displayAttendees.length > 0) {
                                  const isLarge = displayAttendees.length <= 4;
                                  return (
                                    <div className={`grid gap-3 ${isLarge ? 'grid-cols-4' : 'grid-cols-4 sm:grid-cols-6'}`}>
                                      {displayAttendees.map((att: any, idx: number) => {
                                        const pid = att.poppo_id || att.poppoId || att.id || '';
                                        const attendeeNickname = att.nickname || att.name || pid;
                                        const photoUrl = att.photoUrl || att.profilePhotoUrl || att.photoURL;
                                        const avatar = photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(attendeeNickname)}&background=0a0806&color=D4AF37`;

                                        return (
                                          <div key={idx} className="flex flex-col items-center justify-start gap-1.5 p-1 transition-transform hover:scale-105">
                                            <img src={avatar} alt={attendeeNickname} className={`${isLarge ? 'w-14 h-14 sm:w-16 sm:h-16' : 'w-10 h-10'} rounded-full border border-[#D4AF37]/30 object-cover shadow-[0_0_10px_rgba(212,175,55,0.1)]`} />
                                            <span className={`${isLarge ? 'text-[10px] sm:text-xs' : 'text-[9px]'} font-bold text-white/80 text-center leading-tight line-clamp-1 w-full`} title={attendeeNickname}>{attendeeNickname}</span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  );
                                } else if (!noRawData) {
                                  return <div className="text-[10px] text-yellow-400/60 italic p-3 bg-white/5 rounded-xl border border-white/5 text-center">Attendance records exist but user profiles not yet loaded. Please wait...</div>;
                                } else {
                                  return <div className="text-center text-[10px] text-white/30 italic p-4 bg-white/5 rounded-xl border border-white/5">No attendance records yet.</div>;
                                }
                              })()}
                            </div>
                          </div>
                        )}
                    </div>
                  );
                })()}
              </div>

              <div className="w-full flex justify-center mt-4 pt-3 border-t border-white/5">
                <span className="text-[8px] sm:text-[9px] font-mono text-white/20 uppercase tracking-widest">
                  Event ID: {selectedEvent.event_id}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Attendance Modal */}
      <AnimatePresence>
        {attendanceModalOpen && attendanceModalEvent && (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 sm:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAttendanceModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative glass-card w-full max-w-2xl rounded-3xl overflow-hidden z-10 max-h-[90vh] overflow-y-auto custom-scrollbar p-0">
              <div className="p-6 border-b border-[#D4AF37]/20 font-black text-white uppercase tracking-widest text-[10px]">Attendance Report</div>
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-[#D4AF37] uppercase tracking-widest mb-2">{attendanceModalEvent.title || 'Event'}</h3>
                  <p className="text-xs text-white/60">{format(new Date(attendanceModalEvent.date), 'MMMM dd, yyyy')} at {attendanceModalEvent.time}</p>
                </div>

                {attErrors.length > 0 && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs mb-4">
                    {attErrors.join(', ')}
                  </div>
                )}

                {attSuccessMsg && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs mb-4">
                    {attSuccessMsg}
                  </div>
                )}

                <form onSubmit={handleSubmitAttendance} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-2">Attendees</label>
                    <div className="space-y-2">
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={attSearch}
                          onChange={(e) => setAttSearch(e.target.value)}
                          placeholder="Search by name or ID..."
                          className="flex-1 glass-input text-xs"
                        />
                        <select
                          value={attRoleFilter}
                          onChange={(e) => setAttRoleFilter(e.target.value)}
                          className="glass-input text-xs"
                        >
                          <option value="All Roles">All Roles</option>
                          <option value="hosts">Hosts</option>
                          <option value="managers">Managers</option>
                          <option value="agents">Agents</option>
                          <option value="admins">Admins</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                        {attFilteredUsers.map((user) => (
                          <button
                            key={user.poppo_id || user.poppoId || user.id}
                            type="button"
                            onClick={() => {
                              const pid = user.poppo_id || user.poppoId || user.id;
                              if (attAttendees.find(a => (a.poppo_id || a.poppoId || a.id) === pid)) {
                                setAttAttendees(attAttendees.filter(a => (a.poppo_id || a.poppoId || a.id) !== pid));
                              } else {
                                setAttAttendees([...attAttendees, {
                                  id: pid,
                                  poppo_id: pid,
                                  nickname: user.nickname || user.name,
                                  role: user.role,
                                  photoUrl: user.photoUrl || user.profilePhotoUrl || user.photoURL
                                }]);
                              }
                            }}
                            className={cn(
                              "p-2 rounded-lg border transition-all text-center",
                              attAttendees.find(a => (a.poppo_id || a.poppoId || a.id) === (user.poppo_id || user.poppoId || user.id))
                                ? "bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37]"
                                : "bg-white/5 border-white/10 text-white/60 hover:border-white/20"
                            )}
                          >
                            <div className="w-8 h-8 mx-auto mb-1 rounded-full overflow-hidden">
                              <img src={user.photoUrl || user.profilePhotoUrl || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nickname || user.name)}&background=0a0806&color=D4AF37`} alt="" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-[8px] font-bold truncate block">{user.nickname || user.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-[#D4AF37] mb-2">Feedback</label>
                    <textarea
                      value={attFeedback}
                      onChange={(e) => setAttFeedback(e.target.value)}
                      placeholder="Add feedback about this event..."
                      className="w-full glass-input text-xs min-h-[80px]"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setAttendanceModalOpen(false)}
                      className="flex-1 py-2 border border-white/20 text-white/60 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAttProcessing}
                      className="flex-1 py-2 bg-[#D4AF37] text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#FFD700] transition-all disabled:opacity-50"
                    >
                      {isAttProcessing ? 'Saving...' : 'Save Attendance'}
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

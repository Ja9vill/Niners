import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, Users, Calendar, Clock, Sparkles, Plus, Trash2, 
  CheckCircle2, AlertCircle, Save, Send, Search, UserMinus, UserPlus, Info,
  ClipboardList, Edit, X, Check, MessageSquare, Loader2, Copy
} from 'lucide-react';
import { collection, addDoc, Timestamp, doc, setDoc, onSnapshot, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Storage } from '../lib/storage';
import { FirebaseService } from '../lib/firebaseService';
import { SingleDatePicker, DateRangePicker } from './InteractiveDatePicker';
import { AddEventForm } from './AddEventForm';
import { cn } from '../lib/utils';
import { Host } from '../types';

export const AdminHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'add_events' | 'fanbase_reports' | 'attendance' | 'admins_log'>('add_events');
  const [hosts, setHosts] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Admins Log Tab States
  const [fanbaseReports, setFanbaseReports] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [editRequests, setEditRequests] = useState<any[]>([]);
  const [logSubTab, setLogSubTab] = useState<'fanbase' | 'attendance'>('fanbase');

  // Request Edit Modal States
  const [requestEditTarget, setRequestEditTarget] = useState<any | null>(null);
  const [requestReason, setRequestReason] = useState('');

  // Edit Modal States
  const [editTargetReport, setEditTargetReport] = useState<any | null>(null);
  const [editTargetType, setEditTargetType] = useState<'fanbase' | 'attendance'>('fanbase');

  // Edit Fanbase Form Fields
  const [editFollowers, setEditFollowers] = useState('');
  const [editSubscribers, setEditSubscribers] = useState('');
  const [editGcMembers, setEditGcMembers] = useState('');
  const [editGcUpdatesHost, setEditGcUpdatesHost] = useState('');
  const [editGcUpdatesFans, setEditGcUpdatesFans] = useState('');
  const [editRangeStart, setEditRangeStart] = useState('');
  const [editRangeEnd, setEditRangeEnd] = useState('');

  // Edit Attendance Form Fields
  const [editEventId, setEditEventId] = useState('');
  const [editEventTitle, setEditEventTitle] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editTimeslot, setEditTimeslot] = useState('');
  const [editAttendees, setEditAttendees] = useState<any[]>([]);
  const [editFeedback, setEditFeedback] = useState('');
  const [editSearch, setEditSearch] = useState('');
  const [editRoleFilter, setEditRoleFilter] = useState('All Roles');

  const auth = Storage.getAuthState();

  // Load database metadata on mount
  const loadMetadata = async () => {
    setIsLoading(true);
    setErrors([]);
    try {
      // Fetch all users/metadata
      const usersList = await FirebaseService.getAllRoleMetadata();
      setAllUsers(usersList);

      // Filter only hosts (role 'host' or 'talent')
      const filteredHosts = usersList.filter(u => {
        const r = String(u.role || '').toLowerCase();
        return r === 'host' || r === 'talent';
      });
      setHosts(filteredHosts);

      // Fetch calendar events
      const events = await FirebaseService.getCalendarEvents();
      events.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setCalendarEvents(events);
    } catch (err: any) {
      console.error('[AdminHub] Error loading metadata:', err);
      setErrors([err.message || 'Failed to sync registry details from Database']);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMetadata();

    // 1. Subscribe to fanbase reports
    const unsubFanbase = onSnapshot(collection(db, 'fanbase_reports'), (snapshot) => {
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          submittedAtDate: data.submittedAt?.toDate ? data.submittedAt.toDate() : new Date(data.timestamp || data.submittedAt || Date.now())
        };
      });
      list.sort((a, b) => b.submittedAtDate.getTime() - a.submittedAtDate.getTime());
      setFanbaseReports(list);
    });

    // 2. Subscribe to attendance logs
    const unsubAttendance = onSnapshot(collection(db, 'attendance'), (snapshot) => {
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          submittedAtDate: data.submittedAt?.toDate ? data.submittedAt.toDate() : new Date(data.timestamp || data.submittedAt || Date.now())
        };
      });
      list.sort((a, b) => b.submittedAtDate.getTime() - a.submittedAtDate.getTime());
      setAttendanceLogs(list);
    });

    // 3. Subscribe to edit requests
    const unsubEditReqs = onSnapshot(collection(db, 'edit_requests'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEditRequests(list);
    });

    return () => {
      unsubFanbase();
      unsubAttendance();
      unsubEditReqs();
    };
  }, []);

  // -------------------------------------------------------------
  // TAB 2 STATE & LOGIC: FANBASE REPORTS
  // -------------------------------------------------------------
  const [fanReportHostId, setFanReportHostId] = useState('');
  const [currentFollowers, setCurrentFollowers] = useState('');
  const [fanclubGcMembers, setFanclubGcMembers] = useState('');
  const [fanclubSubscribers, setFanclubSubscribers] = useState('');
  const [gcUpdatesFans, setGcUpdatesFans] = useState('');
  const [gcUpdatesHost, setGcUpdatesHost] = useState('');
  const [fanRangeStart, setFanRangeStart] = useState('');
  const [fanRangeEnd, setFanRangeEnd] = useState('');

  const handleFanbaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMsg('');

    if (!fanReportHostId) {
      setErrors(['Please select a target host.']);
      return;
    }
    if (!fanRangeStart || !fanRangeEnd) {
      setErrors(['Please select the date range.']);
      return;
    }

    const followersNum = Number(currentFollowers);
    const gcMembersNum = Number(fanclubGcMembers);
    const subsNum = Number(fanclubSubscribers);
    const updatesFansNum = Number(gcUpdatesFans);
    const updatesHostNum = Number(gcUpdatesHost);

    if (isNaN(followersNum) || followersNum < 0 ||
        isNaN(gcMembersNum) || gcMembersNum < 0 ||
        isNaN(subsNum) || subsNum < 0 ||
        isNaN(updatesFansNum) || updatesFansNum < 0 ||
        isNaN(updatesHostNum) || updatesHostNum < 0) {
      setErrors(['All metric counts must be positive numbers.']);
      return;
    }

    setIsProcessing(true);

    try {
      const targetHost = hosts.find(h => h.id === fanReportHostId);
      const hostNickname = targetHost ? (targetHost.nickname || targetHost.name) : 'Unknown Host';

      const fromTimestamp = Timestamp.fromDate(new Date(fanRangeStart));
      const toTimestamp = Timestamp.fromDate(new Date(fanRangeEnd));

      const reportData = {
        // camelCase schema for standard writes
        fromDate: fromTimestamp,
        toDate: toTimestamp,
        poppoId: fanReportHostId,
        nickname: hostNickname,
        currentFollowers: followersNum,
        fanclubSubscribers: subsNum,
        fanclubGcMembers: gcMembersNum,
        gcUpdatesHost: updatesHostNum,
        gcUpdatesFans: updatesFansNum,
        reporterId: auth.poppo_id || 'SystemAdmin',
        reporterName: auth.nickname || auth.name || 'Admin',
        reporterRole: auth.role || 'Admin',
        submittedAt: Timestamp.now(),

        // snake_case schema for subcollection compatibility
        from_date: new Date(fanRangeStart).toISOString(),
        to_date: new Date(fanRangeEnd).toISOString(),
        poppo_id: fanReportHostId,
        total_followers: followersNum,
        fanclub_subscribers: subsNum,
        fanclub_gc_members: gcMembersNum,
        gc_activity_count_host: updatesHostNum,
        gc_activity_count_fans: updatesFansNum,
        reporter_id: auth.poppo_id || 'SystemAdmin',
        reporter_name: auth.nickname || auth.name || 'Admin',
        reporter_role: auth.role || 'Admin',
        timestamp: new Date().toISOString()
      };

      // Direct write to fanbase_reports collection
      await addDoc(collection(db, 'fanbase_reports'), reportData);

      await FirebaseService.logSystemActivity(`Submitted codebase fanbase report for Host: ${hostNickname} (Poppo ID: ${fanReportHostId}) - Period: ${fanRangeStart} to ${fanRangeEnd} - Followers: ${followersNum}, Subscribers: ${subsNum}, GC Members: ${gcMembersNum}, GC Activity Host/Fans: ${updatesHostNum}/${updatesFansNum}`, 'Info');

      Storage.addLog('Fanbase', `Submitted admin fanbase report for ${hostNickname}`, auth.nickname || auth.name);
      setSuccessMsg(`Successfully submitted fanbase report for ${hostNickname}!`);
      
      // Reset form
      setFanReportHostId('');
      setCurrentFollowers('');
      setFanclubGcMembers('');
      setFanclubSubscribers('');
      setGcUpdatesFans('');
      setGcUpdatesHost('');
      setFanRangeStart('');
      setFanRangeEnd('');
    } catch (err: any) {
      console.error('[AdminHub] Fanbase Submit Error:', err);
      setErrors([err.message || 'Failed to save fanbase report to database']);
    } finally {
      setIsProcessing(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 3 STATE & LOGIC: ATTENDANCE
  // -------------------------------------------------------------
  const [selectedEventId, setSelectedEventId] = useState('');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceRoleFilter, setAttendanceRoleFilter] = useState('All Roles');
  const [attendanceAttendees, setAttendanceAttendees] = useState<any[]>([]); // Selected users
  const [attendanceFeedback, setAttendanceFeedback] = useState('');

  // Filter users based on search query and role filter (excluding director role)
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      const userRole = String(u.role || '').toLowerCase();
      // Exclude director role
      if (userRole === 'director') return false;

      // Filter by role selection
      if (attendanceRoleFilter !== 'All Roles') {
        if (attendanceRoleFilter === 'hosts' && userRole !== 'host' && userRole !== 'talent') return false;
        if (attendanceRoleFilter === 'managers' && userRole !== 'manager') return false;
        if (attendanceRoleFilter === 'agents' && userRole !== 'agent') return false;
        if (attendanceRoleFilter === 'admins' && userRole !== 'admin' && userRole !== 'head admin') return false;
      }

      // Search matching poppoId or nickname
      const searchStr = attendanceSearch.toLowerCase().trim();
      if (searchStr) {
        const nickname = String(u.nickname || u.name || '').toLowerCase();
        const poppoId = String(u.poppo_id || u.poppoId || u.id || '').toLowerCase();
        return nickname.includes(searchStr) || poppoId.includes(searchStr);
      }

      return true;
    });
  }, [allUsers, attendanceSearch, attendanceRoleFilter]);

  const handleAddAttendee = (user: any) => {
    // Check duplicates
    if (attendanceAttendees.some(a => a.id === user.id)) return;
    setAttendanceAttendees([...attendanceAttendees, user]);
  };

  const handleRemoveAttendee = (userId: string) => {
    setAttendanceAttendees(attendanceAttendees.filter(a => a.id !== userId));
  };

  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMsg('');

    if (!selectedEventId) {
      setErrors(['Please select an event.']);
      return;
    }
    if (attendanceAttendees.length === 0) {
      setErrors(['Please add at least one attendee.']);
      return;
    }

    setIsProcessing(true);

    try {
      // Find selected event details
      const selectedEvent = calendarEvents.find(evt => evt.event_id === selectedEventId);
      const eventTitle = selectedEvent ? selectedEvent.title : 'Unknown Event';
      const eventDate = selectedEvent ? selectedEvent.date : '';
      const timeslot = selectedEvent ? selectedEvent.time : '';

      const attendanceId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

      const attendanceData = {
        attendanceId,
        eventId: selectedEventId,
        eventTitle,
        eventDate,
        timeslot,
        attendees: attendanceAttendees.map(a => ({
          poppoId: a.poppo_id || a.id,
          nickname: a.nickname || a.name,
          role: a.role
        })),
        attendeeIds: attendanceAttendees.map(a => a.poppo_id || a.id),
        eventFeedback: attendanceFeedback.trim(),
        reporterId: auth.poppo_id || 'SystemAdmin',
        reporterName: auth.nickname || auth.name || 'Admin',
        reporterRole: auth.role || 'Admin',
        submittedAt: Timestamp.now(),
        timestamp: new Date().toISOString()
      };

      // Direct write to attendance collection
      await setDoc(doc(db, 'attendance', attendanceId), attendanceData);

      await FirebaseService.logSystemActivity(`Logged attendance for Event: "${eventTitle}" on ${eventDate} at ${timeslot} - Attendees: ${attendanceAttendees.map(a => `${a.nickname || a.name} (#${a.poppo_id || a.id})`).join(', ')}`, 'Info');

      Storage.addLog('Attendance', `Logged attendance for event: ${eventTitle}`, auth.nickname || auth.name);
      setSuccessMsg(`Successfully logged attendance for event "${eventTitle}"!`);
      
      // Reset form
      setSelectedEventId('');
      setAttendanceSearch('');
      setAttendanceAttendees([]);
      setAttendanceFeedback('');
    } catch (err: any) {
      console.error('[AdminHub] Attendance Submit Error:', err);
      setErrors([err.message || 'Failed to log attendance to database']);
    } finally {
      setIsProcessing(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 4 STATE & LOGIC: ADMINS LOG & EDIT REQUESTS
  // -------------------------------------------------------------
  const getEditStatus = (report: any) => {
    // Director has full edit permissions
    if (auth.role === 'director') return 'editable';
    
    // Original reporter has full edit permissions
    if (report.reporterId === auth.poppo_id) return 'editable';
    
    // Check if there is an approved request for this report by the current user
    const req = editRequests.find(
      r => r.reportId === report.id && r.requesterId === auth.poppo_id
    );
    
    if (req) {
      if (req.status === 'Approved') return 'editable';
      if (req.status === 'Pending') return 'pending';
      if (req.status === 'Denied') return 'denied';
    }
    
    return 'requestable';
  };

  const incomingRequests = useMemo(() => {
    return editRequests.filter(req => req.reporterId === auth.poppo_id && req.status === 'Pending');
  }, [editRequests, auth.poppo_id]);

  const handleResolveRequest = async (requestId: string, status: 'Approved' | 'Denied') => {
    try {
      const docRef = doc(db, 'edit_requests', requestId);
      await setDoc(docRef, { status, resolvedAt: Timestamp.now() }, { merge: true });
      
      const req = editRequests.find(r => r.id === requestId);
      const actionText = status === 'Approved' ? 'approved' : 'denied';
      await FirebaseService.logSystemActivity(
        `${auth.nickname || auth.name} ${actionText} edit request by ${req?.requesterName || 'Admin'} for report ${req?.reportId}`,
        'Info'
      );
      setSuccessMsg(`Successfully ${actionText} the edit request!`);
    } catch (err: any) {
      setErrors([err.message || 'Failed to resolve edit request']);
    }
  };

  const handleRequestEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestReason.trim() || !requestEditTarget) return;
    setIsProcessing(true);
    setErrors([]);
    setSuccessMsg('');
    try {
      const { report, type } = requestEditTarget;
      const requestId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      
      const requestData = {
        id: requestId,
        reportId: report.id,
        reportType: type,
        requesterId: auth.poppo_id || 'SystemAdmin',
        requesterName: auth.nickname || auth.name || 'Admin',
        reporterId: report.reporterId || 'SystemAdmin',
        reporterName: report.reporterName || 'Admin',
        targetName: type === 'fanbase' ? (report.nickname || 'Host') : (report.eventTitle || 'Event'),
        reason: requestReason.trim(),
        status: 'Pending',
        submittedAt: Timestamp.now()
      };
      
      await setDoc(doc(db, 'edit_requests', requestId), requestData);
      
      await FirebaseService.logSystemActivity(
        `${auth.nickname || auth.name} requested edit for ${type} report (ID: ${report.id}) owned by ${report.reporterName || 'Admin'}`,
        'Info'
      );
      
      setSuccessMsg('Edit request sent successfully!');
      setRequestEditTarget(null);
      setRequestReason('');
    } catch (err: any) {
      setErrors([err.message || 'Failed to submit edit request']);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenEditModal = (report: any, type: 'fanbase' | 'attendance') => {
    setEditTargetReport(report);
    setEditTargetType(type);
    setErrors([]);
    setSuccessMsg('');
    
    if (type === 'fanbase') {
      setEditFollowers(String(report.currentFollowers ?? report.total_followers ?? ''));
      setEditSubscribers(String(report.fanclubSubscribers ?? report.fanclub_subscribers ?? ''));
      setEditGcMembers(String(report.fanclubGcMembers ?? report.fanclub_gc_members ?? ''));
      setEditGcUpdatesHost(String(report.gcUpdatesHost ?? report.gc_activity_count_host ?? ''));
      setEditGcUpdatesFans(String(report.gcUpdatesFans ?? report.gc_activity_count_fans ?? ''));
      
      const getIsoDate = (d: any) => {
        if (!d) return '';
        if (d.toDate) return d.toDate().toISOString().substring(0, 10);
        try {
          return new Date(d).toISOString().substring(0, 10);
        } catch (e) {
          return '';
        }
      };
      setEditRangeStart(getIsoDate(report.fromDate || report.from_date));
      setEditRangeEnd(getIsoDate(report.toDate || report.to_date));
    } else {
      setEditEventId(report.eventId || '');
      setEditEventTitle(report.eventTitle || '');
      setEditEventDate(report.eventDate || '');
      setEditTimeslot(report.timeslot || '');
      setEditAttendees(report.attendees || []);
      setEditFeedback(report.eventFeedback || '');
      setEditSearch('');
      setEditRoleFilter('All Roles');
    }
  };

  const filteredEditUsers = useMemo(() => {
    return allUsers.filter(u => {
      const userRole = String(u.role || '').toLowerCase();
      if (userRole === 'director') return false;

      if (editRoleFilter !== 'All Roles') {
        if (editRoleFilter === 'hosts' && userRole !== 'host' && userRole !== 'talent') return false;
        if (editRoleFilter === 'managers' && userRole !== 'manager') return false;
        if (editRoleFilter === 'agents' && userRole !== 'agent') return false;
        if (editRoleFilter === 'admins' && userRole !== 'admin' && userRole !== 'head admin') return false;
      }

      const searchStr = editSearch.toLowerCase().trim();
      if (searchStr) {
        const nickname = String(u.nickname || u.name || '').toLowerCase();
        const poppoId = String(u.poppo_id || u.poppoId || u.id || '').toLowerCase();
        return nickname.includes(searchStr) || poppoId.includes(searchStr);
      }

      return true;
    });
  }, [allUsers, editSearch, editRoleFilter]);

  const handleAddEditAttendee = (user: any) => {
    const attendeeObj = {
      poppoId: user.poppo_id || user.id,
      nickname: user.nickname || user.name,
      role: user.role
    };
    if (editAttendees.some(a => a.poppoId === attendeeObj.poppoId)) return;
    setEditAttendees([...editAttendees, attendeeObj]);
  };

  const handleRemoveEditAttendee = (poppoId: string) => {
    setEditAttendees(editAttendees.filter(a => a.poppoId !== poppoId));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetReport) return;
    setIsProcessing(true);
    setErrors([]);
    setSuccessMsg('');
    
    try {
      const docId = editTargetReport.id;
      if (editTargetType === 'fanbase') {
        const followersNum = Number(editFollowers);
        const subsNum = Number(editSubscribers);
        const gcMembersNum = Number(editGcMembers);
        const updatesHostNum = Number(editGcUpdatesHost);
        const updatesFansNum = Number(editGcUpdatesFans);
        
        if (isNaN(followersNum) || followersNum < 0 ||
            isNaN(subsNum) || subsNum < 0 ||
            isNaN(gcMembersNum) || gcMembersNum < 0 ||
            isNaN(updatesHostNum) || updatesHostNum < 0 ||
            isNaN(updatesFansNum) || updatesFansNum < 0) {
          setErrors(['All metrics must be positive numbers.']);
          setIsProcessing(false);
          return;
        }
        
        const fromTimestamp = Timestamp.fromDate(new Date(editRangeStart));
        const toTimestamp = Timestamp.fromDate(new Date(editRangeEnd));
        
        const updateData = {
          // camelCase
          fromDate: fromTimestamp,
          toDate: toTimestamp,
          currentFollowers: followersNum,
          fanclubSubscribers: subsNum,
          fanclubGcMembers: gcMembersNum,
          gcUpdatesHost: updatesHostNum,
          gcUpdatesFans: updatesFansNum,
          lastEditedBy: auth.nickname || auth.name,
          lastEditedAt: Timestamp.now(),
          
          // snake_case
          from_date: new Date(editRangeStart).toISOString(),
          to_date: new Date(editRangeEnd).toISOString(),
          total_followers: followersNum,
          fanclub_subscribers: subsNum,
          fanclub_gc_members: gcMembersNum,
          gc_activity_count_host: updatesHostNum,
          gc_activity_count_fans: updatesFansNum,
          last_edited_by: auth.nickname || auth.name,
          last_edited_at: new Date().toISOString()
        };
        
        await setDoc(doc(db, 'fanbase_reports', docId), updateData, { merge: true });
        await FirebaseService.logSystemActivity(
          `${auth.nickname || auth.name} edited fanbase report for Host ${editTargetReport.nickname || editTargetReport.poppoId || editTargetReport.poppo_id} (Period: ${editRangeStart} - ${editRangeEnd})`,
          'Info'
        );
      } else {
        if (editAttendees.length === 0) {
          setErrors(['Please add at least one attendee.']);
          setIsProcessing(false);
          return;
        }
        
        const selectedEvent = calendarEvents.find(evt => evt.event_id === editEventId);
        const eventTitle = selectedEvent ? selectedEvent.title : editEventTitle;
        const eventDate = selectedEvent ? selectedEvent.date : editEventDate;
        const timeslot = selectedEvent ? selectedEvent.time : editTimeslot;
        
        const updateData = {
          eventId: editEventId,
          eventTitle,
          eventDate,
          timeslot,
          attendees: editAttendees,
          attendeeIds: editAttendees.map(a => a.poppoId),
          eventFeedback: editFeedback.trim(),
          lastEditedBy: auth.nickname || auth.name,
          lastEditedAt: Timestamp.now(),
          timestamp: new Date().toISOString()
        };
        
        await setDoc(doc(db, 'attendance', docId), updateData, { merge: true });
        await FirebaseService.logSystemActivity(
          `${auth.nickname || auth.name} edited attendance log for Event: ${eventTitle} (${eventDate})`,
          'Info'
        );
      }
      
      const matchingReq = editRequests.find(
        r => r.reportId === editTargetReport.id && r.requesterId === auth.poppo_id && r.status === 'Approved'
      );
      if (matchingReq) {
        await deleteDoc(doc(db, 'edit_requests', matchingReq.id));
      }
      
      setSuccessMsg('Report updated successfully!');
      setEditTargetReport(null);
    } catch (err: any) {
      setErrors([err.message || 'Failed to update report']);
    } finally {
      setIsProcessing(false);
    }
  };

  // -------------------------------------------------------------
  // RENDERING
  // -------------------------------------------------------------
  // RENDERING
  // -------------------------------------------------------------
  if (isLoading && allUsers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <LoaderSpinner />
        <p className="text-xs uppercase tracking-[0.2em] text-[#A09E9A]">Loading Admin Hub database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#F0EFE8] tracking-tight flex items-center gap-2">
            <Shield className="text-[#D4AF37] font-bold" size={24} />
            Admin Operations Hub
          </h2>
          <p className="text-xs text-[#A09E9A] font-medium">
            Scope: <span className="text-[#D4AF37] font-bold">Admin Privileges</span> • Operator: <span className="text-[#D4AF37] font-mono text-[10px] uppercase tracking-wider">{auth.nickname || auth.name} ({auth.role})</span>
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-1.5 p-1.5 bg-[#13131E] rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
          {[
            { id: 'add_events', label: 'Add Events', icon: Calendar },
            { id: 'fanbase_reports', label: 'Fanbase Reports', icon: Users },
            { id: 'attendance', label: 'Attendance', icon: CheckCircle2 },
            { id: 'admins_log', label: 'Admins Log', icon: ClipboardList }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setErrors([]); setSuccessMsg(''); }}
              className={cn(
                "px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5",
                activeTab === tab.id
                  ? "bg-[#D4AF37] text-[#0D0D14] shadow-lg shadow-[#D4AF37]/20 font-black"
                  : "text-[#A09E9A] hover:text-[#F0EFE8] hover:bg-white/5"
              )}
            >
              <tab.icon size={11} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs font-bold flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 size={14} />
          </div>
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

      {/* Main Glass Form Container */}
      <div className="relative overflow-hidden glass-card border border-white/5 rounded-[32px] p-6 md:p-8 shadow-2xl bg-gradient-to-br from-[#1A1A28] to-[#13131E]">
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/2 via-transparent to-[#D4AF37]/2 pointer-events-none" />

        {/* Tab 1 Form: Add Events */}
        {activeTab === 'add_events' && (
          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-4 pb-4 border-b border-white/5 mb-6">
              <div className="p-3 rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
                <Calendar size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#F0EFE8] uppercase tracking-wide">Schedule New Calendar Event</h3>
                <p className="text-[10px] text-[#A09E9A] uppercase font-black tracking-widest">Available to all organization roles</p>
              </div>
            </div>

            <AddEventForm 
              onSuccess={async () => {
                setSuccessMsg('Successfully created event entry in registry!');
                await loadMetadata();
              }}
            />
          </div>
        )}

        {/* Tab 2 Form: Fanbase Reports */}
        {activeTab === 'fanbase_reports' && (
          <form onSubmit={handleFanbaseSubmit} className="space-y-6 relative z-10">
            <div className="flex items-center gap-4 pb-4 border-b border-white/5 mb-6">
              <div className="p-3 rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
                <Users size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#F0EFE8] uppercase tracking-wide">Submit Host Fanbase Report</h3>
                <p className="text-[10px] text-[#A09E9A] uppercase font-black tracking-widest">Admin version — full host lookup & edit access</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Select Host */}
              <div className="space-y-1.5">
                <label htmlFor="fanbase-host" className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Select Target Niner Host</label>
                <select
                  id="fanbase-host"
                  value={fanReportHostId}
                  onChange={(e) => setFanReportHostId(e.target.value)}
                  required
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all font-bold cursor-pointer"
                >
                  <option value="">-- Choose Host --</option>
                  {hosts.map(h => (
                    <option key={h.id} value={h.id}>{h.nickname || h.name} - {h.id}</option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Reporting Date Range</label>
                <DateRangePicker
                  startDate={fanRangeStart}
                  endDate={fanRangeEnd}
                  onChange={(start, end) => { setFanRangeStart(start); setFanRangeEnd(end); }}
                  required
                />
              </div>
            </div>

            {/* Metrics */}
            <div className="bg-[#0D0D14]/50 p-6 rounded-2xl border border-white/5 space-y-6">
              <span className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest block border-b border-white/5 pb-2">Fanbase Health Indicators</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Followers */}
                <div className="space-y-1.5">
                  <label htmlFor="followers" className="text-[10px] font-bold text-[#A09E9A]">Current Followers count</label>
                  <input
                    id="followers"
                    type="number"
                    value={currentFollowers}
                    onChange={(e) => setCurrentFollowers(e.target.value)}
                    placeholder="e.g. 15000"
                    required
                    min="0"
                    className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                  />
                </div>

                {/* FC Subscribers */}
                <div className="space-y-1.5">
                  <label htmlFor="subscribers" className="text-[10px] font-bold text-[#A09E9A]">Fanclub Subscribers</label>
                  <input
                    id="subscribers"
                    type="number"
                    value={fanclubSubscribers}
                    onChange={(e) => setFanclubSubscribers(e.target.value)}
                    placeholder="e.g. 120"
                    required
                    min="0"
                    className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                  />
                </div>

                {/* FC GC Members */}
                <div className="space-y-1.5">
                  <label htmlFor="members" className="text-[10px] font-bold text-[#A09E9A]">Fanclub GC Members</label>
                  <input
                    id="members"
                    type="number"
                    value={fanclubGcMembers}
                    onChange={(e) => setFanclubGcMembers(e.target.value)}
                    placeholder="e.g. 450"
                    required
                    min="0"
                    className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                {/* GC Updates Host */}
                <div className="space-y-1.5">
                  <label htmlFor="gc-updates-host" className="text-[10px] font-bold text-[#A09E9A]">GC Updates (By Host)</label>
                  <input
                    id="gc-updates-host"
                    type="number"
                    value={gcUpdatesHost}
                    onChange={(e) => setGcUpdatesHost(e.target.value)}
                    placeholder="Updates count"
                    required
                    min="0"
                    className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                  />
                </div>

                {/* GC Updates Fans */}
                <div className="space-y-1.5">
                  <label htmlFor="gc-updates-fans" className="text-[10px] font-bold text-[#A09E9A]">GC Updates (By Fans)</label>
                  <input
                    id="gc-updates-fans"
                    type="number"
                    value={gcUpdatesFans}
                    onChange={(e) => setGcUpdatesFans(e.target.value)}
                    placeholder="Updates count"
                    required
                    min="0"
                    className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            </div>

            {/* Submitter & Host Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] font-bold text-[#A09E9A] uppercase tracking-wider bg-black/20 p-4 rounded-xl border border-white/5">
              <div className="space-y-1">
                <span className="block">SubmittedBy: <span className="text-[#F0EFE8]">{auth.nickname || auth.name} (Role: {auth.role})</span></span>
                <span className="block font-mono">ReporterID: {auth.poppo_id || 'SystemAdmin'}</span>
              </div>
              <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-white/5 pt-2 sm:pt-0 sm:pl-4">
                {fanReportHostId ? (
                  <>
                    <span className="block">TargetHost: <span className="text-[#D4AF37]">{hosts.find(h => h.id === fanReportHostId)?.nickname || 'Unknown'}</span></span>
                    <span className="block font-mono">PoppoID: {fanReportHostId}</span>
                  </>
                ) : (
                  <span className="text-white/20 italic">No target host selected</span>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isProcessing}
                className="px-8 py-3.5 btn-gold rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg w-full sm:w-auto"
              >
                <Send size={14} className="text-[#0D0D14]" />
                {isProcessing ? 'Processing...' : 'Submit fanbase report'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 3 Form: Attendance */}
        {activeTab === 'attendance' && (
          <form onSubmit={handleAttendanceSubmit} className="space-y-6 relative z-10">
            <div className="flex items-center gap-4 pb-4 border-b border-white/5 mb-6">
              <div className="p-3 rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#F0EFE8] uppercase tracking-wide">Record Event Attendance Logs</h3>
                <p className="text-[10px] text-[#A09E9A] uppercase font-black tracking-widest">Admin / Director / Head Admin Authorized only</p>
              </div>
            </div>

            {/* Select Event */}
            <div className="space-y-1.5">
              <label htmlFor="attendance-event" className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Select Event from Calendar</label>
              <select
                id="attendance-event"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                required
                className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all font-bold cursor-pointer"
              >
                <option value="">-- Choose Event --</option>
                {calendarEvents.map(evt => (
                  <option key={evt.event_id} value={evt.event_id}>
                    {evt.title} - {evt.date} - {evt.time}
                  </option>
                ))}
              </select>
            </div>

            {/* Attendees layout */}
            <div className="bg-[#0D0D14]/50 p-6 rounded-2xl border border-white/5 space-y-6">
              <span className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest block border-b border-white/5 pb-2">Record Attendees</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left block: Search and Filter */}
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                      <input
                        type="text"
                        value={attendanceSearch}
                        onChange={(e) => setAttendanceSearch(e.target.value)}
                        placeholder="Search nickname or poppoId..."
                        className="w-full bg-[#0A0B0E] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <select
                      value={attendanceRoleFilter}
                      onChange={(e) => setAttendanceRoleFilter(e.target.value)}
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

                  {/* Matching Results list */}
                  <div className="max-h-[220px] overflow-y-auto border border-white/5 rounded-xl bg-black/40 custom-scrollbar divide-y divide-white/5">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map(user => {
                        const isAdded = attendanceAttendees.some(a => a.id === user.id);
                        return (
                          <div key={user.id} className="flex items-center justify-between p-3 text-xs hover:bg-white/[0.02] transition-colors">
                            <div>
                              <div className="font-bold text-[#F0EFE8]">{user.nickname || user.name}</div>
                              <div className="text-[10px] font-mono text-[#A09E9A] flex items-center gap-1.5 mt-0.5">
                                <span>ID: {user.poppo_id || user.id}</span>
                                <span>•</span>
                                <span className="text-indigo-400 capitalize">{user.role || 'Host'}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddAttendee(user)}
                              disabled={isAdded}
                              className={cn(
                                "p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 border",
                                isAdded
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-default"
                                  : "bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border-[#D4AF37]/20 text-[#D4AF37]"
                              )}
                            >
                              {isAdded ? <CheckCircle2 size={13} /> : <UserPlus size={13} />}
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-[#A09E9A]/30 italic text-xs">No matching users found.</div>
                    )}
                  </div>
                </div>

                {/* Right block: Selected Attendees list */}
                <div className="flex flex-col border border-white/5 rounded-xl bg-black/40 p-4 min-h-[200px]">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2 mb-3">
                    <span className="text-[9px] font-black text-white/50 uppercase tracking-wider">Selected Attendees ({attendanceAttendees.length})</span>
                    {attendanceAttendees.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAttendanceAttendees([])}
                        className="text-[9px] font-black text-red-400 hover:underline uppercase tracking-wider"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[190px] pr-1 space-y-2 custom-scrollbar">
                    {attendanceAttendees.length > 0 ? (
                      attendanceAttendees.map(user => (
                        <div key={user.id} className="flex items-center justify-between bg-white/5 border border-white/10 px-3 py-2 rounded-xl text-xs hover:border-[#D4AF37]/20 transition-all">
                          <div>
                            <span className="font-bold text-[#F0EFE8]">{user.nickname || user.name}</span>
                            <span className="text-[9px] text-[#A09E9A] font-mono ml-2">(#{user.poppo_id || user.id})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttendee(user.id)}
                            className="p-1 text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
                            title="Remove Attendee"
                          >
                            <UserMinus size={13} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center text-[#A09E9A]/35 italic text-xs py-8">
                        <span>No attendees added.</span>
                        <span className="text-[10px] mt-1">Search and click the add icon on the left.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Event Feedback */}
            <div className="space-y-1.5">
              <label htmlFor="event-feedback" className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Event Feedback / Notes (Optional)</label>
              <textarea
                id="event-feedback"
                rows={3}
                value={attendanceFeedback}
                onChange={(e) => setAttendanceFeedback(e.target.value)}
                placeholder="Log event outcome, highlights, host performance, or feedback..."
                className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all resize-none"
              />
            </div>

            {/* Autofills metadata display */}
            <div className="flex flex-wrap gap-4 text-[10px] font-bold text-[#A09E9A] uppercase tracking-wider bg-black/20 p-4 rounded-xl border border-white/5">
              <span>Reporter: <span className="text-[#F0EFE8] font-bold">{auth.nickname || auth.name}</span></span>
              <span className="text-white/20">|</span>
              <span>ReporterRole: <span className="text-indigo-400 font-mono">{auth.role}</span></span>
              <span className="text-white/20">|</span>
              <span>ReporterID: <span className="text-[#F0EFE8] font-mono">{auth.poppo_id || 'SystemAdmin'}</span></span>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isProcessing}
                className="px-8 py-3.5 btn-gold rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg w-full sm:w-auto"
              >
                <Send size={14} className="text-[#0D0D14]" />
                {isProcessing ? 'Processing...' : 'Record Attendance logs'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 4: Admins Log */}
        {activeTab === 'admins_log' && (
          <div className="space-y-6 relative z-10 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5 mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
                  <ClipboardList size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#F0EFE8] uppercase tracking-wide">Admins Log & Submissions</h3>
                  <p className="text-[10px] text-[#A09E9A] uppercase font-black tracking-widest">Review all codebase submissions & request edits</p>
                </div>
              </div>

              {/* Sub-Tabs: Fanbase vs Attendance */}
              <div className="flex gap-1 p-1 bg-[#0A0B0E] rounded-xl border border-white/5 self-start">
                <button
                  type="button"
                  onClick={() => setLogSubTab('fanbase')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                    logSubTab === 'fanbase'
                      ? "bg-[#D4AF37] text-[#0D0D14]"
                      : "text-[#A09E9A] hover:text-[#F0EFE8]"
                  )}
                >
                  Fanbase Reports
                </button>
                <button
                  type="button"
                  onClick={() => setLogSubTab('attendance')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                    logSubTab === 'attendance'
                      ? "bg-[#D4AF37] text-[#0D0D14]"
                      : "text-[#A09E9A] hover:text-[#F0EFE8]"
                  )}
                >
                  Attendance Logs
                </button>
              </div>
            </div>

            {/* Pending Approvals Sub-Panel */}
            {incomingRequests.length > 0 && (
              <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 space-y-3 text-left">
                <div className="flex items-center gap-2 text-xs font-black text-indigo-400 uppercase tracking-wider">
                  <MessageSquare size={14} />
                  <span>Incoming Edit Requests ({incomingRequests.length})</span>
                </div>
                <div className="space-y-2">
                  {incomingRequests.map(req => {
                    const typeLabel = req.reportType === 'fanbase' ? 'Fanbase Report' : 'Attendance Log';
                    return (
                      <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-black/20 rounded-xl border border-white/5 text-xs">
                        <div className="space-y-1">
                          <p className="font-bold text-[#F0EFE8]">
                            <span className="text-indigo-400">{req.requesterName}</span> requests to edit a {typeLabel} (ID: <span className="font-mono text-[10px]">{req.reportId}</span>)
                          </p>
                          <p className="text-[10px] text-[#A09E9A] italic text-left">Reason: "{req.reason}"</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleResolveRequest(req.id, 'Approved')}
                            className="px-2.5 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-600 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Check size={11} /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveRequest(req.id, 'Denied')}
                            className="px-2.5 py-1 bg-red-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-red-600 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <X size={11} /> Deny
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* List / Tables */}
            {logSubTab === 'fanbase' ? (
              <div className="space-y-4">
                {fanbaseReports.length > 0 ? (
                  <div className="overflow-x-auto no-scrollbar rounded-2xl border border-white/5">
                    <table className="w-full text-left text-xs divide-y divide-white/5">
                      <thead className="bg-black/30 text-[#A09E9A] text-[9px] font-black uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Host / ID</th>
                          <th className="px-4 py-3">Period Range</th>
                          <th className="px-4 py-3 text-right">Followers</th>
                          <th className="px-4 py-3 text-right">Subs/GC</th>
                          <th className="px-4 py-3 text-right">Updates (H/F)</th>
                          <th className="px-4 py-3">Reporter</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-black/10 font-medium">
                        {fanbaseReports.map(report => {
                          const editStatus = getEditStatus(report);
                          const start = report.fromDate?.toDate ? report.fromDate.toDate().toLocaleDateString() : report.from_date ? new Date(report.from_date).toLocaleDateString() : '';
                          const end = report.toDate?.toDate ? report.toDate.toDate().toLocaleDateString() : report.to_date ? new Date(report.to_date).toLocaleDateString() : '';
                          
                          return (
                            <tr key={report.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="px-4 py-3.5">
                                <div className="font-bold text-[#F0EFE8]">{report.nickname || 'Unknown'}</div>
                                <div className="text-[9px] font-mono text-[#A09E9A]">#{report.poppoId || report.poppo_id}</div>
                              </td>
                              <td className="px-4 py-3.5 text-[#F0EFE8] font-mono text-[10px]">
                                {start} - {end}
                              </td>
                              <td className="px-4 py-3.5 text-right font-mono text-[#F0EFE8] font-bold">
                                {(report.currentFollowers ?? report.total_followers ?? 0).toLocaleString()}
                              </td>
                              <td className="px-4 py-3.5 text-right font-mono">
                                <span className="text-[#D4AF37] font-bold">{report.fanclubSubscribers ?? report.fanclub_subscribers ?? 0}</span>
                                <span className="text-white/20 mx-1">/</span>
                                <span className="text-[#A09E9A]">{report.fanclubGcMembers ?? report.fanclub_gc_members ?? 0}</span>
                              </td>
                              <td className="px-4 py-3.5 text-right font-mono text-[10px]">
                                <span className="text-[#F0EFE8]">{report.gcUpdatesHost ?? report.gc_activity_count_host ?? 0}</span>
                                <span className="text-white/20 mx-1">/</span>
                                <span className="text-[#A09E9A]">{report.gcUpdatesFans ?? report.gc_activity_count_fans ?? 0}</span>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="text-[#F0EFE8]">{report.reporterName || report.reporter_name || 'Admin'}</div>
                                <div className="text-[9px] text-[#A09E9A] capitalize">{report.reporterRole || report.reporter_role || 'Admin'}</div>
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                {editStatus === 'editable' && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(report, 'fanbase')}
                                    className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[#F0EFE8] border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ml-auto cursor-pointer"
                                  >
                                    <Edit size={10} /> Edit
                                  </button>
                                )}
                                {editStatus === 'requestable' && (
                                  <button
                                    type="button"
                                    onClick={() => { setRequestEditTarget({ report, type: 'fanbase' }); setRequestReason(''); }}
                                    className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ml-auto cursor-pointer"
                                  >
                                    <MessageSquare size={10} /> Request Edit
                                  </button>
                                )}
                                {editStatus === 'pending' && (
                                  <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1 justify-end select-none">
                                    <Clock size={10} /> Pending
                                  </span>
                                )}
                                {editStatus === 'denied' && (
                                  <div className="flex flex-col items-end gap-0.5 select-none">
                                    <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                      <X size={10} /> Denied
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => { setRequestEditTarget({ report, type: 'fanbase' }); setRequestReason(''); }}
                                      className="text-[8px] text-[#D4AF37] hover:underline uppercase tracking-wider font-bold cursor-pointer"
                                    >
                                      Ask Again
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center text-[#A09E9A]/30 italic text-xs bg-black/20 rounded-2xl border border-white/5">
                    No fanbase reports recorded.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {attendanceLogs.length > 0 ? (
                  <div className="overflow-x-auto no-scrollbar rounded-2xl border border-white/5">
                    <table className="w-full text-left text-xs divide-y divide-white/5">
                      <thead className="bg-black/30 text-[#A09E9A] text-[9px] font-black uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3">Event / Date</th>
                          <th className="px-4 py-3">Attendees</th>
                          <th className="px-4 py-3">Feedback / Notes</th>
                          <th className="px-4 py-3">Reporter</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-black/10 font-medium">
                        {attendanceLogs.map(log => {
                          const editStatus = getEditStatus(log);
                          const attendeesList = log.attendees || [];
                          
                          return (
                            <tr key={log.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="px-4 py-3.5">
                                <div className="font-bold text-[#F0EFE8]">{log.eventTitle || 'Unknown Event'}</div>
                                <div className="text-[9px] text-[#A09E9A] font-mono flex items-center gap-1.5 mt-0.5 text-left">
                                  <span>{log.eventDate}</span>
                                  {log.timeslot && <span>• {log.timeslot}</span>}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 max-w-[200px] text-left">
                                <div className="flex flex-wrap gap-1">
                                  {attendeesList.map((att: any, idx: number) => (
                                    <span key={idx} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] text-[#F0EFE8] font-bold whitespace-nowrap">
                                      {att.nickname || att.name}
                                    </span>
                                  ))}
                                  {attendeesList.length === 0 && <span className="text-white/20 italic text-[10px]">None</span>}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-xs text-[#A09E9A] max-w-[250px] truncate text-left" title={log.eventFeedback}>
                                {log.eventFeedback || <span className="text-white/10 italic">No notes</span>}
                              </td>
                              <td className="px-4 py-3.5 text-left">
                                <div className="text-[#F0EFE8]">{log.reporterName || 'Admin'}</div>
                                <div className="text-[9px] text-[#A09E9A] capitalize">{log.reporterRole || 'Admin'}</div>
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                {editStatus === 'editable' && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(log, 'attendance')}
                                    className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[#F0EFE8] border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ml-auto cursor-pointer"
                                  >
                                    <Edit size={10} /> Edit
                                  </button>
                                )}
                                {editStatus === 'requestable' && (
                                  <button
                                    type="button"
                                    onClick={() => { setRequestEditTarget({ report: log, type: 'attendance' }); setRequestReason(''); }}
                                    className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ml-auto cursor-pointer"
                                  >
                                    <MessageSquare size={10} /> Request Edit
                                  </button>
                                )}
                                {editStatus === 'pending' && (
                                  <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1 justify-end select-none">
                                    <Clock size={10} /> Pending
                                  </span>
                                )}
                                {editStatus === 'denied' && (
                                  <div className="flex flex-col items-end gap-0.5 select-none">
                                    <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                      <X size={10} /> Denied
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => { setRequestEditTarget({ report: log, type: 'attendance' }); setRequestReason(''); }}
                                      className="text-[8px] text-[#D4AF37] hover:underline uppercase tracking-wider font-bold cursor-pointer"
                                    >
                                      Ask Again
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center text-[#A09E9A]/30 italic text-xs bg-black/20 rounded-2xl border border-white/5">
                    No attendance logs recorded.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Request Edit Modal */}
      {requestEditTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#13131E] border border-white/10 rounded-3xl p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setRequestEditTarget(null)}
              className="absolute top-4 right-4 text-[#A09E9A] hover:text-[#F0EFE8] cursor-pointer"
            >
              <X size={16} />
            </button>
            <h3 className="text-sm font-black text-[#F0EFE8] uppercase tracking-wider mb-4 flex items-center gap-2">
              <MessageSquare size={16} className="text-[#D4AF37]" />
              Request Edit Permission
            </h3>
            <form onSubmit={handleRequestEditSubmit} className="space-y-4 text-left">
              <p className="text-xs text-[#A09E9A]">
                You are requesting edit permission from <span className="text-[#F0EFE8] font-bold">{requestEditTarget.report.reporterName || 'Admin'}</span> for report ID: <span className="font-mono text-[10px] text-[#D4AF37]">{requestEditTarget.report.id}</span>.
              </p>
              <div className="space-y-1">
                <label htmlFor="reason" className="text-[9px] font-black text-[#A09E9A] uppercase tracking-widest">Reason for Edit</label>
                <textarea
                  id="reason"
                  required
                  rows={4}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Explain why you need to edit this record (e.g. incorrect counts, date mismatch, spelling correction)..."
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRequestEditTarget(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase rounded-lg text-[#F0EFE8] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-[#D4AF37] text-[#0D0D14] hover:bg-[#bfa032] text-xs font-black uppercase rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTargetReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#13131E] border border-white/10 rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              type="button"
              onClick={() => setEditTargetReport(null)}
              className="absolute top-4 right-4 text-[#A09E9A] hover:text-[#F0EFE8] cursor-pointer"
            >
              <X size={16} />
            </button>
            <h3 className="text-sm font-black text-[#F0EFE8] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Edit size={16} className="text-[#D4AF37]" />
              Edit {editTargetType === 'fanbase' ? 'Fanbase Report' : 'Attendance Log'}
            </h3>
            
            <form onSubmit={handleEditSubmit} className="space-y-4 text-left">
              {editTargetType === 'fanbase' ? (
                // Fanbase Form Fields
                <div className="space-y-4">
                  <div className="p-3 bg-black/20 rounded-xl border border-white/5 text-[10px] text-[#A09E9A] font-bold uppercase space-y-1">
                    <div>Target Host: <span className="text-[#D4AF37]">{editTargetReport.nickname || 'Unknown'}</span></div>
                    <div>Poppo ID: <span className="text-[#F0EFE8] font-mono">{editTargetReport.poppoId || editTargetReport.poppo_id}</span></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="edit-start" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">Start Date</label>
                      <input
                        id="edit-start"
                        type="date"
                        value={editRangeStart}
                        onChange={(e) => setEditRangeStart(e.target.value)}
                        required
                        className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="edit-end" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">End Date</label>
                      <input
                        id="edit-end"
                        type="date"
                        value={editRangeEnd}
                        onChange={(e) => setEditRangeEnd(e.target.value)}
                        required
                        className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="edit-followers" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">Followers</label>
                      <input
                        id="edit-followers"
                        type="number"
                        min="0"
                        value={editFollowers}
                        onChange={(e) => setEditFollowers(e.target.value)}
                        required
                        className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="edit-subscribers" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">Subscribers</label>
                      <input
                        id="edit-subscribers"
                        type="number"
                        min="0"
                        value={editSubscribers}
                        onChange={(e) => setEditSubscribers(e.target.value)}
                        required
                        className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="edit-gc-members" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">GC Members</label>
                      <input
                        id="edit-gc-members"
                        type="number"
                        min="0"
                        value={editGcMembers}
                        onChange={(e) => setEditGcMembers(e.target.value)}
                        required
                        className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="edit-updates-host" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">GC Updates (Host)</label>
                      <input
                        id="edit-updates-host"
                        type="number"
                        min="0"
                        value={editGcUpdatesHost}
                        onChange={(e) => setEditGcUpdatesHost(e.target.value)}
                        required
                        className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="edit-updates-fans" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">GC Updates (Fans)</label>
                      <input
                        id="edit-updates-fans"
                        type="number"
                        min="0"
                        value={editGcUpdatesFans}
                        onChange={(e) => setEditGcUpdatesFans(e.target.value)}
                        required
                        className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // Attendance Form Fields
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="edit-evt" className="text-[9px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Event Reference</label>
                    <select
                      id="edit-evt"
                      value={editEventId}
                      onChange={(e) => {
                        const evtId = e.target.value;
                        setEditEventId(evtId);
                        const sel = calendarEvents.find(ev => ev.event_id === evtId);
                        if (sel) {
                          setEditEventTitle(sel.title);
                          setEditEventDate(sel.date);
                          setEditTimeslot(sel.time);
                        }
                      }}
                      required
                      className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] cursor-pointer"
                    >
                      <option value="">-- Choose Event --</option>
                      {calendarEvents.map(evt => (
                        <option key={evt.event_id} value={evt.event_id}>
                          {evt.title} - {evt.date}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Attendees Selection */}
                  <div className="border border-white/5 rounded-xl bg-black/40 p-4 space-y-3">
                    <span className="text-[9px] font-black text-[#A09E9A] uppercase tracking-widest">Edit Attendees ({editAttendees.length})</span>
                    
                    <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2 bg-black/20 rounded-lg border border-white/5">
                      {editAttendees.map((att, index) => (
                        <span key={index} className="px-2 py-0.5 rounded bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] text-[#D4AF37] font-bold flex items-center gap-1 animate-scaleIn">
                          {att.nickname || att.name}
                          <button
                            type="button"
                            onClick={() => handleRemoveEditAttendee(att.poppoId)}
                            className="text-red-400 hover:text-red-300 font-bold ml-0.5 cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {editAttendees.length === 0 && (
                        <span className="text-white/20 italic text-[10px] self-center">No attendees selected yet</span>
                      )}
                    </div>

                    {/* Search and List */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editSearch}
                          onChange={(e) => setEditSearch(e.target.value)}
                          placeholder="Search users..."
                          className="flex-1 bg-[#0A0B0E] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                        />
                        <select
                          value={editRoleFilter}
                          onChange={(e) => setEditRoleFilter(e.target.value)}
                          title="Role Filter"
                          className="bg-[#0A0B0E] border border-white/10 rounded-lg px-2 text-xs text-[#F0EFE8] outline-none cursor-pointer font-bold"
                        >
                          <option value="All Roles">All Roles</option>
                          <option value="hosts">Hosts</option>
                          <option value="managers">Managers</option>
                          <option value="agents">Agents</option>
                          <option value="admins">Admins</option>
                        </select>
                      </div>

                      <div className="max-h-[140px] overflow-y-auto border border-white/5 rounded-lg bg-black/20 divide-y divide-white/5 custom-scrollbar">
                        {filteredEditUsers.map(user => {
                          const userPoppo = user.poppo_id || user.id;
                          const isAdded = editAttendees.some(a => a.poppoId === userPoppo);
                          return (
                            <div key={user.id} className="flex items-center justify-between p-2 text-xs hover:bg-white/[0.01]">
                              <div>
                                <span className="font-bold text-[#F0EFE8]">{user.nickname || user.name}</span>
                                <span className="text-[9px] text-[#A09E9A] ml-2">({user.role})</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAddEditAttendee(user)}
                                disabled={isAdded}
                                className={cn(
                                  "px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer",
                                  isAdded
                                    ? "bg-emerald-500/10 text-emerald-400 cursor-default"
                                    : "bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37]"
                                )}
                              >
                                {isAdded ? 'Added' : 'Add'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="edit-feedback" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">Feedback / Notes</label>
                    <textarea
                      id="edit-feedback"
                      rows={3}
                      value={editFeedback}
                      onChange={(e) => setEditFeedback(e.target.value)}
                      placeholder="Feedback/Outcome..."
                      className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] resize-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setEditTargetReport(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase rounded-lg text-[#F0EFE8] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-[#D4AF37] text-[#0D0D14] hover:bg-[#bfa032] text-xs font-black uppercase rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Loader Spinner Component
const LoaderSpinner: React.FC = () => (
  <div className="relative w-10 h-10 animate-spin rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" />
);

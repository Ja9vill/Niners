import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, Users, Calendar, Clock, Sparkles, Plus, Trash2, 
  CheckCircle2, AlertCircle, Save, Send, Search, UserMinus, UserPlus, Info,
  ClipboardList, Edit, X, Check, MessageSquare, Loader2, Copy
} from 'lucide-react';
import { collection, addDoc, Timestamp, doc, setDoc, onSnapshot, query, where, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Storage } from '../lib/storage';
import { FirebaseService } from '../lib/firebaseService';
import { SingleDatePicker, DateRangePicker } from './InteractiveDatePicker';
import { AddEventForm } from './AddEventForm';
import { cn } from '../lib/utils';
import { Host } from '../types';

export const AdminHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'add_events' | 'fanbase_reports' | 'attendance'>('add_events');
  const [hosts, setHosts] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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

      // Fetch existing attendance records
      const attSnapshot = await getDocs(collection(db, 'attendance'));
      const attList = attSnapshot.docs.map(d => d.data());
      setAttendanceRecords(attList);
    } catch (err: any) {
      console.error('[AdminHub] Error loading metadata:', err);
      setErrors([err.message || 'Failed to sync registry details from Database']);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMetadata();
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
    return allUsers
      .filter(u => {
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

      const existing = attendanceRecords.find(r => r.eventId === selectedEventId);
      const attendanceId = existing?.attendanceId || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));

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

      // Update local state attendanceRecords
      const updatedRecords = [
        ...attendanceRecords.filter(r => r.attendanceId !== attendanceId),
        attendanceData
      ];
      setAttendanceRecords(updatedRecords);

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
  // RENDERING
  // -------------------------------------------------------------
  if (isLoading && allUsers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="animate-spin text-[#D4AF37]" size={32} />
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
            { id: 'attendance', label: 'Attendance', icon: CheckCircle2 }
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
                {isProcessing 
                  ? 'Processing...' 
                  : (selectedEventId && attendanceRecords.some(r => r.eventId === selectedEventId) 
                      ? 'Update Attendance' 
                      : 'Submit Attendance')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const LoaderSpinner: React.FC = () => (
  <div className="relative w-10 h-10 animate-spin rounded-full border-2 border-[#D4AF37]/20 border-t-[#D4AF37]" />
);

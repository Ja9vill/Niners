import React, { useState, useEffect, useMemo } from 'react';
import { Database, RefreshCw, AlertTriangle, CheckCircle, Clock, Trash2, ChevronLeft, ChevronRight, CalendarPlus, X, List, Download } from 'lucide-react';
import { FirebaseService } from '../../lib/firebaseService';
import { LivehouseDataRow } from '../../types/livehouse';
import { LivehouseRequest } from '../../types';
import { Storage } from '../../lib/storage';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { db, storage } from '../../lib/firebase';
import { ref, uploadString } from 'firebase/storage';

const STATIC_TIMESLOTS = [
  "12:00AM-1:00AM", "1:00AM-2:00AM", "2:00AM-3:00AM",
  "3:00AM-4:00AM", "4:00AM-5:00AM", "5:00AM-6:00AM",
  "6:00AM-7:00AM", "7:00AM-8:00AM", "8:00AM-9:00AM",
  "9:00AM-10:00AM", "10:00AM-11:00AM", "11:00AM-12:00PM",
  "12:00PM-13:00PM", "13:00PM-14:00PM", "14:00PM-15:00PM",
  "15:00 PM-16:00PM", "16:00PM-17:00PM", "17:00PM-18:00PM",
  "18:00PM-19:00PM", "19:00PM-20:00PM", "20:00PM-21:00PM",
  "21:00PM-22:00PM", "22:00PM-23:00PM", "23:00PM-12:00AM"
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const LivehouseData = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [localData, setLocalData] = useState<LivehouseDataRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Logs state
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsLastVisible, setLogsLastVisible] = useState<any>(null);
  const [logsHasMore, setLogsHasMore] = useState(true);
  
  const [isExporting, setIsExporting] = useState(false);

  const handleExportJson = async () => {
    if (!selectedMonth || !selectedYear) return;
    setIsExporting(true);
    try {
      const filteredData = localData.filter(row => {
        if (!row.date) return false;
        let d = new Date(row.date);
        if (isNaN(d.getTime())) d = new Date(`${row.date} ${new Date().getFullYear()}`);
        if (isNaN(d.getTime())) return false;
        return MONTHS[d.getMonth()] === selectedMonth && d.getFullYear().toString() === selectedYear;
      });

      if (filteredData.length === 0) {
        alert("No data available to export for this month.");
        setIsExporting(false);
        return;
      }

      const filename = `${selectedMonth} ${selectedYear}.json`;
      const jsonString = JSON.stringify(filteredData, null, 2);
      
      const storageRef = ref(storage, `livehouse_backups/${filename}`);
      await uploadString(storageRef, jsonString, 'raw', { contentType: 'application/json' });
      
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(`Successfully saved ${filename} to storage and downloaded locally!`);
    } catch (error: any) {
      console.error("Export failed:", error);
      alert(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const [logsPage, setLogsPage] = useState(1);
  const [deleteAmount, setDeleteAmount] = useState<number>(50);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters state
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  // Requests state
  const [livehouseRequests, setLivehouseRequests] = useState<LivehouseRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<LivehouseRequest | null>(null);
  const [isSpotlightModalOpen, setIsSpotlightModalOpen] = useState(false);

  // Queue state
  const [users, setUsers] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);

  // Editable queue fields
  const [queueEventType, setQueueEventType] = useState('Solo Livehouse');
  const [queueEventTitle, setQueueEventTitle] = useState('');
  const [queueDescription, setQueueDescription] = useState('');
  const [isAddingEvent, setIsAddingEvent] = useState(false);

  // Party Livehouse States
  const [partyParticipants, setPartyParticipants] = useState<string[]>([]);
  const [eventHostId, setEventHostId] = useState<string>('');
  const [participantSearch, setParticipantSearch] = useState('');

  useEffect(() => {
    loadFirestoreData();
    loadDependencies();
    loadLogs(true);
  }, []);

  const loadDependencies = async () => {
    const [u, c, syncStatus, reqs] = await Promise.all([
      FirebaseService.getAllUsers(),
      FirebaseService.getCalendarEvents(),
      FirebaseService.getLivehouseSyncStatus(),
      FirebaseService.getLivehouseRequests()
    ]);
    setUsers(u);
    setCalendar(c);
    setLastSynced(syncStatus);
    setLivehouseRequests(reqs);
  };

  const checkAndAutoApproveRequests = async (currentRequests: LivehouseRequest[], currentSchedule: LivehouseDataRow[]) => {
    const pendingReqs = currentRequests.filter(r => r.status === 'Pending Approval');
    
    for (const req of pendingReqs) {
      const isBooked = currentSchedule.some(row => {
        // Broad check: if this poppo ID is booked anywhere in the current schedule snapshot.
        // It's the safest way to ensure they are actually on the spreadsheet.
        return row.slot_1?.poppo_id === req.poppoId || row.slot_2?.poppo_id === req.poppoId;
      });

      if (isBooked) {
        // Auto-approve
        await FirebaseService.updateLivehouseStatus(req.id, 'Approved');
        
        // Log the auto-approval as an activity instead of a notification
        const adminState = Storage.getAuthState();
        await FirebaseService.logSystemActivity(
          `Auto-approved Livehouse Request for ${req.name} (${req.poppoId}) on ${req.date} at ${req.timeslot}.`,
          'Info'
        );

        // Auto-create calendar event using existing saveCalendarEvents method
        const timeParts = (req.timeslot || '').split(' - ');
        await FirebaseService.saveCalendarEvents([{
          id: req.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)),
          event_id: req.id || (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)),
          event_type: req.livehouseType || 'Solo Livehouse',
          event_title: `Livehouse: ${req.name}`,
          event_description: `Auto-generated from approved Livehouse Request for ${req.name}. Timeslot: ${req.timeslot}`,
          event_date: req.date,
          from_time: timeParts[0] || req.timeslot || '',
          to_time: timeParts[1] || '',
          event_host_id: req.poppoId,
          event_host_name: req.name || '',
          is_external_host: false,
          participant_ids: [req.poppoId],
          participant_nicknames: [req.name || req.poppoId],
          created_by_id: adminState.poppo_id || 'system',
          created_by_name: adminState.nickname || 'System Auto-Approve',
          created_by_role: adminState.role || 'Admin',
          timestamp: new Date().toISOString(),
          notified30min: false,
          notifiedStart: false,
          // Backward-compat aliases
          type_of_event: (req.livehouseType || 'Solo Livehouse') as any,
          description: `Auto-generated from approved Livehouse Request for ${req.name}. Timeslot: ${req.timeslot}`,
          poppo_id: req.poppoId,
          visibility: 'all',
          is_automated: true
        }]);

        // Remove from local pending state
        setLivehouseRequests(prev => prev.filter(p => p.id !== req.id));
      }
    }
  };

  const loadFirestoreData = async () => {
    setIsLoading(true);
    try {
      const data = await FirebaseService.getLivehouseSchedule();
      setLocalData(data);
      // Run auto-approve check if requests are already loaded
      if (livehouseRequests.length > 0) {
        checkAndAutoApproveRequests(livehouseRequests, data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLogs = async (isInitial = false) => {
    if (isInitial) {
      setLogsLoading(true);
      const res = await FirebaseService.getLivehouseLogs(50);
      setLogs(res.logs);
      setLogsLastVisible(res.lastVisible);
      setLogsHasMore(res.logs.length === 50);
      setLogsPage(1);
      setLogsLoading(false);
    } else if (logsHasMore && !logsLoading) {
      setLogsLoading(true);
      const res = await FirebaseService.getLivehouseLogs(50, logsLastVisible);
      setLogs(prev => [...prev, ...res.logs]);
      setLogsLastVisible(res.lastVisible);
      setLogsHasMore(res.logs.length === 50);
      setLogsPage(p => p + 1);
      setLogsLoading(false);
    }
  };

  const handleDeleteLogs = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete the oldest ${deleteAmount} logs?`)) return;
    setIsDeleting(true);
    try {
      await FirebaseService.deleteOldLivehouseLogs(deleteAmount);
      // Reload logs from scratch
      await loadLogs(true);
      alert(`Successfully deleted the oldest ${deleteAmount} logs.`);
    } catch (err: any) {
      alert(`Failed to delete logs: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setLastSyncStatus(null);
    setErrorMessage('');

    try {
      const token = Storage.getAuthState().token;
      const response = await fetch('/api/admin/livehouse/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setLastSyncStatus('success');
        const authState = Storage.getAuthState();
        await FirebaseService.logSystemActivity(
          `Admin "${authState.nickname || authState.name}" manually synced Livehouse Schedule from Google Spreadsheet.`,
          'Info'
        );
        
        // Let the snapshot listener update localData automatically
        setLastSynced(new Date().toISOString());
        
        // Auto-approve logic would need to be updated to happen on the backend, 
        // but for now the user will see UI updates immediately via snapshot.
        const reqs = await FirebaseService.getLivehouseRequests();
        setLivehouseRequests(reqs);
        loadLogs(true);
      } else {
        throw new Error(data?.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      setLastSyncStatus('error');
      setErrorMessage(error.message || 'Failed to sync from spreadsheet.');
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Derive unique years and months from localData
  const parsedDates = useMemo(() => {
    const dates: { year: string, month: string, day: number, original: string }[] = [];
    localData.forEach(row => {
      if (!row.date) return;
      // Assume row.date is parsable by Date, or handle specific formats if needed
      // "Jun 28" is hard to get year from, let's try standard parsing
      let d = new Date(row.date);
      if (isNaN(d.getTime())) {
        // Fallback for "Jun 28" style, assume current year
        d = new Date(`${row.date} ${new Date().getFullYear()}`);
      }
      if (!isNaN(d.getTime())) {
        dates.push({
          year: d.getFullYear().toString(),
          month: MONTHS[d.getMonth()],
          day: d.getDate(),
          original: row.date
        });
      }
    });
    return dates;
  }, [localData]);

  const availableYears = useMemo(() => [...new Set(parsedDates.map(d => d.year))].sort(), [parsedDates]);
  const availableMonths = useMemo(() => {
    if (!selectedYear) return [];
    return ([...new Set(parsedDates.filter(d => d.year === selectedYear).map(d => d.month))] as string[]).sort((a, b) => MONTHS.indexOf(a) - MONTHS.indexOf(b));
  }, [parsedDates, selectedYear]);

  // Set default selections
  useEffect(() => {
    if (availableYears.length > 0 && !selectedYear) {
      setSelectedYear(availableYears[availableYears.length - 1]); // Latest year
    }
  }, [availableYears, selectedYear]);

  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]); // Latest month
    }
  }, [availableMonths, selectedMonth]);

  // Extract unique days for the selected month/year
  const daysInMonth = useMemo(() => {
    if (!selectedYear || !selectedMonth) return [];
    const days = parsedDates
      .filter(d => d.year === selectedYear && d.month === selectedMonth)
      .map(d => d.day);
    return ([...new Set(days)] as number[]).sort((a, b) => a - b);
  }, [parsedDates, selectedYear, selectedMonth]);

  // Helper to get data for a specific day and timeslot
  const getSlotData = (day: number, timeslot: string) => {
    const targetOriginalDates = parsedDates
      .filter(d => d.year === selectedYear && d.month === selectedMonth && d.day === day)
      .map(d => d.original);
      
    if (targetOriginalDates.length === 0) return null;
    
    // Attempt exact match on timeslot string or fallback to includes
    const match = localData.find(r => targetOriginalDates.includes(r.date) && r.timeslot.trim() === timeslot.trim());
    return match || null;
  };

  const currentLogs = useMemo(() => {
    const start = (logsPage - 1) * 50;
    return logs.slice(start, start + 50);
  }, [logs, logsPage]);

  // Queue Logic
  const parseManilaTimeToUTC = (dateStr: string, timeStr: string): number => {
    try {
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s+(AM|PM)/i);
      if (!timeMatch) return 0;
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3].toUpperCase();
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      const paddedHours = hours.toString().padStart(2, '0');
      const paddedMinutes = minutes.toString().padStart(2, '0');
      // Format is rough, but enough for sorting
      const isoString = `${new Date().getFullYear()}-${MONTHS.indexOf(dateStr.split(' ')[0])+1}-${dateStr.split(' ')[1]}T${paddedHours}:${paddedMinutes}:00+08:00`;
      return new Date(isoString).getTime();
    } catch {
      return 0;
    }
  };

  const recommendedQueue = useMemo(() => {
    if (!localData.length || !users.length) return [];
    
    const queue: any[] = [];
    localData.forEach(row => {
      // Check slot 1
      if (row.slot_1 && row.slot_1.poppo_id) {
        const pId = String(row.slot_1.poppo_id).trim();
        const user = users.find(u => String(u.poppo_id) === pId || String(u.id) === pId);
        if (user) {
          const queueId = `${row.date}_${row.timeslot}_${pId}`;
          const inCalendar = calendar.some(c => {
            const hasDate = c.date === row.date || c.event_date === row.date;
            const hasTime = c.time === row.timeslot || (c.description && c.description.includes(row.timeslot));
            const hasParticipant = (c.participant_ids && c.participant_ids.includes(pId)) || c.poppo_id === pId;
            return hasDate && hasTime && hasParticipant;
          });

          if (!inCalendar && !removedIds.includes(queueId)) {
            queue.push({
              id: queueId,
              poppo_id: pId,
              nickname: user.nickname || user.name || 'Unknown',
              date: row.date,
              timeslot: row.timeslot,
              timestampValue: parseManilaTimeToUTC(row.date, row.timeslot)
            });
          }
        }
      }
      
      // Check slot 2
      if (row.slot_2 && row.slot_2.poppo_id) {
        const pId = String(row.slot_2.poppo_id).trim();
        const user = users.find(u => String(u.poppo_id) === pId || String(u.id) === pId);
        if (user) {
          const queueId = `${row.date}_${row.timeslot}_${pId}`;
          const inCalendar = calendar.some(c => {
            const hasDate = c.date === row.date || c.event_date === row.date;
            const hasTime = c.time === row.timeslot || (c.description && c.description.includes(row.timeslot));
            const hasParticipant = (c.participant_ids && c.participant_ids.includes(pId)) || c.poppo_id === pId;
            return hasDate && hasTime && hasParticipant;
          });

          if (!inCalendar && !removedIds.includes(queueId)) {
            queue.push({
              id: queueId,
              poppo_id: pId,
              nickname: user.nickname || user.name || 'Unknown',
              date: row.date,
              timeslot: row.timeslot,
              timestampValue: parseManilaTimeToUTC(row.date, row.timeslot)
            });
          }
        }
      }
    });
    
    queue.sort((a, b) => a.timestampValue - b.timestampValue);
    
    const notSkipped = queue.filter(q => !skippedIds.includes(q.id));
    const skipped = queue.filter(q => skippedIds.includes(q.id));
    
    return [...notSkipped, ...skipped];
  }, [localData, users, calendar, removedIds, skippedIds]);

  const currentRecommendation = recommendedQueue[0] || null;

  useEffect(() => {
    if (currentRecommendation) {
      setQueueEventType('Solo Livehouse');
      setQueueEventTitle(`${currentRecommendation.nickname} - Solo Livehouse`);
      setQueueDescription('');
      setPartyParticipants([currentRecommendation.poppo_id]);
      setEventHostId(currentRecommendation.poppo_id);
      setParticipantSearch('');
    }
  }, [currentRecommendation]);

  const handleSkip = () => {
    if (currentRecommendation) {
      setSkippedIds(prev => [...prev, currentRecommendation.id]);
    }
  };

  const handleRemoveQueueItem = () => {
    if (currentRecommendation) {
      setRemovedIds(prev => [...prev, currentRecommendation.id]);
    }
  };

  const handleAddEvent = async () => {
    if (!currentRecommendation) return;
    setIsAddingEvent(true);
    try {
      const authState = Storage.getAuthState();
      const eventId = `evt_${Date.now()}_${currentRecommendation.poppo_id}`;
      
      const chosenHostId = queueEventType === 'Solo Livehouse' ? currentRecommendation.poppo_id : eventHostId;
      const chosenParticipants = queueEventType === 'Solo Livehouse' ? [currentRecommendation.poppo_id] : partyParticipants;

      const timeParts = (currentRecommendation.timeslot || '').split(' - ');
      const newEvent = {
        id: eventId,
        event_id: eventId,
        event_type: queueEventType,
        event_title: queueEventTitle || `${currentRecommendation.nickname} - ${queueEventType}`,
        event_description: queueDescription,
        event_date: currentRecommendation.date,
        from_time: timeParts[0] || currentRecommendation.timeslot || '',
        to_time: timeParts[1] || '',
        event_host_id: chosenHostId,
        event_host_name: currentRecommendation.nickname || chosenHostId,
        is_external_host: false,
        participant_ids: chosenParticipants,
        participant_nicknames: queueEventType === 'Solo Livehouse'
          ? [currentRecommendation.nickname || currentRecommendation.poppo_id]
          : partyParticipants.map((id: string) => id),
        created_by_id: authState.poppo_id || authState.id || "admin",
        created_by_name: authState.nickname || authState.name || "Admin",
        created_by_role: authState.role || "admin",
        timestamp: new Date().toISOString(),
        notified30min: false,
        notifiedStart: false,
        // Backward-compat aliases
        poppo_id: chosenHostId,
        title: queueEventTitle || `${currentRecommendation.nickname} - ${queueEventType}`,
        type_of_event: queueEventType,
        type: queueEventType,
        date: currentRecommendation.date,
        time: currentRecommendation.timeslot,
        description: queueDescription,
        visibility: 'all',
        is_automated: false,
      };

      const batch = writeBatch(db);
      const docRef = doc(db, 'calendar', eventId);
      batch.set(docRef, newEvent);
      await batch.commit();

      setCalendar(prev => [...prev, newEvent]);
      setRemovedIds(prev => [...prev, currentRecommendation.id]); // remove from queue
    } catch (err) {
      console.error(err);
      alert('Failed to add event');
    } finally {
      setIsAddingEvent(false);
    }
  };

  // Format timestamp helper
  const formatLogTimestamp = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const shortMonth = d.toLocaleString('en-US', { month: 'short' });
      return `${shortMonth} ${d.getDate()}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    } catch {
      return isoStr;
    }
  };

  const formatTimeslotForDisplay = (ts: string) => {
    return ts.replace(/:00 /g, '').replace(/0(\d)AM/g, '$1AM').replace(/0(\d)PM/g, '$1PM').replace(/12AM/g, '12AM').replace(/12PM/g, '12PM');
  };

  return (
    <div className="relative flex flex-col h-full bg-[#050200] p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
      {/* Atmospheric Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D4AF37]/15 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FF8C00]/10 blur-[120px] rounded-full pointer-events-none z-0" />
      
      <div className="relative z-10 max-w-[1600px] mx-auto w-full space-y-4">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2 bg-[#D4AF37]/10 rounded-lg border border-[#D4AF37]/20">
              <Database className="text-[#D4AF37]" size={20} />
            </div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              Livehouse Database
            </h1>
          </div>
          
          {/* Livehouse Requests Ribbon */}
          <div className="flex-1 overflow-x-auto custom-scrollbar flex items-center gap-2 px-2 min-w-0">
            {livehouseRequests.filter(r => r.status === 'Pending Approval').map(req => (
              <button
                key={req.id}
                onClick={() => {
                  setSelectedRequest(req);
                  setIsSpotlightModalOpen(true);
                }}
                className="shrink-0 flex items-center gap-2 bg-gradient-to-r from-[#D4AF37]/20 to-[#FF8C00]/10 border border-[#D4AF37]/30 px-4 py-2 rounded-xl hover:from-[#D4AF37]/30 hover:to-[#FF8C00]/20 transition-all shadow-[0_0_15px_rgba(212,175,55,0.15)] group"
              >
                <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
                <span className="text-[#D4AF37] font-bold text-xs uppercase tracking-wider group-hover:text-white transition-colors">
                  {req.name} - {req.livehouseType || 'Event'}
                </span>
              </button>
            ))}
            {livehouseRequests.filter(r => r.status === 'Pending Approval').length === 0 && (
              <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest ml-2 px-3 py-1.5 border border-white/5 rounded-lg bg-white/5">No pending requests</span>
            )}
          </div>
          
          <div className="flex flex-col md:flex-row items-center shrink-0 border-t md:border-t-0 md:border-l border-white/10 pt-2 md:pt-0 md:pl-4">
            <div className="flex items-stretch bg-gradient-to-r from-[#D4AF37]/10 to-[#FF8C00]/10 backdrop-blur-xl border border-[#D4AF37]/40 rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.15)] overflow-hidden transition-all hover:shadow-[0_0_30px_rgba(212,175,55,0.3)] hover:scale-[1.01]">
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center justify-center gap-2 px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed text-[#D4AF37] hover:text-[#FFF0B3] hover:bg-[#D4AF37]/10 font-black uppercase tracking-wider text-xs transition-colors border-r border-[#D4AF37]/20"
              >
                <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                {isSyncing ? 'Syncing...' : 'Sync'}
              </button>

              <button
                onClick={handleExportJson}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 font-black uppercase tracking-wider text-xs transition-colors border-r border-[#D4AF37]/20"
              >
                <Download size={16} className={isExporting ? "animate-bounce" : ""} />
                {isExporting ? 'Saving...' : 'Save JSON'}
              </button>
              
              <select 
                value={selectedMonth} 
                onChange={e => setSelectedMonth(e.target.value)}
                className="bg-transparent text-[#D4AF37] hover:text-[#FFF0B3] hover:bg-[#D4AF37]/10 font-black uppercase tracking-wider text-xs px-4 py-3 transition-colors appearance-none cursor-pointer outline-none text-center border-r border-[#D4AF37]/20"
                title="Select Month"
              >
                {availableMonths.length === 0 && <option value="" className="bg-[#0A0500] text-[#D4AF37]">-</option>}
                {availableMonths.map(m => <option key={m} value={m} className="bg-[#0A0500] text-[#D4AF37]">{m}</option>)}
              </select>
              
              <select 
                value={selectedYear} 
                onChange={e => setSelectedYear(e.target.value)}
                className="bg-transparent text-[#D4AF37] hover:text-[#FFF0B3] hover:bg-[#D4AF37]/10 font-black uppercase tracking-wider text-xs px-4 py-3 transition-colors appearance-none cursor-pointer outline-none text-center"
                title="Select Year"
              >
                {availableYears.length === 0 && <option value="" className="bg-[#0A0500] text-[#D4AF37]">-</option>}
                {availableYears.map(y => <option key={y} value={y} className="bg-[#0A0500] text-[#D4AF37]">{y}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Sync Status Notifications */}
        {lastSyncStatus === 'success' && (
          <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <CheckCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Sync Successful</p>
              <p className="text-xs text-emerald-400/80 mt-1">Successfully imported the latest records into the app database. New entries have been logged below.</p>
            </div>
          </div>
        )}

        {lastSyncStatus === 'error' && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Sync Failed</p>
              <p className="text-xs text-red-400/80 mt-1">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* SEMI-AUTOMATIC EVENT ENTRY BLOCK */}
        {currentRecommendation && (
          <div className="bg-gradient-to-br from-[#1C1511]/90 to-black/90 backdrop-blur-2xl border border-[#D4AF37]/30 rounded-2xl p-6 relative overflow-hidden shadow-[0_0_40px_rgba(212,175,55,0.1)]">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#D4AF37] to-[#8C7323]"></div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-black uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
                  <CalendarPlus size={20} />
                  Semi-Automatic Event Entry
                </h2>
                <p className="text-xs text-[#A09E9A] mt-1">
                  A registered user was found in the Livehouse database! Review and add to the Agency Calendar.
                </p>
              </div>
              
              <button 
                onClick={() => setIsQueueModalOpen(true)}
                className="flex items-center gap-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/20 px-3 py-1.5 rounded-lg transition-colors group cursor-pointer"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-bold text-[#D4AF37] group-hover:text-white transition-colors">
                  {recommendedQueue.length} Recommended {recommendedQueue.length === 1 ? 'Event' : 'Events'}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Col: Auto-filled */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-[#A09E9A] uppercase tracking-wider mb-1.5">Poppo ID</label>
                    <div className="bg-black/50 border border-white/5 rounded-lg px-4 py-2.5 text-sm font-bold text-white">
                      {currentRecommendation.poppo_id}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#A09E9A] uppercase tracking-wider mb-1.5">Nickname / Name</label>
                    <div className="bg-black/50 border border-white/5 rounded-lg px-4 py-2.5 text-sm font-bold text-white">
                      {currentRecommendation.nickname}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-[#A09E9A] uppercase tracking-wider mb-1.5">Date</label>
                    <div className="bg-black/50 border border-white/5 rounded-lg px-4 py-2.5 text-sm font-bold text-[#D4AF37]">
                      {currentRecommendation.date}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#A09E9A] uppercase tracking-wider mb-1.5">Timeslot</label>
                    <div className="bg-black/50 border border-white/5 rounded-lg px-4 py-2.5 text-sm font-bold text-[#D4AF37]">
                      {currentRecommendation.timeslot}
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-white/20 font-mono pt-2">Auto-generated ID: evt_pending_{currentRecommendation.poppo_id}</p>
              </div>

              {/* Right Col: Editable */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-[#D4AF37] uppercase tracking-wider mb-1.5">Event Type *</label>
                  <select 
                    value={queueEventType}
                    onChange={e => {
                      setQueueEventType(e.target.value);
                      setQueueEventTitle(`${currentRecommendation.nickname} - ${e.target.value}`);
                    }}
                    className="w-full bg-black/60 backdrop-blur-md border border-white/10 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 rounded-lg px-4 py-2.5 text-sm text-white outline-none transition-all"
                    title="Select Event Type"
                  >
                    <option value="Solo Livehouse">Solo Livehouse</option>
                    <option value="Party Livehouse">Party Livehouse</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#D4AF37] uppercase tracking-wider mb-1.5">Event Title (Optional)</label>
                  <input 
                    type="text"
                    value={queueEventTitle}
                    onChange={e => setQueueEventTitle(e.target.value)}
                    className="w-full bg-black/60 backdrop-blur-md border border-white/10 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 rounded-lg px-4 py-2.5 text-sm text-white outline-none transition-all"
                    placeholder="Defaults to {Nickname} - {Event Type}"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-[#D4AF37] uppercase tracking-wider mb-1.5">Description (Optional)</label>
                  <input 
                    type="text"
                    value={queueDescription}
                    onChange={e => setQueueDescription(e.target.value)}
                    className="w-full bg-black/60 backdrop-blur-md border border-white/10 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 rounded-lg px-4 py-2.5 text-sm text-white outline-none transition-all"
                    placeholder="Add an event description..."
                  />
                </div>

                {queueEventType === 'Party Livehouse' && (
                  <div className="border border-[#D4AF37]/20 rounded-xl p-4 bg-black/45 space-y-4 relative z-20">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#D4AF37] border-b border-white/5 pb-2">Party Setup</h3>
                    
                    {/* Add Participants Selector */}
                    <div className="space-y-2 relative">
                      <label className="block text-[9px] font-black text-[#A09E9A] uppercase tracking-wider">Search & Add Participants</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={participantSearch}
                          onChange={e => setParticipantSearch(e.target.value)}
                          className="w-full bg-black/60 border border-white/10 focus:border-[#D4AF37] rounded-lg px-3 py-2 text-xs text-white outline-none"
                          placeholder="Search by ID or Nickname..."
                        />
                        {participantSearch.trim() && (
                          <div className="absolute left-0 right-0 mt-1 bg-[#1A120E] border border-[#D4AF37]/30 rounded-lg max-h-40 overflow-y-auto z-50 shadow-2xl">
                            {users
                              .filter(u => {
                                const idStr = String(u.poppo_id || u.id || '').toLowerCase();
                                const nameStr = String(u.nickname || u.name || '').toLowerCase();
                                const searchStr = participantSearch.toLowerCase();
                                return (idStr.includes(searchStr) || nameStr.includes(searchStr)) && 
                                       !partyParticipants.includes(u.poppo_id || u.id);
                              })
                              .slice(0, 5)
                              .map(u => {
                                const uid = u.poppo_id || u.id;
                                return (
                                  <button
                                    key={uid}
                                    type="button"
                                    onClick={() => {
                                      setPartyParticipants(prev => [...prev, uid]);
                                      setParticipantSearch('');
                                    }}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-[#D4AF37]/20 text-white flex justify-between items-center border-b border-white/5 last:border-none"
                                  >
                                    <span>{u.nickname || u.name}</span>
                                    <span className="text-[10px] text-[#D4AF37] font-mono">ID: {uid}</span>
                                  </button>
                                );
                              })}
                            {users.filter(u => {
                                const idStr = String(u.poppo_id || u.id || '').toLowerCase();
                                const nameStr = String(u.nickname || u.name || '').toLowerCase();
                                const searchStr = participantSearch.toLowerCase();
                                return (idStr.includes(searchStr) || nameStr.includes(searchStr)) && 
                                       !partyParticipants.includes(u.poppo_id || u.id);
                              }).length === 0 && (
                                <div className="px-3 py-2 text-xs text-white/40 italic">No members found</div>
                              )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Participant Chips */}
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-black text-[#A09E9A] uppercase tracking-wider">Selected Participants</label>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                        {partyParticipants.map(pid => {
                          const user = users.find(u => String(u.poppo_id || u.id) === String(pid));
                          const displayName = user ? (user.nickname || user.name) : pid;
                          return (
                            <span 
                              key={pid} 
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-white text-[10px] font-bold"
                            >
                              <span>{displayName} (ID: {pid})</span>
                              {pid !== currentRecommendation.poppo_id && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPartyParticipants(prev => prev.filter(x => x !== pid));
                                    if (eventHostId === pid) {
                                      setEventHostId(currentRecommendation.poppo_id);
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-300 font-bold transition-colors ml-1"
                                  title="Remove Participant"
                                >
                                  <X size={10} />
                                </button>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Designated Event Host Selector */}
                    <div className="space-y-1.5">
                      <label className="block text-[9px] font-black text-[#D4AF37] uppercase tracking-wider">Designated Event Host *</label>
                      <select
                        value={eventHostId}
                        onChange={e => setEventHostId(e.target.value)}
                        className="w-full bg-black/60 border border-white/10 focus:border-[#D4AF37] rounded-lg px-3 py-2 text-xs text-white outline-none"
                        title="Select Designated Event Host"
                      >
                        {partyParticipants.map(pid => {
                          const user = users.find(u => String(u.poppo_id || u.id) === String(pid));
                          const displayName = user ? (user.nickname || user.name) : pid;
                          return (
                            <option key={pid} value={pid} className="bg-[#0A0500] text-white">
                              {displayName} (ID: {pid})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/5">
              <button 
                onClick={handleRemoveQueueItem}
                disabled={isAddingEvent}
                className="flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold uppercase tracking-wider text-[10px] sm:text-xs rounded-xl transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Remove</span>
              </button>
              <button 
                onClick={handleAddEvent}
                disabled={isAddingEvent}
                className="flex items-center justify-center gap-2 py-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-black uppercase tracking-wider text-[10px] sm:text-xs rounded-xl transition-colors disabled:opacity-50 shadow-[0_0_20px_rgba(212,175,55,0.2)]"
              >
                <CalendarPlus size={16} />
                {isAddingEvent ? 'Adding...' : 'Add Entry'}
              </button>
              <button 
                onClick={handleSkip}
                disabled={isAddingEvent}
                className="flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-wider text-[10px] sm:text-xs rounded-xl transition-colors disabled:opacity-50"
              >
                <ChevronRight size={16} />
                <span className="hidden sm:inline">Skip</span>
              </button>
            </div>
          </div>
        )}

        {/* LAST SYNCED BLOCK */}
        {lastSynced && (
          <div className="bg-gradient-to-r from-black/60 to-black/20 backdrop-blur-xl border border-[#D4AF37]/20 rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
            <Clock size={14} className="text-[#D4AF37]" />
            <span className="text-xs font-mono text-[#A09E9A]">
              Last Synced at: <span className="text-white font-bold drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]">{formatLogTimestamp(lastSynced)}</span>
            </span>
          </div>
        )}

        {/* LIVEHOUSE DATABASE TABLE */}
        <div className="relative mb-4">
          <div className="overflow-x-auto custom-scrollbar pb-8">
            <table className="w-full text-left border-separate min-w-max livehouse-table">
              <thead>
                <tr>
                  <th className="p-4 pb-2 text-[11px] font-black uppercase tracking-widest text-[#A09E9A] whitespace-nowrap sticky top-0 left-0 z-40 bg-[#050200] border-b border-r border-white/5 rounded-tl-2xl shadow-[5px_0_15px_rgba(0,0,0,0.5)]">
                    Timeslot
                  </th>
                  {daysInMonth.map((day, idx) => (
                    <React.Fragment key={`header-${day}`}>
                      <th className="p-4 pb-2 text-center text-[10px] font-black uppercase tracking-widest text-[#A09E9A] whitespace-nowrap bg-[#050200]/90 backdrop-blur-md border-b border-white/5 sticky top-0 z-20">
                        Day {day} Slot 1
                      </th>
                      <th className={`p-4 pb-2 text-center text-[10px] font-black uppercase tracking-widest text-[#A09E9A] whitespace-nowrap bg-[#050200]/90 backdrop-blur-md border-b border-r border-white/5 sticky top-0 z-20 ${idx === daysInMonth.length - 1 ? 'rounded-tr-2xl' : ''}`}>
                        Day {day} Slot 2
                      </th>
                    </React.Fragment>
                  ))}
                  {daysInMonth.length === 0 && (
                    <th className="p-4 pb-2 text-center text-xs text-white/40 uppercase bg-[#050200]/90 backdrop-blur-md border-b border-white/5 sticky top-0 z-20 rounded-tr-2xl">No Data Available</th>
                  )}
                </tr>
              </thead>
              <tbody className="relative z-0">
                {isLoading ? (
                  <tr>
                    <td colSpan={100} className="p-12 text-center text-white/40 text-sm font-bold uppercase tracking-wider">
                      Loading spreadsheet data...
                    </td>
                  </tr>
                ) : (
                  STATIC_TIMESLOTS.map((timeslot, idx) => (
                    <tr key={idx} className="group transition-all">
                      <td className="px-5 py-2.5 text-sm font-black tracking-widest text-[#D4AF37] sticky left-0 z-30 bg-[#050200] group-hover:bg-[#140A00] transition-all border-t border-b border-l border-r border-[#D4AF37]/30 rounded-l-2xl whitespace-nowrap shadow-[5px_0_15px_rgba(0,0,0,0.8)] relative">
                        {/* subtle inner gradient for sticky cell */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/10 to-transparent pointer-events-none rounded-l-2xl"></div>
                        <span className="relative z-10">{formatTimeslotForDisplay(timeslot)}</span>
                      </td>
                      {daysInMonth.map((day, dayIdx) => {
                        const cellData = getSlotData(day, timeslot);
                        const slot1 = cellData?.slot_1;
                        const slot2 = cellData?.slot_2;
                        const isLastCell = dayIdx === daysInMonth.length - 1;

                        return (
                          <React.Fragment key={`${day}-${timeslot}`}>
                            {/* Slot 1 */}
                            <td className="px-3 py-2.5 text-center align-middle transition-all border-t border-b border-[#D4AF37]/30 backdrop-blur-sm bg-[#0A0500]/40 group-hover:bg-[#140A00]/60">
                              {slot1?.poppo_id ? (
                                <span className="font-bold text-[13px] text-[#D4AF37] tracking-wider">{slot1.poppo_id}</span>
                              ) : null}
                            </td>
                            {/* Slot 2 */}
                            <td className={`px-3 py-2.5 text-center align-middle transition-all border-t border-b border-r border-[#D4AF37]/30 backdrop-blur-sm ${isLastCell ? 'rounded-r-2xl bg-gradient-to-r from-[#0A0500]/40 to-[#FF8C00]/10 group-hover:from-[#140A00]/60 group-hover:to-[#FF8C00]/20' : 'bg-[#0A0500]/40 group-hover:bg-[#140A00]/60'}`}>
                              {slot2?.poppo_id ? (
                                <span className="font-bold text-[13px] text-[#D4AF37] tracking-wider">{slot2.poppo_id}</span>
                              ) : null}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      {daysInMonth.length === 0 && (
                        <td className="p-4 bg-gradient-to-r from-[#0A0500]/40 to-[#FF8C00]/10 rounded-r-2xl border-t border-b border-r border-[#D4AF37]/30"></td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DATA ENTRY LOGS */}
        <div className="bg-gradient-to-br from-[#1C1511]/40 to-black/60 backdrop-blur-xl border border-[#D4AF37]/20 rounded-2xl p-6 shadow-[0_0_30px_rgba(212,175,55,0.05)] mt-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
              <Database size={16} />
              Data Entry Logs
            </h2>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#A09E9A] uppercase">Delete Oldest:</span>
                <select 
                  value={deleteAmount}
                  onChange={e => setDeleteAmount(Number(e.target.value))}
                  className="bg-black border border-red-500/20 rounded-lg px-2 py-1.5 text-xs text-white outline-none focus:border-red-500/50"
                  title="Select Delete Logs Amount"
                >
                  <option value={50}>50 logs</option>
                  <option value={100}>100 logs</option>
                  <option value={200}>200 logs</option>
                  <option value={300}>300 logs</option>
                  <option value={400}>400 logs</option>
                  <option value={500}>500 logs</option>
                  <option value={700}>700 logs</option>
                  <option value={1000}>1000 logs</option>
                </select>
                <button
                  onClick={handleDeleteLogs}
                  disabled={isDeleting || logs.length === 0}
                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors disabled:opacity-50"
                  title="Permanently Delete Logs"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[#140E0A]/60 backdrop-blur-md border border-[#D4AF37]/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#D4AF37]/10 border-b border-white/5">
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#A09E9A]">Poppo ID</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#A09E9A]">Event Date & Timeslot</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#A09E9A]">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logsLoading && logs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-white/40 text-xs font-bold uppercase tracking-wider">
                        Loading logs...
                      </td>
                    </tr>
                  ) : currentLogs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-white/40 text-xs font-bold uppercase tracking-wider">
                        No new entries logged yet.
                      </td>
                    </tr>
                  ) : (
                    currentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 text-xs font-bold text-white">{log.poppo_id}</td>
                        <td className="p-4 text-xs font-mono text-[#A09E9A]">{log.date ? formatLogTimestamp(`${log.date} ${new Date().getFullYear()}`) : "Unknown"} - {log.timeslot}</td>
                        <td className="p-4 text-xs font-mono text-emerald-400">{log.timestamp ? formatLogTimestamp(log.timestamp) : "Unknown"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {logs.length > 0 && (
              <div className="p-4 border-t border-white/5 bg-[#1C1511]/50 flex items-center justify-between">
                <p className="text-xs text-white/40 font-bold uppercase tracking-wider">
                  Page {logsPage}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                    disabled={logsPage === 1}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white disabled:opacity-30 transition-colors"
                    title="Previous Page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (currentLogs.length === 50) {
                        loadLogs();
                      }
                    }}
                    disabled={currentLogs.length < 50 && !logsHasMore}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white disabled:opacity-30 transition-colors"
                    title="Next Page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>


      {/* Recommended Events Modal */}
      {isQueueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#140E0A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#1C1511]">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <List size={16} className="text-[#D4AF37]" />
                Recommended Queue ({recommendedQueue.length})
              </h3>
              <button 
                onClick={() => setIsQueueModalOpen(false)}
                className="p-1.5 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {recommendedQueue.length === 0 ? (
                <p className="text-center text-white/40 text-xs font-bold py-8">Queue is empty</p>
              ) : (
                recommendedQueue.map((item, idx) => (
                  <div key={item.id} className="flex flex-col gap-1 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{item.nickname}</span>
                      <span className="text-[10px] font-mono text-[#D4AF37] px-2 py-0.5 bg-[#D4AF37]/10 rounded">ID: {item.poppo_id}</span>
                    </div>
                    <span className="text-[10px] text-[#A09E9A] uppercase tracking-wider">
                      {item.date} • {item.timeslot}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    {/* Spotlight Event Box Modal */}
      {isSpotlightModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#140E0A] border border-[#D4AF37]/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.15)] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-gradient-to-r from-[#D4AF37]/10 to-transparent">
              <h3 className="text-sm font-black text-[#D4AF37] uppercase tracking-wider flex items-center gap-2">
                <CalendarPlus size={16} />
                Livehouse Request
              </h3>
              <button 
                onClick={() => { setIsSpotlightModalOpen(false); setSelectedRequest(null); }}
                className="p-1.5 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-[#0A0500] p-4 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Name</span>
                  <span className="text-xs font-bold text-white">{selectedRequest.name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Poppo ID</span>
                  <span className="text-xs font-mono text-[#D4AF37]">{selectedRequest.poppoId}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Date</span>
                  <span className="text-xs font-bold text-white">{selectedRequest.date}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Timeslot</span>
                  <span className="text-xs font-bold text-white">{selectedRequest.timeslot}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Event Type</span>
                  <span className="text-[10px] px-2 py-0.5 bg-[#FF8C00]/20 text-[#FF8C00] rounded uppercase tracking-wider font-bold">
                    {selectedRequest.livehouseType || 'Solo Livehouse'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  const text = `Date: ${selectedRequest.date}\nTimeslot: ${selectedRequest.timeslot}\nName: ${selectedRequest.name}\nPoppo ID: ${selectedRequest.poppoId}`;
                  navigator.clipboard.writeText(text);
                  alert('Details copied to clipboard!');
                }}
                className="w-full py-3 bg-gradient-to-r from-[#D4AF37] to-[#FF8C00] hover:from-[#FF8C00] hover:to-[#D4AF37] text-black font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)]"
              >
                Copy Details
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

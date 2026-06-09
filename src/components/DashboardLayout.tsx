import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Menu, X, LogOut, LayoutDashboard, Users, User, Shield, Calendar, DollarSign, Activity, FileText,
  Bell, Trash2, Plus, Clock, ChevronDown, Monitor, Smartphone, TrendingUp
} from 'lucide-react';
import { useViewMode } from '../hooks/useViewMode';
import { Storage } from '../lib/storage';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../lib/utils';
import { collection, query, onSnapshot, setDoc, doc, deleteDoc, where } from 'firebase/firestore';
import appLogo from '../logo.jpg';
import { FirebaseService } from '../lib/firebaseService';

export const DashboardLayout = ({ children }: { children?: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const location = useLocation();
  const authState = Storage.getAuthState();
  const { currentViewMode, setViewMode } = useViewMode();

  const toggleDropdown = (id: string) => {
    setOpenDropdowns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Notification center states
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [livehouseRequests, setLivehouseRequests] = useState<any[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isPostingAnnouncement, setIsPostingAnnouncement] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] = useState(false);
  const [dismissedRequests, setDismissedRequests] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('dismissed_livehouse_reqs') || '[]');
  });
  const [lastReadTimestamp, setLastReadTimestamp] = useState<string>(() => {
    return localStorage.getItem('last_read_notifications_time') || '';
  });
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [pendingEditRequests, setPendingEditRequests] = useState<any[]>([]);

  // Real-time Firestore listeners for announcements, livehouse requests, and system logs
  useEffect(() => {
    if (!db) return;
    const unsubAnn = onSnapshot(collection(db, 'announcements'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      setAnnouncements(list);
    });

    const unsubReq = onSnapshot(collection(db, 'livehouse_requests'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLivehouseRequests(list);
    });

    let unsubLogs = () => {};
    const roleLower = String(authState.role || '').toLowerCase();
    if (['director', 'head admin', 'head_admin'].includes(roleLower)) {
      const logsQuery = query(collection(db, 'system_logs'));
      unsubLogs = onSnapshot(logsQuery, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        list.sort((a: any, b: any) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        setSystemLogs(list.slice(0, 10)); // keep last 10 logs
      });
    }

    let unsubEditReqs = () => {};
    if (authState?.poppo_id) {
      const editReqsQuery = query(
        collection(db, 'edit_requests'),
        where('reporterId', '==', authState.poppo_id),
        where('status', '==', 'Pending')
      );
      unsubEditReqs = onSnapshot(editReqsQuery, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPendingEditRequests(list);
      });
    }

    return () => {
      unsubAnn();
      unsubReq();
      unsubLogs();
      unsubEditReqs();
    };
  }, [authState.role, authState?.poppo_id]);

  const handleDismissRequest = (reqId: string) => {
    const updated = [...dismissedRequests, reqId];
    setDismissedRequests(updated);
    localStorage.setItem('dismissed_livehouse_reqs', JSON.stringify(updated));
  };

  const handleHostAccept = async (req: any) => {
    try {
      const docRef = doc(db, 'livehouse_requests', req.id);
      await setDoc(docRef, {
        ...req,
        date: req.proposedDate,
        timeslot: req.proposedTimeslot,
        status: 'Host Accepted Proposal',
        proposedDate: null,
        proposedTimeslot: null,
        proposedBy: 'Host',
        timestamp: new Date().toISOString()
      }, { merge: true });
      Storage.addLog('Calendar', `Accepted proposed slot: ${req.proposedTimeslot} on ${req.proposedDate}`, req.name);
      await FirebaseService.logSystemActivity(`Host "${req.name}" (Poppo ID: ${req.poppoId}) accepted proposed Livehouse slot on ${req.proposedDate} at ${req.proposedTimeslot}`, 'Info');
    } catch (err) {
      console.error("Accept proposal failed:", err);
    }
  };

  const handleHostDeny = async (req: any) => {
    try {
      const docRef = doc(db, 'livehouse_requests', req.id);
      await setDoc(docRef, {
        ...req,
        status: 'Closed',
        timestamp: new Date().toISOString()
      }, { merge: true });
      Storage.addLog('Calendar', `Denied proposed slot`, req.name);
      await FirebaseService.logSystemActivity(`Host "${req.name}" (Poppo ID: ${req.poppoId}) declined proposed Livehouse slot`, 'Warning');
    } catch (err) {
      console.error("Deny proposal failed:", err);
    }
  };

  const handleApprove = async (req: any) => {
    try {
      const docRef = doc(db, 'livehouse_requests', req.id);
      await setDoc(docRef, { ...req, status: 'Approved' }, { merge: true });

      // Create Calendar Event in 'calendar' collection
      const eventId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      const newEvent = {
        event_id: eventId,
        poppo_id: req.poppoId,
        event_host_id: req.poppoId,
        title: `Livehouse: ${req.name}`,
        description: req.notes || 'Livehouse timeslot approved.',
        date: req.date,
        time: req.timeslot,
        type: req.livehouseType || 'SOLO LIVEHOUSE',
        location: 'VIRTUAL ROOM (LIVEHOUSE)',
        created_by_name: authState.nickname || authState.name || 'Admin',
        created_by_role: authState.role || 'Admin',
        created_by_id: authState.poppo_id || 'SystemAdmin',
        visibility: 'All',
        participants: [req.poppoId],
        participantIds: [req.poppoId],
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'calendar', eventId), newEvent);
      Storage.addLog('Calendar', `Approved Livehouse slot for ${req.name}`, authState.nickname || authState.name);
      await FirebaseService.logSystemActivity(`Admin/Director approved Livehouse request for host "${req.name}" (Poppo ID: ${req.poppoId}) on ${req.date} at ${req.timeslot}`, 'Info');
    } catch (err) {
      console.error("Approve failed:", err);
    }
  };

  const handleDeny = async (req: any) => {
    try {
      const docRef = doc(db, 'livehouse_requests', req.id);
      await setDoc(docRef, { ...req, status: 'Closed' }, { merge: true });
      Storage.addLog('Calendar', `Denied Livehouse request for ${req.name}`, authState.nickname || authState.name);
      await FirebaseService.logSystemActivity(`Admin/Director closed/denied Livehouse request for host "${req.name}" (Poppo ID: ${req.poppoId})`, 'Warning');
    } catch (err) {
      console.error("Deny failed:", err);
    }
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle.trim() || !announcementContent.trim()) return;
    setIsSubmittingAnnouncement(true);
    try {
      const annId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      const newAnn = {
        id: annId,
        title: announcementTitle.trim(),
        content: announcementContent.trim(),
        authorName: authState.nickname || authState.name || 'Management',
        authorRole: authState.role || 'Staff',
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'announcements', annId), newAnn);
      setAnnouncementTitle('');
      setAnnouncementContent('');
      setIsPostingAnnouncement(false);
      await FirebaseService.logSystemActivity(`Admin/Director published agency announcement: "${newAnn.title}"`, 'Info');
    } catch (err) {
      console.error("Announcement submit failed:", err);
    } finally {
      setIsSubmittingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    try {
      const target = announcements.find(a => a.id === annId);
      const annTitle = target ? target.title : 'Unknown Announcement';
      await deleteDoc(doc(db, 'announcements', annId));
      await FirebaseService.logSystemActivity(`Admin/Director deleted agency announcement: "${annTitle}"`, 'Warning');
    } catch (err) {
      console.error("Announcement delete failed:", err);
    }
  };

  // Filter messages & requests based on role mapping
  const filteredRequests = useMemo(() => {
    const roleLower = String(authState.role || '').toLowerCase();
    const isDirectorOrAdmin = ['director', 'founder', 'head admin', 'head_admin', 'admin'].includes(roleLower);
    const isManagerOrAgent = ['manager', 'agent'].includes(roleLower);
    const isHost = ['talent', 'host'].includes(roleLower);

    if (isDirectorOrAdmin) {
      return livehouseRequests.filter(req => req.status === 'Pending Approval' || req.status === 'Host Accepted Proposal');
    } else if (isManagerOrAgent) {
      return livehouseRequests.filter(req => (req.status === 'Pending Approval' || req.status === 'Host Accepted Proposal') && req.managerId === authState.poppo_id);
    } else if (isHost) {
      return livehouseRequests.filter(req => 
        req.poppoId === authState.poppo_id && 
        !dismissedRequests.includes(req.id) &&
        (req.status === 'Approved' || req.status === 'Closed' || req.status === 'New Timeslot Proposed')
      );
    }
    return [];
  }, [livehouseRequests, authState, dismissedRequests]);

  const unreadAnnouncementsCount = useMemo(() => {
    if (!lastReadTimestamp) return announcements.length;
    return announcements.filter(ann => ann.timestamp > lastReadTimestamp).length;
  }, [announcements, lastReadTimestamp]);

  const unreadLogsCount = useMemo(() => {
    const roleLower = String(authState.role || '').toLowerCase();
    if (!['director', 'head admin', 'head_admin'].includes(roleLower)) return 0;
    if (!lastReadTimestamp) return systemLogs.length;
    return systemLogs.filter(log => log.timestamp > lastReadTimestamp).length;
  }, [systemLogs, lastReadTimestamp, authState.role]);

  const totalUnreadCount = filteredRequests.length + unreadAnnouncementsCount + unreadLogsCount + pendingEditRequests.length;
  const toggleNotifications = () => {
    if (!isNotificationOpen) {
      const now = new Date().toISOString();
      setLastReadTimestamp(now);
      localStorage.setItem('last_read_notifications_time', now);
    }
    setIsNotificationOpen(!isNotificationOpen);
  };

  const renderNotificationCenter = () => {
    const roleLower = String(authState.role || '').toLowerCase();
    const canPostAnn = ['director', 'head admin', 'head_admin'].includes(roleLower);
    
    return (
      <div className="relative">
        <button
          onClick={toggleNotifications}
          className="relative p-2.5 text-[#D4AF37] hover:text-[#F0EFE8] rounded-full bg-[#140e0a]/90 hover:bg-[#1c1511] transition-all cursor-pointer border border-[#D4AF37]/20 hover:border-[#D4AF37]/45 active:scale-95 flex items-center justify-center shrink-0 shadow-md"
          title="Notifications"
          type="button"
        >
          <Bell size={16} />
          {totalUnreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white font-extrabold text-[8px] leading-none px-1 py-0.5 rounded-full min-w-[14px] text-center select-none animate-pulse">
              {totalUnreadCount}
            </span>
          )}
        </button>

        {isNotificationOpen && (
          <div className="absolute right-0 mt-3 w-80 md:w-[380px] bg-[#120D0A]/95 border border-[#D4AF37]/20 backdrop-blur-md rounded-2xl shadow-2xl z-50 p-4 space-y-4 max-h-[480px] overflow-y-auto custom-scrollbar">
            {isPostingAnnouncement ? (
              <form onSubmit={handlePublishAnnouncement} className="space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Publish Announcement</span>
                  <button 
                    type="button" 
                    onClick={() => setIsPostingAnnouncement(false)}
                    className="text-[9px] font-black uppercase text-[#A09E9A] hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-white/40 uppercase tracking-widest block">Announcement Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Server Maintenance or Livehouse Rules Update"
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    className="w-full bg-[#0A0B0E] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-white/40 uppercase tracking-widest block">Announcement Details</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Type details of the announcement..."
                    value={announcementContent}
                    onChange={(e) => setAnnouncementContent(e.target.value)}
                    className="w-full bg-[#0A0B0E] border border-white/10 rounded-xl p-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingAnnouncement}
                  className="w-full py-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-black uppercase tracking-wider text-[10px] rounded-xl transition-all cursor-pointer"
                >
                  {isSubmittingAnnouncement ? 'Publishing...' : 'Publish Announcement'}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-white/50">Announcements & Requests</h4>
                  {canPostAnn && (
                    <button
                      onClick={() => setIsPostingAnnouncement(true)}
                      className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      + Post 
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Announcements List */}
                  {announcements.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[7px] font-black uppercase tracking-wider text-white/20 select-none border-b border-white/5 pb-1">ANNOUNCEMENTS</p>
                      {announcements.slice(0, 3).map((ann) => (
                        <div key={ann.id} className="relative group bg-indigo-500/5 border-l-2 border-indigo-500/50 p-3 rounded-r-xl space-y-1 text-left">
                          {canPostAnn && (
                            <button
                              onClick={() => handleDeleteAnnouncement(ann.id)}
                              className="absolute top-2 right-2 p-1 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Delete Announcement"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                          <p className="text-[10px] font-bold text-indigo-300 leading-snug">{ann.title}</p>
                          <p className="text-[9px] text-[#A09E9A] leading-relaxed whitespace-pre-wrap">{ann.content}</p>
                          <p className="text-[7px] text-white/30 font-bold uppercase tracking-wider mt-1">
                            By {ann.authorName} ({ann.authorRole}) • {new Date(ann.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* System Activity Logs (For Director and Head Admin) */}
                  {['director', 'head admin', 'head_admin'].includes(roleLower) && systemLogs.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[7px] font-black uppercase tracking-wider text-white/20 select-none border-b border-white/5 pb-1">SYSTEM ACTIVITY LOGS</p>
                      {systemLogs.slice(0, 5).map((log) => (
                        <div key={log.id} className="bg-indigo-500/5 border-l-2 border-[#D4AF37] p-3 rounded-r-xl space-y-1 text-left">
                          <div className="flex items-center justify-between">
                            <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${
                              log.severity === 'Error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              log.severity === 'Warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                              'bg-indigo-500/10 text-[#D4AF37] border border-[#D4AF37]/20'
                            }`}>
                              {log.severity}
                            </span>
                            <span className="text-[7px] font-mono text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-[9px] text-slate-300 font-medium leading-relaxed">{log.actionDescription}</p>
                          <p className="text-[7px] text-slate-500 font-bold uppercase mt-0.5">
                            By {String(log.userRole || 'System').replace('_', ' ')} ({log.userId || 'System'})
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Requests requiring action */}
                  <div className="space-y-2">
                    <p className="text-[7px] font-black uppercase tracking-wider text-white/20 select-none border-b border-white/5 pb-1">MESSAGES & ACTION ITEMS</p>                    {(filteredRequests.length > 0 || pendingEditRequests.length > 0) ? (
                      <>
                        {filteredRequests.map((req) => {
                          const isOwnReq = req.poppoId === authState.poppo_id;
                          
                          return (
                            <div key={req.id} className="bg-slate-900/60 border border-white/5 p-3 rounded-xl space-y-2 text-left">
                              <div>
                                <p className="text-[10px] font-bold text-[#F0EFE8] leading-tight">
                                  {isOwnReq ? `Your Livehouse Request (${req.livehouseType || 'SOLO LIVEHOUSE'})` : `Request: ${req.name}`}
                                </p>
                                <p className="text-[8px] text-[#A09E9A] mt-0.5">
                                  Date: {req.date} • Time: {req.timeslot.replace(" (Manila Time)", "")}
                                </p>
                                {req.notes && (
                                  <p className="text-[8px] text-[#A09E9A]/70 italic mt-1 leading-relaxed">
                                    Notes: {req.notes}
                                  </p>
                                )}
                              </div>

                              {/* Status Indicator */}
                              <div className="flex items-center gap-1.5">
                                {req.status === 'Pending Approval' && (
                                  <span className="text-[7px] font-black uppercase tracking-wider bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/20">
                                    Pending Approval
                                  </span>
                                )}
                                {req.status === 'Host Accepted Proposal' && (
                                  <span className="text-[7px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                                    Proposal Accepted
                                  </span>
                                )}
                                {req.status === 'New Timeslot Proposed' && (
                                  <span className="text-[7px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
                                    Alternative Slot Proposed
                                  </span>
                                )}
                                {req.status === 'Approved' && (
                                  <span className="text-[7px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 animate-pulse">
                                    Approved
                                  </span>
                                )}
                                {req.status === 'Closed' && (
                                  <span className="text-[7px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20">
                                    Closed / Denied
                                  </span>
                                )}
                              </div>

                              {/* Alternative slot description */}
                              {req.status === 'New Timeslot Proposed' && (
                                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-2 space-y-1">
                                  <p className="text-[7px] font-black text-indigo-300 uppercase tracking-wider">Proposed Alternative:</p>
                                  <p className="text-[8px] text-[#F0EFE8]">Date: {req.proposedDate}</p>
                                  <p className="text-[8px] text-[#F0EFE8]">Time: {req.proposedTimeslot?.replace(" (Manila Time)", "")}</p>
                                </div>
                              )}

                              {/* Action Buttons */}
                              {/* Host accepts/declines alternative slot */}
                              {req.status === 'New Timeslot Proposed' && isOwnReq && (
                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    onClick={() => handleHostAccept(req)}
                                    className="flex-1 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-[8px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition-colors"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleHostDeny(req)}
                                    className="flex-1 py-1.5 bg-slate-800 hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 text-[8px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition-colors"
                                  >
                                    Decline
                                  </button>
                                </div>
                              )}

                              {/* Host dismisses completed logs */}
                              {(req.status === 'Approved' || req.status === 'Closed') && isOwnReq && (
                                <button
                                  onClick={() => handleDismissRequest(req.id)}
                                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-[#A09E9A] hover:text-white text-[8px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition-colors"
                                >
                                  Dismiss
                                </button>
                              )}

                              {/* Admin/Director approval controls */}
                              {(req.status === 'Pending Approval' || req.status === 'Host Accepted Proposal') && 
                               ['director', 'head admin', 'head_admin'].includes(roleLower) && (
                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    onClick={() => handleApprove(req)}
                                    className="flex-1 py-1.5 bg-emerald-550 hover:bg-emerald-600 text-white text-[8px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition-colors"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleDeny(req)}
                                    className="flex-1 py-1.5 bg-slate-800 hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 text-[8px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition-colors"
                                  >
                                    Deny
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {pendingEditRequests.map((req) => (
                          <div key={req.id} className="bg-slate-900/60 border border-yellow-500/20 p-3 rounded-xl space-y-2 text-left">
                            <div>
                              <p className="text-[10px] font-bold text-[#F0EFE8] leading-tight">
                                Edit Request: {req.requesterName}
                              </p>
                              <p className="text-[8px] text-[#A09E9A] mt-0.5">
                                Wants to edit the {req.reportType === 'fanbase' ? 'Fanbase Report' : 'Attendance Log'} for <span className="text-[#D4AF37] font-bold">{req.targetName}</span>.
                              </p>
                              {req.reason && (
                                <p className="text-[8px] text-[#A09E9A]/70 italic mt-1 leading-relaxed">
                                  Reason: {req.reason}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await setDoc(doc(db, 'edit_requests', req.id), { status: 'Approved' }, { merge: true });
                                    await FirebaseService.logSystemActivity(`Admin approved edit request from ${req.requesterName} for ${req.reportType} report`, 'Info');
                                  } catch (err) {
                                    console.error("Approve edit request failed:", err);
                                  }
                                }}
                                className="flex-1 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[8px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await setDoc(doc(db, 'edit_requests', req.id), { status: 'Denied' }, { merge: true });
                                    await FirebaseService.logSystemActivity(`Admin denied edit request from ${req.requesterName} for ${req.reportType} report`, 'Warning');
                                  } catch (err) {
                                    console.error("Deny edit request failed:", err);
                                  }
                                }}
                                className="flex-1 py-1 bg-slate-800 hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 text-[8px] font-black uppercase tracking-wider rounded-lg cursor-pointer transition-colors"
                              >
                                Deny
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="text-[9px] text-[#A09E9A]/40 italic py-3">No active requests requiring attention.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleLogout = async () => {
    navigate('/');
    await FirebaseService.logSystemActivity(`User logged out: ${authState.nickname || authState.name} (Poppo ID: ${authState.poppo_id}, Role: ${authState.role})`, 'Info');
    Storage.clearAuthState();
    await signOut(auth);
  };

  const getSideNavLinks = () => {
    const links: any[] = [];
    
    // Base Menu for all logged-in users
    links.push({ path: '/dashboard', label: 'Overview', icon: LayoutDashboard });
    links.push({ path: '/roster', label: 'Roster', icon: Users });
    links.push({ path: '/calendar', label: 'Calendar', icon: Calendar });
    links.push({ path: '/my-profile', label: 'My Profile', icon: User });

    const role = (authState.role || '').toLowerCase();
    
    if (role === 'director' || role === 'head admin' || role === 'head_admin') {
      links.push({ isDivider: true, id: 'div-1' });
      links.push({ isTitle: true, label: "Director's Hub", id: 'title-director' });
      
      links.push({ path: '/profiles', label: 'Roster Management', icon: Users });
      
      links.push({ 
        id: 'dropdown-dashboard',
        isDropdown: true,
        label: 'Dashboard',
        icon: LayoutDashboard,
        subLinks: [
          { path: '/director-operations', label: 'Operations', icon: Activity },
          { path: '/system-logs', label: 'System Logs', icon: FileText }
        ]
      });
      
      if (role === 'director') {
        links.push({ isDivider: true, id: 'div-2' });
        links.push({ isTitle: true, label: "Directors Access", id: 'title-access' });
        links.push({ path: '/provision-user', label: 'Provision User', icon: Plus });
        links.push({ path: '/financial-data', label: 'Reporting', icon: DollarSign });
      }
    } else if (role === 'manager' || role === 'agent') {
      links.push({ isDivider: true, id: 'div-manager' });
      links.push({ path: '/analytics', label: 'Team Analytics', icon: TrendingUp });
    }

    return links;
  };

  const getBottomNavLinks = () => {
    return [
      { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { path: '/roster', label: 'Roster', icon: Users },
      { path: '/calendar', label: 'Calendar', icon: Calendar },
      { path: '/my-profile', label: 'My Profile', icon: User },
    ];
  };

  const sideNavLinks = getSideNavLinks();
  const bottomNavLinks = getBottomNavLinks();

  return (
    <div className="flex flex-col h-[100dvh] bg-transparent text-[#F0EFE8] overflow-hidden selection:bg-[#D4AF37]/30 selection:text-white">
      {authState.mockRole && (
        <div className="w-full bg-indigo-600 text-white text-xs font-bold py-2 flex items-center justify-center gap-4 z-[9999] shrink-0 sticky top-0 shadow-lg px-4 text-center">
          <span>
            Currently viewing as <span className="uppercase text-amber-300 font-extrabold">{authState.nickname || authState.name}</span>
          </span>
          <button 
            onClick={async () => {
              try {
                await FirebaseService.logSystemActivity(
                  `Director session restored. Ended impersonation of "${authState.nickname || authState.name}" (Poppo ID: ${authState.poppo_id})`,
                  'Info'
                );
              } catch (err) {
                console.error("Failed to log impersonation exit:", err);
              }
              Storage.setMockUser(null);
              window.location.reload();
            }}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md transition-colors font-black text-[10px] uppercase tracking-wider cursor-pointer"
          >
            Exit / Return to Director
          </button>
        </div>
      )}
      <header className="md:hidden flex items-center justify-between p-4 bg-[#0F0A06]/95 border-b border-[#D4AF37]/20 backdrop-blur-md shrink-0 z-20 shadow-[0_4px_20px_rgba(212,175,55,0.08)]">
        <div className="flex items-center gap-3">
          <img src={appLogo} alt="Nine Dashboard" className="w-8 h-8 rounded-md border border-white/10 shrink-0 object-cover" />
          <div className="flex flex-col">
            <h1 className="text-[11px] font-black uppercase tracking-widest text-[#D4AF37] leading-tight">NINE TALENT MANAGEMENT</h1>
            <div className="text-[10px] text-[#A09E9A] flex items-center gap-2">
              <span className="capitalize">{authState.name} ({authState.role || 'Guest'})</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {renderNotificationCenter()}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-2.5 text-[#D4AF37] hover:text-[#F0EFE8] rounded-full bg-[#140e0a]/90 hover:bg-[#1c1511] transition-all cursor-pointer border border-[#D4AF37]/20 hover:border-[#D4AF37]/45 active:scale-95 flex items-center justify-center shrink-0 shadow-md"
            title="Toggle Menu"
            type="button"
          >
            {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <aside className={cn(
          "absolute md:static inset-y-0 left-0 w-64 bg-[#140E0A] border-r border-[#D4AF37]/10 z-30 transition-transform duration-300 ease-in-out flex flex-col",
          !isSidebarOpen && "-translate-x-full md:translate-x-0"
        )}>
          <div className="p-6 hidden md:flex items-center gap-3 border-b border-white/5">
            <img src={appLogo} alt="Nine Dashboard" className="w-10 h-10 rounded-md border border-[#D4AF37]/30 shrink-0 object-cover" />
            <div className="flex flex-col">
              <h1 className="text-[11px] font-black uppercase tracking-widest text-[#D4AF37] leading-tight mt-1">NINE TALENT MANAGEMENT</h1>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto space-y-2">
            <div className="mb-6 px-2 flex items-center justify-between">
              <div className="flex-1 overflow-hidden">
                <div className="text-sm font-bold truncate pr-2">{authState.name}</div>
                <div className="text-xs text-[#A09E9A] capitalize">{authState.role}</div>
              </div>
              <div className="flex items-center bg-black/20 rounded-full p-1 border border-white/5 shadow-inner shrink-0">
                <button
                  onClick={() => setViewMode('desktop')}
                  className={cn(
                    "p-1.5 rounded-full transition-all duration-300",
                    currentViewMode === 'desktop' 
                      ? "bg-[#D4AF37] text-black shadow-[0_0_10px_rgba(212,175,55,0.4)]" 
                      : "text-[#A09E9A] hover:text-white"
                  )}
                  title="Desktop View"
                >
                  <Monitor size={14} />
                </button>
                <button
                  onClick={() => setViewMode('mobile')}
                  className={cn(
                    "p-1.5 rounded-full transition-all duration-300",
                    currentViewMode === 'mobile' 
                      ? "bg-[#D4AF37] text-black shadow-[0_0_10px_rgba(212,175,55,0.4)]" 
                      : "text-[#A09E9A] hover:text-white"
                  )}
                  title="Mobile View"
                >
                  <Smartphone size={14} />
                </button>
              </div>
            </div>

            {sideNavLinks.map((link) => {
              if (link.isDivider) {
                return <div key={link.id} className="border-t border-white/5 my-4 mx-3" />;
              }
              if (link.isTitle) {
                return (
                  <div key={link.id} className="text-[9px] font-black text-[#A09E9A]/40 uppercase tracking-[0.2em] px-3 mb-2 mt-2">
                    {link.label}
                  </div>
                );
              }

              const Icon = link.icon;

              if (link.isDropdown) {
                const isAnyChildActive = link.subLinks.some((sl: any) => location.pathname.startsWith(sl.path));
                const isOpen = openDropdowns[link.id];
                return (
                  <div key={link.id} className="space-y-1">
                    <button
                      onClick={() => toggleDropdown(link.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all font-bold text-sm",
                        isAnyChildActive || isOpen
                          ? "bg-[#D4AF37]/10 text-[#D4AF37] shadow-[inset_0_0_12px_rgba(212,175,55,0.05)]" 
                          : "text-[#A09E9A] hover:bg-white/[0.02] hover:text-[#F0EFE8]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} />
                        <span>{link.label}</span>
                      </div>
                      <ChevronDown size={14} className={cn("transition-transform duration-200", isOpen ? "rotate-180" : "")} />
                    </button>
                    {isOpen && (
                      <div className="pl-11 pr-2 py-1 flex flex-col gap-1">
                        {link.subLinks.map((subLink: any) => {
                          const isSubActive = location.pathname.startsWith(subLink.path);
                          const SubIcon = subLink.icon;
                          return (
                            <Link
                              key={subLink.path}
                              to={subLink.path}
                              onClick={() => setIsSidebarOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all font-bold text-xs",
                                isSubActive
                                  ? "bg-[#D4AF37]/10 text-[#D4AF37]"
                                  : "text-[#A09E9A] hover:text-[#F0EFE8] hover:bg-white/5"
                              )}
                            >
                               {SubIcon && <SubIcon size={14} />}
                              <span>{subLink.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-bold text-sm",
                    isActive 
                      ? "bg-[#D4AF37]/10 text-[#D4AF37] shadow-[inset_0_0_12px_rgba(212,175,55,0.05)]" 
                      : "text-[#A09E9A] hover:bg-white/[0.02] hover:text-[#F0EFE8]"
                  )}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="p-4 border-t border-white/5">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-3 w-full text-left rounded-xl transition-all text-red-400 hover:bg-red-500/10 font-bold text-sm"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col relative overflow-hidden bg-transparent">
          {/* Desktop Header */}
          <header className="hidden md:flex items-center justify-between px-8 py-4 bg-[#140E0A] border-b border-[#D4AF37]/10 shrink-0 z-20 h-16 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">Niners Portal Dashboard</span>
            </div>
            
            <div className="flex items-center gap-4">
              {renderNotificationCenter()}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 custom-scrollbar">
            {children || <Outlet />}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-4 left-0 right-0 flex items-center justify-center gap-2 px-4 pb-safe z-50 pointer-events-none">
        {bottomNavLinks.map(tab => {
          const Icon = tab.icon;
          const isActive = location.pathname.startsWith(tab.path);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                "pointer-events-auto flex flex-col items-center justify-center flex-1 py-2 rounded-xl transition-all duration-300 backdrop-blur-md border",
                isActive
                  ? "bg-[#1C120C]/90 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.25)] scale-105"
                  : "bg-[#0F0A06]/75 border-[#D4AF37]/20 text-[#A09E9A] hover:border-[#D4AF37]/50"
              )}
            >
              <Icon size={16} className={isActive ? "text-[#D4AF37]" : "text-[#A09E9A]"} />
              <span className={cn(
                "text-[8px] font-black uppercase tracking-wider mt-0.5",
                isActive ? "text-[#D4AF37]" : "text-[#A09E9A]"
              )}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

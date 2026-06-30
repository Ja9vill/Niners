import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, ListTodo, CheckCircle, AlertTriangle, TrendingUp, Loader2, X, Activity
} from 'lucide-react';
import { db } from '../lib/firebase';
import { Storage } from '../lib/storage';
import { FirebaseService } from '../lib/firebaseService';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { useAnalytics } from '../hooks/useAnalytics';
import { TeamLeaderboard } from '../components/TeamLeaderboard';
import { SingleDatePicker } from '../components/InteractiveDatePicker';
import { cn } from '../lib/utils';
import { Host } from '../types';

export const Analytics = () => {
  const rootAuth = Storage.getAuthState();
  const managerPoppoId = String(rootAuth?.poppo_id || rootAuth?.poppoId || rootAuth?.id || '');

  const [assignedHostsList, setAssignedHostsList] = useState<any[]>([]);
  const [isLoadingAssignedHosts, setIsLoadingAssignedHosts] = useState(true);

  // Team Analytics Hub States
  const [teamPerformanceReports, setTeamPerformanceReports] = useState<any[]>([]);
  const [teamFanbaseReports, setTeamFanbaseReports] = useState<any[]>([]);
  const [teamPkReports, setTeamPkReports] = useState<any[]>([]);
  const [teamEvents, setTeamEvents] = useState<any[]>([]);
  const [teamCalendarEvents, setTeamCalendarEvents] = useState<any[]>([]);
  const [teamTasks, setTeamTasks] = useState<any[]>([]);
  const [analyticsTab, setAnalyticsTab] = useState<'insights' | 'radar'>('insights');
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);

  // Task Assignment Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskType, setTaskType] = useState('Coaching');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [isTaskSubmitting, setIsTaskSubmitting] = useState(false);
  const [taskSuccess, setTaskSuccess] = useState('');
  const [taskError, setTaskError] = useState('');
  const [isNotifying, setIsNotifying] = useState(false);

  // Toast States
  const [toasts, setToasts] = useState<any[]>([]);
  const [toastIdCounter, setToastIdCounter] = useState(0);

  const showToast = (type: 'success' | 'error', message: string) => {
    const id = toastIdCounter;
    setToastIdCounter(prev => prev + 1);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Fetch assigned hosts
  useEffect(() => {
    const userRoleLower = String(rootAuth?.role || '').toLowerCase();
    if ((userRoleLower === 'agent' || userRoleLower === 'manager') && managerPoppoId) {
      const fetchAssignedHosts = async () => {
        setIsLoadingAssignedHosts(true);
        try {
          const list = await FirebaseService.getAllRoleMetadata();
          const filtered = list.filter(u => {
            const uRole = String(u.role || '').toLowerCase();
            const mgrId = String(u.assigned_manager_poppo_id || u.assignedManagerId || '');
            return (uRole === 'host' || uRole === 'talent') && mgrId === String(managerPoppoId);
          });
          setAssignedHostsList(filtered);
        } catch (err) {
          console.error("Failed to load assigned hosts:", err);
        } finally {
          setIsLoadingAssignedHosts(false);
        }
      };
      fetchAssignedHosts();
    } else {
      setIsLoadingAssignedHosts(false);
    }
  }, [rootAuth?.role, managerPoppoId]);

  // Fetch team analytics data for the managed hosts
  useEffect(() => {
    const userRoleLower = String(rootAuth?.role || '').toLowerCase();
    if ((userRoleLower !== 'agent' && userRoleLower !== 'manager') || !managerPoppoId || assignedHostsList.length === 0) {
      setIsLoadingAnalytics(false);
      return;
    }

    const loadAnalyticsData = async () => {
      setIsLoadingAnalytics(true);
      try {
        const hostIds = assignedHostsList.map(h => String(h.poppo_id || h.poppoId || h.id || ''));

        // Fetch concurrently
        const [perfSnap, fanSnap, pkSnap, eventsSnap, calendarSnap, tasksSnap] = await Promise.all([
          getDocs(collection(db, 'performance_reports')),
          getDocs(collection(db, 'fanbase_reports')),
          getDocs(collection(db, 'pk_reports')),
          getDocs(collection(db, 'attendance')),
          getDocs(collection(db, 'calendar')),
          getDocs(query(collection(db, 'tasks'), where('assignerId', '==', managerPoppoId)))
        ]);

        const perfList: any[] = [];
        perfSnap.forEach(docSnap => {
          const data = docSnap.data();
          if (hostIds.includes(String(data.poppoId || ''))) {
            perfList.push({ id: docSnap.id, ...data });
          }
        });
        setTeamPerformanceReports(perfList);

        const fanList: any[] = [];
        fanSnap.forEach(docSnap => {
          const data = docSnap.data();
          if (hostIds.includes(String(data.poppoId || ''))) {
            fanList.push({ id: docSnap.id, ...data });
          }
        });
        setTeamFanbaseReports(fanList);

        const pkList: any[] = [];
        pkSnap.forEach(docSnap => {
          const data = docSnap.data();
          if (hostIds.includes(String(data.poppoId || ''))) {
            pkList.push({ id: docSnap.id, ...data });
          }
        });
        setTeamPkReports(pkList);

        const eventsList: any[] = [];
        eventsSnap.forEach(docSnap => {
          const data = docSnap.data();
          const participantIds = data.participant_ids || [];
          if (participantIds.some((id: string) => hostIds.includes(String(id)))) {
            eventsList.push({ id: docSnap.id, ...data });
          }
        });
        setTeamEvents(eventsList);

        const calendarList: any[] = [];
        calendarSnap.forEach(docSnap => {
          const data = docSnap.data();
          const participantIds = data.participant_ids || [];
          const hasManagedHost = 
            Array.isArray(participantIds) && participantIds.some((id: any) => hostIds.includes(String(id)));
          if (hasManagedHost) {
            calendarList.push({ id: docSnap.id, ...data });
          }
        });
        setTeamCalendarEvents(calendarList);

        const tasksList: any[] = [];
        tasksSnap.forEach(docSnap => {
          tasksList.push({ id: docSnap.id, ...docSnap.data() });
        });
        setTeamTasks(tasksList);
      } catch (err) {
        console.error('[TeamAnalytics] Error loading analytics data:', err);
      } finally {
        setIsLoadingAnalytics(false);
      }
    };

    loadAnalyticsData();
  }, [assignedHostsList, rootAuth?.role, managerPoppoId]);

  // Helpers to read field variants with fallback conversion for small hours values
  const getLiveDurationMins = (r: any): number => {
    const m = r?.liveDurationMinutes ?? r?.live_duration_minutes ?? r?.earningsBreakdown?.liveDurationMinutes ?? r?.earningsBreakdown?.live_duration_minutes;
    if (m !== undefined && m !== null && m !== '') {
      return Number(m);
    }
    const h = r?.liveDuration ?? r?.live_duration ?? r?.liveHours ?? r?.live_hours ?? r?.earningsBreakdown?.liveDuration ?? r?.earningsBreakdown?.live_duration;
    if (h !== undefined && h !== null && h !== '') {
      const val = Number(h);
      return val <= 100 ? val * 60 : val;
    }
    return 0;
  };

  const getPartyDurationMins = (r: any): number => {
    const m = r?.partyHostDurationMinutes ?? r?.party_host_duration_minutes ?? r?.earningsBreakdown?.partyHostDurationMinutes ?? r?.earningsBreakdown?.party_host_duration_minutes;
    if (m !== undefined && m !== null && m !== '') {
      return Number(m);
    }
    const h = r?.partyHostDuration ?? r?.partyDuration ?? r?.party_duration ?? r?.party_host_duration ?? r?.earningsBreakdown?.partyHostDuration ?? r?.earningsBreakdown?.partyDuration ?? r?.earningsBreakdown?.party_duration;
    if (h !== undefined && h !== null && h !== '') {
      const val = Number(h);
      return val <= 100 ? val * 60 : val;
    }
    return 0;
  };

  // Map assignedHostsList for useAnalytics hook
  const analyticsHosts = useMemo(() => {
    return assignedHostsList.map(h => ({
      poppoId: String(h.poppo_id || h.poppoId || h.id || ''),
      nickname: String(h.nickname || h.name || ''),
      role: String(h.role || 'host')
    }));
  }, [assignedHostsList]);

  // Aggregate statistics for Dashboard View
  const stats = useMemo(() => {
    let totalLiveMinutes = 0;
    let totalPartyMinutes = 0;
    let totalPoints = 0;

    teamPerformanceReports.forEach(r => {
      totalLiveMinutes += getLiveDurationMins(r);
      totalPartyMinutes += getPartyDurationMins(r);
      totalPoints += Number(r.earningsBreakdown?.totalEarningsOfPoints || 0);
    });

    return {
      hostCount: assignedHostsList.length,
      liveHrs: (totalLiveMinutes / 60).toFixed(1),
      partyHrs: (totalPartyMinutes / 60).toFixed(1),
      points: totalPoints.toLocaleString(),
      eventsCount: teamCalendarEvents.length
    };
  }, [assignedHostsList.length, teamPerformanceReports, teamCalendarEvents.length]);

  // Call the analytics calculation hook
  const { insightsList, radarList } = useAnalytics(analyticsHosts, teamPkReports, teamEvents, teamPerformanceReports, teamFanbaseReports, teamTasks);

  if (isLoadingAssignedHosts || isLoadingAnalytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
        <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]">Syncing Analytics...</p>
      </div>
    );
  }

  // Task Assignment Modal Handlers
  const openTaskModalForInsight = (insight: any) => {
    setTaskAssigneeId(insight.poppoId);
    setTaskTitle(insight.suggestedTaskTitle);
    setTaskType(insight.taskType || 'Coaching');
    setTaskDescription(insight.suggestedTaskContent);
    // Default due date to 7 days from now (YYYY-MM-DD)
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const dateStr = weekFromNow.toISOString().split('T')[0];
    setTaskDueDate(dateStr);
    setTaskSuccess('');
    setTaskError('');
    setIsTaskModalOpen(true);
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskAssigneeId || !taskTitle || !taskDueDate) {
      setTaskError('Please fill out all required fields.');
      return;
    }
    setIsTaskSubmitting(true);
    setTaskSuccess('');
    setTaskError('');

    try {
      const taskId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      const newTask = {
        taskId,
        assignerId: managerPoppoId, // Manager/Agent ID
        assigneeId: taskAssigneeId, // Target host ID
        assignedToUserId: taskAssigneeId, // UI compatibility
        relatedPoppoId: taskAssigneeId, // UI compatibility
        taskType,
        title: taskTitle,
        description: taskDescription,
        content: taskDescription, // Firestore rules compatibility
        status: 'Assigned',
        dueDate: taskDueDate,
        createdAt: new Date().toISOString()
      };

      // Direct write to /tasks/{taskId}
      await setDoc(doc(db, 'tasks', taskId), newTask);
      
      const managerName = rootAuth?.nickname || rootAuth?.name || 'Manager';
      await FirebaseService.logSystemActivity(`Manager ${managerName} assigned task "${taskTitle}" to host ${taskAssigneeId}`, 'Info');
      
      setTaskSuccess(`Successfully assigned task "${taskTitle}" to host ${taskAssigneeId}!`);
      showToast('success', `Task assigned to ${taskAssigneeId}`);
      setTimeout(() => {
        setIsTaskModalOpen(false);
        setTaskSuccess('');
      }, 2000);
    } catch (err: any) {
      console.error('[TeamAnalytics] Error assigning task:', err);
      setTaskError(err.message || 'Failed to create and assign task.');
    } finally {
      setIsTaskSubmitting(false);
    }
  };

  const handleNotifyHost = async () => {
    if (!taskAssigneeId || !taskTitle) {
      setTaskError('Assignee and Task Title are required to send a notification.');
      return;
    }
    setIsNotifying(true);
    setTaskError('');
    setTaskSuccess('');
    
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetPoppoId: taskAssigneeId,
          title: 'New Task Assigned',
          body: `New Task: ${taskTitle}. Tap to view.`
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send notification');
      
      setTaskSuccess(`Push notification sent to host ${taskAssigneeId}!`);
      showToast('success', `Notification sent to ${taskAssigneeId}`);
    } catch (err: any) {
      console.error('Notify Error:', err);
      setTaskError(err.message || 'Notification failed.');
    } finally {
      setIsNotifying(false);
    }
  };

  return (
    <div className="mx-auto w-full pt-2 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between pb-4 border-b border-white/5 shrink-0">
        <div className="flex flex-col">
          <span className="text-lg font-black text-[#F0EFE8] leading-tight tracking-[0.05em]">TEAM PERFORMANCE ANALYTICS</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Niners Portal</span>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-3xl transition-all duration-300 hover:border-[#D4AF37]/30 group shadow-lg space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] text-sm shadow-inner">📊</div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8]">Team Analytics Hub</h4>
            <p className="text-[9px] text-[#A09E9A] uppercase tracking-wider mt-0.5 font-bold">Consolidated performance metrics and insights</p>
          </div>
        </div>

          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-[#1A1A28]/40 border border-[#D4AF37]/10 p-3 rounded-xl flex flex-col justify-between shadow-sm">
                <span className="text-[8px] font-bold text-[#A09E9A] uppercase tracking-wider">Managed Hosts</span>
                <span className="text-lg font-black text-white mt-1">{stats.hostCount}</span>
              </div>
              <div className="bg-[#1A1A28]/40 border border-[#D4AF37]/10 p-3 rounded-xl flex flex-col justify-between shadow-sm">
                <span className="text-[8px] font-bold text-[#A09E9A] uppercase tracking-wider">Total Live Duration</span>
                <span className="text-lg font-black text-white mt-1">{stats.liveHrs} Hrs</span>
              </div>
              <div className="bg-[#1A1A28]/40 border border-[#D4AF37]/10 p-3 rounded-xl flex flex-col justify-between shadow-sm">
                <span className="text-[8px] font-bold text-[#A09E9A] uppercase tracking-wider">Total Party Duration</span>
                <span className="text-lg font-black text-white mt-1">{stats.partyHrs} Hrs</span>
              </div>
              <div className="bg-[#1A1A28]/40 border border-[#D4AF37]/10 p-3 rounded-xl flex flex-col justify-between shadow-sm">
                <span className="text-[8px] font-bold text-[#A09E9A] uppercase tracking-wider">Event Exposure</span>
                <span className="text-lg font-black text-white mt-1">{stats.eventsCount} Events</span>
              </div>
            </div>

            {/* Team Leaderboard */}
            <div className="my-1">
              <TeamLeaderboard managedHosts={analyticsHosts as any} performanceReports={teamPerformanceReports} />
            </div>

            {/* Tabbed switcher for Insights & Radar */}
            <div className="bg-[#1A1A28]/40 border border-[#D4AF37]/10 p-3.5 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-[#D4AF37]/10 pb-2.5 flex-wrap gap-2">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setAnalyticsTab('insights')}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border cursor-pointer ${
                      analyticsTab === 'insights'
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                        : 'text-[#A09E9A] border-transparent hover:text-white'
                    }`}
                  >
                    <Zap size={10} className={analyticsTab === 'insights' ? 'animate-pulse' : ''} />
                    <span>Alerts ({insightsList.length})</span>
                  </button>
                  <button
                    onClick={() => setAnalyticsTab('radar')}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border cursor-pointer ${
                      analyticsTab === 'radar'
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                        : 'text-[#A09E9A] border-transparent hover:text-white'
                    }`}
                  >
                    <TrendingUp size={10} />
                    <span>Radar ({radarList.length})</span>
                  </button>
                </div>
                <span className="text-[8px] text-slate-500 font-mono font-bold tracking-wider uppercase">Analytics Hub</span>
              </div>

              {analyticsTab === 'insights' ? (
                <div className="space-y-2.5">
                  {insightsList.length === 0 ? (
                    <div className="p-4 text-center text-[#A09E9A]/60 text-xs italic">
                      No critical exposure alerts or coaching requirements detected. All metrics are on track!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {insightsList.map((insight, index) => {
                        const isLowExposure = insight.type === 'LOW_EXPOSURE';
                        const isVolumeDeficit = insight.type === 'VOLUME_DEFICIT';
                        return (
                          <div
                            key={index}
                            className={`p-3 rounded-xl border flex flex-col justify-between min-h-[120px] transition-all hover:scale-[1.01] duration-300 ${
                              isLowExposure || isVolumeDeficit
                                ? 'border-indigo-500/20 bg-indigo-950/10 hover:border-indigo-500/35'
                                : 'border-rose-500/20 bg-rose-950/10 hover:border-rose-500/35'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                                    isLowExposure || isVolumeDeficit
                                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                  }`}
                                >
                                  {isLowExposure ? 'Low Exposure' : isVolumeDeficit ? 'Volume Deficit' : 'Coaching'}
                                </span>
                                <span className="text-[8px] font-mono text-slate-500">ID: {insight.poppoId}</span>
                              </div>
                              <h4 className="text-white text-xs font-black line-clamp-1">{insight.title}</h4>
                              <p className="text-[#A09E9A] text-[10px] leading-snug line-clamp-2">{insight.description}</p>
                            </div>

                            <button
                              onClick={() => openTaskModalForInsight(insight)}
                              className={`w-full mt-2 py-1 px-2.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all duration-250 cursor-pointer flex items-center justify-center gap-1 shadow-md active:scale-95 ${
                                isLowExposure || isVolumeDeficit
                                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                  : 'bg-rose-600 hover:bg-rose-500 text-white'
                              }`}
                            >
                              <ListTodo size={9} />
                              <span>Assign Task</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {radarList.length === 0 ? (
                    <div className="p-4 text-center text-[#A09E9A]/60 text-xs italic">
                      No growth assessments available.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {radarList.map((radar, index) => (
                        <div key={index} className="bg-[#1A1A28]/40 border border-[#D4AF37]/10 p-2.5 rounded-lg flex flex-col gap-2">
                          <div className="flex items-center justify-between border-b border-[#D4AF37]/10 pb-1.5">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-black text-white text-[10px]">
                                {radar.healthScore}
                              </div>
                              <div>
                                <h4 className="text-white text-xs font-bold truncate max-w-[120px]">{radar.nickname}</h4>
                                <p className="text-[8px] text-slate-500 font-mono">ID: {radar.poppoId}</p>
                              </div>
                            </div>
                            <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                              Health Score
                            </span>
                          </div>
                          
                          {radar.recommendations.length > 0 ? (
                            <div className="space-y-1.5">
                              <p className="text-[8px] font-bold text-[#A09E9A] uppercase tracking-wider">Progressive Targets</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {radar.recommendations.map((rec, rIdx) => (
                                  <div key={rIdx} className="bg-slate-900 border border-[#D4AF37]/10 p-2 rounded flex flex-col justify-between">
                                    <div>
                                      <h5 className="text-white text-[10px] font-bold mb-0.5">{rec.title}</h5>
                                      <p className="text-[#A09E9A] text-[9px] leading-normal mb-1.5 line-clamp-2">{rec.description}</p>
                                    </div>
                                    <button
                                      onClick={() => openTaskModalForInsight(rec)}
                                      className="w-full py-1 px-2.5 rounded text-[8px] font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1 transition-all cursor-pointer"
                                    >
                                      <ListTodo size={8} />
                                      <span>Assign Target</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-[9px] text-[#A09E9A]/50 italic">No progressive targets identified.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recent Performance list */}
            <div className="bg-[#1A1A28]/40 border border-[#D4AF37]/10 rounded-xl overflow-hidden p-3.5">
              <h3 className="text-[10px] font-black text-white uppercase tracking-wider mb-2">Team Performance Logs</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[9px]">
                  <thead>
                    <tr className="border-b border-[#D4AF37]/10 text-[#A09E9A] font-bold uppercase tracking-wider bg-[#1A1A28]/60">
                      <th className="py-2 px-2.5">Poppo ID</th>
                      <th className="py-2 px-2.5">Period</th>
                      <th className="py-2 px-2.5">Level</th>
                      <th className="py-2 px-2.5">Live Duration</th>
                      <th className="py-2 px-2.5">Party Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D4AF37]/10 text-slate-300">
                    {teamPerformanceReports.length > 0 ? (
                      teamPerformanceReports.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                          <td className="py-2 px-2.5 font-mono">{r.poppoId}</td>
                          <td className="py-2 px-2.5 capitalize text-[8px]">{r.periodType} ({r.month}/{r.year})</td>
                          <td className="py-2 px-2.5">Lvl {r.level}</td>
                          <td className="py-2 px-2.5">{(getLiveDurationMins(r) / 60).toFixed(1)} Hrs</td>
                          <td className="py-2 px-2.5">{(getPartyDurationMins(r) / 60).toFixed(1)} Hrs</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500 italic">No performance reports submitted for your hosts yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
      </div>

      {/* Task Assignment Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#101018] border border-white/10 rounded-3xl w-full max-w-md p-6 relative shadow-2xl flex flex-col gap-5">
            <button
              onClick={() => setIsTaskModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close modal"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <ListTodo className="text-indigo-400" size={18} />
                <span>Task Assignment Desk</span>
              </h3>
              <p className="text-slate-400 text-[11px] mt-1">Finalize and delegate this instruction task to the team host.</p>
            </div>

            <form onSubmit={handleTaskSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Assignee (Host)</label>
                <select
                  value={taskAssigneeId}
                  onChange={(e) => setTaskAssigneeId(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  title="Assignee"
                  aria-label="Assignee"
                >
                  <option value="" disabled>Select a Host</option>
                  {analyticsHosts.map(h => (
                    <option key={h.poppoId} value={h.poppoId}>
                      {h.nickname} - {h.poppoId}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Task Type</label>
                <input
                  type="text"
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  placeholder="e.g. Visibility"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                  title="Task Type"
                  aria-label="Task Type"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Task Title</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Participate in next event"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                  title="Task Title"
                  aria-label="Task Title"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Task Guidelines / Description</label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Provide instructions..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white h-24 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                  title="Task Description"
                  aria-label="Task Description"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Due Date</label>
                <SingleDatePicker
                  id="task-due-date"
                  name="dueDate"
                  value={taskDueDate}
                  onChange={(val) => setTaskDueDate(val)}
                  required
                  title="Due Date"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isTaskSubmitting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                >
                  {isTaskSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{isTaskSubmitting ? 'Delegating...' : 'Delegate Task'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleNotifyHost}
                  disabled={isNotifying || !taskAssigneeId || !taskTitle}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                >
                  {isNotifying && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{isNotifying ? 'Sending...' : 'Notify Host'}</span>
                </button>
              </div>

              {taskSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-bold flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span>{taskSuccess}</span>
                </div>
              )}

              {taskError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-bold flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>{taskError}</span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-xl transition-all duration-300 pointer-events-auto transform translate-y-0 opacity-100",
              toast.type === 'success' 
                ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                : "bg-rose-950/90 border-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
            )}
          >
            <span className="text-sm">
              {toast.type === 'success' ? '✅' : '❌'}
            </span>
            <span className="text-xs font-bold tracking-wide">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Analytics;

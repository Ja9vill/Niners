import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, addDoc, Timestamp, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Storage } from '../lib/storage';
import { HostLookupSelect } from './HostLookupSelect';
import { HostProfileView } from './HostProfileView';
import { useRoleGuard, useUserRole } from './RoleGuard';
import { TeamLeaderboard } from './TeamLeaderboard';
import { useAnalytics } from '../hooks/useAnalytics';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  TrendingUp, 
  Calendar, 
  Plus, 
  Loader2, 
  ShieldCheck, 
  CheckCircle,
  AlertTriangle,
  Zap,
  ListTodo,
  X
} from 'lucide-react';

interface HostUser {
  poppoId: string;
  nickname: string;
  role: string;
  assignedManagerId: string | null;
}

export const ManagerDashboard: React.FC = () => {
  const [subTab, setSubTab] = useState<'dashboard' | 'reporting' | 'users'>('dashboard');
  const [managedHosts, setManagedHosts] = useState<HostUser[]>([]);
  const [performanceReports, setPerformanceReports] = useState<any[]>([]);
  const [fanbaseReports, setFanbaseReports] = useState<any[]>([]);
  const [pkReports, setPkReports] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Selected host for profile view spotlight
  const [selectedProfileHost, setSelectedProfileHost] = useState<any | null>(null);

  // Role validation for Host Isolation
  const { role, isSuperAdmin } = useUserRole();

  // Compute team insights
  const { insightsList, radarList } = useAnalytics(managedHosts, pkReports, events, performanceReports, fanbaseReports, tasks);

  // Task Assignment Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskType, setTaskType] = useState('Coaching');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [isTaskSubmitting, setIsTaskSubmitting] = useState(false);
  const [taskSuccess, setTaskSuccess] = useState('');
  const [taskError, setTaskError] = useState('');

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
        assignerId: managerPoppoId, // Manager/Agent ID (auth.currentUser.uid)
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
      
      setTaskSuccess(`Successfully assigned task "${taskTitle}" to host ${taskAssigneeId}!`);
      setTimeout(() => {
        setIsTaskModalOpen(false);
        setTaskSuccess('');
      }, 2000);
    } catch (err: any) {
      console.error('[ManagerDashboard] Error assigning task:', err);
      setTaskError(err.message || 'Failed to create and assign task.');
    } finally {
      setIsTaskSubmitting(false);
    }
  };

  const authState = Storage.getAuthState();
  const managerPoppoId = authState.poppo_id || '';
  const isDirector = useRoleGuard();

  // Load team data (hosts managed by this user)
  useEffect(() => {
    const loadTeamData = async () => {
      if (!managerPoppoId) return;
      setIsLoading(true);
      try {
        // 1. Fetch managed hosts
        const hostsQuery = query(
          collection(db, 'users'), 
          where('assignedManagerId', '==', managerPoppoId)
        );
        const hostsSnap = await getDocs(hostsQuery);
        const hostsList: HostUser[] = [];
        hostsSnap.forEach(doc => {
          const data = doc.data();
          hostsList.push({
            poppoId: String(data.poppoId),
            nickname: String(data.nickname || ''),
            role: String(data.role || ''),
            assignedManagerId: String(data.assignedManagerId || '')
          });
        });
        setManagedHosts(hostsList);

        if (hostsList.length === 0) {
          setIsLoading(false);
          return;
        }

        const hostIds = hostsList.map(h => h.poppoId);

        // 2. Fetch Performance Reports
        const perfSnap = await getDocs(collection(db, 'performance_reports'));
        const perfList: any[] = [];
        perfSnap.forEach(doc => {
          const data = doc.data();
          if (hostIds.includes(data.poppoId)) {
            perfList.push({ id: doc.id, ...data });
          }
        });
        setPerformanceReports(perfList);

        // 3. Fetch Fanbase Reports
        const fanSnap = await getDocs(collection(db, 'fanbase_reports'));
        const fanList: any[] = [];
        fanSnap.forEach(doc => {
          const data = doc.data();
          if (hostIds.includes(data.poppoId)) {
            fanList.push({ id: doc.id, ...data });
          }
        });
        setFanbaseReports(fanList);

        // 4. Fetch PK Reports
        const pkSnap = await getDocs(collection(db, 'pk_reports'));
        const pkList: any[] = [];
        pkSnap.forEach(doc => {
          const data = doc.data();
          if (hostIds.includes(data.poppoId)) {
            pkList.push({ id: doc.id, ...data });
          }
        });
        setPkReports(pkList);

        // 5. Fetch Events
        const eventsSnap = await getDocs(collection(db, 'events'));
        const eventsList: any[] = [];
        eventsSnap.forEach(doc => {
          const data = doc.data();
          // Filter events featuring any managed host in participantIds
          const participantIds = data.participantIds || [];
          const hasManagedHost = participantIds.some((id: string) => hostIds.includes(id));
          if (hasManagedHost) {
            eventsList.push({ id: doc.id, ...data });
          }
        });
        setEvents(eventsList);

        // 6. Fetch Tasks assigned by this manager
        const tasksQuery = query(
          collection(db, 'tasks'),
          where('assignerId', '==', managerPoppoId)
        );
        const tasksSnap = await getDocs(tasksQuery);
        const tasksList: any[] = [];
        tasksSnap.forEach(doc => {
          tasksList.push({ id: doc.id, ...doc.data() });
        });
        setTasks(tasksList);

      } catch (error) {
        console.error('[ManagerDashboard] Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTeamData();
  }, [managerPoppoId]);

  // Aggregate statistics for Dashboard View
  const stats = useMemo(() => {
    let totalLiveMinutes = 0;
    let totalPartyMinutes = 0;
    let totalPoints = 0;

    performanceReports.forEach(r => {
      totalLiveMinutes += Number(r.liveDurationMinutes || 0);
      totalPartyMinutes += Number(r.partyHostDurationMinutes || 0);
      totalPoints += Number(r.earningsBreakdown?.totalEarningsOfPoints || 0);
    });

    return {
      hostCount: managedHosts.length,
      liveHrs: (totalLiveMinutes / 60).toFixed(1),
      partyHrs: (totalPartyMinutes / 60).toFixed(1),
      points: totalPoints.toLocaleString(),
      eventsCount: events.length
    };
  }, [managedHosts, performanceReports, events]);

  // Form State for submits
  const [reportType, setReportType] = useState<'fanbase' | 'pk' | 'performance'>('fanbase');
  const [formPoppoId, setFormPoppoId] = useState('');
  const [formNickname, setFormNickname] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form input states
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [periodType, setPeriodType] = useState('weekly');
  const [level, setLevel] = useState(1);
  const [liveDurationMinutes, setLiveDurationMinutes] = useState(0);
  const [partyHostDurationMinutes, setPartyHostDurationMinutes] = useState(0);

  // Fanbase fields
  const [currentFollowers, setCurrentFollowers] = useState(0);
  const [fanclubSubscribers, setFanclubSubscribers] = useState(0);
  const [fanclubGcMembers, setFanclubGcMembers] = useState(0);
  const [gcUpdatesHost, setGcUpdatesHost] = useState(0);
  const [gcUpdatesFans, setGcUpdatesFans] = useState(0);

  // PK fields
  const [pkWinPercent, setPkWinPercent] = useState(0);
  const [pkPoints, setPkPoints] = useState(0);
  const [pkSessions, setPkSessions] = useState(0);

  // Financial Fields
  const [totalEarningsOfPoints, setTotalEarningsOfPoints] = useState(0);
  const [agentCommission, setAgentCommission] = useState(0);
  const [liveEarnings, setLiveEarnings] = useState(0);
  const [partyEarnings, setPartyEarnings] = useState(0);
  const [privateChatEarnings, setPrivateChatEarnings] = useState(0);
  const [tips, setTips] = useState(0);
  const [platformReward, setPlatformReward] = useState(0);
  const [otherEarnings, setOtherEarnings] = useState(0);
  const [platformHourlySalary, setPlatformHourlySalary] = useState(0);
  const [superSalary, setSuperSalary] = useState(0);
  const [superRank, setSuperRank] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [averageAcu, setAverageAcu] = useState(0);
  const [newFans, setNewFans] = useState(0);
  const [newFanClubMembers, setNewFanClubMembers] = useState(0);
  const [giftingThisWeek, setGiftingThisWeek] = useState(0);
  const [unfollowers, setUnfollowers] = useState(0);
  const [totalEarningsPast3Months, setTotalEarningsPast3Months] = useState(0);

  const resetForm = () => {
    setFormPoppoId('');
    setFormNickname('');
    setFromDate('');
    setToDate('');
    setLiveDurationMinutes(0);
    setPartyHostDurationMinutes(0);
    setCurrentFollowers(0);
    setFanclubSubscribers(0);
    setFanclubGcMembers(0);
    setGcUpdatesHost(0);
    setGcUpdatesFans(0);
    setPkWinPercent(0);
    setPkPoints(0);
    setPkSessions(0);
    setTotalEarningsOfPoints(0);
    setAgentCommission(0);
    setLiveEarnings(0);
    setPartyEarnings(0);
    setPrivateChatEarnings(0);
    setTips(0);
    setPlatformReward(0);
    setOtherEarnings(0);
    setPlatformHourlySalary(0);
    setSuperSalary(0);
    setSuperRank(0);
    setTotalDuration(0);
    setTotalEarnings(0);
    setAverageAcu(0);
    setNewFans(0);
    setNewFanClubMembers(0);
    setGiftingThisWeek(0);
    setUnfollowers(0);
    setTotalEarningsPast3Months(0);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitSuccess('');
    setSubmitError('');

    if (!formPoppoId || !formNickname) {
      setSubmitError('Please select a valid host.');
      setIsSubmitting(false);
      return;
    }

    try {
      const idToken = await auth.currentUser?.getIdToken();
      let endpoint = '';
      let body: any = {};

      if (reportType === 'fanbase') {
        endpoint = '/api/reports/fanbase';
        body = {
          fromDate: fromDate ? new Date(fromDate).toISOString() : new Date().toISOString(),
          toDate: toDate ? new Date(toDate).toISOString() : new Date().toISOString(),
          poppoId: formPoppoId,
          nickname: formNickname,
          currentFollowers: Number(currentFollowers),
          fanclubSubscribers: Number(fanclubSubscribers),
          fanclubGcMembers: Number(fanclubGcMembers),
          gcUpdatesHost: Number(gcUpdatesHost),
          gcUpdatesFans: Number(gcUpdatesFans)
        };
      } else if (reportType === 'pk') {
        endpoint = '/api/reports/pk';
        body = {
          fromDate: fromDate ? new Date(fromDate).toISOString() : new Date().toISOString(),
          toDate: toDate ? new Date(toDate).toISOString() : new Date().toISOString(),
          poppoId: formPoppoId,
          nickname: formNickname,
          pkWinPercent: Number(pkWinPercent),
          pkPoints: Number(pkPoints),
          pkSessions: Number(pkSessions)
        };
      } else if (reportType === 'performance') {
        endpoint = '/api/reports/performance';
        body = {
          poppoId: formPoppoId,
          year: Number(year),
          month: Number(month),
          periodType,
          fromDate: fromDate ? new Date(fromDate).toISOString() : new Date().toISOString(),
          toDate: toDate ? new Date(toDate).toISOString() : new Date().toISOString(),
          level: Number(level),
          liveDurationMinutes: Number(liveDurationMinutes),
          partyHostDurationMinutes: Number(partyHostDurationMinutes),
          earningsBreakdown: {
            totalDuration: Number(totalDuration),
            averageAcu: Number(averageAcu),
            newFans: Number(newFans),
            newFanClubMembers: Number(newFanClubMembers),
            giftingThisWeek: Number(giftingThisWeek),
            unfollowers: Number(unfollowers),
            // Financial Fields (gated in UI & Backend)
            totalEarningsOfPoints: isDirector ? Number(totalEarningsOfPoints) : 0,
            agentCommission: isDirector ? Number(agentCommission) : 0,
            liveEarnings: isDirector ? Number(liveEarnings) : 0,
            partyEarnings: isDirector ? Number(partyEarnings) : 0,
            privateChatEarnings: isDirector ? Number(privateChatEarnings) : 0,
            tips: isDirector ? Number(tips) : 0,
            platformReward: isDirector ? Number(platformReward) : 0,
            otherEarnings: isDirector ? Number(otherEarnings) : 0,
            platformHourlySalary: isDirector ? Number(platformHourlySalary) : 0,
            superSalary: isDirector ? Number(superSalary) : 0,
            superRank: isDirector ? Number(superRank) : 0,
            totalEarnings: isDirector ? Number(totalEarnings) : 0,
            totalEarningsPast3Months: isDirector ? Number(totalEarningsPast3Months) : 0
          }
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server rejected submission');
      }

      setSubmitSuccess('Report successfully validated and saved to Firestore!');
      resetForm();
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Host Isolation (RBAC)
  if (!isSuperAdmin && !['manager', 'agent', 'admin', 'head admin'].includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 select-none">
        <div className="w-16 h-16 rounded-2xl bg-red-950/30 flex items-center justify-center border border-red-900/50 shadow-lg shadow-red-950/20">
          <span className="text-2xl">🔒</span>
        </div>
        <p className="text-[#A09E9A] font-semibold text-sm">Access Denied</p>
        <p className="text-[#A09E9A]/60 text-xs text-center max-w-sm">This panel is restricted to Managers and Team Agents. If you are a host, please navigate back to your profile.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Syncing Team Metrics...</p>
      </div>
    );
  }

  // Spotlight view of Host Profile Detail
  if (selectedProfileHost) {
    const formattedHost = {
      id: selectedProfileHost.poppoId,
      name: selectedProfileHost.nickname,
      nickname: selectedProfileHost.nickname,
      role: selectedProfileHost.role,
      manager: managerPoppoId,
      status: 'Active',
      level: 1,
      tier: 'X',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    return (
      <HostProfileView 
        host={formattedHost as any} 
        isReadOnly={true} 
        onClose={() => setSelectedProfileHost(null)} 
      />
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[60vh] max-w-6xl mx-auto">
      {/* Sidebar navigation */}
      <aside className="w-full md:w-56 shrink-0 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-1.5 shadow-md">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2">Team Hub</h3>
        
        <button
          onClick={() => setSubTab('dashboard')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
            subTab === 'dashboard'
              ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setSubTab('reporting')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
            subTab === 'reporting'
              ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <FileText size={16} />
          <span>Reporting Tools</span>
        </button>

        <button
          onClick={() => setSubTab('users')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
            subTab === 'users'
              ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <Users size={16} />
          <span>User Management</span>
        </button>
      </aside>

      {/* Main Panel Content */}
      <main className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-md">
        
        {/* Tab 1: Dashboard */}
        {subTab === 'dashboard' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">Manager Overview</h2>
              <p className="text-slate-400 text-xs mt-1">Scoped view for team statistics managed by you.</p>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800/60 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Managed Hosts</span>
                <span className="text-2xl font-black text-white mt-2">{stats.hostCount}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800/60 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Live Duration</span>
                <span className="text-2xl font-black text-white mt-2">{stats.liveHrs} Hrs</span>
              </div>
              <div className="bg-slate-900 border border-slate-800/60 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Party Duration</span>
                <span className="text-2xl font-black text-white mt-2">{stats.partyHrs} Hrs</span>
              </div>
              <div className="bg-slate-900 border border-slate-800/60 p-4 rounded-2xl flex flex-col justify-between shadow-sm">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Event Exposure</span>
                <span className="text-2xl font-black text-white mt-2">{stats.eventsCount} Events</span>
              </div>
            </div>

            <div className="mb-6">
              <TeamLeaderboard managedHosts={managedHosts} performanceReports={performanceReports} />
            </div>

            {/* Insights Panel */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Zap className="h-4 w-4 text-indigo-400 animate-pulse" />
                  <span>Team Performance & Exposure Insights</span>
                </h3>
              </div>

              {insightsList.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800/60 p-6 rounded-2xl text-center text-slate-500 text-xs italic">
                  No critical exposure alerts or coaching requirements detected for your team hosts. All metrics are on track!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insightsList.map((insight, index) => {
                    const isLowExposure = insight.type === 'LOW_EXPOSURE';
                    const isVolumeDeficit = insight.type === 'VOLUME_DEFICIT';
                    return (
                      <div
                        key={index}
                        className={`p-5 rounded-2xl border flex flex-col justify-between h-48 transition-all hover:scale-[1.01] duration-300 ${
                          isLowExposure || isVolumeDeficit
                            ? 'border-indigo-500/20 bg-indigo-950/10 hover:border-indigo-500/35'
                            : 'border-rose-500/20 bg-rose-950/10 hover:border-rose-500/35'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                isLowExposure || isVolumeDeficit
                                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}
                            >
                              {isLowExposure ? 'Low Exposure' : isVolumeDeficit ? 'Volume Deficit' : 'Coaching Required'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">ID: {insight.poppoId}</span>
                          </div>
                          <h4 className="text-white text-sm font-extrabold line-clamp-1">{insight.title}</h4>
                          <p className="text-slate-400 text-xs leading-relaxed line-clamp-3 font-medium">{insight.description}</p>
                        </div>

                        <button
                          onClick={() => openTaskModalForInsight(insight)}
                          className={`w-full mt-3 py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-250 cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95 ${
                            isLowExposure || isVolumeDeficit
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                              : 'bg-rose-600 hover:bg-rose-500 text-white'
                          }`}
                        >
                          <ListTodo size={12} />
                          <span>{isLowExposure ? 'Assign Visibility Task' : isVolumeDeficit ? 'Assign Engagement Task' : 'Assign Practice Task'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Growth Radar Panel */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span>Holistic Growth Radar</span>
                </h3>
              </div>
              
              {radarList.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800/60 p-6 rounded-2xl text-center text-slate-500 text-xs italic">
                  No hosts available for growth assessment.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {radarList.map((radar, index) => (
                    <div key={index} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-white">
                            {radar.healthScore}
                          </div>
                          <div>
                            <h4 className="text-white text-sm font-black truncate max-w-[150px] sm:max-w-[200px]">{radar.nickname}</h4>
                            <p className="text-[10px] text-slate-500 font-mono">ID: {radar.poppoId}</p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          Health Score
                        </span>
                      </div>
                      
                      {radar.recommendations.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Progressive Targets</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {radar.recommendations.map((rec, rIdx) => (
                              <div key={rIdx} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                                <div>
                                  <h5 className="text-white text-xs font-bold mb-1">{rec.title}</h5>
                                  <p className="text-slate-400 text-[10px] leading-relaxed mb-3">{rec.description}</p>
                                </div>
                                <button
                                  onClick={() => openTaskModalForInsight(rec)}
                                  className="w-full py-2 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 transition-all"
                                >
                                  <ListTodo size={10} />
                                  <span>Assign Target</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No progressive targets identified for this week.</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent performance list */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-5">
              <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">Team Performance Logs</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider bg-slate-900/60">
                      <th className="py-2.5 px-3">Poppo ID</th>
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3">Level</th>
                      <th className="py-2.5 px-3">Live Duration</th>
                      <th className="py-2.5 px-3">Party Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300">
                    {performanceReports.length > 0 ? (
                      performanceReports.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                          <td className="py-2.5 px-3 font-mono">{r.poppoId}</td>
                          <td className="py-2.5 px-3 capitalize">{r.periodType} ({r.month}/{r.year})</td>
                          <td className="py-2.5 px-3">Lvl {r.level}</td>
                          <td className="py-2.5 px-3">{(Number(r.liveDurationMinutes || 0) / 60).toFixed(1)} Hrs</td>
                          <td className="py-2.5 px-3">{(Number(r.partyHostDurationMinutes || 0) / 60).toFixed(1)} Hrs</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 italic">No performance reports submitted for your hosts yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Reporting Tools */}
        {subTab === 'reporting' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">Report Submission</h2>
              <p className="text-slate-400 text-xs mt-1">Submit fanbase, pk, or performance reports directly to Firestore.</p>
            </div>

            {/* Select Report Type */}
            <div className="flex gap-2.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800 w-fit">
              <button
                onClick={() => { setReportType('fanbase'); setSubmitSuccess(''); setSubmitError(''); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  reportType === 'fanbase' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Fanbase
              </button>
              <button
                onClick={() => { setReportType('pk'); setSubmitSuccess(''); setSubmitError(''); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  reportType === 'pk' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                PK Wins
              </button>
              <button
                onClick={() => { setReportType('performance'); setSubmitSuccess(''); setSubmitError(''); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  reportType === 'performance' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Performance
              </button>
            </div>

            {/* Submit Forms */}
            <form onSubmit={handleReportSubmit} className="space-y-4 bg-slate-900/40 border border-slate-800 p-6 rounded-2xl">
              
              {/* Host Lookup select component */}
              <HostLookupSelect
                poppoId={formPoppoId}
                nickname={formNickname}
                onChange={(id, nick) => { setFormPoppoId(id); setFormNickname(nick); }}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Fanbase fields */}
              {reportType === 'fanbase' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Current Followers</label>
                    <input
                      type="number"
                      value={currentFollowers}
                      onChange={(e) => setCurrentFollowers(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Fanclub Subscribers</label>
                    <input
                      type="number"
                      value={fanclubSubscribers}
                      onChange={(e) => setFanclubSubscribers(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Fanclub GC Members</label>
                    <input
                      type="number"
                      value={fanclubGcMembers}
                      onChange={(e) => setFanclubGcMembers(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">GC Updates (Host)</label>
                    <input
                      type="number"
                      value={gcUpdatesHost}
                      onChange={(e) => setGcUpdatesHost(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">GC Updates (Fans)</label>
                    <input
                      type="number"
                      value={gcUpdatesFans}
                      onChange={(e) => setGcUpdatesFans(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white"
                    />
                  </div>
                </div>
              )}

              {/* PK fields */}
              {reportType === 'pk' && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">PK Win Percentage (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={pkWinPercent}
                      onChange={(e) => setPkWinPercent(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">PK Points</label>
                    <input
                      type="number"
                      value={pkPoints}
                      onChange={(e) => setPkPoints(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">PK Sessions</label>
                    <input
                      type="number"
                      value={pkSessions}
                      onChange={(e) => setPkSessions(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white"
                    />
                  </div>
                </div>
              )}

              {/* Performance fields */}
              {reportType === 'performance' && (
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Year</label>
                      <input
                        type="number"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Month</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={month}
                        onChange={(e) => setMonth(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Level</label>
                      <input
                        type="number"
                        value={level}
                        onChange={(e) => setLevel(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Period Type</label>
                      <select
                        value={periodType}
                        onChange={(e) => setPeriodType(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Live Duration (Minutes)</label>
                      <input
                        type="number"
                        value={liveDurationMinutes}
                        onChange={(e) => setLiveDurationMinutes(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Party Host Duration (Minutes)</label>
                      <input
                        type="number"
                        value={partyHostDurationMinutes}
                        onChange={(e) => setPartyHostDurationMinutes(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  {/* Non-financial fields inside earningsBreakdown */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider mt-4">Self-Reported Breakdown (Host View)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Total Duration</label>
                        <input
                          type="number"
                          value={totalDuration}
                          onChange={(e) => setTotalDuration(Number(e.target.value))}
                          className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Average ACU</label>
                        <input
                          type="number"
                          value={averageAcu}
                          onChange={(e) => setAverageAcu(Number(e.target.value))}
                          className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">New Fans</label>
                        <input
                          type="number"
                          value={newFans}
                          onChange={(e) => setNewFans(Number(e.target.value))}
                          className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">New Fanclub Members</label>
                        <input
                          type="number"
                          value={newFanClubMembers}
                          onChange={(e) => setNewFanClubMembers(Number(e.target.value))}
                          className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Gifting This Week</label>
                        <input
                          type="number"
                          value={giftingThisWeek}
                          onChange={(e) => setGiftingThisWeek(Number(e.target.value))}
                          className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1">Unfollowers</label>
                        <input
                          type="number"
                          value={unfollowers}
                          onChange={(e) => setUnfollowers(Number(e.target.value))}
                          className="w-full px-4 py-2 bg-slate-955 border border-slate-800 rounded-lg text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Task 4: Financial fields conditionally rendered via useRoleGuard hook */}
                  {isDirector ? (
                    <div className="space-y-4 pt-4 border-t border-dashed border-indigo-500/20">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="text-emerald-400 h-4 w-4" />
                        <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">Agent Financial Fields (Gated)</h4>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Total Earnings points</label>
                          <input
                            type="number"
                            value={totalEarningsOfPoints}
                            onChange={(e) => setTotalEarningsOfPoints(Number(e.target.value))}
                            className="w-full px-4 py-2 bg-slate-955 border border-emerald-900/30 rounded-lg text-white focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Agent Commission</label>
                          <input
                            type="number"
                            value={agentCommission}
                            onChange={(e) => setAgentCommission(Number(e.target.value))}
                            className="w-full px-4 py-2 bg-slate-955 border border-emerald-900/30 rounded-lg text-white focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Live Earnings</label>
                          <input
                            type="number"
                            value={liveEarnings}
                            onChange={(e) => setLiveEarnings(Number(e.target.value))}
                            className="w-full px-4 py-2 bg-slate-955 border border-emerald-900/30 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Party Earnings</label>
                          <input
                            type="number"
                            value={partyEarnings}
                            onChange={(e) => setPartyEarnings(Number(e.target.value))}
                            className="w-full px-4 py-2 bg-slate-955 border border-emerald-900/30 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Private Chat Earnings</label>
                          <input
                            type="number"
                            value={privateChatEarnings}
                            onChange={(e) => setPrivateChatEarnings(Number(e.target.value))}
                            className="w-full px-4 py-2 bg-slate-955 border border-emerald-900/30 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Tips</label>
                          <input
                            type="number"
                            value={tips}
                            onChange={(e) => setTips(Number(e.target.value))}
                            className="w-full px-4 py-2 bg-slate-955 border border-emerald-900/30 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Platform Reward</label>
                          <input
                            type="number"
                            value={platformReward}
                            onChange={(e) => setPlatformReward(Number(e.target.value))}
                            className="w-full px-4 py-2 bg-slate-955 border border-emerald-900/30 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Other Earnings</label>
                          <input
                            type="number"
                            value={otherEarnings}
                            onChange={(e) => setOtherEarnings(Number(e.target.value))}
                            className="w-full px-4 py-2 bg-slate-955 border border-emerald-900/30 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Platform Hourly Salary</label>
                          <input
                            type="number"
                            value={platformHourlySalary}
                            onChange={(e) => setPlatformHourlySalary(Number(e.target.value))}
                            className="w-full px-4 py-2 bg-slate-955 border border-emerald-900/30 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Super Salary</label>
                          <input
                            type="number"
                            value={superSalary}
                            onChange={(e) => setSuperSalary(Number(e.target.value))}
                            className="w-full px-4 py-2 bg-slate-955 border border-emerald-900/30 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Super Rank</label>
                          <input
                            type="number"
                            value={superRank}
                            onChange={(e) => setSuperRank(Number(e.target.value))}
                            className="w-full px-4 py-2 bg-slate-955 border border-emerald-900/30 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Total Earnings</label>
                          <input
                            type="number"
                            value={totalEarnings}
                            onChange={(e) => setTotalEarnings(Number(e.target.value))}
                            className="w-full px-4 py-2 bg-slate-955 border border-emerald-900/30 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Earnings Past 3 Months</label>
                          <input
                            type="number"
                            value={totalEarningsPast3Months}
                            onChange={(e) => setTotalEarningsPast3Months(Number(e.target.value))}
                            className="w-full px-4 py-2 bg-slate-955 border border-emerald-900/30 rounded-lg text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start gap-2.5">
                      <AlertTriangle className="text-amber-500 h-4 w-4 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-500/80 leading-relaxed font-semibold">
                        Financial data fields are hidden and locked. Only Director accounts are permitted to write or edit agent financial metrics.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Status and Action Panel */}
              <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Report'}</span>
                </button>
              </div>

              {submitSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span>{submitSuccess}</span>
                </div>
              )}

              {submitError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>{submitError}</span>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Tab 3: User Management */}
        {subTab === 'users' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">My Managed Roster</h2>
              <p className="text-slate-400 text-xs mt-1">List of registered hosts assigned to your team.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider bg-slate-900/60">
                      <th className="py-3 px-4">Nickname</th>
                      <th className="py-3 px-4">Poppo ID</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300">
                    {managedHosts.length > 0 ? (
                      managedHosts.map((h, i) => (
                        <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                          <td className="py-3 px-4 font-bold">{h.nickname}</td>
                          <td className="py-3 px-4 font-mono">{h.poppoId}</td>
                          <td className="py-3 px-4 capitalize">{h.role}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setSelectedProfileHost(h)}
                              className="px-3 py-1.5 bg-slate-800 border border-slate-700 hover:border-indigo-500 hover:text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                            >
                              View Profile
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500 italic">No assigned hosts found on your team.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Task Assignment Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-955/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl flex flex-col gap-5">
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  title="Assignee"
                  aria-label="Assignee"
                >
                  {managedHosts.map(h => (
                    <option key={h.poppoId} value={h.poppoId}>
                      {h.nickname} ({h.poppoId})
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white h-24 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  required
                  title="Task Description"
                  aria-label="Task Description"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Due Date</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none [color-scheme:dark]"
                  required
                  title="Due Date"
                  aria-label="Due Date"
                />
              </div>

              <button
                type="submit"
                disabled={isTaskSubmitting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
              >
                {isTaskSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{isTaskSubmitting ? 'Delegating...' : 'Delegate Task'}</span>
              </button>

              {taskSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle size={16} />
                  <span>{taskSuccess}</span>
                </div>
              )}

              {taskError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>{taskError}</span>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

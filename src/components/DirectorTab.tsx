/* eslint-disable */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Shield, 
  FileUp, 
  Clipboard, 
  CheckCircle2, 
  History, 
  Trash2, 
  FolderPlus, 
  ArrowRight, 
  Zap, 
  AlertCircle, 
  FileText, 
  Loader2, 
  Activity, 
  UserPlus, 
  Edit2, 
  X, 
  LayoutDashboard, 
  Database, 
  Target, 
  Briefcase, 
  Users, 
  Plus, 
  Lock,
  Award,
  ListTodo
} from 'lucide-react';
import { Storage } from '../lib/storage';
import { 
  Host, 
  CommissionEntry, 
  Task, 
  ActivityAuditLog, 
  TopNinersEarningsSummary, 
  EventsCalendarPublic 
} from '../types';
import { cn, formatMonth, formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { FirebaseService } from '../lib/firebaseService';
import { MANAGERS, BASE_SALARY_POLICIES } from '../lib/constants';
import { FinancialUpload } from './FinancialUpload';

// --- Types for AI Recommendations ---
interface AIInsight {
  id: string;
  ruleType: 'performance_drop' | 'profile_gap' | 'attendance_multiplier';
  priority: 'High' | 'Medium' | 'Low';
  triggerMetric: string;
  suggestedAction: string;
  hostId: string;
  hostName: string;
  details: string;
  meta: any;
}

// --- Fallback UUID Generator ---
const getUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const DirectorTab = () => {
  const localAuth = Storage.getAuthState();
  const isDirector = localAuth.role?.toLowerCase() === 'director';
  const hasAccess = isDirector;

  // Sidebar views: overview, awards, tasks, roster_admin, financials
  const [activeView, setActiveView] = useState<'overview' | 'awards' | 'tasks' | 'roster_admin' | 'financials'>('overview');
  
  // Data State
  const [hosts, setHosts] = useState<Host[]>([]);
  const [commissions, setCommissions] = useState<CommissionEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [auditLogs, setAuditLogs] = useState<ActivityAuditLog[]>([]);
  const [earningsSummaries, setEarningsSummaries] = useState<TopNinersEarningsSummary[]>([]);
  
  // UI states
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recalculation engine states
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [lastCalculationTime, setLastCalculationTime] = useState<number>(0);
  // Password manager states
  const [selectedHostForPasswordId, setSelectedHostForPasswordId] = useState<string>('');
  const [targetPassword, setTargetPassword] = useState<string>('');

  // Commission editing states
  const [editingCommissionId, setEditingCommissionId] = useState<string | null>(null);
  const [editPoppoName, setEditPoppoName] = useState<string>('');
  const [editTotalPoints, setEditTotalPoints] = useState<number>(0);
  const [editMyCommission, setEditMyCommission] = useState<number>(0);

  // Merge workflow states
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [existingHost, setExistingHost] = useState<Host | null>(null);
  const [incomingHost, setIncomingHost] = useState<Host | null>(null);
  const [resolvedFields, setResolvedFields] = useState<Partial<Host>>({});
  const [pasteFormat, setPasteFormat] = useState<'monthly' | 'weekly'>('monthly');
  const [rosterPasteText, setRosterPasteText] = useState('');
  const [duplicateQueue, setDuplicateQueue] = useState<Host[]>([]);

  // Storage Financial Ledger states
  const [financialTab, setFinancialTab] = useState<'monthly' | 'weekly'>('monthly');
  const [monthlyLedger, setMonthlyLedger] = useState<any[]>([]);
  const [weeklyLedger, setWeeklyLedger] = useState<any[]>([]);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [isSavingFinancials, setIsSavingFinancials] = useState(false);

  const handleCellChange = (index: number, field: string, value: any) => {
    const ledger = financialTab === 'monthly' ? monthlyLedger : weeklyLedger;
    const setLedger = financialTab === 'monthly' ? setMonthlyLedger : setWeeklyLedger;

    const updated = [...ledger];
    updated[index] = { ...updated[index], [field]: value };

    // Intelligent Cross-Referencing Hook: auto-fill nickname when poppo_id changes
    if (field === 'poppo_id') {
      const cleanId = String(value).trim();
      const matchingHost = hosts.find(h => String(h.id).trim() === cleanId);
      if (matchingHost) {
        updated[index].nickname = matchingHost.nickname || matchingHost.name;
      }
    }

    setLedger(updated);
  };

  const handleAddRow = () => {
    const setLedger = financialTab === 'monthly' ? setMonthlyLedger : setWeeklyLedger;
    const newRow = financialTab === 'monthly' ? {
      poppo_id: '',
      month: new Date().toISOString().slice(0, 7),
      year: new Date().getFullYear(),
      nickname: '',
      live_duration: 0,
      party_host_duration: 0,
      total_points: 0,
      agent_commission: 0,
      live_earnings: 0,
      party_earnings: 0,
      private_chat: 0,
      tips: 0,
      platform_reward: 0,
      other_earnings: 0,
      platform_hourly_salary: 0,
      super_salary: 0,
      super_rank: 0,
      level: 0
    } : {
      poppo_id: '',
      from_date: new Date().toISOString().slice(0, 10),
      to_date: new Date().toISOString().slice(0, 10),
      nickname: '',
      live_duration: 0,
      party_host_duration: 0,
      total_points: 0,
      agent_commission: 0,
      live_earnings: 0,
      party_earnings: 0,
      private_chat: 0,
      tips: 0,
      platform_reward: 0,
      other_earnings: 0,
      platform_hourly_salary: 0,
      super_salary: 0,
      super_rank: 0,
      level: 0
    };
    setLedger(prev => [...prev, newRow]);
  };

  const handleDeleteSelection = () => {
    const ledger = financialTab === 'monthly' ? monthlyLedger : weeklyLedger;
    const setLedger = financialTab === 'monthly' ? setMonthlyLedger : setWeeklyLedger;

    const remaining = ledger.filter((_, idx) => !selectedRows[`${financialTab}_${idx}`]);
    setLedger(remaining);

    // Clear selection for deleted rows
    const nextSelected = { ...selectedRows };
    Object.keys(nextSelected).forEach(key => {
      if (key.startsWith(`${financialTab}_`)) {
        delete nextSelected[key];
      }
    });
    setSelectedRows(nextSelected);
    showSuccess(`Deleted selected rows locally. Click "Save Changes" to upload to Firebase Storage.`);
  };

  const handleBulkPaste = (text: string) => {
    if (!text.trim()) return;
    const rows = text.split('\n').filter(r => r.trim() !== '').map(r => r.split('\t'));
    const setLedger = financialTab === 'monthly' ? setMonthlyLedger : setWeeklyLedger;

    const startIdx = (rows[0] && (
      rows[0][0]?.toLowerCase().includes('poppo') ||
      rows[0][0]?.toLowerCase().includes('id') ||
      rows[0][1]?.toLowerCase().includes('date') ||
      rows[0][1]?.toLowerCase().includes('month')
    )) ? 1 : 0;

    const parsed: any[] = [];
    for (let i = startIdx; i < rows.length; i++) {
      const r = rows[i];
      if (r.length < 3) continue;

      const poppoId = r[0]?.trim() || '';
      const matchingHost = hosts.find(h => String(h.id).trim() === poppoId);
      const nickname = r[3]?.trim() || (matchingHost ? (matchingHost.nickname || matchingHost.name) : 'Pending Intake');

      if (financialTab === 'monthly') {
        parsed.push({
          poppo_id: poppoId,
          month: r[1]?.trim() || '',
          year: parseInt(r[2]?.replace(/,/g, '')) || new Date().getFullYear(),
          nickname: nickname,
          live_duration: parseFloat(r[4]) || 0,
          party_host_duration: parseFloat(r[5]) || 0,
          total_points: parseInt(r[6]?.replace(/,/g, '')) || 0,
          agent_commission: parseInt(r[7]?.replace(/,/g, '')) || 0,
          live_earnings: parseInt(r[8]?.replace(/,/g, '')) || 0,
          party_earnings: parseInt(r[9]?.replace(/,/g, '')) || 0,
          private_chat: parseInt(r[10]?.replace(/,/g, '')) || 0,
          tips: parseInt(r[11]?.replace(/,/g, '')) || 0,
          platform_reward: parseInt(r[12]?.replace(/,/g, '')) || 0,
          other_earnings: parseInt(r[13]?.replace(/,/g, '')) || 0,
          platform_hourly_salary: parseInt(r[14]?.replace(/,/g, '')) || 0,
          super_salary: parseInt(r[15]?.replace(/,/g, '')) || 0,
          super_rank: parseInt(r[16]?.replace(/,/g, '')) || 0,
          level: parseInt(r[17]?.replace(/,/g, '')) || 0
        });
      } else {
        parsed.push({
          poppo_id: poppoId,
          from_date: r[1]?.trim() || '',
          to_date: r[2]?.trim() || '',
          nickname: nickname,
          live_duration: parseFloat(r[4]) || 0,
          party_host_duration: parseFloat(r[5]) || 0,
          total_points: parseInt(r[6]?.replace(/,/g, '')) || 0,
          agent_commission: parseInt(r[7]?.replace(/,/g, '')) || 0,
          live_earnings: parseInt(r[8]?.replace(/,/g, '')) || 0,
          party_earnings: parseInt(r[9]?.replace(/,/g, '')) || 0,
          private_chat: parseInt(r[10]?.replace(/,/g, '')) || 0,
          tips: parseInt(r[11]?.replace(/,/g, '')) || 0,
          platform_reward: parseInt(r[12]?.replace(/,/g, '')) || 0,
          other_earnings: parseInt(r[13]?.replace(/,/g, '')) || 0,
          platform_hourly_salary: parseInt(r[14]?.replace(/,/g, '')) || 0,
          super_salary: parseInt(r[15]?.replace(/,/g, '')) || 0,
          super_rank: parseInt(r[16]?.replace(/,/g, '')) || 0,
          level: parseInt(r[17]?.replace(/,/g, '')) || 0
        });
      }
    }
    setLedger(prev => [...prev, ...parsed]);
    showSuccess(`Successfully added ${parsed.length} rows locally. Click "Save Changes" to upload.`);
  };

  const handleXlsxImport = async (data: any[]) => {
    const parsed: any[] = [];
    const helperFind = (row: any, keys: string[], defaultVal: any = '') => {
      const match = Object.keys(row).find(k => {
        const ck = k.trim().toLowerCase().replace(/[\s_-]+/g, '');
        return keys.some(pk => pk.toLowerCase().replace(/[\s_-]+/g, '') === ck);
      });
      return match ? row[match] : defaultVal;
    };

    for (const r of data) {
      const poppoId = String(helperFind(r, ['poppo_id', 'poppoid', 'poppo id', 'id', 'uid'])).trim();
      if (!poppoId) continue;

      const matchingHost = hosts.find(h => String(h.id).trim() === poppoId);
      const nickname = String(helperFind(r, ['nickname', 'nick name', 'nick', 'name', 'poppo_name', 'poppo name'], '')).trim() || 
                       (matchingHost ? (matchingHost.nickname || matchingHost.name) : 'Pending Intake');

      if (financialTab === 'monthly') {
        parsed.push({
          poppo_id: poppoId,
          month: String(helperFind(r, ['month', 'period', 'month_val'], '')),
          year: parseInt(helperFind(r, ['year', 'year_val'], new Date().getFullYear())),
          nickname: nickname,
          live_duration: parseFloat(helperFind(r, ['live_duration', 'live hours', 'live duration'], 0)) || 0,
          party_host_duration: parseFloat(helperFind(r, ['party_host_duration', 'party hours', 'party duration'], 0)) || 0,
          total_points: parseInt(String(helperFind(r, ['total_points', 'total earnings of points', 'points'], 0)).replace(/,/g, '')) || 0,
          agent_commission: parseInt(String(helperFind(r, ['agent_commission', 'agent commission', 'commission'], 0)).replace(/,/g, '')) || 0,
          live_earnings: parseInt(String(helperFind(r, ['live_earnings', 'live earnings'], 0)).replace(/,/g, '')) || 0,
          party_earnings: parseInt(String(helperFind(r, ['party_earnings', 'party earnings'], 0)).replace(/,/g, '')) || 0,
          private_chat: parseInt(String(helperFind(r, ['private_chat', 'private chat'], 0)).replace(/,/g, '')) || 0,
          tips: parseInt(String(helperFind(r, ['tips', 'tip'], 0)).replace(/,/g, '')) || 0,
          platform_reward: parseInt(String(helperFind(r, ['platform_reward', 'platform reward'], 0)).replace(/,/g, '')) || 0,
          other_earnings: parseInt(String(helperFind(r, ['other_earnings', 'other earnings', 'otherearn', 'other_earn'], 0)).replace(/,/g, '')) || 0,
          platform_hourly_salary: parseInt(String(helperFind(r, ['platform_hourly_salary', 'platform hourly salary', 'hourly salary'], 0)).replace(/,/g, '')) || 0,
          super_salary: parseInt(String(helperFind(r, ['super_salary', 'super salary'], 0)).replace(/,/g, '')) || 0,
          super_rank: parseInt(String(helperFind(r, ['super_rank', 'super rank'], 0)).replace(/,/g, '')) || 0,
          level: parseInt(String(helperFind(r, ['level', 'lvl'], 0)).replace(/,/g, '')) || 0
        });
      } else {
        parsed.push({
          poppo_id: poppoId,
          from_date: String(helperFind(r, ['from_date', 'from date', 'fromdate'], '')),
          to_date: String(helperFind(r, ['to_date', 'to date', 'todate'], '')),
          nickname: nickname,
          live_duration: parseFloat(helperFind(r, ['live_duration', 'live hours', 'live duration'], 0)) || 0,
          party_host_duration: parseFloat(helperFind(r, ['party_host_duration', 'party hours', 'party duration'], 0)) || 0,
          total_points: parseInt(String(helperFind(r, ['total_points', 'total earnings of points', 'points'], 0)).replace(/,/g, '')) || 0,
          agent_commission: parseInt(String(helperFind(r, ['agent_commission', 'agent commission', 'commission'], 0)).replace(/,/g, '')) || 0,
          live_earnings: parseInt(String(helperFind(r, ['live_earnings', 'live earnings'], 0)).replace(/,/g, '')) || 0,
          party_earnings: parseInt(String(helperFind(r, ['party_earnings', 'party earnings'], 0)).replace(/,/g, '')) || 0,
          private_chat: parseInt(String(helperFind(r, ['private_chat', 'private chat'], 0)).replace(/,/g, '')) || 0,
          tips: parseInt(String(helperFind(r, ['tips', 'tip'], 0)).replace(/,/g, '')) || 0,
          platform_reward: parseInt(String(helperFind(r, ['platform_reward', 'platform reward'], 0)).replace(/,/g, '')) || 0,
          other_earnings: parseInt(String(helperFind(r, ['other_earnings', 'other earnings', 'otherearn', 'other_earn'], 0)).replace(/,/g, '')) || 0,
          platform_hourly_salary: parseInt(String(helperFind(r, ['platform_hourly_salary', 'platform hourly salary', 'hourly salary'], 0)).replace(/,/g, '')) || 0,
          super_salary: parseInt(String(helperFind(r, ['super_salary', 'super salary'], 0)).replace(/,/g, '')) || 0,
          super_rank: parseInt(String(helperFind(r, ['super_rank', 'super rank'], 0)).replace(/,/g, '')) || 0,
          level: parseInt(String(helperFind(r, ['level', 'lvl'], 0)).replace(/,/g, '')) || 0
        });
      }
    }

    const setLedger = financialTab === 'monthly' ? setMonthlyLedger : setWeeklyLedger;
    setLedger(prev => [...prev, ...parsed]);
    showSuccess(`Successfully imported ${parsed.length} rows from report. Click "Save Changes" to save.`);
  };

  const handleSaveChanges = async () => {
    setIsSavingFinancials(true);
    try {
      const type = financialTab;
      const data = type === 'monthly' ? monthlyLedger : weeklyLedger;
      await FirebaseService.saveFinancials(type, data);
      await auditLogAction('SAVE_FINANCIALS_STORAGE', null, { type, count: data.length });

      if (type === 'monthly') {
        setCommissions(data);
      }

      showSuccess(`${type === 'monthly' ? 'Monthly' : 'Weekly'} financials saved successfully to Firebase Storage.`);
    } catch (err) {
      console.error("Failed to save financials to storage:", err);
      alert("Failed to save financials to Firebase Storage.");
    } finally {
      setIsSavingFinancials(false);
    }
  };

  const processNextDuplicate = (queue: Host[]) => {
    if (queue.length > 0) {
      const nextIncoming = queue[0];
      const nextExisting = hosts.find(h => h.id === nextIncoming.id);
      setDuplicateQueue(queue.slice(1));
      if (nextExisting) {
        setExistingHost(nextExisting);
        setIncomingHost(nextIncoming);
        setResolvedFields({ ...nextIncoming });
        setShowMergeModal(true);
      } else {
        setShowMergeModal(false);
        loadData();
      }
    } else {
      setShowMergeModal(false);
      loadData();
    }
  };

  // Load all master collections
  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const fetchPromise = Promise.all([
        FirebaseService.getAllHosts(),
        FirebaseService.getTasks(),
        FirebaseService.getActivityLogs(),
        FirebaseService.getTopNinersSummary(selectedMonth),
        FirebaseService.fetchFinancials('monthly'),
        FirebaseService.fetchFinancials('weekly')
      ]);
      const timeoutPromise = new Promise<[Host[], Task[], ActivityAuditLog[], TopNinersEarningsSummary[], any[], any[]]>((_, reject) =>
        setTimeout(() => reject(new Error("Director data fetch timed out")), 5000)
      );
      const [hList, tList, aList, summaries, storedMonthly, storedWeekly] = await Promise.race([fetchPromise, timeoutPromise]);
      setHosts(hList.length > 0 ? hList : Storage.getHosts());
      setTasks(tList);
      
      // Sort logs descending
      const sortedLogs = aList.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      setAuditLogs(sortedLogs);
      setEarningsSummaries(summaries);

      // Populate flat-file storage financials states
      setMonthlyLedger(storedMonthly || []);
      setWeeklyLedger(storedWeekly || []);
      setCommissions(storedMonthly || []); // map commissions to monthly flat-file data for overview analytics
    } catch (err) {
      console.error("Failed to load director data", err);
      setErrorMessage("Failed to load databases from cloud network. Local fallback used.");
      setHosts(Storage.getHosts());
      setCommissions(Storage.getCommission());
      setAuditLogs(Storage.getLogs());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      loadData();
    }
  }, [selectedMonth]);

  // --- Crucial Rule Logging Wrapper ---
  const auditLogAction = async (actionType: string, beforeValue: any, afterValue: any) => {
    try {
      const logId = getUUID();
      const logItem: ActivityAuditLog = {
        logId,
        timestamp: new Date().toISOString(),
        actorUserId: localAuth.poppo_id || 'DirectorSystem',
        actionType,
        beforeValue: beforeValue ? JSON.stringify(beforeValue) : 'null',
        afterValue: afterValue ? JSON.stringify(afterValue) : 'null'
      };
      await FirebaseService.logActivity(logItem);
      // Reload logs locally
      const updatedLogs = await FirebaseService.getActivityLogs();
      setAuditLogs(updatedLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    } catch (err) {
      console.error("Activity logging failed", err);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // --- AI RECOMMENDATIONS ENGINE ---
  const runRecommendationsEngine = (force = false) => {
    // Cache-governed: run evaluation loop only if force or older than 2 minutes
    const now = Date.now();
    if (!force && lastCalculationTime > 0 && now - lastCalculationTime < 120000) {
      return; // Use cached insights in state
    }

    const calculatedInsights: AIInsight[] = [];

    // 1. Performance Drops Rule: Month-over-Month points drop by more than 25%
    // Find all hosts that have records in the selectedMonth and the month prior
    const prevMonth = (() => {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const prevDate = new Date(year, month - 2, 1);
      return `${prevDate.getFullYear()}-${(prevDate.getMonth() + 1).toString().padStart(2, '0')}`;
    })();

    hosts.forEach(host => {
      const currentComm = commissions.find(c => c.poppo_id === host.id && c.month === selectedMonth);
      const prevComm = commissions.find(c => c.poppo_id === host.id && c.month === prevMonth);

      if (currentComm && prevComm && prevComm.total_points > 0) {
        const drop = ((prevComm.total_points - currentComm.total_points) / prevComm.total_points) * 100;
        if (drop > 25) {
          calculatedInsights.push({
            id: `drop-${host.id}-${selectedMonth}`,
            ruleType: 'performance_drop',
            priority: 'High',
            triggerMetric: 'totalEarningsPoints',
            suggestedAction: 'Deploy operational coaching reminder',
            hostId: host.id,
            hostName: host.nickname || host.name,
            details: `Points dropped by ${drop.toFixed(1)}% MoM (${prevComm.total_points.toLocaleString()} pts to ${currentComm.total_points.toLocaleString()} pts).`,
            meta: { dropPercentage: drop, prevPoints: prevComm.total_points, currentPoints: currentComm.total_points }
          });
        }
      }

      // 2. Profile Gaps Rule: status 'Active' but profilePhotoUrl/photoUrl parameter is null/empty
      if (host.status === 'Active' && (!host.photoUrl || host.photoUrl.trim() === '')) {
        calculatedInsights.push({
          id: `gap-${host.id}`,
          ruleType: 'profile_gap',
          priority: 'Medium',
          triggerMetric: 'profilePhotoUrl',
          suggestedAction: 'Flag profile data completeness',
          hostId: host.id,
          hostName: host.nickname || host.name,
          details: `Host is status Active but profilePhotoUrl parameter is empty.`,
          meta: {}
        });
      }

      // 3. Attendance Multipliers Rule: Event Participation score exceeds 85%
      // Event Participation score calculated deterministically or from calendar exposures
      const participationRate = (() => {
        // Fallback: use S/A tiers or level metrics to ensure mock data coverage
        if (host.tier === 'S' || host.level > 10) return 92;
        if (host.tier === 'A') return 88;
        return 50;
      })();

      if (participationRate > 85) {
        calculatedInsights.push({
          id: `attendance-${host.id}`,
          ruleType: 'attendance_multiplier',
          priority: 'Low',
          triggerMetric: 'eventParticipation',
          suggestedAction: 'Suggest baseline tier advancement',
          hostId: host.id,
          hostName: host.nickname || host.name,
          details: `Event participation score is ${participationRate}% (Exceeds 85% threshold).`,
          meta: { participationRate }
        });
      }
    });

    setInsights(calculatedInsights);
    setLastCalculationTime(now);
  };

  // Run calculation loop when view mounts or becomes active
  useEffect(() => {
    if (hasAccess && activeView === 'overview') {
      runRecommendationsEngine();
    }
  }, [activeView, hosts, commissions]);

  // Convert AI Insight to Task transactional routine
  const handleConvertRecommendationToTask = async (insight: AIInsight) => {
    const taskId = getUUID();
    const taskItem: Task = {
      taskId,
      assignedToUserId: 'support_staff', // Delegate downward
      relatedPoppoId: insight.hostId,
      taskType: insight.ruleType === 'performance_drop' ? 'Coaching' : insight.ruleType === 'profile_gap' ? 'Complete Profile' : 'Tier Review',
      title: `AI Recommendation: ${insight.suggestedAction}`,
      description: `Targeting: ${insight.hostName} (${insight.hostId}). Rule details: ${insight.details}`,
      status: 'Assigned',
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0] // 7 days from now
    };

    try {
      await FirebaseService.saveTasks([taskItem]);
      await auditLogAction('CONVERT_RECOMMENDATION_TO_TASK', insight, taskItem);
      showSuccess(`Converted AI recommendation to task for ${insight.hostName}`);
      loadData();
    } catch (err) {
      alert("Failed to convert recommendation to task");
    }
  };

  // --- EXCEPTIONS QUEUE EVALUATION ---
  const exceptionQueue = useMemo(() => {
    const gaps: { hostId: string; name: string; gapType: string; severity: 'High' | 'Medium' | 'Low'; details: string }[] = [];
    hosts.filter(h => h.status === 'Active').forEach(host => {
      // 1. Check profile photo gap
      if (!host.photoUrl || host.photoUrl.trim() === '') {
        gaps.push({
          hostId: host.id,
          name: host.nickname || host.name,
          gapType: 'Missing Profile Photo',
          severity: 'Medium',
          details: 'Needs display avatar upload for site directory.'
        });
      }
      // 2. Check current month commission gap
      const currentComm = commissions.find(c => c.poppo_id === host.id && c.month === selectedMonth);
      if (!currentComm) {
        gaps.push({
          hostId: host.id,
          name: host.nickname || host.name,
          gapType: 'Missing Commission Data',
          severity: 'High',
          details: `No commission log uploaded for period: ${selectedMonth}.`
        });
      }
      // 3. Check unassigned team
      if (!host.team || host.team === 'Unassigned' || host.team.trim() === '') {
        gaps.push({
          hostId: host.id,
          name: host.nickname || host.name,
          gapType: 'Team Not Assigned',
          severity: 'Low',
          details: 'Roster status is active but group team label is unassigned.'
        });
      }
    });
    return gaps;
  }, [hosts, commissions, selectedMonth]);

  // Group commission entries by added timestamp
  const groupedCommissions = useMemo(() => {
    const groups: { [key: string]: CommissionEntry[] } = {};
    commissions.forEach(c => {
      const label = c.timestamp ? (() => {
        try {
          const d = new Date(c.timestamp);
          if (isNaN(d.getTime())) return 'Legacy Seeded Data';
          return d.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
        } catch {
          return 'Legacy Seeded Data';
        }
      })() : 'Legacy Seeded Data';

      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(c);
    });

    return Object.keys(groups)
      .sort((a, b) => {
        if (a === 'Legacy Seeded Data') return 1;
        if (b === 'Legacy Seeded Data') return -1;
        try {
          const da = new Date(groups[a][0].timestamp || '');
          const db = new Date(groups[b][0].timestamp || '');
          return db.getTime() - da.getTime();
        } catch {
          return 0;
        }
      })
      .map(key => ({
        label: key,
        entries: groups[key]
      }));
  }, [commissions]);

  // Deny access view
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-mesh min-h-[70vh]">
        <Shield size={64} className="text-[#D4AF37]/20" />
        <h2 className="text-2xl font-black text-[#F0EFE8]">Leadership Credentials Required</h2>
        <p className="max-w-md text-[#A09E9A] font-medium text-sm">This cockpit is restricted to Director level only. Please authenticate with credentials to access this system.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 min-h-[85vh]">
      {/* Sidebar Navigation Layout */}
      <nav className="w-full lg:w-64 space-y-2 shrink-0">
        <div className="p-4 mb-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10">
          <div className="flex items-center gap-3 mb-1">
            <Shield size={16} className="text-indigo-400" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A]/40">Director Portal</h4>
          </div>
          <div className="text-xs font-bold text-[#F0EFE8] truncate">{localAuth.name}</div>
          <div className="text-[9px] text-[#D4AF37] font-black mt-1 uppercase tracking-wider">Secure Session Active</div>
        </div>

        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'awards', label: 'Awards & Badges', icon: Award },
          { id: 'tasks', label: 'Tasks Desk', icon: ListTodo },
          { id: 'roster_admin', label: 'Roster Admin', icon: Users },
          { id: 'financials', label: 'Financials', icon: Database },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => { setActiveView(item.id as any); setErrorMessage(null); }}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group relative cursor-pointer",
              activeView === item.id 
                ? "bg-[#1A1A28] text-[#F0EFE8] border border-white/5 shadow-xl" 
                : "text-[#A09E9A] hover:bg-white/[0.02] hover:text-[#F0EFE8]"
            )}
            title={`Switch to ${item.label} view`}
            aria-label={`Switch to ${item.label} view`}
          >
            <item.icon size={18} className={cn("transition-colors", activeView === item.id ? "text-indigo-400" : "group-hover:text-[#F0EFE8]")} />
            <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
            {activeView === item.id && (
              <motion.div layoutId="nav-glow" className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
            )}
          </button>
        ))}
      </nav>

      {/* Main Control View Content Area */}
      <main className="flex-1 min-w-0 space-y-8 pb-20">
        
        {/* Error/Alert Notification */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
              <AlertCircle size={16} className="text-red-400 mt-0.5" />
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase text-red-400">System Alert</p>
                <p className="text-[10px] text-red-300 font-mono leading-relaxed">{errorMessage}</p>
              </div>
              <button onClick={() => setErrorMessage(null)} className="ml-auto text-red-400 hover:scale-125 transition-transform" title="Dismiss error alert" aria-label="Dismiss error alert">✕</button>
            </motion.div>
          )}

          {successMessage && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-tight">{successMessage}</p>
              <button onClick={() => setSuccessMessage('')} className="ml-auto text-emerald-400" title="Dismiss success alert" aria-label="Dismiss success alert">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-[#A09E9A]/40 italic">
            <Loader2 className="animate-spin text-[#D4AF37] mb-2" size={32} />
            Parsing cloud synchronization tables...
          </div>
        )}

        {!isLoading && (
          <AnimatePresence mode="wait">
            
            {/* MODULE 1: OVERVIEW & AI RECOMMENDATIONS */}
            {activeView === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                             {/* Dashboard Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-3xl border border-white/5 bg-white/[0.01] tech-card">
                    <p className="text-[9px] font-black uppercase text-[#A09E9A]/60 tracking-[0.2em]">Active Hosts Roster</p>
                    <div className="mt-4 flex items-end gap-3">
                      <span className="text-4xl font-black text-[#F0EFE8] leading-none">{hosts.filter(h => h.status === 'Active').length}</span>
                      <span className="text-[10px] font-black uppercase text-emerald-500 mb-1">Live Anchors</span>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl border border-white/5 bg-white/[0.01] tech-card">
                    <p className="text-[9px] font-black uppercase text-[#A09E9A]/60 tracking-[0.2em]">Selected Month Commissions</p>
                    <div className="mt-4 flex items-end gap-3">
                      <span className="text-4xl font-black text-indigo-400 leading-none">
                        {commissions.filter(c => c.month === selectedMonth).reduce((sum, c) => sum + (c.my_commission || 0), 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] font-black uppercase text-[#A09E9A]/40 mb-1">Points</span>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl border border-white/5 bg-white/[0.01] tech-card">
                    <p className="text-[9px] font-black uppercase text-[#A09E9A]/60 tracking-[0.2em]">Total Tasks Queue</p>
                    <div className="mt-4 flex items-end gap-3">
                      <span className="text-4xl font-black text-amber-500 leading-none">
                        {tasks.filter(t => t.status !== 'Completed').length}
                      </span>
                      <span className="text-[10px] font-black uppercase text-[#A09E9A]/40 mb-1">Open Items</span>
                    </div>
                  </div>
                </div>

                {/* AI Recommendations Engine section */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-[#F0EFE8]">
                      <Zap size={18} className="text-[#D4AF37]" />
                      System AI Recommendations Engine
                    </h3>
                    <button 
                      onClick={() => runRecommendationsEngine(true)}
                      className="px-4 py-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37] border border-[#D4AF37]/20 text-[#D4AF37] hover:text-[#0D0D14] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      title="Recalculate recommendation metrics"
                      aria-label="Recalculate recommendation metrics"
                    >
                      Recalculate Loop
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {insights.length === 0 ? (
                      <div className="col-span-3 text-center py-12 border border-dashed border-white/10 rounded-3xl text-[#A09E9A]/30 italic text-xs">
                        No recommendations generated for this cycle. Roster and performance points are stable.
                      </div>
                    ) : (
                      insights.map(item => (
                        <div 
                          key={item.id} 
                          className={cn(
                            "p-6 rounded-3xl border flex flex-col justify-between h-56 tech-card",
                            item.priority === 'High' ? 'border-red-500/20 bg-red-500/[0.02]' :
                            item.priority === 'Medium' ? 'border-amber-500/20 bg-amber-500/[0.02]' : 'border-[#D4AF37]/20 bg-[#D4AF37]/[0.02]'
                          )}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className={cn(
                                "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                                item.priority === 'High' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                item.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
                              )}>
                                {item.priority} Priority
                              </span>
                              <span className="text-[9px] font-mono text-[#A09E9A]/40">{item.triggerMetric}</span>
                            </div>
                            <h4 className="font-extrabold text-[#F0EFE8] text-sm line-clamp-1">{item.hostName}</h4>
                            <p className="text-[11px] text-[#A09E9A] leading-relaxed mt-2 line-clamp-3">{item.details}</p>
                          </div>
                          
                          <button
                            onClick={() => handleConvertRecommendationToTask(item)}
                            className="w-full mt-4 py-2 btn-gold text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                            title="Convert recommendation to task assignment"
                            aria-label="Convert recommendation to task assignment"
                          >
                            Convert To Task
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* Exception Queue */}
                <section className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-[#F0EFE8]">
                    <AlertCircle size={18} className="text-red-400" />
                    Data Gaps Exception Queue
                  </h3>
                  <div className="tech-card !p-0 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-[9px] font-black text-[#A09E9A]/40 uppercase tracking-[0.2em] bg-white/[0.02]">
                          <th className="px-6 py-4">Poppo ID</th>
                          <th className="px-6 py-4">Nickname</th>
                          <th className="px-6 py-4">Gap Type</th>
                          <th className="px-6 py-4">Severity</th>
                          <th className="px-6 py-4">Action details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {exceptionQueue.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-[#A09E9A]/30 italic">No operational data gaps or anomalies detected. Roster is fully intact.</td>
                          </tr>
                        ) : (
                          exceptionQueue.map((item, idx) => (
                            <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{item.hostId}</td>
                              <td className="px-6 py-4 font-bold text-[#F0EFE8]">{item.name}</td>
                              <td className="px-6 py-4 text-slate-300 font-medium">{item.gapType}</td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                                  item.severity === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                  item.severity === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                  'bg-slate-500/10 text-[#A09E9A] border-slate-500/20'
                                )}>
                                  {item.severity}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-[#A09E9A]/60">{item.details}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Audit Logs Trail */}
                <section className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Database size={18} className="text-cyan-400" />
                    Immutable Activity Audit Trail
                  </h3>
                  <div className="tech-card !p-0 overflow-hidden">
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-[#13131E] z-10 border-b border-white/5">
                          <tr className="text-[9px] font-black text-[#A09E9A]/20 uppercase tracking-[0.2em] bg-[#13131E]">
                            <th className="px-6 py-3">Timestamp</th>
                            <th className="px-6 py-3">Actor ID</th>
                            <th className="px-6 py-3">Action</th>
                            <th className="px-6 py-3">Value Snapshot (Before)</th>
                            <th className="px-6 py-3">Value Snapshot (After)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {auditLogs.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-[#A09E9A]/20 italic">No activity logs recorded.</td>
                            </tr>
                          ) : (
                            auditLogs.map((log) => (
                              <tr key={log.logId} className="hover:bg-white/[0.01] transition-colors font-mono text-[10px]">
                                <td className="px-6 py-3 text-[#A09E9A]/40 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                                <td className="px-6 py-3 font-bold text-indigo-400">{log.actorUserId}</td>
                                <td className="px-6 py-3 text-[#F0EFE8] font-bold uppercase">{log.actionType}</td>
                                <td className="px-6 py-3 text-[#A09E9A]/30 truncate max-w-[180px]" title={log.beforeValue}>{log.beforeValue}</td>
                                <td className="px-6 py-3 text-emerald-400 truncate max-w-[180px]" title={log.afterValue}>{log.afterValue}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {/* MODULE 2: AWARDS & BADGES */}
            {activeView === 'awards' && (
              <motion.div key="awards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-xl flex items-center gap-2">
                      <Award size={20} className="text-[#D4AF37]" />
                      Custom Monthly Awards & Badges
                    </h3>
                    <p className="text-[10px] text-[#A09E9A]/40 uppercase tracking-widest font-black">Assign badges to top performing talent</p>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-[#1A1A28] p-2 px-4 rounded-xl border border-white/5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#A09E9A]/50">Target Month:</span>
                    <div className="flex items-center gap-1">
                      <select 
                        value={selectedMonth.split('-')[0]} 
                        onChange={(e) => setSelectedMonth(`${e.target.value}-${selectedMonth.split('-')[1]}`)}
                        className="bg-transparent text-indigo-400 font-bold text-xs outline-none cursor-pointer focus:ring-0"
                        title="Target Year selection"
                      >
                        <option value="2024" className="bg-[#1A1A28] text-[#F0EFE8]">2024</option>
                        <option value="2025" className="bg-[#1A1A28] text-[#F0EFE8]">2025</option>
                        <option value="2026" className="bg-[#1A1A28] text-[#F0EFE8]">2026</option>
                        <option value="2027" className="bg-[#1A1A28] text-[#F0EFE8]">2027</option>
                      </select>
                      <span className="text-white/20 text-xs">-</span>
                      <select 
                        value={selectedMonth.split('-')[1]} 
                        onChange={(e) => setSelectedMonth(`${selectedMonth.split('-')[0]}-${e.target.value}`)}
                        className="bg-transparent text-indigo-400 font-bold text-xs outline-none cursor-pointer focus:ring-0"
                        title="Target Month selection"
                      >
                        {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                          <option key={m} value={m} className="bg-[#1A1A28] text-[#F0EFE8]">{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="tech-card !p-0 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-[9px] font-black text-[#A09E9A]/40 uppercase tracking-widest bg-white/[0.02]">
                        <th className="px-6 py-4">Poppo ID</th>
                        <th className="px-6 py-4">Nickname</th>
                        <th className="px-6 py-4">Month</th>
                        <th className="px-6 py-4">Monthly Award Badge</th>
                        <th className="px-6 py-4 text-right">Assign Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {hosts.map(host => {
                        const summary = earningsSummaries.find(s => s.poppoId === host.id);
                        const currentBadge = summary?.profilePhotoUrl || 'None'; // profilePhotoUrl maps to local award badge here
                        
                        return (
                          <tr key={host.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-indigo-400">{host.id}</td>
                            <td className="px-6 py-4 font-bold text-[#F0EFE8]">{host.nickname || host.name}</td>
                            <td className="px-6 py-4 text-[#A09E9A]/40">{selectedMonth}</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                currentBadge !== 'None' ? 'bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20' : 'bg-[#222235] text-[#A09E9A] border-transparent'
                              )}>
                                {currentBadge}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <select
                                onChange={async (e) => {
                                  const val = e.target.value;
                                  if (!val) return;
                                  
                                  const original = summary ? { ...summary } : null;
                                  const updatedSummary: TopNinersEarningsSummary = summary ? {
                                    ...summary,
                                    profilePhotoUrl: val
                                  } : {
                                    summaryId: `${host.id}_${selectedMonth}`,
                                    periodKey: selectedMonth,
                                    month: parseInt(selectedMonth.split('-')[1]),
                                    year: parseInt(selectedMonth.split('-')[0]),
                                    poppoId: host.id,
                                    nickname: host.nickname || host.name,
                                    role: host.role || 'Host',
                                    totalEarningsPoints: summary?.totalEarningsPoints || 0,
                                    rank: summary?.rank || 99,
                                    isPublished: true,
                                    profilePhotoUrl: val
                                  };

                                  try {
                                    await FirebaseService.saveTopNinersSummary([updatedSummary]);
                                    await auditLogAction('ASSIGN_AWARD', original, updatedSummary);
                                    showSuccess(`Award badge assigned to ${host.nickname || host.name}`);
                                    const updated = await FirebaseService.getTopNinersSummary(selectedMonth);
                                    setEarningsSummaries(updated);
                                  } catch (err) {
                                    alert("Failed to assign award badge");
                                  }
                                }}
                                value={currentBadge}
                                className="bg-[#1A1A28] border border-white/10 rounded-lg px-2 py-1 text-xs text-[#D4AF37] font-bold outline-none cursor-pointer"
                                title="Assign award badge"
                                aria-label="Assign award badge"
                              >
                                <option value="">-- Choose badge --</option>
                                <option value="Top Earner">🏆 Top Earner</option>
                                <option value="Rising Star">⭐ Rising Star</option>
                                <option value="Gifting Queen">💖 Gifting Queen</option>
                                <option value="PK Elite">⚔️ PK Elite</option>
                                <option value="None">None (Remove Badge)</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* MODULE 3: TASKS MANAGEMENT DESK */}
            {activeView === 'tasks' && (
              <motion.div key="tasks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-xl flex items-center gap-2 text-[#F0EFE8]">
                      <ListTodo size={20} className="text-indigo-400" />
                      Tasks Coordination Desk
                    </h3>
                    <p className="text-[10px] text-[#A09E9A]/40 uppercase tracking-widest font-black">Delegate instruction tasks to agency staff</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Create Task Form */}
                  <div className="tech-card h-fit space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] border-b border-white/5 pb-2">Delegate New Task</h4>
                    
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const taskId = getUUID();
                        const newTask: Task = {
                          taskId,
                          assignedToUserId: String(formData.get('assignedTo') || 'support_staff'),
                          relatedPoppoId: String(formData.get('relatedPoppo') || ''),
                          taskType: String(formData.get('type') || 'Coaching'),
                          title: String(formData.get('title') || 'Coaching Task'),
                          description: String(formData.get('description') || ''),
                          status: 'Assigned',
                          dueDate: String(formData.get('dueDate') || '')
                        };

                        try {
                           await FirebaseService.saveTasks([newTask]);
                           await auditLogAction('CREATE_TASK', null, newTask);
                           showSuccess('Task delegated down successfully.');
                           e.currentTarget.reset();
                           loadData();
                        } catch (err) {
                           alert("Failed to create task.");
                        }
                      }}
                      className="space-y-4"
                    >
                      <div className="space-y-1.5">
                        <label htmlFor="task-assignee" className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">Assignee Role</label>
                        <select id="task-assignee" name="assignedTo" className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#F0EFE8]" title="Select assignee role" aria-label="Select assignee role">
                          <option value="support_staff" className="bg-[#1A1A28] text-[#F0EFE8]">Support Staff (Assistant)</option>
                          <option value="Manager" className="bg-[#1A1A28] text-[#F0EFE8]">Manager</option>
                          <option value="Admin" className="bg-[#1A1A28] text-[#F0EFE8]">Admin</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="task-related-poppo" className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">Related Talent</label>
                        <select id="task-related-poppo" name="relatedPoppo" className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#F0EFE8]" title="Select related talent" aria-label="Select related talent">
                          <option value="" className="bg-[#1A1A28] text-[#F0EFE8]">-- No Related Host --</option>
                          {hosts.map(h => (
                            <option key={h.id} value={h.id} className="bg-[#1A1A28] text-[#F0EFE8]">{h.nickname || h.name} ({h.id})</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="task-type" className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">Task Type</label>
                        <input id="task-type" name="type" type="text" placeholder="e.g. Coaching" className="w-full glass-input text-xs text-[#F0EFE8]" required title="Enter task type" aria-label="Enter task type" />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="task-title" className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">Task Title</label>
                        <input id="task-title" name="title" type="text" placeholder="Complete Profile Info" className="w-full glass-input text-xs text-[#F0EFE8]" required title="Enter task title" aria-label="Enter task title" />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="task-description" className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">Task Description</label>
                        <textarea id="task-description" name="description" placeholder="Specify missing fields or guidelines..." className="w-full glass-input text-xs text-[#F0EFE8] h-20 resize-none" required title="Enter task description" aria-label="Enter task description" />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="task-due-date" className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">Due Date</label>
                        <input id="task-due-date" name="dueDate" type="date" className="w-full glass-input text-xs text-[#F0EFE8] [color-scheme:dark]" required title="Select task due date" aria-label="Select task due date" />
                      </div>

                      <button type="submit" className="w-full py-3 btn-gold rounded-xl text-xs font-black uppercase tracking-widest text-[#0D0D14] transition-all shadow-lg active:scale-95 cursor-pointer">
                        Delegate Task
                      </button>
                    </form>
                  </div>

                  {/* Tasks List */}
                  <div className="lg:col-span-2 space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A]/40">Active Assignments</h4>
                    
                    <div className="space-y-3">
                      {tasks.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-white/10 rounded-3xl text-[#A09E9A]/30 italic text-xs">
                          No delegated tasks found.
                        </div>
                      ) : (
                        tasks.map(task => (
                          <div key={task.taskId} className="tech-card !p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white/[0.01]">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                                  task.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                )}>
                                  {task.status}
                                </span>
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-wider">{task.taskType}</span>
                              </div>
                              <h5 className="font-black text-[#F0EFE8] text-sm">{task.title}</h5>
                              <p className="text-xs text-[#A09E9A]/60 leading-relaxed font-medium">{task.description}</p>
                              <div className="text-[9px] text-[#A09E9A]/40 font-bold flex gap-4 pt-1">
                                <span>Assignee: {task.assignedToUserId}</span>
                                <span>Related Poppo ID: {task.relatedPoppoId}</span>
                                <span>Due: {task.dueDate}</span>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {task.status !== 'Completed' && (
                                <button
                                  onClick={async () => {
                                    const original = { ...task };
                                    const updated: Task = { ...task, status: 'Completed' };
                                    try {
                                      await FirebaseService.saveTasks([updated]);
                                      await auditLogAction('UPDATE_TASK', original, updated);
                                      showSuccess('Task marked as completed.');
                                      loadData();
                                    } catch (err) {
                                      alert("Failed to complete task");
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-[#0D0D14] rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer"
                                >
                                  Complete
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  if (!confirm("Hard delete this task assignment?")) return;
                                  try {
                                    await FirebaseService.deleteTask(task.taskId);
                                    await auditLogAction('DELETE_TASK', task, null);
                                    showSuccess('Task removed.');
                                    loadData();
                                  } catch (err) {
                                    alert("Failed to delete task");
                                  }
                                }}
                                className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-[#0D0D14] rounded-lg transition-all cursor-pointer"
                                title="Delete task"
                                aria-label="Delete task"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* MODULE 4: GLOBAL ROSTER ADMIN */}
            {activeView === 'roster_admin' && (
              <motion.div key="roster_admin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                
                {/* Manual Onboarding drawer/section */}
                <section className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <UserPlus size={18} className="text-indigo-400" />
                    Manually Onboard Talent
                  </h3>
                  
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const hostId = String(formData.get('poppoId')).trim();
                      if (!hostId) {
                        alert("Poppo ID is required.");
                        return;
                      }

                      // Check duplicates
                      const existing = hosts.find(h => h.id === hostId);
                      if (existing) {
                        const incoming: Host = {
                          id: hostId,
                          name: String(formData.get('name')),
                          nickname: String(formData.get('name')),
                          role: 'Talent',
                          team: String(formData.get('team') || 'Unassigned'),
                          manager: 'Nine Management',
                          anchor_type: 'Nine Agency',
                          base_salary_category: 'N/A',
                          status: 'Active',
                          level: 1,
                          tier: 'X',
                          isActive: true,
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                          password: '1212',
                          is_temp_password: true
                        };
                        setExistingHost(existing);
                        setIncomingHost(incoming);
                        setResolvedFields({ ...incoming });
                        setShowMergeModal(true);
                        e.currentTarget.reset();
                        return;
                      }

                      const newHost: Host = {
                        id: hostId,
                        name: String(formData.get('name')),
                        nickname: String(formData.get('name')),
                        role: 'Talent',
                        team: String(formData.get('team') || 'Unassigned'),
                        manager: String(formData.get('manager') || 'Nine Management'),
                        anchor_type: 'Nine Agency',
                        base_salary_category: 'N/A',
                        status: 'Active',
                        level: 1,
                        tier: 'X',
                        isActive: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        password: '1212',
                        is_temp_password: true
                      };

                      try {
                        await FirebaseService.saveHosts([newHost]);
                        await auditLogAction('CREATE_HOST', null, newHost);
                        showSuccess(`Host ${newHost.name} successfully onboarded.`);
                        e.currentTarget.reset();
                        loadData();
                      } catch (err) {
                        alert("Failed to onboard host.");
                      }
                    }}
                    className="tech-card grid grid-cols-1 sm:grid-cols-4 gap-4 items-end bg-white/[0.01]"
                  >
                    <div className="space-y-1.5">
                      <label htmlFor="reg-poppo-id" className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">Poppo ID</label>
                      <input id="reg-poppo-id" name="poppoId" type="text" placeholder="Enter numeric PoppoID" className="w-full glass-input text-xs text-[#F0EFE8]" required title="Enter numeric Poppo ID" aria-label="Enter numeric Poppo ID" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="reg-name" className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">Display Name</label>
                      <input id="reg-name" name="name" type="text" placeholder="Display name" className="w-full glass-input text-xs text-[#F0EFE8]" required title="Enter Display Name" aria-label="Enter Display Name" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="reg-team" className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">Team Group</label>
                      <input id="reg-team" name="team" type="text" placeholder="Unassigned" className="w-full glass-input text-xs text-[#F0EFE8]" title="Enter Team Group" aria-label="Enter Team Group" />
                    </div>
                    <button type="submit" className="py-3 btn-gold rounded-xl text-xs font-black uppercase tracking-widest text-[#0D0D14] transition-all shadow-lg active:scale-95 cursor-pointer">
                      Register Host
                    </button>
                  </form>
                </section>

                {/* Bulk Onboard Talent Section */}
                <section className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-[#F0EFE8]">
                    <Database size={18} className="text-indigo-400" />
                    Bulk Onboard Talent
                  </h3>
                  <div className="tech-card space-y-4 bg-[#1A1A28] border border-white/5">
                    <p className="text-[10px] text-[#A09E9A]/60 leading-relaxed font-medium">
                      Paste rows directly from Excel or Google Sheets to upload multiple talent records at once. Duplicates will be flagged and reviewed.
                    </p>
                    <div className="space-y-2">
                      <label htmlFor="roster-bulk-paste" className="text-[9px] font-black uppercase tracking-widest text-[#A09E9A]/40 block">
                        Excel Tabular Raw Paste (Roster Sheet)
                      </label>
                      <textarea
                        id="roster-bulk-paste"
                        value={rosterPasteText}
                        onChange={(e) => setRosterPasteText(e.target.value)}
                        placeholder="Format: Poppo ID	Nickname	Position	Role	Status	Temporary Password	Manager Assigned	Anchor / Team"
                        className="w-full h-32 glass-input font-mono text-[9px] resize-none"
                        title="Excel raw paste roster data"
                        aria-label="Excel raw paste roster data"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!rosterPasteText.trim()) return;
                        setIsLoading(true);
                        try {
                          const rawText = rosterPasteText.trim();
                          const rows = rawText.split('\n').filter(line => line.trim() !== '').map(line => line.split('\t'));
                          
                          // Skip header row if pasted
                          const startIdx = (rows[0] && (
                            rows[0][0]?.toLowerCase().includes('poppo') || 
                            rows[0][1]?.toLowerCase().includes('nick') || 
                            rows[0][2]?.toLowerCase().includes('pos') || 
                            rows[0][3]?.toLowerCase().includes('role')
                          )) ? 1 : 0;

                          const parsedHosts: Host[] = [];
                          for (let i = startIdx; i < rows.length; i++) {
                            const cols = rows[i];
                            if (cols.length < 2) continue; // Needs at least ID and Name

                            const poppoId = cols[0]?.trim() || '';
                            if (!poppoId) continue;

                            const name = cols[1]?.trim() || 'Unknown';
                            const role = cols[2]?.trim() || 'Talent';
                            const status = cols[4]?.trim() || 'Active';
                            const tempPassword = cols[5]?.trim() || '1212';
                            const manager = cols[6]?.trim() || 'Nine Management';
                            const team = cols[7]?.trim() || 'Unassigned';

                            // Map role to level
                            let level = 1;
                            if (role === "Director") level = 5;
                            else if (role === "Head Admin") level = 4;
                            else if (role === "Admin") level = 3;
                            else if (role === "Manager") level = 2;
                            else level = 1;

                            parsedHosts.push({
                              id: poppoId,
                              name: name,
                              nickname: name,
                              role: role as any,
                              status: status,
                              password: tempPassword,
                              is_temp_password: true,
                              manager: manager,
                              team: team,
                              anchor_type: 'Nine Agency',
                              base_salary_category: 'N/A',
                              level: level,
                              tier: 'X',
                              isActive: true,
                              created_at: new Date().toISOString(),
                              updated_at: new Date().toISOString()
                            });
                          }

                          const newHostsToSave: Host[] = [];
                          const duplicatesToMerge: Host[] = [];

                          for (const h of parsedHosts) {
                            const existing = hosts.find(ex => ex.id === h.id);
                            if (existing) {
                              duplicatesToMerge.push(h);
                            } else {
                              newHostsToSave.push(h);
                            }
                          }

                          if (newHostsToSave.length > 0) {
                            await FirebaseService.saveHosts(newHostsToSave);
                            for (const newHost of newHostsToSave) {
                              await auditLogAction('CREATE_HOST', null, newHost);
                            }
                          }

                          setRosterPasteText('');

                          if (duplicatesToMerge.length > 0) {
                            const firstIncoming = duplicatesToMerge[0];
                            const firstExisting = hosts.find(ex => ex.id === firstIncoming.id);
                            setDuplicateQueue(duplicatesToMerge.slice(1));
                            
                            if (firstExisting) {
                              setExistingHost(firstExisting);
                              setIncomingHost(firstIncoming);
                              setResolvedFields({ ...firstIncoming });
                              setShowMergeModal(true);
                            }
                            
                            showSuccess(`Successfully added ${newHostsToSave.length} new talent records. ${duplicatesToMerge.length} duplicates flagged for merge-review.`);
                          } else {
                            showSuccess(`Successfully onboarded all ${newHostsToSave.length} talent records.`);
                            loadData();
                          }
                        } catch (err) {
                          alert("Failed to parse and save bulk roster.");
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="w-full py-3 btn-gold rounded-xl text-xs font-black uppercase tracking-widest text-[#0D0D14] transition-all shadow-lg active:scale-95 cursor-pointer"
                      title="Import bulk raw roster data"
                      aria-label="Import bulk raw roster data"
                    >
                      Incorporate Roster Paste
                    </button>
                  </div>
                </section>

                {/* Reset & Manage Talent Passwords Section */}
                <section className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-[#F0EFE8]">
                    <Lock size={18} className="text-indigo-400" />
                    Reset & Manage Talent Passwords
                  </h3>
                  <div className="tech-card space-y-6 bg-white/[0.01]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                      <div className="space-y-1.5">
                        <label htmlFor="pwd-host-select" className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">Select Talent / Host</label>
                        <select
                          id="pwd-host-select"
                          value={selectedHostForPasswordId}
                          onChange={(e) => setSelectedHostForPasswordId(e.target.value)}
                          className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#F0EFE8]"
                          title="Select a talent to reset password"
                          aria-label="Select a talent to reset password"
                        >
                          <option value="" className="bg-[#1A1A28] text-[#F0EFE8]">-- Choose Host --</option>
                          {hosts.map(h => (
                            <option key={h.id} value={h.id} className="bg-[#1A1A28] text-[#F0EFE8]">
                              {h.nickname || h.name} ({h.id})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="pwd-input" className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">Set Password</label>
                        <div className="flex gap-2">
                          <input
                            id="pwd-input"
                            type="text"
                            placeholder="Password value"
                            value={targetPassword}
                            onChange={(e) => setTargetPassword(e.target.value)}
                            className="w-full glass-input text-xs text-[#F0EFE8]"
                            title="Enter or generate password"
                            aria-label="Enter or generate password"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const randomPwd = (() => {
                                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                                let pwd = '';
                                for (let i = 0; i < 8; i++) {
                                  pwd += chars.charAt(Math.floor(Math.random() * chars.length));
                                }
                                return pwd;
                              })();
                              setTargetPassword(randomPwd);
                            }}
                            className="px-3 py-2.5 bg-[#1A1A28] hover:bg-[#222235] border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#D4AF37] transition-all whitespace-nowrap cursor-pointer"
                            title="Generate a random password"
                            aria-label="Generate a random password"
                          >
                            Generate
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          if (!selectedHostForPasswordId) {
                            alert("Please select a host first.");
                            return;
                          }
                          if (!targetPassword.trim()) {
                            alert("Password cannot be empty.");
                            return;
                          }
                          const hostObj = hosts.find(h => h.id === selectedHostForPasswordId);
                          if (!hostObj) return;

                          const original = { ...hostObj };
                          const updated: Host = {
                            ...hostObj,
                            password: targetPassword.trim(),
                            is_temp_password: true,
                            updated_at: new Date().toISOString()
                          };

                          try {
                            await FirebaseService.updateHost(updated);
                            await auditLogAction('RESET_HOST_PASSWORD', original, { id: updated.id, nickname: updated.nickname || updated.name, is_temp_password: true });
                            showSuccess(`Password updated for host: ${updated.nickname || updated.name}`);
                            setSelectedHostForPasswordId('');
                            setTargetPassword('');
                            loadData();
                          } catch (err) {
                            alert("Failed to update password.");
                          }
                        }}
                        className="py-3 btn-gold rounded-xl text-xs font-black uppercase tracking-widest text-[#0D0D14] transition-all shadow-lg active:scale-95 cursor-pointer"
                      >
                        Update Password
                      </button>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-[#F0EFE8]">
                    <Shield size={18} className="text-indigo-400" />
                    Master Agency Directory Table
                  </h3>
                  <div className="tech-card !p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[900px] border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 text-[9px] font-black text-[#A09E9A]/30 uppercase tracking-widest bg-white/2">
                            <th className="px-6 py-4 sticky left-0 bg-[#13131E] z-20 min-w-[100px] max-w-[100px] border-r border-white/5">Poppo ID</th>
                            <th className="px-6 py-4 sticky left-[100px] bg-[#13131E] z-20 min-w-[150px] max-w-[150px] border-r border-white/5">Nickname</th>
                            <th className="px-4 py-4">Role</th>

                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Salary Class</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 bg-transparent">
                          {hosts.map(host => (
                            <tr key={host.id} className="hover:bg-white/[0.01] transition-colors group">
                              <td className="px-6 py-4 font-mono font-bold text-indigo-400 sticky left-0 bg-[#13131E] group-hover:bg-[#1A1A28] transition-colors z-10 min-w-[100px] max-w-[100px] border-r border-white/5">{host.id}</td>
                              <td className="px-6 py-4 font-bold text-[#F0EFE8] sticky left-[100px] bg-[#13131E] group-hover:bg-[#1A1A28] transition-colors z-10 min-w-[150px] max-w-[150px] border-r border-white/5">
                                <input 
                                  type="text"
                                  defaultValue={host.nickname || host.name}
                                  onBlur={async (e) => {
                                    const val = e.target.value;
                                    if (val !== (host.nickname || host.name)) {
                                      const original = { ...host };
                                      const updated: Host = { ...host, nickname: val, name: val };
                                      try {
                                        await FirebaseService.updateHost(updated);
                                        await auditLogAction('UPDATE_HOST', original, updated);
                                        showSuccess(`Updated nickname for host ${host.id}`);
                                        loadData();
                                      } catch (err) {
                                        alert("Failed to update nickname");
                                      }
                                    }
                                  }}
                                  className="bg-transparent border-none focus:ring-1 focus:ring-indigo-500/50 rounded-lg px-2 py-1 w-full text-[#F0EFE8] font-bold hover:bg-[#1A1A28] focus:bg-[#0D0D14]"
                                  title="Edit host nickname"
                                  aria-label="Edit host nickname"
                                />
                              </td>
                              <td className="px-4 py-4 font-mono">
                                <select 
                                  value={host.role || 'Talent'}
                                  onChange={async (e) => {
                                    const val = e.target.value as any;
                                    const original = { ...host };
                                    const updated: Host = { ...host, role: val };
                                    try {
                                      await FirebaseService.updateHost(updated);
                                      await auditLogAction('UPDATE_HOST_ROLE', original, updated);
                                      showSuccess(`Updated role for host ${host.id}`);
                                      loadData();
                                    } catch (err) {
                                      alert("Failed to update role");
                                    }
                                  }}
                                  className="bg-transparent border-none rounded text-xs text-indigo-400 font-bold focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                  title="Select role"
                                  aria-label="Select role"
                                >
                                  
                                    {['Talent', 'Manager', 'Admin', 'Head Admin', 'Director', 'Agent'].map(r => (
                                      <option key={r} value={r} className="bg-[#0A0A0B] text-[#F0EFE8]">{r}</option>
                                    ))}
                                  
                                </select>
                              </td>

                              <td className="px-6 py-4">
                                <select 
                                  value={host.status}
                                  onChange={async (e) => {
                                    const val = e.target.value as any;
                                    const original = { ...host };
                                    const updated: Host = { ...host, status: val };
                                    try {
                                      await FirebaseService.updateHost(updated);
                                      await auditLogAction('UPDATE_HOST', original, updated);
                                      showSuccess(`Updated status for host ${host.id}`);
                                      loadData();
                                    } catch (err) {
                                      alert("Failed to update status");
                                    }
                                  }}
                                  className="bg-transparent border-none rounded text-xs text-[#A09E9A] hover:text-[#F0EFE8] focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                  title="Select status"
                                  aria-label="Select status"
                                >
                                  {['Active', 'Inconsistent', 'Released', 'Inactive'].map(s => (
                                    <option key={s} value={s} className="bg-[#0A0A0B] text-[#F0EFE8]">{s}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-6 py-4">
                                <select 
                                  value={host.base_salary_category}
                                  onChange={async (e) => {
                                    const val = e.target.value as any;
                                    const original = { ...host };
                                    const updated: Host = { ...host, base_salary_category: val };
                                    try {
                                      await FirebaseService.updateHost(updated);
                                      await auditLogAction('UPDATE_HOST', original, updated);
                                      showSuccess(`Updated salary tier for host ${host.id}`);
                                      loadData();
                                    } catch (err) {
                                      alert("Failed to update salary");
                                    }
                                  }}
                                  className="bg-transparent border-none rounded text-xs text-[#A09E9A] hover:text-[#F0EFE8] focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                  title="Select salary category"
                                  aria-label="Select salary category"
                                >
                                  {['N/A', 'Rocket Host', 'Star Host', 'S idol', 'ESport Host'].map(s => (
                                    <option key={s} value={s} className="bg-[#0A0A0B] text-[#F0EFE8]">{s}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={async () => {
                                    if (!confirm(`Are you sure you want to permanently HARD DELETE host: ${host.nickname || host.name}?`)) return;
                                    const original = { ...host };
                                    try {
                                      await FirebaseService.deleteHost(host.id);
                                      await auditLogAction('DELETE_HOST', original, null);
                                      showSuccess('Host deleted permanently.');
                                      loadData();
                                    } catch (err) {
                                      alert("Failed to delete host");
                                    }
                                  }}
                                  className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-[#0D0D14] rounded-xl transition-all cursor-pointer"
                                  title="Hard delete host"
                                  aria-label="Hard delete host"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {/* MODULE 5: FINANCIALS SHEET UPLOADER & BULK PARSING */}
            {activeView === 'financials' && (
              <motion.div key="financials" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-xl flex items-center gap-2 text-[#F0EFE8]">
                      <Database size={20} className="text-[#D4AF37]" />
                      High-Volume Financial Ledger
                    </h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">
                      Bypasses Firestore. Files saved directly as flat JSON in Firebase Storage.
                    </p>
                  </div>
                  
                  {/* Save Changes button with spinner state */}
                  <button
                    onClick={handleSaveChanges}
                    disabled={isSavingFinancials}
                    className="flex items-center gap-2 px-5 py-3 bg-[#D4AF37] hover:bg-[#c9a832] disabled:bg-slate-700 text-[#0D0D14] rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg active:scale-95 shrink-0"
                  >
                    {isSavingFinancials ? (
                      <span className="w-3.5 h-3.5 border-2 border-[#0D0D14]/20 border-t-[#0D0D14] rounded-full animate-spin" />
                    ) : (
                      <span>💾</span>
                    )}
                    {isSavingFinancials ? "Saving..." : "Save Changes"}
                  </button>
                </div>

                {/* Sub Tabs Selection */}
                <div className="flex border-b border-white/5 gap-6">
                  <button
                    onClick={() => { setFinancialTab('monthly'); setSelectedRows({}); }}
                    className={cn(
                      "pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer",
                      financialTab === 'monthly' ? "border-[#D4AF37] text-[#F0EFE8]" : "border-transparent text-[#A09E9A] hover:text-[#F0EFE8]"
                    )}
                  >
                    Monthly Financials
                  </button>
                  <button
                    onClick={() => { setFinancialTab('weekly'); setSelectedRows({}); }}
                    className={cn(
                      "pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer",
                      financialTab === 'weekly' ? "border-[#D4AF37] text-[#F0EFE8]" : "border-transparent text-[#A09E9A] hover:text-[#F0EFE8]"
                    )}
                  >
                    Weekly Financials
                  </button>
                </div>

                <div className="mb-6">
                  <FinancialUpload onUploadSuccess={loadData} />
                </div>

                {/* Bulk Intake & Paste Section (Flat-file Storage Ledger) */}
                <div className="tech-card bg-[#1A1A28] border border-white/5 p-6 rounded-2xl grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* File Upload Area */}
                  <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.02] transition-all cursor-pointer relative group">
                    <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20 group-hover:scale-105 transition-transform">
                      <span className="text-[#D4AF37]">📁</span>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-bold text-xs uppercase tracking-wider text-[#F0EFE8]">Upload Commission Report</p>
                      <p className="text-[9px] text-[#A09E9A]">Drag XLSX or CSV file here or click to browse</p>
                    </div>
                    <input 
                      type="file" 
                      accept=".csv,.xlsx" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsLoading(true);
                        try {
                          const reader = new FileReader();
                          reader.onload = async (evt) => {
                            const bstr = evt.target?.result as string;
                            const wb = XLSX.read(bstr, { type: 'binary' });
                            const wsname = wb.SheetNames[0];
                            const ws = wb.Sheets[wsname];
                            const data = XLSX.utils.sheet_to_json(ws);
                            await handleXlsxImport(data);
                          };
                          reader.readAsBinaryString(file);
                        } catch (err) {
                          alert("Failed to parse report file");
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      title="Upload Excel or CSV report"
                    />
                  </div>

                  {/* Bulk Paste Textarea */}
                  <div className="space-y-2 flex flex-col">
                    <label htmlFor="bulk-ledger-paste" className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">
                      Excel / Sheets Tabular Paste Intake
                    </label>
                    <div className="flex gap-2 flex-1">
                      <textarea
                        id="bulk-ledger-paste"
                        placeholder={
                          financialTab === 'monthly'
                            ? "Paste monthly columns (tab-separated):\nPoppoID\tMonth\tYear\tNickname\tLiveHours\tPartyHours\tTotalPoints\tAgentCommission\tLiveEarnings\tPartyEarnings\tPrivateChat\tTips\tPlatformReward\tOtherEarnings\tHourlySalary\tSuperSalary\tSuperRank\tLevel"
                            : "Paste weekly columns (tab-separated):\nPoppoID\tFromDate\tToDate\tNickname\tLiveHours\tPartyHours\tTotalPoints\tAgentCommission\tLiveEarnings\tPartyEarnings\tPrivateChat\tTips\tPlatformReward\tOtherEarnings\tHourlySalary\tSuperSalary\tSuperRank\tLevel"
                        }
                        className="flex-1 h-24 glass-input font-mono text-[9px] resize-none focus:ring-1 focus:ring-[#D4AF37] text-[#F0EFE8] bg-[#0D0D14] border border-white/10"
                      />
                      <button
                        onClick={() => {
                          const textarea = document.getElementById('bulk-ledger-paste') as HTMLTextAreaElement;
                          if (textarea) {
                            handleBulkPaste(textarea.value);
                            textarea.value = '';
                          }
                        }}
                        className="px-4 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/25 hover:text-white transition-all font-black uppercase text-[10px] tracking-wider rounded-xl cursor-pointer"
                      >
                        Paste
                      </button>
                    </div>
                  </div>
                </div>

                {/* Ledger Interactive Spreadsheet Table */}
                <div className="tech-card !p-0 border border-white/5 overflow-hidden bg-[#13131E] shadow-xl">
                  
                  {/* Grid Action Bar */}
                  <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#1A1A28]/40">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleAddRow}
                        className="px-3.5 py-2 bg-emerald-550 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-emerald-500/10 active:scale-95"
                      >
                        + Add Row
                      </button>
                      <button
                        onClick={handleDeleteSelection}
                        disabled={!Object.keys(selectedRows).some(key => key.startsWith(`${financialTab}_`) && selectedRows[key])}
                        className="px-3.5 py-2 bg-red-550 hover:bg-red-650 disabled:bg-[#222235] text-white disabled:text-[#A09E9A]/40 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        🗑️ Delete Selection
                      </button>
                    </div>

                    <div className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A]">
                      {(financialTab === 'monthly' ? monthlyLedger : weeklyLedger).length} Total rows in workspace
                    </div>
                  </div>

                  {/* Spreadsheet Grid Container */}
                  <div className="overflow-x-auto overflow-y-auto max-h-[500px] relative custom-scrollbar">
                    <table className="w-full text-left text-xs min-w-[1800px] border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-[9px] font-black text-[#A09E9A] uppercase tracking-widest bg-[#1A1A28] sticky top-0 z-20">
                          <th className="px-3 py-3 w-12 text-center bg-[#13131E] sticky left-0 z-30 border-r border-white/5">
                            <input 
                              type="checkbox"
                              onChange={(e) => {
                                const currentData = financialTab === 'monthly' ? monthlyLedger : weeklyLedger;
                                const nextSelected = { ...selectedRows };
                                currentData.forEach((_, idx) => {
                                  nextSelected[`${financialTab}_${idx}`] = e.target.checked;
                                });
                                setSelectedRows(nextSelected);
                              }}
                              className="rounded border-white/10 text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer"
                              title="Select all rows"
                            />
                          </th>
                          {/* STICKY COLUMN FOR POPPO ID */}
                          <th className="px-4 py-3 w-36 sticky left-[48px] bg-[#13131E] z-30 border-r border-white/5">Poppo ID</th>
                          {financialTab === 'monthly' ? (
                            <>
                              <th className="px-3 py-3 w-28">Month</th>
                              <th className="px-3 py-3 w-20">Year</th>
                            </>
                          ) : (
                            <>
                              <th className="px-3 py-3 w-32">From Date</th>
                              <th className="px-3 py-3 w-32">To Date</th>
                            </>
                          )}
                          <th className="px-3 py-3 w-40">Nickname</th>
                          <th className="px-3 py-3 w-28">Live duration</th>
                          <th className="px-3 py-3 w-32">Party host duration</th>
                          <th className="px-3 py-3 w-36">Total earnings of points</th>
                          <th className="px-3 py-3 w-32">Agent Commission</th>
                          <th className="px-3 py-3 w-28">Live earnings</th>
                          <th className="px-3 py-3 w-28">Party Earnings</th>
                          <th className="px-3 py-3 w-28">Private chat</th>
                          <th className="px-3 py-3 w-24">Tips</th>
                          <th className="px-3 py-3 w-32">Platform reward</th>
                          <th className="px-3 py-3 w-28">Other Earnings</th>
                          <th className="px-3 py-3 w-36">Platform hourly salary</th>
                          <th className="px-3 py-3 w-28">Super Salary</th>
                          <th className="px-3 py-3 w-28">Super Rank</th>
                          <th className="px-3 py-3 w-20">Level</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-transparent">
                        {(financialTab === 'monthly' ? monthlyLedger : weeklyLedger).length === 0 ? (
                          <tr>
                            <td colSpan={20} className="py-12 text-center text-[#A09E9A] italic">
                              No ledger entries found. Click "+ Add Row" or paste data above.
                            </td>
                          </tr>
                        ) : (
                          (financialTab === 'monthly' ? monthlyLedger : weeklyLedger).map((row, idx) => {
                            const isChecked = !!selectedRows[`${financialTab}_${idx}`];
                            return (
                              <tr key={idx} className="hover:bg-white/[0.01] transition-colors group">
                                <td className="px-3 py-2 text-center bg-[#13131E] group-hover:bg-[#1A1A28] sticky left-0 z-10 border-r border-white/5 transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      setSelectedRows(prev => ({
                                        ...prev,
                                        [`${financialTab}_${idx}`]: e.target.checked
                                      }));
                                    }}
                                    className="rounded border-white/10 text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer"
                                    title="Select row"
                                  />
                                </td>
                                
                                {/* STICKY POPPO ID COLUMN - MONO SPACED READ WRITE WITH COPY SELECT-ALL */}
                                <td className="px-4 py-2 sticky left-[48px] bg-[#13131E] group-hover:bg-[#1A1A28] transition-colors border-r border-white/5 z-10 font-mono font-bold text-indigo-500 w-36">
                                  <input
                                    type="text"
                                    value={row.poppo_id || ''}
                                    onChange={(e) => handleCellChange(idx, 'poppo_id', e.target.value)}
                                    className="bg-transparent border-none w-full text-xs font-mono font-bold text-[#D4AF37] select-all focus:ring-1 focus:ring-[#D4AF37]/50 rounded px-1.5 py-0.5 outline-none"
                                    placeholder="Enter Poppo ID"
                                  />
                                </td>

                                {financialTab === 'monthly' ? (
                                  <>
                                    <td className="px-3 py-2">
                                      <input
                                        type="text"
                                        value={row.month || ''}
                                        onChange={(e) => handleCellChange(idx, 'month', e.target.value)}
                                        className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#D4AF37]/50 rounded px-1.5 py-0.5 outline-none font-medium text-[#F0EFE8]"
                                        placeholder="YYYY-MM"
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <input
                                        type="number"
                                        value={row.year ?? ''}
                                        onChange={(e) => handleCellChange(idx, 'year', parseInt(e.target.value) || 0)}
                                        className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#D4AF37]/50 rounded px-1.5 py-0.5 outline-none font-medium text-[#F0EFE8]"
                                        placeholder="Year"
                                      />
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-3 py-2">
                                      <input
                                        type="text"
                                        value={row.from_date || ''}
                                        onChange={(e) => handleCellChange(idx, 'from_date', e.target.value)}
                                        className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#D4AF37]/50 rounded px-1.5 py-0.5 outline-none font-medium text-[#F0EFE8]"
                                        placeholder="YYYY-MM-DD"
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <input
                                        type="text"
                                        value={row.to_date || ''}
                                        onChange={(e) => handleCellChange(idx, 'to_date', e.target.value)}
                                        className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#D4AF37]/50 rounded px-1.5 py-0.5 outline-none font-medium text-[#F0EFE8]"
                                        placeholder="YYYY-MM-DD"
                                      />
                                    </td>
                                  </>
                                )}

                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={row.nickname || ''}
                                    onChange={(e) => handleCellChange(idx, 'nickname', e.target.value)}
                                    className="bg-transparent border-none w-full text-xs font-semibold text-[#F0EFE8] focus:ring-1 focus:ring-[#D4AF37]/50 rounded px-1.5 py-0.5 outline-none"
                                    placeholder="Nickname"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    step="any"
                                    value={row.live_duration ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'live_duration', parseFloat(e.target.value) || 0)}
                                    title="Live duration (hours)"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#D4AF37]/50 rounded px-1.5 py-0.5 outline-none text-[#F0EFE8]"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    step="any"
                                    value={row.party_host_duration ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'party_host_duration', parseFloat(e.target.value) || 0)}
                                    title="Party host duration (hours)"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#D4AF37]/50 rounded px-1.5 py-0.5 outline-none text-[#F0EFE8]"
                                  />
                                </td>

                                <td className="px-3 py-2 font-semibold">
                                  <input
                                    type="number"
                                    value={row.total_points ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'total_points', parseInt(e.target.value) || 0)}
                                    title="Total earnings of points"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs font-semibold focus:ring-1 focus:ring-[#D4AF37]/50 rounded px-1.5 py-0.5 outline-none text-[#F0EFE8]"
                                  />
                                </td>

                                <td className="px-3 py-2 text-emerald-400 font-semibold">
                                  <input
                                    type="number"
                                    value={row.agent_commission ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'agent_commission', parseInt(e.target.value) || 0)}
                                    title="Agent commission"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs text-emerald-400 font-semibold focus:ring-1 focus:ring-[#D4AF37]/50 rounded px-1.5 py-0.5 outline-none"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={row.live_earnings ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'live_earnings', parseInt(e.target.value) || 0)}
                                    title="Live earnings"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#D4AF37]/50 rounded px-1.5 py-0.5 outline-none text-[#F0EFE8]"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={row.party_earnings ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'party_earnings', parseInt(e.target.value) || 0)}
                                    title="Party earnings"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#D4AF37]/50 rounded px-1.5 py-0.5 outline-none text-[#F0EFE8]"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={row.private_chat ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'private_chat', parseInt(e.target.value) || 0)}
                                    title="Private chat earnings"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#D4AF37]/50 rounded px-1.5 py-0.5 outline-none text-[#F0EFE8]"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={row.tips ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'tips', parseInt(e.target.value) || 0)}
                                    title="Tips"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#D4AF37]/50 rounded px-1.5 py-0.5 outline-none text-[#F0EFE8]"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={row.platform_reward ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'platform_reward', parseInt(e.target.value) || 0)}
                                    title="Platform reward"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#D4AF37]/50 rounded px-1.5 py-0.5 outline-none text-[#F0EFE8]"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={row.other_earnings ?? row.other_earn ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'other_earnings', parseInt(e.target.value) || 0)}
                                    title="Other earnings"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#D4AF37]/50 rounded px-1.5 py-0.5 outline-none text-[#F0EFE8]"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={row.platform_hourly_salary ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'platform_hourly_salary', parseInt(e.target.value) || 0)}
                                    title="Platform hourly salary"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#D4AF37]/50 rounded px-1.5 py-0.5 outline-none text-[#F0EFE8]"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={row.super_salary ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'super_salary', parseInt(e.target.value) || 0)}
                                    title="Super salary"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#D4AF37]/50 rounded px-1.5 py-0.5 outline-none text-[#F0EFE8]"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={row.super_rank ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'super_rank', parseInt(e.target.value) || 0)}
                                    title="Super rank"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#D4AF37]/50 rounded px-1.5 py-0.5 outline-none text-[#F0EFE8]"
                                  />
                                </td>

                                <td className="px-3 py-2 font-bold">
                                  <input
                                    type="number"
                                    value={row.level ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'level', parseInt(e.target.value) || 0)}
                                    title="Level"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs font-bold focus:ring-1 focus:ring-[#D4AF37]/50 rounded px-1.5 py-0.5 outline-none text-[#F0EFE8]"
                                  />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Spreadsheet footer info */}
                  <div className="p-3 border-t border-white/5 bg-[#1A1A28]/40 text-[10px] text-[#A09E9A] font-medium flex items-center gap-1.5">
                    <span>💡</span>
                    <span>Poppo ID columns support copy-paste selection. Nicknames are cross-referenced with the active roster instantly. Changes are stored in memory until you click "Save Changes".</span>
                  </div>
                </div>

              </motion.div>
            )}

          </AnimatePresence>
        )}
        {showMergeModal && existingHost && incomingHost && (
          <div className="fixed inset-0 bg-[#0D0D14]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#1A1A28] border border-white/5 max-w-3xl w-full rounded-3xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="text-[#D4AF37]" size={20} />
                  <h3 className="text-md font-black text-[#F0EFE8] uppercase tracking-wider">Duplicate Identity Conflict Detector</h3>
                </div>
                <button 
                  onClick={() => processNextDuplicate(duplicateQueue)} 
                  className="text-slate-400 hover:text-white transition-colors"
                  title="Close merge review"
                  aria-label="Close merge review"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-300 font-bold">Poppo ID <span className="text-[#D4AF37] font-mono">{existingHost.id}</span> already exists in the master database.</p>
                <p className="text-[10px] text-[#A09E9A]/60">Review conflicts below. Select which values to preserve, or merge them.</p>
              </div>

              <div className="space-y-4">
                {[
                  { field: 'nickname', label: 'Nickname / Alias' },
                  { field: 'role', label: 'Role' },
                  { field: 'role', label: 'Role' },
                  { field: 'team', label: 'Team Group' },
                  { field: 'manager', label: 'Assigned Manager' },
                  { field: 'base_salary_category', label: 'Salary Class' },
                  { field: 'status', label: 'Roster Status' },
                  { field: 'tier', label: 'Tier Rank' },
                  { field: 'level', label: 'Level Snapshot' }
                ].map(({ field, label }) => {
                  const existVal = (existingHost as any)[field];
                  const incomingVal = (incomingHost as any)[field];
                  const hasConflict = existVal !== incomingVal;

                  return (
                    <div key={field} className="p-4 rounded-2xl bg-[#13131E] border border-white/5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-[#A09E9A]/60 uppercase tracking-wider">{label}</span>
                        {hasConflict && (
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">Conflict</span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setResolvedFields(prev => ({ ...prev, [field]: existVal }))}
                          className={cn(
                            "p-3 rounded-xl border text-left flex flex-col justify-between cursor-pointer transition-all",
                            resolvedFields[field as keyof Host] === existVal
                              ? "bg-[#D4AF37]/5 border-[#D4AF37] text-[#F0EFE8]"
                              : "bg-[#1A1A28] border-white/10 text-[#A09E9A] hover:border-[#D4AF37]/50"
                          )}
                        >
                          <span className="text-[8px] text-[#A09E9A]/40 uppercase font-black">Keep Existing Database Record</span>
                          <span className="text-xs font-bold mt-1.5 text-[#F0EFE8]">{String(existVal)}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setResolvedFields(prev => ({ ...prev, [field]: incomingVal }))}
                          className={cn(
                            "p-3 rounded-xl border text-left flex flex-col justify-between cursor-pointer transition-all",
                            resolvedFields[field as keyof Host] === incomingVal
                              ? "bg-[#D4AF37]/5 border-[#D4AF37] text-[#F0EFE8]"
                              : "bg-[#1A1A28] border-white/10 text-[#A09E9A] hover:border-[#D4AF37]/50"
                          )}
                        >
                          <span className="text-[8px] text-[#A09E9A]/40 uppercase font-black">Merge/Overwrite with Incoming Record</span>
                          <span className="text-xs font-bold mt-1.5 text-[#F0EFE8]">{String(incomingVal)}</span>
                        </button>
                      </div>

                      {/* Custom resolution overrides for Nicknames, Roles, Positions */}
                      {field === 'nickname' && hasConflict && (
                        <div className="pt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const mergedNick = `${existVal} (alias: ${incomingVal})`;
                              setResolvedFields(prev => ({ ...prev, nickname: mergedNick }));
                            }}
                            className={cn(
                              "px-3 py-1 bg-[#1A1A28] hover:bg-[#222235] border border-white/10 rounded text-[9px] font-black uppercase text-slate-300 transition-all cursor-pointer",
                              resolvedFields.nickname === `${existVal} (alias: ${incomingVal})` && "border-[#D4AF37] text-[#D4AF37]"
                            )}
                          >
                            Combine Nicknames (Save Alias)
                          </button>
                        </div>
                      )}

                      {(field === 'role') && hasConflict && (
                        <div className="pt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const mergedVal = Array.from(new Set([String(existVal), String(incomingVal)])).join(', ');
                              setResolvedFields(prev => ({ ...prev, [field]: mergedVal }));
                            }}
                            className={cn(
                              "px-3 py-1 bg-[#1A1A28] hover:bg-[#222235] border border-white/10 rounded text-[9px] font-black uppercase text-slate-300 transition-all cursor-pointer",
                              resolvedFields[field as keyof Host] === Array.from(new Set([String(existVal), String(incomingVal)])).join(', ') && "border-[#D4AF37] text-[#D4AF37]"
                            )}
                          >
                            Keep Both (Multiple Positions/Roles)
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-white/5 justify-end">
                <button
                  type="button"
                  onClick={() => processNextDuplicate(duplicateQueue)}
                  className="px-5 py-2.5 bg-[#1A1A28] hover:bg-[#222235] border border-white/10 rounded-xl text-xs font-black uppercase tracking-wider text-[#A09E9A] hover:text-[#F0EFE8] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const original = { ...existingHost };
                    const mergedHost: Host = {
                      ...existingHost,
                      ...resolvedFields,
                      updated_at: new Date().toISOString()
                    };

                    try {
                      await FirebaseService.updateHost(mergedHost);
                      await auditLogAction('MERGE_HOST_DUPLICATE', original, mergedHost);
                      showSuccess(`Merged duplicate record resolved for host: ${mergedHost.nickname || mergedHost.name}`);
                      processNextDuplicate(duplicateQueue);
                    } catch (err) {
                      alert("Failed to commit merged record.");
                    }
                  }}
                  className="px-6 py-2.5 btn-gold rounded-xl text-xs font-black uppercase tracking-wider text-[#0D0D14] cursor-pointer shadow-lg"
                >
                  Resolve & Commit
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );

  const handleSaveCommission = async (c: CommissionEntry) => {
    const original = { ...c };
    const updated: CommissionEntry = {
      ...c,
      poppo_name: editPoppoName,
      total_points: editTotalPoints,
      total_earnings: editTotalPoints,
      my_commission: editMyCommission
    };

    try {
      await FirebaseService.updateCommission(updated);
      await auditLogAction('UPDATE_COMMISSION', original, updated);
      showSuccess(`Updated financial record for Poppo ID: ${c.poppo_id}`);
      setEditingCommissionId(null);
      loadData();
    } catch (err) {
      alert("Failed to update financial record.");
    }
  };

  const handleDeleteCommission = async (c: CommissionEntry) => {
    if (!confirm(`Are you sure you want to permanently delete the financial entry for Poppo ID ${c.poppo_id} in month ${c.month}?`)) return;

    try {
      await FirebaseService.deleteCommission(c.poppo_id, c.month);
      await auditLogAction('DELETE_COMMISSION', c, null);
      showSuccess(`Deleted financial record for Poppo ID: ${c.poppo_id}`);
      loadData();
    } catch (err) {
      alert("Failed to delete financial record.");
    }
  };

  // Core parser routine for financials upload/paste imports
  async function handleTabularImport(rowsArray: any[]) {
    if (rowsArray.length === 0) return;

    const importTimestamp = new Date().toISOString();
    const parsedCommissions: CommissionEntry[] = [];
    const createdShellHosts: Host[] = [];
    const generatedTasks: Task[] = [];

    // Helper to find key value case-insensitively and clean up whitespace/delimiters
    const findVal = (row: any, possibleKeys: string[], defaultVal: any = undefined) => {
      const key = Object.keys(row).find(k => {
        const cleanK = k.trim().toLowerCase().replace(/[\s_-]+/g, '');
        return possibleKeys.some(pk => pk.trim().toLowerCase().replace(/[\s_-]+/g, '') === cleanK);
      });
      return key ? row[key] : defaultVal;
    };

    for (const row of rowsArray) {
      // 1. Detect Poppo ID
      const poppoIdStr = findVal(row, ['poppo_id', 'poppoid', 'poppo id', 'id', 'uid']);
      if (!poppoIdStr) continue;
      const poppoId = String(poppoIdStr).trim();
      if (!poppoId) continue;

      // 2. Nickname / Name
      const nicknameVal = findVal(row, ['nickname', 'nick name', 'nick', 'name', 'poppo_name', 'poppo name', 'poppo_name']);
      const nickname = nicknameVal ? String(nicknameVal).trim() : 'Pending Intake';

      // 3. Check shell host registration
      const hostExists = hosts.some(h => h.id === poppoId);
      if (!hostExists) {
        const shellHost: Host = {
          id: poppoId,
          name: nickname,
          nickname: nickname,
          role: 'Talent',
          team: 'Unassigned',
          manager: 'Nine Management',
          anchor_type: 'Nine Agency',
          base_salary_category: 'N/A',
          status: 'Active',
          level: 1,
          tier: 'X',
          isActive: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          password: '1212',
          is_temp_password: true
        };
        createdShellHosts.push(shellHost);

        const taskItem: Task = {
          taskId: getUUID(),
          assignedToUserId: 'support_staff',
          relatedPoppoId: poppoId,
          taskType: 'Complete Profile',
          title: 'Complete Profile Info - Missing Fields',
          description: `Import detected unrecognized host Poppo ID: ${poppoId}. Complete their roster profile directory fields.`,
          status: 'Assigned',
          dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0]
        };
        generatedTasks.push(taskItem);
      }

      // 4. Dates parsing (From/To vs Month/Year)
      const fromDate = findVal(row, ['from_date', 'from date', 'fromdate']);
      const toDate = findVal(row, ['to_date', 'to date', 'todate']);
      let monthKey = selectedMonth; // default fallback

      if (fromDate && toDate) {
        // Weekly Report format: combine date ranges
        monthKey = `${String(fromDate).trim()}_${String(toDate).trim()}`;
      } else {
        // Monthly format
        const rawMonth = findVal(row, ['month', 'period', 'month_val']);
        const rawYear = findVal(row, ['year', 'year_val']);
        if (rawMonth && rawYear) {
          const yearNum = parseInt(rawYear, 10);
          let monthNum = parseInt(rawMonth, 10);
          if (isNaN(monthNum)) {
            const monthsMap: { [key: string]: string } = {
              jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
              jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
            };
            const cleanMonth = String(rawMonth).toLowerCase().substring(0, 3);
            const mapped = monthsMap[cleanMonth];
            if (mapped) {
              monthKey = `${yearNum}-${mapped}`;
            }
          } else {
            monthKey = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
          }
        } else if (rawMonth) {
          if (String(rawMonth).includes('-')) {
            monthKey = String(rawMonth).trim();
          }
        }
      }

      // 5. Financial & Activity metrics
      const liveDuration = parseFloat(findVal(row, ['live_duration', 'live duration', 'liveduration', 'live hours'], 0)) || 0;
      const partyHostDuration = parseFloat(findVal(row, ['party_host_duration', 'party host duration', 'partyhostduration', 'party duration', 'party hours'], 0)) || 0;
      
      const totalPointsVal = findVal(row, ['total_earnings_of_points', 'total earnings of points', 'total points', 'total_points', 'points', 'totalEarningsPoints'], 0);
      const totalPoints = typeof totalPointsVal === 'number' ? totalPointsVal : parseInt(String(totalPointsVal).replace(/,/g, '')) || 0;

      const myCommissionVal = findVal(row, ['agent_commission', 'agent commission', 'my_commission', 'my commission', 'my_comm', 'commission'], 0);
      const myCommission = typeof myCommissionVal === 'number' ? myCommissionVal : parseInt(String(myCommissionVal).replace(/,/g, '')) || 0;

      const liveEarnings = parseInt(String(findVal(row, ['live_earnings', 'live earnings', 'liveearnings'], 0)).replace(/,/g, '')) || 0;
      const partyEarnings = parseInt(String(findVal(row, ['party_earnings', 'party earnings', 'partyearnings'], 0)).replace(/,/g, '')) || 0;
      const privateChat = parseInt(String(findVal(row, ['private_chat', 'private chat', 'privatechat'], 0)).replace(/,/g, '')) || 0;
      const tips = parseInt(String(findVal(row, ['tips', 'tip'], 0)).replace(/,/g, '')) || 0;
      const platformReward = parseInt(String(findVal(row, ['platform_reward', 'platform reward', 'platformreward'], 0)).replace(/,/g, '')) || 0;
      const otherEarn = parseInt(String(findVal(row, ['other_earnings', 'other earnings', 'otherearn', 'other_earn'], 0)).replace(/,/g, '')) || 0;
      const platformHourlySalary = parseInt(String(findVal(row, ['platform_hourly_salary', 'platform hourly salary', 'platformhourlysalary', 'hourly salary'], 0)).replace(/,/g, '')) || 0;
      const superSalary = parseInt(String(findVal(row, ['super_salary', 'super salary', 'supersalary'], 0)).replace(/,/g, '')) || 0;
      const superRank = parseInt(String(findVal(row, ['super_rank', 'super rank', 'superrank'], 0)).replace(/,/g, '')) || 0;
      const level = parseInt(String(findVal(row, ['level', 'lvl'], 0)).replace(/,/g, '')) || 0;

      parsedCommissions.push({
        poppo_id: poppoId,
        poppo_name: nickname,
        month: monthKey,
        live_duration: liveDuration,
        live_earnings: liveEarnings,
        video_duration: 0,
        video_earnings: 0,
        agentweb_commission_rate: 0,
        agentweb_commission_earning: 0,
        total_points: totalPoints,
        total_earnings: totalPoints,
        my_commission: myCommission,
        party_host_duration: partyHostDuration,
        party_earnings: partyEarnings,
        private_chat: privateChat,
        tips: tips,
        platform_reward: platformReward,
        other_earn: otherEarn,
        platform_hourly_salary: platformHourlySalary,
        super_salary: superSalary,
        super_rank: superRank,
        level: level,
        timestamp: importTimestamp,
        from_date: fromDate ? String(fromDate).trim() : undefined,
        to_date: toDate ? String(toDate).trim() : undefined,
        year: findVal(row, ['year', 'year_val']) ? parseInt(findVal(row, ['year', 'year_val']), 10) : undefined
      });
    }

    try {
      // Commit all writes
      if (parsedCommissions.length > 0) {
        await FirebaseService.saveCommissions(parsedCommissions);
        await auditLogAction('IMPORT_FINANCIALS', null, { month: selectedMonth, count: parsedCommissions.length });
      }

      if (createdShellHosts.length > 0) {
        await FirebaseService.saveHosts(createdShellHosts);
        for (const host of createdShellHosts) {
          await auditLogAction('CREATE_SHELL_HOST', null, host);
        }
      }

      if (generatedTasks.length > 0) {
        await FirebaseService.saveTasks(generatedTasks);
        for (const task of generatedTasks) {
          await auditLogAction('CREATE_TASK_SHELL', null, task);
        }
      }

      showSuccess(`Import completed! Integrated ${parsedCommissions.length} rows. Registered ${createdShellHosts.length} shell talent placeholders and generated tasks.`);
      loadData();
    } catch (err) {
      alert("Failed to commit integrated data rows to cloud database.");
    }
  }
};

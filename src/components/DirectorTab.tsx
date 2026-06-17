/* eslint-disable */
/* eslint-disable */
/* eslint-disable security/detect-object-injection */
/* eslint-disable i18next/no-literal-string */
/* eslint-disable react/jsx-no-literals */
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
  ListTodo,
  Search,
  Settings
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
import { FirebaseService } from '../lib/firebaseService';
import { SingleDatePicker } from './InteractiveDatePicker';
import { MANAGERS, BASE_SALARY_POLICIES } from '../lib/constants';
import { SystemLogsViewer } from './SystemLogsViewer';
import { CreateMemberForm } from './CreateMemberForm';
import { RosterManagementTab } from './RosterManagementTab';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';

import { FirestoreManager } from './director-console/FirestoreManager';
import { AuthManager } from './director-console/AuthManager';
import { FunctionsMonitor } from './director-console/FunctionsMonitor';
import { StorageManager } from './director-console/StorageManager';
import { SettingsPanel } from './director-console/SettingsPanel';

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
  const isHeadAdmin = localAuth.role?.toLowerCase() === 'head admin' || localAuth.role?.toLowerCase() === 'head_admin';
  const hasAccess = isDirector || isHeadAdmin;

<<<<<<< HEAD
  // Sidebar views: overview, awards, tasks, roster_admin, financials, firestore, auth, functions, storage, settings
  const [activeView, setActiveView] = useState<'overview' | 'awards' | 'tasks' | 'roster_admin' | 'financials' | 'firestore' | 'auth' | 'functions' | 'storage' | 'settings'>('overview');
=======
  // Sidebar views: roster_management, financials, system_logs, create_user
  const [activeView, setActiveView] = useState<string>('roster_management');
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
  
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

  // Operations sub-tab states
  const [operationsSubTab, setOperationsSubTab] = useState<'livehouse' | 'tasks' | 'feedback' | 'awards'>('livehouse');
  const [livehouseRequests, setLivehouseRequests] = useState<any[]>([]);
  const [isLoadingLivehouses, setIsLoadingLivehouses] = useState(false);
  const [proposingAltReq, setProposingAltReq] = useState<any | null>(null);
  const [altDate, setAltDate] = useState('');
  const [altTimeslot, setAltTimeslot] = useState('');
  
  // Tasks desk states
  const [assigneeId, setAssigneeId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskType, setTaskType] = useState('Coaching');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskDueDateVal, setTaskDueDateVal] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Notes/Feedback Feed states
  const [managerNotes, setManagerNotes] = useState<any[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);

  // Awards states
  const [awards, setAwards] = useState<any[]>([]);
  const [awardAssignments, setAwardAssignments] = useState<any[]>([]);
  const [isLoadingAwards, setIsLoadingAwards] = useState(false);
  const [newAwardName, setNewAwardName] = useState('');
  const [newAwardColor, setNewAwardColor] = useState('Gold');
  const [newAwardStartDate, setNewAwardStartDate] = useState('');
  const [newAwardEndDate, setNewAwardEndDate] = useState('');
  const [isCreatingAward, setIsCreatingAward] = useState(false);
  const [awardCreateMode, setAwardCreateMode] = useState<'single' | 'bulk'>('single');
  const [bulkMonth, setBulkMonth] = useState('06');
  const [bulkYear, setBulkYear] = useState('2026');

  // Award Assignment states
  const [assignAwardId, setAssignAwardId] = useState('');
  const [assignHostId, setAssignHostId] = useState('');
  const [assignRoleFilter, setAssignRoleFilter] = useState('All');
  const [awardStartDate, setAwardStartDate] = useState('');
  const [awardEndDate, setAwardEndDate] = useState('');
  const [isAssigningAward, setIsAssigningAward] = useState(false);

  useEffect(() => {
    if (assignAwardId) {
      const match = awards.find(a => a.id === assignAwardId);
      if (match) {
        setAwardStartDate(match.startDate || '');
        setAwardEndDate(match.endDate || '');
      }
    } else {
      setAwardStartDate('');
      setAwardEndDate('');
    }
  }, [assignAwardId, awards]);

  // Filtered hosts for award assignment dropdown
  const filteredAssignHosts = useMemo(() => {
    return hosts.filter(h => {
      const hRole = (h.role || 'host').toLowerCase().replace('_', ' ');
      if (hRole === 'director') return false;

      if (assignRoleFilter === 'All') return true;
      const filterRole = assignRoleFilter.toLowerCase().replace('_', ' ');
      return hRole === filterRole;
    });
  }, [hosts, assignRoleFilter]);

  useEffect(() => {
    if (assignHostId) {
      const match = filteredAssignHosts.some(h => h.id === assignHostId);
      if (!match) {
        setAssignHostId('');
      }
    }
  }, [assignRoleFilter, filteredAssignHosts, assignHostId]);

  // Recalculation engine states
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [lastCalculationTime, setLastCalculationTime] = useState<number>(0);

  // Mock view states
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [mockSelectType, setMockSelectType] = useState<'role' | 'user'>(() => {
    return sessionStorage.getItem('nine_mock_user') ? 'user' : 'role';
  });
  const [userSearchQuery, setUserSearchQuery] = useState('');
  // Password manager states
  const [selectedHostForPasswordId, setSelectedHostForPasswordId] = useState<string>('');
  const [targetPassword, setTargetPassword] = useState<string>('');

  // Account access reset states
  const [resetConfirmTarget, setResetConfirmTarget] = useState<string | null>(null);
  const [isResettingAccess, setIsResettingAccess] = useState(false);

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
  const [taskDueDate, setTaskDueDate] = useState('');

  // Storage Financial Ledger states
  const [financialTab, setFinancialTab] = useState<'monthly' | 'weekly'>('monthly');
  const [financialSearchTerm, setFinancialSearchTerm] = useState('');
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
      
      // Enforce nickname if host exists, otherwise keep original but it won't be saved
      const nickname = matchingHost ? (matchingHost.nickname || matchingHost.name) : (r[3]?.trim() || 'Pending Intake');

      let parsedYear = new Date().getFullYear();
      let parsedMonth = '';
      const r1 = r[1]?.trim() || '';
      const r2 = r[2]?.trim() || '';
      
      // If r2 is just a 4-digit year (e.g. "2024"), it's the old monthly format
      if (/^20\d{2}$/.test(r2)) {
        parsedYear = parseInt(r2);
        parsedMonth = r1;
      } else if (r1) {
        // Otherwise, it's a date (e.g. "2024-05-01", "05/01/2024", or "20/05/24")
        const d = new Date(r1);
        if (!isNaN(d.getTime())) {
          parsedYear = d.getFullYear();
          parsedMonth = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
        } else {
          // Fallback: try to find a 4-digit year or 2-digit year at the end
          const match4 = r1.match(/\b(20\d{2})\b/);
          const match2 = r1.match(/\/(\d{2})$/);
          if (match4) {
            parsedYear = parseInt(match4[1]);
          } else if (match2) {
            parsedYear = 2000 + parseInt(match2[1]);
          }
          parsedMonth = r1;
        }
      }

      const rowObj = {
        poppo_id: poppoId,
        poppo_name: nickname, // Required by CommissionEntry
        month: parsedMonth, // Required by CommissionEntry
        year: parsedYear, // Ensure year is present
        from_date: r1,
        to_date: r2,
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
        level: parseInt(r[17]?.replace(/,/g, '')) || 0,
        // Legacy Required fields to satisfy TS CommissionEntry
        video_duration: 0,
        video_earnings: 0,
        agentweb_commission_rate: 0,
        agentweb_commission_earning: 0,
        total_earnings: parseInt(r[6]?.replace(/,/g, '')) || 0,
        my_commission: parseInt(r[7]?.replace(/,/g, '')) || 0,
        _isUnknownHost: !matchingHost // Used to filter out before saving
      };

      parsed.push(rowObj);
    }
    setLedger(prev => [...prev, ...parsed]);
    showSuccess(`Successfully added ${parsed.length} rows locally. Click "Save Changes" to upload.`);
  };



  const handleSaveChanges = async () => {
    setIsSavingFinancials(true);
    try {
      const type = financialTab;
      const data = type === 'monthly' ? monthlyLedger : weeklyLedger;
      
      // Only save rows where the poppo_id is found in the users list (hosts)
      const validDataToSave = data.filter(row => hosts.some(h => String(h.id).trim() === String(row.poppo_id).trim()));
      const unknownCount = data.length - validDataToSave.length;

      // Save to the performance_report collection as requested
      await FirebaseService.savePerformanceReport(validDataToSave);
      
      // We also save to the original endpoint for backward compatibility (optional)
      try {
        await FirebaseService.saveFinancials(type, validDataToSave);
      } catch (e) {
        console.warn("Legacy saveFinancials failed, but performance_reports succeeded", e);
      }
      
      await auditLogAction('SAVE_FINANCIALS_STORAGE', null, { type, count: validDataToSave.length });

      if (type === 'monthly') {
        setCommissions(validDataToSave);
      }

      let successMsg = `Financials saved successfully (${validDataToSave.length} rows) to Firebase Storage.`;
      if (unknownCount > 0) {
        successMsg += ` Note: ${unknownCount} rows were ignored because their Poppo IDs are not in the users database.`;
      }
      showSuccess(successMsg);
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

  // Load operations data
  useEffect(() => {
    if (activeView !== 'operations') return;

    const loadOperationsData = async () => {
      setIsLoadingLivehouses(true);
      setIsLoadingNotes(true);
      setIsLoadingAwards(true);

      try {
        // 1. Fetch livehouse requests
        const liveSnap = await getDocs(collection(db, 'livehouse_requests'));
        const liveList: any[] = [];
        liveSnap.forEach(d => {
          liveList.push({ id: d.id, ...d.data() });
        });
        liveList.sort((a, b) => {
          if (a.status === 'Pending Approval' && b.status !== 'Pending Approval') return -1;
          if (a.status !== 'Pending Approval' && b.status === 'Pending Approval') return 1;
          return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
        });
        setLivehouseRequests(liveList);

        // 2. Fetch manager notes
        const notesSnap = await getDocs(collection(db, 'notes'));
        const notesList: any[] = [];
        notesSnap.forEach(d => {
          notesList.push({ id: d.id, ...d.data() });
        });
        notesList.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
        setManagerNotes(notesList);

        // 3. Fetch awards and assignments
        const awardsSnap = await getDocs(collection(db, 'awards'));
        const awardsList: any[] = [];
        awardsSnap.forEach(d => {
          awardsList.push({ id: d.id, ...d.data() });
        });
        setAwards(awardsList);

        const assignSnap = await getDocs(collection(db, 'award_assignments'));
        const assignList: any[] = [];
        assignSnap.forEach(d => {
          assignList.push({ id: d.id, ...d.data() });
        });
        assignList.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
        setAwardAssignments(assignList);

      } catch (err) {
        console.error('Error loading operations data:', err);
      } finally {
        setIsLoadingLivehouses(false);
        setIsLoadingNotes(false);
        setIsLoadingAwards(false);
      }
    };

    loadOperationsData();
  }, [activeView]);

  const handleApproveLivehouse = async (req: any) => {
    try {
      const docRef = doc(db, 'livehouse_requests', req.id);
      await setDoc(docRef, { ...req, status: 'Approved' }, { merge: true });

      const eventId = getUUID();
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
        created_by_name: localAuth.nickname || localAuth.name || 'Director',
        created_by_role: localAuth.role || 'Director',
        created_by_id: localAuth.poppo_id || 'DirectorAdmin',
        visibility: 'All',
        participants: [req.poppoId],
        participantIds: [req.poppoId],
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'calendar', eventId), newEvent);
      await FirebaseService.logSystemActivity(`Approved Livehouse request for host "${req.name}" (Poppo ID: ${req.poppoId}) on ${req.date} at ${req.timeslot}`, 'Info');
      
      setLivehouseRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'Approved' } : r));
      setSuccessMessage(`Successfully approved Livehouse request for ${req.name}!`);
    } catch (err: any) {
      console.error('Approve livehouse error:', err);
      setErrorMessage(err.message || 'Approve failed');
    }
  };

  const handleDenyLivehouse = async (req: any) => {
    try {
      const docRef = doc(db, 'livehouse_requests', req.id);
      await setDoc(docRef, { ...req, status: 'Closed' }, { merge: true });
      await FirebaseService.logSystemActivity(`Denied/Closed Livehouse request for host "${req.name}" (Poppo ID: ${req.poppoId})`, 'Warning');
      setLivehouseRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'Closed' } : r));
      setSuccessMessage(`Closed livehouse request for ${req.name}`);
    } catch (err: any) {
      console.error('Deny livehouse error:', err);
      setErrorMessage(err.message || 'Deny failed');
    }
  };

  const handleProposeAlternate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposingAltReq || !altDate || !altTimeslot) return;
    try {
      const docRef = doc(db, 'livehouse_requests', proposingAltReq.id);
      await setDoc(docRef, {
        ...proposingAltReq,
        proposedDate: altDate,
        proposedTimeslot: altTimeslot,
        status: 'Proposal Sent',
        proposedBy: 'Director',
        timestamp: new Date().toISOString()
      }, { merge: true });
      await FirebaseService.logSystemActivity(`Proposed alternate slot for Livehouse request: host "${proposingAltReq.name}" (Poppo ID: ${proposingAltReq.poppoId}) to ${altDate} at ${altTimeslot}`, 'Info');

      setLivehouseRequests(prev => prev.map(r => r.id === proposingAltReq.id ? {
        ...r,
        proposedDate: altDate,
        proposedTimeslot: altTimeslot,
        status: 'Proposal Sent',
        proposedBy: 'Director'
      } : r));

      setSuccessMessage(`Proposed alternative date/time for ${proposingAltReq.name}`);
      setProposingAltReq(null);
      setAltDate('');
      setAltTimeslot('');
    } catch (err: any) {
      console.error('Propose alternate error:', err);
      setErrorMessage(err.message || 'Proposal failed');
    }
  };

  const handleDirectorTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigneeId || !taskTitle || !taskDueDateVal) {
      setErrorMessage('All fields are required.');
      return;
    }
    setIsSubmittingTask(true);
    setErrorMessage(null);
    setSuccessMessage('');

    try {
      const taskId = getUUID();
      const newTask = {
        taskId,
        assignerId: localAuth.poppo_id || 'DirectorAdmin',
        assigneeId: assigneeId,
        assignedToUserId: assigneeId,
        relatedPoppoId: assigneeId,
        taskType,
        title: taskTitle,
        description: taskDescription,
        content: taskDescription,
        status: 'Assigned',
        dueDate: taskDueDateVal,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'tasks', taskId), newTask);
      await FirebaseService.logSystemActivity(`Director/Admin created and assigned task "${taskTitle}" to host ID: ${assigneeId}`, 'Info');
      setSuccessMessage(`Successfully assigned task "${taskTitle}"!`);
      setTasks(prev => [newTask as any, ...prev]);
      setAssigneeId('');
      setTaskTitle('');
      setTaskDescription('');
      setTaskDueDateVal('');
    } catch (err: any) {
      console.error('Task assignment failed:', err);
      setErrorMessage(err.message || 'Failed to assign task.');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleDirectorDeleteTask = async (taskId: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    const target = tasks.find(t => t.taskId === taskId);
    const taskTitle = target ? target.title : 'Unknown Task';
    const assigneeId = target ? target.assigneeId : 'Unknown Host';
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      setTasks(prev => prev.filter(t => t.taskId !== taskId));
      await FirebaseService.logSystemActivity(`Director/Admin deleted task "${taskTitle}" assigned to host ID: ${assigneeId}`, 'Warning');
      setSuccessMessage('Task successfully deleted.');
    } catch (err: any) {
      console.error('Delete task error:', err);
      setErrorMessage(err.message || 'Failed to delete task.');
    }
  };

  const handleCreateAward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAwardName.trim() || !newAwardStartDate || !newAwardEndDate) return;
    setIsCreatingAward(true);
    setErrorMessage(null);
    setSuccessMessage('');

    try {
      const awardId = getUUID();
      const newAward = {
        id: awardId,
        name: newAwardName.trim(),
        color: newAwardColor,
        startDate: newAwardStartDate,
        endDate: newAwardEndDate,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'awards', awardId), newAward);
      await FirebaseService.logSystemActivity(`Director/Admin created new award badge "${newAward.name}" with color "${newAward.color}"`, 'Info');
      setAwards(prev => [...prev, newAward]);
      setNewAwardName('');
      setNewAwardStartDate('');
      setNewAwardEndDate('');
      setSuccessMessage(`Award "${newAward.name}" created successfully!`);
    } catch (err: any) {
      console.error('Create award error:', err);
      setErrorMessage(err.message || 'Failed to create award.');
    } finally {
      setIsCreatingAward(false);
    }
  };

  const handleBulkGenerateAwards = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkMonth || !bulkYear) return;
    setIsCreatingAward(true);
    setErrorMessage(null);
    setSuccessMessage('');

    try {
      const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const monthIndex = parseInt(bulkMonth, 10) - 1;
      const monthName = months[monthIndex];
      const yearNum = parseInt(bulkYear, 10);

      // Compute start and end dates
      const pad = (n: number) => String(n).padStart(2, '0');
      const startDateStr = `${yearNum}-${pad(bulkMonth)}-01`;
      
      const lastDay = new Date(yearNum, monthIndex + 1, 0).getDate();
      const endDateStr = `${yearNum}-${pad(bulkMonth)}-${pad(lastDay)}`;

      const newAwardsList: any[] = [];
      const batch = writeBatch(db);

      for (let rank = 1; rank <= 9; rank++) {
        const awardId = getUUID();
        
        let color = 'Gold';
        if (rank >= 4 && rank <= 6) color = 'Orange';
        else if (rank >= 7) color = 'Red';

        const newAward = {
          id: awardId,
          name: `Top ${rank} Niner - ${monthName} ${bulkYear}`,
          color,
          startDate: startDateStr,
          endDate: endDateStr,
          createdAt: new Date().toISOString()
        };

        batch.set(doc(db, 'awards', awardId), newAward);
        newAwardsList.push(newAward);
      }

      await batch.commit();
      await FirebaseService.logSystemActivity(`Director/Admin bulk generated Monthly Top Niners awards templates for ${monthName} ${bulkYear}`, 'Info');
      
      setAwards(prev => [...prev, ...newAwardsList]);
      setSuccessMessage(`Successfully generated 9 Monthly Top Niner awards for ${monthName} ${bulkYear}!`);
    } catch (err: any) {
      console.error('Bulk generate awards error:', err);
      setErrorMessage(err.message || 'Failed to bulk generate awards.');
    } finally {
      setIsCreatingAward(false);
    }
  };

  const handleAssignAward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignAwardId || !assignHostId || !awardStartDate || !awardEndDate) {
      setErrorMessage('All assignment fields are required.');
      return;
    }
    setIsAssigningAward(true);
    setErrorMessage(null);
    setSuccessMessage('');

    const matchedAward = awards.find(a => a.id === assignAwardId);
    const matchedHost = hosts.find(h => h.id === assignHostId);
    
    if (!matchedAward || !matchedHost) {
      setErrorMessage('Award or Host not found.');
      setIsAssigningAward(false);
      return;
    }

    try {
      const assignmentId = getUUID();
      const newAssignment = {
        id: assignmentId,
        awardId: assignAwardId,
        awardName: matchedAward.name,
        awardColor: matchedAward.color,
        hostId: assignHostId,
        hostNickname: matchedHost.nickname || matchedHost.name,
        startDate: awardStartDate,
        endDate: awardEndDate,
        assignedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'award_assignments', assignmentId), newAssignment);
      await FirebaseService.logSystemActivity(`Director/Admin assigned award badge "${matchedAward.name}" to host "${newAssignment.hostNickname}" (Poppo ID: ${assignHostId}) from ${awardStartDate} to ${awardEndDate}`, 'Info');
      setAwardAssignments(prev => [newAssignment, ...prev]);
      setAssignAwardId('');
      setAssignHostId('');
      setAwardStartDate('');
      setAwardEndDate('');
      setSuccessMessage(`Assigned award "${matchedAward.name}" to host "${newAssignment.hostNickname}"!`);
    } catch (err: any) {
      console.error('Assign award error:', err);
      setErrorMessage(err.message || 'Failed to assign award.');
    } finally {
      setIsAssigningAward(false);
    }
  };

  const handleRevokeAssignment = async (assignmentId: string) => {
    if (!window.confirm('Are you sure you want to revoke this award assignment?')) return;
    const target = awardAssignments.find(a => a.id === assignmentId);
    const awardName = target ? target.awardName : 'Unknown Award';
    const hostNickname = target ? target.hostNickname : 'Unknown Host';
    const hostId = target ? target.hostId : 'Unknown ID';
    try {
      await deleteDoc(doc(db, 'award_assignments', assignmentId));
      setAwardAssignments(prev => prev.filter(a => a.id !== assignmentId));
      await FirebaseService.logSystemActivity(`Director/Admin revoked award badge "${awardName}" from host "${hostNickname}" (Poppo ID: ${hostId})`, 'Warning');
      setSuccessMessage('Award assignment revoked.');
    } catch (err: any) {
      console.error('Revoke assignment error:', err);
      setErrorMessage(err.message || 'Failed to revoke assignment.');
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
        FirebaseService.fetchFinancials('weekly'),
        FirebaseService.getAllRoleMetadata() // Fetch all users for view-as search
      ]);
      const timeoutPromise = new Promise<[Host[], Task[], ActivityAuditLog[], TopNinersEarningsSummary[], any[], any[], any[]]>((_, reject) =>
        setTimeout(() => reject(new Error("Director data fetch timed out")), 15000)
      );
      const [hList, tList, aList, summaries, storedMonthly, storedWeekly, uList] = await Promise.race([fetchPromise, timeoutPromise]);
      setHosts(hList.length > 0 ? hList : Storage.getHosts());
      setTasks(tList);
      setAllUsers(uList || []);
      
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

      // Map to system logs
      let systemDescription = '';
      let severity: 'Info' | 'Warning' | 'Error' = 'Info';

      const parseVal = (val: any) => {
        if (typeof val === 'string') {
          try {
            return JSON.parse(val);
          } catch (e) {
            return val;
          }
        }
        return val;
      };

      const before = parseVal(beforeValue);
      const after = parseVal(afterValue);

      switch (actionType) {
        case 'SAVE_FINANCIALS_STORAGE':
          systemDescription = `Financial ledger (${after?.type || 'unknown'}) saved to storage with ${after?.count || 0} valid entries.`;
          break;
        case 'IMPORT_FINANCIALS':
          systemDescription = `Financial ledger imported for ${after?.month || 'unknown'} with ${after?.count || 0} records.`;
          break;
        case 'RESET_ACCOUNT_ACCESS':
          systemDescription = `Reset account access for user ID: ${before?.poppoId || 'unknown'}.`;
          severity = 'Warning';
          break;
        case 'CONVERT_RECOMMENDATION_TO_TASK':
          systemDescription = `Converted exposure insight recommendation to task: "${after?.title || ''}" assigned to host ${after?.assigneeId || ''}.`;
          break;
        case 'ASSIGN_AWARD':
          systemDescription = `Assigned scoreboard award badge "${after?.profilePhotoUrl || 'None'}" to host "${after?.nickname || ''}" (Poppo ID: ${after?.poppoId || ''}) for ${after?.periodKey || ''}.`;
          break;
        case 'CREATE_TASK':
          systemDescription = `Created and assigned task "${after?.title || ''}" to host ${after?.assigneeId || ''}.`;
          break;
        case 'UPDATE_TASK':
          systemDescription = `Updated task "${after?.title || ''}" assigned to host ${after?.assigneeId || ''}.`;
          break;
        case 'DELETE_TASK':
          systemDescription = `Deleted task "${before?.title || ''}" previously assigned to host ${before?.assigneeId || ''}.`;
          severity = 'Warning';
          break;
        case 'CREATE_HOST':
          systemDescription = `Manually created host profile for "${after?.nickname || after?.name || ''}" (Poppo ID: ${after?.id || ''}).`;
          break;
        case 'CREATE_SHELL_HOST':
          systemDescription = `Created temporary/shell host profile for "${after?.nickname || ''}" during ledger import.`;
          break;
        case 'RESET_HOST_PASSWORD':
          systemDescription = `Reset password and set temporary flag for host "${after?.nickname || ''}" (Poppo ID: ${after?.id || ''}).`;
          severity = 'Warning';
          break;
        case 'UPDATE_HOST':
          systemDescription = `Updated host details for "${after?.nickname || after?.name || ''}" (Poppo ID: ${after?.id || ''}).`;
          break;
        case 'UPDATE_HOST_ROLE':
          systemDescription = `Updated role or metadata for host "${after?.nickname || ''}" (Poppo ID: ${after?.id || ''}) to role "${after?.role || ''}".`;
          break;
        case 'DELETE_HOST':
          systemDescription = `Deleted host "${before?.nickname || before?.name || ''}" (Poppo ID: ${before?.id || ''}).`;
          severity = 'Warning';
          break;
        case 'MERGE_HOST_DUPLICATE':
          systemDescription = `Merged duplicate host identity for "${after?.nickname || ''}" (Poppo ID: ${after?.id || ''}).`;
          break;
        case 'UPDATE_COMMISSION':
          systemDescription = `Updated commission override entry for host ${after?.poppo_id || ''} for month ${after?.month || ''}.`;
          break;
        case 'DELETE_COMMISSION':
          systemDescription = `Deleted commission override entry for host ${before?.poppo_id || ''} for month ${before?.month || ''}.`;
          severity = 'Warning';
          break;
        case 'CREATE_TASK_SHELL':
          systemDescription = `Created shell task: "${after?.title || ''}" for host ${after?.assigneeId || ''}.`;
          break;
        case 'UPDATE_ROSTER_MEMBER':
          systemDescription = `Updated roster profile settings for "${after?.nickname || ''}" (Poppo ID: ${after?.id || after?.poppo_id || ''}).`;
          break;
        case 'UPLOAD_PROFILE_PHOTO':
          systemDescription = `Uploaded new profile photo for user ID: ${after?.hostId || ''}.`;
          break;
        default:
          systemDescription = `Administrative action performed: ${actionType}`;
      }

      if (systemDescription) {
        await FirebaseService.logSystemActivity(systemDescription, severity);
      }

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

  const handleResetAccountAccess = (poppoId: string) => {
    if (localAuth.level < 5) {
      setErrorMessage("Only Directors are authorized to reset account access.");
      return;
    }
    setResetConfirmTarget(poppoId);
  };

  const handleConfirmReset = async () => {
    if (!resetConfirmTarget) return;
    if (localAuth.level < 5) {
      setErrorMessage("Only Directors are authorized to reset account access.");
      setResetConfirmTarget(null);
      return;
    }

    setIsResettingAccess(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/admin/reset-account-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localAuth.token}`,
        },
        body: JSON.stringify({ poppoId: resetConfirmTarget }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to reset account access.');
      }

      showSuccess(`Account access successfully reset for Poppo ID: ${resetConfirmTarget}`);
      
      // Log audit trail
      await auditLogAction('RESET_ACCOUNT_ACCESS', { poppoId: resetConfirmTarget }, { resetComplete: true });

      // Reload data
      loadData();
    } catch (err: any) {
      console.error("Reset access failed:", err);
      setErrorMessage(err.message || "Failed to reset account access.");
    } finally {
      setIsResettingAccess(false);
      setResetConfirmTarget(null);
    }
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
        if (host.tier_pay === 'S idol' || host.level > 10) return 92;
        if (host.tier_pay === 'Rocket Host') return 88;
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
        <Shield size={64} className="text-[#FFB800]/20" />
        <h2 className="text-2xl font-black text-[#F5F5F5]">Leadership Credentials Required</h2>
        <p className="max-w-md text-[#B0B0B0] font-medium text-sm">This cockpit is restricted to Director level only. Please authenticate with credentials to access this system.</p>
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
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#B0B0B0]/40">Director Portal</h4>
          </div>
<<<<<<< HEAD
          <div className="text-xs font-bold text-[#F5F5F5] truncate">{localAuth.name}</div>
          <div className="text-[9px] text-[#FFB800] font-black mt-1 uppercase tracking-wider">Secure Session Active</div>
        </div>

        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'awards', label: 'Awards & Badges', icon: Award },
          { id: 'tasks', label: 'Tasks Desk', icon: ListTodo },
          { id: 'roster_admin', label: 'Roster Admin', icon: Users },
          { id: 'financials', label: 'Financials', icon: Database },
          { id: 'firestore', label: 'Database', icon: Database },
          { id: 'auth', label: 'Authentication', icon: Shield },
          { id: 'functions', label: 'Cloud Functions', icon: Activity },
          { id: 'storage', label: 'Storage', icon: FolderPlus },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map(item => (
=======
          <div className="text-xs font-bold text-[#F0EFE8] truncate">{localAuth.name}</div>
          <div className="text-[9px] text-[#D4AF37] font-black mt-1 uppercase tracking-wider">Secure Session Active</div>
          
          {isDirector && (
            <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-black uppercase text-[#A09E9A]/60 tracking-[0.2em]">View As Gating</label>
                <div className="flex gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5">
                  <button
                    type="button"
                    onClick={() => setMockSelectType('role')}
                    className={cn(
                      "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      mockSelectType === 'role' ? "bg-indigo-500 text-white font-extrabold" : "text-[#A09E9A] hover:text-[#F0EFE8]"
                    )}
                  >
                    Role
                  </button>
                  <button
                    type="button"
                    onClick={() => setMockSelectType('user')}
                    className={cn(
                      "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer",
                      mockSelectType === 'user' ? "bg-indigo-500 text-white font-extrabold" : "text-[#A09E9A] hover:text-[#F0EFE8]"
                    )}
                  >
                    User
                  </button>
                </div>
              </div>

              {mockSelectType === 'role' ? (
                <select
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                  value={localAuth.mockRole && !sessionStorage.getItem('nine_mock_user') ? localAuth.mockRole : ''}
                  onChange={(e) => {
                    Storage.setMockUser(null); // Clear specific user first
                    Storage.setMockRole(e.target.value || null);
                    window.location.reload();
                  }}
                  title="View system as another role"
                >
                  <option value="">-- Director (Default) --</option>
                  <option value="host">Host</option>
                  <option value="manager">Manager</option>
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </select>
              ) : (
                <div className="space-y-2 relative">
                  <input
                    type="text"
                    placeholder="Search name or Poppo ID..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500/50"
                    title="Search user to mock"
                  />
                  
                  {/* Search Results Dropdown */}
                  {userSearchQuery.trim() !== '' && (
                    <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[#13131E] border border-white/10 rounded-lg shadow-2xl z-50 divide-y divide-white/5 custom-scrollbar">
                      {(() => {
                        const q = userSearchQuery.toLowerCase().trim();
                        const matches = allUsers.filter(u => {
                          const name = String(u.nickname || u.name || '').toLowerCase();
                          const poppoId = String(u.poppo_id || u.id || '').toLowerCase();
                          return name.includes(q) || poppoId.includes(q);
                        });

                        if (matches.length === 0) {
                          return <div className="p-3 text-[10px] text-center text-white/30 italic">No matching users</div>;
                        }

                        return matches.map(u => (
                          <button
                            key={u.poppo_id || u.id}
                            type="button"
                            onClick={() => {
                              const mockUser = {
                                poppo_id: u.poppo_id || u.id,
                                role: u.role,
                                nickname: u.nickname || u.name,
                                name: u.name || u.nickname
                              };
                              Storage.setMockUser(mockUser);
                              window.location.reload();
                            }}
                            className="w-full text-left p-2.5 hover:bg-white/5 transition-colors flex flex-col gap-0.5 cursor-pointer"
                          >
                            <div className="text-xs font-bold text-[#F0EFE8]">{u.nickname || u.name}</div>
                            <div className="text-[9px] font-mono text-[#A09E9A] flex items-center gap-1">
                              <span className="text-[#D4AF37] capitalize font-sans font-bold">{(u.role || 'host').replace('_', ' ')}</span>
                              <span>•</span>
                              <span>ID: {u.poppo_id || u.id}</span>
                            </div>
                          </button>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {[
          { id: 'roster_management', label: 'Roster Management', icon: Users },
          { id: 'operations', label: 'Operations', icon: Briefcase },
          isDirector && { id: 'create_user', label: 'Provision User', icon: UserPlus },
          isDirector && { id: 'financials', label: 'Financial Data', icon: FileUp },
          { id: 'system_logs', label: 'System Logs', icon: AlertCircle },
        ].filter((item): item is { id: string; label: string; icon: any } => !!item).map(item => (
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
          <button
            key={item.id}
            onClick={() => { setActiveView(item.id as any); setErrorMessage(null); }}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group relative cursor-pointer",
              activeView === item.id 
                ? "bg-[#1A1A1A] text-[#F5F5F5] border border-white/5 shadow-xl" 
                : "text-[#B0B0B0] hover:bg-white/[0.02] hover:text-[#F5F5F5]"
            )}
            title={`Switch to ${item.label} view`}
            aria-label={`Switch to ${item.label} view`}
          >
            <item.icon size={18} className={cn("transition-colors", activeView === item.id ? "text-indigo-400" : "group-hover:text-[#F5F5F5]")} />
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
          <div className="flex flex-col items-center justify-center py-20 text-center text-[#B0B0B0]/40 italic">
            <Loader2 className="animate-spin text-[#FFB800] mb-2" size={32} />
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
                    <p className="text-[9px] font-black uppercase text-[#B0B0B0]/60 tracking-[0.2em]">Active Hosts Roster</p>
                    <div className="mt-4 flex items-end gap-3">
                      <span className="text-4xl font-black text-[#F5F5F5] leading-none">{hosts.filter(h => h.status === 'Active').length}</span>
                      <span className="text-[10px] font-black uppercase text-emerald-500 mb-1">Live Anchors</span>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl border border-white/5 bg-white/[0.01] tech-card">
                    <p className="text-[9px] font-black uppercase text-[#B0B0B0]/60 tracking-[0.2em]">Selected Month Commissions</p>
                    <div className="mt-4 flex items-end gap-3">
                      <span className="text-4xl font-black text-indigo-400 leading-none">
                        {commissions.filter(c => c.month === selectedMonth).reduce((sum, c) => sum + (c.my_commission || 0), 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] font-black uppercase text-[#B0B0B0]/40 mb-1">Points</span>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl border border-white/5 bg-white/[0.01] tech-card">
                    <p className="text-[9px] font-black uppercase text-[#B0B0B0]/60 tracking-[0.2em]">Total Tasks Queue</p>
                    <div className="mt-4 flex items-end gap-3">
                      <span className="text-4xl font-black text-amber-500 leading-none">
                        {tasks.filter(t => t.status !== 'Completed').length}
                      </span>
                      <span className="text-[10px] font-black uppercase text-[#B0B0B0]/40 mb-1">Open Items</span>
                    </div>
                  </div>
                </div>

                {/* AI Recommendations Engine section */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg flex items-center gap-2 text-[#F5F5F5]">
                      <Zap size={18} className="text-[#FFB800]" />
                      System AI Recommendations Engine
                    </h3>
                    <button 
                      onClick={() => runRecommendationsEngine(true)}
                      className="px-4 py-1.5 bg-[#FFB800]/10 hover:bg-[#FFB800] border border-[#FFB800]/20 text-[#FFB800] hover:text-[#111111] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      title="Recalculate recommendation metrics"
                      aria-label="Recalculate recommendation metrics"
                    >
                      Recalculate Loop
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {insights.length === 0 ? (
                      <div className="col-span-3 text-center py-12 border border-dashed border-white/10 rounded-3xl text-[#B0B0B0]/30 italic text-xs">
                        No recommendations generated for this cycle. Roster and performance points are stable.
                      </div>
                    ) : (
                      insights.map(item => (
                        <div 
                          key={item.id} 
                          className={cn(
                            "p-6 rounded-3xl border flex flex-col justify-between h-56 tech-card",
                            item.priority === 'High' ? 'border-red-500/20 bg-red-500/[0.02]' :
                            item.priority === 'Medium' ? 'border-amber-500/20 bg-amber-500/[0.02]' : 'border-[#FFB800]/20 bg-[#FFB800]/[0.02]'
                          )}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className={cn(
                                "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                                item.priority === 'High' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
<<<<<<< HEAD
                                item.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-[#FFB800]/10 text-[#FFB800] border border-[#FFB800]/20'
=======
                                item.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
                              )}>
                                {item.priority} Priority
                              </span>
                              <span className="text-[9px] font-mono text-[#B0B0B0]/40">{item.triggerMetric}</span>
                            </div>
                            <h4 className="font-extrabold text-[#F5F5F5] text-sm line-clamp-1">{item.hostName}</h4>
                            <p className="text-[11px] text-[#B0B0B0] leading-relaxed mt-2 line-clamp-3">{item.details}</p>
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
                  <h3 className="font-bold text-lg flex items-center gap-2 text-[#F5F5F5]">
                    <AlertCircle size={18} className="text-red-400" />
                    Data Gaps Exception Queue
                  </h3>
                  <div className="tech-card !p-0 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-[9px] font-black text-[#B0B0B0]/40 uppercase tracking-[0.2em] bg-white/[0.02]">
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
                            <td colSpan={5} className="py-12 text-center text-[#B0B0B0]/30 italic">No operational data gaps or anomalies detected. Roster is fully intact.</td>
                          </tr>
                        ) : (
                          exceptionQueue.map((item, idx) => (
                            <tr key={idx} className="hover:bg-white/[0.01] transition-colors">
                              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{item.hostId}</td>
                              <td className="px-6 py-4 font-bold text-[#F5F5F5]">{item.name}</td>
                              <td className="px-6 py-4 text-slate-300 font-medium">{item.gapType}</td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                                  item.severity === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                  item.severity === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                  'bg-slate-500/10 text-[#B0B0B0] border-slate-500/20'
                                )}>
                                  {item.severity}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-[#B0B0B0]/60">{item.details}</td>
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
                        <thead className="sticky top-0 bg-[#0A0A0A] z-10 border-b border-white/5">
                          <tr className="text-[9px] font-black text-[#B0B0B0]/20 uppercase tracking-[0.2em] bg-[#0A0A0A]">
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
                              <td colSpan={5} className="py-12 text-center text-[#B0B0B0]/20 italic">No activity logs recorded.</td>
                            </tr>
                          ) : (
                            auditLogs.map((log) => (
                              <tr key={log.logId} className="hover:bg-white/[0.01] transition-colors font-mono text-[10px]">
                                <td className="px-6 py-3 text-[#B0B0B0]/40 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                                <td className="px-6 py-3 font-bold text-indigo-400">{log.actorUserId}</td>
                                <td className="px-6 py-3 text-[#F5F5F5] font-bold uppercase">{log.actionType}</td>
                                <td className="px-6 py-3 text-[#B0B0B0]/30 truncate max-w-[180px]" title={log.beforeValue}>{log.beforeValue}</td>
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
                      <Award size={20} className="text-[#FFB800]" />
                      Custom Monthly Awards & Badges
                    </h3>
                    <p className="text-[10px] text-[#B0B0B0]/40 uppercase tracking-widest font-black">Assign badges to top performing talent</p>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-[#1A1A1A] p-2 px-4 rounded-xl border border-white/5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#B0B0B0]/50">Target Month:</span>
                    <div className="flex items-center gap-1">
                      <select 
                        value={selectedMonth.split('-')[0]} 
                        onChange={(e) => setSelectedMonth(`${e.target.value}-${selectedMonth.split('-')[1]}`)}
                        className="bg-transparent text-indigo-400 font-bold text-xs outline-none cursor-pointer focus:ring-0"
                        title="Target Year selection"
                      >
                        <option value="2024" className="bg-[#1A1A1A] text-[#F5F5F5]">2024</option>
                        <option value="2025" className="bg-[#1A1A1A] text-[#F5F5F5]">2025</option>
                        <option value="2026" className="bg-[#1A1A1A] text-[#F5F5F5]">2026</option>
                        <option value="2027" className="bg-[#1A1A1A] text-[#F5F5F5]">2027</option>
                      </select>
                      <span className="text-white/20 text-xs">-</span>
                      <select 
                        value={selectedMonth.split('-')[1]} 
                        onChange={(e) => setSelectedMonth(`${selectedMonth.split('-')[0]}-${e.target.value}`)}
                        className="bg-transparent text-indigo-400 font-bold text-xs outline-none cursor-pointer focus:ring-0"
                        title="Target Month selection"
                      >
                        {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(m => (
                          <option key={m} value={m} className="bg-[#1A1A1A] text-[#F5F5F5]">{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="tech-card !p-0 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-[9px] font-black text-[#B0B0B0]/40 uppercase tracking-widest bg-white/[0.02]">
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
                            <td className="px-6 py-4 font-bold text-[#F5F5F5]">{host.nickname || host.name}</td>
                            <td className="px-6 py-4 text-[#B0B0B0]/40">{selectedMonth}</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                currentBadge !== 'None' ? 'bg-[#FFB800]/10 text-[#FFB800] border-[#FFB800]/20' : 'bg-[#222222] text-[#B0B0B0] border-transparent'
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
                                className="bg-[#1A1A1A] border border-white/10 rounded-lg px-2 py-1 text-xs text-[#FFB800] font-bold outline-none cursor-pointer"
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
                    <h3 className="font-bold text-xl flex items-center gap-2 text-[#F5F5F5]">
                      <ListTodo size={20} className="text-indigo-400" />
                      Tasks Coordination Desk
                    </h3>
                    <p className="text-[10px] text-[#B0B0B0]/40 uppercase tracking-widest font-black">Delegate instruction tasks to agency staff</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Create Task Form */}
                  <div className="tech-card h-fit space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FFB800] border-b border-white/5 pb-2">Delegate New Task</h4>
                    
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
                        <label htmlFor="task-assignee" className="text-[9px] font-black uppercase text-[#B0B0B0]/40 tracking-wider">Assignee Role</label>
                        <select id="task-assignee" name="assignedTo" className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#F5F5F5]" title="Select assignee role" aria-label="Select assignee role">
                          <option value="support_staff" className="bg-[#1A1A1A] text-[#F5F5F5]">Support Staff (Assistant)</option>
                          <option value="Manager" className="bg-[#1A1A1A] text-[#F5F5F5]">Manager</option>
                          <option value="Admin" className="bg-[#1A1A1A] text-[#F5F5F5]">Admin</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="task-related-poppo" className="text-[9px] font-black uppercase text-[#B0B0B0]/40 tracking-wider">Related Talent</label>
                        <select id="task-related-poppo" name="relatedPoppo" className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#F5F5F5]" title="Select related talent" aria-label="Select related talent">
                          <option value="" className="bg-[#1A1A1A] text-[#F5F5F5]">-- No Related Host --</option>
                          {hosts.map(h => (
                            <option key={h.id} value={h.id} className="bg-[#1A1A1A] text-[#F5F5F5]">{h.nickname || h.name} ({h.id})</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="task-type" className="text-[9px] font-black uppercase text-[#B0B0B0]/40 tracking-wider">Task Type</label>
                        <input id="task-type" name="type" type="text" placeholder="e.g. Coaching" className="w-full glass-input text-xs text-[#F5F5F5]" required title="Enter task type" aria-label="Enter task type" />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="task-title" className="text-[9px] font-black uppercase text-[#B0B0B0]/40 tracking-wider">Task Title</label>
                        <input id="task-title" name="title" type="text" placeholder="Complete Profile Info" className="w-full glass-input text-xs text-[#F5F5F5]" required title="Enter task title" aria-label="Enter task title" />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="task-description" className="text-[9px] font-black uppercase text-[#B0B0B0]/40 tracking-wider">Task Description</label>
                        <textarea id="task-description" name="description" placeholder="Specify missing fields or guidelines..." className="w-full glass-input text-xs text-[#F5F5F5] h-20 resize-none" required title="Enter task description" aria-label="Enter task description" />
                      </div>

                      <div className="space-y-1.5">
<<<<<<< HEAD
                        <label htmlFor="task-due-date" className="text-[9px] font-black uppercase text-[#B0B0B0]/40 tracking-wider">Due Date</label>
                        <input id="task-due-date" name="dueDate" type="date" className="w-full glass-input text-xs text-[#F5F5F5] [color-scheme:dark]" required title="Select task due date" aria-label="Select task due date" />
=======
                        <label htmlFor="task-due-date" className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">Due Date</label>
                        <SingleDatePicker 
                          id="task-due-date" 
                          name="dueDate" 
                          value={taskDueDate} 
                          onChange={(val) => setTaskDueDate(val)} 
                          required 
                          title="Select task due date" 
                        />
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
                      </div>

                      <button type="submit" className="w-full py-3 btn-gold rounded-xl text-xs font-black uppercase tracking-widest text-[#111111] transition-all shadow-lg active:scale-95 cursor-pointer">
                        Delegate Task
                      </button>
                    </form>
                  </div>

                  {/* Tasks List */}
                  <div className="lg:col-span-2 space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#B0B0B0]/40">Active Assignments</h4>
                    
                    <div className="space-y-3">
                      {tasks.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-white/10 rounded-3xl text-[#B0B0B0]/30 italic text-xs">
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
                              <h5 className="font-black text-[#F5F5F5] text-sm">{task.title}</h5>
                              <p className="text-xs text-[#B0B0B0]/60 leading-relaxed font-medium">{task.description}</p>
                              <div className="text-[9px] text-[#B0B0B0]/40 font-bold flex gap-4 pt-1">
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
                                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-[#111111] rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer"
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
                                className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-[#111111] rounded-lg transition-all cursor-pointer"
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
                          teamAnchor: String(formData.get('teamAnchor') || 'Unassigned'),
                          manager: 'Nine Management',
                          anchor_type: 'Nine Agency',
                          tier_pay: 'N/A',
                          status: 'Active',
                          level: 1,

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
                        teamAnchor: String(formData.get('teamAnchor') || 'Unassigned'),
                        manager: String(formData.get('manager') || 'Nine Management'),
                        anchor_type: 'Nine Agency',
                        tier_pay: 'N/A',
                        status: 'Active',
                        level: 1,

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
                      <label htmlFor="reg-poppo-id" className="text-[9px] font-black uppercase text-[#B0B0B0]/40 tracking-wider">Poppo ID</label>
                      <input id="reg-poppo-id" name="poppoId" type="text" placeholder="Enter numeric PoppoID" className="w-full glass-input text-xs text-[#F5F5F5]" required title="Enter numeric Poppo ID" aria-label="Enter numeric Poppo ID" />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="reg-name" className="text-[9px] font-black uppercase text-[#B0B0B0]/40 tracking-wider">Display Name</label>
                      <input id="reg-name" name="name" type="text" placeholder="Display name" className="w-full glass-input text-xs text-[#F5F5F5]" required title="Enter Display Name" aria-label="Enter Display Name" />
                    </div>
                    <div className="space-y-1.5">
<<<<<<< HEAD
                      <label htmlFor="reg-team" className="text-[9px] font-black uppercase text-[#B0B0B0]/40 tracking-wider">Team Group</label>
                      <input id="reg-team" name="team" type="text" placeholder="Unassigned" className="w-full glass-input text-xs text-[#F5F5F5]" title="Enter Team Group" aria-label="Enter Team Group" />
=======
                      <label htmlFor="reg-team" className="text-[9px] font-black uppercase text-[#A09E9A]/40 tracking-wider">Team Anchor</label>
                      <input id="reg-team" name="teamAnchor" type="text" placeholder="Unassigned" className="w-full glass-input text-xs text-[#F0EFE8]" title="Enter Team Anchor" aria-label="Enter Team Anchor" />
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
                    </div>
                    <button type="submit" className="py-3 btn-gold rounded-xl text-xs font-black uppercase tracking-widest text-[#111111] transition-all shadow-lg active:scale-95 cursor-pointer">
                      Register Host
                    </button>
                  </form>
                </section>

                {/* Bulk Onboard Talent Section */}
                <section className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-[#F5F5F5]">
                    <Database size={18} className="text-indigo-400" />
                    Bulk Onboard Talent
                  </h3>
                  <div className="tech-card space-y-4 bg-[#1A1A1A] border border-white/5">
                    <p className="text-[10px] text-[#B0B0B0]/60 leading-relaxed font-medium">
                      Paste rows directly from Excel or Google Sheets to upload multiple talent records at once. Duplicates will be flagged and reviewed.
                    </p>
                    <div className="space-y-2">
                      <label htmlFor="roster-bulk-paste" className="text-[9px] font-black uppercase tracking-widest text-[#B0B0B0]/40 block">
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
                              tier_pay: 'N/A',
                              level: level,

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
                      className="w-full py-3 btn-gold rounded-xl text-xs font-black uppercase tracking-widest text-[#111111] transition-all shadow-lg active:scale-95 cursor-pointer"
                      title="Import bulk raw roster data"
                      aria-label="Import bulk raw roster data"
                    >
                      Incorporate Roster Paste
                    </button>
                  </div>
                </section>

                {/* Reset & Manage Talent Passwords Section */}
                <section className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-[#F5F5F5]">
                    <Lock size={18} className="text-indigo-400" />
                    Reset & Manage Talent Passwords
                  </h3>
                  <div className="tech-card space-y-6 bg-white/[0.01]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                      <div className="space-y-1.5">
                        <label htmlFor="pwd-host-select" className="text-[9px] font-black uppercase text-[#B0B0B0]/40 tracking-wider">Select Talent / Host</label>
                        <select
                          id="pwd-host-select"
                          value={selectedHostForPasswordId}
                          onChange={(e) => setSelectedHostForPasswordId(e.target.value)}
                          className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#F5F5F5]"
                          title="Select a talent to reset password"
                          aria-label="Select a talent to reset password"
                        >
                          <option value="" className="bg-[#1A1A1A] text-[#F5F5F5]">-- Choose Host --</option>
                          {hosts.map(h => (
                            <option key={h.id} value={h.id} className="bg-[#1A1A1A] text-[#F5F5F5]">
                              {h.nickname || h.name} ({h.id})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="pwd-input" className="text-[9px] font-black uppercase text-[#B0B0B0]/40 tracking-wider">Set Password</label>
                        <div className="flex gap-2">
                          <input
                            id="pwd-input"
                            type="text"
                            placeholder="Password value"
                            value={targetPassword}
                            onChange={(e) => setTargetPassword(e.target.value)}
                            className="w-full glass-input text-xs text-[#F5F5F5]"
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
                            className="px-3 py-2.5 bg-[#1A1A1A] hover:bg-[#222222] border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#FFB800] transition-all whitespace-nowrap cursor-pointer"
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
                          try {
                            const res = await fetch('/api/admin/reset-password', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(localAuth.token ? { Authorization: `Bearer ${localAuth.token}` } : {}),
                              },
                              body: JSON.stringify({ poppo_id: selectedHostForPasswordId, new_password: targetPassword.trim() }),
                            });

                            const data = await res.json();
                            if (!res.ok) {
                              throw new Error(data.error || 'Failed to update password.');
                            }

                            await auditLogAction('RESET_HOST_PASSWORD', original, { id: hostObj.id, nickname: hostObj.nickname || hostObj.name, is_temp_password: true });
                            showSuccess(`Password updated for host: ${hostObj.nickname || hostObj.name}`);
                            setSelectedHostForPasswordId('');
                            setTargetPassword('');
                            loadData();
                          } catch (err: any) {
                            alert(err.message || "Failed to update password.");
                          }
                        }}
                        className="py-3 btn-gold rounded-xl text-xs font-black uppercase tracking-widest text-[#111111] transition-all shadow-lg active:scale-95 cursor-pointer"
                      >
                        Update Password
                      </button>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-[#F5F5F5]">
                    <Shield size={18} className="text-indigo-400" />
                    Master Agency Directory Table
                  </h3>
                  <div className="tech-card !p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs min-w-[900px] border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 text-[9px] font-black text-[#B0B0B0]/30 uppercase tracking-widest bg-white/2">
                            <th className="px-6 py-4 sticky left-0 bg-[#0A0A0A] z-20 min-w-[100px] max-w-[100px] border-r border-white/5">Poppo ID</th>
                            <th className="px-6 py-4 sticky left-[100px] bg-[#0A0A0A] z-20 min-w-[150px] max-w-[150px] border-r border-white/5">Nickname</th>
                            <th className="px-4 py-4">Role</th>

                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Salary Class</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 bg-transparent">
                          {hosts.map(host => (
                            <tr key={host.id} className="hover:bg-white/[0.01] transition-colors group">
                              <td className="px-6 py-4 font-mono font-bold text-indigo-400 sticky left-0 bg-[#0A0A0A] group-hover:bg-[#1A1A1A] transition-colors z-10 min-w-[100px] max-w-[100px] border-r border-white/5">{host.id}</td>
                              <td className="px-6 py-4 font-bold text-[#F5F5F5] sticky left-[100px] bg-[#0A0A0A] group-hover:bg-[#1A1A1A] transition-colors z-10 min-w-[150px] max-w-[150px] border-r border-white/5">
                                <input 
                                  type="text"
                                  defaultValue={host.nickname || host.name}
                                  onBlur={async (e) => {
                                    const val = e.target.value;
                                    if (val !== (host.nickname || host.name)) {
                                      const original = { ...host };
                                      const updated: Host = { ...host, nickname: val, name: val };
                                      try {
                                        await FirebaseService.updateHost(updated, host.role);
                                        await auditLogAction('UPDATE_HOST', original, updated);
                                        showSuccess(`Updated nickname for host ${host.id}`);
                                        loadData();
                                      } catch (err) {
                                        alert("Failed to update nickname");
                                      }
                                    }
                                  }}
                                  className="bg-transparent border-none focus:ring-1 focus:ring-indigo-500/50 rounded-lg px-2 py-1 w-full text-[#F5F5F5] font-bold hover:bg-[#1A1A1A] focus:bg-[#111111]"
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
                                      await FirebaseService.updateHost(updated, host.role);
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
                                  
                                    {['Talent', 'Manager', 'Admin', 'Director', 'Agent'].map(r => (
                                      <option key={r} value={r} className="bg-[#0A0A0B] text-[#F5F5F5]">{r}</option>
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
                                      await FirebaseService.updateHost(updated, host.role);
                                      await auditLogAction('UPDATE_HOST', original, updated);
                                      showSuccess(`Updated status for host ${host.id}`);
                                      loadData();
                                    } catch (err) {
                                      alert("Failed to update status");
                                    }
                                  }}
<<<<<<< HEAD
                                  className="bg-transparent border-none rounded text-xs text-[#B0B0B0] hover:text-[#F5F5F5] focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                  title="Select status"
                                  aria-label="Select status"
                                >
                                  {['Active', 'Inconsistent', 'Released', 'Inactive'].map(s => (
                                    <option key={s} value={s} className="bg-[#0A0A0B] text-[#F5F5F5]">{s}</option>
=======
                                  className={`bg-transparent border-none rounded text-xs focus:ring-1 focus:ring-indigo-500 cursor-pointer font-bold ${host.status === 'Active' ? 'text-emerald-400' : 'text-[#A09E9A] hover:text-[#F0EFE8]'}`}
                                  title="Select status"
                                  aria-label="Select status"
                                >
                                  {['Active', 'Intermittent', 'Released', 'Inactive'].map(s => (
                                    <option key={s} value={s} className="bg-[#0A0A0B] text-[#F0EFE8]">{s}</option>
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
                                  ))}
                                </select>
                              </td>
                              <td className="px-6 py-4">
                                <select 
                                  value={host.tier_pay}
                                  onChange={async (e) => {
                                    const val = e.target.value as any;
                                    const original = { ...host };
                                    const updated: Host = { ...host, tier_pay: val };
                                    try {
                                      await FirebaseService.updateHost(updated, host.role);
                                      await auditLogAction('UPDATE_HOST', original, updated);
                                      showSuccess(`Updated salary tier for host ${host.id}`);
                                      loadData();
                                    } catch (err) {
                                      alert("Failed to update salary");
                                    }
                                  }}
                                  className="bg-transparent border-none rounded text-xs text-[#B0B0B0] hover:text-[#F5F5F5] focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                  title="Select salary category"
                                  aria-label="Select salary category"
                                >
                                  {['Rocket Host', 'Star Host', 'S idol', 'ESport Host'].map(s => (
                                    <option key={s} value={s} className="bg-[#0A0A0B] text-[#F5F5F5]">{s}</option>
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
                                  className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-[#111111] rounded-xl transition-all cursor-pointer"
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
              !isDirector ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <Lock size={48} className="text-red-500/40" />
                  <h3 className="text-lg font-black text-[#F0EFE8] uppercase tracking-wider">Access Restricted</h3>
                  <p className="max-w-md text-[#A09E9A] text-xs">Only the Director is authorized to view or edit financial ledger data.</p>
                </div>
              ) : (
                <motion.div key="financials" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-xl flex items-center gap-2 text-[#F5F5F5]">
                      <Database size={20} className="text-[#FFB800]" />
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
                    className="flex items-center gap-2 px-5 py-3 bg-[#FFB800] hover:bg-[#c9a832] disabled:bg-slate-700 text-[#111111] rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg active:scale-95 shrink-0"
                  >
                    {isSavingFinancials ? (
                      <span className="w-3.5 h-3.5 border-2 border-[#111111]/20 border-t-[#111111] rounded-full animate-spin" />
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
                      financialTab === 'monthly' ? "border-[#FFB800] text-[#F5F5F5]" : "border-transparent text-[#B0B0B0] hover:text-[#F5F5F5]"
                    )}
                  >
                    Monthly Financials
                  </button>
                  <button
                    onClick={() => { setFinancialTab('weekly'); setSelectedRows({}); }}
                    className={cn(
                      "pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer",
                      financialTab === 'weekly' ? "border-[#FFB800] text-[#F5F5F5]" : "border-transparent text-[#B0B0B0] hover:text-[#F5F5F5]"
                    )}
                  >
                    Weekly Financials
                  </button>
                </div>

<<<<<<< HEAD
                <div className="mb-6">
                  <FinancialUpload onUploadSuccess={loadData} />
                </div>

                {/* Bulk Intake & Paste Section (Flat-file Storage Ledger) */}
                <div className="tech-card bg-[#1A1A1A] border border-white/5 p-6 rounded-2xl grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* File Upload Area */}
                  <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-[#FFB800]/50 hover:bg-[#FFB800]/[0.02] transition-all cursor-pointer relative group">
                    <div className="w-10 h-10 rounded-full bg-[#FFB800]/10 flex items-center justify-center border border-[#FFB800]/20 group-hover:scale-105 transition-transform">
                      <span className="text-[#FFB800]">📁</span>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-bold text-xs uppercase tracking-wider text-[#F5F5F5]">Upload Commission Report</p>
                      <p className="text-[9px] text-[#B0B0B0]">Drag XLSX or CSV file here or click to browse</p>
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
                    <label htmlFor="bulk-ledger-paste" className="text-[9px] font-black uppercase tracking-wider text-[#B0B0B0]">
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
                        className="flex-1 h-24 glass-input font-mono text-[9px] resize-none focus:ring-1 focus:ring-[#FFB800] text-[#F5F5F5] bg-[#111111] border border-white/10"
                      />
                      <button
                        onClick={() => {
                          const textarea = document.getElementById('bulk-ledger-paste') as HTMLTextAreaElement;
                          if (textarea) {
                            handleBulkPaste(textarea.value);
                            textarea.value = '';
                          }
                        }}
                        className="px-4 bg-[#FFB800]/10 hover:bg-[#FFB800]/25 text-[#FFB800] border border-[#FFB800]/25 hover:text-white transition-all font-black uppercase text-[10px] tracking-wider rounded-xl cursor-pointer"
                      >
                        Paste
                      </button>
                    </div>
=======
                {/* Unified Ingestion Zone */}
                <div className="tech-card bg-[#1A1A28] border border-white/5 p-6 rounded-2xl">
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                      <label htmlFor="bulk-ledger-paste" className="text-sm font-black uppercase tracking-widest text-[#F0EFE8] flex items-center gap-2">
                        <span className="text-[#D4AF37]">📋</span> Paste Raw Ledger Data
                      </label>
                      <span className="text-[9px] text-[#A09E9A] uppercase tracking-wider font-bold">
                        Supports direct paste from Excel/Sheets
                      </span>
                    </div>
                    <textarea
                      id="bulk-ledger-paste"
                      placeholder="Paste columns here (tab-separated)..."
                      className="w-full h-32 glass-input font-mono text-[10px] resize-none focus:ring-1 focus:ring-[#D4AF37] text-[#F0EFE8] bg-[#0D0D14] border border-white/10 rounded-xl p-4 shadow-inner"
                    />
                    <button
                      onClick={() => {
                        const textarea = document.getElementById('bulk-ledger-paste') as HTMLTextAreaElement;
                        if (textarea && textarea.value.trim()) {
                          handleBulkPaste(textarea.value);
                          textarea.value = '';
                        }
                      }}
                      className="w-full py-4 bg-[#D4AF37]/10 hover:bg-[#D4AF37] text-[#D4AF37] hover:text-[#0D0D14] transition-all font-black uppercase text-[11px] tracking-widest rounded-xl cursor-pointer shadow-lg active:scale-95"
                    >
                      Process & Load Data to Grid
                    </button>
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
                  </div>
                </div>

                {/* Ledger Interactive Spreadsheet Table */}
                <div className="tech-card !p-0 border border-white/5 overflow-hidden bg-[#0A0A0A] shadow-xl">
                  
                  {/* Grid Action Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-white/5 bg-[#1A1A1A]/40 gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B0B0B0]" />
                        <input
                          type="text"
                          placeholder="Search ID, Nickname, Month, Year..."
                          value={financialSearchTerm}
                          onChange={(e) => setFinancialSearchTerm(e.target.value)}
                          className="w-64 glass-input text-xs pl-8 py-2 text-[#F5F5F5]"
                        />
                      </div>
                      <button
                        onClick={handleAddRow}
                        className="px-3.5 py-2 bg-emerald-550 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-emerald-500/10 active:scale-95"
                      >
                        + Add Row
                      </button>
                      <button
                        onClick={handleDeleteSelection}
                        disabled={!Object.keys(selectedRows).some(key => key.startsWith(`${financialTab}_`) && selectedRows[key])}
                        className="px-3.5 py-2 bg-red-550 hover:bg-red-650 disabled:bg-[#222222] text-white disabled:text-[#B0B0B0]/40 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        🗑️ Delete Selection
                      </button>
                    </div>

                    <div className="text-[10px] font-black uppercase tracking-widest text-[#B0B0B0]">
                      {(financialTab === 'monthly' ? monthlyLedger : weeklyLedger).length} Total rows in workspace
                    </div>
                  </div>

                  {/* Spreadsheet Grid Container */}
                  <div className="overflow-x-auto overflow-y-auto max-h-[500px] relative custom-scrollbar">
                    <table className="w-full text-left text-xs min-w-max border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-[10px] font-bold text-[#B0B0B0] uppercase tracking-wider bg-[#1A1A1A] sticky top-0 z-20">
                          <th className="px-3 py-3 w-12 text-center bg-[#0A0A0A] sticky left-0 z-30 border-r border-white/5">
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
                              className="rounded border-white/10 text-[#FFB800] focus:ring-[#FFB800] cursor-pointer"
                              title="Select all rows"
                            />
                          </th>
                          {/* STICKY COLUMN FOR POPPO ID */}
                          <th className="px-3 py-3 w-28 sticky left-[48px] bg-[#0A0A0A] z-30 border-r border-white/5 whitespace-nowrap">Poppo ID</th>
                          {financialTab === 'monthly' ? (
                            <>
                              <th className="px-3 py-3 w-24 whitespace-nowrap">Month</th>
                              <th className="px-3 py-3 w-24 whitespace-nowrap">Year</th>
                            </>
                          ) : (
                            <>
                              <th className="px-3 py-3 w-28 whitespace-nowrap">From Date</th>
                              <th className="px-3 py-3 w-28 whitespace-nowrap">To Date</th>
                            </>
                          )}
                          <th className="px-3 py-3 w-32 whitespace-nowrap">Nickname</th>
                          <th className="px-3 py-3 w-28 whitespace-nowrap">Live Duration</th>
                          <th className="px-3 py-3 w-28 whitespace-nowrap">Party Host</th>
                          <th className="px-3 py-3 w-32 whitespace-nowrap">Total Earnings</th>
                          <th className="px-3 py-3 w-32 whitespace-nowrap">Agent Comm.</th>
                          <th className="px-3 py-3 w-28 whitespace-nowrap">Live Earnings</th>
                          <th className="px-3 py-3 w-28 whitespace-nowrap">Party Earnings</th>
                          <th className="px-3 py-3 w-28 whitespace-nowrap">Private Chat</th>
                          <th className="px-3 py-3 w-24 whitespace-nowrap">Tips</th>
                          <th className="px-3 py-3 w-28 whitespace-nowrap">Platform Rwd</th>
                          <th className="px-3 py-3 w-28 whitespace-nowrap">Other Earnings</th>
                          <th className="px-3 py-3 w-32 whitespace-nowrap">Hourly Salary</th>
                          <th className="px-3 py-3 w-28 whitespace-nowrap">Super Salary</th>
                          <th className="px-3 py-3 w-28 whitespace-nowrap">Super Rank</th>
                          <th className="px-3 py-3 w-24 whitespace-nowrap">Level</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-transparent">
                        {(() => {
                          const currentData = financialTab === 'monthly' ? monthlyLedger : weeklyLedger;
                          if (currentData.length === 0) {
                            return (
                              <tr>
                                <td colSpan={20} className="py-12 text-center text-[#B0B0B0] italic">
                                  No ledger entries found. Click "+ Add Row" or paste data above.
                                </td>
                              </tr>
                            );
                          }

                          const filtered = currentData.map((row, idx) => ({ row, idx })).filter(({ row }) => {
                            if (!financialSearchTerm) return true;
                            const s = financialSearchTerm.toLowerCase();
                            return (
                              (row.poppo_id || '').toLowerCase().includes(s) ||
                              (row.nickname || '').toLowerCase().includes(s) ||
                              (row.month || '').toLowerCase().includes(s) ||
                              (row.year?.toString() || '').toLowerCase().includes(s) ||
                              (row.from_date || '').toLowerCase().includes(s) ||
                              (row.to_date || '').toLowerCase().includes(s)
                            );
                          });

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan={20} className="py-12 text-center text-[#B0B0B0] italic">
                                  No entries match your search.
                                </td>
                              </tr>
                            );
                          }

                          return filtered.map(({ row, idx }) => {
                            const isChecked = !!selectedRows[`${financialTab}_${idx}`];
                            return (
                              <tr key={idx} className="hover:bg-white/[0.01] transition-colors group">
                                <td className="px-3 py-2 text-center bg-[#0A0A0A] group-hover:bg-[#1A1A1A] sticky left-0 z-10 border-r border-white/5 transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      setSelectedRows(prev => ({
                                        ...prev,
                                        [`${financialTab}_${idx}`]: e.target.checked
                                      }));
                                    }}
                                    className="rounded border-white/10 text-[#FFB800] focus:ring-[#FFB800] cursor-pointer"
                                    title="Select row"
                                  />
                                </td>
                                
                                {/* STICKY POPPO ID COLUMN - MONO SPACED READ WRITE WITH COPY SELECT-ALL */}
                                <td className="px-3 py-2 sticky left-[48px] bg-[#0A0A0A] group-hover:bg-[#1A1A1A] transition-colors border-r border-white/5 z-10 font-mono font-bold text-indigo-500 w-28">
                                  <input
                                    type="text"
                                    value={row.poppo_id || ''}
                                    onChange={(e) => handleCellChange(idx, 'poppo_id', e.target.value)}
                                    className="bg-transparent border-none w-full text-xs font-mono font-bold text-[#FFB800] select-all focus:ring-1 focus:ring-[#FFB800]/50 rounded px-1.5 py-0.5 outline-none"
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
                                        className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#FFB800]/50 rounded px-1.5 py-0.5 outline-none font-medium text-[#F5F5F5]"
                                        placeholder="YYYY-MM"
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <input
                                        type="number"
                                        value={row.year ?? ''}
                                        onChange={(e) => handleCellChange(idx, 'year', parseInt(e.target.value) || 0)}
                                        className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#FFB800]/50 rounded px-1.5 py-0.5 outline-none font-medium text-[#F5F5F5]"
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
                                        className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#FFB800]/50 rounded px-1.5 py-0.5 outline-none font-medium text-[#F5F5F5]"
                                        placeholder="YYYY-MM-DD"
                                      />
                                    </td>
                                    <td className="px-3 py-2">
                                      <input
                                        type="text"
                                        value={row.to_date || ''}
                                        onChange={(e) => handleCellChange(idx, 'to_date', e.target.value)}
                                        className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#FFB800]/50 rounded px-1.5 py-0.5 outline-none font-medium text-[#F5F5F5]"
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
                                    className="bg-transparent border-none w-full text-xs font-semibold text-[#F5F5F5] focus:ring-1 focus:ring-[#FFB800]/50 rounded px-1.5 py-0.5 outline-none"
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
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#FFB800]/50 rounded px-1.5 py-0.5 outline-none text-[#F5F5F5]"
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
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#FFB800]/50 rounded px-1.5 py-0.5 outline-none text-[#F5F5F5]"
                                  />
                                </td>

                                <td className="px-3 py-2 font-semibold">
                                  <input
                                    type="number"
                                    value={row.total_points ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'total_points', parseInt(e.target.value) || 0)}
                                    title="Total earnings of points"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs font-semibold focus:ring-1 focus:ring-[#FFB800]/50 rounded px-1.5 py-0.5 outline-none text-[#F5F5F5]"
                                  />
                                </td>

                                <td className="px-3 py-2 text-emerald-400 font-semibold">
                                  <input
                                    type="number"
                                    value={row.agent_commission ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'agent_commission', parseInt(e.target.value) || 0)}
                                    title="Agent commission"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs text-emerald-400 font-semibold focus:ring-1 focus:ring-[#FFB800]/50 rounded px-1.5 py-0.5 outline-none"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={row.live_earnings ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'live_earnings', parseInt(e.target.value) || 0)}
                                    title="Live earnings"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#FFB800]/50 rounded px-1.5 py-0.5 outline-none text-[#F5F5F5]"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={row.party_earnings ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'party_earnings', parseInt(e.target.value) || 0)}
                                    title="Party earnings"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#FFB800]/50 rounded px-1.5 py-0.5 outline-none text-[#F5F5F5]"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={row.private_chat ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'private_chat', parseInt(e.target.value) || 0)}
                                    title="Private chat earnings"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#FFB800]/50 rounded px-1.5 py-0.5 outline-none text-[#F5F5F5]"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={row.tips ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'tips', parseInt(e.target.value) || 0)}
                                    title="Tips"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#FFB800]/50 rounded px-1.5 py-0.5 outline-none text-[#F5F5F5]"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={row.platform_reward ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'platform_reward', parseInt(e.target.value) || 0)}
                                    title="Platform reward"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#FFB800]/50 rounded px-1.5 py-0.5 outline-none text-[#F5F5F5]"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={row.other_earnings ?? row.other_earn ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'other_earnings', parseInt(e.target.value) || 0)}
                                    title="Other earnings"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#FFB800]/50 rounded px-1.5 py-0.5 outline-none text-[#F5F5F5]"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={row.platform_hourly_salary ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'platform_hourly_salary', parseInt(e.target.value) || 0)}
                                    title="Platform hourly salary"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#FFB800]/50 rounded px-1.5 py-0.5 outline-none text-[#F5F5F5]"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={row.super_salary ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'super_salary', parseInt(e.target.value) || 0)}
                                    title="Super salary"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#FFB800]/50 rounded px-1.5 py-0.5 outline-none text-[#F5F5F5]"
                                  />
                                </td>

                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={row.super_rank ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'super_rank', parseInt(e.target.value) || 0)}
                                    title="Super rank"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs focus:ring-1 focus:ring-[#FFB800]/50 rounded px-1.5 py-0.5 outline-none text-[#F5F5F5]"
                                  />
                                </td>

                                <td className="px-3 py-2 font-bold">
                                  <input
                                    type="number"
                                    value={row.level ?? ''}
                                    onChange={(e) => handleCellChange(idx, 'level', parseInt(e.target.value) || 0)}
                                    title="Level"
                                    placeholder="0"
                                    className="bg-transparent border-none w-full text-xs font-bold focus:ring-1 focus:ring-[#FFB800]/50 rounded px-1.5 py-0.5 outline-none text-[#F5F5F5]"
                                  />
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Spreadsheet footer info */}
                  <div className="p-3 border-t border-white/5 bg-[#1A1A1A]/40 text-[10px] text-[#B0B0B0] font-medium flex items-center gap-1.5">
                    <span>💡</span>
                    <span>Poppo ID columns support copy-paste selection. Nicknames are cross-referenced with the active roster instantly. Changes are stored in memory until you click "Save Changes".</span>
                  </div>
                </div>

              </motion.div>
             )
            )}

            {activeView === 'roster_management' && (
              <motion.div key="roster_management" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <RosterManagementTab 
                  onUpdate={loadData} 
                  auditLogAction={auditLogAction} 
                  hosts={hosts} 
                  onResetAccountAccess={handleResetAccountAccess}
                />
              </motion.div>
            )}

            {activeView === 'create_user' && (
              !isDirector ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <Lock size={48} className="text-red-500/40" />
                  <h3 className="text-lg font-black text-[#F0EFE8] uppercase tracking-wider">Access Restricted</h3>
                  <p className="max-w-md text-[#A09E9A] text-xs">Only the Director is authorized to provision new hosts or approve intake requests.</p>
                </div>
              ) : (
                <motion.div key="create_user" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                  <CreateMemberForm />
                </motion.div>
              )
            )}

            {/* FIREBASE ADMIN CONSOLE VIEWS */}
            {activeView === 'firestore' && (
              <motion.div key="firestore" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <FirestoreManager />
              </motion.div>
            )}

            {activeView === 'auth' && (
              <motion.div key="auth" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <AuthManager />
              </motion.div>
            )}

            {activeView === 'functions' && (
              <motion.div key="functions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <FunctionsMonitor />
              </motion.div>
            )}

            {activeView === 'storage' && (
              <motion.div key="storage" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <StorageManager />
              </motion.div>
            )}

            {activeView === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <SettingsPanel />
              </motion.div>
            )}

          </AnimatePresence>
        )}
        {/* Reset Account Access Custom Modal */}
        {resetConfirmTarget && (
          <div className="fixed inset-0 bg-[#0D0D14]/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#1A1A28] border border-white/10 max-w-md w-full rounded-3xl p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="text-red-400" size={20} />
                  <h3 className="text-md font-black text-[#F0EFE8] uppercase tracking-wider">Reset Account Access</h3>
                </div>
                <button 
                  onClick={() => !isResettingAccess && setResetConfirmTarget(null)} 
                  className="text-slate-400 hover:text-white transition-colors"
                  disabled={isResettingAccess}
                  title="Close modal"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Are you sure you want to reset account access credentials for Poppo ID <strong className="text-[#D4AF37] font-mono">{resetConfirmTarget}</strong>?
                </p>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1">
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-wider">⚠️ Action Consequences</p>
                  <ul className="text-[9px] text-[#A09E9A] list-disc list-inside space-y-0.5">
                    <li>This will remove the current password from the database.</li>
                    <li>The user will be logged out of all active dashboard sessions.</li>
                    <li>On their next login, they will be forced to set a new password.</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-4 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setResetConfirmTarget(null)}
                  disabled={isResettingAccess}
                  className="px-4 py-2 bg-[#1A1A28] hover:bg-[#222235] border border-white/10 rounded-xl text-xs font-black uppercase tracking-wider text-[#A09E9A] hover:text-[#F0EFE8] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  disabled={isResettingAccess}
                  className="px-5 py-2 bg-red-550 hover:bg-red-650 disabled:bg-red-500/20 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                >
                  {isResettingAccess && <Loader2 size={12} className="animate-spin" />}
                  {isResettingAccess ? 'Resetting...' : 'Confirm Reset'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showMergeModal && existingHost && incomingHost && (
          <div className="fixed inset-0 bg-[#111111]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#1A1A1A] border border-white/5 max-w-3xl w-full rounded-3xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="text-[#FFB800]" size={20} />
                  <h3 className="text-md font-black text-[#F5F5F5] uppercase tracking-wider">Duplicate Identity Conflict Detector</h3>
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
                <p className="text-xs text-slate-300 font-bold">Poppo ID <span className="text-[#FFB800] font-mono">{existingHost.id}</span> already exists in the master database.</p>
                <p className="text-[10px] text-[#B0B0B0]/60">Review conflicts below. Select which values to preserve, or merge them.</p>
              </div>

              <div className="space-y-4">
                {[
                  { field: 'nickname', label: 'Nickname / Alias' },
                  { field: 'role', label: 'Role' },
                  { field: 'teamAnchor', label: 'Team Anchor' },
                  { field: 'manager', label: 'Assigned Manager' },
                  { field: 'tier_pay', label: 'Salary Class' },
                  { field: 'status', label: 'Roster Status' },
                  { field: 'level', label: 'Level Snapshot' }
                ].map(({ field, label }) => {
                  const existVal = (existingHost as any)[field];
                  const incomingVal = (incomingHost as any)[field];
                  const hasConflict = existVal !== incomingVal;

                  return (
                    <div key={field} className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-[#B0B0B0]/60 uppercase tracking-wider">{label}</span>
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
                              ? "bg-[#FFB800]/5 border-[#FFB800] text-[#F5F5F5]"
                              : "bg-[#1A1A1A] border-white/10 text-[#B0B0B0] hover:border-[#FFB800]/50"
                          )}
                        >
                          <span className="text-[8px] text-[#B0B0B0]/40 uppercase font-black">Keep Existing Database Record</span>
                          <span className="text-xs font-bold mt-1.5 text-[#F5F5F5]">{String(existVal)}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setResolvedFields(prev => ({ ...prev, [field]: incomingVal }))}
                          className={cn(
                            "p-3 rounded-xl border text-left flex flex-col justify-between cursor-pointer transition-all",
                            resolvedFields[field as keyof Host] === incomingVal
                              ? "bg-[#FFB800]/5 border-[#FFB800] text-[#F5F5F5]"
                              : "bg-[#1A1A1A] border-white/10 text-[#B0B0B0] hover:border-[#FFB800]/50"
                          )}
                        >
                          <span className="text-[8px] text-[#B0B0B0]/40 uppercase font-black">Merge/Overwrite with Incoming Record</span>
                          <span className="text-xs font-bold mt-1.5 text-[#F5F5F5]">{String(incomingVal)}</span>
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
                              "px-3 py-1 bg-[#1A1A1A] hover:bg-[#222222] border border-white/10 rounded text-[9px] font-black uppercase text-slate-300 transition-all cursor-pointer",
                              resolvedFields.nickname === `${existVal} (alias: ${incomingVal})` && "border-[#FFB800] text-[#FFB800]"
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
                              "px-3 py-1 bg-[#1A1A1A] hover:bg-[#222222] border border-white/10 rounded text-[9px] font-black uppercase text-slate-300 transition-all cursor-pointer",
                              resolvedFields[field as keyof Host] === Array.from(new Set([String(existVal), String(incomingVal)])).join(', ') && "border-[#FFB800] text-[#FFB800]"
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
                  className="px-5 py-2.5 bg-[#1A1A1A] hover:bg-[#222222] border border-white/10 rounded-xl text-xs font-black uppercase tracking-wider text-[#B0B0B0] hover:text-[#F5F5F5] cursor-pointer"
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
                      await FirebaseService.updateHost(mergedHost, existingHost.role);
                      await auditLogAction('MERGE_HOST_DUPLICATE', original, mergedHost);
                      showSuccess(`Merged duplicate record resolved for host: ${mergedHost.nickname || mergedHost.name}`);
                      processNextDuplicate(duplicateQueue);
                    } catch (err) {
                      alert("Failed to commit merged record.");
                    }
                  }}
                  className="px-6 py-2.5 btn-gold rounded-xl text-xs font-black uppercase tracking-wider text-[#111111] cursor-pointer shadow-lg"
                >
                  Resolve & Commit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- OPERATIONS VIEW --- */}
        {activeView === 'operations' && (
          <motion.div key="operations" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h3 className="font-bold text-2xl flex items-center gap-2 text-[#F0EFE8]">
                  <Briefcase size={24} className="text-indigo-400" />
                  Operations Desk
                </h3>
                <p className="text-[10px] text-[#A09E9A]/40 uppercase tracking-widest font-black">Centralized control panel for Livehouses, Tasks, Feedback and Awards</p>
              </div>

              {/* Sub-tab selection */}
              <div className="flex gap-1.5 bg-[#13131E] p-1.5 rounded-xl border border-white/5 w-fit">
                {(['livehouse', 'tasks', 'feedback', 'awards'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setOperationsSubTab(tab)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                      operationsSubTab === tab ? "bg-indigo-600 text-white shadow-md font-extrabold border border-white/5" : "text-[#A09E9A] hover:text-[#F0EFE8]"
                    )}
                  >
                    {tab === 'livehouse' ? 'Livehouse Queue' :
                     tab === 'tasks' ? 'Task Board' :
                     tab === 'feedback' ? 'Manager Feedbacks' :
                     'Awards Desk'}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-tab Content Rendering */}
            
            {/* 1. Livehouse Queue */}
            {operationsSubTab === 'livehouse' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#A09E9A]/50">Livehouse Schedule Pipeline</h4>
                </div>

                <div className="tech-card !p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-[9px] font-black text-[#A09E9A]/40 uppercase tracking-widest bg-white/[0.02]">
                          <th className="px-6 py-4">Host Details</th>
                          <th className="px-6 py-4">Proposed DateTime</th>
                          <th className="px-6 py-4">Livehouse Type</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {isLoadingLivehouses ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-[#A09E9A]/30 italic">
                              <Loader2 className="animate-spin text-indigo-400 mx-auto mb-2" size={20} />
                              Loading livehouse queue...
                            </td>
                          </tr>
                        ) : livehouseRequests.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-[#A09E9A]/30 italic">No livehouse requests in the queue.</td>
                          </tr>
                        ) : (
                          livehouseRequests.map(req => (
                            <tr key={req.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-bold text-[#F0EFE8]">{req.name}</div>
                                <div className="text-[10px] text-indigo-400 font-mono">ID: {req.poppoId}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-[#F0EFE8] font-semibold">{req.date || req.proposedDate}</div>
                                <div className="text-[10px] text-[#A09E9A]/50 font-mono">{req.timeslot || req.proposedTimeslot}</div>
                              </td>
                              <td className="px-6 py-4 capitalize text-[#A09E9A]">{req.livehouseType || 'SOLO LIVEHOUSE'}</td>
                              <td className="px-6 py-4">
                                <span className={cn(
                                  "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                                  req.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                  req.status === 'Pending Approval' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                  req.status === 'Proposal Sent' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                  'bg-[#222235] text-[#A09E9A] border-transparent'
                                )}>
                                  {req.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {(req.status === 'Pending Approval' || req.status === 'Host Accepted Proposal') && (
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => handleApproveLivehouse(req)}
                                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => setProposingAltReq(req)}
                                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
                                    >
                                      Propose Alt
                                    </button>
                                    <button
                                      onClick={() => handleDenyLivehouse(req)}
                                      className="px-2.5 py-1.5 bg-red-900/40 hover:bg-red-900 text-red-300 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
                                    >
                                      Deny
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Propose Alternate Modal/Form */}
                {proposingAltReq && (
                  <div className="fixed inset-0 bg-[#0D0D14]/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-[#1A1A28] border border-white/10 max-w-md w-full rounded-3xl p-6 space-y-4 shadow-2xl relative">
                      <button
                        onClick={() => setProposingAltReq(null)}
                        className="absolute top-4 right-4 text-[#A09E9A] hover:text-white cursor-pointer"
                        title="Close proposal form"
                      >
                        <X size={18} />
                      </button>
                      <h4 className="text-sm font-black text-[#F0EFE8] uppercase tracking-wider">Propose Alternate Timeslot</h4>
                      <p className="text-xs text-[#A09E9A]">For: <strong className="text-indigo-400">{proposingAltReq.name} ({proposingAltReq.poppoId})</strong></p>
                      
                      <form onSubmit={handleProposeAlternate} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">New Proposed Date</label>
                          <SingleDatePicker
                            id="propose-alt-date"
                            name="proposedDate"
                            value={altDate}
                            onChange={(val) => setAltDate(val)}
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">New Proposed Timeslot</label>
                          <input
                            type="text"
                            value={altTimeslot}
                            onChange={(e) => setAltTimeslot(e.target.value)}
                            placeholder="e.g. 18:00 - 20:00"
                            className="w-full bg-[#0d0d14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500"
                            required
                            title="Proposed timeslot"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                        >
                          Send Proposal
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. Task Board */}
            {operationsSubTab === 'tasks' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Task Assignment Form */}
                <div className="lg:col-span-1 bg-[#1A1A28]/40 border border-white/5 p-6 rounded-3xl space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8] pb-2 border-b border-white/5">Assign Roster Instruction</h4>
                  
                  <form onSubmit={handleDirectorTaskSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Select Host</label>
                      <select
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                        className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500 cursor-pointer"
                        title="Host Selection"
                      >
                        <option value="">-- Choose Host --</option>
                        {hosts.map(h => (
                          <option key={h.id} value={h.id}>{h.nickname || h.name} - {h.id}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Task Type</label>
                      <input
                        type="text"
                        value={taskType}
                        onChange={(e) => setTaskType(e.target.value)}
                        placeholder="e.g. Coaching, Livehouse"
                        className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500"
                        required
                        title="Task Type"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Instruction Title</label>
                      <input
                        type="text"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="e.g. Boost solo live hours"
                        className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500"
                        required
                        title="Task Title"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Guidelines</label>
                      <textarea
                        value={taskDescription}
                        onChange={(e) => setTaskDescription(e.target.value)}
                        placeholder="Provide steps for the host..."
                        className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] h-24 resize-none focus:outline-none focus:border-indigo-500"
                        required
                        title="Guidelines"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Due Date</label>
                      <SingleDatePicker
                        id="director-task-due-date"
                        name="dueDate"
                        value={taskDueDateVal}
                        onChange={(val) => setTaskDueDateVal(val)}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingTask}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
                    >
                      {isSubmittingTask ? 'Assigning...' : 'Delegate Task'}
                    </button>
                  </form>
                </div>

                {/* Tasks Roster History */}
                <div className="lg:col-span-2 bg-[#1A1A28]/40 border border-white/5 p-6 rounded-3xl flex flex-col gap-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8] pb-2 border-b border-white/5">Active Agency Tasks</h4>
                  
                  <div className="overflow-x-auto font-sans">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-[9px] font-black text-[#A09E9A]/40 uppercase tracking-widest bg-white/[0.02]">
                          <th className="px-4 py-3">Host</th>
                          <th className="px-4 py-3">Task Details</th>
                          <th className="px-4 py-3">Due Date</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {tasks.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-[#A09E9A]/20 italic">No active delegated tasks.</td>
                          </tr>
                        ) : (
                          tasks.map(t => (
                            <tr key={t.taskId} className="hover:bg-white/[0.01] transition-colors">
                              <td className="px-4 py-3 font-mono text-indigo-400 font-bold">{t.assigneeId || t.assignedToUserId}</td>
                              <td className="px-4 py-3">
                                <div className="font-bold text-[#F0EFE8]">{t.title}</div>
                                <div className="text-[10px] text-[#A09E9A]/50 capitalize">{t.taskType}</div>
                              </td>
                              <td className="px-4 py-3 font-mono text-[#A09E9A]/80">{t.dueDate}</td>
                              <td className="px-4 py-3">
                                <span className={cn(
                                  "text-[8px] font-black uppercase px-2 py-0.5 rounded-full border",
                                  t.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                )}>
                                  {t.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleDirectorDeleteTask(t.taskId)}
                                  className="text-red-400 hover:text-red-300 p-1 cursor-pointer"
                                  title="Delete task"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Manager Feedback Feed */}
            {operationsSubTab === 'feedback' && (
              <div className="space-y-6">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#A09E9A]/50">Chronological Manager Feedback Logs</h4>
                
                <div className="tech-card !p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-[9px] font-black text-[#A09E9A]/40 uppercase tracking-widest bg-white/[0.02]">
                          <th className="px-6 py-4">Submitter</th>
                          <th className="px-6 py-4">Host Target</th>
                          <th className="px-6 py-4">Feedback details</th>
                          <th className="px-6 py-4">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {isLoadingNotes ? (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-[#A09E9A]/30 italic">
                              <Loader2 className="animate-spin text-indigo-400 mx-auto mb-2" size={20} />
                              Loading feedbacks...
                            </td>
                          </tr>
                        ) : managerNotes.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-[#A09E9A]/20 italic">No manager feedback logs recorded yet.</td>
                          </tr>
                        ) : (
                          managerNotes.map(note => (
                            <tr key={note.id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="px-6 py-4 font-bold text-indigo-400">
                                {note.managerName}
                                <div className="text-[9px] text-[#A09E9A]/40 font-mono">ID: {note.managerId}</div>
                              </td>
                              <td className="px-6 py-4 font-bold text-[#F0EFE8]">
                                {note.hostNickname}
                                <div className="text-[9px] text-[#A09E9A]/40 font-mono">ID: {note.hostId}</div>
                              </td>
                              <td className="px-6 py-4 text-slate-300 max-w-sm whitespace-pre-wrap leading-relaxed">{note.content}</td>
                              <td className="px-6 py-4 font-mono text-[#A09E9A]/60">{new Date(note.timestamp).toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Awards Desk */}
            {operationsSubTab === 'awards' && (
              <div className="space-y-8 w-full">
                {/* Row 1: Forms Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* Block 1: Create Award Form */}
                  <div className="bg-[#1A1A28]/40 border border-white/5 p-6 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8]">Create Award Badge</h4>
                      <div className="flex gap-1 bg-[#0D0D14] p-1 rounded-lg border border-white/5">
                        <button
                          type="button"
                          onClick={() => setAwardCreateMode('single')}
                          className={cn("px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer",
                            awardCreateMode === 'single' ? "bg-indigo-600 text-white shadow-sm font-extrabold" : "text-[#A09E9A] hover:text-[#F0EFE8]")}
                        >
                          Single
                        </button>
                        <button
                          type="button"
                          onClick={() => setAwardCreateMode('bulk')}
                          className={cn("px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer",
                            awardCreateMode === 'bulk' ? "bg-indigo-600 text-white shadow-sm font-extrabold" : "text-[#A09E9A] hover:text-[#F0EFE8]")}
                        >
                          Bulk Top 9
                        </button>
                      </div>
                    </div>

                    {awardCreateMode === 'single' ? (
                      <form onSubmit={handleCreateAward} className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Award Title</label>
                          <input
                            type="text"
                            value={newAwardName}
                            onChange={(e) => setNewAwardName(e.target.value)}
                            placeholder="e.g. Star Host"
                            className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500"
                            required
                            title="Award Title"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Tag Style Color</label>
                          <select
                            value={newAwardColor}
                            onChange={(e) => setNewAwardColor(e.target.value)}
                            className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500 cursor-pointer"
                            title="Style color"
                          >
                            <option value="Gold">🏆 Gold</option>
                            <option value="Purple">⭐ Purple</option>
                            <option value="Emerald">💚 Emerald</option>
                            <option value="Blue">💙 Blue</option>
                            <option value="Red">❤️ Red</option>
                            <option value="Orange">🧡 Orange</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Effectivity Period</label>
                          <div className="grid grid-cols-2 gap-3">
                            <SingleDatePicker
                              id="new-award-start-date"
                              name="newAwardStartDate"
                              value={newAwardStartDate}
                              onChange={(val) => setNewAwardStartDate(val)}
                              required
                            />
                            <SingleDatePicker
                              id="new-award-end-date"
                              name="newAwardEndDate"
                              value={newAwardEndDate}
                              onChange={(val) => setNewAwardEndDate(val)}
                              required
                            />
                          </div>
                        </div>
                        <button
                          type="submit"
                          disabled={isCreatingAward}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
                        >
                          {isCreatingAward ? 'Creating...' : 'Create Award'}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleBulkGenerateAwards} className="space-y-4 animate-in fade-in duration-200">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Select Month</label>
                          <select
                            value={bulkMonth}
                            onChange={(e) => setBulkMonth(e.target.value)}
                            className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500 cursor-pointer"
                            title="Select Month"
                          >
                            <option value="01">January</option>
                            <option value="02">February</option>
                            <option value="03">March</option>
                            <option value="04">April</option>
                            <option value="05">May</option>
                            <option value="06">June</option>
                            <option value="07">July</option>
                            <option value="08">August</option>
                            <option value="09">September</option>
                            <option value="10">October</option>
                            <option value="11">November</option>
                            <option value="12">December</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Select Year</label>
                          <select
                            value={bulkYear}
                            onChange={(e) => setBulkYear(e.target.value)}
                            className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500 cursor-pointer"
                            title="Select Year"
                          >
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                            <option value="2027">2027</option>
                            <option value="2028">2028</option>
                            <option value="2029">2029</option>
                            <option value="2030">2030</option>
                          </select>
                        </div>
                        <button
                          type="submit"
                          disabled={isCreatingAward}
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
                        >
                          {isCreatingAward ? 'Generating...' : 'Bulk Generate Top 9 Badges'}
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Block 2: Assign Custom Award Form */}
                  <div className="bg-[#1A1A28]/40 border border-white/5 p-6 rounded-3xl space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8] pb-2 border-b border-white/5">Assign Custom Award</h4>
                    <form onSubmit={handleAssignAward} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Select Created Award</label>
                        <select
                          value={assignAwardId}
                          onChange={(e) => setAssignAwardId(e.target.value)}
                          className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500 cursor-pointer"
                          title="Select created award"
                          required
                        >
                          <option value="">-- Select Award --</option>
                          {awards.map(a => (
                            <option key={a.id} value={a.id}>{a.name} ({a.color})</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Filter by Role</label>
                        <select
                          value={assignRoleFilter}
                          onChange={(e) => setAssignRoleFilter(e.target.value)}
                          className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500 cursor-pointer"
                          title="Filter users by role"
                        >
                          <option value="All">All Roles (Excl. Director)</option>
                          <option value="Host">Host / Talent</option>
                          <option value="Manager">Manager</option>
                          <option value="Agent">Agent</option>
                          <option value="Admin">Admin</option>
                          <option value="Head Admin">Head Admin</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Select Member</label>
                        <select
                          value={assignHostId}
                          onChange={(e) => setAssignHostId(e.target.value)}
                          className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] focus:outline-none focus:border-[#D4AF37] cursor-pointer"
                          title="Select Member"
                          required
                        >
                          <option value="">-- Choose Member --</option>
                          {filteredAssignHosts.map(h => (
                            <option key={h.id} value={h.id}>{h.nickname || h.name} - {h.id} ({String(h.role || 'Host').toUpperCase()})</option>
                          ))}
                        </select>
                      </div>
                      {assignAwardId && (
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Effectivity Period (Inherited from template)</label>
                          <div className="grid grid-cols-2 gap-3 bg-black/20 p-3 rounded-lg border border-white/5 text-xs text-[#F0EFE8] font-mono">
                            <div>
                              <span className="text-[8px] text-[#A09E9A] block uppercase mb-0.5">Start Date</span>
                              {awardStartDate || 'N/A'}
                            </div>
                            <div>
                              <span className="text-[8px] text-[#A09E9A] block uppercase mb-0.5">End Date</span>
                              {awardEndDate || 'N/A'}
                            </div>
                          </div>
                        </div>
                      )}
                      <button
                        type="submit"
                        disabled={isAssigningAward}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
                      >
                        {isAssigningAward ? 'Assigning...' : 'Assign Award Badge'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Block 3: Split View List of Awards */}
                <div className="bg-[#1A1A28]/40 border border-white/5 p-6 rounded-3xl grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Pane 1: Created Awards (Available for Assignment) */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8] pb-2 border-b border-[#D4AF37]/20 flex items-center justify-between">
                      <span>Available Awards (Templates)</span>
                      <span className="text-[10px] text-[#A09E9A]/60 font-mono">{awards.length} created</span>
                    </h4>
                    <div className="overflow-y-auto max-h-[400px] custom-scrollbar space-y-3 pr-2">
                      {isLoadingAwards ? (
                        <div className="py-8 text-center text-[#A09E9A]/20 italic"><Loader2 className="animate-spin text-indigo-400 mx-auto" size={16} /></div>
                      ) : awards.length === 0 ? (
                        <p className="text-xs text-[#A09E9A]/30 italic py-6 text-center">No awards badges created yet.</p>
                      ) : (
                        awards.map(a => {
                          let labelStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                          if (a.color === 'Purple') labelStyle = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                          else if (a.color === 'Emerald') labelStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                          else if (a.color === 'Blue') labelStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                          else if (a.color === 'Red') labelStyle = 'bg-red-500/10 text-red-400 border-red-500/20';
                          else if (a.color === 'Orange') labelStyle = 'bg-orange-500/10 text-orange-400 border-orange-500/20';

                          return (
                            <div key={a.id} className="bg-[#13131E] border border-white/5 rounded-2xl p-4 flex items-center justify-between transition-all hover:bg-white/[0.04]">
                              <div className="space-y-1 min-w-0">
                                <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full border tracking-widest", labelStyle)}>
                                  {a.name}
                                </span>
                                <div className="text-[10px] text-[#A09E9A] font-mono mt-1">
                                  Period: {a.startDate || 'N/A'} to {a.endDate || 'N/A'}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setAssignAwardId(a.id);
                                  document.getElementById('assign-host-id')?.focus();
                                }}
                                className="text-[9px] font-black uppercase text-[#D4AF37] hover:bg-[#D4AF37]/10 px-3 py-1.5 border border-[#D4AF37]/35 rounded-xl transition-all whitespace-nowrap"
                              >
                                Assign Award
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Pane 2: Active Award Assignments */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8] pb-2 border-b border-[#D4AF37]/20 flex items-center justify-between">
                      <span>Active Award Assignments</span>
                      <span className="text-[10px] text-[#A09E9A]/60 font-mono">{awardAssignments.length} assigned</span>
                    </h4>
                    <div className="overflow-y-auto max-h-[400px] custom-scrollbar space-y-3 pr-2">
                      {isLoadingAwards ? (
                        <div className="py-8 text-center text-[#A09E9A]/20 italic"><Loader2 className="animate-spin text-indigo-400 mx-auto" size={16} /></div>
                      ) : awardAssignments.length === 0 ? (
                        <p className="text-xs text-[#A09E9A]/30 italic py-6 text-center">No awards currently assigned.</p>
                      ) : (
                        awardAssignments.map(a => {
                          let labelStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                          if (a.awardColor === 'Purple') labelStyle = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                          else if (a.awardColor === 'Emerald') labelStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                          else if (a.awardColor === 'Blue') labelStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                          else if (a.awardColor === 'Red') labelStyle = 'bg-red-500/10 text-red-400 border-red-500/20';
                          else if (a.awardColor === 'Orange') labelStyle = 'bg-orange-500/10 text-orange-400 border-orange-500/20';

                          return (
                            <div key={a.id} className="bg-[#13131E] border border-white/5 rounded-2xl p-4 flex items-center justify-between transition-all hover:bg-white/[0.04]">
                              <div className="space-y-1 min-w-0">
                                <p className="text-sm font-bold text-[#F0EFE8] truncate">{a.hostNickname}</p>
                                <p className="text-[9px] text-[#A09E9A]/60 font-mono">ID: {a.hostId}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded border tracking-wider", labelStyle)}>
                                    {a.awardName}
                                  </span>
                                  <span className="text-[10px] text-white/40 font-mono">
                                    {a.startDate} to {a.endDate}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRevokeAssignment(a.id)}
                                className="text-[9px] font-black uppercase text-red-400 hover:bg-red-500/10 px-3 py-1.5 border border-red-500/35 rounded-xl transition-all whitespace-nowrap"
                              >
                                Revoke
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* --- SYSTEM LOGS VIEW --- */}
        {activeView === 'system_logs' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SystemLogsViewer />
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
          tier_pay: 'N/A',
          status: 'Active',
          level: 1,

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

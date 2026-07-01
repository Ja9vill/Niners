import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Users, UserPlus, Shield, Loader2, CheckCircle2, AlertCircle,
  Trash2, ChevronRight, X, Edit3, Merge, Search,
  Clock, FileText, ListChecks, ArrowRight, Info, Settings,
  Plus, Eye, EyeOff, FunctionSquare,
  FormInput, Save, Link2, Unlink, GripVertical, RefreshCw,
  ChevronDown, ChevronUp, Columns
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { Storage } from '../lib/storage';
import { db } from '../lib/firebase';
import { doc, setDoc, getDocs, collection as fbCollection, deleteDoc, query, orderBy, onSnapshot } from 'firebase/firestore';

type TabId = 'user-provision' | 'collections' | 'user-management';
type SubTabId = 'collections' | 'analyzer' | 'configuration';

const KNOWN_COLLECTIONS = [
  'activity_audit_logs', 'admin_profile', 'agent_financial_reports', 'agent_profile',
  'attendance', 'attendance_ratings', 'award_assignments', 'awards',
  'calendar', 'director_profile', 'fanbase_reports', 'head_admin_profile',
  'host_profile', 'livehouse_logs', 'livehouse_requests', 'livehouse_schedule',
  'manager_profile', 'rpk_reports', 'stream_notifications', 'system', 'system_logs',
  'user_performance_reports', 'users'
];
const ALL_ROLES = ['Host', 'Agent', 'Manager', 'Admin', 'Head Admin', 'Director'];

const KNOWN_FORMS = [
  { id: 'add-event', name: 'Add Event', description: 'Create calendar events', defaultCollection: 'calendar' },
  { id: 'rpk-report', name: 'RPK Report', description: 'Submit PK performance report', defaultCollection: 'pk_reports' },
  { id: 'fanbase-report', name: 'Fanbase Report', description: 'Submit fanbase metrics', defaultCollection: 'fanbase_reports' },
  { id: 'livehouse-booking', name: 'Livehouse Booking', description: 'Reserve livehouse slot', defaultCollection: 'livehouse_requests' },
  { id: 'attendance', name: 'Attendance', description: 'Log event attendance', defaultCollection: 'attendance' },
  { id: 'create-member', name: 'Create Member', description: 'Onboard new member', defaultCollection: 'users' },
  { id: 'talent-intake', name: 'Talent Intake', description: 'Request host intake', defaultCollection: 'host' },
  { id: 'announcement', name: 'Announcement', description: 'Publish announcement', defaultCollection: 'announcements' },
  { id: 'task-assignment', name: 'Task Assignment', description: 'Assign tasks to hosts', defaultCollection: 'tasks' },
  { id: 'feedback-note', name: 'Feedback Note', description: 'Add host feedback', defaultCollection: 'todos' },
  { id: 'award-create', name: 'Create Award', description: 'Define new award badge', defaultCollection: 'awards' },
  { id: 'award-assign', name: 'Assign Award', description: 'Assign award to host', defaultCollection: 'award_assignments' },
  { id: 'blog-post', name: 'Blog Post', description: 'Write blog article', defaultCollection: 'blog_posts' },
  { id: 'financial-report', name: 'Financial Report', description: 'Submit agent financial report', defaultCollection: 'agent_financial_reports' },
  { id: 'stream-notification', name: 'Stream Notification', description: 'Announce live stream', defaultCollection: 'stream_notifications' },
  { id: 'push-notification', name: 'Push Notification', description: 'Send push alert to user', defaultCollection: '' },
  { id: 'onboard-talent', name: 'Onboard Talent', description: 'Register host in roster', defaultCollection: 'host' },
  { id: 'alternate-proposal', name: 'Alternate Proposal', description: 'Propose changed timeslot', defaultCollection: 'livehouse_requests' },
  { id: 'contact-us', name: 'Contact Us', description: 'Public contact form', defaultCollection: '' },
];

const FORM_FIELDS: Record<string, string[]> = {
  'add-event': ['event_type', 'title', 'date', 'from_time', 'to_time', 'description', 'participants'],
  'rpk-report': ['from_date', 'to_date', 'pk_wins_percentage', 'pk_points', 'pk_sessions'],
  'fanbase-report': ['from_date', 'to_date', 'total_followers', 'fanclub_subscribers', 'fanclub_gc_members', 'gc_activity_count_host', 'gc_activity_count_fans', 'notes'],
  'livehouse-booking': ['poppo_id', 'host_name', 'date', 'timeslot', 'livehouse_type', 'notes'],
  'attendance': ['event_id', 'attendees', 'feedback'],
  'create-member': ['poppo_id', 'nickname', 'password', 'role'],
  'talent-intake': ['poppo_id', 'nickname', 'name', 'teamAnchor'],
  'announcement': ['title', 'details'],
  'task-assignment': ['assignee', 'task_type', 'task_title', 'description', 'due_date'],
  'feedback-note': ['host', 'content'],
  'award-create': ['name', 'color', 'startDate', 'endDate'],
  'award-assign': ['awardId', 'hostId', 'startDate', 'endDate'],
  'blog-post': ['title', 'subtitle', 'slug', 'category', 'tags', 'content', 'coverImage', 'isPublished'],
  'financial-report': ['agent_id', 'report_type', 'from_date', 'to_date', 'csv_data'],
  'stream-notification': ['poppoId', 'nickname', 'streamLink'],
  'push-notification': ['title', 'body', 'url'],
  'onboard-talent': ['poppoId', 'name', 'teamAnchor'],
  'alternate-proposal': ['date', 'timeslot', 'reason'],
  'contact-us': ['name', 'poppoId', 'email', 'message'],
};

interface FieldInfo {
  name: string;
  types: string[];
  docCount: number;
  nullCount: number;
  emptyCount: number;
  coverage: number;
  samples: any[];
  consistentType: boolean;
}

interface Anomaly {
  type: string;
  severity: string;
  fields: string[];
  description: string;
}

interface AnalysisResult {
  totalDocs: number;
  fields: FieldInfo[];
  anomalies: Anomaly[];
}

interface QueuedOp {
  type: 'delete' | 'rename' | 'merge' | 'change_type';
  sourceField: string;
  targetField?: string;
  mergeStrategy?: 'overwrite' | 'concat';
  conversion?: string;
  delimiter?: string;
}

interface FieldFormat {
  fieldName: string;
  format: string;
}

interface DocIdConfig {
  mode: 'auto' | 'custom';
  fields: FieldFormat[];
  template: string;
}

interface TaskSummary {
  id: string;
  collectionName: string;
  createdAt: string;
  executedAt?: string;
  analysis: AnalysisResult | null;
  operations: QueuedOp[];
  result?: any;
  completed: boolean;
  notes: string;
  codeItems?: string[];
  codeChecks?: Record<number, boolean>;
}

interface FormFieldMapping {
  frontendField: string;
  collectionField: string;
  isNewField: boolean;
}

interface ValidationRule {
  id: string;
  field: string;
  type: 'required' | 'type' | 'min' | 'max' | 'pattern' | 'enum';
  value: string;
  enabled: boolean;
}

interface AutoCalcRule {
  id: string;
  targetField: string;
  formula: string;
  dependsOn: string[];
  enabled: boolean;
}

interface FormConfig {
  formId: string;
  formName: string;
  collectionName: string;
  roles: string[];
  fieldMappings: FormFieldMapping[];
  validationRules: ValidationRule[];
  autoCalculations: AutoCalcRule[];
  docIdConfig: DocIdConfig | null;
}

const COLLECTION_FIELDS: Record<string, string[]> = {
  'activity_audit_logs': ['logId', 'timestamp', 'actorUserId', 'actionType', 'beforeValue', 'afterValue'],
  'admin_profile': ['poppo_id', 'nickname', 'name', 'role', 'photoUrl', 'agent_id', 'team_anchor', 'assignedManagerId', 'manager', 'updated_at'],
  'agent_financial_reports': ['agent_id', 'poppo_id', 'nickname', 'type', 'from_date', 'to_date', 'total_earnings', 'commission', 'bonuses', 'deductions', 'net_pay', 'status', 'submitted_at', 'notes', 'solo_live_duration', 'party_live_duration', 'total_points', 'solo_live_earnings', 'party_live_earnings', 'private_chat', 'tips', 'platform_reward', 'other_earnings', 'platform_salary', 'super_salary', 'super_rank', 'stream_level', 'total_incentives', 'total_duration', 'submitted_by_role', 'submitted_by_id', 'created_at', 'updated_at'],
  'agent_profile': ['poppo_id', 'nickname', 'name', 'role', 'photoUrl', 'agent_id', 'team_anchor', 'assignedManagerId', 'manager', 'updated_at'],
  'attendance': ['attendanceId', 'event_id', 'eventId', 'eventTitle', 'eventDate', 'timeslot', 'eventType', 'description', 'attendees', 'attendeeIds', 'participant_ids', 'status', 'adminFeedback', 'eventFeedback', 'createdBy', 'reporterId', 'reporterName', 'reporterRole', 'submittedAt', 'timestamp', 'created_at', 'poppo_id', 'host_id', 'host_name', 'submitted_by'],
  'attendance_ratings': ['poppo_id', 'nickname', 'rating', 'event_id', 'event_date', 'submitted_at', 'feedback'],
  'award_assignments': ['id', 'awardId', 'awardName', 'awardColor', 'hostId', 'hostNickname', 'startDate', 'endDate', 'assignedAt'],
  'awards': ['id', 'name', 'color', 'createdAt', 'startDate', 'endDate'],
  'calendar': ['event_id', 'event_type', 'event_title', 'title', 'event_description', 'description', 'event_date', 'date', 'from_time', 'to_time', 'time', 'event_host_id', 'event_host_name', 'poppo_id', 'is_external_host', 'participant_ids', 'participant_nicknames', 'created_by_id', 'created_by_name', 'created_by_role', 'timestamp', 'notified30min', 'notifiedStart', 'visibility', 'type', 'location', 'is_automated', 'type_of_event'],
  'director_profile': ['poppo_id', 'nickname', 'name', 'role', 'photoUrl', 'agent_id', 'team_anchor', 'assignedManagerId', 'manager', 'updated_at'],
  'fanbase_reports': ['fromDate', 'toDate', 'from_date', 'to_date', 'poppoId', 'poppo_id', 'nickname', 'currentFollowers', 'total_followers', 'fanclubSubscribers', 'fanclub_subscribers', 'fanclubGcMembers', 'fanclub_gc_members', 'gcUpdatesHost', 'gcUpdatesFans', 'gc_activity_count_host', 'gc_activity_count_fans', 'reporterId', 'reporter_id', 'reporterName', 'reporter_name', 'reporterRole', 'reporter_role', 'submittedAt', 'timestamp'],
  'head_admin_profile': ['poppo_id', 'nickname', 'name', 'role', 'photoUrl', 'agent_id', 'team_anchor', 'assignedManagerId', 'manager', 'updated_at'],
  'host_profile': ['poppo_id', 'nickname', 'name', 'role', 'photoUrl', 'agent_id', 'team_anchor', 'assignedManagerId', 'manager', 'assigned_manager_nickname', 'assigned_manager_poppo_id', 'tier_pay', 'tierPay', 'base_salary_category', 'updated_at'],
  'livehouse_logs': ['poppo_id', 'date', 'timeslot', 'timestamp', 'source'],
  'livehouse_requests': ['id', 'poppoId', 'poppo_id', 'name', 'host_name', 'date', 'timeslot', 'status', 'proposedTimeslot', 'proposedDate', 'proposedBy', 'managerId', 'notes', 'livehouseType', 'livehouse_type', 'reporterId', 'reporter_id', 'reporterName', 'reporter_name', 'reporterRole', 'reporter_role', 'timestamp', 'submitted_at', 'approved_by', 'approved_at'],
  'livehouse_schedule': ['date', 'timeslot', 'slot_1', 'slot_2'],
  'manager_profile': ['poppo_id', 'nickname', 'name', 'role', 'photoUrl', 'agent_id', 'team_anchor', 'assignedManagerId', 'manager', 'updated_at'],
  'rpk_reports': ['fromDate', 'toDate', 'poppoId', 'nickname', 'pkWinPercent', 'pkPoints', 'pkSessions', 'reporterId', 'reporterName', 'reporterRole', 'submittedAt'],
  'stream_notifications': ['id', 'poppoId', 'nickname', 'streamLink', 'timestamp'],
  'system': ['id', 'action', 'type', 'description', 'user_id', 'user_name', 'timestamp', 'ip_address', 'metadata', 'last_synced_iso'],
  'system_logs': ['timestamp', 'severity', 'actionDescription', 'userId', 'userRole', 'stackTrace'],
  'user_performance_reports': ['poppo_id', 'nickname', 'period_start', 'period_end', 'earnings', 'stream_hours', 'sessions', 'agent_commission', 'status', 'submitted_at'],
  'users': ['poppo_id', 'poppoId', 'nickname', 'name', 'role', 'level', 'status', 'password', 'password_hash', 'is_temp_password', 'is_first_login', 'assignedManagerId', 'assignedHosts', 'agent_id', 'googleUid', 'last_login', 'lastLoginAt', 'createdAt', 'created_at', 'updatedAt', 'updated_at', 'passwordSetAt', 'photoUrl', 'photo_url', 'profile_photo', 'email', 'notificationRequestedByDirector', 'fcmTokens', 'manager', 'teamAnchor', 'team_anchor', 'isActive'],
};

const DOCID_KEY = 'cmd_center_docid_configs';
function loadDocIdConfigs(): Record<string, DocIdConfig> {
  try { return JSON.parse(localStorage.getItem(DOCID_KEY) || '{}'); } catch { return {}; }
}
function saveDocIdConfig(config: DocIdConfig, collectionName: string) {
  const all = loadDocIdConfigs();
  all[collectionName] = config;
  localStorage.setItem(DOCID_KEY, JSON.stringify(all));
}

const FORM_CONFIG_KEY = 'cmd_center_form_configs';
function loadFormConfigs(): Record<string, FormConfig> {
  try { return JSON.parse(localStorage.getItem(FORM_CONFIG_KEY) || '{}'); } catch { return {}; }
}
function saveFormConfig(config: FormConfig) {
  const all = loadFormConfigs();
  all[config.formId] = config;
  localStorage.setItem(FORM_CONFIG_KEY, JSON.stringify(all));
}

function deleteFormConfig(formId: string) {
  const all = loadFormConfigs();
  delete all[formId];
  localStorage.setItem(FORM_CONFIG_KEY, JSON.stringify(all));
}

async function saveTaskToFirestore(task: TaskSummary) {
  try {
    await setDoc(doc(db, 'director_tasks', task.id), task, { merge: true });
  } catch (err) {
    console.error('Failed to save task to Firestore:', err);
  }
}

async function loadTasksFromFirestore(): Promise<TaskSummary[]> {
  try {
    const q = query(fbCollection(db, 'director_tasks'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as TaskSummary));
  } catch (err) {
    console.error('Failed to load tasks from Firestore:', err);
    return [];
  }
}

export const CommandCenter = () => {
  const [activeTab, setActiveTab] = useState<TabId>('collections');
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('configuration');
  const [authState] = useState(Storage.getAuthState());

  // Analyzer state
  const [collectionName, setCollectionName] = useState('');
  const [customCollection, setCustomCollection] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState('');
  const [canonicalFields, setCanonicalFields] = useState<Set<string>>(new Set());
  const [queuedOps, setQueuedOps] = useState<QueuedOp[]>([]);
  const [renameModal, setRenameModal] = useState<{ field: string } | null>(null);
  const [mergeModal, setMergeModal] = useState<{ field: string } | null>(null);
  const [changeTypeModal, setChangeTypeModal] = useState<{ field: string } | null>(null);
  const [docIdConfig, setDocIdConfig] = useState<DocIdConfig | null>(null);
  const [summaryModal, setSummaryModal] = useState<QueuedOp[] | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<any>(null);

  // Task history (Firestore)
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const refreshTasks = useCallback(async () => {
    setLoadingTasks(true);
    const fbTasks = await loadTasksFromFirestore();
    setTasks(fbTasks);
    setLoadingTasks(false);
  }, []);

  useEffect(() => { refreshTasks(); }, [refreshTasks]);

  // Configuration state
  const [formConfigs, setFormConfigs] = useState<Record<string, FormConfig>>(loadFormConfigs);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [editingFormConfig, setEditingFormConfig] = useState<FormConfig | null>(null);
  const [validationModal, setValidationModal] = useState<{ formId: string; field: string } | null>(null);
  const [autoCalcModal, setAutoCalcModal] = useState<{ formId: string } | null>(null);
  const [docIdConfigModalOpen, setDocIdConfigModalOpen] = useState(false);
  const [docIdConfigCollection, setDocIdConfigCollection] = useState('');

  const effectiveCollection = collectionName || customCollection;

  const handleAnalyze = async () => {
    const col = effectiveCollection.trim();
    if (!col) return;
    setIsAnalyzing(true);
    setAnalyzeError('');
    setAnalysis(null);
    setCanonicalFields(new Set());
    setQueuedOps([]);
    setExecuteResult(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated.');
      const idToken = await user.getIdToken(true);
      const res = await fetch('/api/admin/analyze-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ collectionName: col }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed.');
      setAnalysis(data);
      const savedConfig = loadDocIdConfigs()[col];
      setDocIdConfig(savedConfig || null);
    } catch (err: any) {
      setAnalyzeError(err.message || 'Failed to analyze collection.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleCanonical = (fieldName: string) => {
    setCanonicalFields(prev => { const next = new Set(prev); if (next.has(fieldName)) next.delete(fieldName); else next.add(fieldName); return next; });
  };

  const handleAutoClean = () => {
    if (!analysis) return;
    const ops: QueuedOp[] = [];
    const canonicalSet = canonicalFields;
    analysis.fields.forEach(f => {
      if (!canonicalSet.has(f.name)) {
        const fName = String(f.name);
        const similarCanonical = Array.from(canonicalSet as Set<string>).find((c: string) =>
          c.toLowerCase().replace(/[^a-z0-9]/g, '') === fName.toLowerCase().replace(/[^a-z0-9]/g, '')
        );
        if (similarCanonical) ops.push({ type: 'merge', sourceField: fName, targetField: similarCanonical, mergeStrategy: 'concat' });
        else ops.push({ type: 'delete', sourceField: fName });
      }
    });
    setQueuedOps(ops);
  };

  const queueDelete = (field: string) => setQueuedOps(prev => [...prev.filter(op => op.sourceField !== field), { type: 'delete', sourceField: field }]);
  const queueRename = (source: string, target: string) => setQueuedOps(prev => [...prev.filter(op => op.sourceField !== source), { type: 'rename', sourceField: source, targetField: target }]);
  const queueMerge = (source: string, target: string, strategy: 'overwrite' | 'concat' = 'concat') => setQueuedOps(prev => [...prev.filter(op => op.sourceField !== source), { type: 'merge', sourceField: source, targetField: target, mergeStrategy: strategy }]);
  const queueChangeType = (field: string, conversion: string, delimiter?: string) => setQueuedOps(prev => [...prev.filter(op => op.sourceField !== field), { type: 'change_type', sourceField: field, conversion, delimiter }]);
  const removeQueuedOp = (field: string) => setQueuedOps(prev => prev.filter(op => op.sourceField !== field));

  const handleExecute = async () => {
    if (!analysis || queuedOps.length === 0) return;
    setIsExecuting(true);
    setExecuteResult(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated.');
      const idToken = await user.getIdToken(true);
      const taskId = `task_${Date.now()}`;
      const res = await fetch('/api/admin/execute-collection-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ collectionName: effectiveCollection, operations: queuedOps, taskId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Execution failed.');
      setExecuteResult(data);
      const codeItems = generateCodeChanges({ collectionName: effectiveCollection, operations: queuedOps });
      const task: TaskSummary = {
        id: taskId, collectionName: effectiveCollection, createdAt: new Date().toISOString(),
        executedAt: new Date().toISOString(), analysis, operations: [...queuedOps],
        result: data, completed: true, notes: '', codeItems,
        codeChecks: Object.fromEntries(codeItems.map((_, i) => [i, false])),
      };
      await saveTaskToFirestore(task);
      await refreshTasks();
      setQueuedOps([]);
      setSummaryModal(null);
    } catch (err: any) {
      setExecuteResult({ error: err.message || 'Execution failed.' });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleToggleTaskCheck = async (taskId: string, itemIndex: number) => {
    const updated = tasks.map(t => {
      if (t.id !== taskId) return t;
      const checks = { ...(t.codeChecks || {}), [itemIndex]: !((t.codeChecks || {})[itemIndex]) };
      return { ...t, codeChecks: checks };
    });
    setTasks(updated);
    const task = updated.find(t => t.id === taskId);
    if (task) await saveTaskToFirestore(task);
  };

  const handleUpdateTaskNotes = async (taskId: string, notes: string) => {
    const updated = tasks.map(t => t.id === taskId ? { ...t, notes } : t);
    setTasks(updated);
    const task = updated.find(t => t.id === taskId);
    if (task) await saveTaskToFirestore(task);
  };

  const refreshFormConfigs = useCallback(() => { setFormConfigs(loadFormConfigs()); }, []);

  const handleSaveFormConfig = (config: FormConfig) => {
    saveFormConfig(config);
    refreshFormConfigs();
    setEditingFormConfig(config);
    setSelectedFormId(config.formId);
  };

  const btnCls = 'px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-[#0A0A0F] text-xs font-black uppercase tracking-[0.20em] transition-all active:scale-95 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2';
  const btnOutCls = 'px-4 py-2 rounded-xl border border-[#D4AF37]/50 text-[#D4AF37] text-xs font-black uppercase tracking-[0.15em] transition-all hover:bg-[#D4AF37]/15 hover:text-white cursor-pointer disabled:opacity-50 flex items-center gap-2';
  const inputCls = 'w-full bg-[#0F0A06]/90 border border-[#D4AF37]/30 rounded-xl px-4 py-3 text-sm tracking-widest focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/60 outline-none transition-all text-[#F0EFE8] placeholder-[#D4AF37]/30';
  const cardCls = 'bg-gradient-to-br from-[#0F0A06]/80 to-[#1A1008]/80 border border-[#D4AF37]/15 rounded-2xl p-4 md:p-6 shadow-[0_0_30px_rgba(212,175,55,0.05)]';
  const labelCls = 'text-[10px] text-[#D4AF37]/80 uppercase tracking-wider font-bold';
  const mutedCls = 'text-[11px] text-[#D4AF37]/60';
  const goldText = 'text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB]';

  const severityColor = (s: string) =>
    s === 'high' ? 'text-red-300 bg-red-500/15 border-red-500/40'
    : s === 'medium' ? 'text-yellow-300 bg-yellow-500/15 border-yellow-500/40'
    : 'text-blue-300 bg-blue-500/15 border-blue-500/40';

  const tabActiveCls = 'bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-[#0A0A0F] shadow-[0_0_15px_rgba(212,175,55,0.3)]';
  const tabInactiveCls = 'text-[#D4AF37]/50 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10';

  return (
    <div className="p-3 md:p-6 min-h-screen bg-gradient-to-b from-[#0A0A0F] via-[#0D0804] to-[#0A0A0F] text-[#F0EFE8]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#D4AF37]/20">
        <div className="p-2 rounded-xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/30">
          <Shield className="text-[#D4AF37] w-5 h-5" />
        </div>
        <div>
          <h1 className={`text-lg md:text-xl font-black tracking-[0.15em] uppercase ${goldText}`}>Command Center</h1>
          <p className="text-[10px] font-medium text-[#D4AF37]/60 tracking-wider">Director-only administration hub</p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-0.5 mb-4 p-1 bg-[#0F0A06]/80 border border-[#D4AF37]/10 rounded-xl w-full overflow-x-auto">
        {([
          { id: 'collections' as TabId, label: 'Collections', icon: Database },
          { id: 'user-provision' as TabId, label: 'User Provision', icon: UserPlus },
          { id: 'user-management' as TabId, label: 'User Management', icon: Users },
        ]).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-2 md:px-4 py-2.5 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab === tab.id ? tabActiveCls : tabInactiveCls}`}>
            <tab.icon size={12} /> {tab.label}
          </button>
        ))}
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {activeTab === 'collections' && (
          <div>
            {/* Sub-tabs */}
            <div className="flex gap-0.5 mb-4 p-0.5 bg-[#0F0A06]/60 border border-[#D4AF37]/10 rounded-lg w-fit overflow-x-auto">
              {(['collections', 'analyzer', 'configuration'] as SubTabId[]).map(id => (
                <button key={id} onClick={() => setActiveSubTab(id)}
                  className={`px-3 md:px-4 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    activeSubTab === id
                      ? 'bg-gradient-to-r from-[#D4AF37]/25 to-[#D4AF37]/10 text-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.15)]'
                      : 'text-[#D4AF37]/40 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10'
                  }`}>
                  {id === 'collections' ? <Columns size={12} /> : id === 'analyzer' ? <Search size={12} /> : <Settings size={12} />}
                  {id === 'collections' ? 'Collections' : id === 'analyzer' ? 'Analyzer' : 'Configuration'}
                </button>
              ))}
            </div>

            {/* Collections List Sub-tab */}
            {activeSubTab === 'collections' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                {KNOWN_COLLECTIONS.map(col => {
                  const configs = (Object.values(formConfigs) as FormConfig[]).filter(c => c.collectionName === col);
                  const fieldCount = (COLLECTION_FIELDS[col] || []).length;
                  return (
                    <div key={col} className={cardCls}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-1.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                          <Database className="text-[#D4AF37] w-4 h-4" />
                        </div>
                        <h3 className={`text-sm font-black uppercase tracking-[0.1em] ${goldText}`}>{col}</h3>
                      </div>
                      <p className={mutedCls + ' text-[10px]'}>{fieldCount > 0 ? `${fieldCount} predefined fields` : 'No predefined fields'} · Forms: {configs.length > 0 ? configs.map(c => c.formName).join(', ') : 'None'}</p>
                      <div className="mt-3 pt-3 border-t border-[#D4AF37]/10 flex flex-wrap gap-2">
                        <button onClick={() => { setActiveSubTab('analyzer'); setCollectionName(col); }}
                          className="px-3 py-1.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-[9px] font-bold uppercase tracking-wider hover:bg-[#D4AF37]/20">Analyze</button>
                        <button onClick={() => { setDocIdConfigCollection(col); setDocIdConfigModalOpen(true); }}
                          className="px-3 py-1.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-[9px] font-bold uppercase tracking-wider hover:bg-[#D4AF37]/20">Doc ID</button>
                        {fieldCount > 0 && (
                          <button onClick={() => { setActiveSubTab('analyzer'); setCollectionName(col); }}
                            className="px-3 py-1.5 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37]/70 text-[9px] font-bold uppercase tracking-wider hover:bg-[#D4AF37]/20">{fieldCount} fields</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Analyzer Sub-tab */}
            {activeSubTab === 'analyzer' && (
              <div className="flex flex-col xl:flex-row gap-6">
                <div className="flex-1 space-y-4 md:space-y-6">
                  <div className={cardCls}>
                    <div className="flex items-center gap-3 mb-4">
                      <Search className="text-[#D4AF37] w-5 h-5" />
                      <h2 className={`text-sm font-black tracking-[0.15em] uppercase ${goldText}`}>Collection Analyzer</h2>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {KNOWN_COLLECTIONS.map(c => (
                        <button key={c} onClick={() => { setCollectionName(c); setCustomCollection(''); }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                            collectionName === c ? 'bg-[#D4AF37]/20 border-[#D4AF37]/60 text-[#D4AF37]' : 'border-[#D4AF37]/20 text-[#D4AF37]/50 hover:border-[#D4AF37]/50 hover:text-[#D4AF37]'
                          }`}>{c}</button>
                      ))}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input type="text" placeholder="Or type custom collection name..." value={customCollection}
                        onChange={e => { setCustomCollection(e.target.value); setCollectionName(''); }} className={inputCls} />
                      <button onClick={handleAnalyze} disabled={isAnalyzing || !effectiveCollection.trim()} className={btnCls + ' shrink-0'}>
                        {isAnalyzing ? <><Loader2 size={14} className="animate-spin" /> Analyzing</> : 'Analyze'}
                      </button>
                    </div>
                  </div>

                  {analyzeError && (
                    <div className="p-4 rounded-xl border bg-red-500/15 border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                      <AlertCircle size={14} /> {analyzeError}
                    </div>
                  )}

                  {analysis && (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Documents', value: analysis.totalDocs, color: 'text-[#D4AF37]' },
                          { label: 'Fields', value: analysis.fields.length, color: 'text-[#F0EFE8]' },
                          { label: 'Anomalies', value: analysis.anomalies.length, color: 'text-yellow-300' },
                        ].map(s => (
                          <div key={s.label} className={`${cardCls} text-center`}>
                            <div className={`text-xl md:text-2xl font-black ${s.color}`}>{s.value}</div>
                            <div className="text-[10px] text-[#D4AF37]/60 uppercase tracking-wider font-bold mt-1">{s.label}</div>
                          </div>
                        ))}
                      </div>

                      {analysis.anomalies.length > 0 && (
                        <div className={cardCls}>
                          <h3 className="text-xs font-black uppercase tracking-[0.15em] text-yellow-300 mb-3 flex items-center gap-2">
                            <AlertCircle size={14} /> Anomalies Detected
                          </h3>
                          <div className="space-y-2">
                            {analysis.anomalies.map((a, i) => (
                              <div key={i} className={`p-3 rounded-xl border text-xs ${severityColor(a.severity)}`}>
                                <div className="font-bold mb-1 uppercase tracking-wider">{a.type.replace(/_/g, ' ')}</div>
                                <div className="opacity-90">{a.description}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className={cardCls}>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                          <h3 className="text-xs font-black uppercase tracking-[0.15em] text-[#D4AF37] flex items-center gap-2">
                            <ListChecks size={14} /> Fields ({analysis.fields.length})
                          </h3>
                          <button onClick={handleAutoClean} className={btnOutCls} disabled={canonicalFields.size === 0}>
                            <Trash2 size={12} /> Auto Clean
                          </button>
                        </div>
                        <p className={mutedCls + ' mb-3'}>Check fields to keep (canonical). Unchecked fields queue for cleanup.</p>
                        <div className="overflow-x-auto -mx-4 md:-mx-0">
                          <div className="inline-block min-w-full align-middle">
                            <table className="min-w-full text-xs">
                              <thead>
                                <tr className="text-[10px] text-[#D4AF37]/60 uppercase tracking-wider border-b border-[#D4AF37]/10">
                                  <th className="text-left py-2 pr-2 w-8">Keep</th>
                                  <th className="text-left py-2 px-2">Field</th>
                                  <th className="text-left py-2 px-2 hidden sm:table-cell">Types</th>
                                  <th className="text-right py-2 px-2 hidden sm:table-cell">Cov.</th>
                                  <th className="text-left py-2 px-2 hidden md:table-cell">Sample</th>
                                  <th className="text-right py-2 px-2">Ops</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analysis.fields.map(f => {
                                  const isCanonical = canonicalFields.has(f.name);
                                  const hasOp = queuedOps.find(op => op.sourceField === f.name);
                                  return (
                                    <tr key={f.name} className="border-b border-[#D4AF37]/5 hover:bg-[#D4AF37]/10 transition-colors">
                                      <td className="py-2 pr-2">
                                        <input type="checkbox" checked={isCanonical} onChange={() => toggleCanonical(f.name)} className="accent-[#D4AF37] cursor-pointer" />
                                      </td>
                                      <td className="py-2 px-2 font-medium text-[#F0EFE8]">{f.name}</td>
                                      <td className="py-2 px-2 hidden sm:table-cell">
                                        <div className="flex gap-1 flex-wrap">
                                          {f.types.map(t => (
                                            <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                              !f.consistentType ? 'bg-yellow-500/20 text-yellow-300' : 'bg-[#D4AF37]/15 text-[#D4AF37]'
                                            }`}>{t}</span>
                                          ))}
                                        </div>
                                      </td>
                                      <td className="py-2 px-2 text-right hidden sm:table-cell">
                                        <span className={f.coverage < 50 ? 'text-yellow-300' : 'text-emerald-300'}>{f.coverage}%</span>
                                      </td>
                                      <td className="py-2 px-2 text-[#D4AF37]/50 max-w-[120px] truncate hidden md:table-cell">
                                        {f.samples.length > 0 ? JSON.stringify(f.samples[0]) : '-'}
                                      </td>
                                      <td className="py-2 px-2 text-right">
                                        <div className="flex gap-1 justify-end">
                                          <button onClick={() => queueDelete(f.name)}
                                            className={`p-1 rounded hover:bg-red-500/20 transition-colors ${hasOp?.type === 'delete' ? 'text-red-300' : 'text-[#D4AF37]/40 hover:text-red-300'}`} title="Delete"><Trash2 size={12} /></button>
                                          <button onClick={() => setRenameModal({ field: f.name })}
                                            className="p-1 rounded hover:bg-blue-500/20 text-[#D4AF37]/40 hover:text-blue-300 transition-colors" title="Rename"><Edit3 size={12} /></button>
                                          <button onClick={() => setMergeModal({ field: f.name })}
                                            className="p-1 rounded hover:bg-purple-500/20 text-[#D4AF37]/40 hover:text-purple-300 transition-colors" title="Merge"><Merge size={12} /></button>
                                          <button onClick={() => setChangeTypeModal({ field: f.name })}
                                            className="p-1 rounded hover:bg-cyan-500/20 text-[#D4AF37]/40 hover:text-cyan-300 transition-colors" title="Change type"><FileText size={12} /></button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {queuedOps.length > 0 && (
                        <div className={cardCls + ' border-[#D4AF37]/30'}>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-black uppercase tracking-[0.15em] text-[#D4AF37] flex items-center gap-2">
                              <ListChecks size={14} /> Queued Operations ({queuedOps.length})
                            </h3>
                            <button onClick={() => setSummaryModal(queuedOps)} className={btnCls}>
                              <ArrowRight size={14} /> Execute
                            </button>
                          </div>
                          <div className="space-y-1">
                            {queuedOps.map((op, i) => (
                              <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#D4AF37]/5 border border-[#D4AF37]/10">
                                <div>
                                  <span className={`font-bold uppercase tracking-wider ${
                                    op.type === 'delete' ? 'text-red-300' : op.type === 'rename' ? 'text-blue-300' : op.type === 'merge' ? 'text-purple-300' : 'text-cyan-300'
                                  }`}>{op.type === 'change_type' ? `change_type → ${op.conversion || ''}` : op.type}</span>
                                  <span className="text-[#D4AF37]/50 mx-1">—</span>
                                  <span className="font-medium text-[#F0EFE8]">{op.sourceField}</span>
                                  {op.targetField && <span className="text-[#D4AF37]/50"> → {op.targetField}</span>}
                                </div>
                                <button onClick={() => removeQueuedOp(op.sourceField)} className="p-1 hover:bg-red-500/20 rounded text-[#D4AF37]/40 hover:text-red-300"><X size={12} /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {executeResult && (
                        <div className={`p-4 rounded-xl border text-xs ${
                          executeResult.error ? 'bg-red-500/15 border-red-500/40 text-red-300' : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        }`}>
                          <div className="flex items-center gap-2">
                            {executeResult.error ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                            {executeResult.error || `Complete — ${executeResult.affectedDocs} of ${executeResult.totalDocs} docs affected`}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Task History sidebar */}
                <div className="w-full xl:w-80 shrink-0">
                  <div className={cardCls + ' sticky top-4'}>
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="text-[#D4AF37] w-4 h-4" />
                      <h2 className={`text-xs font-black uppercase tracking-[0.15em] ${goldText}`}>Task History</h2>
                      <button onClick={refreshTasks} className="ml-auto text-[#D4AF37]/50 hover:text-[#D4AF37] text-[9px] uppercase tracking-wider"><RefreshCw size={12} /></button>
                    </div>
                    {loadingTasks ? (
                      <div className="flex items-center justify-center py-8"><Loader2 size={16} className="animate-spin text-[#D4AF37]" /></div>
                    ) : tasks.length === 0 ? (
                      <p className="text-xs text-[#D4AF37]/40 italic text-center py-8">No tasks yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                        {tasks.map(task => (
                          <div key={task.id} className="border border-[#D4AF37]/15 rounded-xl overflow-hidden">
                            <button onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                              className="w-full flex items-center justify-between p-3 hover:bg-[#D4AF37]/10 transition-colors text-left">
                              <div className="flex items-center gap-2 min-w-0">
                                {(() => {
                                  if (!task.completed) return <Loader2 size={12} className="text-yellow-300 animate-spin shrink-0" />;
                                  const checks = task.codeChecks || {};
                                  const done = Object.values(checks).filter(Boolean).length;
                                  const total = (task.codeItems || []).length || Object.keys(checks).length;
                                  if (total > 0 && done < total) return <CheckCircle2 size={12} className="text-orange-300 shrink-0" />;
                                  return <CheckCircle2 size={12} className="text-emerald-300 shrink-0" />;
                                })()}
                                <div className="min-w-0">
                                  <div className="text-xs font-medium text-[#F0EFE8] truncate">{task.collectionName}</div>
                                  <div className="text-[9px] text-[#D4AF37]/50 truncate">{new Date(task.createdAt).toLocaleDateString()} — {task.operations.length} ops</div>
                                </div>
                              </div>
                              <ChevronRight size={12} className={`text-[#D4AF37]/40 shrink-0 transition-transform ${expandedTask === task.id ? 'rotate-90' : ''}`} />
                            </button>
                            <AnimatePresence>
                              {expandedTask === task.id && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-[#D4AF37]/10">
                                  <div className="p-3 space-y-2 text-xs">
                                    <div>
                                      <div className={labelCls + ' mb-1'}>Operations</div>
                                      {task.operations.map((op, i) => (
                                        <div key={i} className="flex items-center gap-1 text-[11px] py-0.5">
                                          <span className={`font-bold ${
                                            op.type === 'delete' ? 'text-red-300' : op.type === 'rename' ? 'text-blue-300' : op.type === 'merge' ? 'text-purple-300' : 'text-cyan-300'
                                          }`}>{op.type.replace(/_/g, ' ')}</span>
                                          <span className="text-[#D4AF37]/60">{op.sourceField}</span>
                                          {op.targetField && <><ArrowRight size={10} className="text-[#D4AF37]/40" /><span className="text-[#D4AF37]/80">{op.targetField}</span></>}
                                        </div>
                                      ))}
                                    </div>
                                    {task.result && (
                                      <div>
                                        <div className={labelCls + ' mb-1'}>Result</div>
                                        <div className="text-[11px] text-[#F0EFE8]">{task.result.affectedDocs} docs affected</div>
                                      </div>
                                    )}
                                    <div>
                                      <div className={labelCls + ' mb-1'}>Code Changes</div>
                                      <div className="space-y-1">
                                        {(task.codeItems || generateCodeChanges(task)).map((item, i) => {
                                          const checked = task.codeChecks?.[i] || false;
                                          return (
                                            <label key={i} className="flex items-start gap-2 text-[10px] cursor-pointer group">
                                              <input type="checkbox" checked={checked}
                                                onChange={() => handleToggleTaskCheck(task.id, i)}
                                                className="accent-[#D4AF37] mt-0.5 cursor-pointer shrink-0" />
                                              <span className={`leading-relaxed ${checked ? 'text-emerald-300/60 line-through' : 'text-[#D4AF37]/70'}`}>{item}</span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    <div>
                                      <div className={labelCls + ' mb-1'}>Notes</div>
                                      <textarea rows={2} placeholder="Add notes..." value={task.notes}
                                        onChange={e => handleUpdateTaskNotes(task.id, e.target.value)}
                                        className="w-full bg-[#0A0A0F]/80 border border-[#D4AF37]/15 rounded-lg px-2 py-1.5 text-xs focus:border-[#D4AF37]/30 outline-none text-[#F0EFE8] placeholder-[#D4AF37]/30 resize-none" />
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Configuration Sub-tab */}
            {activeSubTab === 'configuration' && (
              <div className="space-y-4 md:space-y-6">
                {/* Doc ID Configuration */}
                <div className={cardCls}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <FileText className="text-[#D4AF37] w-5 h-5 shrink-0" />
                      <div>
                        <h2 className={`text-sm font-black uppercase tracking-[0.15em] ${goldText}`}>Document ID Configuration</h2>
                        <p className={mutedCls}>Set custom document ID templates per collection</p>
                      </div>
                    </div>
                    <button onClick={() => { setDocIdConfigCollection(''); setDocIdConfigModalOpen(true); }} className={btnCls}>
                      <Settings size={14} /> Configure
                    </button>
                  </div>
                  {Object.keys(loadDocIdConfigs()).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#D4AF37]/10">
                      <div className={labelCls + ' mb-2'}>Active Configurations</div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(loadDocIdConfigs()).map(([col, cfg]) => (
                          <div key={col} className="px-3 py-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[11px]">
                            <span className="font-bold text-[#D4AF37]">{col}</span>
                            <span className="text-[#D4AF37]/40 mx-1">—</span>
                            <span className="text-[#F0EFE8]">{cfg.mode === 'custom' ? cfg.template : 'Auto ID'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Forms Field Mapping */}
                <div className={cardCls}>
                  <div className="flex items-center gap-3 mb-4">
                    <FormInput className="text-[#D4AF37] w-5 h-5" />
                    <div>
                      <h2 className={`text-sm font-black uppercase tracking-[0.15em] ${goldText}`}>Form Field Mapping</h2>
                      <p className={mutedCls}>Map frontend form fields to collection fields per role</p>
                    </div>
                  </div>

                  {/* Form selector */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {KNOWN_FORMS.map(f => {
                      const config = formConfigs[f.id];
                      const isConfigured = !!config;
                      const isSelected = selectedFormId === f.id;
                      return (
                        <button key={f.id} onClick={() => {
                          setSelectedFormId(f.id);
                          setEditingFormConfig(config || {
                            formId: f.id, formName: f.name, collectionName: f.defaultCollection,
                            roles: ['Host'], fieldMappings: [], validationRules: [], autoCalculations: [], docIdConfig: null,
                          });
                        }}
                          className={`px-3 py-2 rounded-xl text-[10px] font-bold border transition-all text-left ${
                            isSelected ? 'bg-[#D4AF37]/20 border-[#D4AF37]/60 text-[#D4AF37]'
                            : isConfigured ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                            : 'border-[#D4AF37]/20 text-[#D4AF37]/50 hover:border-[#D4AF37]/50 hover:text-[#D4AF37]'
                          }`}>
                          <div>{f.name}</div>
                          <div className="text-[8px] opacity-70 font-normal mt-0.5">{f.description}</div>
                          {isConfigured && <div className="text-[8px] text-[#D4AF37]/60 mt-0.5">{config.collectionName} | {config.roles.join(', ')}</div>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected form config editor */}
                  {editingFormConfig && (
                    <div className="border border-[#D4AF37]/25 rounded-2xl p-4 md:p-5 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h3 className={`text-xs font-black uppercase tracking-[0.15em] ${goldText}`}>{editingFormConfig.formName}</h3>
                        <button onClick={() => handleSaveFormConfig(editingFormConfig)} className={btnCls}>
                          <Save size={12} /> Save Config
                        </button>
                      </div>

                      {/* Collection target & Roles */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls + ' mb-1.5 block'}>Target Collection</label>
                          <div className="flex flex-wrap gap-1.5">
                            {KNOWN_COLLECTIONS.map(c => (
                              <button key={c} onClick={() => setEditingFormConfig({ ...editingFormConfig, collectionName: c })}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                                  editingFormConfig.collectionName === c
                                    ? 'bg-[#D4AF37]/20 border-[#D4AF37]/60 text-[#D4AF37]'
                                    : 'border-[#D4AF37]/20 text-[#D4AF37]/50 hover:border-[#D4AF37]/50'
                                }`}>{c}</button>
                            ))}
                          </div>
                          {!KNOWN_COLLECTIONS.includes(editingFormConfig.collectionName) && (
                            <input type="text" value={editingFormConfig.collectionName} readOnly className={`${inputCls} mt-2`} />
                          )}
                        </div>

                        <div>
                          <label className={labelCls + ' mb-1.5 block'}>Allowed Roles</label>
                          <div className="flex flex-wrap gap-1.5">
                            {ALL_ROLES.map(role => {
                              const hasRole = editingFormConfig.roles.includes(role);
                              return (
                                <button key={role} onClick={() => setEditingFormConfig({
                                  ...editingFormConfig,
                                  roles: hasRole ? editingFormConfig.roles.filter(r => r !== role) : [...editingFormConfig.roles, role],
                                })}
                                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${
                                    hasRole ? 'bg-[#D4AF37]/20 border-[#D4AF37]/60 text-[#D4AF37]' : 'border-[#D4AF37]/20 text-[#D4AF37]/40 hover:border-[#D4AF37]/50'
                                  }`}>{role}</button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Field Mapping — Side by Side */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className={labelCls}>Field Mappings</label>
                        </div>
                        <div className="border border-[#D4AF37]/20 rounded-xl overflow-hidden">
                          {/* Header */}
                          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 p-3 bg-[#D4AF37]/10 border-b border-[#D4AF37]/20 text-[9px] font-black uppercase tracking-wider text-[#D4AF37]">
                            <div>Frontend Form Field</div>
                            <div className="w-8"></div>
                            <div>Collection Field ({editingFormConfig.collectionName})</div>
                          </div>
                          {/* Rows */}
                          {FORM_FIELDS[editingFormConfig.formId]?.map(ff => {
                            const existingMapping = editingFormConfig.fieldMappings.find(m => m.frontendField === ff);
                            const collectionField = existingMapping?.collectionField || '';
                            const isNew = existingMapping?.isNewField || false;
                            return (
                              <div key={ff} className="grid grid-cols-[1fr_auto_1fr] gap-2 p-3 border-b border-[#D4AF37]/10 items-center hover:bg-[#D4AF37]/5 transition-colors">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[11px] font-medium text-[#F0EFE8] truncate">{ff}</span>
                                  {existingMapping && (
                                    <span className="text-[9px] text-emerald-300/70 shrink-0 flex items-center gap-0.5"><Link2 size={10} /> mapped</span>
                                  )}
                                </div>
                                <div className="flex items-center justify-center">
                                  <ArrowRight size={12} className="text-[#D4AF37]/40 shrink-0" />
                                </div>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {existingMapping ? (
                                    <>
                                      <span className="text-[11px] text-[#D4AF37] truncate">{collectionField}</span>
                                      {isNew && <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold shrink-0">NEW</span>}
                                      <button onClick={() => {
                                        setEditingFormConfig({
                                          ...editingFormConfig,
                                          fieldMappings: editingFormConfig.fieldMappings.filter(m => m.frontendField !== ff),
                                        });
                                      }} className="ml-auto p-1 hover:bg-red-500/20 rounded text-[#D4AF37]/40 hover:text-red-300 shrink-0"><Unlink size={10} /></button>
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-1.5 w-full">
                                      <input type="text" placeholder="Map or type new..."
                                        value={editingFormConfig.fieldMappings.find(m => m.frontendField === ff)?.collectionField || ''}
                                        onChange={e => {
                                          const val = e.target.value;
                                          const newMappings = editingFormConfig.fieldMappings.filter(m => m.frontendField !== ff);
                                          if (val.trim()) {
                                            newMappings.push({ frontendField: ff, collectionField: val.trim(), isNewField: !KNOWN_COLLECTIONS.includes(editingFormConfig.collectionName) || false });
                                          }
                                          setEditingFormConfig({ ...editingFormConfig, fieldMappings: newMappings });
                                        }}
                                        className="flex-1 bg-[#0A0A0F]/80 border border-[#D4AF37]/20 rounded-lg px-2 py-1.5 text-[11px] focus:border-[#D4AF37] outline-none text-[#F0EFE8] placeholder-[#D4AF37]/30" />
                                      <select value="" onChange={e => {
                                          if (!e.target.value) return;
                                          const val = e.target.value;
                                          const newMappings = editingFormConfig.fieldMappings.filter(m => m.frontendField !== ff);
                                          newMappings.push({ frontendField: ff, collectionField: val, isNewField: !KNOWN_COLLECTIONS.includes(editingFormConfig.collectionName) });
                                          setEditingFormConfig({ ...editingFormConfig, fieldMappings: newMappings });
                                        }}
                                          className="bg-[#0A0A0F]/80 border border-[#D4AF37]/20 rounded-lg px-1.5 py-1.5 text-[10px] focus:border-[#D4AF37] outline-none text-[#D4AF37] max-w-[120px]">
                                          <option value="">Select...</option>
                                          {(COLLECTION_FIELDS[editingFormConfig.collectionName] || []).map(f => (
                                            <option key={f} value={f}>{f}</option>
                                          ))}
                                          {analysis?.fields?.map(f => f.name).filter(f => !(COLLECTION_FIELDS[editingFormConfig.collectionName] || []).includes(f)).map(f => (
                                            <option key={f} value={f}>{f} (analyzed)</option>
                                          ))}
                                        </select>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {/* Add custom field row */}
                          <div className="p-3 bg-[#D4AF37]/5">
                            <div className="flex items-center gap-2">
                              <input type="text" placeholder="Add custom frontend field..."
                                className="flex-1 bg-[#0A0A0F]/80 border border-[#D4AF37]/20 rounded-lg px-3 py-1.5 text-[11px] focus:border-[#D4AF37] outline-none text-[#F0EFE8] placeholder-[#D4AF37]/30"
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    const input = e.target as HTMLInputElement;
                                    const val = input.value.trim();
                                    if (val && !FORM_FIELDS[editingFormConfig.formId]?.includes(val)) {
                                      setEditingFormConfig({
                                        ...editingFormConfig,
                                        fieldMappings: [...editingFormConfig.fieldMappings, { frontendField: val, collectionField: '', isNewField: false }],
                                      });
                                      input.value = '';
                                    }
                                  }
                                }} />
                              <Plus size={14} className="text-[#D4AF37]/40" />
                            </div>
                            <p className={mutedCls + ' text-[9px] mt-1'}>Type a new field name and press Enter to add it</p>
                          </div>
                        </div>
                      </div>

                      {/* Validation Rules */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className={labelCls}>Validation Rules</label>
                          <button onClick={() => setValidationModal({ formId: editingFormConfig.formId, field: '' })} className="text-[9px] text-[#D4AF37] hover:text-white font-bold uppercase tracking-wider flex items-center gap-1">
                            <Plus size={10} /> Add Rule
                          </button>
                        </div>
                        {editingFormConfig.validationRules.length === 0 ? (
                          <p className="text-xs text-[#D4AF37]/40 italic py-2">No validation rules.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {editingFormConfig.validationRules.map((rule, i) => (
                              <div key={rule.id} className="flex items-center gap-2 bg-[#0F0A06]/50 rounded-xl px-3 py-2 border border-[#D4AF37]/10 text-xs">
                                <span className="font-bold text-[#F0EFE8] min-w-[100px]">{rule.field}</span>
                                <span className="text-[#D4AF37] font-bold uppercase text-[10px]">{rule.type}</span>
                                <span className="text-[#D4AF37]/70">{rule.value}</span>
                                <button onClick={() => setEditingFormConfig({ ...editingFormConfig, validationRules: editingFormConfig.validationRules.map((r, j) => j === i ? { ...r, enabled: !r.enabled } : r) })}
                                  className="ml-auto p-1 rounded hover:bg-[#D4AF37]/10 text-[#D4AF37]/40 hover:text-[#D4AF37]">
                                  {rule.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
                                </button>
                                <button onClick={() => setEditingFormConfig({ ...editingFormConfig, validationRules: editingFormConfig.validationRules.filter((_, j) => j !== i) })}
                                  className="p-1 hover:bg-red-500/20 rounded text-[#D4AF37]/40 hover:text-red-300"><X size={12} /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Auto-Calculations */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className={labelCls}>Auto-Calculations</label>
                          <button onClick={() => setAutoCalcModal({ formId: editingFormConfig.formId })} className="text-[9px] text-[#D4AF37] hover:text-white font-bold uppercase tracking-wider flex items-center gap-1">
                            <Plus size={10} /> Add Formula
                          </button>
                        </div>
                        {editingFormConfig.autoCalculations.length === 0 ? (
                          <p className="text-xs text-[#D4AF37]/40 italic py-2">No auto-calculations.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {editingFormConfig.autoCalculations.map((calc, i) => (
                              <div key={calc.id} className="flex items-center gap-2 bg-[#0F0A06]/50 rounded-xl px-3 py-2 border border-[#D4AF37]/10 text-xs">
                                <FunctionSquare size={12} className="text-cyan-300 shrink-0" />
                                <span className="font-bold text-[#F0EFE8] min-w-[80px]">{calc.targetField}</span>
                                <span className="text-cyan-300 font-mono">= {calc.formula}</span>
                                {calc.dependsOn.length > 0 && <span className="text-[#D4AF37]/50 text-[9px]">on: {calc.dependsOn.join(', ')}</span>}
                                <button onClick={() => setEditingFormConfig({ ...editingFormConfig, autoCalculations: editingFormConfig.autoCalculations.map((c, j) => j === i ? { ...c, enabled: !c.enabled } : c) })}
                                  className="ml-auto p-1 rounded hover:bg-[#D4AF37]/10 text-[#D4AF37]/40 hover:text-[#D4AF37]">
                                  {calc.enabled ? <Eye size={12} /> : <EyeOff size={12} />}
                                </button>
                                <button onClick={() => setEditingFormConfig({ ...editingFormConfig, autoCalculations: editingFormConfig.autoCalculations.filter((_, j) => j !== i) })}
                                  className="p-1 hover:bg-red-500/20 rounded text-[#D4AF37]/40 hover:text-red-300"><X size={12} /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'user-provision' && (
          <div className="bg-gradient-to-br from-[#0F0A06]/50 to-[#1A1008]/50 border border-[#D4AF37]/10 rounded-2xl p-12 text-center">
            <UserPlus className="text-[#D4AF37]/30 w-10 h-10 mx-auto mb-3" />
            <p className="text-sm text-[#D4AF37]/50 italic">User Provision tools coming soon.</p>
          </div>
        )}

        {activeTab === 'user-management' && (
          <div className="bg-gradient-to-br from-[#0F0A06]/50 to-[#1A1008]/50 border border-[#D4AF37]/10 rounded-2xl p-12 text-center">
            <Users className="text-[#D4AF37]/30 w-10 h-10 mx-auto mb-3" />
            <p className="text-sm text-[#D4AF37]/50 italic">User Management tools coming soon.</p>
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {renameModal && (
          <RenameModal field={renameModal.field} allFields={analysis?.fields.map(f => f.name) || []}
            onConfirm={(target) => { queueRename(renameModal.field, target); setRenameModal(null); }}
            onClose={() => setRenameModal(null)} />
        )}
        {mergeModal && (
          <MergeModal field={mergeModal.field} allFields={analysis?.fields.map(f => f.name) || []}
            onConfirm={(target, strategy) => { queueMerge(mergeModal.field, target, strategy); setMergeModal(null); }}
            onClose={() => setMergeModal(null)} />
        )}
        {changeTypeModal && (
          <ChangeTypeModal field={changeTypeModal.field}
            onConfirm={(conversion, delimiter) => { queueChangeType(changeTypeModal.field, conversion, delimiter); setChangeTypeModal(null); }}
            onClose={() => setChangeTypeModal(null)} />
        )}
        {summaryModal && (
          <SummaryModal operations={summaryModal} collectionName={effectiveCollection}
            onConfirm={handleExecute} onClose={() => setSummaryModal(null)} isExecuting={isExecuting} />
        )}

        {docIdConfigModalOpen && (
          <DocIdConfigModal
            collectionName={docIdConfigCollection || effectiveCollection}
            config={docIdConfigCollection ? loadDocIdConfigs()[docIdConfigCollection] || null : null}
            onSave={(config) => { saveDocIdConfig(config, docIdConfigCollection || effectiveCollection || 'custom'); setDocIdConfigModalOpen(false); }}
            onClose={() => setDocIdConfigModalOpen(false)} />
        )}

        {validationModal && editingFormConfig && (
          <ValidationRuleModal
            formId={validationModal.formId} field={validationModal.field}
            existingFields={editingFormConfig.fieldMappings.map(m => m.frontendField)}
            onConfirm={(field, type, value) => {
              setEditingFormConfig({ ...editingFormConfig, validationRules: [...editingFormConfig.validationRules, { id: `rule_${Date.now()}`, field, type: type as ValidationRule['type'], value, enabled: true }] });
              setValidationModal(null);
            }}
            onClose={() => setValidationModal(null)} />
        )}

        {autoCalcModal && editingFormConfig && (
          <AutoCalcModal
            existingFields={editingFormConfig.fieldMappings.map(m => m.frontendField)}
            onConfirm={(targetField, formula, dependsOn) => {
              setEditingFormConfig({ ...editingFormConfig, autoCalculations: [...editingFormConfig.autoCalculations, { id: `calc_${Date.now()}`, targetField, formula, dependsOn, enabled: true }] });
              setAutoCalcModal(null);
            }}
            onClose={() => setAutoCalcModal(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Rename Modal ─────────────────────────────────────────────────────────
const RenameModal: React.FC<{ field: string; allFields: string[]; onConfirm: (target: string) => void; onClose: () => void }> = ({ field, allFields, onConfirm, onClose }) => {
  const [target, setTarget] = useState('');
  const otherFields = allFields.filter(f => f !== field);
  return (
    <ModalShell onClose={onClose} title={`Rename "${field}"`}>
      <p className="text-xs text-[#D4AF37]/60 mb-3">Choose an existing field to rename into, or type a new name.</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {otherFields.map(f => (
          <button key={f} onClick={() => setTarget(f)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${target === f ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'border-[#D4AF37]/20 text-[#D4AF37]/50 hover:border-[#D4AF37]/50'}`}>{f}</button>
        ))}
      </div>
      <input type="text" placeholder="Or type new field name..." value={target} onChange={e => setTarget(e.target.value)} className={inputCls} />
      <div className="flex gap-2 justify-end mt-4">
        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-[#D4AF37]/30 text-xs text-[#D4AF37] hover:bg-[#D4AF37]/10">Cancel</button>
        <button onClick={() => onConfirm(target)} disabled={!target.trim()} className={btnCls}>Rename</button>
      </div>
    </ModalShell>
  );
};

// ── Merge Modal ──────────────────────────────────────────────────────────
const MergeModal: React.FC<{ field: string; allFields: string[]; onConfirm: (target: string, strategy: 'overwrite' | 'concat') => void; onClose: () => void }> = ({ field, allFields, onConfirm, onClose }) => {
  const [target, setTarget] = useState('');
  const [strategy, setStrategy] = useState<'overwrite' | 'concat'>('concat');
  const otherFields = allFields.filter(f => f !== field);
  return (
    <ModalShell onClose={onClose} title={`Merge "${field}"`}>
      <p className="text-xs text-[#D4AF37]/60 mb-3">Merge this field into another target field.</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {otherFields.map(f => (
          <button key={f} onClick={() => setTarget(f)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${target === f ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'border-[#D4AF37]/20 text-[#D4AF37]/50 hover:border-[#D4AF37]/50'}`}>{f}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mb-4">
        {(['concat', 'overwrite'] as const).map(s => (
          <label key={s} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs cursor-pointer transition-all ${strategy === s ? 'bg-purple-500/20 border-purple-500/50' : 'border-[#D4AF37]/20'}`}>
            <input type="radio" name="strategy" checked={strategy === s} onChange={() => setStrategy(s)} className="accent-purple-500" />
            {s === 'concat' ? 'Concatenate' : 'Overwrite'}
          </label>
        ))}
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-[#D4AF37]/30 text-xs text-[#D4AF37] hover:bg-[#D4AF37]/10">Cancel</button>
        <button onClick={() => onConfirm(target, strategy)} disabled={!target.trim()} className={btnCls}>Merge</button>
      </div>
    </ModalShell>
  );
};

// ── Change Type Modal ────────────────────────────────────────────────────
const ChangeTypeModal: React.FC<{ field: string; onConfirm: (conversion: string, delimiter?: string) => void; onClose: () => void }> = ({ field, onConfirm, onClose }) => {
  const [conversion, setConversion] = useState('to_string');
  const [delimiter, setDelimiter] = useState(',');
  const conversions = [
    { id: 'to_string', label: 'String', desc: 'Convert to string' },
    { id: 'to_number', label: 'Number', desc: 'Parse to number' },
    { id: 'string_to_array', label: 'String → Array', desc: 'Split by delimiter' },
    { id: 'array_to_string', label: 'Array → String', desc: 'Join with delimiter' },
  ];
  return (
    <ModalShell onClose={onClose} title={`Change Type: "${field}"`}>
      <p className="text-xs text-[#D4AF37]/60 mb-3">Select the target type for this field's values.</p>
      <div className="space-y-2 mb-4">
        {conversions.map(c => (
          <button key={c.id} onClick={() => setConversion(c.id)}
            className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-all ${conversion === c.id ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'border-[#D4AF37]/20 text-[#D4AF37]/60 hover:border-[#D4AF37]/50'}`}>
            <div className="font-bold">{c.label}</div>
            <div className="text-[10px] opacity-60">{c.desc}</div>
          </button>
        ))}
      </div>
      {(conversion === 'string_to_array' || conversion === 'array_to_string') && (
        <div className="mb-4">
          <label className="text-[10px] text-[#D4AF37]/60 uppercase tracking-wider font-bold mb-1 block">Delimiter</label>
          <input type="text" value={delimiter} onChange={e => setDelimiter(e.target.value)} className={inputCls} />
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-[#D4AF37]/30 text-xs text-[#D4AF37] hover:bg-[#D4AF37]/10">Cancel</button>
        <button onClick={() => onConfirm(conversion, delimiter)} className={btnCls}>Change Type</button>
      </div>
    </ModalShell>
  );
};

// ── DocId Config Modal ───────────────────────────────────────────────────
const DocIdConfigModal: React.FC<{ collectionName: string; config: DocIdConfig | null; onSave: (config: DocIdConfig) => void; onClose: () => void }> = ({ collectionName, config, onSave, onClose }) => {
  const [mode, setMode] = useState<'auto' | 'custom'>(config?.mode || 'auto');
  const [selectedFields, setSelectedFields] = useState<string[]>(config?.fields.map(f => f.fieldName) || []);
  const [fieldFormats, setFieldFormats] = useState<FieldFormat[]>(config?.fields || []);
  const [template, setTemplate] = useState(config?.template || '');
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [newField, setNewField] = useState('');
  const [showAllFields, setShowAllFields] = useState(true);

  const knownFields = COLLECTION_FIELDS[collectionName] || [];
  const allKnown = [...knownFields, ...customFields];
  const allFields = allKnown.filter(f => !selectedFields.includes(f));

  const toggleField = (name: string) => {
    setSelectedFields(prev => {
      const exists = prev.includes(name);
      if (exists) { setFieldFormats(fmts => fmts.filter(f => f.fieldName !== name)); return prev.filter(f => f !== name); }
      setFieldFormats(fmts => [...fmts, { fieldName: name, format: 'default' }]);
      return [...prev, name];
    });
  };
  const setFieldFormat = (name: string, format: string) => setFieldFormats(prev => prev.map(f => f.fieldName === name ? { ...f, format } : f));
  const addCustomField = () => { if (!newField.trim() || knownFields.includes(newField.trim()) || customFields.includes(newField.trim())) return; setCustomFields(prev => [...prev, newField.trim()]); setNewField(''); };
  useEffect(() => { if (selectedFields.length > 0 && !template) setTemplate(selectedFields.map(f => `{${f}}`).join('-')); }, [selectedFields, template]);
  const preview = useMemo(() => {
    if (mode === 'auto') return '[auto-generated ID]';
    let result = template;
    fieldFormats.forEach(f => { result = result.replace(`{${f.fieldName}}`, f.format && f.format !== 'default' ? `${f.fieldName}_${f.format}` : `{${f.fieldName}}`); });
    return result || '[empty]';
  }, [mode, template, fieldFormats]);
  const dateFormats = ['default', 'MMM DD, YYYY', 'MMM DD', 'DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YY'];

  const fieldCount = knownFields.length;

  return (
    <ModalShell onClose={onClose} title={`Doc ID — ${collectionName || 'Custom'}`}>
      <div className="space-y-4 text-xs">
        <div className="p-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20">
          <span className="text-[#D4AF37] font-bold">Collection: </span>
          <span className="text-[#F0EFE8]">{collectionName || 'Custom'}</span>
          <span className="text-[#D4AF37]/50 ml-2">({fieldCount} known fields)</span>
        </div>

        <div>
          <label className="text-[10px] text-[#D4AF37]/60 uppercase tracking-wider font-bold mb-2 block">ID Mode</label>
          <div className="flex gap-2">
            {(['auto', 'custom'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 px-3 py-2 rounded-xl border text-center transition-all ${mode === m ? 'bg-[#D4AF37]/20 border-[#D4AF37]/60 text-[#D4AF37]' : 'border-[#D4AF37]/20 text-[#D4AF37]/50 hover:border-[#D4AF37]/50'}`}>
                <div className="font-bold text-[11px]">{m === 'auto' ? 'Auto ID' : 'Custom ID'}</div>
                <div className="text-[9px] opacity-60 mt-0.5">{m === 'auto' ? 'Firestore generated' : 'Build from fields'}</div>
              </button>
            ))}
          </div>
        </div>

        {mode === 'custom' && (
          <>
            {/* Selected fields */}
            <div>
              <label className="text-[10px] text-[#D4AF37]/60 uppercase tracking-wider font-bold mb-2 block">
                Selected Fields ({selectedFields.length})
              </label>
              {selectedFields.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {selectedFields.map(f => (
                    <button key={f} onClick={() => toggleField(f)} className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-bold flex items-center gap-1">
                      {f} <X size={10} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[#D4AF37]/60 mb-3">No fields selected. Click fields below to add them.</p>
              )}
            </div>

            {/* All collection fields */}
            <div>
              <button onClick={() => setShowAllFields(!showAllFields)}
                className="flex items-center gap-1 text-[10px] text-[#D4AF37]/60 uppercase tracking-wider font-bold mb-2 hover:text-[#D4AF37]">
                {showAllFields ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                All Collection Fields ({fieldCount})
              </button>
              {showAllFields && (
                <div className="max-h-48 overflow-y-auto border border-[#D4AF37]/15 rounded-xl p-2 space-y-0.5">
                  {knownFields.length === 0 ? (
                    <p className="text-[10px] text-[#D4AF37]/40 italic p-2">No predefined fields for this collection.</p>
                  ) : (
                    knownFields.map(f => {
                      const isSelected = selectedFields.includes(f);
                      return (
                        <button key={f} onClick={() => toggleField(f)}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                              : 'border-transparent text-[#D4AF37]/60 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] hover:border-[#D4AF37]/20'
                          }`}>
                          <span>{f}</span>
                          {isSelected && <CheckCircle2 size={10} className="text-amber-300" />}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Add custom field */}
            <div>
              <label className="text-[10px] text-[#D4AF37]/60 uppercase tracking-wider font-bold mb-1.5 block">Add New Field</label>
              <div className="flex gap-2">
                <input type="text" placeholder="Type new field name..." value={newField} onChange={e => setNewField(e.target.value)}
                  className="flex-1 bg-[#0F0A06]/80 border border-[#D4AF37]/20 rounded-lg px-3 py-1.5 text-xs focus:border-[#D4AF37] outline-none text-[#F0EFE8] placeholder-[#D4AF37]/30"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomField(); } }} />
                <button onClick={addCustomField} className="px-3 py-1.5 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-[9px] font-bold hover:bg-[#D4AF37]/30 shrink-0">+ Add</button>
              </div>
              {customFields.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {customFields.map(f => (
                    <span key={f} className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[9px] font-bold">{f}</span>
                  ))}
                </div>
              )}
            </div>

            {/* ID template */}
            <div>
              <label className="text-[10px] text-[#D4AF37]/60 uppercase tracking-wider font-bold mb-2 block">ID Format Template</label>
              <input type="text" value={template} onChange={e => setTemplate(e.target.value)}
                className="w-full bg-[#0F0A06]/80 border border-[#D4AF37]/20 rounded-xl px-4 py-2.5 text-sm font-mono focus:border-[#D4AF37] outline-none text-[#F0EFE8]" placeholder="{field1}-{field2}" />
              <p className="text-[9px] text-[#D4AF37]/40 mt-1">Use {'{field_name}'} as placeholders</p>
            </div>

            {/* Field formatting */}
            {selectedFields.length > 0 && (
              <div>
                <label className="text-[10px] text-[#D4AF37]/60 uppercase tracking-wider font-bold mb-2 block">Date Formatting</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {fieldFormats.map(f => (
                    <div key={f.fieldName} className="flex items-center gap-2 bg-[#0F0A06]/50 rounded-xl px-3 py-2 border border-[#D4AF37]/10">
                      <span className="text-[10px] font-bold text-[#F0EFE8] min-w-[80px]">{f.fieldName}</span>
                      <select value={f.format} onChange={e => setFieldFormat(f.fieldName, e.target.value)}
                        className="flex-1 bg-[#0A0A0F]/80 border border-[#D4AF37]/10 rounded-lg px-2 py-1 text-[10px] focus:border-[#D4AF37] outline-none text-[#F0EFE8]">
                        {dateFormats.map(df => <option key={df} value={df}>{df}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <div className="text-[9px] text-cyan-300/70 uppercase tracking-wider font-bold mb-1">Preview</div>
              <div className="text-sm font-mono text-cyan-300">{preview}</div>
            </div>
          </>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-[#D4AF37]/30 text-xs text-[#D4AF37] hover:bg-[#D4AF37]/10">Cancel</button>
          <button onClick={() => onSave({ mode, fields: fieldFormats, template: mode === 'auto' ? '' : template })} className={btnCls}>Save Config</button>
        </div>
      </div>
    </ModalShell>
  );
};

// ── Validation Rule Modal ────────────────────────────────────────────────
const ValidationRuleModal: React.FC<{ formId: string; field: string; existingFields: string[]; onConfirm: (field: string, type: string, value: string) => void; onClose: () => void }> = ({ field, existingFields, onConfirm, onClose }) => {
  const [selectedField, setSelectedField] = useState(field);
  const [ruleType, setRuleType] = useState('required');
  const [ruleValue, setRuleValue] = useState('');
  return (
    <ModalShell onClose={onClose} title="Add Validation Rule">
      <div className="space-y-4 text-xs">
        <div>
          <label className="text-[10px] text-[#D4AF37]/60 uppercase tracking-wider font-bold mb-1.5 block">Field</label>
          <select value={selectedField} onChange={e => setSelectedField(e.target.value)}
            className="w-full bg-[#0F0A06]/80 border border-[#D4AF37]/20 rounded-xl px-4 py-2.5 text-sm focus:border-[#D4AF37] outline-none text-[#F0EFE8]">
            <option value="">Select...</option>
            {existingFields.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[#D4AF37]/60 uppercase tracking-wider font-bold mb-1.5 block">Rule Type</label>
          <div className="flex flex-wrap gap-1.5">
            {(['required', 'type', 'min', 'max', 'pattern', 'enum'] as const).map(t => (
              <button key={t} onClick={() => setRuleType(t)}
                className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold border transition-all ${ruleType === t ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'border-[#D4AF37]/20 text-[#D4AF37]/50 hover:border-[#D4AF37]/50'}`}>{t}</button>
            ))}
          </div>
        </div>
        {ruleType !== 'required' && (
          <div>
            <label className="text-[10px] text-[#D4AF37]/60 uppercase tracking-wider font-bold mb-1.5 block">
              {ruleType === 'type' ? 'Expected Type' : ruleType === 'pattern' ? 'Regex Pattern' : ruleType === 'enum' ? 'Comma Values' : ruleType === 'min' ? 'Minimum' : 'Maximum'}
            </label>
            {ruleType === 'type' ? (
              <select value={ruleValue} onChange={e => setRuleValue(e.target.value)}
                className="w-full bg-[#0F0A06]/80 border border-[#D4AF37]/20 rounded-xl px-4 py-2.5 text-sm focus:border-[#D4AF37] outline-none text-[#F0EFE8]">
                {['string','number','boolean','date','array'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            ) : (
              <input type="text" value={ruleValue} onChange={e => setRuleValue(e.target.value)}
                placeholder={ruleType === 'pattern' ? '^[a-zA-Z0-9_]+$' : ruleType === 'enum' ? 'v1, v2, v3' : '0'}
                className="w-full bg-[#0F0A06]/80 border border-[#D4AF37]/20 rounded-xl px-4 py-2.5 text-sm focus:border-[#D4AF37] outline-none text-[#F0EFE8] placeholder-[#D4AF37]/30" />
            )}
          </div>
        )}
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-[#D4AF37]/30 text-xs text-[#D4AF37] hover:bg-[#D4AF37]/10">Cancel</button>
          <button onClick={() => onConfirm(selectedField, ruleType, ruleValue)} disabled={!selectedField} className={btnCls}>Add Rule</button>
        </div>
      </div>
    </ModalShell>
  );
};

// ── Auto Calc Modal ──────────────────────────────────────────────────────
const AutoCalcModal: React.FC<{ existingFields: string[]; onConfirm: (targetField: string, formula: string, dependsOn: string[]) => void; onClose: () => void }> = ({ existingFields, onConfirm, onClose }) => {
  const [targetField, setTargetField] = useState('');
  const [formula, setFormula] = useState('');
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const toggleDep = (field: string) => setDependsOn(prev => prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]);
  return (
    <ModalShell onClose={onClose} title="Add Auto-Calculation">
      <div className="space-y-4 text-xs">
        <div>
          <label className="text-[10px] text-[#D4AF37]/60 uppercase tracking-wider font-bold mb-1.5 block">Target Field</label>
          <input type="text" value={targetField} onChange={e => setTargetField(e.target.value)}
            placeholder="Result field (e.g. total_score)"
            className="w-full bg-[#0F0A06]/80 border border-[#D4AF37]/20 rounded-xl px-4 py-2.5 text-sm focus:border-[#D4AF37] outline-none text-[#F0EFE8] placeholder-[#D4AF37]/30" />
        </div>
        <div>
          <label className="text-[10px] text-[#D4AF37]/60 uppercase tracking-wider font-bold mb-1.5 block">Formula</label>
          <input type="text" value={formula} onChange={e => setFormula(e.target.value)}
            placeholder="{pk_wins} / {pk_sessions} * 100"
            className="w-full bg-[#0F0A06]/80 border border-[#D4AF37]/20 rounded-xl px-4 py-2.5 text-sm font-mono focus:border-[#D4AF37] outline-none text-[#F0EFE8] placeholder-[#D4AF37]/30" />
          <p className="text-[9px] text-[#D4AF37]/40 mt-1">Use {'{field_name}'} as variables</p>
        </div>
        <div>
          <label className="text-[10px] text-[#D4AF37]/60 uppercase tracking-wider font-bold mb-1.5 block">Depends On</label>
          <div className="flex flex-wrap gap-1.5">
            {existingFields.map(f => (
              <button key={f} onClick={() => toggleDep(f)}
                className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-all ${dependsOn.includes(f) ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'border-[#D4AF37]/20 text-[#D4AF37]/50 hover:border-[#D4AF37]/50'}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-[#D4AF37]/30 text-xs text-[#D4AF37] hover:bg-[#D4AF37]/10">Cancel</button>
          <button onClick={() => onConfirm(targetField, formula, dependsOn)} disabled={!targetField.trim() || !formula.trim()} className={btnCls}>Add Formula</button>
        </div>
      </div>
    </ModalShell>
  );
};

// ── Summary Modal ────────────────────────────────────────────────────────
const SummaryModal: React.FC<{ operations: QueuedOp[]; collectionName: string; onConfirm: () => void; onClose: () => void; isExecuting: boolean }> = ({ operations, collectionName, onConfirm, onClose, isExecuting }) => {
  const codeChanges = generateCodeChanges({ collectionName, operations });
  return (
    <ModalShell onClose={onClose} title="Review Changes">
      <div className="space-y-3 text-xs">
        <div className="p-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20">
          <div className="text-[#D4AF37] font-bold mb-1">Collection</div>
          <div className="text-[#F0EFE8]">{collectionName}</div>
        </div>
        <div className="p-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20">
          <div className="text-[#D4AF37] font-bold mb-1">Operations ({operations.length})</div>
          <div className="space-y-1">
            {operations.map((op, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className={`font-bold uppercase ${op.type === 'delete' ? 'text-red-300' : op.type === 'rename' ? 'text-blue-300' : op.type === 'merge' ? 'text-purple-300' : 'text-cyan-300'}`}>{op.type.replace(/_/g, ' ')}</span>
                <span className="text-[#D4AF37]/60">{op.sourceField}</span>
                {op.targetField && <><ArrowRight size={10} className="text-[#D4AF37]/40" /><span className="text-[#D4AF37]/80">{op.targetField}</span></>}
              </div>
            ))}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300/80">
          <div className="flex items-center gap-2 font-bold mb-1"><Info size={12} /> Code Changes Required</div>
          <div className="space-y-1">{codeChanges.map((item, i) => <div key={i} className="flex items-start gap-2 text-[10px]"><span className="text-yellow-300/60 mt-0.5">•</span><span>{item}</span></div>)}</div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} disabled={isExecuting} className="px-4 py-2 rounded-xl border border-[#D4AF37]/30 text-xs text-[#D4AF37] hover:bg-[#D4AF37]/10">Cancel</button>
          <button onClick={onConfirm} disabled={isExecuting} className={btnCls}>
            {isExecuting ? <><Loader2 size={12} className="animate-spin" /> Executing...</> : 'Confirm & Execute'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

const ModalShell: React.FC<{ children: React.ReactNode; onClose: () => void; title: string }> = ({ children, onClose, title }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 md:p-4" onClick={onClose}>
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
      className="bg-gradient-to-br from-[#1A140A] to-[#0F0A06] border border-[#D4AF37]/30 rounded-2xl p-4 md:p-5 w-full max-w-lg shadow-[0_0_50px_rgba(212,175,55,0.2)] max-h-[90vh] overflow-y-auto"
      onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-black uppercase tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB]">{title}</h2>
        <button onClick={onClose} className="p-1 hover:bg-[#D4AF37]/10 rounded-lg text-[#D4AF37]/40 hover:text-[#D4AF37]"><X size={16} /></button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);

function generateCodeChanges(task: { collectionName: string; operations: QueuedOp[] }): string[] {
  const parts: string[] = [];
  const renamed = task.operations.filter(o => o.type === 'rename');
  const merged = task.operations.filter(o => o.type === 'merge');
  const deleted = task.operations.filter(o => o.type === 'delete');
  const typeChanged = task.operations.filter(o => o.type === 'change_type');
  if (renamed.length > 0) parts.push(`Frontend: Update reads of ${renamed.map(o => `"${o.sourceField}"`).join(', ')} to "${renamed[0].targetField}" in components and CalendarEvent type.`);
  if (merged.length > 0) parts.push(`Frontend: Remove refs to ${merged.map(o => `"${o.sourceField}"`).join(', ')} — data in ${merged[0].targetField}.`);
  if (deleted.length > 0) parts.push(`Frontend: Remove refs to deleted fields: ${deleted.map(o => `"${o.sourceField}"`).join(', ')}.`)
  if (typeChanged.length > 0) parts.push(`Frontend: Update type usage for ${typeChanged.map(o => `"${o.sourceField}" (→ ${o.conversion})`).join(', ')}.`);
  if (parts.length === 0) parts.push('No code changes needed.');
  return parts;
}

const inputCls = 'w-full bg-[#0F0A06]/80 border border-[#D4AF37]/20 rounded-xl px-4 py-2.5 text-sm focus:border-[#D4AF37] outline-none text-[#F0EFE8] placeholder-[#D4AF37]/30';
const btnCls = 'px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-[#0A0A0F] text-xs font-black uppercase tracking-[0.20em] transition-all active:scale-95 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2';

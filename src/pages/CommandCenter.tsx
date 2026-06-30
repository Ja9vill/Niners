import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Users, UserPlus, Shield, Loader2, CheckCircle2, AlertCircle,
  Trash2, FileSpreadsheet, ChevronRight, X, Edit3, Merge, Search,
  Clock, FileText, ListChecks, ArrowRight, Info
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { Storage } from '../lib/storage';

type TabId = 'user-provision' | 'collections' | 'user-management';

const tabs: { id: TabId; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'user-provision', label: 'User Provision', icon: UserPlus },
  { id: 'collections', label: 'Collections', icon: Database },
  { id: 'user-management', label: 'User Management', icon: Users },
];

const KNOWN_COLLECTIONS = ['calendar', 'users', 'agent_financial_reports', 'attendance', 'livehouse_requests', 'system'];

// ── Types ─────────────────────────────────────────────────────────────────
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
  format: string; // e.g. "YYYY-MM-DD" for dates, or "default"
}

interface DocIdConfig {
  mode: 'auto' | 'custom';
  fields: FieldFormat[];
  template: string; // e.g. "{from_date}-{event_type}"
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

// ── Stored task history helpers ──────────────────────────────────────────
const TASKS_KEY = 'cmd_center_tasks';

function loadTasks(): TaskSummary[] {
  try { return JSON.parse(localStorage.getItem(TASKS_KEY) || '[]'); } catch { return []; }
}

function saveTasks(tasks: TaskSummary[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

const DOCID_KEY = 'cmd_center_docid_configs';

function loadDocIdConfigs(): Record<string, DocIdConfig> {
  try { return JSON.parse(localStorage.getItem(DOCID_KEY) || '{}'); } catch { return {}; }
}
function saveDocIdConfig(config: DocIdConfig, collectionName: string) {
  const all = loadDocIdConfigs();
  all[collectionName] = config;
  localStorage.setItem(DOCID_KEY, JSON.stringify(all));
}

// ── Component ────────────────────────────────────────────────────────────
export const CommandCenter = () => {
  const [activeTab, setActiveTab] = useState<TabId>('collections');
  const [authState] = useState(Storage.getAuthState());

  // ── Analyzer state ─────────────────────────────────────────────────────
  const [collectionName, setCollectionName] = useState('');
  const [customCollection, setCustomCollection] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState('');

  // Selected canonical fields (checked by user as "keep these")
  const [canonicalFields, setCanonicalFields] = useState<Set<string>>(new Set());
  // Queued operations
  const [queuedOps, setQueuedOps] = useState<QueuedOp[]>([]);
  // Modals
  const [renameModal, setRenameModal] = useState<{ field: string } | null>(null);
  const [mergeModal, setMergeModal] = useState<{ field: string } | null>(null);
  const [changeTypeModal, setChangeTypeModal] = useState<{ field: string } | null>(null);
  const [docIdConfig, setDocIdConfig] = useState<DocIdConfig | null>(null);
  const [docIdModal, setDocIdModal] = useState(false);
  const [summaryModal, setSummaryModal] = useState<QueuedOp[] | null>(null);
  // Executing
  const [isExecuting, setIsExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<any>(null);

  // ── Task history ───────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<TaskSummary[]>(loadTasks);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const refreshTasks = useCallback(() => {
    setTasks(loadTasks());
  }, []);

  // ── Analyze ────────────────────────────────────────────────────────────
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

  // Toggle canonical (keep) field
  const toggleCanonical = (fieldName: string) => {
    setCanonicalFields(prev => {
      const next = new Set(prev);
      if (next.has(fieldName)) next.delete(fieldName);
      else next.add(fieldName);
      return next;
    });
  };

  // Auto-queue redundant fields for deletion
  const handleAutoClean = () => {
    if (!analysis) return;
    const ops: QueuedOp[] = [];
    const canonicalSet = canonicalFields;

    analysis.fields.forEach(f => {
      if (!canonicalSet.has(f.name)) {
        // If there's a canonical field with similar name, suggest merge; otherwise delete
      const fName = String(f.name);
      const similarCanonical = Array.from(canonicalSet as Set<string>).find((c: string) =>
        c.toLowerCase().replace(/[^a-z0-9]/g, '') === fName.toLowerCase().replace(/[^a-z0-9]/g, '')
      );
      if (similarCanonical) {
        ops.push({ type: 'merge', sourceField: fName, targetField: similarCanonical, mergeStrategy: 'concat' });
        } else {
          ops.push({ type: 'delete', sourceField: fName });
        }
      }
    });

    setQueuedOps(ops);
  };

  const queueDelete = (field: string) => {
    setQueuedOps(prev => [...prev.filter(op => op.sourceField !== field), { type: 'delete', sourceField: field }]);
  };

  const queueRename = (source: string, target: string) => {
    setQueuedOps(prev => [...prev.filter(op => op.sourceField !== source), { type: 'rename', sourceField: source, targetField: target }]);
  };

  const queueMerge = (source: string, target: string, strategy: 'overwrite' | 'concat' = 'concat') => {
    setQueuedOps(prev => [...prev.filter(op => op.sourceField !== source), { type: 'merge', sourceField: source, targetField: target, mergeStrategy: strategy }]);
  };

  const queueChangeType = (field: string, conversion: string, delimiter?: string) => {
    setQueuedOps(prev => [...prev.filter(op => op.sourceField !== field), { type: 'change_type', sourceField: field, conversion, delimiter }]);
  };

  const removeQueuedOp = (field: string) => {
    setQueuedOps(prev => prev.filter(op => op.sourceField !== field));
  };

  // ── Execute ────────────────────────────────────────────────────────────
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

      // Save task summary
      const codeItems = generateCodeChanges({ collectionName: effectiveCollection, operations: queuedOps });
      const task: TaskSummary = {
        id: taskId,
        collectionName: effectiveCollection,
        createdAt: new Date().toISOString(),
        executedAt: new Date().toISOString(),
        analysis,
        operations: [...queuedOps],
        result: data,
        completed: true,
        notes: '',
        codeItems,
        codeChecks: Object.fromEntries(codeItems.map((_, i) => [i, false])),
      };
      const existing = loadTasks();
      saveTasks([task, ...existing]);
      refreshTasks();

      setQueuedOps([]);
      setSummaryModal(null);
    } catch (err: any) {
      setExecuteResult({ error: err.message || 'Execution failed.' });
    } finally {
      setIsExecuting(false);
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────
  const btnCls = 'px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-[#0A0A0F] text-xs font-black uppercase tracking-[0.20em] transition-all active:scale-95 shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2';
  const btnSecondaryCls = 'px-4 py-2 rounded-xl border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-black uppercase tracking-[0.15em] transition-all hover:bg-[#D4AF37]/10 cursor-pointer disabled:opacity-50 flex items-center gap-2';
  const inputCls = 'w-full bg-[#0F0A06]/80 border border-[#D4AF37]/20 rounded-xl px-4 py-3 text-sm tracking-widest focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 outline-none transition-all text-[#F0EFE8] placeholder-[#A09E9A]/40';
  const cardCls = 'bg-[#0F0A06]/60 border border-[#D4AF37]/10 rounded-2xl p-6';

  const severityColor = (s: string) =>
    s === 'high' ? 'text-red-400 bg-red-500/10 border-red-500/30'
    : s === 'medium' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
    : 'text-blue-400 bg-blue-500/10 border-blue-500/30';

  return (
    <div className="p-4 md:p-6 min-h-screen bg-[#0A0A0F] text-[#F0EFE8]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#D4AF37]/20">
        <Shield className="text-[#D4AF37] w-6 h-6" />
        <div>
          <h1 className="text-lg font-black tracking-[0.15em] uppercase text-[#D4AF37]">Command Center</h1>
          <p className="text-[10px] font-medium text-[#A09E9A]/70 tracking-wider">Director-only administration hub</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 mb-6 p-1 bg-[#0F0A06]/60 border border-[#D4AF37]/10 rounded-xl w-full">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-[#0A0A0F] shadow-[0_0_15px_rgba(212,175,55,0.3)]'
                  : 'text-[#A09E9A]/60 hover:text-[#F0EFE8] hover:bg-[#D4AF37]/5'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {activeTab === 'collections' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* ── Main analyzer ── */}
            <div className="xl:col-span-2 space-y-6">
              {/* Collection Selector */}
              <div className={cardCls}>
                <div className="flex items-center gap-3 mb-4">
                  <Search className="text-[#D4AF37] w-5 h-5" />
                  <h2 className="text-sm font-black tracking-[0.15em] uppercase text-[#F0EFE8]">Collection Analyzer</h2>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {KNOWN_COLLECTIONS.map(c => (
                    <button
                      key={c}
                      onClick={() => { setCollectionName(c); setCustomCollection(''); }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                        collectionName === c
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37]'
                          : 'border-[#D4AF37]/10 text-[#A09E9A]/60 hover:border-[#D4AF37]/30'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Or type custom collection name..."
                    value={customCollection}
                    onChange={e => { setCustomCollection(e.target.value); setCollectionName(''); }}
                    className={inputCls}
                  />
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !effectiveCollection.trim()}
                    className={btnCls}
                  >
                    {isAnalyzing ? <><Loader2 size={14} className="animate-spin" /> Analyzing</> : 'Analyze'}
                  </button>
                </div>
              </div>

              {/* Analysis Results */}
              {analyzeError && (
                <div className="p-4 rounded-xl border bg-red-500/10 border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle size={14} /> {analyzeError}
                </div>
              )}

              {analysis && (
                <>
                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className={`${cardCls} text-center`}>
                      <div className="text-2xl font-black text-[#D4AF37]">{analysis.totalDocs}</div>
                      <div className="text-[10px] text-[#A09E9A]/60 uppercase tracking-wider font-bold mt-1">Documents</div>
                    </div>
                    <div className={`${cardCls} text-center`}>
                      <div className="text-2xl font-black text-[#F0EFE8]">{analysis.fields.length}</div>
                      <div className="text-[10px] text-[#A09E9A]/60 uppercase tracking-wider font-bold mt-1">Fields Found</div>
                    </div>
                    <div className={`${cardCls} text-center`}>
                      <div className="text-2xl font-black text-yellow-400">{analysis.anomalies.length}</div>
                      <div className="text-[10px] text-[#A09E9A]/60 uppercase tracking-wider font-bold mt-1">Anomalies</div>
                    </div>
                  </div>

                  {/* Anomalies */}
                  {analysis.anomalies.length > 0 && (
                    <div className={cardCls}>
                      <h3 className="text-xs font-black uppercase tracking-[0.15em] text-yellow-400 mb-3 flex items-center gap-2">
                        <AlertCircle size={14} /> Anomalies Detected
                      </h3>
                      <div className="space-y-2">
                        {analysis.anomalies.map((a, i) => (
                          <div key={i} className={`p-3 rounded-xl border text-xs ${severityColor(a.severity)}`}>
                            <div className="font-bold mb-1 uppercase tracking-wider">{a.type.replace(/_/g, ' ')}</div>
                            <div className="opacity-80">{a.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Field Table */}
                  <div className={cardCls}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-black uppercase tracking-[0.15em] text-[#F0EFE8] flex items-center gap-2">
                        <ListChecks size={14} /> Fields ({analysis.fields.length})
                      </h3>
                      <div className="flex gap-2">
                        <button onClick={handleAutoClean} className={btnSecondaryCls} disabled={canonicalFields.size === 0}>
                          <Trash2 size={12} /> Auto Clean
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#A09E9A]/50 mb-3">
                      Check fields that should be kept (canonical). Unchecked fields will be queued for cleanup.
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-[10px] text-[#A09E9A]/60 uppercase tracking-wider border-b border-[#D4AF37]/10">
                            <th className="text-left py-2 pr-2 w-8">Keep</th>
                            <th className="text-left py-2 px-2">Field Name</th>
                            <th className="text-left py-2 px-2">Types</th>
                            <th className="text-right py-2 px-2">Coverage</th>
                            <th className="text-left py-2 px-2">Sample</th>
                            <th className="text-right py-2 px-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.fields.map(f => {
                            const isCanonical = canonicalFields.has(f.name);
                            const hasOp = queuedOps.find(op => op.sourceField === f.name);
                            return (
                              <tr key={f.name} className="border-b border-[#D4AF37]/5 hover:bg-[#D4AF37]/5 transition-colors">
                                <td className="py-2 pr-2">
                                  <input
                                    type="checkbox"
                                    checked={isCanonical}
                                    onChange={() => toggleCanonical(f.name)}
                                    className="accent-[#D4AF37] cursor-pointer"
                                  />
                                </td>
                                <td className="py-2 px-2 font-medium">{f.name}</td>
                                <td className="py-2 px-2">
                                  <div className="flex gap-1 flex-wrap">
                                    {f.types.map(t => (
                                      <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                        !f.consistentType ? 'bg-yellow-500/20 text-yellow-400' : 'bg-[#D4AF37]/10 text-[#D4AF37]'
                                      }`}>
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-right">
                                  <span className={f.coverage < 50 ? 'text-yellow-400' : 'text-emerald-400'}>{f.coverage}%</span>
                                </td>
                                <td className="py-2 px-2 text-[#A09E9A] max-w-[120px] truncate">
                                  {f.samples.length > 0 ? JSON.stringify(f.samples[0]) : '-'}
                                </td>
                                <td className="py-2 px-2 text-right">
                                  <div className="flex gap-1 justify-end">
                                    <button
                                      onClick={() => queueDelete(f.name)}
                                      className={`p-1 rounded hover:bg-red-500/20 transition-colors ${hasOp?.type === 'delete' ? 'text-red-400' : 'text-[#A09E9A]/50'}`}
                                      title="Delete field"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                    <button
                                      onClick={() => setRenameModal({ field: f.name })}
                                      className="p-1 rounded hover:bg-blue-500/20 text-[#A09E9A]/50 hover:text-blue-400 transition-colors"
                                      title="Rename field"
                                    >
                                      <Edit3 size={12} />
                                    </button>
                                    <button
                                      onClick={() => setMergeModal({ field: f.name })}
                                      className="p-1 rounded hover:bg-purple-500/20 text-[#A09E9A]/50 hover:text-purple-400 transition-colors"
                                      title="Merge field"
                                    >
                                      <Merge size={12} />
                                    </button>
                                    <button
                                      onClick={() => setChangeTypeModal({ field: f.name })}
                                      className="p-1 rounded hover:bg-cyan-500/20 text-[#A09E9A]/50 hover:text-cyan-400 transition-colors"
                                      title="Change field type"
                                    >
                                      <FileText size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Document ID Configuration */}
                  <div className={cardCls}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-black uppercase tracking-[0.15em] text-[#F0EFE8] flex items-center gap-2">
                        <FileText size={14} /> Document ID Config
                      </h3>
                      <button
                        onClick={() => setDocIdModal(true)}
                        className={btnSecondaryCls}
                      >
                        <Edit3 size={12} /> Configure
                      </button>
                    </div>
                    <p className="text-[10px] text-[#A09E9A]/50">
                      {docIdConfig
                        ? `Mode: ${docIdConfig.mode}${docIdConfig.mode === 'custom' ? ` — Template: "${docIdConfig.template}"` : ''}`
                        : 'Not configured. Auto ID will be used by default.'}
                    </p>
                  </div>

                  {/* Queued Operations */}
                  {queuedOps.length > 0 && (
                    <div className={cardCls}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-black uppercase tracking-[0.15em] text-[#D4AF37] flex items-center gap-2">
                          <ListChecks size={14} /> Queued Operations ({queuedOps.length})
                        </h3>
                        <button
                          onClick={() => setSummaryModal(queuedOps)}
                          className={btnCls}
                        >
                          <ArrowRight size={14} /> Review & Execute
                        </button>
                      </div>
                      <div className="space-y-1">
                        {queuedOps.map((op, i) => (
                          <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#D4AF37]/5">
                            <div>
                              <span className={`font-bold uppercase tracking-wider ${
                                op.type === 'delete' ? 'text-red-400' : op.type === 'rename' ? 'text-blue-400' : op.type === 'merge' ? 'text-purple-400' : 'text-cyan-400'
                              }`}>
                                {op.type === 'change_type' ? `change_type → ${op.conversion || ''}` : op.type}
                              </span>
                              <span className="text-[#A09E9A] mx-1">—</span>
                              <span className="font-medium">{op.sourceField}</span>
                              {op.targetField && (
                                <span className="text-[#A09E9A]"> → {op.targetField}</span>
                              )}
                            </div>
                            <button onClick={() => removeQueuedOp(op.sourceField)} className="p-1 hover:bg-red-500/20 rounded text-[#A09E9A]/50 hover:text-red-400">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Execute result */}
                  {executeResult && (
                    <div className={`p-4 rounded-xl border text-xs ${
                      executeResult.error
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}>
                      {executeResult.error ? (
                        <div className="flex items-center gap-2"><AlertCircle size={14} /> {executeResult.error}</div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} />
                          Complete — {executeResult.affectedDocs} of {executeResult.totalDocs} docs affected
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Task History sidebar ── */}
            <div className="space-y-4">
              <div className={cardCls}>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="text-[#D4AF37] w-4 h-4" />
                  <h2 className="text-xs font-black uppercase tracking-[0.15em] text-[#F0EFE8]">Task History</h2>
                  <button onClick={refreshTasks} className="ml-auto text-[#A09E9A]/50 hover:text-[#D4AF37] text-[9px] uppercase tracking-wider">Refresh</button>
                </div>

                {tasks.length === 0 ? (
                  <p className="text-xs text-[#A09E9A]/40 italic text-center py-8">No tasks yet. Analyze a collection to get started.</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.map(task => (
                      <div key={task.id} className="border border-[#D4AF37]/10 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                          className="w-full flex items-center justify-between p-3 hover:bg-[#D4AF37]/5 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            {(() => {
                              if (!task.completed) return <Loader2 size={12} className="text-yellow-400 animate-spin" />;
                              const checks = task.codeChecks || {};
                              const total = (task.codeItems || []).length || Object.keys(checks).length;
                              const done = Object.values(checks).filter(Boolean).length;
                              if (total > 0 && done < total) return <CheckCircle2 size={12} className="text-orange-400" />;
                              return <CheckCircle2 size={12} className="text-emerald-400" />;
                            })()}
                            <div>
                              <div className="text-xs font-medium">{task.collectionName}</div>
                              <div className="text-[9px] text-[#A09E9A]/50">
                                {new Date(task.createdAt).toLocaleDateString()} — {task.operations.length} ops
                              </div>
                            </div>
                          </div>
                          <ChevronRight size={12} className={`text-[#A09E9A]/50 transition-transform ${expandedTask === task.id ? 'rotate-90' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {expandedTask === task.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-[#D4AF37]/10"
                            >
                              <div className="p-3 space-y-2 text-xs">
                                {/* Operations */}
                                <div className="space-y-1">
                                  <div className="text-[9px] text-[#A09E9A]/50 uppercase tracking-wider font-bold">Operations</div>
                                  {task.operations.map((op, i) => (
                                    <div key={i} className="flex items-center gap-1 text-[11px]">
                                      <span className={`font-bold ${
                                        op.type === 'delete' ? 'text-red-400' : op.type === 'rename' ? 'text-blue-400' : op.type === 'merge' ? 'text-purple-400' : 'text-cyan-400'
                                      }`}>{op.type === 'change_type' ? `change_type → ${op.conversion || ''}` : op.type}</span>
                                      <span className="text-[#A09E9A]">{op.sourceField}</span>
                                      {op.targetField && <><ArrowRight size={10} className="text-[#A09E9A]" /><span>{op.targetField}</span></>}
                                    </div>
                                  ))}
                                </div>

                                {/* Result */}
                                {task.result && (
                                  <div>
                                    <div className="text-[9px] text-[#A09E9A]/50 uppercase tracking-wider font-bold">Result</div>
                                    <div className="text-[11px]">{task.result.affectedDocs} docs affected</div>
                                  </div>
                                )}

                                {/* Code Changes Checklist */}
                                <div>
                                  <div className="text-[9px] text-[#A09E9A]/50 uppercase tracking-wider font-bold mb-1">Code Changes Checklist</div>
                                  <div className="space-y-1">
                                    {(task.codeItems || generateCodeChanges(task)).map((item, i) => {
                                      const checked = task.codeChecks?.[i] || false;
                                      return (
                                        <label key={i} className="flex items-start gap-2 text-[10px] cursor-pointer group">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => {
                                              const updated = loadTasks().map(t => {
                                                if (t.id !== task.id) return t;
                                                const checks = { ...(t.codeChecks || {}), [i]: !checked };
                                                return { ...t, codeChecks: checks };
                                              });
                                              saveTasks(updated);
                                              refreshTasks();
                                            }}
                                            className="accent-[#D4AF37] mt-0.5 cursor-pointer"
                                          />
                                          <span className={`leading-relaxed ${checked ? 'text-emerald-400/50 line-through' : 'text-yellow-400/70'}`}>{item}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Notes input */}
                                <div>
                                  <div className="text-[9px] text-[#A09E9A]/50 uppercase tracking-wider font-bold mb-1">Notes</div>
                                  <input
                                    type="text"
                                    placeholder="Add notes..."
                                    value={task.notes}
                                    onChange={e => {
                                      const updated = loadTasks().map(t => t.id === task.id ? { ...t, notes: e.target.value } : t);
                                      saveTasks(updated);
                                      refreshTasks();
                                    }}
                                    className="w-full bg-[#0A0A0F]/80 border border-[#D4AF37]/10 rounded-lg px-2 py-1.5 text-xs focus:border-[#D4AF37]/30 outline-none"
                                  />
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

        {activeTab === 'user-provision' && (
          <div className="bg-[#0F0A06]/30 border border-[#D4AF37]/5 rounded-2xl p-12 text-center">
            <UserPlus className="text-[#D4AF37]/30 w-10 h-10 mx-auto mb-3" />
            <p className="text-sm text-[#A09E9A]/40 italic">User Provision tools coming soon.</p>
          </div>
        )}

        {activeTab === 'user-management' && (
          <div className="bg-[#0F0A06]/30 border border-[#D4AF37]/5 rounded-2xl p-12 text-center">
            <Users className="text-[#D4AF37]/30 w-10 h-10 mx-auto mb-3" />
            <p className="text-sm text-[#A09E9A]/40 italic">User Management tools coming soon.</p>
          </div>
        )}
      </motion.div>

      {/* ── Rename Modal ── */}
      <AnimatePresence>
        {renameModal && (
          <RenameModal
            field={renameModal.field}
            allFields={analysis?.fields.map(f => f.name) || []}
            onConfirm={(target) => { queueRename(renameModal.field, target); setRenameModal(null); }}
            onClose={() => setRenameModal(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Merge Modal ── */}
      <AnimatePresence>
        {mergeModal && (
          <MergeModal
            field={mergeModal.field}
            allFields={analysis?.fields.map(f => f.name) || []}
            onConfirm={(target, strategy) => { queueMerge(mergeModal.field, target, strategy); setMergeModal(null); }}
            onClose={() => setMergeModal(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Change Type Modal ── */}
      <AnimatePresence>
        {changeTypeModal && (
          <ChangeTypeModal
            field={changeTypeModal.field}
            onConfirm={(conversion, delimiter) => { queueChangeType(changeTypeModal.field, conversion, delimiter); setChangeTypeModal(null); }}
            onClose={() => setChangeTypeModal(null)}
          />
        )}
      </AnimatePresence>

      {/* ── DocId Modal ── */}
      <AnimatePresence>
        {docIdModal && analysis && (
          <DocIdConfigModal
            fields={analysis.fields.map(f => f.name)}
            config={docIdConfig}
            onSave={(config) => {
              saveDocIdConfig(config, effectiveCollection);
              setDocIdConfig(config);
              setDocIdModal(false);
            }}
            onClose={() => setDocIdModal(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Summary Modal ── */}
      <AnimatePresence>
        {summaryModal && (
          <SummaryModal
            operations={summaryModal}
            collectionName={effectiveCollection}
            onConfirm={handleExecute}
            onClose={() => setSummaryModal(null)}
            isExecuting={isExecuting}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Rename Modal ─────────────────────────────────────────────────────────
const RenameModal: React.FC<{
  field: string;
  allFields: string[];
  onConfirm: (target: string) => void;
  onClose: () => void;
}> = ({ field, allFields, onConfirm, onClose }) => {
  const [target, setTarget] = useState('');
  const otherFields = allFields.filter(f => f !== field);

  return (
    <ModalShell onClose={onClose} title={`Rename "${field}"`}>
      <p className="text-xs text-[#A09E9A]/70 mb-3">Choose an existing field to rename into, or type a new name.</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {otherFields.map(f => (
          <button
            key={f}
            onClick={() => setTarget(f)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
              target === f
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                : 'border-[#D4AF37]/10 text-[#A09E9A]/60 hover:border-[#D4AF37]/30'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <input
        type="text"
        placeholder="Or type new field name..."
        value={target}
        onChange={e => setTarget(e.target.value)}
        className="w-full bg-[#0F0A06]/80 border border-[#D4AF37]/20 rounded-xl px-4 py-2.5 text-sm focus:border-[#D4AF37] outline-none text-[#F0EFE8] mb-4"
      />
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-[#D4AF37]/20 text-xs text-[#A09E9A] hover:bg-[#D4AF37]/5">Cancel</button>
        <button onClick={() => onConfirm(target)} disabled={!target.trim()} className="px-4 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold disabled:opacity-50">Rename</button>
      </div>
    </ModalShell>
  );
};

// ── Merge Modal ──────────────────────────────────────────────────────────
const MergeModal: React.FC<{
  field: string;
  allFields: string[];
  onConfirm: (target: string, strategy: 'overwrite' | 'concat') => void;
  onClose: () => void;
}> = ({ field, allFields, onConfirm, onClose }) => {
  const [target, setTarget] = useState('');
  const [strategy, setStrategy] = useState<'overwrite' | 'concat'>('concat');
  const otherFields = allFields.filter(f => f !== field);

  return (
    <ModalShell onClose={onClose} title={`Merge "${field}"`}>
      <p className="text-xs text-[#A09E9A]/70 mb-3">Merge this field into another target field.</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {otherFields.map(f => (
          <button
            key={f}
            onClick={() => setTarget(f)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
              target === f
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                : 'border-[#D4AF37]/10 text-[#A09E9A]/60 hover:border-[#D4AF37]/30'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="flex gap-3 mb-4">
        <label className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs cursor-pointer transition-all ${
          strategy === 'concat' ? 'bg-purple-500/20 border-purple-500/50' : 'border-[#D4AF37]/10'
        }`}>
          <input type="radio" name="strategy" checked={strategy === 'concat'} onChange={() => setStrategy('concat')} className="accent-purple-500" />
          Concatenate (merge arrays)
        </label>
        <label className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs cursor-pointer transition-all ${
          strategy === 'overwrite' ? 'bg-purple-500/20 border-purple-500/50' : 'border-[#D4AF37]/10'
        }`}>
          <input type="radio" name="strategy" checked={strategy === 'overwrite'} onChange={() => setStrategy('overwrite')} className="accent-purple-500" />
          Overwrite (replace target)
        </label>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-[#D4AF37]/20 text-xs text-[#A09E9A] hover:bg-[#D4AF37]/5">Cancel</button>
        <button onClick={() => onConfirm(target, strategy)} disabled={!target.trim()} className="px-4 py-2 rounded-xl bg-purple-500 text-white text-xs font-bold disabled:opacity-50">Merge</button>
      </div>
    </ModalShell>
  );
};

// ── Change Type Modal ────────────────────────────────────────────────────
const ChangeTypeModal: React.FC<{
  field: string;
  onConfirm: (conversion: string, delimiter?: string) => void;
  onClose: () => void;
}> = ({ field, onConfirm, onClose }) => {
  const [conversion, setConversion] = useState('to_string');
  const [delimiter, setDelimiter] = useState(',');
  const conversions = [
    { id: 'to_string', label: 'String', desc: 'Convert any value to string' },
    { id: 'to_number', label: 'Number', desc: 'Parse string/boolean to number (skip NaN)' },
    { id: 'string_to_array', label: 'String → Array', desc: 'Split string by delimiter into array' },
    { id: 'array_to_string', label: 'Array → String', desc: 'Join array elements with delimiter' },
  ];

  return (
    <ModalShell onClose={onClose} title={`Change Type: "${field}"`}>
      <p className="text-xs text-[#A09E9A]/70 mb-3">Select the target type for this field's values.</p>
      <div className="space-y-2 mb-4">
        {conversions.map(c => (
          <button
            key={c.id}
            onClick={() => setConversion(c.id)}
            className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-all ${
              conversion === c.id
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                : 'border-[#D4AF37]/10 text-[#A09E9A]/70 hover:border-[#D4AF37]/30'
            }`}
          >
            <div className="font-bold">{c.label}</div>
            <div className="text-[10px] opacity-60">{c.desc}</div>
          </button>
        ))}
      </div>
      {(conversion === 'string_to_array' || conversion === 'array_to_string') && (
        <div className="mb-4">
          <label className="text-[10px] text-[#A09E9A]/60 uppercase tracking-wider font-bold mb-1 block">Delimiter</label>
          <input
            type="text"
            value={delimiter}
            onChange={e => setDelimiter(e.target.value)}
            className="w-full bg-[#0F0A06]/80 border border-[#D4AF37]/20 rounded-xl px-4 py-2.5 text-sm focus:border-[#D4AF37] outline-none text-[#F0EFE8]"
          />
        </div>
      )}
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-[#D4AF37]/20 text-xs text-[#A09E9A] hover:bg-[#D4AF37]/5">Cancel</button>
        <button onClick={() => onConfirm(conversion, delimiter)} className="px-4 py-2 rounded-xl bg-cyan-500 text-white text-xs font-bold">Change Type</button>
      </div>
    </ModalShell>
  );
};

// ── DocId Config Modal ───────────────────────────────────────────────────
const DocIdConfigModal: React.FC<{
  fields: string[];
  config: DocIdConfig | null;
  onSave: (config: DocIdConfig) => void;
  onClose: () => void;
}> = ({ fields, config, onSave, onClose }) => {
  const [mode, setMode] = useState<'auto' | 'custom'>(config?.mode || 'auto');
  const [selectedFields, setSelectedFields] = useState<string[]>(config?.fields.map(f => f.fieldName) || []);
  const [fieldFormats, setFieldFormats] = useState<FieldFormat[]>(config?.fields || []);
  const [template, setTemplate] = useState(config?.template || '');

  const toggleField = (name: string) => {
    setSelectedFields(prev => {
      const exists = prev.includes(name);
      if (exists) {
        setFieldFormats(fmts => fmts.filter(f => f.fieldName !== name));
        return prev.filter(f => f !== name);
      }
      setFieldFormats(fmts => [...fmts, { fieldName: name, format: 'default' }]);
      return [...prev, name];
    });
  };

  const setFieldFormat = (name: string, format: string) => {
    setFieldFormats(prev => prev.map(f => f.fieldName === name ? { ...f, format } : f));
  };

  const availableFields = fields.filter(f => !selectedFields.includes(f));

  React.useEffect(() => {
    if (selectedFields.length > 0 && !template) {
      setTemplate(selectedFields.map(f => `{${f}}`).join('-'));
    }
  }, [selectedFields, template]);

  const preview = React.useMemo(() => {
    if (mode === 'auto') return '[auto-generated ID]';
    let result = template;
    fieldFormats.forEach(f => {
      const placeholder = `{${f.fieldName}}`;
      if (f.format && f.format !== 'default') {
        const sample = `${f.fieldName}_${f.format}`;
        result = result.replace(placeholder, sample);
      } else {
        result = result.replace(placeholder, `{${f.fieldName}}`);
      }
    });
    return result || '[empty template]';
  }, [mode, template, fieldFormats]);

  const dateFormats = ['default', 'MMM DD, YYYY', 'MMM DD', 'DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YY'];

  return (
    <ModalShell onClose={onClose} title="Document ID Configuration">
      <div className="space-y-4 text-xs">
        {/* Mode selector */}
        <div>
          <label className="text-[10px] text-[#A09E9A]/60 uppercase tracking-wider font-bold mb-2 block">ID Mode</label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('auto')}
              className={`flex-1 px-3 py-2 rounded-xl border text-center transition-all ${
                mode === 'auto' ? 'bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37]' : 'border-[#D4AF37]/10 text-[#A09E9A]/60 hover:border-[#D4AF37]/30'
              }`}
            >
              <div className="font-bold text-[11px]">Auto ID</div>
              <div className="text-[9px] opacity-60 mt-0.5">Firestore generated</div>
            </button>
            <button
              onClick={() => setMode('custom')}
              className={`flex-1 px-3 py-2 rounded-xl border text-center transition-all ${
                mode === 'custom' ? 'bg-[#D4AF37]/20 border-[#D4AF37]/50 text-[#D4AF37]' : 'border-[#D4AF37]/10 text-[#A09E9A]/60 hover:border-[#D4AF37]/30'
              }`}
            >
              <div className="font-bold text-[11px]">Custom ID</div>
              <div className="text-[9px] opacity-60 mt-0.5">Build from fields</div>
            </button>
          </div>
        </div>

        {mode === 'custom' && (
          <>
            {/* Field selector */}
            <div>
              <label className="text-[10px] text-[#A09E9A]/60 uppercase tracking-wider font-bold mb-2 block">
                Selected Fields ({selectedFields.length})
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedFields.map(f => (
                  <button
                    key={f}
                    onClick={() => toggleField(f)}
                    className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[9px] font-bold"
                  >
                    {f} ✕
                  </button>
                ))}
              </div>
              {availableFields.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {availableFields.map(f => (
                    <button
                      key={f}
                      onClick={() => toggleField(f)}
                      className="px-2 py-1 rounded-lg border border-[#D4AF37]/10 text-[#A09E9A]/60 text-[9px] font-bold hover:border-[#D4AF37]/30 hover:text-[#D4AF37]"
                    >
                      + {f}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Template builder */}
            <div>
              <label className="text-[10px] text-[#A09E9A]/60 uppercase tracking-wider font-bold mb-2 block">ID Format</label>
              <div className="relative">
                <input
                  type="text"
                  value={template}
                  onChange={e => setTemplate(e.target.value)}
                  className="w-full bg-[#0F0A06]/80 border border-[#D4AF37]/20 rounded-xl px-4 py-2.5 text-sm font-mono focus:border-[#D4AF37] outline-none text-[#F0EFE8]"
                  placeholder="{field1}-{field2}"
                />
                <div className="text-[9px] text-[#A09E9A]/40 mt-1">Use {'{field_name}'} as placeholders</div>
              </div>
            </div>

            {/* Field format options */}
            {selectedFields.length > 0 && (
              <div>
                <label className="text-[10px] text-[#A09E9A]/60 uppercase tracking-wider font-bold mb-2 block">Field Formatting</label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {fieldFormats.map(f => (
                    <div key={f.fieldName} className="flex items-center gap-2 bg-[#0F0A06]/40 rounded-xl px-3 py-2 border border-[#D4AF37]/5">
                      <span className="text-[10px] font-bold text-[#F0EFE8] min-w-[80px]">{f.fieldName}</span>
                      <select
                        value={f.format}
                        onChange={e => setFieldFormat(f.fieldName, e.target.value)}
                        className="flex-1 bg-[#0A0A0F]/80 border border-[#D4AF37]/10 rounded-lg px-2 py-1 text-[10px] focus:border-[#D4AF37] outline-none text-[#F0EFE8]"
                      >
                        {dateFormats.map(df => (
                          <option key={df} value={df}>{df}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <div className="text-[9px] text-cyan-400/70 uppercase tracking-wider font-bold mb-1">Preview</div>
              <div className="text-sm font-mono text-cyan-300">{preview}</div>
            </div>
          </>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-[#D4AF37]/20 text-xs text-[#A09E9A] hover:bg-[#D4AF37]/5">Cancel</button>
          <button onClick={() => onSave({
            mode,
            fields: fieldFormats,
            template: mode === 'auto' ? '' : template,
          })} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-[#0A0A0F] text-xs font-black">Save Config</button>
        </div>
      </div>
    </ModalShell>
  );
};

// ── Summary Modal ────────────────────────────────────────────────────────
const SummaryModal: React.FC<{
  operations: { type: string; sourceField: string; targetField?: string; mergeStrategy?: string; conversion?: string; delimiter?: string }[];
  collectionName: string;
  onConfirm: () => void;
  onClose: () => void;
  isExecuting: boolean;
}> = ({ operations, collectionName, onConfirm, onClose, isExecuting }) => {
  const codeChanges = generateCodeChanges({ collectionName, operations });
  const affectedFrontend = operations.filter(o => o.type === 'rename' || o.type === 'merge').map(o => o.sourceField);

  return (
    <ModalShell onClose={onClose} title="Review Changes">
      <div className="space-y-3 text-xs">
        <div className="p-3 rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/10">
          <div className="text-[#D4AF37] font-bold mb-1">Collection</div>
          <div className="text-[#F0EFE8]">{collectionName}</div>
        </div>

        <div className="p-3 rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/10">
          <div className="text-[#D4AF37] font-bold mb-1">Operations ({operations.length})</div>
          <div className="space-y-1">
            {operations.map((op, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className={`font-bold uppercase ${
                  op.type === 'delete' ? 'text-red-400' : op.type === 'rename' ? 'text-blue-400' : op.type === 'merge' ? 'text-purple-400' : 'text-cyan-400'
                }`}>{op.type === 'change_type' ? `change_type → ${op.conversion || ''}` : op.type}</span>
                <span className="text-[#A09E9A]">{op.sourceField}</span>
                {op.targetField && <><ArrowRight size={10} className="text-[#A09E9A]" /><span>{op.targetField}</span></>}
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400/80">
          <div className="flex items-center gap-2 font-bold mb-1">
            <Info size={12} /> Code Changes Required
          </div>
          <div className="space-y-1">
            {codeChanges.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-[10px] leading-relaxed">
                <span className="text-yellow-400/60 mt-0.5">•</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} disabled={isExecuting} className="px-4 py-2 rounded-xl border border-[#D4AF37]/20 text-xs text-[#A09E9A] hover:bg-[#D4AF37]/5">Cancel</button>
          <button onClick={onConfirm} disabled={isExecuting} className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-[#0A0A0F] text-xs font-black disabled:opacity-50 flex items-center gap-2">
            {isExecuting ? <><Loader2 size={12} className="animate-spin" /> Executing...</> : 'Confirm & Execute'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

// ── Modal Shell ──────────────────────────────────────────────────────────
const ModalShell: React.FC<{ children: React.ReactNode; onClose: () => void; title: string }> = ({ children, onClose, title }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      className="bg-[#1A140A] border border-[#D4AF37]/30 rounded-2xl p-5 w-full max-w-lg shadow-[0_0_40px_rgba(212,175,55,0.15)] max-h-[90vh] overflow-y-auto"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-black uppercase tracking-[0.15em] text-[#D4AF37]">{title}</h2>
        <button onClick={onClose} className="p-1 hover:bg-[#D4AF37]/10 rounded-lg text-[#A09E9A]/50 hover:text-[#F0EFE8]">
          <X size={16} />
        </button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);

// ── Code changes generator ───────────────────────────────────────────────
function generateCodeChanges(task: { collectionName: string; operations: { type: string; sourceField: string; targetField?: string; conversion?: string }[] }): string[] {
  const parts: string[] = [];
  const renamed = task.operations.filter(o => o.type === 'rename');
  const merged = task.operations.filter(o => o.type === 'merge');
  const deleted = task.operations.filter(o => o.type === 'delete');
  const typeChanged = task.operations.filter(o => o.type === 'change_type');

  if (renamed.length > 0) {
    parts.push(`Frontend: Update all reads of ${renamed.map(o => `"${o.sourceField}"`).join(', ')} to "${renamed[0].targetField}" in components, queries, and the CalendarEvent type.`);
    parts.push(`Queries: Update Firestore where() clauses using old field names.`);
  }
  if (merged.length > 0) {
    parts.push(`Frontend: Remove references to ${merged.map(o => `"${o.sourceField}"`).join(', ')} — data now lives in ${merged[0].targetField}.`);
    parts.push(`Normalization: Simplify firebaseService.ts normalization to only read "${merged[0].targetField}".`);
  }
  if (deleted.length > 0) {
    parts.push(`Frontend: Remove all references to deleted fields: ${deleted.map(o => `"${o.sourceField}"`).join(', ')}.`);
    parts.push(`Types: Remove optional alias fields from CalendarEvent type in types.ts.`);
  }
  if (typeChanged.length > 0) {
    parts.push(`Frontend: Update type usage for ${typeChanged.map(o => `"${o.sourceField}" (→ ${o.conversion})`).join(', ')}. Ensure reads and writes use the new type.`);
    parts.push(`Normalization: Update firebaseService.ts normalization to cast "${typeChanged.map(o => o.sourceField).join('", "')}".`);
  }
  if (parts.length === 0) parts.push('No code changes needed for these operations.');

  return parts;
}

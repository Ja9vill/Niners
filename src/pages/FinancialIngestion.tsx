import React, { useState, useEffect, useMemo } from 'react';
import { Upload, Database, Users, ChevronRight, ChevronDown, Edit3, Trash2, Loader2, CheckCircle2, AlertCircle, FileText, Plus, X, Save } from 'lucide-react';
import { Storage } from '../lib/storage';
import { IngestionService, ParsedCSVRow, PreviewRow, UploadHistoryNode, ProvisionRow } from '../lib/IngestionService';
import { cn } from '../lib/utils';

type ReportType = 'Monthly' | 'Weekly' | 'Daily';

export const FinancialIngestion = () => {
  const auth = Storage.getAuthState();
  const loggedInRole = (auth?.role || '').toLowerCase();
  const isDirector = loggedInRole === 'director';
  const isAgent = loggedInRole === 'agent';

  // Agent selection
  const [agentId, setAgentId] = useState(isAgent ? auth?.poppo_id || '' : '');
  const [agentList, setAgentList] = useState<{ poppo_id: string; nickname: string }[]>([]);
  const [selectedAgentNickname, setSelectedAgentNickname] = useState('');

  // Report period
  const [reportType, setReportType] = useState<ReportType>('Daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // CSV
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedCSVRow[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [provisionRows, setProvisionRows] = useState<ProvisionRow[]>([]);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // History
  const [historyTree, setHistoryTree] = useState<UploadHistoryNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedReport, setSelectedReport] = useState<{ docId: string; data: any } | null>(null);
  const [editingReport, setEditingReport] = useState<any>(null);

  // Migration
  const [migrationDone, setMigrationDone] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');

  // Load agents on mount
  useEffect(() => {
    if (isDirector) {
      IngestionService.getAgentList().then(setAgentList);
    }
    // Run migration once
    if (!migrationDone) {
      IngestionService.migrateLegacyData().then(count => {
        if (count > 0) console.log(`[Ingestion] Migrated ${count} legacy records`);
        setMigrationDone(true);
      });
    }
  }, []);

  // Refresh history when agentId changes
  useEffect(() => {
    if (agentId) {
      refreshHistory();
    }
  }, [agentId]);

  const refreshHistory = async () => {
    if (!agentId) return;
    const tree = await IngestionService.getUploadHistory(agentId, loggedInRole, auth?.poppo_id || '');
    setHistoryTree(tree);
  };

  // Parse CSV
  const handleParseCSV = async () => {
    if (!csvText.trim()) return;
    const rows = IngestionService.parseCSV(csvText);
    setParsedRows(rows);
    const preview = await IngestionService.buildPreview(rows);
    setPreviewRows(preview);
    // Build provision rows from unmatched
    const unmatched: ProvisionRow[] = [];
    for (const p of preview) {
      if (!p.matched) {
        unmatched.push({ poppo_id: p.poppo_id, nickname: p.csvNickname, role: 'Host' });
      }
    }
    setProvisionRows(unmatched);
  };

  // Update provision row field
  const updateProvisionRow = (idx: number, field: keyof ProvisionRow, value: string) => {
    setProvisionRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  // Upload all parsed rows
  const handleUpload = async () => {
    if (!agentId || parsedRows.length === 0) return;
    setIsUploading(true);
    setUploadMsg(null);
    try {
      const { fromDate, toDate } = getDateRange();
      const loggedInName = auth?.name || auth?.nickname || auth?.poppo_id || 'Unknown';
      let successCount = 0;
      for (const row of parsedRows) {
        await IngestionService.saveReport(row, agentId, reportType, fromDate, toDate, loggedInName);
        successCount++;
      }
      setUploadMsg({ type: 'success', text: `Successfully uploaded ${successCount} record(s).` });
      setCsvText('');
      setParsedRows([]);
      setPreviewRows([]);
      setProvisionRows([]);
      await refreshHistory();
    } catch (err: any) {
      setUploadMsg({ type: 'error', text: err?.message || 'Upload failed.' });
    } finally {
      setIsUploading(false);
    }
  };

  const getDateRange = (): { fromDate: string; toDate: string } => {
    if (reportType === 'Daily') {
      return { fromDate: selectedDate, toDate: selectedDate };
    }
    const year = parseInt(selectedMonth.slice(0, 4));
    const month = parseInt(selectedMonth.slice(5, 7));
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const fmt = (d: Date) => {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${mm}-${dd}`;
    };
    return { fromDate: fmt(firstDay), toDate: fmt(lastDay) };
  };

  // Toggle history node expansion
  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderHistoryTree = (nodes: UploadHistoryNode[], depth = 0) => {
    return nodes.map(node => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedNodes.has(node.id);
      return (
        <div key={node.id}>
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-all text-xs",
              node.data ? "text-[#A09E9A] hover:text-[#F0EFE8] hover:bg-white/5" : "text-[#F0EFE8] font-semibold",
              selectedReport?.docId === node.id && "bg-indigo-500/10 text-indigo-400"
            )}
            style={{ paddingLeft: `${12 + depth * 20}px` }}
            onClick={() => {
              if (hasChildren) toggleNode(node.id);
              if (node.data) {
                const docId = node.id;
                setSelectedReport({ docId, data: node.data });
              }
            }}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
            ) : (
              <FileText size={12} />
            )}
            <span>{node.label}</span>
          </div>
          {hasChildren && isExpanded && renderHistoryTree(node.children, depth + 1)}
        </div>
      );
    });
  };

  // Delete report
  const handleDeleteReport = async (docId: string) => {
    if (!confirm('Delete this report entry?')) return;
    try {
      await IngestionService.deleteReport(docId);
      setSelectedReport(null);
      await refreshHistory();
    } catch (err) {
      alert('Failed to delete.');
    }
  };

  // Update report
  const handleUpdateReport = async () => {
    if (!editingReport) return;
    try {
      await IngestionService.updateReport(editingReport.docId, editingReport.data);
      setEditingReport(null);
      setSelectedReport(null);
      await refreshHistory();
    } catch (err) {
      alert('Failed to update.');
    }
  };

  // Provision action
  const handleProvision = async (row: ProvisionRow, action: 'add_now' | 'add_later') => {
    try {
      const loggedInName = auth?.name || auth?.nickname || auth?.poppo_id || 'Unknown';
      await IngestionService.provisionUser(row, loggedInRole, loggedInName, agentId, action);
      alert(`Provision request sent for ${row.nickname} (${action === 'add_now' ? 'Added Now' : 'Add Later'})`);
    } catch (err: any) {
      alert(`Provision failed: ${err?.message}`);
    }
  };

  if (!isDirector && !isAgent) {
    return (
      <div className="p-12 text-center">
        <AlertCircle size={48} className="mx-auto text-[#A09E9A] mb-4" />
        <h2 className="text-xl font-black text-[#A09E9A]">Access Restricted</h2>
        <p className="text-sm text-[#A09E9A]/60 mt-2">Only Agents and Directors can access the Financial Ingestion page.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Database size={24} className="text-indigo-400" />
        <h1 className="text-2xl font-black text-white uppercase tracking-widest">Financial Ingestion</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 pb-2">
        <button onClick={() => setActiveTab('upload')} className={cn("text-xs font-black uppercase tracking-widest pb-2 -mb-2 transition-all", activeTab === 'upload' ? "text-indigo-400 border-b-2 border-indigo-400" : "text-[#A09E9A] hover:text-white")}>
          <Upload size={14} className="inline mr-1" /> Upload Data
        </button>
        <button onClick={() => setActiveTab('history')} className={cn("text-xs font-black uppercase tracking-widest pb-2 -mb-2 transition-all", activeTab === 'history' ? "text-indigo-400 border-b-2 border-indigo-400" : "text-[#A09E9A] hover:text-white")}>
          <FileText size={14} className="inline mr-1" /> Upload History
        </button>
      </div>

      {activeTab === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: controls + CSV */}
          <div className="lg:col-span-2 space-y-6">
            {/* Agent Selection */}
            <div className="bg-[#1A1A28]/60 border border-white/5 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8]">Agent Assignment</h3>
              {isAgent ? (
                <div className="text-sm text-[#A09E9A]">
                  Agent: <span className="text-[#F0EFE8] font-semibold">{auth?.nickname || auth?.poppo_id}</span>
                  <div className="text-[10px] text-[#6B7280] mt-1">Auto-assigned to your agent ID</div>
                </div>
              ) : (
                <select
                  value={agentId}
                  onChange={(e) => {
                    const selected = agentList.find(a => a.poppo_id === e.target.value);
                    setAgentId(e.target.value);
                    setSelectedAgentNickname(selected?.nickname || '');
                  }}
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Select Agent --</option>
                  {agentList.map(a => (
                    <option key={a.poppo_id} value={a.poppo_id}>{a.nickname} - {a.poppo_id}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Period Selection */}
            <div className="bg-[#1A1A28]/60 border border-white/5 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8]">Period</h3>
              <div className="flex gap-3">
                {(['Daily', 'Weekly', 'Monthly'] as ReportType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setReportType(t)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                      reportType === t ? "bg-indigo-600 text-white" : "bg-[#0D0D14] text-[#A09E9A] hover:text-white border border-white/10"
                    )}
                  >{t}</button>
                ))}
              </div>
              {reportType === 'Daily' ? (
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500" />
              ) : (
                <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500" />
              )}
            </div>

            {/* CSV Input */}
            <div className="bg-[#1A1A28]/60 border border-white/5 p-5 rounded-2xl space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8]">CSV Data</h3>
              <p className="text-[10px] text-[#6B7280]">Paste CSV data (headers in row 2, data from row 3)</p>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={10}
                placeholder="Paste CSV here..."
                className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] font-mono focus:outline-none focus:border-indigo-500 resize-y"
              />
              <div className="flex gap-2">
                <button onClick={handleParseCSV} disabled={!csvText.trim() || !agentId}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/30 disabled:text-white/30 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all">
                  Parse & Preview
                </button>
                <button onClick={handleUpload} disabled={parsedRows.length === 0 || isUploading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/30 disabled:text-white/30 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2">
                  {isUploading && <Loader2 size={14} className="animate-spin" />}
                  Upload {parsedRows.length > 0 ? `(${parsedRows.length})` : ''}
                </button>
              </div>
              {uploadMsg && (
                <div className={cn("flex items-center gap-2 text-xs font-semibold", uploadMsg.type === 'success' ? "text-emerald-400" : "text-red-400")}>
                  {uploadMsg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  {uploadMsg.text}
                </div>
              )}
            </div>
          </div>

          {/* Right column: Preview & Provision */}
          <div className="space-y-6">
            {/* Preview Table */}
            {previewRows.length > 0 && (
              <div className="bg-[#1A1A28]/60 border border-white/5 p-4 rounded-2xl space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8]">Preview ({previewRows.length} rows)</h3>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {previewRows.map((pr, i) => (
                    <div key={i} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs", pr.matched ? "bg-emerald-500/5" : "bg-amber-500/5")}>
                      <span className={cn("w-2 h-2 rounded-full shrink-0", pr.matched ? "bg-emerald-500" : "bg-amber-500")} />
                      <span className="font-mono text-[#A09E9A]">{pr.poppo_id}</span>
                      <span className="text-[#F0EFE8]">{pr.csvNickname}</span>
                      {pr.matched ? (
                        <span className="text-emerald-400 text-[10px] ml-auto">Matched</span>
                      ) : (
                        <span className="text-amber-400 text-[10px] ml-auto">Unmatched</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Provision Block */}
            {provisionRows.length > 0 && (
              <div className="bg-[#1A1A28]/60 border border-amber-500/20 p-4 rounded-2xl space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-amber-400">Provision Needed ({provisionRows.length})</h3>
                <p className="text-[10px] text-[#6B7280]">These Poppo IDs were not found in the users collection.</p>
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {provisionRows.map((pr, i) => (
                    <div key={i} className="bg-[#0D0D14] border border-white/5 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[#A09E9A]">{pr.poppo_id}</span>
                        <input
                          value={pr.nickname}
                          onChange={(e) => updateProvisionRow(i, 'nickname', e.target.value)}
                          className="flex-1 bg-transparent border-b border-white/10 text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500 px-1"
                          placeholder="Nickname"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={pr.role}
                          onChange={(e) => updateProvisionRow(i, 'role', e.target.value as any)}
                          className="bg-[#0D0D14] border border-white/10 rounded-lg px-2 py-1 text-xs text-[#F0EFE8] focus:outline-none"
                        >
                          <option value="Host">Host</option>
                          <option value="Manager">Manager</option>
                          <option value="Admin">Admin</option>
                        </select>
                        {isDirector && (
                          <button onClick={() => handleProvision(pr, 'add_now')}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all">
                            Add User
                          </button>
                        )}
                        <button onClick={() => handleProvision(pr, 'add_later')}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all">
                          Add Later
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* UPLOAD HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tree */}
          <div className="bg-[#1A1A28]/60 border border-white/5 p-4 rounded-2xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8] mb-4">Financial Reports</h3>
            <div className="space-y-0.5 max-h-[70vh] overflow-y-auto">
              {historyTree.length === 0 && (
                <p className="text-xs text-[#6B7280] italic">No uploads found for this agent.</p>
              )}
              {renderHistoryTree(historyTree)}
            </div>
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-2">
            {selectedReport ? (
              <div className="bg-[#1A1A28]/60 border border-white/5 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8]">Report Details</h3>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingReport(selectedReport)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1">
                      <Edit3 size={12} /> Edit
                    </button>
                    <button onClick={() => handleDeleteReport(selectedReport.docId)}
                      className="px-3 py-1.5 bg-red-600/50 hover:bg-red-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  {Object.entries(selectedReport.data).filter(([k]) => !k.startsWith('_')).map(([key, val]) => (
                    <div key={key} className="bg-[#0D0D14] rounded-lg px-3 py-2">
                      <div className="text-[#6B7280] text-[10px] uppercase tracking-wider">{key}</div>
                      <div className="text-[#F0EFE8] font-mono mt-0.5">{String(val)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-[#1A1A28]/60 border border-white/5 p-5 rounded-2xl flex flex-col items-center justify-center h-64 text-center">
                <FileText size={40} className="text-[#A09E9A]/30 mb-3" />
                <p className="text-sm text-[#6B7280]">Select an upload from the tree to view details</p>
              </div>
            )}

            {/* Edit Modal */}
            {editingReport && (
              <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <div className="bg-[#1A1A28] border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#F0EFE8]">Edit Report</h3>
                    <button onClick={() => setEditingReport(null)}><X size={18} className="text-[#A09E9A] hover:text-white" /></button>
                  </div>
                  {Object.entries(editingReport.data).filter(([k]) => !['created_at', 'updated_at', 'type'].includes(k)).map(([key, val]) => (
                    <div key={key}>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">{key}</label>
                      <input
                        value={String(val ?? '')}
                        onChange={(e) => setEditingReport((prev: any) => ({
                          ...prev,
                          data: { ...prev.data, [key]: e.target.value }
                        }))}
                        className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] focus:outline-none focus:border-indigo-500 mt-1"
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleUpdateReport}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2">
                      <Save size={14} /> Save
                    </button>
                    <button onClick={() => setEditingReport(null)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[#A09E9A] rounded-xl text-xs font-bold uppercase tracking-wider transition-all">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

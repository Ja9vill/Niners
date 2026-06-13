import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, Trash2, CheckCircle2, AlertCircle, Loader2, Lock } from 'lucide-react';
import { FirebaseService } from '../lib/firebaseService';
import { CommissionEntry } from '../types';
import { Storage } from '../lib/storage';
import { cn } from '../lib/utils';

export const FinancialData = ({ isAgentMode = false }: { isAgentMode?: boolean }) => {
  const [localAuth, setLocalAuth] = useState(Storage.getAuthState());
  const [commissions, setCommissions] = useState<CommissionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [financialTab, setFinancialTab] = useState<'monthly' | 'weekly'>('monthly');
  const [monthlyLedger, setMonthlyLedger] = useState<CommissionEntry[]>([]);
  const [weeklyLedger, setWeeklyLedger] = useState<CommissionEntry[]>([]);
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});

  const [pasteData, setPasteData] = useState('');
  const [agentOverride, setAgentOverride] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [bulkEditField, setBulkEditField] = useState('agent_commission');
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [hosts, setHosts] = useState<any[]>([]);

  const loadData = async () => {
    try {
      let c: CommissionEntry[] = [];
      if (isAgentMode) {
        const [monthly, weekly] = await Promise.all([
          FirebaseService.getAgentCommissions(localAuth.poppo_id, false),
          FirebaseService.getAgentCommissions(localAuth.poppo_id, true)
        ]);
        c = [...monthly, ...weekly];
      } else {
        c = await FirebaseService.getAllCommissions();
      }
      setCommissions(c);
      setMonthlyLedger(c.filter(entry => entry.month));
      setWeeklyLedger(c.filter(entry => entry.from_date && entry.to_date));
    } catch (err) {
      setErrorMessage("Failed to load financial data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    FirebaseService.getAllHosts().then(setHosts).catch(console.error);
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const handleCellChange = (idx: number, field: string, val: any) => {
    if (financialTab === 'monthly') {
      const updated = [...monthlyLedger];
      updated[idx] = { ...updated[idx], [field]: val };
      setMonthlyLedger(updated);
    } else {
      const updated = [...weeklyLedger];
      updated[idx] = { ...updated[idx], [field]: val };
      setWeeklyLedger(updated);
    }
  };

  const handleAddRow = () => {
    const newEntry: CommissionEntry = {
      poppo_id: '',
      nickname: '',
      month: financialTab === 'monthly' ? '' : '',
      year: new Date().getFullYear(),
      from_date: financialTab === 'weekly' ? '' : undefined,
      to_date: financialTab === 'weekly' ? '' : undefined,
      level: 0,
      live_duration: 0,
      party_host_duration: 0,
      total_earnings: 0,
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
      agentweb_commission_rate: 0,
    };
    if (financialTab === 'monthly') setMonthlyLedger([newEntry, ...monthlyLedger]);
    else setWeeklyLedger([newEntry, ...weeklyLedger]);
  };

  const handleDeleteSelection = async () => {
    const isMonthly = financialTab === 'monthly';
    const currentData = isMonthly ? monthlyLedger : weeklyLedger;
    const itemsToDelete = currentData.filter((_, idx) => selectedRows[`${financialTab}_${idx}`]);
    
    if (!confirm(`Delete ${itemsToDelete.length} selected row(s)?`)) return;

    try {
      for (const item of itemsToDelete) {
        if (item.poppo_id && (item.month || (item.from_date && item.to_date))) {
          if (isAgentMode) {
            await FirebaseService.deleteAgentCommission(item.poppo_id, item.month || `${item.from_date}_${item.to_date}`, localAuth.poppo_id, financialTab === 'weekly');
          } else {
            await FirebaseService.deleteCommission(item.poppo_id, item.month || `${item.from_date}_${item.to_date}`);
          }
        }
      }
      setSelectedRows({});
      showSuccess(`Deleted ${itemsToDelete.length} entries.`);
      loadData();
    } catch (err) {
      setErrorMessage('Failed to delete some entries.');
    }
  };

  const handleSaveGrid = async () => {
    try {
      const dataToSave = financialTab === 'monthly' ? monthlyLedger : weeklyLedger;
      const validData = dataToSave.filter(d => d.poppo_id && (d.month || d.from_date));
      if (validData.length > 0) {
        if (isAgentMode) {
          await FirebaseService.saveAgentCommissions(validData, localAuth.poppo_id, financialTab === 'weekly');
        } else {
          await FirebaseService.saveCommissions(validData, 'Admin', financialTab === 'weekly');
        }
        showSuccess(`Saved ${validData.length} records successfully.`);
      }
    } catch (err) {
      setErrorMessage('Failed to save grid changes.');
    }
  };

  const parseAndLoadTabularData = async (dataString: string) => {
    if (!dataString.trim()) return;
    setIsLoading(true);
    try {
      let rows = dataString.trim().split('\n').filter(line => line.trim() !== '').map(line => line.split('\t'));
      
      if (rows.length === 0) return;

      // Check if the first row is the "My Commission" row (Agent format)
      if (rows[0][0] && rows[0][0].toLowerCase().includes('my commission')) {
        rows = rows.slice(1);
      }

      if (rows.length === 0) return;

      const headerRow = rows[0].map(h => h.toLowerCase().trim());
      const hasHeaders = headerRow.some(h => h.includes('poppo') || h.includes('id') || h.includes('month') || h.includes('nickname') || h.includes('earnings'));
      
      let startIdx = hasHeaders ? 1 : 0;
      
      const colMap: Record<string, number> = {};
      if (hasHeaders) {
        headerRow.forEach((h, idx) => {
          if (h === 'poppo id' || h === 'id' || h === 'poppoid') colMap['poppoId'] = idx;
          else if (h.includes('nickname') || h.includes('name')) colMap['nickname'] = idx;
          else if (h === 'month' || h.includes('from date') || h.includes('start') || h === 'date') colMap['month'] = idx;
          else if (h === 'year' || h.includes('to date') || h.includes('end')) colMap['year'] = idx;
          else if (h.includes('live duration')) colMap['live_duration'] = idx;
          else if (h.includes('party host duration') || h.includes('party duration') || h.includes('party live duration')) colMap['party_host_duration'] = idx;
          else if (h.includes('total earnings of points') || h.includes('total points') || h === 'points') colMap['total_earnings'] = idx;
          else if (h.includes('agent commission') || h.includes('agentweb_commission_earning')) colMap['agent_commission'] = idx;
          else if (h === 'live earnings') colMap['live_earnings'] = idx;
          else if (h === 'party earnings') colMap['party_earnings'] = idx;
          else if (h.includes('private chat')) colMap['private_chat'] = idx;
          else if (h === 'tips') colMap['tips'] = idx;
          else if (h.includes('platform reward')) colMap['platform_reward'] = idx;
          else if (h.includes('other earnings')) colMap['other_earnings'] = idx;
          else if (h.includes('hourly salary')) colMap['platform_hourly_salary'] = idx;
          else if (h.includes('super salary')) colMap['super_salary'] = idx;
          else if (h.includes('super rank')) colMap['super_rank'] = idx;
          else if (h === 'level') colMap['level'] = idx;
        });
      }

      const cleanNum = (val: string) => parseInt(val?.replace(/,/g, '')) || 0;
      const cleanFloat = (val: string) => parseFloat(val?.replace(/,/g, '')) || 0;

      const parsedCommissions: CommissionEntry[] = [];
      
      for (let i = startIdx; i < rows.length; i++) {
        const cols = rows[i];
        if (cols.length < 2) continue;
        
        const getVal = (colName: string, fallbackIdx: number) => {
          if (colMap[colName] !== undefined) return cols[colMap[colName]];
          return cols[fallbackIdx];
        };

        const poppoId = getVal('poppoId', 0)?.trim() || '';
        if (!poppoId) continue;
        
        const matchingHost = hosts.find(h => String(h.id).trim() === poppoId);
        const rawNickname = getVal('nickname', 1)?.trim() || '';
        const nickname = matchingHost ? (matchingHost.nickname || matchingHost.name) : (rawNickname || 'Unknown');

        let parsedYear = new Date().getFullYear();
        let parsedMonth = '';
        const rawMonth = getVal('month', 2)?.trim() || '';
        const rawYear = getVal('year', 3)?.trim() || '';

        if (rawYear && /^\d{4}$/.test(rawYear)) {
           parsedYear = parseInt(rawYear);
           parsedMonth = rawMonth;
        } else if (rawMonth && !rawYear) {
           const d = new Date(rawMonth);
           if (!isNaN(d.getTime())) {
             parsedYear = d.getFullYear();
             parsedMonth = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
           } else {
             const match4 = rawMonth.match(/\b(20\d{2})\b/);
             if (match4) parsedYear = parseInt(match4[1]);
             parsedMonth = rawMonth;
           }
        } else if (rawYear) {
           parsedYear = parseInt(rawYear) || parsedYear;
           parsedMonth = rawMonth;
        } else {
           const [sYear, sMonth] = selectedMonth.split('-');
           parsedYear = parseInt(sYear);
           parsedMonth = selectedMonth;
        }

        parsedCommissions.push({
          poppo_id: poppoId,
          nickname: nickname,
          month: parsedMonth,
          year: parsedYear,
          from_date: rawMonth,
          to_date: rawYear,
          level: cleanNum(getVal('level', 17)),
          live_duration: cleanFloat(getVal('live_duration', 4)),
          party_host_duration: cleanFloat(getVal('party_host_duration', 5)),
          total_earnings: cleanNum(getVal('total_earnings', 6)),
          agent_commission: cleanNum(getVal('agent_commission', 7)),
          live_earnings: cleanNum(getVal('live_earnings', 8)),
          party_earnings: cleanNum(getVal('party_earnings', 9)),
          private_chat: cleanNum(getVal('private_chat', 10)),
          tips: cleanNum(getVal('tips', 11)),
          platform_reward: cleanNum(getVal('platform_reward', 12)),
          other_earnings: cleanNum(getVal('other_earnings', 13)),
          platform_hourly_salary: cleanNum(getVal('platform_hourly_salary', 14)),
          super_salary: cleanNum(getVal('super_salary', 15)),
          super_rank: cleanNum(getVal('super_rank', 16)),
          agentweb_commission_rate: 0,
          total_points: cleanNum(getVal('total_earnings', 6)),
          owner_id: agentOverride || localAuth.poppo_id || 'system',
          owner_role: agentOverride ? 'Agent' : (localAuth.role === 'Director' || localAuth.role === 'Head Admin' ? 'Director' : 'Agent'),
          report_type: financialTab
        });
      }
      
      if (parsedCommissions.length > 0) {
        if (financialTab === 'monthly') {
           setMonthlyLedger([...parsedCommissions, ...monthlyLedger]);
        } else {
           setWeeklyLedger([...parsedCommissions, ...weeklyLedger]);
        }
        showSuccess(`Imported ${parsedCommissions.length} rows locally. Click "Save Changes" to upload.`);
        setPasteData('');
      }
    } catch (err) {
      setErrorMessage('Failed to parse tabular data.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabularImport = () => {
    parseAndLoadTabularData(pasteData);
  };

  const handleGoogleSheetSync = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://script.google.com/macros/s/AKfycbwHT8K4fH6PL7-DIr-C4KSYyxulXxIJCmrfJKNg3gRLY8YMoBzKC4yMx9IT7DOEY7L3NQ/exec');
      const json = await response.json();
      
      if (json.status === 'success' && json.data && json.data.length > 0) {
        // Extract headers from the first object
        const headers = Object.keys(json.data[0]);
        // Convert array of JSON objects to TSV format matching the copy/paste structure
        const rows = json.data.map((row: any) => headers.map(h => String(row[h] || '').replace(/\t/g, ' ')).join('\t'));
        const tabularString = [headers.join('\t'), ...rows].join('\n');
        
        await parseAndLoadTabularData(tabularString);
        showSuccess(`Successfully synced ${json.data.length} records from Google Sheets!`);
      } else {
        setErrorMessage(json.message || "No data found in Google Sheet or failed to fetch.");
      }
    } catch (err) {
      setErrorMessage("Error connecting to Google Script.");
      console.error("Google Script Sync Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkEdit = () => {
    const isMonthly = financialTab === 'monthly';
    const ledger = isMonthly ? [...monthlyLedger] : [...weeklyLedger];
    const setLedger = isMonthly ? setMonthlyLedger : setWeeklyLedger;
    let count = 0;
    ledger.forEach((row, idx) => {
      if (selectedRows[`${financialTab}_${idx}`]) {
        let val: any = bulkEditValue;
        if (['live_duration', 'party_host_duration', 'total_points', 'agent_commission', 'live_earnings', 'party_earnings', 'private_chat', 'tips', 'platform_reward', 'other_earnings', 'platform_hourly_salary', 'super_salary', 'super_rank', 'level'].includes(bulkEditField)) {
           val = parseFloat(val) || 0;
           ledger[idx] = { ...ledger[idx], [bulkEditField]: val };
        } else if (bulkEditField === 'year') {
           val = parseInt(val) || new Date().getFullYear();
           ledger[idx] = { ...ledger[idx], year: val, to_date: val };
        } else if (bulkEditField === 'month') {
           ledger[idx] = { ...ledger[idx], month: val, from_date: val };
        } else if (bulkEditField === 'to_date') {
           ledger[idx] = { ...ledger[idx], to_date: val, year: parseInt(val) || new Date().getFullYear() };
        }
        count++;
      }
    });
    setLedger(ledger);
    setSelectedRows({});
    showSuccess(`Applied bulk edit to ${count} rows.`);
  };

  const roleLower = String(localAuth.role || '').toLowerCase();
  const isAgent = ['agent', 'manager'].includes(roleLower);
  const isDirectorOrAdmin = ['director', 'head admin', 'head_admin', 'admin'].includes(roleLower);
  
  if (isAgentMode && !isAgent && !isDirectorOrAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <Lock size={48} className="text-red-500/40" />
        <h3 className="text-lg font-black text-[#F0EFE8] uppercase tracking-wider">Access Restricted</h3>
        <p className="max-w-md text-[#A09E9A] text-xs">You must be an Agent or Manager to view team financials.</p>
      </div>
    );
  }

  if (!isAgentMode && !isDirectorOrAdmin && localAuth.level < 5) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <Lock size={48} className="text-red-500/40" />
        <h3 className="text-lg font-black text-[#F0EFE8] uppercase tracking-wider">Access Restricted</h3>
        <p className="max-w-md text-[#A09E9A] text-xs">Only the Director or Admin is authorized to view or edit master financial ledger data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <AnimatePresence>
        {errorMessage && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3">
            <AlertCircle size={16} className="text-red-400 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[11px] font-black uppercase text-red-400">System Alert</p>
              <p className="text-[10px] text-red-300 font-mono leading-relaxed">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage(null)} className="ml-auto text-red-400">✕</button>
          </motion.div>
        )}
        {successMessage && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-tight">{successMessage}</p>
            <button onClick={() => setSuccessMessage('')} className="ml-auto text-emerald-400">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-bold text-xl flex items-center gap-2 text-[#F0EFE8]">
            <FileUp size={20} className="text-emerald-400" />
            {isAgentMode ? 'Team Financials' : 'Financial Cloud Ledgers'}
          </h3>
          <p className="text-[10px] text-[#A09E9A]/40 uppercase tracking-widest font-black">
            {isAgentMode ? 'Agent Team Earnings Tracker' : 'Agency Earnings & Commission Tracker'}
          </p>
        </div>
        
        <div className="flex gap-2 bg-[#13131E] p-1.5 rounded-xl border border-white/5">
          <button onClick={() => setFinancialTab('monthly')} className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase transition-all", financialTab === 'monthly' ? "bg-emerald-600 text-white shadow-md" : "text-[#A09E9A]")}>Monthly Ledger</button>
          <button onClick={() => setFinancialTab('weekly')} className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase transition-all", financialTab === 'weekly' ? "bg-emerald-600 text-white shadow-md" : "text-[#A09E9A]")}>Weekly Ledger</button>
        </div>
      </div>

      <div className="tech-card space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A]/40">Bulk Upload (Tabular Paste)</h4>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#A09E9A] uppercase">Fallback Month/Date:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-[#0D0D14] border border-white/10 text-white text-[10px] uppercase font-bold py-1 px-2 rounded focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            {!isAgentMode && isDirectorOrAdmin && (
              <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                <span className="text-[10px] font-bold text-[#A09E9A] uppercase tracking-wider">Assign to Agent:</span>
                <select
                  value={agentOverride}
                  onChange={(e) => setAgentOverride(e.target.value)}
                  className="bg-[#0D0D14] border border-white/10 text-white text-[10px] uppercase font-bold py-1 px-2 rounded focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="">None (Upload as Nine Agency)</option>
                  {hosts.filter(h => h.role === 'Agent' || h.role === 'Manager').map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.nickname || agent.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        <textarea
          value={pasteData}
          onChange={(e) => setPasteData(e.target.value)}
          placeholder="Paste Excel/Sheets data here (Poppo ID, Nickname, Month/Date, Total Points...)"
          className="w-full h-24 glass-input font-mono text-[9px] resize-none"
        />
        <div className="flex gap-3">
          <button onClick={handleTabularImport} className="px-4 py-2 bg-[#D4AF37] hover:bg-[#F2CD5C] text-[#0D0D14] rounded-lg text-xs font-black uppercase transition-all shadow-md">
            Process & Load Data
          </button>
          <button onClick={handleGoogleSheetSync} disabled={isLoading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase transition-all shadow-md flex items-center gap-2 disabled:opacity-50">
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : null}
            Sync from Google Sheets API
          </button>
        </div>
      </div>

      <div className="tech-card !p-0 overflow-hidden bg-[#13131E] shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#1A1A28]/40">
          <div className="flex items-center gap-3">
            <button onClick={handleAddRow} className="px-3.5 py-2 bg-emerald-550 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase transition-all">+ Add Row</button>
            <button onClick={handleDeleteSelection} className="px-3.5 py-2 bg-red-550 hover:bg-red-650 text-white rounded-lg text-[10px] font-black uppercase transition-all">🗑️ Delete</button>
            <button onClick={handleSaveGrid} className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase transition-all ml-4">💾 Save Changes</button>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search Poppo ID or Name..."
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
              className="px-3 py-1.5 bg-[#0D0D14] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37] w-64"
            />
            <div className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A]">
              {(financialTab === 'monthly' ? monthlyLedger : weeklyLedger).length} Total rows
            </div>
          </div>
        </div>

        {Object.keys(selectedRows).some(key => key.startsWith(`${financialTab}_`) && selectedRows[key]) && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 bg-[#0D0D14] p-3 border-b border-[#D4AF37]/30">
             <span className="text-[10px] font-black uppercase text-[#D4AF37] ml-2">Bulk Edit Selected:</span>
             <select 
               value={bulkEditField} 
               onChange={(e) => setBulkEditField(e.target.value)}
               className="bg-[#1A1A28] border border-white/10 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-[#D4AF37]"
             >
                <option value="month">Month / From Date</option>
                <option value="to_date">To Date</option>
                <option value="year">Year</option>
                <option value="agent_commission">Agent Commission</option>
                <option value="total_points">Total Points</option>
                <option value="level">Level</option>
             </select>
             <input
               type="text"
               value={bulkEditValue}
               onChange={(e) => setBulkEditValue(e.target.value)}
               placeholder="New value..."
               className="bg-[#1A1A28] border border-white/10 text-white text-xs rounded px-2 py-1.5 focus:outline-none focus:border-[#D4AF37] w-32"
             />
             <button
               onClick={handleBulkEdit}
               className="px-3 py-1.5 bg-[#D4AF37] hover:bg-[#c9a832] text-[#0D0D14] rounded text-[10px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
             >
               Apply to Selected
             </button>
          </motion.div>
        )}
        <div className="hidden">
        </div>

        <div className="overflow-x-auto max-h-[500px] relative">
          <table className="w-full text-left text-xs min-w-[2000px] border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[9px] font-black text-[#A09E9A] uppercase bg-[#1A1A28] sticky top-0 z-20">
                <th className="px-3 py-3 w-12 text-center sticky left-0 z-30 bg-[#13131E] border-r border-white/5">
                  <input type="checkbox" onChange={(e) => {
                      const data = financialTab === 'monthly' ? monthlyLedger : weeklyLedger;
                      const lowerSearch = ledgerSearch.toLowerCase();
                      const filtered = data.map((row, idx) => {
                        const isDup = data.some((other, otherIdx) => 
                          otherIdx !== idx && 
                          other.poppo_id && other.poppo_id === row.poppo_id && 
                          other.total_points === row.total_points
                        );
                        return { row: { ...row, _isDuplicate: isDup }, idx };
                      }).filter(({ row }) => 
                        !ledgerSearch || 
                        String(row.poppo_id).toLowerCase().includes(lowerSearch) || 
                        String(row.nickname || '').toLowerCase().includes(lowerSearch)
                      );
                      const nextSelected = { ...selectedRows };
                      filtered.forEach(({ idx }) => {
                        nextSelected[`${financialTab}_${idx}`] = e.target.checked;
                      });
                      setSelectedRows(nextSelected);
                    }} 
                  />
                </th>
                <th className="px-4 py-3 w-36 sticky left-[48px] bg-[#13131E] z-30 border-r border-white/5">Poppo ID</th>
                <th className="px-3 py-3 w-32 min-w-[120px]">Nickname</th>
                {financialTab === 'monthly' ? (
                  <>
                    <th className="px-3 py-3 w-32 min-w-[120px]">Month</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-3 w-28 min-w-[110px]">From</th>
                    <th className="px-3 py-3 w-28 min-w-[110px]">To</th>
                  </>
                )}
                <th className="px-3 py-3 w-24 min-w-[90px]">Year</th>
                <th className="px-3 py-3">Live duration</th>
                <th className="px-3 py-3">Party host duration</th>
                <th className="px-3 py-3">Total earnings of points</th>
                <th className="px-3 py-3">Agent Commission</th>
                <th className="px-3 py-3">Live earnings</th>
                <th className="px-3 py-3">Party Earnings</th>
                <th className="px-3 py-3">Private chat</th>
                <th className="px-3 py-3">Tips</th>
                <th className="px-3 py-3">Platform reward</th>
                <th className="px-3 py-3">Other Earnings</th>
                <th className="px-3 py-3">Platform hourly salary</th>
                <th className="px-3 py-3">Super Salary</th>
                <th className="px-3 py-3">Super Rank</th>
                <th className="px-3 py-3">Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(() => {
                 const data = financialTab === 'monthly' ? monthlyLedger : weeklyLedger;
                 const lowerSearch = ledgerSearch.toLowerCase();
                 const filtered = data.map((row, idx) => {
                   const isDup = data.some((other, otherIdx) => 
                      otherIdx !== idx && 
                      other.poppo_id && other.poppo_id === row.poppo_id && 
                      other.total_points === row.total_points
                   );
                   return { row: { ...row, _isDuplicate: isDup }, idx };
                 }).filter(({ row }) => 
                   !ledgerSearch || 
                   String(row.poppo_id).toLowerCase().includes(lowerSearch) || 
                   String(row.nickname || '').toLowerCase().includes(lowerSearch)
                 );
                 
                 if (filtered.length === 0) {
                   return (
                     <tr>
                       <td colSpan={20} className="py-12 text-center text-[#A09E9A] italic">
                         {ledgerSearch ? "No ledger entries found matching your search." : "No ledger entries found. Click \"+ Add Row\" or paste data above."}
                       </td>
                     </tr>
                   );
                 }
                 
                 return filtered.map(({ row, idx }) => {
                    const isChecked = !!selectedRows[`${financialTab}_${idx}`];
                    const existsInUsers = hosts.some(h => String(h.id || h.poppo_id || h.poppoId).trim() === String(row.poppo_id).trim());
                    const isHighlight = row.poppo_id && !existsInUsers;
                    return (
                      <tr key={idx} className={cn(
                        "transition-colors group",
                        (row as any)._isDuplicate ? "bg-red-500/10 hover:bg-red-500/20" : 
                        isHighlight ? "bg-amber-500/10 hover:bg-amber-500/20 border-l-2 border-amber-500" :
                        "hover:bg-white/[0.01]"
                      )}>
                        <td className={cn(
                          "px-3 py-2 text-center sticky left-0 z-10 border-r border-white/5 transition-colors",
                          (row as any)._isDuplicate ? "bg-[#251010] group-hover:bg-[#301515]" : 
                          isHighlight ? "bg-[#282010] group-hover:bg-[#352a15]" :
                          "bg-[#13131E] group-hover:bg-[#1A1A28]"
                        )}>
                          <input type="checkbox" checked={isChecked} onChange={e => setSelectedRows(prev => ({...prev, [`${financialTab}_${idx}`]: e.target.checked}))} className="rounded border-white/10 text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer" />
                          {(row as any)._isDuplicate && (
                            <div className="absolute top-1/2 -translate-y-1/2 left-8 text-xs cursor-help" title="Duplicate Entry Detected">⚠️</div>
                          )}
                          {!(row as any)._isDuplicate && isHighlight && (
                            <div className="absolute top-1/2 -translate-y-1/2 left-8 text-xs cursor-help" title="Poppo ID not found in Users collection">⚠️</div>
                          )}
                        </td>
                        <td className={cn(
                          "px-4 py-2 sticky left-[48px] border-r border-white/5 z-10 font-mono font-bold transition-colors",
                          (row as any)._isDuplicate ? "bg-[#251010] text-red-400 group-hover:bg-[#301515]" : 
                          isHighlight ? "bg-[#282010] text-amber-400 group-hover:bg-[#352a15]" :
                          "bg-[#13131E] text-indigo-400 group-hover:bg-[#1A1A28]"
                        )}>
                          <input type="text" value={row.poppo_id} onChange={e => handleCellChange(idx, 'poppo_id', e.target.value)} className={cn("bg-transparent border-none w-full outline-none", (row as any)._isDuplicate ? "text-red-400" : isHighlight ? "text-amber-400" : "text-indigo-400")} title="Poppo ID" />
                        </td>
                        <td className="px-3 py-2 w-32 min-w-[120px]"><input type="text" value={row.nickname || ''} onChange={e => handleCellChange(idx, 'nickname', e.target.value)} className="bg-transparent w-full text-white outline-none" title="Nickname" aria-label="Nickname" /></td>
                        {financialTab === 'monthly' ? (
                          <td className="px-3 py-2 w-32 min-w-[120px]"><input type="text" value={row.month || ''} onChange={e => handleCellChange(idx, 'month', e.target.value)} className="bg-transparent w-full text-white outline-none" title="Month" aria-label="Month" /></td>
                        ) : (
                          <>
                            <td className="px-3 py-2 w-28 min-w-[110px]"><input type="text" value={row.from_date || ''} onChange={e => handleCellChange(idx, 'from_date', e.target.value)} className="bg-transparent w-full text-white outline-none" title="From date" aria-label="From date" /></td>
                            <td className="px-3 py-2 w-28 min-w-[110px]"><input type="text" value={row.to_date || ''} onChange={e => handleCellChange(idx, 'to_date', e.target.value)} className="bg-transparent w-full text-white outline-none" title="To date" aria-label="To date" /></td>
                          </>
                        )}
                        <td className="px-3 py-2 w-24 min-w-[90px]"><input type="number" value={row.year || new Date().getFullYear() || ''} onChange={e => handleCellChange(idx, 'year', parseInt(e.target.value) || 0)} className="bg-transparent w-full text-white outline-none" title="Year" aria-label="Year" /></td>
                        <td className="px-3 py-2"><input type="number" value={row.live_duration || 0} onChange={e => handleCellChange(idx, 'live_duration', parseFloat(e.target.value) || 0)} className="bg-transparent w-full text-white outline-none" title="Live duration" aria-label="Live duration" /></td>
                        <td className="px-3 py-2"><input type="number" value={row.party_host_duration || 0} onChange={e => handleCellChange(idx, 'party_host_duration', parseFloat(e.target.value) || 0)} className="bg-transparent w-full text-white outline-none" title="Party host duration" aria-label="Party host duration" /></td>
                        <td className="px-3 py-2"><input type="number" value={row.total_earnings || row.total_points || 0} onChange={e => handleCellChange(idx, 'total_earnings', parseInt(e.target.value) || 0)} className="bg-transparent w-full text-white outline-none font-bold" title="Total earnings of points" /></td>
                        <td className="px-3 py-2"><input type="number" value={row.agent_commission || 0} onChange={e => handleCellChange(idx, 'agent_commission', parseInt(e.target.value) || 0)} className="bg-transparent w-full text-emerald-400 font-bold outline-none" title="Agent commission" aria-label="Agent commission" /></td>
                        <td className="px-3 py-2"><input type="number" value={row.live_earnings || 0} onChange={e => handleCellChange(idx, 'live_earnings', parseInt(e.target.value) || 0)} className="bg-transparent w-full text-white outline-none" title="Live earnings" aria-label="Live earnings" /></td>
                        <td className="px-3 py-2"><input type="number" value={row.party_earnings || 0} onChange={e => handleCellChange(idx, 'party_earnings', parseInt(e.target.value) || 0)} className="bg-transparent w-full text-white outline-none" title="Party earnings" aria-label="Party earnings" /></td>
                        <td className="px-3 py-2"><input type="number" value={row.private_chat || 0} onChange={e => handleCellChange(idx, 'private_chat', parseInt(e.target.value) || 0)} className="bg-transparent w-full text-white outline-none" title="Private chat" aria-label="Private chat" /></td>
                        <td className="px-3 py-2"><input type="number" value={row.tips || 0} onChange={e => handleCellChange(idx, 'tips', parseInt(e.target.value) || 0)} className="bg-transparent w-full text-white outline-none" title="Tips" aria-label="Tips" /></td>
                        <td className="px-3 py-2"><input type="number" value={row.platform_reward || 0} onChange={e => handleCellChange(idx, 'platform_reward', parseInt(e.target.value) || 0)} className="bg-transparent w-full text-white outline-none" title="Platform reward" aria-label="Platform reward" /></td>
                        <td className="px-3 py-2"><input type="number" value={row.other_earnings || 0} onChange={e => handleCellChange(idx, 'other_earnings', parseInt(e.target.value) || 0)} className="bg-transparent w-full text-white outline-none" title="Other earnings" aria-label="Other earnings" /></td>
                        <td className="px-3 py-2"><input type="number" value={row.platform_hourly_salary || 0} onChange={e => handleCellChange(idx, 'platform_hourly_salary', parseInt(e.target.value) || 0)} className="bg-transparent w-full text-white outline-none" title="Platform hourly salary" aria-label="Platform hourly salary" /></td>
                        <td className="px-3 py-2"><input type="number" value={row.super_salary || 0} onChange={e => handleCellChange(idx, 'super_salary', parseInt(e.target.value) || 0)} className="bg-transparent w-full text-white outline-none" title="Super salary" aria-label="Super salary" /></td>
                        <td className="px-3 py-2"><input type="number" value={row.super_rank || 0} onChange={e => handleCellChange(idx, 'super_rank', parseInt(e.target.value) || 0)} className="bg-transparent w-full text-white outline-none" title="Super rank" aria-label="Super rank" /></td>
                        <td className="px-3 py-2"><input type="number" value={row.level || 0} onChange={e => handleCellChange(idx, 'level', parseInt(e.target.value) || 0)} className="bg-transparent w-full text-white outline-none" title="Level" aria-label="Level" /></td>
                      </tr>
                    );
                 });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

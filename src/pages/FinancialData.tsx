import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUp, Trash2, CheckCircle2, AlertCircle, Loader2, Lock } from 'lucide-react';
import { FirebaseService } from '../lib/firebaseService';
import { CommissionEntry } from '../types';
import { Storage } from '../lib/storage';
import { cn } from '../lib/utils';

export const FinancialData = () => {
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

  const loadData = async () => {
    try {
      const c = await FirebaseService.getCommissions();
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
      poppo_name: '',
      month: financialTab === 'monthly' ? '' : undefined,
      from_date: financialTab === 'weekly' ? '' : undefined,
      to_date: financialTab === 'weekly' ? '' : undefined,
      live_duration: 0,
      live_earnings: 0,
      total_points: 0,
      my_commission: 0,
      timestamp: new Date().toISOString()
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
          await FirebaseService.deleteCommission(item.poppo_id, item.month || `${item.from_date}_${item.to_date}`);
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
        await FirebaseService.saveCommissions(validData);
        showSuccess(`Saved ${validData.length} records successfully.`);
      }
    } catch (err) {
      setErrorMessage('Failed to save grid changes.');
    }
  };

  const handleTabularImport = async () => {
    if (!pasteData.trim()) return;
    setIsLoading(true);
    try {
      const rawText = pasteData.trim();
      const rows = rawText.split('\n').filter(line => line.trim() !== '').map(line => line.split('\t'));
      
      const startIdx = rows[0] && rows[0][0]?.toLowerCase().includes('poppo') ? 1 : 0;
      const parsedCommissions: CommissionEntry[] = [];
      
      for (let i = startIdx; i < rows.length; i++) {
        const cols = rows[i];
        if (cols.length < 2) continue;
        
        const poppoId = cols[0]?.trim();
        if (!poppoId) continue;
        
        // Very simplified parsing logic for demonstration
        parsedCommissions.push({
          poppo_id: poppoId,
          poppo_name: cols[1] || 'Unknown',
          month: cols[2] || '', // Assume column 2 is month if monthly
          total_points: parseInt((cols[3] || '0').replace(/,/g, '')) || 0,
          timestamp: new Date().toISOString()
        });
      }
      
      if (parsedCommissions.length > 0) {
        await FirebaseService.saveCommissions(parsedCommissions);
        showSuccess(`Imported ${parsedCommissions.length} rows.`);
        setPasteData('');
        loadData();
      }
    } catch (err) {
      setErrorMessage('Failed to parse tabular data.');
    } finally {
      setIsLoading(false);
    }
  };

  if (localAuth.role !== 'Director' && localAuth.level < 5) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <Lock size={48} className="text-red-500/40" />
        <h3 className="text-lg font-black text-[#F0EFE8] uppercase tracking-wider">Access Restricted</h3>
        <p className="max-w-md text-[#A09E9A] text-xs">Only the Director is authorized to view or edit financial ledger data.</p>
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
            Financial Cloud Ledgers
          </h3>
          <p className="text-[10px] text-[#A09E9A]/40 uppercase tracking-widest font-black">Agency Earnings & Commission Tracker</p>
        </div>
        
        <div className="flex gap-2 bg-[#13131E] p-1.5 rounded-xl border border-white/5">
          <button onClick={() => setFinancialTab('monthly')} className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase transition-all", financialTab === 'monthly' ? "bg-emerald-600 text-white shadow-md" : "text-[#A09E9A]")}>Monthly Ledger</button>
          <button onClick={() => setFinancialTab('weekly')} className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase transition-all", financialTab === 'weekly' ? "bg-emerald-600 text-white shadow-md" : "text-[#A09E9A]")}>Weekly Ledger</button>
        </div>
      </div>

      <div className="tech-card space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A]/40">Bulk Upload (Tabular Paste)</h4>
        <textarea
          value={pasteData}
          onChange={(e) => setPasteData(e.target.value)}
          placeholder="Paste Excel/Sheets data here (Poppo ID, Nickname, Month/Date, Total Points...)"
          className="w-full h-24 glass-input font-mono text-[9px] resize-none"
        />
        <button onClick={handleTabularImport} className="px-4 py-2 bg-[#D4AF37] hover:bg-[#F2CD5C] text-[#0D0D14] rounded-lg text-xs font-black uppercase transition-all shadow-md">
          Process & Load Data
        </button>
      </div>

      <div className="tech-card !p-0 overflow-hidden bg-[#13131E] shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#1A1A28]/40">
          <div className="flex items-center gap-3">
            <button onClick={handleAddRow} className="px-3.5 py-2 bg-emerald-550 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase transition-all">+ Add Row</button>
            <button onClick={handleDeleteSelection} className="px-3.5 py-2 bg-red-550 hover:bg-red-650 text-white rounded-lg text-[10px] font-black uppercase transition-all">🗑️ Delete</button>
            <button onClick={handleSaveGrid} className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase transition-all ml-4">💾 Save Changes</button>
          </div>
          <div className="text-[10px] font-black text-[#A09E9A]">Rows: {(financialTab === 'monthly' ? monthlyLedger : weeklyLedger).length}</div>
        </div>

        <div className="overflow-x-auto max-h-[500px] relative">
          <table className="w-full text-left text-xs min-w-[800px] border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[9px] font-black text-[#A09E9A] uppercase bg-[#1A1A28] sticky top-0 z-20">
                <th className="px-3 py-3 w-12 text-center sticky left-0 z-30 bg-[#13131E] border-r border-white/5">Sel</th>
                <th className="px-4 py-3 w-36 sticky left-[48px] bg-[#13131E] z-30 border-r border-white/5">Poppo ID</th>
                {financialTab === 'monthly' ? <th className="px-3 py-3">Month</th> : <><th className="px-3 py-3">From</th><th className="px-3 py-3">To</th></>}
                <th className="px-3 py-3">Nickname</th>
                <th className="px-3 py-3">Total Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {(financialTab === 'monthly' ? monthlyLedger : weeklyLedger).map((row, idx) => {
                const isChecked = !!selectedRows[`${financialTab}_${idx}`];
                return (
                  <tr key={idx} className="hover:bg-white/[0.01]">
                    <td className="px-3 py-2 text-center sticky left-0 z-10 bg-[#13131E] border-r border-white/5">
                      <input type="checkbox" checked={isChecked} onChange={e => setSelectedRows(prev => ({...prev, [`${financialTab}_${idx}`]: e.target.checked}))} className="rounded" />
                    </td>
                    <td className="px-4 py-2 sticky left-[48px] bg-[#13131E] border-r border-white/5 z-10">
                      <input type="text" value={row.poppo_id} onChange={e => handleCellChange(idx, 'poppo_id', e.target.value)} className="bg-transparent border-none w-full text-indigo-400 font-mono font-bold outline-none" />
                    </td>
                    {financialTab === 'monthly' ? (
                      <td className="px-3 py-2"><input type="text" value={row.month || ''} onChange={e => handleCellChange(idx, 'month', e.target.value)} className="bg-transparent w-full text-white outline-none" /></td>
                    ) : (
                      <>
                        <td className="px-3 py-2"><input type="text" value={row.from_date || ''} onChange={e => handleCellChange(idx, 'from_date', e.target.value)} className="bg-transparent w-full text-white outline-none" /></td>
                        <td className="px-3 py-2"><input type="text" value={row.to_date || ''} onChange={e => handleCellChange(idx, 'to_date', e.target.value)} className="bg-transparent w-full text-white outline-none" /></td>
                      </>
                    )}
                    <td className="px-3 py-2"><input type="text" value={row.nickname || ''} onChange={e => handleCellChange(idx, 'nickname', e.target.value)} className="bg-transparent w-full text-white outline-none" /></td>
                    <td className="px-3 py-2"><input type="number" value={row.total_points || 0} onChange={e => handleCellChange(idx, 'total_points', parseInt(e.target.value) || 0)} className="bg-transparent w-full text-white outline-none" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { useRoleGuard } from './RoleGuard';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import Papa from 'papaparse';
import { FileUp, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FinancialUploadProps {
  onUploadSuccess?: () => void;
}

export const FinancialUpload: React.FC<FinancialUploadProps> = ({ onUploadSuccess }) => {
  const isDirector = useRoleGuard();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [stats, setStats] = useState<{ total: number; success: number; skipped: number } | null>(null);

  if (!isDirector) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 rounded-2xl">
        <p className="text-red-400 font-bold uppercase text-xs">Access Denied: Director Only</p>
      </div>
    );
  }

  // Convert HH:MM:SS to minutes
  const parseDuration = (timeStr: string | number): number => {
    if (!timeStr) return 0;
    if (typeof timeStr === 'number') return timeStr; // might already be parsed
    const parts = String(timeStr).split(':');
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts.map(Number);
      return Math.round((hours * 60) + minutes + (seconds / 60));
    }
    return parseFloat(String(timeStr)) || 0;
  };

  const cleanNumber = (val: any): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const cleanStr = String(val).replace(/,/g, '').trim();
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg('');
    setSuccessMsg('');
    setStats(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          let successCount = 0;
          let skippedCount = 0;

          for (const row of rows) {
            // Find appropriate keys (case insensitive, ignoring spaces)
            const getVal = (possibleKeys: string[]) => {
              const rowKey = Object.keys(row).find(k => 
                possibleKeys.some(pk => pk.toLowerCase().replace(/\s/g, '') === k.toLowerCase().replace(/\s/g, ''))
              );
              return rowKey ? row[rowKey] : undefined;
            };

            const poppoId = getVal(['poppoid', 'id', 'poppo id']);
            const month = parseInt(getVal(['month', 'period']) || '0');
            const year = parseInt(getVal(['year']) || new Date().getFullYear().toString());

            if (!poppoId || !month || !year || isNaN(month) || isNaN(year)) {
              skippedCount++;
              continue;
            }

            const docId = `${poppoId}_${year}_monthly_${month}`;
            const liveDurationMinutes = parseDuration(getVal(['live duration', 'liveduration', 'live hours']));
            const partyHostDurationMinutes = parseDuration(getVal(['party host duration', 'party duration', 'party hours']));
            const level = cleanNumber(getVal(['level', 'lvl']));

            // Financial Fields
            const earningsBreakdown = {
              totalEarningsOfPoints: cleanNumber(getVal(['total earnings of points', 'total points', 'points'])),
              agentCommission: cleanNumber(getVal(['agent commission', 'commission'])),
              liveEarnings: cleanNumber(getVal(['live earnings'])),
              partyEarnings: cleanNumber(getVal(['party earnings'])),
              privateChatEarnings: cleanNumber(getVal(['private chat', 'private chat earnings'])),
              tips: cleanNumber(getVal(['tips', 'tip'])),
              platformReward: cleanNumber(getVal(['platform reward'])),
              otherEarnings: cleanNumber(getVal(['other earnings'])),
              platformHourlySalary: cleanNumber(getVal(['platform hourly salary', 'platform hourly', 'hourly salary'])),
              superSalary: cleanNumber(getVal(['super salary'])),
              superRank: cleanNumber(getVal(['super rank']))
            };

            const reportData = {
              poppoId: String(poppoId).trim(),
              month,
              year,
              periodType: 'monthly',
              liveDurationMinutes,
              partyHostDurationMinutes,
              level,
              earningsBreakdown,
              updatedAt: new Date().toISOString()
            };

            try {
              const docRef = doc(db, 'performance_reports', docId);
              await setDoc(docRef, reportData, { merge: true });
              successCount++;
            } catch (err) {
              console.error(`Failed to upsert row for ID: ${poppoId}`, err);
              skippedCount++;
            }
          }

          setStats({ total: rows.length, success: successCount, skipped: skippedCount });
          setSuccessMsg(`Import Complete: Processed ${rows.length} rows.`);
          
          if (onUploadSuccess) {
            onUploadSuccess();
          }

        } catch (err) {
          setErrorMsg('An error occurred during file processing.');
          console.error(err);
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      },
      error: (error) => {
        setErrorMsg(`Failed to parse CSV: ${error.message}`);
        setIsUploading(false);
      }
    });
  };

  return (
    <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-500/10 rounded-xl">
          <FileUp size={20} className="text-emerald-400" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-[#F0EFE8]">Bulk Financial Ingestion Utility</h3>
          <p className="text-xs text-[#A09E9A]">Upload monthly CSV reports to bulk-update Firestore performance records.</p>
        </div>
      </div>

      <AnimatePresence>
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
            <AlertCircle size={14} className="text-red-400" />
            <span className="text-xs text-red-400 font-bold">{errorMsg}</span>
          </motion.div>
        )}

        {successMsg && stats && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span className="text-sm text-emerald-400 font-bold">{successMsg}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="bg-black/20 p-2 rounded-lg text-center">
                <p className="text-[10px] text-emerald-500/60 uppercase font-black">Total Rows</p>
                <p className="text-lg font-bold text-emerald-400">{stats.total}</p>
              </div>
              <div className="bg-black/20 p-2 rounded-lg text-center">
                <p className="text-[10px] text-emerald-500/60 uppercase font-black">Successful</p>
                <p className="text-lg font-bold text-emerald-400">{stats.success}</p>
              </div>
              <div className="bg-black/20 p-2 rounded-lg text-center">
                <p className="text-[10px] text-rose-500/60 uppercase font-black">Skipped/Errors</p>
                <p className="text-lg font-bold text-rose-400">{stats.skipped}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        className="border-2 border-dashed border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer relative"
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input 
          type="file"
          accept=".csv"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          disabled={isUploading}
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="text-emerald-400 animate-spin" />
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Processing Upload...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
              <FileUp size={24} className="text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-[#F0EFE8]">Click to select CSV file</p>
              <p className="text-[10px] text-[#A09E9A] mt-1 uppercase tracking-wider">Maps directly to Firestore performance_reports</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

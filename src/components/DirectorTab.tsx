import React, { useState, useRef } from 'react';
import { Shield, FileUp, Clipboard, CheckCircle2, History, Trash2, FolderPlus, ArrowRight, Zap, AlertCircle, FileText, Loader2, Activity } from 'lucide-react';
import { Storage } from '../lib/storage';
import { FileEntry, Host, CommissionEntry, PKEntry, ExposureEntry } from '../types';
import { cn, formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { FirebaseService } from '../lib/firebaseService';

import { auth as fbAuth, signInWithGoogle } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const RosterManualEditor = ({ hosts, onRefresh, activeCategory, isLoading }: { hosts: Host[], onRefresh: () => void, activeCategory: string, isLoading: boolean }) => {
  const [isEditing, setIsEditing] = useState<string | null>(null);

  const handleUpdate = async (host: Host) => {
    try {
      await FirebaseService.updateHost(host);
      onRefresh();
      setIsEditing(null);
    } catch (err) {
      alert("Failed to update host: " + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this host?")) return;
    try {
      await FirebaseService.deleteHost(id);
      onRefresh();
    } catch (err) {
      alert("Failed to delete host");
    }
  };

  if (activeCategory === '📊 Monthly Commission') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <Shield size={64} className="text-white/5" />
        <div className="space-y-1">
          <h4 className="font-bold text-white/40">Read-Only Safety Lock</h4>
          <p className="text-[10px] text-white/20">Hosts must be managed via MasterSheet uploads or Roster Tab.</p>
        </div>
      </div>
    );
  }

  if (isLoading) return <div className="p-12 text-center text-white/20 italic">Loading Roster MasterSheet...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-white/10 text-[10px] font-black text-white/30 uppercase tracking-widest bg-white/2">
            <th className="px-6 py-4">Poppo ID</th>
            <th className="px-6 py-4">Name</th>
            <th className="px-6 py-4">Temp PW</th>
            <th className="px-6 py-4">Role</th>
            <th className="px-6 py-4">Team</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {hosts.map(h => (
            <tr key={h.id} className="hover:bg-white/2 transition-colors">
              <td className="px-6 py-4 font-mono font-bold text-indigo-400">{h.id}</td>
              <td className="px-6 py-4 font-bold">{h.name}</td>
              <td className="px-6 py-4">
                <span className={cn(
                  "px-2 py-0.5 rounded font-mono text-[10px]",
                  h.is_temp_password ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                )}>{h.password}</span>
              </td>
              <td className="px-6 py-4 text-white/40">{h.position}</td>
              <td className="px-6 py-4 text-white/40">{h.team}</td>
              <td className="px-6 py-4 text-right">
                <div className="flex justify-end gap-2 text-white/20">
                  <button onClick={() => handleDelete(h.id)} className="hover:text-red-400 p-1"><Trash2 size={14}/></button>
                </div>
              </td>
            </tr>
          ))}
          {hosts.length === 0 && (
            <tr>
              <td colSpan={6} className="py-20 text-center text-white/20 italic">MasterSheet is currently empty. Upload or Paste data above to populate.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const DataSpotlight = ({ 
  file, 
  data, 
  onClose, 
  onUpdateRow, 
  isLoading 
}: { 
  file: FileEntry; 
  data: any[]; 
  onClose: () => void;
  onUpdateRow: (index: number, row: any) => void;
  isLoading: boolean;
}) => {
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [tempRow, setTempRow] = useState<any | null>(null);

  if (!file) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
      
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="relative w-full max-w-6xl h-[80vh] flex flex-col bg-[#0A0A0A] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <FileText size={24} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="font-black text-2xl tracking-tight">{file.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">{file.category}</span>
                <span className="w-1 h-1 rounded-full bg-white/10" />
                <span className="text-[10px] font-bold text-white/40">{formatDate(file.timestamp)}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white"
          >
            <Trash2 size={20} className="rotate-45" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-white/20 italic">
              <Loader2 className="animate-spin" size={32} />
              Loading records...
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#0A0A0A] z-10">
                <tr className="border-b border-white/10 text-[10px] font-black text-white/30 uppercase tracking-widest">
                  <th className="px-6 py-4">Poppo ID</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Month</th>
                  <th className="px-6 py-4 text-center">Earnings</th>
                  <th className="px-6 py-4 text-center">Commission</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/2 group transition-colors">
                    {editingRow === idx ? (
                      <>
                        <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.poppo_id}</td>
                        <td className="px-6 py-4 font-bold">
                          <input 
                            type="text" 
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs w-full"
                            value={tempRow.poppo_name}
                            onChange={(e) => setTempRow({ ...tempRow, poppo_name: e.target.value })}
                          />
                        </td>
                        <td className="px-6 py-4 text-white/40">{row.month}</td>
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="number" 
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs w-24 text-center"
                            value={tempRow.total_earnings}
                            onChange={(e) => setTempRow({ ...tempRow, total_earnings: Number(e.target.value) })}
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="number" 
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs w-24 text-center"
                            value={tempRow.my_commission}
                            onChange={(e) => setTempRow({ ...tempRow, my_commission: Number(e.target.value) })}
                          />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                             <button 
                               onClick={() => {
                                 onUpdateRow(idx, tempRow);
                                 setEditingRow(null);
                               }}
                               className="text-emerald-400 hover:text-emerald-300 font-bold"
                             >
                                <CheckCircle2 size={16} />
                             </button>
                             <button onClick={() => setEditingRow(null)} className="text-white/20 hover:text-white">✕</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 font-mono font-bold text-indigo-400">{row.poppo_id}</td>
                        <td className="px-6 py-4 font-bold">{row.poppo_name}</td>
                        <td className="px-6 py-4 text-white/40">{row.month}</td>
                        <td className="px-6 py-4 text-center font-mono">{(row.total_earnings || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-center font-mono text-emerald-400 font-bold">{(row.my_commission || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingRow(idx);
                              setTempRow({ ...row });
                            }}
                            className="p-2 hover:bg-white/10 rounded-lg text-white/20 hover:text-white"
                          >
                            <Clipboard size={14} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export const DirectorTab = () => {
  const [files, setFiles] = useState<FileEntry[]>(Storage.getFiles());
  const [activeCategory, setActiveCategory] = useState<string>('📊 Monthly Commission');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  const [pasteData, setPasteData] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingSummary, setProcessingSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fbUser, setFbUser] = useState(fbAuth.currentUser);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [rosterHosts, setRosterHosts] = useState<Host[]>([]);
  const [isRosterLoading, setIsRosterLoading] = useState(true);
  const [selectedFileDetail, setSelectedFileDetail] = useState<FileEntry | null>(null);
  const [detailData, setDetailData] = useState<any[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const loadRoster = async () => {
    setIsRosterLoading(true);
    try {
      const data = await FirebaseService.getAllHosts();
      setRosterHosts(data);
    } catch (err) {
      console.error("Failed to load roster:", err);
    } finally {
      setIsRosterLoading(false);
    }
  };

  const loadFileDetail = async (file: FileEntry) => {
    if (file.category !== '📊 Monthly Commission') return;
    setSelectedFileDetail(file);
    setIsDetailLoading(true);
    try {
      const month = file.month || file.name.substring(0, 7); // Fallback to name if month missing
      const data = await FirebaseService.getCommissionsByMonth(month);
      setDetailData(data);
    } catch (err) {
      setError("Failed to load file details: " + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleUpdateDetailRow = async (rowIndex: number, updatedRow: CommissionEntry) => {
    try {
      await FirebaseService.saveCommissions([updatedRow]);
      const newData = [...detailData];
      newData[rowIndex] = updatedRow;
      setDetailData(newData);
      window.dispatchEvent(new CustomEvent('data-updated'));
    } catch (err) {
      alert("Failed to update record");
    }
  };

  const [cloudStats, setCloudStats] = useState<Record<string, number>>({});
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  const loadCloudStats = async () => {
    setIsStatsLoading(true);
    try {
      const allComms = await FirebaseService.getAllCommissions();
      const stats = allComms.reduce((acc: Record<string, number>, curr) => {
        acc[curr.month] = (acc[curr.month] || 0) + 1;
        return acc;
      }, {});
      setCloudStats(stats);
    } catch (err) {
      console.error("Stats load failed", err);
    } finally {
      setIsStatsLoading(false);
    }
  };

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(fbAuth, (user) => {
      setFbUser(user);
    });
    loadRoster();
    loadCloudStats();
    return () => unsubscribe();
  }, []);
  
  const localAuth = Storage.getAuthState();
  const isDirector = localAuth.role === 'Director';

  const categories = [
    { name: '📊 Monthly Commission', desc: 'Sourced exclusively from MasterSheet. Updates all host commission data.' },
    { name: '🎲 PK Tournament', desc: 'Updates PK Performance sections site-wide.' },
    { name: '📣 Event Logs', desc: 'Updates Exposures & Visibility logs.' },
    { name: '📋 Roster Updates', desc: 'Batch update status, roles, or add members.' },
  ];

  const validateCommissionStructure = (row: any): boolean => {
    // Basic validation of required headers/fields for the new schema
    // We look for ID or poppo_id, and Nickname or poppo_name
    const keys = Object.keys(row).map(k => k.trim().toLowerCase());
    const hasId = keys.includes('id') || keys.includes('poppo_id');
    const hasName = keys.includes('nickname') || keys.includes('poppo_name');
    return hasId && hasName;
  };

  const parseDurationToMinutes = (duration: string): number => {
    if (!duration || typeof duration !== 'string') return 0;
    const parts = duration.split(':');
    if (parts.length < 2) return 0;
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    const s = parseInt(parts[2], 10) || 0;
    return (h * 60) + m + (s / 60);
  };

  const processMasterSheet = async (data: any[], fileName: string, overrideMonth?: string) => {
    if (!isDirector) {
      setError("Access Denied: Only Director Miss Nine can upload or replace the MasterSheet.");
      return;
    }

    const targetMonth = overrideMonth || selectedMonth;

    if (!fbUser) {
      setError("Security Link Missing: You are logged in locally, but you must click 'SYNC CLOUD' in the header to authenticate with Google before uploading sensitive data.");
      return;
    }

    if (activeCategory === '📊 Monthly Commission') {
       // Validate structure
       if (data.length === 0 || !validateCommissionStructure(data[0])) {
         setError("Validation Error: MasterSheet is missing fields (ID/Nickname). Please ensure you are uploading the correct Poppo report.");
         return;
       }

       setIsProcessing(true);
       try {
         const commissions: CommissionEntry[] = data.map(row => {
           // Normalize keys (trim and case-insensitive check)
           const findVal = (possibleKeys: string[]) => {
             const key = Object.keys(row).find(k => 
               possibleKeys.includes(k.trim()) || 
               possibleKeys.includes(k.trim().toLowerCase())
             );
             return key ? row[key] : undefined;
           };

           const id = String(findVal(['ID', 'poppo_id']) || '');
           const nickname = String(findVal(['Nickname', 'poppo_name']) || 'Unknown');
           const liveDuration = parseDurationToMinutes(String(findVal(['Live duration', ' Live duration', 'live_duration']) || '0'));
           const partyDuration = parseDurationToMinutes(String(findVal(['Party host duration', 'video_duration']) || '0'));
           const totalPoints = Number(findVal(['Total earnings of points', 'total_points']) || 0);
           const agentCommission = Number(findVal(['agentweb_commission_earning']) || 0);
           const liveEarnings = Number(findVal(['Live earnings', ' Live earnings', 'live_earnings']) || 0);
           const partyEarnings = Number(findVal(['Party Earnings', ' Party Earnings', 'video_earnings']) || 0);

           return {
             poppo_id: id,
             poppo_name: nickname,
             month: targetMonth,
             live_duration: liveDuration,
             live_earnings: liveEarnings,
             video_duration: partyDuration,
             video_earnings: partyEarnings,
             agentweb_commission_rate: 0, // Not explicitly in simple CSV
             agentweb_commission_earning: agentCommission,
             total_points: totalPoints,
             total_earnings: totalPoints,
             my_commission: agentCommission
           };
         }).filter(c => c.poppo_id && c.poppo_id !== 'ID' && c.poppo_id !== 'undefined');

         // AUTO-SYNC ROSTER: Create host profiles for anyone not in the system
         const currentHosts = await FirebaseService.getAllHosts();
         const existingIds = new Set(currentHosts.map(h => h.id));
         const hostsToRegister: Host[] = [];

         commissions.forEach(c => {
           if (!existingIds.has(c.poppo_id)) {
             hostsToRegister.push({
               id: c.poppo_id,
               name: c.poppo_name,
               nickname: c.poppo_name,
               position: 'Talent',
               role: 'Talent',
               team: 'Unassigned',
               manager: 'Nine Management',
               anchor_type: 'Nine Agency',
               base_salary_category: 'N/A',
               status: 'Active',
               level: 1,
               tier: 'X',
               created_at: new Date().toISOString(),
               updated_at: new Date().toISOString(),
               password: '1212',
               is_temp_password: true
             });
             existingIds.add(c.poppo_id); // Prevent duplicate adds in same batch
           }
         });

         if (hostsToRegister.length > 0) {
           await FirebaseService.saveHosts(hostsToRegister);
           Storage.addLog('System', `Auto-registered ${hostsToRegister.length} new hosts from MasterSheet`, localAuth.name);
           await loadRoster(); // REFRESH THE UI
         }

         await FirebaseService.saveCommissions(commissions);
         
         const newFile: FileEntry = {
           id: crypto.randomUUID(),
           name: fileName,
           category: activeCategory,
           type: 'upload',
           timestamp: new Date().toISOString(),
           status: 'Processed',
           matchedCount: commissions.length,
           month: targetMonth,
           description: `MasterSheet processed for period ${targetMonth}. ${commissions.length} entries, ${hostsToRegister.length} new hosts.`
         };

         const updatedFiles = [newFile, ...files];
         Storage.setFiles(updatedFiles);
         setFiles(updatedFiles);
         Storage.addLog('System', `Director uploaded MasterSheet for ${targetMonth} (${commissions.length} records)`, localAuth.name);
         setProcessingSummary(`MasterSheet processed successfully for period ${targetMonth}. ${commissions.length} commission records updated. ${hostsToRegister.length} new hosts registered.`);
         loadCloudStats(); // Refresh audit
       } catch (err) {
         setError(`MasterSheet Processing Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
       } finally {
         setIsProcessing(false);
       }
    } else {
      // Legacy simulation for other categories if needed, but the prompt is about commissions
      setIsProcessing(true);
      setTimeout(() => {
        const newFile: FileEntry = {
          id: crypto.randomUUID(),
          name: fileName,
          category: activeCategory,
          type: 'upload',
          timestamp: new Date().toISOString(),
          status: 'Processed',
          matchedCount: data.length,
          description: `Processed ${data.length} rows of ${activeCategory} data.`
        };
        const updatedFiles = [newFile, ...files];
        Storage.setFiles(updatedFiles);
        setFiles(updatedFiles);
        setIsProcessing(false);
        setProcessingSummary(`Successfully processed ${data.length} rows.`);
      }, 1000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    // Auto-detect month from filename (e.g. 202604 or 2026-04)
    const dateMatch = file.name.match(/202\d[-]?\d{2}/);
    if (dateMatch && activeCategory === '📊 Monthly Commission') {
      const val = dateMatch[0].replace('-', '');
      const year = val.substring(0, 4);
      const month = val.substring(4, 6);
      const detected = `${year}-${month}`;
      
      // Basic month validation
      const mInt = parseInt(month);
      if (mInt >= 1 && mInt <= 12) {
        if (detected !== selectedMonth) {
          if (confirm(`DETECTION: This file name suggests data for ${detected}. Your "Target Month" is currently set to ${selectedMonth}.\n\nWould you like to switch the target to ${detected} before processing?`)) {
            setSelectedMonth(detected);
            // We return here to wait for state update by letting the user click upload again, 
            // OR we can just use the detected value directly in a modified process call.
            // Let's use it directly to save a click.
            const reader = new FileReader();
            reader.onload = (evt) => {
              let result = evt.target?.result as string;
              if (!result) return;
              if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
                if (result.includes('"My Commission",') || result.startsWith('My Commission,')) {
                  const lines = result.split(/\r?\n/);
                  result = lines.slice(1).join('\n');
                }
                Papa.parse(result, {
                  header: true,
                  skipEmptyLines: true,
                  dynamicTyping: true,
                  complete: (results) => {
                    processMasterSheet(results.data, file.name, detected);
                  },
                  error: (err) => setError(`CSV Parse Error: ${err.message}`)
                });
              }
            };
            if (file.name.endsWith('.xlsx')) reader.readAsBinaryString(file);
            else reader.readAsText(file);
            return;
          }
        }
      }
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      let result = evt.target?.result as string;
      if (!result) return;

      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        // Detect if there's a Poppo summary header ("My Commission",0) and skip it
        if (result.includes('"My Commission",') || result.startsWith('My Commission,')) {
          const lines = result.split(/\r?\n/);
          result = lines.slice(1).join('\n');
        }

        Papa.parse(result, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
          complete: (results) => {
            processMasterSheet(results.data, file.name);
          },
          error: (err) => setError(`CSV Parse Error: ${err.message}`)
        });
      } else if (file.name.endsWith('.xlsx')) {
        const workbook = XLSX.read(result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        let data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        // Handle Poppo summary row in Excel if needed
        if (data[0] && String(data[0][0]).includes('My Commission')) {
          data = data.slice(1);
        }

        // Convert array of arrays back to array of objects using found header row
        const headers = data[0];
        const objectData = data.slice(1).map(row => {
          const obj: any = {};
          headers.forEach((h: string, i: number) => {
            obj[h] = row[i];
          });
          return obj;
        });

        processMasterSheet(objectData, file.name);
      } else {
        setError("Unsupported file format. Please upload .csv, .xlsx, or .txt");
      }
    };

    if (file.name.endsWith('.xlsx')) {
      reader.readAsBinaryString(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleProcessPaste = async () => {
    if (!pasteData.trim()) return;
    setIsProcessing(true);
    setError(null);
    setProcessingSummary(null);
    
    try {
      let finalPasteData = pasteData.trim();
      // Skip the Poppo summary header if it's there
      if (finalPasteData.includes('"My Commission",') || finalPasteData.startsWith('My Commission,')) {
        const lines = finalPasteData.split('\n');
        finalPasteData = lines.slice(1).join('\n');
      }

      const isTab = finalPasteData.includes('\t');
      const delimiter = isTab ? '\t' : ',';

      if (activeCategory === '📊 Monthly Commission') {
        Papa.parse(finalPasteData, {
          header: true,
          skipEmptyLines: true,
          delimiter: delimiter,
          dynamicTyping: true,
          complete: (results) => {
            processMasterSheet(results.data, "Pasted Data");
          },
          error: (err) => {
            setError(`Parse Error: ${err.message}`);
            setIsProcessing(false);
          }
        });
        return;
      }

      const rows = finalPasteData.split('\n');
      const data: any[] = rows.map(row => {
        const parts = row.split(delimiter).map(p => p.trim());
        return parts;
      });

      if (!fbUser) {
        setError("Security Link Missing: You must 'SYNC CLOUD' before uploading PK data.");
        setIsProcessing(false);
        return;
      }

      if (activeCategory === '🎲 PK Tournament') {
        const records: PKEntry[] = data.map(parts => ({
          id: crypto.randomUUID(),
          poppo_id: String(parts[0] || ''),
          start_date: String(parts[1] || new Date().toISOString().split('T')[0]),
          end_date: String(parts[2] || new Date().toISOString().split('T')[0]),
          win_percentage: Number(parts[3] || 0),
          pk_score: Number(parts[4] || 0),
          sessions: Number(parts[5] || 1),
          submitted_by: localAuth.name,
          submitted_role: localAuth.role,
          timestamp: new Date().toISOString()
        })).filter(r => r.poppo_id);

        await FirebaseService.savePKRecords(records);
        setProcessingSummary(`Successfully processed and saved ${records.length} PK records.`);
      } else if (activeCategory === '📣 Event Logs') {
        const records: ExposureEntry[] = data.map(parts => ({
          id: crypto.randomUUID(),
          poppo_id: String(parts[0] || ''),
          event_date: String(parts[1] || new Date().toISOString().split('T')[0]),
          event_type: String(parts[2] || 'Platform Feature'),
          description: String(parts[3] || ''),
          submitted_by: localAuth.name,
          submitted_role: localAuth.role,
          timestamp: new Date().toISOString()
        })).filter(r => r.poppo_id);

        await FirebaseService.saveExposures(records);
        setProcessingSummary(`Successfully processed and saved ${records.length} event logs.`);
      } else if (activeCategory === '📋 Roster Updates') {
        const currentHosts = await FirebaseService.getAllHosts();
        const updatedHosts: Host[] = [];

        data.forEach(parts => {
          const id = String(parts[0] || '');
          if (!id) return;

          const existing = currentHosts.find(h => h.id === id);
          const newHost: Host = {
            id,
            name: String(parts[1] || existing?.name || 'Unknown'),
            nickname: String(parts[2] || existing?.nickname || parts[1] || 'Unknown'),
            position: (parts[3] as any) || existing?.position || 'Talent',
            role: (parts[3] as any) || existing?.role || 'Talent',
            team: String(parts[4] || existing?.team || 'Alpha'),
            manager: String(parts[5] || existing?.manager || 'Director Only'),
            status: (parts[6] as any) || existing?.status || 'Active',
            anchor_type: (parts[7] as any) || existing?.anchor_type || 'Nine Agency',
            base_salary_category: (parts[8] as any) || existing?.base_salary_category || 'N/A',
            level: Number(parts[9] || existing?.level || 1),
            tier: (parts[10] as any) || existing?.tier || 'X',
            password: String(parts[11] || existing?.password || '1212'),
            is_temp_password: parts[11] !== undefined ? false : (existing?.is_temp_password ?? true),
            created_at: existing?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          updatedHosts.push(newHost);
        });

        await FirebaseService.saveHosts(updatedHosts);
        setProcessingSummary(`Successfully updated ${updatedHosts.length} host roster records.`);
      }

      setPasteData('');
      // Update local file log
      const newFile: FileEntry = {
        id: crypto.randomUUID(),
        name: `Paste_${new Date().toISOString().split('T')[0]}`,
        category: activeCategory,
        type: 'paste',
        timestamp: new Date().toISOString(),
        status: 'Processed',
        matchedCount: data.length,
        description: `Manual paste import for ${activeCategory}`
      };
      const updatedFiles = [newFile, ...files];
      Storage.setFiles(updatedFiles);
      setFiles(updatedFiles);
      Storage.addLog('System', `Director pasted ${activeCategory} data`, localAuth.name);

    } catch (err) {
      setError(`Parsing Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteFile = (id: string) => {
    const updated = files.filter(f => f.id !== id);
    Storage.setFiles(updated);
    setFiles(updated);
  };

  if (localAuth.role !== 'Director' && localAuth.role !== 'Head Admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <Shield size={64} className="text-red-500/20" />
        <h2 className="text-2xl font-black text-white/90">Director Access Required</h2>
        <p className="max-w-md text-white/40 font-medium">This hub is reserved for Agency Leadership. Please contact Miss Nine if you require access to these features.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Priority Action Cards */}
      <section className="space-y-4">
         <h3 className="font-bold text-lg flex items-center gap-2">
           <Zap size={18} className="text-emerald-400" />
           Strategic Priorities
         </h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Urgent', color: 'border-red-500/30 bg-red-500/5', items: ['JAKE re-engagement', 'Nicole intervention', 'Allyyy post-mortem'] },
              { label: 'Important', color: 'border-amber-500/30 bg-amber-500/5', items: ['LYKA development', 'Jlord mentoring', 'Arnel coaching'] },
              { label: 'Monitor', color: 'border-blue-500/30 bg-blue-500/5', items: ['SexyLou model study', 'Boyeet burnout watch', 'Jey Em mentor'] },
            ].map((p, i) => (
              <div key={i} className={cn("p-6 rounded-3xl border", p.color)}>
                 <h4 className="text-xs font-black uppercase tracking-widest text-white/30 mb-4">{p.label}</h4>
                 <ul className="space-y-3">
                   {p.items.map((item, j) => (
                     <li key={j} className="flex items-center gap-2 text-sm font-bold text-white/80">
                        <ArrowRight size={14} className="text-white/20" />
                        {item}
                     </li>
                   ))}
                 </ul>
              </div>
            ))}
         </div>
      </section>

      {/* File Manager */}
      <section className="space-y-6">
         <div className="flex items-center justify-between">
           <h3 className="font-bold text-xl flex items-center gap-2">
             <FileUp size={20} className="text-purple-400" />
             File & Data Manager
           </h3>
           <div className="flex gap-2">
              <button className="btn-secondary !py-1 !px-3 text-xs"><FolderPlus size={14} className="mr-1 inline" /> New Category</button>
           </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="space-y-2">
               {categories.map(cat => (
                 <button 
                   key={cat.name}
                   onClick={() => setActiveCategory(cat.name)}
                   className={cn(
                     "w-full text-left p-4 rounded-2xl border transition-all group",
                     activeCategory === cat.name ? "glass border-purple-500 bg-purple-500/10" : "border-transparent hover:bg-white/5"
                   )}
                 >
                    <h5 className="font-bold text-sm">{cat.name}</h5>
                    <p className="text-[10px] text-white/30 mt-1 line-clamp-1">{cat.desc}</p>
                 </button>
               ))}
            </div>

            <div className="lg:col-span-3 glass-card space-y-6">
               <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-lg">{activeCategory}</h4>
                    <p className="text-xs text-white/40 mt-1">{categories.find(c => c.name === activeCategory)?.desc}</p>
                  </div>
          {activeCategory === '📊 Monthly Commission' && (
            <div className="flex flex-col md:flex-row items-center gap-3">
               {!fbUser && (
                 <button 
                   onClick={async () => {
                     setIsSigningIn(true);
                     try {
                       await signInWithGoogle();
                     } catch (err: any) {
                       setError(`Cloud integration failed: ${err.message}`);
                     } finally {
                       setIsSigningIn(false);
                     }
                   }}
                   disabled={isSigningIn}
                   className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/20 border border-orange-500/30 text-[10px] font-bold text-orange-400 hover:bg-orange-500/30 transition-all disabled:opacity-50"
                 >
                   {isSigningIn ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />}
                   {isSigningIn ? 'CONNECTING...' : 'LINK CLOUD PERMISSION'}
                 </button>
               )}
               {fbUser && (
                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
                   <CheckCircle2 size={12} />
                   LINKED: {fbUser.email}
                 </div>
               )}
               <div className="flex items-center gap-3 bg-white/5 p-2 px-4 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Target Month:</span>
                  <input 
                    type="month" 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-transparent text-white font-bold text-sm outline-none [color-scheme:dark]"
                  />
               </div>
               <button 
                 onClick={() => loadRoster()}
                 className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/40 transition-all"
                 title="Refresh Roster Data"
               >
                 <History size={14} />
               </button>
            </div>
          )}
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:border-purple-500/50 hover:bg-white/2 transition-all cursor-pointer relative group overflow-hidden"
                  >
                     <input 
                       type="file" 
                       ref={fileInputRef} 
                       onChange={handleFileUpload} 
                       className="hidden" 
                       accept=".csv,.xlsx,.txt"
                     />
                     <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileUp size={24} className="text-purple-400" />
                     </div>
                     <div className="text-center">
                        <p className="font-bold text-sm">Upload MasterSheet</p>
                        <p className="text-[10px] text-white/30 mt-1">Accepts .csv, .xlsx, .txt</p>
                     </div>
                     {isProcessing && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                           <Loader2 size={32} className="text-purple-400 animate-spin" />
                           <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">Processing...</p>
                        </div>
                     )}
                  </div>

                  <div className="space-y-3">
                     <div className="flex items-center justify-between text-[10px] font-bold text-white/30 uppercase tracking-widest">
                        <span>Paste Data Directly</span>
                        <Clipboard size={12} />
                     </div>
                     <textarea 
                       value={pasteData}
                       onChange={(e) => setPasteData(e.target.value)}
                       disabled={activeCategory === '📊 Monthly Commission'}
                       placeholder={activeCategory === '📊 Monthly Commission' ? "Commissions must be uploaded via MasterSheet file." : "Paste row data here..."}
                       className={cn(
                         "w-full h-32 glass-input resize-none text-[10px] font-mono leading-tight transition-all",
                         activeCategory === '📊 Monthly Commission' && "opacity-50 cursor-not-allowed bg-white/5"
                       )}
                     />
                     <button 
                       onClick={handleProcessPaste}
                       disabled={isProcessing || !pasteData.trim() || activeCategory === '📊 Monthly Commission'}
                       className="w-full btn-primary !py-2 disabled:opacity-50"
                     >
                       {isProcessing ? 'Processing...' : 'Process Paste Data'}
                     </button>
                  </div>
               </div>

               <AnimatePresence>
                 {error && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                       <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
                       <div className="space-y-1">
                          <p className="text-sm font-bold text-red-400">Error Occurred</p>
                          <p className="text-xs text-red-400/80 font-medium leading-relaxed font-mono whitespace-pre-wrap">{error}</p>
                       </div>
                       <button onClick={() => setError(null)} className="ml-auto text-red-400/50 hover:text-red-400 p-1">✕</button>
                    </motion.div>
                 )}
                 {processingSummary && (
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                      <CheckCircle2 size={18} className="text-emerald-400" />
                      <p className="text-sm font-medium text-emerald-400">{processingSummary}</p>
                      <button onClick={() => setProcessingSummary(null)} className="ml-auto text-emerald-400/50 hover:text-emerald-400">✕</button>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>
         </div>
      </section>

      {/* Cloud Data Audit Summary */}
      <section className="space-y-4">
         <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg flex items-center gap-2">
               <Activity size={18} className="text-cyan-400" />
               Cloud Data Stewardship
            </h3>
            <button 
              onClick={loadCloudStats}
              disabled={isStatsLoading}
              className="text-[10px] font-bold text-indigo-400 hover:underline flex items-center gap-1"
            >
              <History size={12} className={cn(isStatsLoading && "animate-spin")} />
              Refresh Audit
            </button>
         </div>
         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.entries(cloudStats).sort((a,b) => b[0].localeCompare(a[0])).map(([month, count]) => (
              <div key={month} className="glass-card !p-4 border-white/5 bg-white/[0.02]">
                 <p className="text-[10px] font-black uppercase text-white/30 tracking-widest">{formatDate(month)}</p>
                 <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-xl font-black text-white">{count}</span>
                    <span className="text-[10px] font-bold text-white/20">Records</span>
                 </div>
              </div>
            ))}
            {Object.keys(cloudStats).length === 0 && !isStatsLoading && (
              <div className="col-span-full py-8 text-center glass rounded-2xl border border-dashed border-white/5 text-white/20 italic text-xs">
                No cloud commission records detected. Sync via MasterSheet.
              </div>
            )}
            {isStatsLoading && (
              <div className="col-span-full py-8 text-center text-white/20 italic text-xs">
                Auditing cloud storage...
              </div>
            )}
         </div>
      </section>

      {/* Manual Host Roster Editor (MasterSheet Override) */}
      <section className="space-y-4">
         <div className="flex items-center justify-between">
           <h3 className="font-bold text-lg flex items-center gap-2">
              <Shield size={18} className="text-indigo-400" />
              MasterSheet Manual Override (Roster)
           </h3>
           <p className="text-[10px] text-white/30 font-mono italic">Directly edit Host credentials and profile info</p>
         </div>
         <div className="glass-card !p-0">
            <RosterManualEditor 
              hosts={rosterHosts} 
              onRefresh={loadRoster} 
              activeCategory={activeCategory}
              isLoading={isRosterLoading}
            />
         </div>
      </section>

      {/* Poppo Agent Integration */}
      <section className="space-y-4">
         <h3 className="font-bold text-lg flex items-center gap-2">
            <Shield size={18} className="text-indigo-400" />
            Poppo Agent Portal
         </h3>
         <div className="glass-card p-12 text-center space-y-6">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto border border-indigo-500/20 shadow-xl shadow-indigo-500/10">
               <Shield size={40} className="text-indigo-400" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
               <h4 className="text-xl font-black text-white tracking-tight">Access Agent Portal</h4>
               <p className="text-xs text-white/40 leading-relaxed font-medium">
                  To ensure maximum compatibility and security, please access the official Poppo Agent Management system in a new secure browser window.
               </p>
            </div>
            <a 
               href="https://agent.vshowapi.com/login" 
               target="_blank" 
               rel="noopener noreferrer"
               className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] transition-all shadow-xl shadow-indigo-500/20 active:scale-95 group"
            >
               Open Poppo Management Portal
               <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </a>
         </div>
      </section>

      {/* Upload History */}
      <section className="space-y-4">
         <h3 className="font-bold text-lg flex items-center gap-2">
            <History size={18} className="text-amber-400" />
            Upload History
         </h3>
         <div className="glass-card !p-0 overflow-hidden">
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                       <th className="px-6 py-4">Status</th>
                       <th className="px-6 py-4">File / Entry Name</th>
                       <th className="px-6 py-4 text-center">Matched</th>
                       <th className="px-6 py-4">Timestamp</th>
                       <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {files.map(file => (
                      <tr 
                        key={file.id} 
                        onClick={() => loadFileDetail(file)}
                        className="hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4">
                           <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                             {file.status}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                           <div className="font-bold group-hover:text-amber-400 transition-colors">{file.name}</div>
                           <div className="text-[10px] text-white/30 mt-0.5">{file.category}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                           <span className="font-mono text-cyan-400 font-bold">{file.matchedCount}</span>
                        </td>
                        <td className="px-6 py-4 text-white/40 text-xs">
                           {formatDate(file.timestamp)}
                        </td>
                        <td className="px-6 py-4 text-right">
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               deleteFile(file.id);
                             }} 
                             className="p-2 hover:bg-red-500/10 rounded-lg text-white/20 hover:text-red-400"
                           >
                             <Trash2 size={16} />
                           </button>
                        </td>
                      </tr>
                    ))}
                    {files.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-white/20 italic">No history records yet</td>
                      </tr>
                    )}
                  </tbody>
               </table>
            </div>
         </div>
      </section>

      <AnimatePresence>
        {selectedFileDetail && (
          <DataSpotlight 
            file={selectedFileDetail}
            data={detailData}
            isLoading={isDetailLoading}
            onClose={() => setSelectedFileDetail(null)}
            onUpdateRow={handleUpdateDetailRow}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { FirebaseService } from '../../lib/firebaseService';
import { LivehouseApiService } from '../../lib/livehouseApi';
import { LivehouseDataRow } from '../../types/livehouse';
import { Storage } from '../../lib/storage';

export const LivehouseData = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [localData, setLocalData] = useState<LivehouseDataRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Attendance query states
  const [queryEventId, setQueryEventId] = useState('2026-06-10_0700_PM_MANILA_TIME_SOLO_LIVEHOUSE_1780402549163_20:15:49');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [isQuerying, setIsQuerying] = useState(false);

  const handleQueryAttendance = async () => {
    setIsQuerying(true);
    try {
      const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../../lib/firebase');
      
      let data = null;
      // Check doc ID first
      const docRef = doc(db, 'attendance', queryEventId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        data = docSnap.data();
      } else {
        // Fallback to eventId field
        const q = query(collection(db, 'attendance'), where('eventId', '==', queryEventId));
        const qs = await getDocs(q);
        if (!qs.empty) {
          data = qs.docs[0].data();
        }
      }
      setQueryResult(data || { error: 'No attendance record found for this Event ID.' });
    } catch (err: any) {
      setQueryResult({ error: err.message });
    } finally {
      setIsQuerying(false);
    }
  };

  // Load from Firestore on mount
  useEffect(() => {
    loadFirestoreData();
  }, []);

  const loadFirestoreData = async () => {
    setIsLoading(true);
    try {
      const data = await FirebaseService.getLivehouseSchedule();
      setLocalData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setLastSyncStatus(null);
    setErrorMessage('');

    try {
      // 1. Fetch raw data from the Spreadsheet API
      const freshData = await LivehouseApiService.fetchLivehouseData(true);

      if (!freshData || freshData.length === 0) {
        setLastSyncStatus('error');
        setErrorMessage('The Spreadsheet API returned empty data or "Unreachable". Please check the Google Apps Script.');
        setIsSyncing(false);
        return;
      }

      // 2. Save directly to Firestore
      await FirebaseService.saveLivehouseSchedule(freshData);
      
      // 3. Log the system activity
      const authState = Storage.getAuthState();
      await FirebaseService.logSystemActivity(
        `Admin "${authState.nickname || authState.name}" manually synced Livehouse Schedule from Google Spreadsheet. Imported ${freshData.length} timeslots.`,
        'Info'
      );

      setLocalData(freshData);
      setLastSyncStatus('success');
    } catch (err) {
      console.error(err);
      setLastSyncStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Unknown sync error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0B0E] p-4 md:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#D4AF37]/10 rounded-xl border border-[#D4AF37]/20">
                <Database className="text-[#D4AF37]" size={24} />
              </div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                Livehouse Data Sync
              </h1>
            </div>
            <p className="text-sm text-[#A09E9A] leading-relaxed max-w-2xl">
              This page acts as the bridge between your Google Spreadsheet and the NINE app.
              Click "Sync from Spreadsheet" to fetch the latest schedule and push it to the app's real-time database.
            </p>
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black uppercase tracking-wider text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)]"
          >
            <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? 'Syncing...' : 'Sync from Spreadsheet'}
          </button>
        </div>

        {/* Sync Status Notifications */}
        {lastSyncStatus === 'success' && (
          <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
            <CheckCircle size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Sync Successful</p>
              <p className="text-xs text-emerald-400/80 mt-1">Successfully imported {localData.length} records into the app database. The Livehouse Calendar is now updated for all users.</p>
            </div>
          </div>
        )}

        {lastSyncStatus === 'error' && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertTriangle size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Sync Failed</p>
              <p className="text-xs text-red-400/80 mt-1">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Current Database State Preview */}
        <div className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-white/50 flex items-center gap-2">
            <Clock size={14} />
            Current App Database (Preview)
          </h2>

          <div className="bg-[#140E0A] border border-[#D4AF37]/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1C1511] border-b border-[#D4AF37]/10">
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#A09E9A] whitespace-nowrap">Date</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#A09E9A] whitespace-nowrap">Timeslot</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#D4AF37] whitespace-nowrap">Poppo ID 1</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[#D4AF37] whitespace-nowrap">Poppo ID 2</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-white/40 text-sm font-bold uppercase tracking-wider">
                        Loading database...
                      </td>
                    </tr>
                  ) : localData.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-white/40 text-sm font-bold uppercase tracking-wider">
                        No records found in Firestore. Please sync from the spreadsheet.
                      </td>
                    </tr>
                  ) : (
                    localData.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 text-xs font-mono text-white/70">{row.date}</td>
                        <td className="p-4 text-xs font-mono text-white/70">{row.timeslot}</td>
                        <td className="p-4 text-xs font-bold text-white">
                          {row.slot_1.available ? (
                            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded uppercase text-[9px] tracking-wider">Available</span>
                          ) : (
                            row.slot_1.poppo_id || <span className="text-white/20 italic">Unknown</span>
                          )}
                        </td>
                        <td className="p-4 text-xs font-bold text-white">
                          {row.slot_2.available ? (
                            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded uppercase text-[9px] tracking-wider">Available</span>
                          ) : (
                            row.slot_2.poppo_id || <span className="text-white/20 italic">Unknown</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {localData.length > 50 && (
              <div className="p-3 border-t border-white/5 text-center bg-[#0A0B0E]/50">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                  Showing first 50 of {localData.length} records
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ad-Hoc Attendance Query */}
      <div className="space-y-4 mt-8 pt-8 border-t border-white/5 max-w-6xl mx-auto w-full">
        <h2 className="text-sm font-black uppercase tracking-widest text-white/50 flex items-center gap-2">
          <Database size={14} />
          Direct Attendance Lookup
        </h2>
        <div className="bg-[#140E0A] border border-[#D4AF37]/10 rounded-2xl p-6">
          <div className="flex gap-4 mb-4">
            <input 
              type="text" 
              value={queryEventId}
              onChange={e => setQueryEventId(e.target.value)}
              className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-[#D4AF37]/50 focus:outline-none"
              placeholder="Enter Event ID..."
            />
            <button 
              onClick={handleQueryAttendance}
              disabled={isQuerying}
              className="px-6 py-2 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black font-black uppercase tracking-wider text-xs rounded-xl disabled:opacity-50"
            >
              {isQuerying ? 'Searching...' : 'Lookup Event'}
            </button>
          </div>
          
          {queryResult && (
            <div className="bg-black/80 rounded-xl p-4 border border-white/5 overflow-x-auto max-h-[400px]">
              <pre className="text-xs font-mono text-emerald-400">
                {JSON.stringify(queryResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

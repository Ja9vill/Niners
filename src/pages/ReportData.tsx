import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Storage } from '../lib/storage';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { Loader2, UploadCloud, Search, Trash2, CheckCircle2, ChevronDown, Plus, FileText, Image as ImageIcon, Info, X, Pencil, CalendarDays } from 'lucide-react';

type TabType = 'PK' | 'Stream';
type StreamType = 'daily' | 'weekly' | 'monthly';

const calculateMergedPKRatings = (rows: any[]) => {
  if (rows.length === 0) return rows;

  // 1. Find max values across all rows
  let maxPkScore = 0;
  let maxSessions = 0;

  rows.forEach(r => {
    const pks = Number(String(r.pk_score || '0').replace(/,/g, '')) || 0;
    const sess = Number(String(r.sessions || '0').replace(/,/g, '')) || 0;
    if (pks > maxPkScore) maxPkScore = pks;
    if (sess > maxSessions) maxSessions = sess;
  });

  if (maxPkScore === 0) maxPkScore = 1;
  if (maxSessions === 0) maxSessions = 1;

  // 2. Calculate for each row
  return rows.map(r => {
    const winRate = Number(String(r.win_percent || '0').replace(/%/g, '')) || 0;
    const pkScore = Number(String(r.pk_score || '0').replace(/,/g, '')) || 0;
    const sessions = Number(String(r.sessions || '0').replace(/,/g, '')) || 0;

    const WinRateScore = winRate;
    const PKScoreScore = (pkScore / maxPkScore) * 100;
    const SessionScore = (sessions / maxSessions) * 100;

    const PK_Rating = (WinRateScore * 0.45) + (PKScoreScore * 0.40) + (SessionScore * 0.15);

    return {
      ...r,
      pk_rating: PK_Rating.toFixed(2)
    };
  });
};

export const ReportData = () => {
  const authState = Storage.getAuthState();
  const isHost = String(authState.role || '').toLowerCase() === 'host' || String(authState.role || '').toLowerCase() === 'talent';

  // Portal into the static #modal-portal div in index.html (outside #root, immune to overflow:hidden)
  const portalRoot = React.useMemo(() => document.getElementById('modal-portal'), []);

  const [activeTab, setActiveTab] = useState<TabType>('PK');
  const [streamSubTab, setStreamSubTab] = useState<StreamType>('daily');

  // Form State - Reporter & Host
  const [hostSearchTerm, setHostSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [selectedHostId, setSelectedHostId] = useState(isHost ? authState.poppo_id : '');
  const [selectedHostName, setSelectedHostName] = useState(isHost ? (authState.nickname || authState.name || '') : '');

  // PK Reports State
  const [pkRows, setPkRows] = useState<any[]>([]);
  const [isExtractingPK, setIsExtractingPK] = useState(false);
  const [isSubmittingPK, setIsSubmittingPK] = useState(false);
  const [pkSuccess, setPkSuccess] = useState('');
  const [pkError, setPkError] = useState('');

  // Stream Reports State
  const [streamRows, setStreamRows] = useState<any[]>([]);
  const [isExtractingStream, setIsExtractingStream] = useState(false);
  const [isSubmittingStream, setIsSubmittingStream] = useState(false);
  const [streamSuccess, setStreamSuccess] = useState('');
  const [streamError, setStreamError] = useState('');

  // Stream Tab Specific State
  const [streamDate, setStreamDate] = useState(new Date().toISOString().split('T')[0]);

  // Modal State
  const [showCalculationInfo, setShowCalculationInfo] = useState(false);

  // ── Manual PK Entry State ────────────────────────────────────────────────
  const [manualStartDate, setManualStartDate] = useState('');
  const [manualEndDate, setManualEndDate] = useState('');
  const [manualWinPct, setManualWinPct] = useState('');
  const [manualScore, setManualScore] = useState('');
  const [manualSessions, setManualSessions] = useState('');
  const [manualRows, setManualRows] = useState<any[]>([]);
  const [manualDateError, setManualDateError] = useState('');

  // Validate date range — max 7 days
  const validateDateRange = (start: string, end: string): string => {
    if (!start || !end) return '';
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 'Invalid date';
    if (e < s) return 'End date must be on or after start date';
    const diffDays = (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 7) return 'Date range cannot exceed 7 days';
    return '';
  };

  // Format date range for table display: "Jun 20 – Jun 27"
  const formatDateRange = (start: string, end: string): string => {
    if (!start || !end) return '—';
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const s = new Date(start + 'T00:00:00').toLocaleDateString('en-US', opts);
    const e = new Date(end + 'T00:00:00').toLocaleDateString('en-US', opts);
    return start === end ? s : `${s} – ${e}`;
  };

  // Live rating preview for current form (single-entry, normalized to self)
  const liveRating = React.useMemo((): string => {
    const w = parseFloat(manualWinPct) || 0;
    const s = parseFloat(manualScore) || 0;
    const sess = parseFloat(manualSessions) || 0;
    if (w === 0 && s === 0 && sess === 0) return '—';
    const pkNorm  = s    > 0 ? 100 : 0;
    const sessNorm = sess > 0 ? 100 : 0;
    return ((w * 0.45) + (pkNorm * 0.40) + (sessNorm * 0.15)).toFixed(2);
  }, [manualWinPct, manualScore, manualSessions]);

  const hasManualData = manualWinPct !== '' || manualScore !== '' || manualSessions !== '';
  const canAddData = hasManualData && manualStartDate !== '' && manualEndDate !== '' && manualDateError === '';

  const addManualData = () => {
    const dateErr = validateDateRange(manualStartDate, manualEndDate);
    if (dateErr) { setManualDateError(dateErr); return; }
    if (!manualStartDate || !manualEndDate) { setManualDateError('Please select a date range'); return; }
    setManualDateError('');
    const newRow = {
      id: Date.now().toString(),
      start_date: manualStartDate,
      end_date: manualEndDate,
      win_percent: manualWinPct || '0',
      pk_score: parseFloat(manualScore) || 0,
      sessions: parseFloat(manualSessions) || 0,
    };
    setManualRows(prev => calculateMergedPKRatings([...prev, newRow]));
    setManualStartDate('');
    setManualEndDate('');
    setManualWinPct('');
    setManualScore('');
    setManualSessions('');
  };

  const editManualRow = (id: string) => {
    const row = manualRows.find((r: any) => r.id === id);
    if (!row) return;
    setManualStartDate(row.start_date || '');
    setManualEndDate(row.end_date || '');
    setManualWinPct(String(row.win_percent || ''));
    setManualScore(String(row.pk_score || ''));
    setManualSessions(String(row.sessions || ''));
    setManualRows(prev => calculateMergedPKRatings(prev.filter((r: any) => r.id !== id)));
  };

  const deleteManualRow = (id: string) => {
    setManualRows(prev => calculateMergedPKRatings(prev.filter((r: any) => r.id !== id)));
  };

  const overallRating = React.useMemo((): string => {
    if (manualRows.length === 0) return '—';
    const avg = manualRows.reduce((sum: number, r: any) => sum + (parseFloat(r.pk_rating) || 0), 0) / manualRows.length;
    return avg.toFixed(2);
  }, [manualRows]);

  const submitManualPKReports = async () => {
    if (manualRows.length === 0) { setPkError('No data to submit'); return; }
    if (!selectedHostId) { setPkError('Please select a Host first'); return; }
    setIsSubmittingPK(true);
    setPkError('');
    setPkSuccess('');
    try {
      const baseData = {
        reporterID: authState.poppo_id,
        reporterName: authState.nickname || authState.name || '',
        reporterRole: authState.role || 'Host',
        hostID: selectedHostId,
        hostNickname: selectedHostName,
        timestamp: new Date().toISOString(),
        entryMethod: 'manual',
      };
      for (const row of manualRows) {
        const { id, ...reportData } = row;
        await addDoc(collection(db, 'pk_reports'), { ...baseData, ...reportData });
      }
      setPkSuccess('✅ PK Report submitted successfully!');
      setManualRows([]);
      setTimeout(() => setPkSuccess(''), 5000);
    } catch (err: any) {
      setPkError('Failed to submit: ' + err.message);
    } finally {
      setIsSubmittingPK(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isHost) return;
    
    const searchHosts = async () => {
      if (!hostSearchTerm.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const token = authState.token || '';
        const res = await fetch(`/api/roster-management/search?query=${encodeURIComponent(hostSearchTerm)}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        setSearchResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchHosts, 500);
    return () => clearTimeout(debounce);
  }, [hostSearchTerm, isHost, authState.token]);

  const selectHost = (host: any) => {
    setSelectedHostId(host.poppo_id);
    setSelectedHostName(host.nickname || host.name);
    setHostSearchTerm(host.nickname || host.name);
    setShowDropdown(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'PK' | 'Stream') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'PK') {
      setIsExtractingPK(true);
      setPkError('');
    } else {
      setIsExtractingStream(true);
      setStreamError('');
    }

    try {
      const base64data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const endpoint = type === 'PK' ? '/api/extract-pk-report' : '/api/extract-stream-report';
      const body: any = {
        fileData: base64data,
        mimeType: file.type
      };
      if (type === 'Stream') {
        body.reportType = streamSubTab;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${res.status}`);
      }

      const { data } = await res.json();

      if (type === 'PK') {
        setPkRows(prev => calculateMergedPKRatings([...prev, { ...data, id: Date.now().toString() }]));
      } else {
        setStreamRows(prev => [...prev, { ...data, id: Date.now().toString(), _streamType: streamSubTab, _dateRange: streamDate }]);
      }
    } catch (err: any) {
      console.error(err);
      if (type === 'PK') setPkError(err.message || 'Error extracting PK data');
      else setStreamError(err.message || 'Error extracting Stream data');
    } finally {
      if (type === 'PK') setIsExtractingPK(false);
      else setIsExtractingStream(false);
      e.target.value = '';
    }
  };

  const removeRow = (id: string, type: 'PK' | 'Stream') => {
    if (type === 'PK') setPkRows(prev => calculateMergedPKRatings(prev.filter(r => r.id !== id)));
    else setStreamRows(prev => prev.filter(r => r.id !== id));
  };

  const updateRow = (id: string, field: string, value: any, type: 'PK' | 'Stream') => {
    if (type === 'PK') {
      setPkRows(prev => calculateMergedPKRatings(prev.map(r => r.id === id ? { ...r, [field]: value } : r)));
    } else {
      setStreamRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    }
  };

  const submitPKReports = async () => {
    if (pkRows.length === 0) {
      setPkError('No data to submit');
      return;
    }
    if (!selectedHostId) {
      setPkError('Please select a Host first');
      return;
    }

    setIsSubmittingPK(true);
    setPkError('');
    setPkSuccess('');

    try {
      const reporterRole = String(authState.role || 'host').toLowerCase();
      const baseData = {
        reporterID: authState.poppo_id,
        reporterName: authState.nickname || authState.name || '',
        reporterRole: authState.role || 'Host',
        hostID: selectedHostId,
        hostNickname: selectedHostName,
        timestamp: new Date().toISOString()
      };

      for (const row of pkRows) {
        const { id, ...reportData } = row;
        await addDoc(collection(db, 'pk_reports'), {
          ...baseData,
          ...reportData
        });
      }

      setPkSuccess('PK Reports submitted successfully!');
      setPkRows([]);
      setTimeout(() => setPkSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setPkError('Failed to submit reports: ' + err.message);
    } finally {
      setIsSubmittingPK(false);
    }
  };

  const submitStreamReports = async () => {
    if (streamRows.length === 0) {
      setStreamError('No data to submit');
      return;
    }
    if (!selectedHostId) {
      setStreamError('Please select a Host first');
      return;
    }

    setIsSubmittingStream(true);
    setStreamError('');
    setStreamSuccess('');

    try {
      const baseData = {
        reporterID: authState.poppo_id,
        reporterName: authState.nickname || authState.name || '',
        reporterRole: authState.role || 'Host',
        hostID: selectedHostId,
        hostNickname: selectedHostName,
        timestamp: new Date().toISOString()
      };

      for (const row of streamRows) {
        const { id, _streamType, _dateRange, ...reportData } = row;
        await addDoc(collection(db, 'stream_reports'), {
          ...baseData,
          type: _streamType,
          dateRange: _dateRange,
          extractedData: reportData
        });
      }

      setStreamSuccess('Stream Reports submitted successfully!');
      setStreamRows([]);
      setTimeout(() => setStreamSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setStreamError('Failed to submit reports: ' + err.message);
    } finally {
      setIsSubmittingStream(false);
    }
  };

  return (
    <>
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar">


      {/* Common Header: Host Selection */}
      <div className="glass-card relative z-10 overflow-visible space-y-3 mb-4 p-3 md:p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="text-[#D4AF37]" size={16} />
          <h2 className="text-sm font-black uppercase tracking-widest text-[#D4AF37]">Reporting Context</h2>
        </div>

        {!isHost ? (
          <div className="space-y-3 max-w-xl">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Reporter ID</label>
                <div className="bg-white/5 rounded-lg px-3 py-1.5 text-xs text-white/50">{authState.poppo_id}</div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Reporter Role</label>
                <div className="bg-white/5 rounded-lg px-3 py-1.5 text-xs text-white/50">{authState.role}</div>
              </div>
            </div>

            <div className="space-y-1 w-full" ref={searchRef}>
              <label className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37] block mb-1">Select Host <span className="text-red-400">*</span></label>
              <div className="global-placeholder flex w-full items-center justify-between gap-2 bg-gradient-to-br from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/20 border-t-[#D4AF37]/40 rounded-xl px-4 py-2 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(212,175,55,0.3)] relative z-20 overflow-visible">
                <div className="relative flex-1 flex items-center w-full">
                  <Search className="text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.5)] mr-3 shrink-0" size={16} />
                  <input
                    type="text"
                    placeholder="Search Host by ID or Nickname..."
                    value={hostSearchTerm}
                    onChange={(e) => {
                      setHostSearchTerm(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="w-full bg-transparent border-none text-xs text-[#F0EFE8] placeholder:text-[#A09E9A]/60 focus:outline-none focus:ring-0"
                  />
                  {isSearching && (
                    <Loader2 className="animate-spin text-[#D4AF37] ml-2" size={14} />
                  )}
                </div>
                
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#140D0B] border border-[#D4AF37]/30 rounded-xl overflow-hidden z-[100] max-h-40 overflow-y-auto custom-scrollbar shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                    {searchResults.map((result: any) => (
                      <div
                        key={result.poppo_id}
                        onClick={() => selectHost(result)}
                        className="px-4 py-2 cursor-pointer hover:bg-white/5 border-b border-white/5 last:border-0 flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-white">{result.nickname || result.name}</p>
                          <p className="text-[9px] text-white/40 font-black tracking-widest uppercase">ID: {result.poppo_id}</p>
                        </div>
                        {selectedHostId === result.poppo_id && <CheckCircle2 className="text-emerald-400" size={14} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedHostId && (
                <p className="text-[9px] text-emerald-400 font-bold mt-1.5">
                  ✓ Reporting for: {selectedHostName} ({selectedHostId})
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-w-xl">
             <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Host ID</label>
                <div className="bg-white/5 rounded-lg px-3 py-1.5 text-xs text-white/50">{authState.poppo_id}</div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Nickname</label>
                <div className="bg-white/5 rounded-lg px-3 py-1.5 text-xs text-white/50">{authState.nickname || authState.name}</div>
              </div>
          </div>
        )}
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 mb-4 pb-4">
        <button
          onClick={() => setActiveTab('PK')}
          className={`global-block-1 px-5 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
            activeTab === 'PK' ? 'text-[#D4AF37] shadow-[inset_0_0_15px_rgba(212,175,55,0.2)] border-[#D4AF37]/50' : 'text-white/40 hover:text-white/80 border-transparent'
          }`}
        >
          PK Reporting
        </button>
        <button
          onClick={() => setActiveTab('Stream')}
          className={`global-block-1 px-5 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
            activeTab === 'Stream' ? 'text-indigo-400 shadow-[inset_0_0_15px_rgba(99,102,241,0.2)] border-indigo-500/50' : 'text-white/40 hover:text-white/80 border-transparent'
          }`}
        >
          Streaming Data
        </button>
      </div>

      {/* PK Reporting Tab Content */}
      {activeTab === 'PK' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="flex flex-col xl:flex-row items-start xl:items-center gap-8">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-4">
                <label className="relative cursor-pointer group">
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'PK')} disabled={isExtractingPK} />
                  <div className={`global-block-1 flex items-center gap-2 px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer ${
                    isExtractingPK ? 'opacity-50 cursor-not-allowed text-white/50 border-white/10' : 'text-[#D4AF37] hover:scale-105 border-[#D4AF37]/30 shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:text-[#FFB800]'
                  }`}>
                    {isExtractingPK ? <Loader2 className="animate-spin" size={14} /> : <UploadCloud size={14} />}
                    {isExtractingPK ? 'Extracting...' : (pkRows.length > 0 ? 'Upload More' : 'Upload PK Screenshot')}
                  </div>
                </label>
              </div>
              <p className="text-xs text-white/40">Upload a screenshot matching the layout shown on the right to auto-extract data.</p>
            </div>

            {/* Visual Guide mimicking the provided photo */}
            <div className="w-full xl:w-auto p-2 md:p-3 rounded-2xl glass-card border border-white/10 shrink-0 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative">
              <div className="flex flex-wrap items-center justify-between text-white/80 font-bold mb-2 px-1 gap-1 text-[9px] md:text-[10px]">
                <span className="border-b-2 border-white pb-0.5 whitespace-nowrap">Random PK 🎁</span>
                <button 
                  onClick={() => setShowCalculationInfo(true)}
                  className="p-1 rounded-full bg-white/5 hover:bg-white/20 transition-colors"
                  title="How is this calculated?"
                >
                  <Info size={12} className="text-[#D4AF37]" />
                </button>
              </div>
              
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 text-[9px] md:text-[10px] text-white/80 font-medium mb-3">
                {pkRows.length > 0 ? `${pkRows[pkRows.length - 1].start_date || 'YYYY-MM-DD'} - ${pkRows[pkRows.length - 1].end_date || 'YYYY-MM-DD'}` : 'YYYY-MM-DD - YYYY-MM-DD'}
                <svg className="w-2.5 h-2.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>

              <div className="grid grid-cols-4 gap-1.5 md:gap-2">
                {(() => {
                  let totalWin = 0;
                  let totalPk = 0;
                  let totalSessions = 0;
                  let totalRating = 0;
                  
                  pkRows.forEach(r => {
                    totalWin += Number(String(r.win_percent || '0').replace(/%/g, '')) || 0;
                    totalPk += Number(String(r.pk_score || '0').replace(/,/g, '')) || 0;
                    totalSessions += Number(String(r.sessions || '0').replace(/,/g, '')) || 0;
                    totalRating += Number(r.pk_rating || 0);
                  });

                  const count = pkRows.length || 1;
                  const avgWin = (totalWin / count).toFixed(2);
                  const avgRating = (totalRating / count).toFixed(2);
                  
                  const hasData = pkRows.length > 0;
                  const displayWin = hasData ? `${avgWin}%` : '0%';
                  const displayPk = hasData ? Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(totalPk) : '0';
                  const displaySessions = hasData ? Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(totalSessions) : '0';
                  const displayRating = hasData ? avgRating : '-';

                  return (
                    <>
                      <div className="global-tier-1 flex-1 min-w-0 rounded-xl p-2 flex flex-col justify-center cursor-default overflow-hidden">
                        <div className="text-white/90 text-[7px] md:text-[8px] font-semibold mb-0.5 truncate">Avg Win%</div>
                        <div className="text-white font-black text-[9px] md:text-[10px] drop-shadow-md truncate">{displayWin}</div>
                      </div>
                      <div className="global-tier-2 flex-1 min-w-0 rounded-xl p-2 flex flex-col justify-center cursor-default overflow-hidden">
                        <div className="text-white/90 text-[7px] md:text-[8px] font-semibold mb-0.5 truncate">Total Score</div>
                        <div className="text-white font-black text-[9px] md:text-[10px] drop-shadow-md truncate">{displayPk}</div>
                      </div>
                      <div className="global-tier-3 flex-1 min-w-0 rounded-xl p-2 flex flex-col justify-center cursor-default overflow-hidden">
                        <div className="text-white/90 text-[7px] md:text-[8px] font-semibold mb-0.5 truncate">Total Sessions</div>
                        <div className="text-white font-black text-[9px] md:text-[10px] drop-shadow-md truncate">{displaySessions}</div>
                      </div>
                      <div className="global-tier-4 flex-1 min-w-0 rounded-xl p-2 flex flex-col justify-center cursor-default overflow-hidden">
                        <div className="text-white/90 text-[7px] md:text-[8px] font-semibold mb-0.5 truncate">Avg Rating</div>
                        <div className="text-white font-black text-[9px] md:text-[10px] drop-shadow-md truncate">{displayRating}</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {pkError && <p className="text-sm text-red-400 font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">{pkError}</p>}
          {pkSuccess && <p className="text-sm text-emerald-400 font-bold bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">{pkSuccess}</p>}

          {pkRows.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-white/60">Extracted Data Preview (Edit if needed)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pkRows.map((row) => (
                  <div key={row.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4 relative group">
                    <button onClick={() => removeRow(row.id, 'PK')} aria-label="Remove Row" title="Remove Row" className="absolute top-2 right-2 p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100">
                      <Trash2 size={16} />
                    </button>
                    
                    <div className="grid grid-cols-2 gap-3 pr-8">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Start Date</label>
                        <input type="text" aria-label="Start Date" title="Start Date" value={row.start_date || ''} onChange={(e) => updateRow(row.id, 'start_date', e.target.value, 'PK')} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]/50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">End Date</label>
                        <input type="text" aria-label="End Date" title="End Date" value={row.end_date || ''} onChange={(e) => updateRow(row.id, 'end_date', e.target.value, 'PK')} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]/50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Win %</label>
                        <input type="text" aria-label="Win Percent" title="Win Percent" value={row.win_percent || ''} onChange={(e) => updateRow(row.id, 'win_percent', e.target.value, 'PK')} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]/50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">PK Score</label>
                        <input type="number" aria-label="PK Score" title="PK Score" value={row.pk_score || 0} onChange={(e) => updateRow(row.id, 'pk_score', Number(e.target.value), 'PK')} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]/50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Sessions</label>
                        <input type="number" aria-label="Sessions" title="Sessions" value={row.sessions || 0} onChange={(e) => updateRow(row.id, 'sessions', Number(e.target.value), 'PK')} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]/50" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40">PK Rating</label>
                        <input type="text" aria-label="PK Rating" title="PK Rating" value={row.pk_rating || ''} onChange={(e) => updateRow(row.id, 'pk_rating', e.target.value, 'PK')} placeholder="e.g. S, A, B" className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]/50" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'PK')} disabled={isExtractingPK} />
                  <div className="text-sm font-bold text-white/50 hover:text-white transition-colors underline decoration-white/30 underline-offset-4">
                    + Extract Another Image
                  </div>
                </label>
                <button
                  onClick={submitPKReports}
                  disabled={isSubmittingPK || !selectedHostId}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] md:text-xs transition-all flex justify-center items-center gap-2 cursor-pointer ${
                    isSubmittingPK || !selectedHostId ? 'bg-black/40 opacity-50 cursor-not-allowed text-white/50 border border-white/10' : 'bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black hover:scale-105 shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] border-none'
                  }`}
                >
                  {isSubmittingPK ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                  {isSubmittingPK ? 'Submitting...' : 'Submit PK Reports'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Streaming Data Tab Content */}
      {activeTab === 'Stream' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="flex items-center bg-black/40 border border-white/10 p-1 rounded-lg w-fit mb-4">
            {['daily', 'weekly', 'monthly'].map((type) => (
              <button
                key={type}
                onClick={() => {
                  setStreamSubTab(type as StreamType);
                  if (type === 'daily') setStreamDate(new Date().toISOString().split('T')[0]);
                  else if (type === 'weekly') setStreamDate('This Week');
                  else if (type === 'monthly') setStreamDate('This Month');
                }}
                className={`px-4 py-1.5 rounded-md text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${
                  streamSubTab === type 
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black shadow-[0_2px_10px_rgba(212,175,55,0.3)]' 
                    : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
            <div className="space-y-1 w-full md:w-auto">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40">Date / Period Identifier</label>
              {streamSubTab === 'daily' ? (
                <input 
                  type="date" 
                  aria-label="Stream Date"
                  title="Stream Date"
                  value={streamDate}
                  onChange={(e) => setStreamDate(e.target.value)}
                  className="w-full md:w-56 bg-[#0A0604] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]/50"
                />
              ) : streamSubTab === 'weekly' ? (
                <select
                  aria-label="Weekly Stream Period"
                  title="Weekly Stream Period"
                  value={streamDate}
                  onChange={(e) => setStreamDate(e.target.value)}
                  className="w-full md:w-56 bg-[#0A0604] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]/50 appearance-none"
                >
                  <option value="This Week">This Week</option>
                  <option value="Last Week">Last Week</option>
                </select>
              ) : (
                <select
                  aria-label="Monthly Stream Period"
                  title="Monthly Stream Period"
                  value={streamDate}
                  onChange={(e) => setStreamDate(e.target.value)}
                  className="w-full md:w-56 bg-[#0A0604] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D4AF37]/50 appearance-none"
                >
                  <option value="This Month">This Month</option>
                  <option value="Last Month">Last Month</option>
                </select>
              )}
            </div>
            
            <label className="relative cursor-pointer group">
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'Stream')} disabled={isExtractingStream} />
              <div className={`global-block-1 flex items-center gap-2 px-5 py-2 rounded-lg font-black uppercase tracking-widest text-[9px] md:text-[10px] transition-all cursor-pointer ${
                isExtractingStream ? 'opacity-50 cursor-not-allowed text-white/50 border-white/10' : 'text-indigo-400 hover:scale-105 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:text-indigo-300'
              }`}>
                {isExtractingStream ? <Loader2 className="animate-spin" size={14} /> : <UploadCloud size={14} />}
                {isExtractingStream ? 'Extracting...' : (streamRows.length > 0 ? 'Upload More' : `Upload ${streamSubTab} Screenshot`)}
              </div>
            </label>
          </div>

          {streamError && <p className="text-sm text-red-400 font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">{streamError}</p>}
          {streamSuccess && <p className="text-sm text-emerald-400 font-bold bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">{streamSuccess}</p>}

          {streamRows.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white/60">Extracted {streamSubTab.toUpperCase()} Data Preview</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {streamRows.map((row) => {
                  const { id, _streamType, _dateRange, ...data } = row;
                  return (
                    <div key={row.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-3 relative group">
                      <button onClick={() => removeRow(row.id, 'Stream')} aria-label="Remove Row" title="Remove Row" className="absolute top-1.5 right-1.5 p-1.5 text-red-400 hover:bg-red-400/10 rounded-md transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 z-10">
                        <Trash2 size={14} />
                      </button>
                      
                      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center pb-2 border-b border-white/5 pr-8">
                        <span className="px-2 py-0.5 bg-white/10 rounded-md text-[9px] font-bold uppercase tracking-wider text-white/70">{_streamType}</span>
                        <input type="text" aria-label="Date Range" title="Date Range" value={row._dateRange || ''} onChange={(e) => updateRow(row.id, '_dateRange', e.target.value, 'Stream')} className="bg-black/40 border border-white/10 rounded-md px-2 py-1 text-[10px] md:text-xs text-white focus:outline-none focus:border-indigo-500/50 w-full sm:w-auto" />
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.keys(data).filter(k => typeof data[k] !== 'object' || Array.isArray(data[k])).slice(0, 12).map(key => (
                          <div key={key} className="flex flex-col space-y-1">
                            <label className="text-[9px] text-white/40 font-black uppercase tracking-widest truncate" title={key.replace(/_/g, ' ')}>
                              {key.replace(/_/g, ' ')}
                            </label>
                            <input 
                              type="text" 
                              aria-label={key.replace(/_/g, ' ')}
                              title={key.replace(/_/g, ' ')}
                              value={Array.isArray(data[key]) ? JSON.stringify(data[key]) : data[key] || ''} 
                              onChange={(e) => {
                                let val: any = e.target.value;
                                if (Array.isArray(data[key])) {
                                  try { val = JSON.parse(val); } catch(err) {}
                                } else if (typeof data[key] === 'number') {
                                  val = Number(val);
                                }
                                updateRow(row.id, key, val, 'Stream');
                              }} 
                              className="w-full bg-black/40 border border-white/10 rounded-md px-2 py-1.5 text-[10px] md:text-xs text-white/90 focus:outline-none focus:border-indigo-500/50" 
                            />
                          </div>
                        ))}
                      </div>
                      {Object.keys(data).length > 12 && <div className="text-[9px] text-white/30 italic">+{Object.keys(data).length - 12} more fields extracted...</div>}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'Stream')} disabled={isExtractingStream} />
                  <div className="text-xs font-bold text-white/50 hover:text-white transition-colors underline decoration-white/30 underline-offset-4">
                    + Extract Another Image
                  </div>
                </label>
                <button
                  onClick={submitStreamReports}
                  disabled={isSubmittingStream || !selectedHostId}
                  className={`w-full sm:w-auto px-5 py-2.5 rounded-lg font-black uppercase tracking-widest text-[9px] md:text-[10px] transition-all flex justify-center items-center gap-2 cursor-pointer ${
                    isSubmittingStream || !selectedHostId ? 'bg-black/40 opacity-50 cursor-not-allowed text-white/50 border border-white/10' : 'bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black hover:scale-105 shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] border-none'
                  }`}
                >
                  {isSubmittingStream ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                  {isSubmittingStream ? 'Submitting...' : 'Submit Stream Reports'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
    {showCalculationInfo && portalRoot && createPortal(
        <div 
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-md"
          onClick={() => setShowCalculationInfo(false)}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <div 
              className="bg-[#0A0604]/80 backdrop-blur-2xl border border-[#D4AF37]/20 rounded-2xl p-5 max-w-sm w-full shadow-[0_20px_60px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(212,175,55,0.1)] relative my-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowCalculationInfo(false)}
                aria-label="Close Info"
                title="Close Info"
                className="absolute top-4 right-4 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
              <h3 className="text-lg font-black uppercase tracking-widest text-[#D4AF37] mb-4 flex items-center gap-2">
                <Info size={20} />
                Auto-Calculation Logic
              </h3>
              
              <div className="space-y-4 text-xs text-white/70 leading-relaxed">
                <p>Every time PK data is added or merged, a <strong>PK Rating</strong> is calculated for each entry based on normalized metrics.</p>
                
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
                  <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Normalization</h4>
                  <p>• <strong>WinRateScore</strong> = win_percent <em>(already 0–100)</em></p>
                  <p>• <strong>PKScoreScore</strong> = (pk_score / highest_pk_score_in_merged_data) × 100</p>
                  <p>• <strong>SessionScore</strong> = (sessions / highest_sessions_in_merged_data) × 100</p>
                </div>

                <div className="bg-gradient-to-r from-[#D4AF37]/10 to-[#F59E0B]/5 p-4 rounded-xl border border-[#D4AF37]/20">
                  <h4 className="font-bold text-[#D4AF37] uppercase tracking-wider text-[10px] mb-2">Final PK Rating Formula</h4>
                  <p className="font-mono text-[10px] text-white/90">
                    PK_Rating =<br/>
                    (WinRateScore × 0.45) +<br/>
                    (PKScoreScore × 0.40) +<br/>
                    (SessionScore × 0.15)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>,
        portalRoot
      )}
    </>
  );
};

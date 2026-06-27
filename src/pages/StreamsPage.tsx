import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Search, Trash2, CheckCircle2, TrendingUp, Users, Activity, ChevronLeft, ChevronRight, Edit2, Clock, DollarSign, Eye, EyeOff, Info, X } from 'lucide-react';
import { Storage } from '../lib/storage';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, setDoc, query, where, getDocs, deleteDoc, orderBy } from 'firebase/firestore';
import { FirebaseService } from '../lib/firebaseService';
import { cn } from '../lib/utils';

type StreamTab = 'rpk' | 'stream' | 'fanbase';
type StreamSubTab = 'daily' | 'weekly' | 'monthly';

// ── Format Helpers ──────────────────────────────────────────────────────────

const formatComma = (val: string | number): string => {
  if (val === '' || val === null || val === undefined) return '';
  const num = typeof val === 'string' ? val.replace(/,/g, '') : String(val);
  const parts = num.split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.length > 1 ? `${intPart}.${parts[1]}` : intPart;
};

const parseNum = (val: string): number => {
  const cleaned = val.replace(/,/g, '');
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) {
    console.warn(`[parseNum] Invalid number input: "${val}" (cleaned: "${cleaned}")`);
    return 0;
  }
  return parsed;
};

const formatDuration = (val: string): string => {
  const cleaned = val.replace(/[^0-9:]/g, '');
  const parts = cleaned.split(':');
  if (parts.length === 1) {
    const s = parts[0];
    if (s.length <= 2) return s;
    return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
  }
  if (parts.length >= 2) {
    const h = parts[0].slice(0, 2).padStart(2, '0');
    const m = parts[1].slice(0, 2).padStart(2, '0');
    return `${h}:${m}`;
  }
  return cleaned;
};

const getWeekDates = (offset: number) => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - diffToMonday);
  const targetMonday = new Date(thisMonday);
  targetMonday.setDate(thisMonday.getDate() - 7 + offset * 7);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(targetMonday);
    d.setDate(targetMonday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return { monday: dates[0], sunday: dates[6], dates };
};

const getMonthDates = (offset: number) => {
  const now = new Date();
  const targetMonth = new Date(now.getFullYear(), now.getMonth() - 1 + offset, 1);
  const year = targetMonth.getFullYear();
  const month = targetMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dates: string[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return { firstDate: dates[0], lastDate: dates[dates.length - 1], dates };
};

const displayDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const displayFullDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.toLocaleDateString('en-US', { weekday: 'short' })}, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

export const StreamsPage = () => {
  const authState = Storage.getAuthState();
  const isHost = String(authState.role || '').toLowerCase() === 'host' || String(authState.role || '').toLowerCase() === 'talent';
  const isDirector = String(authState.role || '').toLowerCase() === 'director';

  const [activeTab, setActiveTab] = useState<StreamTab>('rpk');

  // ── Host Search ─────────────────────────────────────────────────────────────
  const [hostSearchTerm, setHostSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);
  const [selectedHostId, setSelectedHostId] = useState(isHost ? authState.poppo_id : '');
  const [selectedHostName, setSelectedHostName] = useState(isHost ? (authState.nickname || authState.name || '') : '');
  const [selectedHostData, setSelectedHostData] = useState<any>(isHost ? authState : null);

  useEffect(() => {
    if (isHost) {
      setSelectedHostId(authState.poppo_id);
      setSelectedHostName(authState.nickname || authState.name || '');
      setSelectedHostData(authState);
    }
  }, [authState.poppo_id, authState.nickname, authState.name, isHost]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isHost) return;
    const searchHosts = async () => {
      if (!hostSearchTerm.trim()) { setSearchResults([]); return; }
      setIsSearching(true);
      try {
        const term = hostSearchTerm.toLowerCase();
        const profileCollections = ['host_profile', 'manager_profile', 'agent_profile', 'admin_profile'];
        const queries = profileCollections.map(name => getDocs(collection(db, name)));
        const snapshots = await Promise.all(queries);
        const matched: any[] = [];
        snapshots.forEach((snap, idx) => {
          const role = profileCollections[idx].replace('_profile', '');
          snap.docs
            .map(d => ({ id: d.id, ...d.data(), role }))
            .filter((h: any) =>
              (h.nickname || '').toLowerCase().includes(term) ||
              (h.poppo_id || '').toLowerCase().includes(term) ||
              (h.name || '').toLowerCase().includes(term)
            )
            .forEach(h => matched.push(h));
        });
        setSearchResults(matched.slice(0, 20));
      } catch (err) { console.error(err); }
      finally { setIsSearching(false); }
    };
    const debounce = setTimeout(searchHosts, 500);
    return () => clearTimeout(debounce);
  }, [hostSearchTerm, isHost]);

  const selectHost = (host: any) => {
    setSelectedHostId(host.poppo_id);
    setSelectedHostName(host.nickname || host.name);
    setSelectedHostData(host);
    setHostSearchTerm('');
    setShowDropdown(false);
  };

  // ── RPK Reporting ──────────────────────────────────────────────────────────
  const [rpkFormData, setRpkFormData] = useState({ from_date: '', to_date: '', pk_wins_percent: '', pk_points: '', pk_sessions: '' });
  const [isSubmittingRpk, setIsSubmittingRpk] = useState(false);
  const [rpkSuccess, setRpkSuccess] = useState('');
  const [rpkError, setRpkError] = useState('');
  const [rpkHistory, setRpkHistory] = useState<any[]>([]);
  const [rpkDateRange, setRpkDateRange] = useState({ from: '', to: '' });
  const [showCalcInfo, setShowCalcInfo] = useState(false);
  const portalRoot = typeof document !== 'undefined' ? document.body : null;

  const fetchRpkHistory = useCallback(async () => {
    if (!selectedHostId) return;
    try {
      const q = query(collection(db, 'pk_reports'), where('poppo_id', '==', selectedHostId), orderBy('from_date', 'desc'));
      const snap = await getDocs(q);
      setRpkHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err: any) {
      if (err.code === 'failed-precondition') {
        // Composite index not yet built — fall back to client-side sort
        try {
          const fallbackQ = query(collection(db, 'pk_reports'), where('poppo_id', '==', selectedHostId));
          const fallbackSnap = await getDocs(fallbackQ);
          setRpkHistory(
            fallbackSnap.docs
              .map(d => ({ id: d.id, ...d.data() }))
              .sort((a: any, b: any) => new Date(b.from_date).getTime() - new Date(a.from_date).getTime())
          );
        } catch (fallbackErr) { console.error('Failed to fetch RPK history (fallback):', fallbackErr); }
      } else {
        console.error('Failed to fetch RPK history:', err);
      }
    }
  }, [selectedHostId]);

  useEffect(() => { fetchRpkHistory(); }, [fetchRpkHistory]);

  const computeRpkRating = useCallback((wp: number, sc: number, ses: number) => {
    if (!wp && !sc && !ses) return null;
    const fromD = rpkFormData.from_date || new Date().toISOString().slice(0, 10);
    const monthKey = fromD.slice(0, 7);
    const monthReports = rpkHistory.filter(r =>
      (r.from_date || '').startsWith(monthKey) && r.poppo_id === selectedHostId
    );
    const allWp = [wp, ...monthReports.map(r => parseFloat(r.pk_wins_percent || r.win_percent || 0))];
    const allSc = [sc, ...monthReports.map(r => parseFloat(r.pk_points || r.pk_score || 0))];
    const allSe = [ses, ...monthReports.map(r => parseFloat(r.pk_sessions || r.sessions || 0))];
    const maxWp = Math.max(...allWp);
    const maxSc = Math.max(...allSc);
    const maxSe = Math.max(...allSe);
    const winRateScore = maxWp > 0 ? (wp / maxWp) * 100 : 0;
    const pkScoreScore = maxSc > 0 ? (sc / maxSc) * 100 : 0;
    const sessionScore = maxSe > 0 ? (ses / maxSe) * 100 : 0;
    const rating = (winRateScore * 0.45) + (pkScoreScore * 0.40) + (sessionScore * 0.15);
    return { winRateScore, pkScoreScore, sessionScore, rating: Math.round(rating * 100) / 100, maxWp, maxSc, maxSe, monthReports: monthReports.length };
  }, [rpkFormData.from_date, rpkHistory, selectedHostId]);

  const rpkRatingResult = computeRpkRating(
    parseFloat(rpkFormData.pk_wins_percent) || 0,
    parseFloat(rpkFormData.pk_points) || 0,
    parseFloat(rpkFormData.pk_sessions) || 0
  );

  const rpkSummary = useMemo(() => {
    const filtered = rpkHistory.filter(r => {
      if (rpkDateRange.from && r.from_date < rpkDateRange.from) return false;
      if (rpkDateRange.to && r.from_date > rpkDateRange.to) return false;
      return true;
    });
    if (filtered.length === 0) return { avgWinPct: 0, totalScore: 0, totalSessions: 0, avgRating: null, count: 0 };
    let sumWp = 0, sumSc = 0, sumSe = 0, sumRt = 0, hasRt = 0;
    filtered.forEach(r => {
      sumWp += parseFloat(r.pk_wins_percent || r.win_percent || 0);
      sumSc += parseFloat(r.pk_points || r.pk_score || 0);
      sumSe += parseFloat(r.pk_sessions || r.sessions || 0);
      const rt = parseFloat(r.rpk_rating || 0);
      if (rt > 0) { sumRt += rt; hasRt++; }
    });
    return {
      avgWinPct: filtered.length > 0 ? sumWp / filtered.length : 0,
      totalScore: sumSc,
      totalSessions: sumSe,
      avgRating: hasRt > 0 ? sumRt / hasRt : null,
      count: filtered.length
    };
  }, [rpkHistory, rpkDateRange]);

  const handleRpkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHostId) { setRpkError('Please select a host first'); return; }
    if (!rpkFormData.from_date || !rpkFormData.to_date) { setRpkError('From Date and To Date are required'); return; }
    const d1 = new Date(rpkFormData.from_date);
    const d2 = new Date(rpkFormData.to_date);
    const diffDays = Math.round((d2.getTime() - d1.getTime()) / (86400000)) + 1;
    if (diffDays !== 7) { setRpkError(`Period must be exactly 7 days (got ${diffDays})`); return; }
    const overlap = rpkHistory.some(r =>
      r.poppo_id === selectedHostId &&
      r.from_date && r.to_date &&
      ((r.from_date <= rpkFormData.from_date && r.to_date >= rpkFormData.from_date) ||
       (r.from_date <= rpkFormData.to_date && r.to_date >= rpkFormData.to_date))
    );
    if (overlap) { setRpkError('Overlapping period detected — this host already has an RPK entry covering these dates'); return; }
    setIsSubmittingRpk(true); setRpkError(''); setRpkSuccess('');
    try {
      const wp = parseFloat(rpkFormData.pk_wins_percent) || 0;
      const sc = parseFloat(rpkFormData.pk_points) || 0;
      const ses = parseFloat(rpkFormData.pk_sessions) || 0;
      const rating = computeRpkRating(wp, sc, ses);
      const docId = `${selectedHostId}_${rpkFormData.from_date}_${rpkFormData.to_date}`;
      const payload = {
        poppo_id: selectedHostId, nickname: selectedHostName,
        from_date: rpkFormData.from_date, to_date: rpkFormData.to_date,
        win_percent: wp, pk_score: sc, sessions: ses,
        rpk_rating: rating?.rating || 0,
        winRateScore: rating?.winRateScore || 0,
        pkScoreScore: rating?.pkScoreScore || 0,
        sessionScore: rating?.sessionScore || 0,
        submitted_by_id: authState.poppo_id || "Unknown",
        submitted_by_name: authState.name || authState.nickname || "Unknown",
        submitted_by_role: authState.role || "Unknown",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await setDoc(doc(db, 'pk_reports', docId), payload);
      await FirebaseService.logSystemActivity(`Submitted RPK report for Host: ${selectedHostName} - Period: ${rpkFormData.from_date} to ${rpkFormData.to_date}`, 'Info');
      await updateHostProfile({
        last_rpk_report: { from_date: rpkFormData.from_date, to_date: rpkFormData.to_date, win_percent: wp, pk_score: sc, sessions: ses, rpk_rating: rating?.rating || 0 }
      });
      setRpkSuccess(`RPK Report submitted! Rating: ${rating?.rating.toFixed(1) || 0}/100`);
      setRpkFormData({ from_date: '', to_date: '', pk_wins_percent: '', pk_points: '', pk_sessions: '' });
      fetchRpkHistory();
      setTimeout(() => setRpkSuccess(''), 5000);
    } catch (err: any) { setRpkError(err.message || 'Failed to submit RPK Report'); }
    finally { setIsSubmittingRpk(false); }
  };

  // ── Stream Data: Shared ─────────────────────────────────────────────────────
  const [streamSubTab, setStreamSubTab] = useState<StreamSubTab>('weekly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');

  const reporterBase = {
    reporter_id: authState.poppo_id,
    reporter_name: authState.nickname || authState.name || '',
    reporter_role: authState.role || 'Host',
    reporterID: authState.poppo_id,
    reporterName: authState.nickname || authState.name || '',
    reporterRole: authState.role || 'Host',
    hostID: selectedHostId,
    hostNickname: selectedHostName,
    timestamp: new Date().toISOString()
  };

  // ── Stream Data: Weekly ─────────────────────────────────────────────────────
  const [weekOffset, setWeekOffset] = useState(0);
  const weekRange = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const [weeklyForm, setWeeklyForm] = useState({ total_duration: '', total_earnings: '', avg_online_users: '', gifting_count: '', unfollowers: '', new_fans: '', new_fanclub_members: '' });
  const [weeklyBreakdown, setWeeklyBreakdown] = useState<{ date: string; points: string; duration: string }[]>([]);
  const [weeklyHistory, setWeeklyHistory] = useState<any[]>([]);
  const [editingWeeklyId, setEditingWeeklyId] = useState<string | null>(null);
  const [weeklyEditForm, setWeeklyEditForm] = useState<any>(null);

  const initWeeklyBreakdown = useCallback(() => {
    return weekRange.dates.map(d => ({ date: d, points: '', duration: '' }));
  }, [weekRange]);

  useEffect(() => {
    if (weeklyBreakdown.length === 0) {
      setWeeklyBreakdown(initWeeklyBreakdown());
    }
  }, [weekRange]);

  useEffect(() => {
    if (streamSubTab !== 'weekly') return;
    setWeeklyBreakdown(initWeeklyBreakdown());
    setWeeklyForm({ total_duration: '', total_earnings: '', avg_online_users: '', gifting_count: '', unfollowers: '', new_fans: '', new_fanclub_members: '' });
    fetchUploadHistory('weekly');
  }, [weekOffset, streamSubTab]);

  const updateWeeklyBreakdown = (idx: number, field: 'points' | 'duration', value: string) => {
    setWeeklyBreakdown(prev => prev.map((d, i) => i === idx ? { ...d, [field]: field === 'duration' ? formatDuration(value) : value } : d));
  };

  const handleWeeklyChange = (field: string, value: string) => {
    if (field === 'total_duration') setWeeklyForm(prev => ({ ...prev, total_duration: formatDuration(value) }));
    else if (field === 'total_earnings') setWeeklyForm(prev => ({ ...prev, total_earnings: value.replace(/,/g, '') }));
    else setWeeklyForm(prev => ({ ...prev, [field]: value }));
  };

  const submitWeeklyReport = async () => {
    if (!selectedHostId) { setSubmitError('Please select a Host first'); return; }
    const allFilled = weeklyBreakdown.every(d => d.points !== '');
    if (!allFilled) { setSubmitError('All 7 daily breakdown fields must be filled'); return; }
    setIsSubmitting(true); setSubmitError(''); setSubmitSuccess('');
    try {
      const payload = {
        ...reporterBase, type: 'weekly',
        from_date: weekRange.monday, to_date: weekRange.sunday,
        total_duration: weeklyForm.total_duration || '00:00',
        total_earnings: parseNum(weeklyForm.total_earnings),
        avg_online_users: parseNum(weeklyForm.avg_online_users),
        gifting_count: parseNum(weeklyForm.gifting_count),
        unfollowers: parseNum(weeklyForm.unfollowers),
        new_fans: parseNum(weeklyForm.new_fans),
        new_fanclub_members: parseNum(weeklyForm.new_fanclub_members),
        daily_breakdown: weeklyBreakdown.map(d => ({ date: d.date, points: parseNum(d.points), duration: d.duration || '00:00' }))
      };
      await addDoc(collection(db, 'stream_reports'), payload);
      await updateHostProfile({
        last_weekly_report: {
          from_date: weekRange.monday, to_date: weekRange.sunday,
          total_duration: weeklyForm.total_duration || '00:00',
          total_earnings: parseNum(weeklyForm.total_earnings),
          daily_breakdown: weeklyBreakdown.map(d => ({ date: d.date, points: parseNum(d.points), duration: d.duration || '00:00' }))
        }
      });
      setSubmitSuccess('Weekly report submitted successfully!');
      setWeeklyBreakdown(initWeeklyBreakdown());
      setWeeklyForm({ total_duration: '', total_earnings: '', avg_online_users: '', gifting_count: '', unfollowers: '', new_fans: '', new_fanclub_members: '' });
      fetchUploadHistory('weekly');
      setTimeout(() => setSubmitSuccess(''), 5000);
    } catch (err: any) { setSubmitError(err.message || 'Failed to submit'); }
    finally { setIsSubmitting(false); }
  };

  // ── Stream Data: Daily ─────────────────────────────────────────────────────
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyForm, setDailyForm] = useState({
    won_points: '', live_duration: '', live_earnings: '', avg_online_users: '',
    party_duration: '', party_earnings: '', party_crown_duration: '', new_fans: '', new_fanclub_members: ''
  });

  const handleDailyChange = (field: string, value: string) => {
    if (field === 'live_duration' || field === 'party_duration' || field === 'party_crown_duration') {
      setDailyForm(prev => ({ ...prev, [field]: formatDuration(value) }));
    } else if (field === 'won_points' || field === 'live_earnings' || field === 'party_earnings') {
      setDailyForm(prev => ({ ...prev, [field]: value.replace(/,/g, '') }));
    } else {
      setDailyForm(prev => ({ ...prev, [field]: value }));
    }
  };

  const submitDailyReport = async () => {
    if (!selectedHostId) { setSubmitError('Please select a Host first'); return; }
    setIsSubmitting(true); setSubmitError(''); setSubmitSuccess('');
    try {
      const payload = {
        ...reporterBase, type: 'daily', date: dailyDate,
        won_points: parseNum(dailyForm.won_points),
        live_duration: dailyForm.live_duration || '00:00',
        live_earnings: parseNum(dailyForm.live_earnings),
        avg_online_users: parseNum(dailyForm.avg_online_users),
        party_duration: dailyForm.party_duration || '00:00',
        party_earnings: parseNum(dailyForm.party_earnings),
        party_crown_duration: dailyForm.party_crown_duration || '00:00',
        new_fans: parseNum(dailyForm.new_fans),
        new_fanclub_members: parseNum(dailyForm.new_fanclub_members)
      };
      await addDoc(collection(db, 'stream_reports'), payload);
      await updateHostProfile({
        last_daily_report: {
          date: dailyDate,
          won_points: parseNum(dailyForm.won_points),
          live_duration: dailyForm.live_duration || '00:00',
          live_earnings: parseNum(dailyForm.live_earnings),
          party_duration: dailyForm.party_duration || '00:00',
          party_earnings: parseNum(dailyForm.party_earnings)
        }
      });
      setSubmitSuccess('Daily report submitted successfully!');
      setDailyForm({ won_points: '', live_duration: '', live_earnings: '', avg_online_users: '', party_duration: '', party_earnings: '', party_crown_duration: '', new_fans: '', new_fanclub_members: '' });
      setTimeout(() => setSubmitSuccess(''), 5000);
    } catch (err: any) { setSubmitError(err.message || 'Failed to submit'); }
    finally { setIsSubmitting(false); }
  };

  // ── Stream Data: Monthly ───────────────────────────────────────────────────
  const [monthOffset, setMonthOffset] = useState(0);
  const monthRange = useMemo(() => getMonthDates(monthOffset), [monthOffset]);
  const [monthlyForm, setMonthlyForm] = useState({ total_duration: '', total_earnings: '', last_3mos_earnings: '' });
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<{ date: string; points: string; duration: string }[]>([]);
  const [monthlyHistory, setMonthlyHistory] = useState<any[]>([]);
  const [editingMonthlyId, setEditingMonthlyId] = useState<string | null>(null);
  const [monthlyEditForm, setMonthlyEditForm] = useState<any>(null);

  const initMonthlyBreakdown = useCallback(() => {
    return monthRange.dates.map(d => ({ date: d, points: '', duration: '' }));
  }, [monthRange]);

  useEffect(() => {
    setMonthlyBreakdown(initMonthlyBreakdown());
    setMonthlyForm({ total_duration: '', total_earnings: '', last_3mos_earnings: '' });
    if (streamSubTab === 'monthly') fetchUploadHistory('monthly');
  }, [monthOffset, streamSubTab]);

  const updateMonthlyBreakdown = (idx: number, field: 'points' | 'duration', value: string) => {
    setMonthlyBreakdown(prev => prev.map((d, i) => i === idx ? { ...d, [field]: field === 'duration' ? formatDuration(value) : value } : d));
  };

  const handleMonthlyChange = (field: string, value: string) => {
    if (field === 'total_duration') setMonthlyForm(prev => ({ ...prev, total_duration: formatDuration(value) }));
    else if (field === 'total_earnings' || field === 'last_3mos_earnings') setMonthlyForm(prev => ({ ...prev, [field]: value.replace(/,/g, '') }));
    else setMonthlyForm(prev => ({ ...prev, [field]: value }));
  };

  const submitMonthlyReport = async () => {
    if (!selectedHostId) { setSubmitError('Please select a Host first'); return; }
    const allFilled = monthlyBreakdown.every(d => d.points !== '');
    if (!allFilled) { setSubmitError(`All ${monthRange.dates.length} daily breakdown fields must be filled`); return; }
    setIsSubmitting(true); setSubmitError(''); setSubmitSuccess('');
    try {
      const payload = {
        ...reporterBase, type: 'monthly',
        from_date: monthRange.firstDate, to_date: monthRange.lastDate,
        total_duration: monthlyForm.total_duration || '00:00',
        total_earnings: parseNum(monthlyForm.total_earnings),
        last_3mos_earnings: parseNum(monthlyForm.last_3mos_earnings),
        daily_breakdown: monthlyBreakdown.map(d => ({ date: d.date, points: parseNum(d.points), duration: d.duration || '00:00' }))
      };
      await addDoc(collection(db, 'stream_reports'), payload);
      await updateHostProfile({
        last_monthly_report: {
          from_date: monthRange.firstDate, to_date: monthRange.lastDate,
          total_duration: monthlyForm.total_duration || '00:00',
          total_earnings: parseNum(monthlyForm.total_earnings),
          last_3mos_earnings: parseNum(monthlyForm.last_3mos_earnings),
          daily_breakdown: monthlyBreakdown.map(d => ({ date: d.date, points: parseNum(d.points), duration: d.duration || '00:00' }))
        }
      });
      setSubmitSuccess('Monthly report submitted successfully!');
      setMonthlyBreakdown(initMonthlyBreakdown());
      setMonthlyForm({ total_duration: '', total_earnings: '', last_3mos_earnings: '' });
      fetchUploadHistory('monthly');
      setTimeout(() => setSubmitSuccess(''), 5000);
    } catch (err: any) { setSubmitError(err.message || 'Failed to submit'); }
    finally { setIsSubmitting(false); }
  };

  // ── Profile Update ──────────────────────────────────────────────────────────
  const updateHostProfile = async (data: Record<string, any>) => {
    if (!selectedHostId) return;
    try {
      await setDoc(doc(db, 'host_profile', selectedHostId), data, { merge: true });
    } catch (err) {
      console.warn('Failed to update host profile:', err);
    }
  };

  // ── Upload History ─────────────────────────────────────────────────────────
  const fetchUploadHistory = async (type: StreamSubTab) => {
    try {
      const q = query(
        collection(db, 'stream_reports'),
        where('reporterID', '==', authState.poppo_id),
        where('type', '==', type),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (type === 'weekly') setWeeklyHistory(list);
      else if (type === 'monthly') setMonthlyHistory(list);
    } catch (err) { console.error('Failed to fetch upload history:', err); }
  };

  const deleteReport = async (reportId: string, type: StreamSubTab) => {
    if (!window.confirm('Delete this report?')) return;
    try {
      await deleteDoc(doc(db, 'stream_reports', reportId));
      fetchUploadHistory(type);
    } catch (err: any) { alert('Failed to delete: ' + err.message); }
  };

  const startEditReport = (report: any, type: StreamSubTab) => {
    if (type === 'weekly') {
      setEditingWeeklyId(report.id);
      setWeeklyEditForm(report);
    } else {
      setEditingMonthlyId(report.id);
      setMonthlyEditForm(report);
    }
  };

  const saveEditReport = async (reportId: string, type: StreamSubTab) => {
    const form = type === 'weekly' ? weeklyEditForm : monthlyEditForm;
    if (!form) return;
    try {
      await setDoc(doc(db, 'stream_reports', reportId), form, { merge: true });
      if (type === 'weekly') setEditingWeeklyId(null);
      else setEditingMonthlyId(null);
      fetchUploadHistory(type);
    } catch (err: any) { alert('Failed to save: ' + err.message); }
  };

  const canModify = (reporterId: string) => reporterId === authState.poppo_id || isDirector;

  // ── Unified Upload History ─────────────────────────────────────────────────
  const [allHistory, setAllHistory] = useState<any[]>([]);

  const fetchAllHistory = useCallback(async () => {
    try {
      const results: any[] = [];

      const streamSnap = await getDocs(query(
        collection(db, 'stream_reports'),
        where('reporterID', '==', authState.poppo_id),
        orderBy('timestamp', 'desc')
      ));
      streamSnap.docs.forEach(d => results.push({ id: d.id, ...d.data(), _collection: 'stream_reports' }));

      const pkSnap = await getDocs(query(
        collection(db, 'pk_reports'),
        where('reporterID', '==', authState.poppo_id),
        orderBy('timestamp', 'desc')
      ));
      pkSnap.docs.forEach(d => results.push({ id: d.id, ...d.data(), _collection: 'pk_reports', type: 'rpk' }));

      const fbSnap = await getDocs(query(
        collection(db, 'fanbase_reports'),
        where('reporterID', '==', authState.poppo_id),
        orderBy('timestamp', 'desc')
      ));
      fbSnap.docs.forEach(d => results.push({ id: d.id, ...d.data(), _collection: 'fanbase_reports', type: 'fanbase' }));

      results.sort((a, b) => new Date(b.timestamp || b.submittedAt || 0).getTime() - new Date(a.timestamp || a.submittedAt || 0).getTime());
      setAllHistory(results);
    } catch (err) { console.error('Failed to fetch all history:', err); }
  }, [authState.poppo_id]);

  const deleteGlobalReport = async (report: any) => {
    if (!window.confirm('Delete this report?')) return;
    try {
      const col = report._collection || 'stream_reports';
      await deleteDoc(doc(db, col, report.id));
      fetchAllHistory();
    } catch (err: any) { alert('Failed to delete: ' + err.message); }
  };

  useEffect(() => { fetchAllHistory(); }, [fetchAllHistory]);

  // ── Attendance & Exposure Data ──────────────────────────────────────────────
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [exposureList, setExposureList] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedHostId) return;
    const fetchData = async () => {
      try {
        const attSnap = await getDocs(query(
          collection(db, 'attendance'),
          where('attendeeIds', 'array-contains', selectedHostId)
        ));
        setAttendanceList(attSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const calSnap = await getDocs(query(
          collection(db, 'calendar'),
          where('participantIds', 'array-contains', selectedHostId)
        ));
        calSnap.docs.forEach(d => {
          const dd = d.data();
          if (dd.event_date === undefined && dd.date) dd.event_date = dd.date;
          if (dd.title === undefined && dd.event_tittle) dd.title = dd.event_tittle;
        });
        setExposureList(calSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error('Failed to fetch attendance/exposure:', err); }
    };
    fetchData();
  }, [selectedHostId]);

  // ── Fanbase Reporting ──────────────────────────────────────────────────────
  const [fanbaseFormData, setFanbaseFormData] = useState({ from_date: '', to_date: '', total_followers: '', fanclub_subscribers: '', fanclub_gc_members: '', gc_activity_count_host: '', gc_activity_count_fans: '', notes: '' });
  const [isSubmittingFanbase, setIsSubmittingFanbase] = useState(false);
  const [fanbaseSuccess, setFanbaseSuccess] = useState('');
  const [fanbaseError, setFanbaseError] = useState('');

  const handleFanbaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHostId) { setFanbaseError('Please select a host first'); return; }
    if (!fanbaseFormData.from_date || !fanbaseFormData.to_date) { setFanbaseError('From Date and To Date are required'); return; }
    setIsSubmittingFanbase(true); setFanbaseError(''); setFanbaseSuccess('');
    try {
      const roleLower = String(authState.role || '').toLowerCase();
      const isElevatedStaff = ['admin', 'head admin', 'head_admin', 'director'].includes(roleLower);
      const reportData = {
        reporter_id: authState.poppo_id || "Unknown",
        reporter_name: authState.name || authState.nickname || "Unknown",
        reporter_role: authState.role || "Unknown",
        poppo_id: selectedHostId,
        nickname: selectedHostName,
        from_date: fanbaseFormData.from_date,
        to_date: fanbaseFormData.to_date,
        total_followers: parseFloat(fanbaseFormData.total_followers) || 0,
        fanclub_subscribers: parseFloat(fanbaseFormData.fanclub_subscribers) || 0,
        fanclub_gc_members: parseFloat(fanbaseFormData.fanclub_gc_members) || 0,
        gc_activity_count_host: isElevatedStaff ? (parseFloat(fanbaseFormData.gc_activity_count_host) || 0) : 0,
        gc_activity_count_fans: isElevatedStaff ? (parseFloat(fanbaseFormData.gc_activity_count_fans) || 0) : 0,
        notes: fanbaseFormData.notes,
        submittedAt: new Date().toISOString(),
        // Legacy camelCase fields for backward compatibility (useAnalytics.ts, HostProfileView.tsx)
        reporterId: authState.poppo_id || "Unknown",
        reporterName: authState.name || authState.nickname || "Unknown",
        reporterRole: authState.role || "Unknown",
        poppoId: selectedHostId,
        currentFollowers: parseFloat(fanbaseFormData.total_followers) || 0,
        fanclubSubscribers: parseFloat(fanbaseFormData.fanclub_subscribers) || 0,
        fanclubGcMembers: parseFloat(fanbaseFormData.fanclub_gc_members) || 0,
        gcUpdatesHost: isElevatedStaff ? (parseFloat(fanbaseFormData.gc_activity_count_host) || 0) : 0,
        gcUpdatesFans: isElevatedStaff ? (parseFloat(fanbaseFormData.gc_activity_count_fans) || 0) : 0,
        fromDate: fanbaseFormData.from_date,
        toDate: fanbaseFormData.to_date,
      };
      await FirebaseService.submitFanbaseReport(selectedHostId, fanbaseFormData.from_date, fanbaseFormData.to_date, reportData);
      await FirebaseService.logSystemActivity(`Submitted fanbase report for Host: ${selectedHostName}`, 'Info');
      await updateHostProfile({
        last_fanbase_report: { from_date: fanbaseFormData.from_date, to_date: fanbaseFormData.to_date, total_followers: parseNum(fanbaseFormData.total_followers), fanclub_subscribers: parseNum(fanbaseFormData.fanclub_subscribers) }
      });
      setFanbaseSuccess('Fanbase Report submitted successfully!');
      setFanbaseFormData({ from_date: '', to_date: '', total_followers: '', fanclub_subscribers: '', fanclub_gc_members: '', gc_activity_count_host: '', gc_activity_count_fans: '', notes: '' });
      setTimeout(() => setFanbaseSuccess(''), 5000);
    } catch (err: any) { setFanbaseError(err.message || 'Failed to submit Fanbase Report'); }
    finally { setIsSubmittingFanbase(false); }
  };

  // ── Tabs Config ─────────────────────────────────────────────────────────────
  const tabs: { key: StreamTab; label: string; icon: any }[] = [
    { key: 'rpk', label: 'Random PK', icon: Activity },
    { key: 'stream', label: 'Livestream', icon: TrendingUp },
    { key: 'fanbase', label: 'Fanbase', icon: Users },
  ];

  const subAccent = (t: StreamSubTab) => {
    if (t === 'daily') return { border: 'rgba(244,63,94,0.5)', color: '#fb7185', shadow: '0 0 25px rgba(244,63,94,0.35), 0 0 60px rgba(244,63,94,0.1)', ring: '#fb7185', grad: 'linear-gradient(135deg, rgba(244,63,94,0.6), rgba(249,115,22,0.15))', bg: 'rgba(244,63,94,0.08)' };
    if (t === 'weekly') return { border: 'rgba(245,158,11,0.5)', color: '#fbbf24', shadow: '0 0 25px rgba(245,158,11,0.35), 0 0 60px rgba(245,158,11,0.1)', ring: '#fbbf24', grad: 'linear-gradient(135deg, rgba(245,158,11,0.6), rgba(217,119,6,0.15))', bg: 'rgba(245,158,11,0.08)' };
    return { border: 'rgba(16,185,129,0.5)', color: '#34d399', shadow: '0 0 25px rgba(16,185,129,0.35), 0 0 60px rgba(16,185,129,0.1)', ring: '#34d399', grad: 'linear-gradient(135deg, rgba(16,185,129,0.6), rgba(5,150,105,0.15))', bg: 'rgba(16,185,129,0.08)' };
  };

  const SubTabBtn = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => {
    const a = subAccent(label as StreamSubTab);
    return (
      <button onClick={onClick} className={cn("px-4 py-1.5 rounded-md text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all",
        active
          ? 'text-black shadow-md'
          : 'text-white/40 hover:text-white/80 bg-black/30 hover:bg-black/50 border border-white/10'
      )} style={active ? { background: `linear-gradient(to right, ${a.color}dd, ${a.color}88)`, boxShadow: a.shadow, border: `1px solid ${a.color}44` } : undefined}>{label}</button>
    );
  };

  const st = streamSubTab;

  return (
    <div className="p-4 md:p-8 space-y-6 mx-auto h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto w-full">
        <div className="w-[92%] max-w-[360px] md:w-full md:max-w-none mx-auto">
        {/* ── Header / Host Selector ──────────────────────────────────────────── */}
        <div className="glass-card relative z-10 overflow-visible space-y-3 mb-4 p-3 md:p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-[#D4AF37]" size={16} />
            <h2 className="text-sm font-black uppercase tracking-widest text-[#D4AF37]">Dashboard Report</h2>
          </div>
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
            {!isHost ? (
              <div className="grid grid-cols-2 gap-3 items-start" ref={searchRef}>
                <div className="space-y-1 w-full">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37] block mb-1">Select/Search User <span className="text-red-400">*</span></label>
                  <div className="global-placeholder flex w-full items-center justify-between gap-2 bg-gradient-to-br from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/20 border-t-[#D4AF37]/40 rounded-xl px-4 py-2 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(212,175,55,0.3)] relative z-20 overflow-visible">
                    <div className="relative flex-1 flex items-center w-full">
                      <Search className="text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.5)] mr-3 shrink-0" size={16} />
                      <input type="text" placeholder="Search User" value={hostSearchTerm}
                        onChange={(e) => { setHostSearchTerm(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)}
                        className="w-full bg-transparent border-none text-xs text-[#F0EFE8] placeholder:text-[#A09E9A]/60 focus:outline-none focus:ring-0" />
                      {isSearching && <Loader2 className="animate-spin text-[#D4AF37] ml-2" size={14} />}
                    </div>
                    {showDropdown && searchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-[#140D0B] border border-[#D4AF37]/30 rounded-xl overflow-hidden z-[100] max-h-40 overflow-y-auto custom-scrollbar shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                        {searchResults.map((result: any) => (
                          <div key={result.poppo_id} onClick={() => selectHost(result)}
                            className="px-4 py-2 cursor-pointer hover:bg-white/5 border-b border-white/5 last:border-0 flex items-center justify-between transition-colors">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-[#D4AF37]/30 to-transparent">
                                {result.PhotoUrl ? <img src={result.PhotoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-[#D4AF37]">{(result.nickname || result.name || '?')[0]}</div>}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-white">{result.nickname || result.name}</p>
                                <p className="text-[9px] text-white/40 font-black tracking-widest uppercase">ID: {result.poppo_id}</p>
                              </div>
                            </div>
                            {selectedHostId === result.poppo_id && <CheckCircle2 className="text-emerald-400 shrink-0" size={14} />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {selectedHostData && (
                  <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 h-full" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.03))', border: '1px solid rgba(212,175,55,0.2)', boxShadow: 'inset 0 1px 0 rgba(212,175,55,0.1)' }}>
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-[#D4AF37]/40 to-[#D4AF37]/10" style={{ boxShadow: '0 0 20px rgba(212,175,55,0.3)' }}>
                      {selectedHostData.PhotoUrl ? <img src={selectedHostData.PhotoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm font-black text-[#D4AF37]">{(selectedHostName || '?')[0]}</div>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{selectedHostName}</p>
                      <p className="text-[9px] text-white/50 font-black tracking-widest uppercase">ID: {selectedHostId}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : selectedHostData && (
              <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.03))', border: '1px solid rgba(212,175,55,0.2)' }}>
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-[#D4AF37]/40 to-[#D4AF37]/10">
                  {selectedHostData.PhotoUrl ? <img src={selectedHostData.PhotoUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm font-black text-[#D4AF37]">{(selectedHostName || '?')[0]}</div>}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{selectedHostName}</p>
                  <p className="text-[9px] text-white/50 font-black tracking-widest uppercase">ID: {selectedHostId}</p>
                </div>
              </div>
            )}
          </div>

        {/* ── Top-level Tabs ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 border-b border-white/10 mb-4 pb-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={cn("flex items-center gap-1 px-3 py-2 rounded-xl text-[9px] md:text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex-1 justify-center",
                  isActive
                    ? 'text-black bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] shadow-[0_0_25px_rgba(212,175,55,0.4),inset_0_1px_0_rgba(255,255,255,0.2)]'
                    : 'text-white/40 hover:text-white/80 bg-white/5 hover:bg-white/10 border border-white/10'
                )}>
                <Icon size={12} className="md:inline" /> <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ─── RPK REPORTING ──────────────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'rpk' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="relative rounded-3xl p-[1px] overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.6), rgba(212,175,55,0.08), rgba(212,175,55,0.6))', boxShadow: '0 0 80px rgba(212,175,55,0.15), 0 0 30px rgba(212,175,55,0.1)' }}>
            <div className="relative rounded-3xl p-5 md:p-6 space-y-5" style={{ background: 'rgba(8,4,2,0.88)', backdropFilter: 'blur(28px)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06), inset 0 0 40px rgba(212,175,55,0.04), 0 8px 32px rgba(0,0,0,0.6)' }}>
              <div className="flex items-center justify-between gap-3 border-b pb-3" style={{ borderColor: 'rgba(212,175,55,0.2)' }}>
                <div className="flex items-center gap-3">
                  <Activity size={16} className="text-[#D4AF37]" style={{ filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.5))' }} />
                  <h3 className="text-xs font-black uppercase tracking-widest text-white/90">Random PK</h3>
                </div>
                <button onClick={() => setShowCalcInfo(true)}
                  className="p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                  title="How is this calculated?">
                  <Info size={14} className="text-[#D4AF37]" />
                </button>
              </div>

              {/* ── Random PK — Live Metric Blocks ──────────────────────────── */}
              <div className="grid grid-cols-4 gap-3">
                {[
                   { label: 'PK Rating', value: rpkRatingResult && (rpkFormData.pk_wins_percent || rpkFormData.pk_points || rpkFormData.pk_sessions) ? rpkRatingResult.rating.toFixed(1) : '—', suffix: '', color: '#c084fc', borderColor: 'rgba(192,132,252,0.4)', bg: 'rgba(192,132,252,0.2)', shadow: 'rgba(192,132,252,0.4)' },
                   { label: 'Win Rate', value: rpkFormData.pk_wins_percent || '—', suffix: '', color: '#fb7185', borderColor: 'rgba(251,113,133,0.4)', bg: 'rgba(251,113,133,0.2)', shadow: 'rgba(251,113,133,0.4)' },
                  { label: 'PK Score', value: rpkFormData.pk_points || '—', suffix: '', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.4)', bg: 'rgba(251,191,36,0.2)', shadow: 'rgba(251,191,36,0.4)' },
                  { label: 'Sessions', value: rpkFormData.pk_sessions || '—', suffix: '', color: '#38bdf8', borderColor: 'rgba(56,189,248,0.4)', bg: 'rgba(56,189,248,0.2)', shadow: 'rgba(56,189,248,0.4)' },
                ].map((m, i) => (
                  <div key={i} className="rounded-xl p-4 text-center aspect-square flex flex-col items-center justify-center relative overflow-hidden" style={{ background: `radial-gradient(circle at 20% 30%, ${m.color}88 0%, ${m.color}44 40%, rgba(0,0,0,0.7) 75%, rgba(0,0,0,0.95) 100%)`, border: `2px solid ${m.color}88`, boxShadow: `inset 0 1px 0 ${m.color}aa, 0 0 20px ${m.shadow}, 0 8px 32px rgba(0,0,0,0.6)`, position: 'relative' }}>
                    <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 50%)` }} />
                    <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: `inset 0 1px 2px ${m.color}33, inset 0 -1px 2px rgba(0,0,0,0.5)` }} />
                    <div className="relative z-10 flex flex-col items-center justify-center">
                      <div className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: '#fff', textShadow: `0 2px 4px rgba(0,0,0,0.8), 0 0 8px ${m.color}88`, opacity: 0.9 }}>{m.label}</div>
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="text-base md:text-lg font-black" style={{ color: '#fff', textShadow: `0 2px 6px rgba(0,0,0,0.9), 0 4px 12px rgba(0,0,0,0.6), 0 0 16px ${m.color}66` }}>{m.value}</span>
                        {m.suffix && <span className="text-[9px] font-black" style={{ color: '#fff', textShadow: `0 2px 4px rgba(0,0,0,0.8)` }}>{m.suffix}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleRpkSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>From Date</label>
                    <input type="date" value={rpkFormData.from_date} onChange={(e) => setRpkFormData(prev => ({ ...prev, from_date: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-xs text-white focus:outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(212,175,55,0.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.3)' }} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>To Date</label>
                    <input type="date" value={rpkFormData.to_date} onChange={(e) => setRpkFormData(prev => ({ ...prev, to_date: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-xs text-white focus:outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(212,175,55,0.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.3)' }} />
                    {rpkFormData.from_date && rpkFormData.to_date && (() => {
                      const dd = Math.round((new Date(rpkFormData.to_date).getTime() - new Date(rpkFormData.from_date).getTime()) / 86400000) + 1;
                      return <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: dd === 7 ? 'rgba(52,211,153,0.6)' : 'rgba(248,113,113,0.6)' }}>{dd}-day period {dd !== 7 && '(must be 7)'}</span>;
                    })()}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>PK Wins %</label>
                    <input type="number" step="0.01" placeholder="e.g. 85.5" value={rpkFormData.pk_wins_percent} onChange={(e) => setRpkFormData(prev => ({ ...prev, pk_wins_percent: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-xs text-white focus:outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(212,175,55,0.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.3)' }} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>PK Points</label>
                    <input type="number" placeholder="e.g. 5000" value={rpkFormData.pk_points} onChange={(e) => setRpkFormData(prev => ({ ...prev, pk_points: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-xs text-white focus:outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(212,175,55,0.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.3)' }} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>PK Sessions</label>
                    <input type="number" placeholder="e.g. 10" value={rpkFormData.pk_sessions} onChange={(e) => setRpkFormData(prev => ({ ...prev, pk_sessions: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-xs text-white focus:outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(212,175,55,0.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.3)' }} />
                  </div>
                  <button type="submit" disabled={isSubmittingRpk || !selectedHostId}
                    className="w-full px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] md:text-xs transition-all flex justify-center items-center gap-2 cursor-pointer bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-black hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed self-end"
                    style={{ boxShadow: '0 0 30px rgba(212,175,55,0.4), 0 4px 16px rgba(0,0,0,0.4)' }}
                  >{isSubmittingRpk ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}{isSubmittingRpk ? 'Submitting...' : rpkRatingResult ? `Submit (${rpkRatingResult.rating.toFixed(1)})` : 'Submit Report'}</button>
                </div>
                {rpkError && <p className="text-xs text-red-400 font-bold p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', boxShadow: '0 0 20px rgba(239,68,68,0.08)' }}>{rpkError}</p>}
                {rpkSuccess && <p className="text-xs text-emerald-400 font-bold p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 0 20px rgba(16,185,129,0.08)' }}>{rpkSuccess}</p>}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Auto-Calculation Logic Modal ─────────────────────────────────── */}
      {showCalcInfo && portalRoot && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowCalcInfo(false)}>
          <div className="bg-[#0A0604]/80 backdrop-blur-2xl border border-[#D4AF37]/20 rounded-2xl p-5 max-w-sm w-full shadow-[0_20px_60px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(212,175,55,0.1)] relative my-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowCalcInfo(false)} className="absolute top-4 right-4 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"><X size={18} /></button>
            <h3 className="text-lg font-black uppercase tracking-widest text-[#D4AF37] mb-4 flex items-center gap-2"><Info size={20} />Auto-Calculation Logic</h3>
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
                <p className="font-mono text-[10px] text-white/90">PK_Rating =<br/>(WinRateScore × 0.45) +<br/>(PKScoreScore × 0.40) +<br/>(SessionScore × 0.15)</p>
              </div>
            </div>
          </div>
        </div>,
        portalRoot
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ─── STREAM DATA REPORTING ──────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'stream' && (() => {
        const a = subAccent(st);
        const accentBorder = { borderColor: a.border };
        const accentColor = { color: a.color };
        return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="relative rounded-3xl p-[1px] overflow-hidden" style={{ background: `linear-gradient(135deg, ${a.color}88, ${a.color}11, ${a.color}88)`, boxShadow: `0 0 80px ${a.color}15, 0 0 40px ${a.color}08` }}>
            <div className="relative rounded-3xl p-5 space-y-5" style={{ background: `rgba(8,4,2,0.88)`, backdropFilter: 'blur(28px)', boxShadow: `inset 0 1px 1px rgba(255,255,255,0.06), inset 0 0 40px ${a.color}08, 0 8px 32px rgba(0,0,0,0.6)` }}>
              <div className="flex items-center gap-3 border-b pb-3" style={accentBorder}>
                <TrendingUp size={16} style={accentColor} />
                <h3 className="text-xs font-black uppercase tracking-widest text-white/90">Livestream</h3>
              </div>

              {/* Sub-tabs: Daily | Weekly | Monthly */}
              <div className="flex items-center p-1 rounded-lg w-fit gap-1" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.5), rgba(0,0,0,0.3))', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                {(['daily', 'weekly', 'monthly'] as StreamSubTab[]).map(type => (
                  <SubTabBtn key={type} label={type} active={st === type} onClick={() => { setStreamSubTab(type); setSubmitError(''); setSubmitSuccess(''); }} />
                ))}
              </div>

              {/* ── DAILY (Fiery) ──────────────────────────────────────────── */}
              {st === 'daily' && (
                <div className="space-y-5">
                  <div className="space-y-1 w-full">
                    <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Date</label>
                    <div className="relative" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(244,63,94,0.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.3)' }}>
                      <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full cursor-pointer" />
                      <div className="px-3 py-2 text-xs text-white">
                        <div className="font-bold">{new Date(dailyDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                        <div className="text-[10px] text-white/60">{new Date(dailyDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="relative rounded-2xl p-[1px] overflow-hidden" style={{ background: `linear-gradient(135deg, rgba(244,63,94,0.5), rgba(249,115,22,0.15), rgba(244,63,94,0.5))`, boxShadow: `0 0 40px rgba(244,63,94,0.12), 0 0 15px rgba(244,63,94,0.08)` }}>
                      <div className="relative rounded-2xl p-4 space-y-3" style={{ background: 'rgba(8,4,2,0.88)', backdropFilter: 'blur(22px)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), inset 0 0 30px rgba(244,63,94,0.04), 0 4px 16px rgba(0,0,0,0.4)' }}>
                        <h4 className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#fb7185', textShadow: '0 0 12px rgba(251,112,133,0.5)' }}>Solo Stream</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Won Points" value={formatComma(dailyForm.won_points)} onChange={(v) => handleDailyChange('won_points', v)} ring="#fb7185" />
                          <Field label="Live Duration" value={dailyForm.live_duration} onChange={(v) => handleDailyChange('live_duration', v)} placeholder="hh:mm" ring="#fb7185" />
                          <Field label="Live Earnings" value={formatComma(dailyForm.live_earnings)} onChange={(v) => handleDailyChange('live_earnings', v)} ring="#fb7185" />
                          <Field label="Avg Online Users" value={dailyForm.avg_online_users} onChange={(v) => handleDailyChange('avg_online_users', v)} ring="#fb7185" />
                        </div>
                      </div>
                    </div>

                    <div className="relative rounded-2xl p-[1px] overflow-hidden" style={{ background: `linear-gradient(135deg, rgba(244,63,94,0.5), rgba(249,115,22,0.15), rgba(244,63,94,0.5))`, boxShadow: `0 0 40px rgba(244,63,94,0.12), 0 0 15px rgba(244,63,94,0.08)` }}>
                      <div className="relative rounded-2xl p-4 space-y-3" style={{ background: 'rgba(8,4,2,0.88)', backdropFilter: 'blur(22px)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), inset 0 0 30px rgba(244,63,94,0.04), 0 4px 16px rgba(0,0,0,0.4)' }}>
                        <h4 className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#fb7185' }}>Party Stream</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Party Duration" value={dailyForm.party_duration} onChange={(v) => handleDailyChange('party_duration', v)} placeholder="hh:mm" ring="#fb7185" />
                          <Field label="Party Earnings" value={formatComma(dailyForm.party_earnings)} onChange={(v) => handleDailyChange('party_earnings', v)} ring="#fb7185" />
                          <Field label="Party Crown Duration" value={dailyForm.party_crown_duration} onChange={(v) => handleDailyChange('party_crown_duration', v)} placeholder="hh:mm" ring="#fb7185" />
                          <Field label="New Fans" value={dailyForm.new_fans} onChange={(v) => handleDailyChange('new_fans', v)} ring="#fb7185" />
                          <Field label="New Fanclub Members" value={dailyForm.new_fanclub_members} onChange={(v) => handleDailyChange('new_fanclub_members', v)} ring="#fb7185" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <StatusMessages error={submitError} success={submitSuccess} />
                    <SubmitBtn onClick={submitDailyReport} disabled={isSubmitting || !selectedHostId} loading={isSubmitting} label="Submit Daily Report" color="#fb7185" />
                  </div>
                </div>
              )}

              {/* ── WEEKLY (Gold) ──────────────────────────────────────────── */}
              {st === 'weekly' && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(245,158,11,0.04))', border: '1px solid rgba(245,158,11,0.15)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.3)' }}>
                    <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-1.5 hover:bg-white/10 rounded-lg transition-all cursor-pointer" style={{ color: '#fbbf24' }}>
                      <ChevronLeft size={18} />
                    </button>
                    <div className="flex-1 flex items-center justify-center gap-2">
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-white/80">{new Date(weekRange.monday + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}</div>
                        <div className="text-[9px] text-white/50">{new Date(weekRange.monday + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </div>
                      <span className="text-xs text-white/30">—</span>
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-white/80">{new Date(weekRange.sunday + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}</div>
                        <div className="text-[9px] text-white/50">{new Date(weekRange.sunday + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </div>
                    </div>
                    <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-1.5 hover:bg-white/10 rounded-lg transition-all cursor-pointer" style={{ color: '#fbbf24' }}>
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div className="space-y-5">
                    <div className="relative rounded-2xl p-[1px] overflow-hidden" style={{ background: `linear-gradient(135deg, rgba(245,158,11,0.5), rgba(217,119,6,0.15), rgba(245,158,11,0.5))`, boxShadow: `0 0 40px rgba(245,158,11,0.12), 0 0 15px rgba(245,158,11,0.08)` }}>
                      <div className="relative rounded-2xl p-4 space-y-3" style={{ background: 'rgba(8,4,2,0.88)', backdropFilter: 'blur(22px)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), inset 0 0 30px rgba(245,158,11,0.04), 0 4px 16px rgba(0,0,0,0.4)' }}>
                        <h4 className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(251,191,36,0.7)', textShadow: '0 0 12px rgba(251,191,36,0.3)' }}>Stream Data</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Total Duration" value={weeklyForm.total_duration} onChange={(v) => handleWeeklyChange('total_duration', v)} placeholder="hh:mm" ring="#fbbf24" />
                          <Field label="Total Earnings" value={formatComma(weeklyForm.total_earnings)} onChange={(v) => handleWeeklyChange('total_earnings', v)} ring="#fbbf24" />
                          <Field label="Avg Online Users" value={weeklyForm.avg_online_users} onChange={(v) => handleWeeklyChange('avg_online_users', v)} ring="#fbbf24" />
                          <Field label="Gifting Last Week" value={weeklyForm.gifting_count} onChange={(v) => handleWeeklyChange('gifting_count', v)} ring="#fbbf24" />
                          <Field label="Unfollowers" value={weeklyForm.unfollowers} onChange={(v) => handleWeeklyChange('unfollowers', v)} ring="#fbbf24" />
                          <Field label="New Fans" value={weeklyForm.new_fans} onChange={(v) => handleWeeklyChange('new_fans', v)} ring="#fbbf24" />
                          <Field label="New Fanclub Members" value={weeklyForm.new_fanclub_members} onChange={(v) => handleWeeklyChange('new_fanclub_members', v)} ring="#fbbf24" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="relative rounded-2xl p-[1px] overflow-hidden" style={{ background: `linear-gradient(135deg, rgba(245,158,11,0.5), rgba(217,119,6,0.15), rgba(245,158,11,0.5))`, boxShadow: `0 0 40px rgba(245,158,11,0.12), 0 0 15px rgba(245,158,11,0.08)` }}>
                        <div className="relative rounded-2xl p-4 space-y-3" style={{ background: 'rgba(8,4,2,0.88)', backdropFilter: 'blur(22px)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), inset 0 0 30px rgba(245,158,11,0.04), 0 4px 16px rgba(0,0,0,0.4)' }}>
                          <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: '#fbbf24', textShadow: '0 0 12px rgba(251,191,36,0.4)' }}>
                            <Clock size={14} /> Daily Breakdown
                            <span className="text-white/40 font-normal normal-case tracking-normal">(All 7 days required)</span>
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {weeklyBreakdown.map((day, idx) => (
                              <div key={day.date} className="rounded-lg p-2 space-y-1.5" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(245,158,11,0.04))', border: '1px solid rgba(245,158,11,0.15)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.3)' }}>
                                <label className="text-[8px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>{displayDate(day.date)}</label>
                                <input type="text" placeholder="Points" value={formatComma(day.points)} onChange={(e) => updateWeeklyBreakdown(idx, 'points', e.target.value.replace(/,/g, ''))}
                                  className="w-full rounded-md px-2 py-1 text-[10px] text-white focus:outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                <input type="text" placeholder="hh:mm" value={day.duration} onChange={(e) => updateWeeklyBreakdown(idx, 'duration', e.target.value)}
                                  className="w-full rounded-md px-2 py-1 text-[10px] text-white focus:outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mx-auto" style={{ width: '92%', maxWidth: '360px' }}>
                        <div className="relative rounded-2xl p-[1px] overflow-hidden" style={{ background: `linear-gradient(135deg, rgba(245,158,11,0.5), rgba(217,119,6,0.15), rgba(245,158,11,0.5))`, boxShadow: `0 0 40px rgba(245,158,11,0.12), 0 0 15px rgba(245,158,11,0.08)` }}>
                          <div className="relative rounded-2xl p-4 space-y-3" style={{ background: 'rgba(8,4,2,0.88)', backdropFilter: 'blur(22px)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), inset 0 0 30px rgba(245,158,11,0.04), 0 4px 16px rgba(0,0,0,0.4)' }}>
                            <h4 className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(251,191,36,0.7)', textShadow: '0 0 12px rgba(251,191,36,0.3)' }}>Preview</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-[10px] border-collapse">
                                <thead>
                                  <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                    <th className="text-left py-2 px-2 font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Date</th>
                                    <th className="text-right py-2 px-2 font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Points</th>
                                    <th className="text-right py-2 px-2 font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Duration</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {weeklyBreakdown.map((day, idx) => {
                                const sd = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                return (
                                    <tr key={day.date} className="border-b hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                      <td className="py-1.5 px-2 text-white/80">{sd}</td>
                                      <td className="py-1.5 px-2 text-right text-white/80">{formatComma(day.points) || '—'}</td>
                                      <td className="py-1.5 px-2 text-right text-white/80">{day.duration || '00:00'}</td>
                                    </tr>
                                );
                              })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mx-auto" style={{ width: '92%', maxWidth: '360px' }}>
                    <div className="space-y-4">
                      <StatusMessages error={submitError} success={submitSuccess} />
                      <SubmitBtn onClick={submitWeeklyReport} disabled={isSubmitting || !selectedHostId} loading={isSubmitting} label="Add Report" color="#fbbf24" />
                    </div>
                  </div>
                </div>
              )}

              {/* ── MONTHLY (Earthy) ──────────────────────────────────────── */}
              {st === 'monthly' && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(16,185,129,0.04))', border: '1px solid rgba(16,185,129,0.15)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.3)' }}>
                    <button onClick={() => setMonthOffset(prev => prev - 1)} className="p-1.5 hover:bg-white/10 rounded-lg transition-all cursor-pointer" style={{ color: '#34d399' }}>
                      <ChevronLeft size={18} />
                    </button>
                    <div className="flex-1 text-center">
                      <span className="text-xs font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.9)' }}>
                        {new Date(monthRange.firstDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <button onClick={() => setMonthOffset(prev => prev + 1)} className="p-1.5 hover:bg-white/10 rounded-lg transition-all cursor-pointer" style={{ color: '#34d399' }}>
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div className="space-y-5">
                    <div className="relative rounded-2xl p-[1px] overflow-hidden" style={{ background: `linear-gradient(135deg, rgba(16,185,129,0.5), rgba(5,150,105,0.15), rgba(16,185,129,0.5))`, boxShadow: `0 0 40px rgba(16,185,129,0.12), 0 0 15px rgba(16,185,129,0.08)` }}>
                      <div className="relative rounded-2xl p-4 space-y-3" style={{ background: 'rgba(8,4,2,0.88)', backdropFilter: 'blur(22px)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), inset 0 0 30px rgba(16,185,129,0.04), 0 4px 16px rgba(0,0,0,0.4)' }}>
                        <h4 className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(52,211,153,0.7)', textShadow: '0 0 12px rgba(52,211,153,0.3)' }}>Stream Data</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Total Duration" value={monthlyForm.total_duration} onChange={(v) => handleMonthlyChange('total_duration', v)} placeholder="hh:mm" ring="#34d399" />
                          <Field label="Total Earnings" value={formatComma(monthlyForm.total_earnings)} onChange={(v) => handleMonthlyChange('total_earnings', v)} ring="#34d399" />
                          <Field label="Total Earnings (Past 3 Mos)" value={formatComma(monthlyForm.last_3mos_earnings)} onChange={(v) => handleMonthlyChange('last_3mos_earnings', v)} ring="#34d399" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="relative rounded-2xl p-[1px] overflow-hidden" style={{ background: `linear-gradient(135deg, rgba(16,185,129,0.5), rgba(5,150,105,0.15), rgba(16,185,129,0.5))`, boxShadow: `0 0 40px rgba(16,185,129,0.12), 0 0 15px rgba(16,185,129,0.08)` }}>
                        <div className="relative rounded-2xl p-4 space-y-3" style={{ background: 'rgba(8,4,2,0.88)', backdropFilter: 'blur(22px)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), inset 0 0 30px rgba(16,185,129,0.04), 0 4px 16px rgba(0,0,0,0.4)' }}>
                          <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: '#34d399', textShadow: '0 0 12px rgba(52,211,153,0.4)' }}>
                            <Clock size={14} /> Daily Breakdown
                            <span className="text-white/40 font-normal normal-case tracking-normal">(All {monthRange.dates.length} days required)</span>
                          </h4>
                          <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto custom-scrollbar p-1">
                            {monthlyBreakdown.map((day, idx) => (
                              <div key={day.date} className="rounded-lg p-2 space-y-1.5 min-w-0" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(16,185,129,0.04))', border: '1px solid rgba(16,185,129,0.15)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.3)' }}>
                                <label className="text-[8px] font-black uppercase tracking-widest block truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{displayDate(day.date)}</label>
                                <input type="text" placeholder="Points" value={formatComma(day.points)} onChange={(e) => updateMonthlyBreakdown(idx, 'points', e.target.value.replace(/,/g, ''))}
                                  className="w-full rounded px-1.5 py-1 text-[9px] text-white focus:outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }} />
                                <input type="text" placeholder="hh:mm" value={day.duration} onChange={(e) => updateMonthlyBreakdown(idx, 'duration', e.target.value)}
                                  className="w-full rounded px-1.5 py-1 text-[9px] text-white focus:outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mx-auto" style={{ width: '92%', maxWidth: '360px' }}>
                        <div className="relative rounded-2xl p-[1px] overflow-hidden" style={{ background: `linear-gradient(135deg, rgba(16,185,129,0.5), rgba(5,150,105,0.15), rgba(16,185,129,0.5))`, boxShadow: `0 0 40px rgba(16,185,129,0.12), 0 0 15px rgba(16,185,129,0.08)` }}>
                          <div className="relative rounded-2xl p-4 space-y-3" style={{ background: 'rgba(8,4,2,0.88)', backdropFilter: 'blur(22px)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05), inset 0 0 30px rgba(16,185,129,0.04), 0 4px 16px rgba(0,0,0,0.4)' }}>
                            <h4 className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(52,211,153,0.7)', textShadow: '0 0 12px rgba(52,211,153,0.3)' }}>Preview</h4>
                          <div className="overflow-x-auto max-h-60 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-[10px] border-collapse">
                              <thead className="sticky top-0" style={{ background: 'rgba(10,6,4,0.95)' }}>
                                <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                  <th className="text-left py-2 px-2 font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Date</th>
                                  <th className="text-right py-2 px-2 font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Points</th>
                                  <th className="text-right py-2 px-2 font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Duration</th>
                                </tr>
                              </thead>
                              <tbody>
                                {monthlyBreakdown.map((day, idx) => {
                              const sd = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                              return (
                                  <tr key={day.date} className="border-b hover:bg-white/5" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                    <td className="py-1 px-2 text-white/80">{sd}</td>
                                    <td className="py-1 px-2 text-right text-white/80">{formatComma(day.points) || '—'}</td>
                                    <td className="py-1 px-2 text-right text-white/80">{day.duration || '00:00'}</td>
                                  </tr>
                              );
                            })}
                              </tbody>
                            </table>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mx-auto" style={{ width: '92%', maxWidth: '360px' }}>
                    <div className="space-y-4">
                      <StatusMessages error={submitError} success={submitSuccess} />
                      <SubmitBtn onClick={submitMonthlyReport} disabled={isSubmitting || !selectedHostId} loading={isSubmitting} label="Add Report" color="#34d399" />
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ─── FANBASE REPORTING ──────────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'fanbase' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="relative rounded-3xl p-[1px] overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.6), rgba(190,18,60,0.08), rgba(244,63,94,0.6))', boxShadow: '0 0 80px rgba(244,63,94,0.12), 0 0 30px rgba(244,63,94,0.08)' }}>
            <div className="relative rounded-3xl p-5 space-y-5" style={{ background: 'rgba(8,4,2,0.88)', backdropFilter: 'blur(28px)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06), inset 0 0 40px rgba(244,63,94,0.04), 0 8px 32px rgba(0,0,0,0.6)' }}>
              <div className="flex items-center gap-3 border-b pb-3" style={{ borderColor: 'rgba(16,185,129,0.2)' }}>
                <Users size={16} className="text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-widest text-white/90">Fanbase</h3>
              </div>
              <form onSubmit={handleFanbaseSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>From Date</label>
                    <input type="date" value={fanbaseFormData.from_date} onChange={(e) => setFanbaseFormData(prev => ({ ...prev, from_date: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-xs text-white focus:outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(244,63,94,0.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.3)' }} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>To Date</label>
                    <input type="date" value={fanbaseFormData.to_date} onChange={(e) => setFanbaseFormData(prev => ({ ...prev, to_date: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-xs text-white focus:outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(244,63,94,0.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.3)' }} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Total Followers</label>
                    <input type="number" placeholder="e.g. 1500" value={fanbaseFormData.total_followers} onChange={(e) => setFanbaseFormData(prev => ({ ...prev, total_followers: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-xs text-white focus:outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(244,63,94,0.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.3)' }} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Fanclub Subscribers</label>
                    <input type="number" placeholder="e.g. 500" value={fanbaseFormData.fanclub_subscribers} onChange={(e) => setFanbaseFormData(prev => ({ ...prev, fanclub_subscribers: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-xs text-white focus:outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(244,63,94,0.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.3)' }} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>GC Members</label>
                    <input type="number" placeholder="e.g. 200" value={fanbaseFormData.fanclub_gc_members} onChange={(e) => setFanbaseFormData(prev => ({ ...prev, fanclub_gc_members: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-xs text-white focus:outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(244,63,94,0.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.3)' }} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>GC Activity (Host)</label>
                    <input type="number" placeholder="e.g. 15" value={fanbaseFormData.gc_activity_count_host} onChange={(e) => setFanbaseFormData(prev => ({ ...prev, gc_activity_count_host: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-xs text-white focus:outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(244,63,94,0.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.3)' }} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>GC Activity (Fans)</label>
                    <input type="number" placeholder="e.g. 45" value={fanbaseFormData.gc_activity_count_fans} onChange={(e) => setFanbaseFormData(prev => ({ ...prev, gc_activity_count_fans: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2 text-xs text-white focus:outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(244,63,94,0.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.3)' }} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Notes</label>
                    <textarea value={fanbaseFormData.notes} onChange={(e) => setFanbaseFormData(prev => ({ ...prev, notes: e.target.value }))} rows={3} placeholder="Additional notes..."
                      className="w-full rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(244,63,94,0.2)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.3)' }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 items-start">
                  <div className="space-y-2">
                    {fanbaseError && <p className="text-xs text-red-400 font-bold p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', boxShadow: '0 0 20px rgba(239,68,68,0.08)' }}>{fanbaseError}</p>}
                    {fanbaseSuccess && <p className="text-xs text-emerald-400 font-bold p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 0 20px rgba(16,185,129,0.08)' }}>{fanbaseSuccess}</p>}
                  </div>
                  <button type="submit" disabled={isSubmittingFanbase || !selectedHostId}
                    className="w-full px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] md:text-xs transition-all flex justify-center items-center gap-2 cursor-pointer bg-gradient-to-r from-rose-500 to-red-600 text-white hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ boxShadow: '0 0 30px rgba(244,63,94,0.4), 0 4px 16px rgba(0,0,0,0.4)' }}
                  >{isSubmittingFanbase ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}{isSubmittingFanbase ? 'Submitting...' : 'Submit Fanbase Report'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ─── UNIFIED UPLOAD HISTORY ─────────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {(() => {
        const grouped: Record<string, Record<string, any[]>> = {};
        allHistory.forEach(r => {
          const cat = r.type === 'rpk' ? 'Random PK'
            : r.type === 'fanbase' ? 'Fanbase'
            : 'Livestream';
          const sub = r.type === 'daily' ? 'Daily'
            : r.type === 'weekly' ? 'Weekly'
            : r.type === 'monthly' ? 'Monthly'
            : 'Report';
          if (!grouped[cat]) grouped[cat] = {};
          if (!grouped[cat][sub]) grouped[cat][sub] = [];
          grouped[cat][sub].push(r);
        });
        if (attendanceList.length > 0) {
          if (!grouped['Attendance']) grouped['Attendance'] = {};
          grouped['Attendance']['Events'] = attendanceList;
        }
        if (exposureList.length > 0) {
          if (!grouped['Exposures']) grouped['Exposures'] = {};
          grouped['Exposures']['Past Events'] = exposureList;
        }
        const total = allHistory.length + attendanceList.length + exposureList.length;
        return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4">
          <div className="relative rounded-3xl p-[1px] overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.03))', boxShadow: '0 0 60px rgba(255,255,255,0.04)' }}>
            <div className="relative rounded-3xl p-5 space-y-5" style={{ background: 'rgba(8,4,2,0.82)', backdropFilter: 'blur(24px)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.6)' }}>
              <div className="flex items-center gap-3 border-b pb-3" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                <Clock size={16} className="text-[#D4AF37]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-white/90">Upload History</h3>
                <span className="text-[9px] text-white/40 font-normal">({total} total)</span>
              </div>

              {total === 0 ? (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2 opacity-20" style={{ color: 'rgba(255,255,255,0.3)' }}>—</div>
                  <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>No uploads yet</p>
                  <p className="text-[8px] mt-1" style={{ color: 'rgba(255,255,255,0.15)' }}>Submit reports above to see them here</p>
                </div>
              ) : (
                Object.entries(grouped).map(([category, subs]) => (
                <div key={category} className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest" style={{
                    color: category === 'Random PK' ? '#fbbf24'
                      : category === 'Livestream' ? '#94a3b8'
                      : category === 'Fanbase' ? '#34d399'
                      : category === 'Attendance' ? '#60a5fa'
                      : category === 'Exposures' ? '#a78bfa'
                      : '#94a3b8'
                  }}>
                    {category}
                  </h4>
                  {Object.entries(subs).map(([subcat, items]) => (
                    <div key={subcat} className="space-y-2 pl-3" style={{ borderLeft: '2px solid rgba(255,255,255,0.08)' }}>
                      <h5 className="text-[9px] font-black uppercase tracking-widest text-white/40">{subcat} ({items.length})</h5>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                        {items.map((r: any) => {
                          if (category === 'Attendance') {
                            return (
                              <div key={r.id} className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(96,165,250,0.15)' }}>
                                <div className="text-[8px] font-mono mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                  ID: {r.event_id || r.eventId || r.id?.slice(0,8)}
                                </div>
                                <div className="text-[9px] font-bold text-white mb-0.5">{r.eventTitle || r.event_tittle || 'Event'}</div>
                                <div className="text-[8px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                  {r.eventDate || r.date || '—'} | {r.timeslot || r.time || '—'}
                                </div>
                                <div className="text-[7px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                  {r.eventType || r.type || 'Attendance'}
                                </div>
                              </div>
                            );
                          }
                          if (category === 'Exposures') {
                            const ed = r.event_date || r.date || '';
                            const tm = r.time || (r.from_time && r.to_time ? `${r.from_time} - ${r.to_time}` : '');
                            return (
                              <div key={r.id} className="rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(167,139,250,0.15)' }}>
                                <div className="text-[8px] font-mono mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                  {r.event_id || r.id?.slice(0,8)}
                                </div>
                                <div className="text-[9px] font-bold text-white mb-0.5">{r.title || r.event_tittle || 'Event'}</div>
                                <div className="text-[8px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                  {ed ? displayDate(ed) : '—'} {tm ? `| ${tm}` : ''}
                                </div>
                                <div className="text-[7px] mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                  {r.type || r.type_of_event || r.event_type || 'Exposure'}
                                </div>
                              </div>
                            );
                          }
                          const dateKey = r.date || r.from_date || r.submittedAt || r.timestamp || '';
                          const fmtDate = new Date(r.timestamp || r.submittedAt || 0).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                          return (
                          <div key={r.id} className="rounded-xl p-3 relative group" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[8px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{fmtDate}</span>
                              <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>{dateKey.slice(0,10)}</span>
                              {canModify(r.reporterID || r.reporter_id) && (
                                <button onClick={() => deleteGlobalReport(r)} className="p-1 text-red-400 hover:bg-white/10 rounded-md transition-all cursor-pointer opacity-0 md:group-hover:opacity-100">
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </div>
                            <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                              {r.type === 'rpk' && <>PK: {r.pk_wins_percent || '—'}% | {r.pk_points || 0} pts | {r.pk_sessions || 0} sessions</>}
                              {r.type === 'fanbase' && <>Followers: {r.total_followers || r.currentFollowers || 0} | FC: {r.fanclub_subscribers || r.fanclubSubscribers || 0}</>}
                              {(r.type === 'daily') && <>Date: {r.date} | Pts: {r.won_points || 0} | Earnings: {formatComma(r.live_earnings || 0)}</>}
                              {(r.type === 'weekly') && <>{displayFullDate(r.from_date)} — {displayFullDate(r.to_date)} | Earnings: {formatComma(r.total_earnings || 0)}</>}
                              {(r.type === 'monthly') && <>{r.from_date?.slice(0,7)} | Earnings: {formatComma(r.total_earnings || 0)}</>}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                ))
              )}
            </div>
          </div>
        </div>
        );
      })()}
        </div>
      </div>
    </div>
  </div>
  );
};

// ── Reusable Sub-components ──────────────────────────────────────────────────


const Field = ({ label, value, onChange, placeholder, ring }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; ring?: string }) => (
  <div className="space-y-1">
    <label className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</label>
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
      style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${ring ? ring + '33' : 'rgba(255,255,255,0.1)'}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03), 0 2px 8px rgba(0,0,0,0.3)' }}
      onFocus={(e) => { if (ring) e.target.style.borderColor = ring; }}
      onBlur={(e) => { e.target.style.borderColor = ring ? `${ring}33` : 'rgba(255,255,255,0.1)'; }} />
  </div>
);

const StatusMessages = ({ error, success }: { error: string; success: string }) => (
  <>
    {error && <p className="text-xs text-red-400 font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</p>}
    {success && <p className="text-xs text-emerald-400 font-bold bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">{success}</p>}
  </>
);

const SubmitBtn = ({ onClick, disabled, loading, label, color }: { onClick: () => void; disabled: boolean; loading: boolean; label: string; color?: string }) => {
  const gradFrom = color || '#D4AF37';
  const gradTo = color || '#F59E0B';
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] md:text-xs transition-all flex justify-center items-center gap-2 cursor-pointer text-black hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: `linear-gradient(to right, ${gradFrom}dd, ${gradTo}88)`, boxShadow: color ? `0 0 30px ${color}55, 0 4px 16px rgba(0,0,0,0.4)` : '0 0 25px rgba(212,175,55,0.4), 0 4px 16px rgba(0,0,0,0.4)' }}
    >{loading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}{loading ? 'Submitting...' : label}</button>
  );
};

const HistoryCard = ({ report, canModify, onEdit, onDelete, editingId, editForm, setEditForm, onSave, onCancel, renderFields }: {
  report: any; canModify: boolean; onEdit: () => void; onDelete: () => void;
  editingId: string | null; editForm: any; setEditForm: (f: any) => void; onSave: () => void; onCancel: () => void; renderFields: () => React.ReactNode;
}) => {
  const isEditing = editingId === report.id;
  return (
    <div className="bg-black/30 border border-white/5 rounded-xl p-3 relative group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] text-white/40 font-mono">{new Date(report.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        {canModify && (
          <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1 text-indigo-400 hover:bg-white/10 rounded-md transition-all cursor-pointer"><Edit2 size={12} /></button>
            <button onClick={onDelete} className="p-1 text-red-400 hover:bg-white/10 rounded-md transition-all cursor-pointer"><Trash2 size={12} /></button>
          </div>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(editForm || {}).filter(([k]) => !['id', 'reporterID', 'reporterName', 'reporterRole', 'reporter_id', 'reporter_name', 'reporter_role', 'hostID', 'hostNickname', 'timestamp', 'type'].includes(k)).map(([key, val]) => (
              <div key={key} className="space-y-0.5">
                <label className="text-[7px] text-white/40 font-black uppercase tracking-widest">{key.replace(/_/g, ' ')}</label>
                <input type="text" value={String(val || '')} onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                  className="w-full bg-[#0A0604] border border-white/10 rounded px-1.5 py-1 text-[9px] text-white focus:outline-none focus:border-indigo-500/50" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={onSave} className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg cursor-pointer">Save</button>
            <button onClick={onCancel} className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-[9px] font-black uppercase tracking-widest rounded-lg cursor-pointer">Cancel</button>
          </div>
        </div>
      ) : (
        renderFields()
      )}
    </div>
  );
};

/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { Shield, Save, Send, Sparkles, AlertCircle, CheckCircle2, ChevronRight, Lock } from 'lucide-react';
import { Storage } from '../lib/storage';
import { Host, ReportingSubmission, ReportingSubmissionPayload, PKEntry, FanbaseHealthEntry, WeeklyLiveDataEntry, MonthlyLiveDataEntry } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { FirebaseService } from '../lib/firebaseService';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DateRangePicker } from './InteractiveDatePicker';

const getUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1A1A28] border border-white/5 p-3 rounded-xl shadow-2xl">
        <p className="text-[#F0EFE8] font-bold text-xs mb-2">{label}</p>
        {payload.map((p: any, i: number) => (
          <p
            key={i}
            style={{ color: p.color }}
            className="text-[10px] font-black uppercase tracking-wider"
          >
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const DataReportingTab = () => {
  const auth = Storage.getAuthState();
  const isTalent = auth.role === 'Talent';

  // Navigation state (4 tabs)
  const [activeTab, setActiveTab] = useState<'random_pk' | 'fanbase' | 'weekly_live_data' | 'monthly_live_data'>('random_pk');

  // Load roster hosts for autocomplete dropdown
  const [hostsList, setHostsList] = useState<Host[]>([]);
  useEffect(() => {
    const loadHosts = async () => {
      try {
        const dataPromise = FirebaseService.getAllHosts();
        const timeoutPromise = new Promise<Host[]>((_, reject) =>
          setTimeout(() => reject(new Error("Hosts fetch timed out")), 5000)
        );
        const data = await Promise.race([dataPromise, timeoutPromise]);
        setHostsList(data.length > 0 ? data : Storage.getHosts());
      } catch (err) {
        console.warn("Failed to load hosts, fallback to cache:", err);
        setHostsList(Storage.getHosts());
      }
    };
    loadHosts();
  }, []);

  // Form Fields State
  const [poppoId, setPoppoId] = useState(isTalent ? auth.poppo_id : '');
  const [nickname, setNickname] = useState(isTalent ? (auth.nickname || auth.name) : '');

  // 1. Random PK fields
  const [pkStartDate, setPkStartDate] = useState('');
  const [pkEndDate, setPkEndDate] = useState('');
  const [pkWinPercentage, setPkWinPercentage] = useState<string>('');
  const [pkScore, setPkScore] = useState<string>('');
  const [pkSessions, setPkSessions] = useState<string>('');

  // 2. Fanbase fields
  const [fanbaseStartDate, setFanbaseStartDate] = useState('');
  const [fanbaseEndDate, setFanbaseEndDate] = useState('');
  const [fanbaseSubscribers, setFanbaseSubscribers] = useState<string>('');
  const [fanbaseGcMembers, setFanbaseGcMembers] = useState<string>('');
  const [preStreamUpdate, setPreStreamUpdate] = useState('');
  const [postStreamUpdate, setPostStreamUpdate] = useState('');

  // 3. Live Data (Weekly & Monthly) fields
  const [liveFromDate, setLiveFromDate] = useState('');
  const [liveToDate, setLiveToDate] = useState('');
  const [liveTotalDuration, setLiveTotalDuration] = useState<string>('');
  const [liveTotalEarnings, setLiveTotalEarnings] = useState<string>('');
  const [liveTotalPoints, setLiveTotalPoints] = useState<string>('');
  const [liveAvgOnlineUsers, setLiveAvgOnlineUsers] = useState<string>('');
  const [liveNewFans, setLiveNewFans] = useState<string>('');
  const [liveNewFanclubMembers, setLiveNewFanclubMembers] = useState<string>('');
  const [liveGiftingCount, setLiveGiftingCount] = useState<string>('');
  const [liveUnfollowers, setLiveUnfollowers] = useState<string>('');
  const [liveNotes, setLiveNotes] = useState('');

  // Status and Submission tracking
  const [submissionId, setSubmissionId] = useState(() => getUUID());
  const [status, setStatus] = useState<'draft' | 'submitted' | 'editing'>('editing');
  const [successMsg, setSuccessMsg] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Past Submissions (Drafts & Submitted)
  const [pastSubmissions, setPastSubmissions] = useState<ReportingSubmission[]>([]);

  const fetchPastSubmissions = async () => {
    try {
      const dataPromise = FirebaseService.getReportingSubmissions();
      const timeoutPromise = new Promise<ReportingSubmission[]>((_, reject) =>
        setTimeout(() => reject(new Error("Submissions fetch timed out")), 5000)
      );
      const allSubmissions = await Promise.race([dataPromise, timeoutPromise]);
      // Filter by current user or show all for leadership
      if (auth.role === 'Director' || auth.role === 'Head Admin') {
        setPastSubmissions(allSubmissions);
      } else {
        setPastSubmissions(allSubmissions.filter(s => s.submittedByUserId === auth.poppo_id));
      }
    } catch (err) {
      console.error("Failed to load submissions:", err);
      setPastSubmissions([]);
    }
  };

  useEffect(() => {
    fetchPastSubmissions();
  }, [auth.poppo_id]);

  // Handle autocomplete matching when selecting a host
  const handleHostSelect = (selectedId: string) => {
    const selectedHost = hostsList.find(h => h.id === selectedId);
    if (selectedHost) {
      setPoppoId(selectedHost.id);
      setNickname(selectedHost.nickname || selectedHost.name);
    } else {
      setPoppoId(selectedId);
    }
  };

  // Helper to validate inputs based on active tab
  const validateInputs = (): boolean => {
    const validationErrors: string[] = [];
    
    if (!poppoId.trim()) {
      validationErrors.push('Poppo ID is required.');
    }
    if (!nickname.trim()) {
      validationErrors.push('Nickname is required.');
    }

    if (activeTab === 'random_pk') {
      if (!pkStartDate) validationErrors.push("From Date is required.");
      if (!pkEndDate) validationErrors.push("To Date is required.");
      if (pkStartDate && pkEndDate && new Date(pkStartDate) > new Date(pkEndDate)) {
        validationErrors.push("From Date must be before or equal to To Date.");
      }
      if (pkWinPercentage === '') {
        validationErrors.push("PK Win % is required.");
      } else {
        const win = parseFloat(pkWinPercentage);
        if (isNaN(win) || win < 0 || win > 100) {
          validationErrors.push("PK Win % must be a number between 0 and 100.");
        }
      }
      if (pkScore === '') {
        validationErrors.push("PK Score is required.");
      } else {
        const score = parseInt(pkScore, 10);
        if (isNaN(score) || score < 0) {
          validationErrors.push("PK Score must be a positive integer.");
        }
      }
      if (pkSessions === '') {
        validationErrors.push("PK Sessions is required.");
      } else {
        const sessions = parseInt(pkSessions, 10);
        if (isNaN(sessions) || sessions < 0) {
          validationErrors.push("PK Sessions must be a positive integer.");
        }
      }
    } else if (activeTab === 'fanbase') {
      if (!fanbaseStartDate) validationErrors.push("Week Start Date is required.");
      if (!fanbaseEndDate) validationErrors.push("Week End Date is required.");
      if (fanbaseStartDate && fanbaseEndDate && new Date(fanbaseStartDate) > new Date(fanbaseEndDate)) {
        validationErrors.push("Week Start Date must be before or equal to Week End Date.");
      }
      if (fanbaseSubscribers === '') {
        validationErrors.push("Fanclub Subscribers is required.");
      } else {
        const sub = parseInt(fanbaseSubscribers, 10);
        if (isNaN(sub) || sub < 0) {
          validationErrors.push("Fanclub Subscribers must be a positive integer.");
        }
      }
      if (fanbaseGcMembers === '') {
        validationErrors.push("Fanclub GC Members is required.");
      } else {
        const gc = parseInt(fanbaseGcMembers, 10);
        if (isNaN(gc) || gc < 0) {
          validationErrors.push("Fanclub GC Members must be a positive integer.");
        }
      }
      if (!preStreamUpdate.trim()) {
        validationErrors.push("Pre-Stream Status Update is required.");
      }
      if (!postStreamUpdate.trim()) {
        validationErrors.push("Post-Stream Status Update is required.");
      }
    } else if (activeTab === 'weekly_live_data' || activeTab === 'monthly_live_data') {
      if (!liveFromDate) validationErrors.push("From Date is required.");
      if (!liveToDate) validationErrors.push("To Date is required.");
      if (liveFromDate && liveToDate && new Date(liveFromDate) > new Date(liveToDate)) {
        validationErrors.push("From Date must be before or equal to To Date.");
      }
      if (liveTotalDuration === '') {
        validationErrors.push("Total Duration is required.");
      } else {
        const duration = parseFloat(liveTotalDuration);
        if (isNaN(duration) || duration < 0) {
          validationErrors.push("Total Duration must be a positive number.");
        }
      }
      if (liveTotalEarnings === '') {
        validationErrors.push("Total Earnings is required.");
      } else {
        const earnings = parseInt(liveTotalEarnings, 10);
        if (isNaN(earnings) || earnings < 0) {
          validationErrors.push("Total Earnings must be a positive integer.");
        }
      }
      if (liveTotalPoints === '') {
        validationErrors.push("Total Points is required.");
      } else {
        const pts = parseInt(liveTotalPoints, 10);
        if (isNaN(pts) || pts < 0) {
          validationErrors.push("Total Points must be a positive integer.");
        }
      }
      if (liveAvgOnlineUsers === '') {
        validationErrors.push("Average Online Users is required.");
      } else {
        const avg = parseInt(liveAvgOnlineUsers, 10);
        if (isNaN(avg) || avg < 0) {
          validationErrors.push("Average Online Users must be a positive integer.");
        }
      }
      if (liveNewFans === '') {
        validationErrors.push("New Fans is required.");
      } else {
        const fans = parseInt(liveNewFans, 10);
        if (isNaN(fans) || fans < 0) {
          validationErrors.push("New Fans must be a positive integer.");
        }
      }
      if (liveNewFanclubMembers === '') {
        validationErrors.push("New Fanclub Members is required.");
      } else {
        const fc = parseInt(liveNewFanclubMembers, 10);
        if (isNaN(fc) || fc < 0) {
          validationErrors.push("New Fanclub Members must be a positive integer.");
        }
      }
      if (liveGiftingCount === '') {
        validationErrors.push("Gifting Count is required.");
      } else {
        const gifting = parseInt(liveGiftingCount, 10);
        if (isNaN(gifting) || gifting < 0) {
          validationErrors.push("Gifting Count must be a positive integer.");
        }
      }
      if (liveUnfollowers === '') {
        validationErrors.push("Unfollowers is required.");
      } else {
        const unfollow = parseInt(liveUnfollowers, 10);
        if (isNaN(unfollow) || unfollow < 0) {
          validationErrors.push("Unfollowers must be a positive integer.");
        }
      }
    }

    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  // Common wrapper to compile data payload
  const buildPayload = (): ReportingSubmissionPayload => {
    const payload: ReportingSubmissionPayload = {
      poppoId: poppoId.trim(),
      nickname: nickname.trim(),
      submitted_by: auth.name || auth.nickname || 'SystemUser',
      submitted_role: auth.role || 'Unknown',
      timestamp: new Date().toISOString()
    };

    if (activeTab === 'random_pk') {
      payload.from_date = pkStartDate;
      payload.to_date = pkEndDate;
      payload.win_percentage = pkWinPercentage !== '' ? parseFloat(pkWinPercentage) : undefined;
      payload.pk_score = pkScore !== '' ? parseInt(pkScore, 10) : undefined;
      payload.sessions = pkSessions !== '' ? parseInt(pkSessions, 10) : undefined;
    } else if (activeTab === 'fanbase') {
      payload.weekStartDate = fanbaseStartDate;
      payload.weekEndDate = fanbaseEndDate;
      payload.fanclubSubscribers = fanbaseSubscribers !== '' ? parseInt(fanbaseSubscribers, 10) : undefined;
      payload.fanclubGcMembers = fanbaseGcMembers !== '' ? parseInt(fanbaseGcMembers, 10) : undefined;
      payload.preStreamUpdate = preStreamUpdate;
      payload.postStreamUpdate = postStreamUpdate;
    } else if (activeTab === 'weekly_live_data' || activeTab === 'monthly_live_data') {
      payload.from_date = liveFromDate;
      payload.to_date = liveToDate;
      payload.totalDuration = liveTotalDuration !== '' ? parseFloat(liveTotalDuration) : undefined;
      payload.totalEarnings = liveTotalEarnings !== '' ? parseInt(liveTotalEarnings, 10) : undefined;
      payload.totalPoints = liveTotalPoints !== '' ? parseInt(liveTotalPoints, 10) : undefined;
      payload.avg_online_users = liveAvgOnlineUsers !== '' ? parseInt(liveAvgOnlineUsers, 10) : undefined;
      payload.new_fans = liveNewFans !== '' ? parseInt(liveNewFans, 10) : undefined;
      payload.new_fanclub_members = liveNewFanclubMembers !== '' ? parseInt(liveNewFanclubMembers, 10) : undefined;
      payload.gifting_count = liveGiftingCount !== '' ? parseInt(liveGiftingCount, 10) : undefined;
      payload.unfollowers = liveUnfollowers !== '' ? parseInt(liveUnfollowers, 10) : undefined;
      payload.notes = liveNotes;
    }

    return payload;
  };

  // SAVE DRAFT
  const handleSaveDraft = async () => {
    setErrors([]);
    setIsProcessing(true);
    
    if (!poppoId.trim() || !nickname.trim()) {
      setErrors(['Poppo ID and Nickname are required even for saving a draft.']);
      setIsProcessing(false);
      return;
    }

    const submission: ReportingSubmission = {
      submissionId,
      reportType: activeTab,
      submittedByUserId: auth.poppo_id || 'SystemUser',
      status: 'draft',
      dataPayload: buildPayload()
    };

    try {
      await FirebaseService.saveReportingSubmission(submission);
      await FirebaseService.logSystemActivity(`Saved draft codebase report of type "${activeTab}" for Host: ${nickname} (Poppo ID: ${poppoId.trim()})`, 'Info');
      setStatus('draft');
      setSuccessMsg('Draft saved successfully! Session stamped.');
      fetchPastSubmissions();
    } catch (err: any) {
      setErrors([err.message || 'Failed to save draft.']);
    } finally {
      setIsProcessing(false);
    }
  };

  // SUBMIT REPORT
  const handleSubmitReport = async () => {
    setErrors([]);
    if (!validateInputs()) return;

    setIsProcessing(true);
    const submission: ReportingSubmission = {
      submissionId,
      reportType: activeTab,
      submittedByUserId: auth.poppo_id || 'SystemUser',
      status: 'submitted',
      dataPayload: buildPayload()
    };

    try {
      // 1. Save to submissions collection
      await FirebaseService.saveReportingSubmission(submission);

      // 2. Dual-save to dedicated Firestore table based on reportType
      if (activeTab === 'random_pk') {
        const pkRecord: PKEntry = {
          id: submissionId,
          poppo_id: poppoId.trim(),
          start_date: pkStartDate,
          end_date: pkEndDate,
          win_percentage: parseFloat(pkWinPercentage),
          pk_score: parseInt(pkScore, 10),
          sessions: parseInt(pkSessions, 10),
          submitted_by: auth.name || 'Anonymous',
          submitted_role: auth.role || 'Host',
          timestamp: new Date().toISOString()
        };
        await FirebaseService.savePKRecords([pkRecord]);
      } else if (activeTab === 'fanbase') {
        const fanbaseRecord: FanbaseHealthEntry = {
          id: submissionId,
          hostId: poppoId.trim(),
          subscribers: parseInt(fanbaseSubscribers, 10),
          gcMembers: parseInt(fanbaseGcMembers, 10),
          preStreamUpdate: preStreamUpdate.trim(),
          postStreamUpdate: postStreamUpdate.trim(),
          submittedBy: auth.name || 'Anonymous',
          submittedAt: new Date().toISOString()
        };
        await FirebaseService.saveFanbaseHealth([fanbaseRecord]);
      } else if (activeTab === 'weekly_live_data') {
        const weeklyRecord: WeeklyLiveDataEntry = {
          id: submissionId,
          poppo_id: poppoId.trim(),
          nickname: nickname.trim(),
          from_date: liveFromDate,
          to_date: liveToDate,
          total_duration: parseFloat(liveTotalDuration),
          total_earnings: parseInt(liveTotalEarnings, 10),
          avg_online_users: parseInt(liveAvgOnlineUsers, 10),
          new_fans: parseInt(liveNewFans, 10),
          new_fanclub_members: parseInt(liveNewFanclubMembers, 10),
          gifting_count: parseInt(liveGiftingCount, 10),
          unfollowers: parseInt(liveUnfollowers, 10),
          total_points: parseInt(liveTotalPoints, 10),
          notes: liveNotes.trim(),
          submitted_by: auth.name || 'Anonymous',
          submitted_role: auth.role || 'Host',
          timestamp: new Date().toISOString()
        };
        await FirebaseService.saveWeeklyLiveData([weeklyRecord]);
      } else if (activeTab === 'monthly_live_data') {
        const monthlyRecord: MonthlyLiveDataEntry = {
          id: submissionId,
          poppo_id: poppoId.trim(),
          nickname: nickname.trim(),
          from_date: liveFromDate,
          to_date: liveToDate,
          total_duration: parseFloat(liveTotalDuration),
          total_earnings: parseInt(liveTotalEarnings, 10),
          avg_online_users: parseInt(liveAvgOnlineUsers, 10),
          new_fans: parseInt(liveNewFans, 10),
          new_fanclub_members: parseInt(liveNewFanclubMembers, 10),
          gifting_count: parseInt(liveGiftingCount, 10),
          unfollowers: parseInt(liveUnfollowers, 10),
          total_points: parseInt(liveTotalPoints, 10),
          notes: liveNotes.trim(),
          submitted_by: auth.name || 'Anonymous',
          submitted_role: auth.role || 'Host',
          timestamp: new Date().toISOString()
        };
        await FirebaseService.saveMonthlyLiveData([monthlyRecord]);
      }

      // Trigger a window event so that other tabs reload data if needed
      window.dispatchEvent(new Event('data-updated'));

      await FirebaseService.logSystemActivity(`Submitted and committed codebase report of type "${activeTab}" for Host: ${nickname} (Poppo ID: ${poppoId.trim()})`, 'Info');

      setStatus('submitted');
      setSuccessMsg('Report submitted and committed successfully! Form fields are now locked.');
      fetchPastSubmissions();
    } catch (err: any) {
      setErrors([err.message || 'Failed to submit report.']);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset or Start new submission
  const handleResetForm = () => {
    setSubmissionId(getUUID());
    setStatus('editing');
    setSuccessMsg('');
    setErrors([]);
    
    // Keep values if user is Talent, otherwise reset
    if (!isTalent) {
      setPoppoId('');
      setNickname('');
    }
    // Random PK
    setPkStartDate('');
    setPkEndDate('');
    setPkWinPercentage('');
    setPkScore('');
    setPkSessions('');
    // Fanbase
    setFanbaseStartDate('');
    setFanbaseEndDate('');
    setFanbaseSubscribers('');
    setFanbaseGcMembers('');
    setPreStreamUpdate('');
    setPostStreamUpdate('');
    // Live Data
    setLiveFromDate('');
    setLiveToDate('');
    setLiveTotalDuration('');
    setLiveTotalEarnings('');
    setLiveTotalPoints('');
    setLiveAvgOnlineUsers('');
    setLiveNewFans('');
    setLiveNewFanclubMembers('');
    setLiveGiftingCount('');
    setLiveUnfollowers('');
    setLiveNotes('');
  };

  // Load past submission/draft
  const handleLoadSubmission = (sub: ReportingSubmission) => {
    setSubmissionId(sub.submissionId);
    setStatus(sub.status);
    setErrors([]);
    setSuccessMsg('');

    // Determine tabs
    setActiveTab(sub.reportType);

    // Set payloads
    const payload = sub.dataPayload;
    setPoppoId(payload.poppoId);
    setNickname(payload.nickname);

    if (sub.reportType === 'random_pk') {
      setPkStartDate(payload.from_date || '');
      setPkEndDate(payload.to_date || '');
      setPkWinPercentage(payload.win_percentage !== undefined ? String(payload.win_percentage) : '');
      setPkScore(payload.pk_score !== undefined ? String(payload.pk_score) : '');
      setPkSessions(payload.sessions !== undefined ? String(payload.sessions) : '');
    } else if (sub.reportType === 'fanbase') {
      setFanbaseStartDate(payload.weekStartDate || '');
      setFanbaseEndDate(payload.weekEndDate || '');
      setFanbaseSubscribers(payload.fanclubSubscribers !== undefined ? String(payload.fanclubSubscribers) : '');
      setFanbaseGcMembers(payload.fanclubGcMembers !== undefined ? String(payload.fanclubGcMembers) : '');
      setPreStreamUpdate(payload.preStreamUpdate || '');
      setPostStreamUpdate(payload.postStreamUpdate || '');
    } else if (sub.reportType === 'weekly_live_data' || sub.reportType === 'monthly_live_data') {
      setLiveFromDate(payload.from_date || '');
      setLiveToDate(payload.to_date || '');
      setLiveTotalDuration(payload.totalDuration !== undefined ? String(payload.totalDuration) : '');
      setLiveTotalEarnings(payload.totalEarnings !== undefined ? String(payload.totalEarnings) : '');
      setLiveTotalPoints(payload.totalPoints !== undefined ? String(payload.totalPoints) : '');
      setLiveAvgOnlineUsers(payload.avg_online_users !== undefined ? String(payload.avg_online_users) : '');
      setLiveNewFans(payload.new_fans !== undefined ? String(payload.new_fans) : '');
      setLiveNewFanclubMembers(payload.new_fanclub_members !== undefined ? String(payload.new_fanclub_members) : '');
      setLiveGiftingCount(payload.gifting_count !== undefined ? String(payload.gifting_count) : '');
      setLiveUnfollowers(payload.unfollowers !== undefined ? String(payload.unfollowers) : '');
      setLiveNotes(payload.notes || '');
    }
  };

  const isLocked = status === 'submitted';

  // Transform pastSubmissions for charts
  const getChartData = () => {
    // Chart data for the selected host, or all if none selected
    const filtered = poppoId ? pastSubmissions.filter(s => s.dataPayload.poppoId === poppoId) : pastSubmissions;
    const tabFiltered = filtered.filter(s => s.reportType === activeTab);
    
    return tabFiltered.map(sub => {
      const d = sub.dataPayload;
      let dateLabel = d.timestamp ? new Date(d.timestamp).toLocaleDateString() : '';
      if (activeTab === 'random_pk') dateLabel = d.from_date || dateLabel;
      if (activeTab === 'fanbase') dateLabel = d.weekStartDate || dateLabel;
      if (activeTab === 'weekly_live_data' || activeTab === 'monthly_live_data') dateLabel = d.from_date || dateLabel;

      return {
        ...d,
        dateLabel,
      };
    }).sort((a, b) => new Date(a.dateLabel).getTime() - new Date(b.dateLabel).getTime());
  };
  const chartData = getChartData();



  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#F0EFE8] tracking-tight flex items-center gap-2">
            <Sparkles className="text-[#D4AF37] font-bold" size={24} />
            Data Reporting Cockpit
          </h2>
          <p className="text-xs text-[#A09E9A] font-medium">
            Authorized: <span className="text-[#D4AF37] font-bold">{auth.name}</span> • Role: <span className="text-indigo-400 font-mono text-[10px] uppercase tracking-wider">{auth.role}</span>
          </p>
        </div>

        {/* 4-Tab Segmented Selector */}
        <div className="flex gap-1.5 p-1.5 bg-[#13131E] rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
          {[
            { id: 'random_pk', label: 'Random PK' },
            { id: 'fanbase', label: 'Fanbase' },
            { id: 'weekly_live_data', label: 'Weekly Live Data' },
            { id: 'monthly_live_data', label: 'Monthly Live Data' }
          ].map(tab => (
            <button
              key={tab.id}
              disabled={isLocked}
              onClick={() => { setActiveTab(tab.id as any); setErrors([]); }}
              className={cn(
                "px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer",
                isLocked && "opacity-55 cursor-not-allowed",
                activeTab === tab.id
                  ? "bg-[#D4AF37] text-[#0D0D14] shadow-lg shadow-[#D4AF37]/20 font-black"
                  : "text-[#A09E9A] hover:text-[#F0EFE8] hover:bg-white/5"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Success Message */}
      {successMsg && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-xs font-bold flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 size={14} />
          </div>
          {successMsg}
        </motion.div>
      )}

      {/* Errors List */}
      {errors.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold space-y-1.5">
          {errors.map((err, i) => (
            <div key={i} className="flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              {err}
            </div>
          ))}
        </motion.div>
      )}

      {/* Main Form container: Premium glass-card background */}
      <div className="relative overflow-hidden glass-card border border-white/5 rounded-[32px] p-8 shadow-2xl">
        
        {/* Lock Overlay Banner */}
        {isLocked && (
          <div className="absolute inset-0 bg-[#0D0D14]/90 backdrop-blur-md z-30 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-2xl">
              <Lock size={32} />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-lg font-black text-[#F0EFE8] uppercase tracking-wider">Report Stamped & Committed</h4>
              <p className="text-xs text-[#A09E9A] px-12">This data entry is locked and recorded in the database. No edits are allowed.</p>
            </div>
            <button
              onClick={handleResetForm}
              className="mt-2 px-6 py-3 btn-gold rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer shadow-lg"
            >
              Start New Submission
            </button>
          </div>
        )}

        {/* Header Title Block inside the form */}
        <div className="flex items-center gap-4 pb-6 border-b border-white/5 mb-8">
          <div className="p-3 rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#F0EFE8] capitalize">{activeTab.replace(/_/g, ' ')} Record Submission</h3>
            <p className="text-[10px] text-[#A09E9A] uppercase font-black tracking-widest">
              {activeTab === 'random_pk' && 'Random PK details and session numbers'}
              {activeTab === 'fanbase' && 'Weekly fanclub subscription counts and group chat health'}
              {activeTab === 'weekly_live_data' && 'Weekly stream duration, user activity and point values'}
              {activeTab === 'monthly_live_data' && 'Monthly summary of duration, online users and points'}
            </p>
          </div>
        </div>

        {/* Form fields layout */}
        <div className="space-y-8">
          {/* Identity block */}
          <div className="bg-[#13131E] p-6 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label htmlFor="poppo-id" className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Host Poppo ID</label>
              {isTalent ? (
                <input
                  id="poppo-id"
                  type="text"
                  readOnly
                  value={poppoId}
                  className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] font-mono opacity-50 cursor-not-allowed"
                />
              ) : (
                <select
                  id="poppo-id"
                  value={poppoId}
                  onChange={(e) => handleHostSelect(e.target.value)}
                  className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 font-mono cursor-pointer"
                  title="Host Poppo ID selector"
                >
                  <option value="" className="bg-[#1A1A28] text-[#F0EFE8]">-- Select Host --</option>
                  {hostsList.map(h => (
                    <option key={h.id} value={h.id} className="bg-[#1A1A28] text-[#F0EFE8]">
                      {h.id} - {h.nickname || h.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="nickname" className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Host Nickname</label>
              <input
                id="nickname"
                type="text"
                disabled={isTalent || isLocked}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                placeholder="Prefilled upon selecting Host"
                required
              />
            </div>
          </div>

          {/* Form specific subcategories */}
          <div className="space-y-8">
            
            {/* Tab 1: Random PK */}
            {activeTab === 'random_pk' && (
              <>
                {/* Subcategory A: Engagement & Activity */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest border-b border-white/5 pb-1.5">Engagement & Activity Metrics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label htmlFor="pk-win" className="text-[10px] font-bold text-[#A09E9A]">PK Win %</label>
                      <input
                        id="pk-win"
                        type="number"
                        step="0.01"
                        disabled={isLocked}
                        value={pkWinPercentage}
                        onChange={(e) => setPkWinPercentage(e.target.value)}
                        placeholder="Enter win percentage (e.g. 62.45)"
                        className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="pk-sessions" className="text-[10px] font-bold text-[#A09E9A]">PK Sessions Count</label>
                      <input
                        id="pk-sessions"
                        type="number"
                        disabled={isLocked}
                        value={pkSessions}
                        onChange={(e) => setPkSessions(e.target.value)}
                        placeholder="Enter total sessions"
                        className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Subcategory B: Financial & Operational */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest border-b border-white/5 pb-1.5">Financial & Operational Performance Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#A09E9A]">Date Range</label>
                      <DateRangePicker
                        disabled={isLocked}
                        startDate={pkStartDate}
                        endDate={pkEndDate}
                        onChange={(start, end) => { setPkStartDate(start); setPkEndDate(end); }}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="pk-score" className="text-[10px] font-bold text-[#A09E9A]">PK Score Points</label>
                      <input
                        id="pk-score"
                        type="number"
                        disabled={isLocked}
                        value={pkScore}
                        onChange={(e) => setPkScore(e.target.value)}
                        placeholder="Enter total PK Score"
                        className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50"
                        required
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Tab 2: Fanbase */}
            {activeTab === 'fanbase' && (
              <>
                {/* Subcategory A: Engagement & Activity */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest border-b border-white/5 pb-1.5">Engagement & Activity Metrics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label htmlFor="fanbase-subs" className="text-[10px] font-bold text-[#A09E9A]">Fanclub Subscribers</label>
                      <input
                        id="fanbase-subs"
                        type="number"
                        disabled={isLocked}
                        value={fanbaseSubscribers}
                        onChange={(e) => setFanbaseSubscribers(e.target.value)}
                        placeholder="Enter subscriber count"
                        className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="fanbase-members" className="text-[10px] font-bold text-[#A09E9A]">Fanclub Group Chat Members</label>
                      <input
                        id="fanbase-members"
                        type="number"
                        disabled={isLocked}
                        value={fanbaseGcMembers}
                        onChange={(e) => setFanbaseGcMembers(e.target.value)}
                        placeholder="Enter group chat member count"
                        className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Subcategory B: Financial & Operational */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest border-b border-white/5 pb-1.5">Financial & Operational Performance Details</h4>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#A09E9A]">Week Date Range</label>
                    <DateRangePicker
                      disabled={isLocked}
                      startDate={fanbaseStartDate}
                      endDate={fanbaseEndDate}
                      onChange={(start, end) => { setFanbaseStartDate(start); setFanbaseEndDate(end); }}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label htmlFor="pre-stream" className="text-[10px] font-bold text-[#A09E9A]">Pre-Stream Status Update</label>
                      <textarea
                        id="pre-stream"
                        rows={3}
                        disabled={isLocked}
                        value={preStreamUpdate}
                        onChange={(e) => setPreStreamUpdate(e.target.value)}
                        placeholder="Detail fanbase activity pre-stream..."
                        className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 resize-none"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="post-stream" className="text-[10px] font-bold text-[#A09E9A]">Post-Stream Status Update</label>
                      <textarea
                        id="post-stream"
                        rows={3}
                        disabled={isLocked}
                        value={postStreamUpdate}
                        onChange={(e) => setPostStreamUpdate(e.target.value)}
                        placeholder="Detail fanbase status and updates post-stream..."
                        className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 resize-none"
                        required
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Tab 3 & 4: Weekly / Monthly Live Data */}
            {(activeTab === 'weekly_live_data' || activeTab === 'monthly_live_data') && (
              <>
                {/* Subcategory A: Engagement & Activity */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest border-b border-white/5 pb-1.5">Engagement & Activity Metrics</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                    <div className="space-y-1.5">
                      <label htmlFor="live-avg-users" className="text-[10px] font-bold text-[#A09E9A]">Avg Online Users</label>
                      <input
                        id="live-avg-users"
                        type="number"
                        disabled={isLocked}
                        value={liveAvgOnlineUsers}
                        onChange={(e) => setLiveAvgOnlineUsers(e.target.value)}
                        placeholder="Avg online"
                        className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="live-new-fans" className="text-[10px] font-bold text-[#A09E9A]">New Fans Added</label>
                      <input
                        id="live-new-fans"
                        type="number"
                        disabled={isLocked}
                        value={liveNewFans}
                        onChange={(e) => setLiveNewFans(e.target.value)}
                        placeholder="New fans"
                        className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="live-new-fc" className="text-[10px] font-bold text-[#A09E9A]">New Fanclub Members</label>
                      <input
                        id="live-new-fc"
                        type="number"
                        disabled={isLocked}
                        value={liveNewFanclubMembers}
                        onChange={(e) => setLiveNewFanclubMembers(e.target.value)}
                        placeholder="New FC"
                        className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="live-gifting" className="text-[10px] font-bold text-[#A09E9A]">Gifting Actions Count</label>
                      <input
                        id="live-gifting"
                        type="number"
                        disabled={isLocked}
                        value={liveGiftingCount}
                        onChange={(e) => setLiveGiftingCount(e.target.value)}
                        placeholder="Giftings"
                        className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="live-unfollowers" className="text-[10px] font-bold text-[#A09E9A]">Lost Unfollowers</label>
                      <input
                        id="live-unfollowers"
                        type="number"
                        disabled={isLocked}
                        value={liveUnfollowers}
                        onChange={(e) => setLiveUnfollowers(e.target.value)}
                        placeholder="Unfollowed"
                        className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Subcategory B: Financial & Operational */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-black text-[#D4AF37] uppercase tracking-widest border-b border-white/5 pb-1.5">Financial & Operational Performance Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#A09E9A]">Date Range</label>
                      <DateRangePicker
                        disabled={isLocked}
                        startDate={liveFromDate}
                        endDate={liveToDate}
                        onChange={(start, end) => { setLiveFromDate(start); setLiveToDate(end); }}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="live-duration" className="text-[10px] font-bold text-[#A09E9A]">Duration (Hours)</label>
                      <input
                        id="live-duration"
                        type="number"
                        step="0.1"
                        disabled={isLocked}
                        value={liveTotalDuration}
                        onChange={(e) => setLiveTotalDuration(e.target.value)}
                        placeholder="Hours"
                        className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="live-earnings" className="text-[10px] font-bold text-[#A09E9A]">Total Earnings</label>
                      <input
                        id="live-earnings"
                        type="number"
                        disabled={isLocked}
                        value={liveTotalEarnings}
                        onChange={(e) => setLiveTotalEarnings(e.target.value)}
                        placeholder="Earnings"
                        className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="live-points" className="text-[10px] font-bold text-[#A09E9A]">Total Points</label>
                      <input
                        id="live-points"
                        type="number"
                        disabled={isLocked}
                        value={liveTotalPoints}
                        onChange={(e) => setLiveTotalPoints(e.target.value)}
                        placeholder="Points"
                        className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="live-notes" className="text-[10px] font-bold text-[#A09E9A]">Operational Notes</label>
                    <textarea
                      id="live-notes"
                      rows={3}
                      disabled={isLocked}
                      value={liveNotes}
                      onChange={(e) => setLiveNotes(e.target.value)}
                      placeholder="Add operational notes, anomalies, platform events, or host accomplishments during this period..."
                      className="w-full bg-[#1A1A28] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/50 resize-none"
                    />
                  </div>
                </div>
              </>
            )}

          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t border-white/5 justify-end">
            <button
              onClick={handleSaveDraft}
              disabled={isLocked || isProcessing}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-[#A09E9A] hover:text-[#F0EFE8] transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Save size={14} />
              Save Draft
            </button>
            
            <button
              onClick={handleSubmitReport}
              disabled={isLocked || isProcessing}
              className="px-8 py-3 btn-gold rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg"
            >
              <Send size={14} className="text-[#0D0D14]" />
              Submit Report
            </button>
          </div>

        </div>
      </div>

      {/* Visualizations Block */}
      {chartData.length > 0 && (
        <div className="glass-card p-8 rounded-[24px] shadow-xl space-y-6">
          <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#A09E9A]">
            {activeTab.replace(/_/g, ' ')} Performance Dashboard
          </h4>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {activeTab === 'random_pk' ? (
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="dateLabel" stroke="#A09E9A" tick={{fontSize: 10}} />
                  <YAxis yAxisId="left" stroke="#D4AF37" tick={{fontSize: 10}} />
                  <YAxis yAxisId="right" orientation="right" stroke="#ec4899" tick={{fontSize: 10}} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)', opacity: 0.2 }} />
                  <Line yAxisId="left" type="monotone" dataKey="pkWinPercentage" name="Win %" stroke="#D4AF37" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                  <Line yAxisId="right" type="monotone" dataKey="pkScore" name="Score" stroke="#ec4899" strokeWidth={3} dot={{r: 4}} />
                </LineChart>
              ) : activeTab === 'fanbase' ? (
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="dateLabel" stroke="#A09E9A" tick={{fontSize: 10}} />
                  <YAxis stroke="#D4AF37" tick={{fontSize: 10}} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)', opacity: 0.2 }} />
                  <Line type="monotone" dataKey="fanclubSubscribers" name="Subscribers" stroke="#D4AF37" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                  <Line type="monotone" dataKey="fanclubGcMembers" name="GC Members" stroke="#ec4899" strokeWidth={3} dot={{r: 4}} />
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="dateLabel" stroke="#A09E9A" tick={{fontSize: 10}} />
                  <YAxis yAxisId="left" stroke="#10b981" tick={{fontSize: 10}} />
                  <YAxis yAxisId="right" orientation="right" stroke="#D4AF37" tick={{fontSize: 10}} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)', opacity: 0.2 }} />
                  <Bar yAxisId="left" dataKey="totalEarnings" name="Earnings" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  <Bar yAxisId="right" dataKey="totalDuration" name="Duration (hrs)" fill="#D4AF37" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Past Submissions list */}
      {pastSubmissions.length > 0 && (
        <div className="glass-card p-6 rounded-[24px] shadow-xl space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#A09E9A]">Your Submission Sessions</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-black text-[#A09E9A] uppercase tracking-[0.2em]">
                  <th className="pb-3 px-3">Type</th>
                  <th className="pb-3 px-3">Host ID</th>
                  <th className="pb-3 px-3">Nickname</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pastSubmissions.map(sub => (
                  <tr key={sub.submissionId} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 font-black uppercase tracking-wider text-[#A09E9A] text-[9.5px]">
                      {sub.reportType.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-[#D4AF37]">{sub.dataPayload.poppoId}</td>
                    <td className="py-3 px-3 font-bold text-[#F0EFE8]">{sub.dataPayload.nickname}</td>
                    <td className="py-3 px-3">
                      <span className={cn(
                        "text-[9px] font-black uppercase px-2.5 py-1 rounded-full border",
                        sub.status === 'draft' 
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      )}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleLoadSubmission(sub)}
                        className="text-[9px] font-black uppercase text-[#D4AF37] hover:text-[#AA7C11] flex items-center gap-1 ml-auto cursor-pointer font-bold"
                      >
                        Load <ChevronRight size={10} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

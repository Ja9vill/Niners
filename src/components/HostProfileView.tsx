/* eslint-disable */
/* eslint-disable */
import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, ChevronLeft, Edit2, Loader2, Save, Instagram, Twitter, Facebook, TrendingUp, TrendingDown, Minus, Award, MessageSquare, Star } from 'lucide-react';
import { Host, CommissionEntry, CalendarEvent } from '../types';
import { FirebaseService } from '../lib/firebaseService';
import { Storage } from '../lib/storage';
import { cn, formatNumber } from '../lib/utils';
import { MANAGERS, BASE_SALARY_POLICIES } from '../lib/constants';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts';

interface HostProfileViewProps {
  host: Host;
  isReadOnly?: boolean;
  onClose?: () => void;
  onProfileUpdated?: () => void;
}

export const HostProfileView: React.FC<HostProfileViewProps> = ({ 
  host, 
  isReadOnly = false, 
  onClose,
  onProfileUpdated 
}) => {
  const [performanceReports, setPerformanceReports] = useState<any[]>([]);
  const [participatedEvents, setParticipatedEvents] = useState<any[]>([]);
  const [pkData, setPkData] = useState<{ win_percentage: number; pk_score: number; sessions: number }>({
    win_percentage: 73,
    pk_score: 1800000,
    sessions: 45
  });
  const [isLoading, setIsLoading] = useState(true);

  // Profile Edit States
  const [isEditing, setIsEditing] = useState(false);
  const [editNickname, setEditNickname] = useState(host.nickname || host.name || '');
  const [editPhotoUrl, setEditPhotoUrl] = useState(host.photoUrl || '');
  const [editDescription, setEditDescription] = useState(host.description || '');
  const [editRole, setEditRole] = useState<string>(host.role || 'Talent');
  const [editTeam, setEditTeam] = useState<string>(host.team || 'Unassigned');
  const [editManager, setEditManager] = useState<string>(host.manager || 'Nine Management');
  const [editBaseSalaryCategory, setEditBaseSalaryCategory] = useState<string>(host.base_salary_category || 'N/A');
  const [editStatus, setEditStatus] = useState<string>(host.status || 'Active');
  const [editTier, setEditTier] = useState<string>(host.tier || 'X');
  const [editLevel, setEditLevel] = useState<number>(host.level || 1);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  // Host self-edit panel (bio, social, streaming hours)
  const [isSelfEditing, setIsSelfEditing] = useState(false);
  const [selfBio, setSelfBio] = useState(host.bio || host.description || '');
  const [selfSocialIg, setSelfSocialIg] = useState(host.social_links?.ig || '');
  const [selfSocialTk, setSelfSocialTk] = useState(host.social_links?.tiktok || '');
  const [selfSocialFb, setSelfSocialFb] = useState(host.social_links?.fb || '');
  const [selfSocialWa, setSelfSocialWa] = useState(host.social_links?.whatsapp || '');
  const [selfStreamSlots, setSelfStreamSlots] = useState<{ from: string; to: string }[]>(
    host.streaming_hours?.length ? host.streaming_hours : [{ from: '', to: '' }]
  );
  const [isSavingSelf, setIsSavingSelf] = useState(false);

  // RPK Reporting States
  const [isRpkFormOpen, setIsRpkFormOpen] = useState(false);
  const [isSubmittingRpk, setIsSubmittingRpk] = useState(false);
  const [rpkFormData, setRpkFormData] = useState({
    from_date: '',
    to_date: '',
    pk_wins_percent: '',
    pk_points: '',
    pk_sessions: ''
  });

  // Fanbase Reporting States
  const [isFanbaseFormOpen, setIsFanbaseFormOpen] = useState(false);
  const [isSubmittingFanbase, setIsSubmittingFanbase] = useState(false);
  const [fanbaseFormData, setFanbaseFormData] = useState({
    from_date: '',
    to_date: '',
    total_followers: '',
    fanclub_subscribers: '',
    fanclub_gc_members: '',
    gc_activity_count_host: '',
    gc_activity_count_fans: '',
    notes: ''
  });

  // Fanbase latest report (loaded from Firestore)
  const [fanbaseLatest, setFanbaseLatest] = useState<any>(null);

  // AI Analysis States
  const [aiReport, setAiReport] = useState<{
    summary: string;
    journey: string;
    recommendations: string[];
  } | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState('');

  // Enhanced metrics state
  const [awards, setAwards] = useState<any[]>([]);
  const [agentNotes, setAgentNotes] = useState<any[]>([]);
  const [weeklyLiveData, setWeeklyLiveData] = useState<any[]>([]);

  useEffect(() => {
    // Reset edit values when host changes
    setEditNickname(host.nickname || host.name || '');
    setEditPhotoUrl(host.photoUrl || '');
    setEditDescription(host.description || '');
    setEditRole(host.role || 'Talent');
    setEditTeam(host.team || 'Unassigned');
    setEditManager(host.manager || 'Nine Management');
    setEditBaseSalaryCategory(host.base_salary_category || 'N/A');
    setEditStatus(host.status || 'Active');
    setEditTier(host.tier || 'X');
    setEditLevel(host.level || 1);
    setIsEditing(false);
    
    const loadProfileData = async () => {
      setIsLoading(true);
      try {
        // Section 1: Query performance_reports by poppoId field
        // Supports both old format (poppoId_year_monthly_month) and new (poppoId_MonthName_Year)
        const perfQuery = query(
          collection(db, 'performance_reports'), 
          where('poppoId', '==', host.id)
        );
        const perfSnap = await getDocs(perfQuery);
        const perfList: any[] = [];
        const MONTH_MAP: Record<string,number> = {
          January:1,February:2,March:3,April:4,May:5,June:6,
          July:7,August:8,September:9,October:10,November:11,December:12
        };
        perfSnap.forEach(doc => {
          const data = doc.data();
          // Parse month/year from doc ID if not in data fields
          const parts = doc.id.split('_');
          const monthNameFromId = parts[1] || '';
          const yearFromId = parts[2] ? parseInt(parts[2]) : 0;
          perfList.push({
            id: doc.id,
            ...data,
            monthName: data.monthName || monthNameFromId,
            month: data.month || MONTH_MAP[monthNameFromId] || 0,
            year: data.year || yearFromId,
          });
        });
        perfList.sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });
        setPerformanceReports(perfList);

        // FALLBACK: If Firestore performance_reports is empty, load from
        // the commission flat-file data (Firebase Storage) that the Director tab uses.
        // This ensures all metric panels show for hosts whose data is in the legacy system.
        if (perfList.length === 0) {
          try {
            const monthlyData = await FirebaseService.fetchFinancials('monthly');
            const hostCommissions = (monthlyData || []).filter(
              (c: any) => String(c.poppo_id).trim() === String(host.id).trim()
            );
            if (hostCommissions.length > 0) {
              const MONTH_MAP2: Record<string, number> = {
                January:1,February:2,March:3,April:4,May:5,June:6,
                July:7,August:8,September:9,October:10,November:11,December:12
              };
              const mapped = hostCommissions.map((c: any) => {
                // month field is like "2024-05" or "May" 
                let monthNum = 0;
                let yearNum = c.year || 0;
                if (c.month && String(c.month).includes('-')) {
                  const parts = String(c.month).split('-');
                  yearNum = parseInt(parts[0]) || yearNum;
                  monthNum = parseInt(parts[1]) || 0;
                } else if (c.month) {
                  monthNum = MONTH_MAP2[c.month] || parseInt(c.month) || 0;
                }
                return {
                  id: `${c.poppo_id}_${c.month}`,
                  poppoId: c.poppo_id,
                  monthName: c.month,
                  month: monthNum,
                  year: yearNum,
                  earningsBreakdown: {
                    totalEarningsOfPoints: c.total_points || c.total_earnings || 0,
                    liveEarnings: c.live_earnings || 0,
                    partyEarnings: c.party_earnings || 0,
                    privateChatEarnings: c.private_chat || 0,
                    tips: c.tips || 0,
                    platformReward: c.platform_reward || 0,
                    otherEarnings: c.other_earnings || 0,
                    platformHourlySalary: c.platform_hourly_salary || 0,
                    superSalary: c.super_salary || 0,
                    superRank: c.super_rank || 0,
                  },
                  liveDurationMinutes: (c.live_duration || 0) * 60,
                  liveDuration: c.live_duration || 0,
                  ...c,
                };
              });
              mapped.sort((a: any, b: any) => {
                if (a.year !== b.year) return b.year - a.year;
                return b.month - a.month;
              });
              setPerformanceReports(mapped);
            }
          } catch (e) {
            console.warn('Fallback commission load failed:', e);
          }
        }

        // Section 2: Query events — check both participantIds (new) and participants (legacy) fields
        const [eventsSnap1, eventsSnap2] = await Promise.all([
          getDocs(query(collection(db, 'events'), where('participantIds', 'array-contains', host.id))),
          getDocs(query(collection(db, 'events'), where('participants', 'array-contains', host.id)))
        ]);
        const seenEventIds = new Set<string>();
        const eventsList: any[] = [];
        [...eventsSnap1.docs, ...eventsSnap2.docs].forEach(doc => {
          if (!seenEventIds.has(doc.id)) {
            seenEventIds.add(doc.id);
            eventsList.push({ id: doc.id, ...doc.data() });
          }
        });
        // Sort by date descending
        eventsList.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setParticipatedEvents(eventsList);

        // Load PK data from local or fallback to mockup stats
        const localPks = Storage.getPKData(host.id);
        if (localPks && localPks.length > 0) {
          setPkData({
            win_percentage: localPks[0].win_percentage,
            pk_score: localPks[0].pk_score,
            sessions: localPks[0].sessions
          });
        }

        // Section 3: Load latest fanbase report from subcollection
        try {
          const fanbaseSnap = await getDocs(collection(db, 'host', host.id, 'fanbase_report'));
          if (!fanbaseSnap.empty) {
            const reports = fanbaseSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Sort by timestamp descending and take the latest
            reports.sort((a: any, b: any) => (b.timestamp || '').localeCompare(a.timestamp || ''));
            setFanbaseLatest(reports[0]);
          }
        } catch (e) {
          console.warn('Could not load fanbase report:', e);
        }

        // Load awards
        try {
          const awardsData = await FirebaseService.getAwards(host.id);
          setAwards(awardsData || []);
        } catch (e) { console.warn('Could not load awards:', e); }

        // Load agent notes
        try {
          const notesData = await FirebaseService.getNotesByHost(host.id);
          setAgentNotes(notesData.slice(0, 5));
        } catch (e) { console.warn('Could not load notes:', e); }

        // Load weekly live data
        try {
          const wldSnap = await getDocs(query(collection(db, 'weekly_live_data'), where('poppo_id', '==', host.id)));
          const wldList: any[] = wldSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          wldList.sort((a, b) => (b.from_date || '').localeCompare(a.from_date || ''));
          setWeeklyLiveData(wldList.slice(0, 8));
        } catch (e) { console.warn('Could not load weekly live data:', e); }
      } catch (err) {
        console.error("Failed to load host profile data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadProfileData();
  }, [host.id]);



  // (handleGenerateAI defined after perfTotals – see below)

  // Profile photo file uploader
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo too large. Max 5MB.');
      return;
    }

    setIsProcessingPhoto(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_SIZE = 400;

            if (width > height) {
              if (width > MAX_SIZE) {
                height *= MAX_SIZE / width;
                width = MAX_SIZE;
              }
            } else {
              if (height > MAX_SIZE) {
                width *= MAX_SIZE / height;
                width = MAX_SIZE;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          };
          img.onerror = reject;
          img.src = reader.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setEditPhotoUrl(base64);
    } catch (err) {
      console.error('File upload failed:', err);
      alert('Failed to process image');
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  // Save changes to Firestore and AuthState
  const handleSaveChanges = async () => {
    if (!editNickname.trim()) {
      alert("Nickname cannot be empty.");
      return;
    }
    setIsSaving(true);
    try {
      const updatedHost: Host = {
        ...host,
        nickname: editNickname.trim(),
        name: editNickname.trim() || host.name,
        photoUrl: editPhotoUrl,
        description: editDescription,
        role: editRole as any,
        team: editTeam,
        manager: editManager,
        base_salary_category: editBaseSalaryCategory as any,
        status: editStatus as any,
        tier: editTier as any,
        level: Number(editLevel) || 1,
        updated_at: new Date().toISOString()
      };

      await FirebaseService.updateHost(updatedHost);

      // If editing current logged in user's profile, update authState
      const currentAuth = Storage.getAuthState();
      if (currentAuth.poppo_id === host.id) {
        const newAuth = {
          ...currentAuth,
          name: editNickname.trim(),
          nickname: editNickname.trim(),
          profile_photo: editPhotoUrl
        };
        Storage.setAuthState(newAuth);
      }

      setIsEditing(false);
      if (onProfileUpdated) {
        onProfileUpdated();
      }
    } catch (err) {
      console.error("Failed to update profile:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Submit RPK Report
  const handleRpkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rpkFormData.from_date || !rpkFormData.to_date) {
      alert("From Date and To Date are required.");
      return;
    }
    setIsSubmittingRpk(true);
    try {
      const currentAuth = Storage.getAuthState();
      const reportData = {
        reporter_id: currentAuth?.poppo_id || "Unknown",
        reporter_name: currentAuth?.name || currentAuth?.nickname || "Unknown",
        reporter_role: currentAuth?.role || "Unknown",
        poppo_id: host.id,
        nickname: host.nickname || host.name,
        from_date: rpkFormData.from_date,
        to_date: rpkFormData.to_date,
        pk_wins_percent: rpkFormData.pk_wins_percent,
        pk_points: rpkFormData.pk_points,
        pk_sessions: rpkFormData.pk_sessions
      };
      
      await FirebaseService.submitRpkReport(host.id, rpkFormData.from_date, rpkFormData.to_date, reportData);
      
      setIsRpkFormOpen(false);
      setRpkFormData({from_date: '', to_date: '', pk_wins_percent: '', pk_points: '', pk_sessions: ''});
      alert("RPK Report submitted successfully.");
    } catch(err) {
      console.error(err);
      alert("Failed to submit RPK Report");
    } finally {
      setIsSubmittingRpk(false);
    }
  };

  // Submit Fanbase Report
  const handleFanbaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fanbaseFormData.from_date || !fanbaseFormData.to_date) {
      alert("From Date and To Date are required.");
      return;
    }
    setIsSubmittingFanbase(true);
    try {
      const currentAuth = Storage.getAuthState();
      const reportData = {
        reporter_id: currentAuth?.poppo_id || "Unknown",
        reporter_name: currentAuth?.name || currentAuth?.nickname || "Unknown",
        reporter_role: currentAuth?.role || "Unknown",
        poppo_id: host.id,
        nickname: host.nickname || host.name,
        from_date: fanbaseFormData.from_date,
        to_date: fanbaseFormData.to_date,
        total_followers: fanbaseFormData.total_followers,
        fanclub_subscribers: fanbaseFormData.fanclub_subscribers,
        fanclub_gc_members: fanbaseFormData.fanclub_gc_members,
        gc_activity_count_host: fanbaseFormData.gc_activity_count_host,
        gc_activity_count_fans: fanbaseFormData.gc_activity_count_fans,
        notes: fanbaseFormData.notes
      };
      
      await FirebaseService.submitFanbaseReport(host.id, fanbaseFormData.from_date, fanbaseFormData.to_date, reportData);
      
      setIsFanbaseFormOpen(false);
      setFanbaseFormData({
        from_date: '', to_date: '', total_followers: '', fanclub_subscribers: '', 
        fanclub_gc_members: '', gc_activity_count_host: '', gc_activity_count_fans: '', notes: ''
      });
      alert("Fanbase Report submitted successfully.");
    } catch(err) {
      console.error(err);
      alert("Failed to submit Fanbase Report");
    } finally {
      setIsSubmittingFanbase(false);
    }
  };

  // Save host's own bio/social/streaming edits
  const handleSaveSelf = async () => {
    setIsSavingSelf(true);
    try {
      const updatedHost: Host = {
        ...host,
        bio: selfBio,
        description: selfBio,
        social_links: { ig: selfSocialIg, tiktok: selfSocialTk, fb: selfSocialFb, whatsapp: selfSocialWa },
        streaming_hours: selfStreamSlots.filter(s => s.from && s.to),
        updated_at: new Date().toISOString()
      };
      await FirebaseService.updateHost(updatedHost);
      // Update auth state if editing own profile
      const currentAuth = Storage.getAuthState();
      if (currentAuth.poppo_id === host.id) {
        Storage.setAuthState({ ...currentAuth, bio: selfBio });
      }
      setIsSelfEditing(false);
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      console.error('Failed to save self profile:', err);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSavingSelf(false);
    }
  };

  // Flexible field reader (same logic as Overview page)
  const pf = (r: any, ...keys: string[]): number => {
    for (const k of keys) {
      const v = r?.earningsBreakdown?.[k] ?? r?.[k];
      if (v !== undefined && v !== null && v !== '') return Number(v);
    }
    return 0;
  };

  // Aggregate totals from all performance reports
  const perfTotals = useMemo(() => {
    const sum = (fn: (r: any) => number) => performanceReports.reduce((s, r) => s + fn(r), 0);
    return {
      liveHrs:       sum(r => pf(r, 'liveDurationMinutes','liveDuration','live_duration','live_hours')),
      points:        sum(r => pf(r, 'totalEarningsOfPoints','total_earnings_of_points','totalPoints','total_points','points')),
      liveEarnings:  sum(r => pf(r, 'liveEarnings','live_earnings')),
      partyEarnings: sum(r => pf(r, 'partyEarnings','party_earnings')),
      privateChat:   sum(r => pf(r, 'privateChatEarnings','private_chat_earnings','privateChat')),
      tips:          sum(r => pf(r, 'tips')),
      platformReward:sum(r => pf(r, 'platformReward','platform_reward')),
      otherEarnings: sum(r => pf(r, 'otherEarnings','other_earnings')),
      platformHourly:sum(r => pf(r, 'platformHourlySalary','platform_hourly_salary')),
      superSalary:   sum(r => pf(r, 'superSalary','super_salary')),
      superRank:     sum(r => pf(r, 'superRank','super_rank')),
    };
  }, [performanceReports]);

  // AI Report Generator — defined here so perfTotals is in scope
  const handleGenerateAI = async () => {
    setIsGeneratingAI(true);
    setAiError('');
    setAiReport(null);
    try {
      const last6 = [...performanceReports].slice(0, 6).map(r => ({
        period: `${r.monthName || r.month}/${r.year}`,
        points: r.earningsBreakdown?.totalEarningsOfPoints || r.totalEarningsOfPoints || r.total_points || 0,
        liveHrs: r.liveDurationMinutes ? (r.liveDurationMinutes / 60).toFixed(1) : (r.liveDuration || 0),
      }));

      const prompt = `You are an AI analyst for Nine Talent Management, a live streaming agency.
Analyze the following host data and return EXACTLY three sections with these exact labels on their own lines:
[SUMMARY]
[JOURNEY]
[RECOMMENDATIONS]

Host: ${host.nickname || host.name} (Poppo ID: ${host.id})
Status: ${host.status || 'Unknown'} | Tier: ${host.tier || 'X'} | Level: ${host.level || 1}
Role: ${host.role || 'Talent'} | Manager: ${host.manager || 'N/A'} | Team: ${host.team || 'N/A'}
Total Live Earnings: ${perfTotals.liveEarnings.toLocaleString()} | Party Earnings: ${perfTotals.partyEarnings.toLocaleString()}
Total Points Earned (all time): ${perfTotals.points.toLocaleString()}
Live Hours (all time): ${perfTotals.liveHrs}h
Events Participated: ${participatedEvents.length}
PK Win Rate: ${pkData.win_percentage}% over ${pkData.sessions} sessions
Fanbase: ${fanbaseLatest ? `${fanbaseLatest.total_followers || 0} followers, ${fanbaseLatest.fanclub_subscribers || 0} FC subs, ${fanbaseLatest.fanclub_gc_members || 0} GC members` : 'No fanbase data'}
Monthly Performance (last 6): ${JSON.stringify(last6)}

[SUMMARY] Write a 2-3 sentence performance summary of this host. Be specific and data-driven.
[JOURNEY] Write a 2-3 sentence narrative about their streamer career journey and growth trajectory.
[RECOMMENDATIONS] List 3-5 specific, actionable bullet points to help this host improve. Use "• " prefix for each.`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt })
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const { text } = await res.json();

      const extractSection = (label: string, nextLabel?: string): string => {
        const startIdx = text.indexOf(label);
        if (startIdx === -1) return '';
        const contentStart = startIdx + label.length;
        const endIdx = nextLabel ? text.indexOf(nextLabel, contentStart) : text.length;
        return text.slice(contentStart, endIdx === -1 ? text.length : endIdx).trim();
      };

      const summary = extractSection('[SUMMARY]', '[JOURNEY]');
      const journey = extractSection('[JOURNEY]', '[RECOMMENDATIONS]');
      const recsRaw = extractSection('[RECOMMENDATIONS]');
      const recommendations = recsRaw
        .split('\n')
        .map((l: string) => l.replace(/^[•\-\*]\s*/, '').trim())
        .filter((l: string) => l.length > 0);

      setAiReport({ summary, journey, recommendations });
    } catch (err: any) {
      setAiError(err.message || 'Failed to generate AI report.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Monthly bar chart data
  const monthlyChartData = useMemo(() => {
    const MONTH_ORDER = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return [...performanceReports]
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return (a.month || MONTH_ORDER.indexOf(a.monthName)+1) - (b.month || MONTH_ORDER.indexOf(b.monthName)+1);
      })
      .map(r => ({
        label: `${r.monthName?.slice(0,3) || r.month}/${String(r.year).slice(2)}`,
        points: pf(r, 'totalEarningsOfPoints','total_earnings_of_points','totalPoints','total_points','points'),
      }));
  }, [performanceReports]);

  // Consistency Score (0-100): active months / total span months
  const consistencyScore = useMemo(() => {
    if (performanceReports.length === 0) return 0;
    const sorted = [...performanceReports].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return (a.month || 0) - (b.month || 0);
    });
    const oldest = sorted[0];
    const newest = sorted[sorted.length - 1];
    const totalMonths = (newest.year - oldest.year) * 12 + ((newest.month || 0) - (oldest.month || 0)) + 1;
    if (totalMonths <= 0) return 100;
    return Math.min(100, Math.round((performanceReports.length / totalMonths) * 100));
  }, [performanceReports]);

  // Trend: latest month vs 3-month rolling avg
  const trendData = useMemo(() => {
    if (performanceReports.length < 2) return { trend: 'New', pct: 0 };
    const sorted = [...performanceReports].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return (b.month || 0) - (a.month || 0);
    });
    const latest = pf(sorted[0], 'totalEarningsOfPoints', 'total_earnings_of_points', 'totalPoints', 'total_points', 'points');
    const prev3 = sorted.slice(1, 4);
    const avg = prev3.length > 0
      ? prev3.reduce((s, r) => s + pf(r, 'totalEarningsOfPoints', 'total_earnings_of_points', 'totalPoints', 'total_points', 'points'), 0) / prev3.length
      : 0;
    if (avg === 0) return { trend: 'New', pct: 0 };
    const pct = Math.round(((latest - avg) / avg) * 100);
    if (pct >= 10) return { trend: 'Growing', pct };
    if (pct <= -10) return { trend: 'Declining', pct };
    return { trend: 'Stable', pct };
  }, [performanceReports]);

  const isSpotlight = !!onClose;

  // Earnings breakdown tiles definition
  const earningTiles = [
    { label: 'Live\nHours',         value: perfTotals.liveHrs,        color: '#06b6d4',  fmt: (v: number) => v ? `${v}h` : '—' },
    { label: 'Live\nEarnings',      value: perfTotals.liveEarnings,   color: '#3b82f6',  fmt: (v: number) => v ? v.toLocaleString() : '—' },
    { label: 'Party\nEarnings',     value: perfTotals.partyEarnings,  color: '#8b5cf6',  fmt: (v: number) => v ? v.toLocaleString() : '—' },
    { label: 'Private\nChat',       value: perfTotals.privateChat,    color: '#ec4899',  fmt: (v: number) => v ? v.toLocaleString() : '—' },
    { label: 'Tips',                value: perfTotals.tips,           color: '#f59e0b',  fmt: (v: number) => v ? v.toLocaleString() : '—' },
    { label: 'Platform\nReward',    value: perfTotals.platformReward, color: '#10b981',  fmt: (v: number) => v ? v.toLocaleString() : '—' },
    { label: 'Other\nEarnings',     value: perfTotals.otherEarnings,  color: '#a78bfa',  fmt: (v: number) => v ? v.toLocaleString() : '—' },
    { label: 'Platform\nHourly',    value: perfTotals.platformHourly, color: '#38bdf8',  fmt: (v: number) => v ? v.toLocaleString() : '—' },
    { label: 'Super\nSalary',       value: perfTotals.superSalary,    color: '#D4AF37',  fmt: (v: number) => v ? v.toLocaleString() : '—' },
    { label: 'Super\nRank',         value: perfTotals.superRank,      color: '#fb923c',  fmt: (v: number) => v ? v.toLocaleString() : '—' },
    { label: 'Earn\nPer Hour',      value: perfTotals.liveHrs > 0 ? Math.round(perfTotals.liveEarnings / perfTotals.liveHrs) : 0, color: '#22d3ee', fmt: (v: number) => v ? `${v.toLocaleString()}/h` : '—' },
  ];

  const renderEarningsBreakdown = () => {
    if (performanceReports.length === 0) return null;
    return (
      <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-4 shadow-md">
        <p className="text-[9px] font-black text-[#A09E9A]/50 uppercase tracking-[0.2em] mb-3">Earnings Breakdown — All Time</p>
        <div className="grid grid-cols-5 gap-2">
          {earningTiles.map((tile, i) => (
            <div key={i} className="bg-[#0D0D14] border border-white/5 rounded-xl p-2.5 flex flex-col items-center text-center hover:border-white/10 transition-all">
              <p className="text-[7px] font-black uppercase tracking-wider leading-tight mb-1.5 whitespace-pre-line" style={{ color: tile.color + 'aa' }}>
                {tile.label}
              </p>
              <p className="text-sm font-black leading-none" style={{ color: tile.color }}>
                {tile.fmt(tile.value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMonthlyPointsTrend = () => {
    if (monthlyChartData.length === 0) return null;
    const COLORS = ['#D4AF37','#6366f1','#ec4899','#10b981','#f59e0b','#06b6d4','#a78bfa','#fb923c','#38bdf8','#34d399','#f472b6','#818cf8'];
    return (
      <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-4 shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <p className="text-[9px] font-black text-[#A09E9A]/50 uppercase tracking-[0.2em]">Monthly Points Trend</p>
          <span className="ml-auto text-[8px] text-[#A09E9A]/30 font-mono">{monthlyChartData.length} months</span>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 8, fill: '#A09E9A', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: '#A09E9A' }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
              <Tooltip
                contentStyle={{ backgroundColor: '#13131E', borderColor: '#ffffff20', borderRadius: '12px', fontSize: '10px' }}
                formatter={(v: number) => [v.toLocaleString() + ' pts', 'Points']}
                labelStyle={{ color: '#D4AF37', fontWeight: 'bold', marginBottom: '4px' }}
              />
              <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                {monthlyChartData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  // Self-edit modal: bio, social links, streaming hours only
  const renderSelfEditModal = () => {
    if (!isSelfEditing) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-[#13131E] border border-white/10 rounded-2xl max-w-md w-full p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
          <button
            title="Close"
            onClick={() => setIsSelfEditing(false)}
            className="absolute top-4 right-4 p-1.5 bg-[#1A1A28] border border-white/10 rounded-full text-[#A09E9A] hover:text-[#F0EFE8] cursor-pointer"
          >
            <X size={14} />
          </button>

          <h3 className="text-sm font-black uppercase tracking-wider text-[#F0EFE8] mb-0.5">Edit Your Profile</h3>
          <p className="text-[10px] text-[#A09E9A] mb-4">Update bio, social media links and streaming schedule.</p>

          <div className="space-y-4">
            {/* Bio */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Bio</label>
              <textarea
                rows={3}
                value={selfBio}
                onChange={e => setSelfBio(e.target.value)}
                placeholder="Introduce yourself to the agency..."
                className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] resize-none"
              />
            </div>

            {/* Social Links */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Social Media</label>
              {[
                { icon: '📸', label: 'Instagram', value: selfSocialIg, setter: setSelfSocialIg, placeholder: '@username or URL' },
                { icon: '🎵', label: 'TikTok', value: selfSocialTk, setter: setSelfSocialTk, placeholder: '@username or URL' },
                { icon: '📘', label: 'Facebook', value: selfSocialFb, setter: setSelfSocialFb, placeholder: 'URL or username' },
                { icon: '💬', label: 'WhatsApp', value: selfSocialWa, setter: setSelfSocialWa, placeholder: '+63 9XX XXX XXXX' },
              ].map(({ icon, label, value, setter, placeholder }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-sm w-6 text-center">{icon}</span>
                  <div className="flex-1">
                    <p className="text-[8px] text-[#A09E9A]/60 font-bold uppercase tracking-wider mb-0.5">{label}</p>
                    <input
                      type="text"
                      value={value}
                      onChange={e => setter(e.target.value)}
                      placeholder={placeholder}
                      className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Streaming Schedule */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Streaming Schedule</label>
                <button
                  type="button"
                  onClick={() => setSelfStreamSlots([...selfStreamSlots, { from: '', to: '' }])}
                  className="text-[8px] font-black text-[#D4AF37] border border-[#D4AF37]/30 rounded px-2 py-0.5 hover:bg-[#D4AF37]/10 transition-all cursor-pointer"
                >
                  + Add Slot
                </button>
              </div>
              {selfStreamSlots.map((slot, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text" value={slot.from}
                    onChange={e => { const s = [...selfStreamSlots]; s[idx] = { ...s[idx], from: e.target.value }; setSelfStreamSlots(s); }}
                    placeholder="From (e.g. 20:00)"
                    className="flex-1 bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                  />
                  <span className="text-[#A09E9A]/40 text-xs">→</span>
                  <input
                    type="text" value={slot.to}
                    onChange={e => { const s = [...selfStreamSlots]; s[idx] = { ...s[idx], to: e.target.value }; setSelfStreamSlots(s); }}
                    placeholder="To (e.g. 23:00)"
                    className="flex-1 bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                  />
                  {selfStreamSlots.length > 1 && (
                    <button type="button" onClick={() => setSelfStreamSlots(selfStreamSlots.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 cursor-pointer">
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button onClick={() => setIsSelfEditing(false)} className="flex-1 py-2.5 bg-[#1A1A28] border border-white/10 text-[#A09E9A] rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-[#222235] transition-all cursor-pointer">
              Cancel
            </button>
            <button
              onClick={handleSaveSelf}
              disabled={isSavingSelf}
              className="flex-[2] py-2.5 bg-[#D4AF37]/10 border border-[#D4AF37]/40 text-[#D4AF37] rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-[#D4AF37]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSavingSelf ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {isSavingSelf ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  };



  const renderIdentityCard = () => (
    <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-4 flex gap-4 items-start shadow-md relative group/card">
      {/* Edit / Save Options */}
      {!isReadOnly && (
        <div className="absolute top-4 right-4 z-10">
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="p-1.5 bg-[#222235] hover:bg-[#2A2A3F] text-[#A09E9A] hover:text-[#D4AF37] rounded-lg transition-all border border-white/10 cursor-pointer"
              title="Edit Profile"
            >
              <Edit2 size={12} />
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button 
                onClick={handleSaveChanges}
                disabled={isSaving || isProcessingPhoto}
                className="px-2 py-1 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded text-[8px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                title="Save Changes"
              >
                {isSaving ? '...' : 'Save'}
              </button>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setEditNickname(host.nickname || host.name || '');
                  setEditPhotoUrl(host.photoUrl || '');
                  setEditDescription(host.description || '');
                }}
                className="px-2 py-1 bg-[#222235] hover:bg-[#2A2A3F] text-[#A09E9A] hover:text-[#F0EFE8] rounded text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer"
                title="Cancel"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Host Photo Section */}
      <div className="flex flex-col items-center gap-1.5 shrink-0">
        <span className="text-[8px] font-black text-[#A09E9A]/60 uppercase tracking-widest leading-none">HOST PHOTO</span>
        <div className="w-16 h-16 rounded-full bg-[#0D0D14] border-2 border-[#D4AF37]/30 flex items-center justify-center font-bold text-[#F0EFE8] overflow-hidden shadow-lg shadow-[#D4AF37]/5 relative">
          {isProcessingPhoto && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 size={16} className="animate-spin text-[#D4AF37]" />
            </div>
          )}
          {editPhotoUrl ? (
            <img src={editPhotoUrl} alt={host.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="text-lg text-[#A09E9A] font-bold">{editNickname?.[0]?.toUpperCase() || host.name?.[0] || 'JD'}</div>
          )}
        </div>
        
        {isEditing && (
          <div className="flex flex-col items-center gap-1 mt-1">
            <label className="px-2 py-0.5 bg-[#222235] border border-white/10 hover:bg-[#2A2A3F] rounded text-[7px] font-black uppercase tracking-wider cursor-pointer text-[#F0EFE8]">
              Upload
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
            <input 
              type="text" 
              placeholder="URL..." 
              value={editPhotoUrl}
              onChange={(e) => setEditPhotoUrl(e.target.value)}
              className="w-14 bg-[#0D0D14] border border-white/10 rounded px-1 py-0.5 text-[6.5px] text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              title="Profile Photo URL"
            />
          </div>
        )}
      </div>

      {/* Identity Details */}
      <div className="flex-1 min-w-0 space-y-2.5 pr-8">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest block mb-0.5">NICKNAME</span>
            {isEditing ? (
              <input 
                type="text"
                value={editNickname}
                onChange={(e) => setEditNickname(e.target.value)}
                className="w-full bg-[#0D0D14] border border-white/10 rounded px-2 py-1 text-xs font-bold text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                required
                title="Nickname"
                placeholder="Nickname"
              />
            ) : (
              <span className="text-sm font-black text-[#F0EFE8] truncate block leading-tight">{host.nickname || host.name}</span>
            )}
          </div>
          <div>
            <span className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest block mb-0.5">POPPO ID</span>
            <span className="text-sm font-black text-[#F0EFE8] truncate block leading-tight">{host.id}</span>
          </div>
        </div>

        {isEditing ? (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 text-[10px] text-[#A09E9A]">

            <div className="space-y-1">
              <label htmlFor="edit-role" className="text-[#A09E9A] font-bold uppercase tracking-wider block">Role:</label>
              <select
                id="edit-role"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full bg-[#0D0D14] border border-white/10 rounded px-1.5 py-1 text-[11px] text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              >
                {['Talent', 'Manager', 'Admin', 'Head Admin', 'Director', 'Agent'].map(r => (
                  <option key={r} value={r} className="bg-[#1A1A28] text-[#F0EFE8]">{r}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-sal" className="text-[#A09E9A] font-bold uppercase tracking-wider block">Base Salary Category:</label>
              <select
                id="edit-sal"
                value={editBaseSalaryCategory}
                onChange={(e) => setEditBaseSalaryCategory(e.target.value)}
                className="w-full bg-[#0D0D14] border border-white/10 rounded px-1.5 py-1 text-[11px] text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              >
                {BASE_SALARY_POLICIES.map(policy => (
                  <option key={policy} value={policy} className="bg-[#1A1A28] text-[#F0EFE8]">{policy}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-mgr" className="text-[#A09E9A] font-bold uppercase tracking-wider block">Assigned Manager:</label>
              <select
                id="edit-mgr"
                value={editManager}
                onChange={(e) => setEditManager(e.target.value)}
                className="w-full bg-[#0D0D14] border border-white/10 rounded px-1.5 py-1 text-[11px] text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              >
                {MANAGERS.map(mgr => (
                  <option key={mgr} value={mgr} className="bg-[#1A1A28] text-[#F0EFE8]">{mgr}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-team" className="text-[#A09E9A] font-bold uppercase tracking-wider block">Team / Anchor Group:</label>
              <input
                id="edit-team"
                type="text"
                value={editTeam}
                onChange={(e) => setEditTeam(e.target.value)}
                className="w-full bg-[#0D0D14] border border-white/10 rounded px-1.5 py-1 text-[11px] text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-status" className="text-[#A09E9A] font-bold uppercase tracking-wider block">Status:</label>
              <select
                id="edit-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full bg-[#0D0D14] border border-white/10 rounded px-1.5 py-1 text-[11px] text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              >
                {['Active', 'Inconsistent', 'Released', 'Inactive'].map(s => (
                  <option key={s} value={s} className="bg-[#1A1A28] text-[#F0EFE8]">{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-tier" className="text-[#A09E9A] font-bold uppercase tracking-wider block">Tier:</label>
              <select
                id="edit-tier"
                value={editTier}
                onChange={(e) => setEditTier(e.target.value)}
                className="w-full bg-[#0D0D14] border border-white/10 rounded px-1.5 py-1 text-[11px] text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              >
                {['S', 'A', 'B', 'C', 'X'].map(t => (
                  <option key={t} value={t} className="bg-[#1A1A28] text-[#F0EFE8]">{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="edit-lvl" className="text-[#A09E9A] font-bold uppercase tracking-wider block">Level Snap:</label>
              <input
                id="edit-lvl"
                type="number"
                value={editLevel}
                onChange={(e) => setEditLevel(parseInt(e.target.value) || 1)}
                className="w-full bg-[#0D0D14] border border-white/10 rounded px-1.5 py-1 text-[11px] text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 pt-2 border-t border-white/5 text-[10px] text-[#A09E9A]">
            <div className="flex items-center gap-1.5">
              <span className="text-[#A09E9A] font-bold uppercase tracking-wider">Role:</span>
              <span className="text-[#D4AF37] font-semibold">{host.role === 'Talent' ? 'Star Host' : host.role}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#A09E9A] font-bold uppercase tracking-wider">Base Salary Category:</span>
              <span className="text-[#F0EFE8] font-semibold">{host.base_salary_category || 'Regular Host'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#A09E9A] font-bold uppercase tracking-wider">Assigned Manager:</span>
              <span className="text-[#F0EFE8] font-semibold">{host.manager}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#A09E9A] font-bold uppercase tracking-wider">Team / Anchor Group:</span>
              <span className="text-indigo-400 font-semibold">{host.team} (Tier: {host.tier}, Level: {host.level})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#A09E9A] font-bold uppercase tracking-wider">Status:</span>
              <span className={cn("font-semibold", host.status === 'Active' ? "text-emerald-400" : "text-amber-400")}>{host.status}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderBiographyCard = () => {
    if (!host.bio && !host.description && !isEditing) return null;
    return (
      <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-4 space-y-2 shadow-md">
        <h4 className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest leading-none">BIOGRAPHY</h4>
        {isEditing ? (
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Introduce yourself to the agency..."
            rows={3}
            className="w-full bg-[#0D0D14] border border-white/10 rounded-xl p-2 text-xs text-[#F0EFE8] resize-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none"
          />
        ) : (
          <p className="text-xs text-[#A09E9A] leading-relaxed italic whitespace-pre-wrap">
            "{host.bio || host.description || 'No biography or talent assessment provided.'}"
          </p>
        )}
      </div>
    );
  };

  const renderSocialAndStreamingCard = () => {
    if (!host.social_links && (!host.streaming_hours || host.streaming_hours.length === 0)) return null;
    
    return (
      <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-4 space-y-4 shadow-md">
        {host.social_links && (
          <div className="space-y-2">
            <h4 className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest leading-none">SOCIAL MEDIA</h4>
            <div className="flex flex-wrap gap-2">
              {host.social_links.ig && (
                <a href={host.social_links.ig.startsWith('http') ? host.social_links.ig : `https://instagram.com/${host.social_links.ig.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-md text-[10px] font-bold hover:bg-pink-500/20 transition-colors">
                  Instagram
                </a>
              )}
              {host.social_links.tiktok && (
                <a href={host.social_links.tiktok.startsWith('http') ? host.social_links.tiktok : `https://tiktok.com/@${host.social_links.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-[#00f2fe]/10 border border-[#00f2fe]/20 text-[#00f2fe] rounded-md text-[10px] font-bold hover:bg-[#00f2fe]/20 transition-colors">
                  TikTok
                </a>
              )}
              {host.social_links.fb && (
                <a href={host.social_links.fb.startsWith('http') ? host.social_links.fb : `https://facebook.com/${host.social_links.fb}`} target="_blank" rel="noopener noreferrer" className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-md text-[10px] font-bold hover:bg-blue-500/20 transition-colors">
                  Facebook
                </a>
              )}
              {host.social_links.whatsapp && (
                <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md text-[10px] font-bold">
                  WA: {host.social_links.whatsapp}
                </span>
              )}
            </div>
          </div>
        )}

        {host.streaming_hours && host.streaming_hours.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/5">
            <h4 className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest leading-none">STREAMING SCHEDULE</h4>
            <div className="grid grid-cols-2 gap-2">
              {host.streaming_hours.map((slot, idx) => (
                <div key={idx} className="bg-[#0D0D14] border border-white/5 rounded p-1.5 text-center">
                  <span className="text-[10px] font-bold text-[#F0EFE8]">{slot.from} - {slot.to}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPerformanceHistory = () => (
    <div className="space-y-3 bg-[#1A1A28]/50 border border-white/5 p-4 rounded-2xl">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#A09E9A] font-outfit">Performance History (Section 1)</h4>
        <span className="text-[8px] font-bold text-[#D4AF37] border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          Firestore Query: poppoId
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs mt-2">
          <thead>
            <tr className="border-b border-white/5 text-[#A09E9A] font-bold uppercase tracking-wider">
              <th className="py-2 px-1">Period</th>
              <th className="py-2 px-1">Level</th>
              <th className="py-2 px-1">Live Duration</th>
              <th className="py-2 px-1">Party Duration</th>
              <th className="py-2 px-1 text-right">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300">
            {performanceReports.length > 0 ? (
              performanceReports.map((r, i) => (
                <tr key={i} className="hover:bg-white/2 transition-colors">
                  <td className="py-2.5 px-1 capitalize">{r.periodType} ({r.month}/{r.year})</td>
                  <td className="py-2.5 px-1">Lvl {r.level}</td>
                  <td className="py-2.5 px-1">{(Number(r.liveDurationMinutes || 0) / 60).toFixed(1)} Hrs</td>
                  <td className="py-2.5 px-1">{(Number(r.partyHostDurationMinutes || 0) / 60).toFixed(1)} Hrs</td>
                  <td className="py-2.5 px-1 text-right font-mono text-emerald-400">
                    {Number(r.earningsBreakdown?.totalEarningsOfPoints || 0).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#A09E9A]/40 italic">No historical performance records found in database.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderEarningsTrend = () => {
    if (!performanceReports || performanceReports.length === 0) return null;

    // Filter to last 6 months and sort chronologically
    const last6Months = [...performanceReports]
      .filter((_, idx) => idx < 6)
      .reverse();

    const chartData = last6Months.map(report => ({
      month: `${report.year}-${String(report.month).padStart(2, '0')}`,
      earnings: Number(report.earningsBreakdown?.totalEarningsOfPoints || 0)
    }));

    if (chartData.length === 0) return null;

    // Calculate 3-month average
    const last3Data = chartData.slice(-3);
    const threeMonthAvg = last3Data.length > 0
      ? last3Data.reduce((sum, item) => sum + item.earnings, 0) / last3Data.length
      : 0;

    return (
      <div className="space-y-4 bg-[#1A1A28]/50 border border-white/5 p-5 rounded-2xl">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#A09E9A] font-outfit">Earnings Trend (Last 6 Months)</h4>
          <span className="text-[8px] font-bold text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            3-Mo Avg: {formatNumber(Math.round(threeMonthAvg))}
          </span>
        </div>
        
        <div className="h-48 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 9, fill: '#A09E9A', fontWeight: 'bold' }}
                axisLine={{ stroke: '#ffffff20' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 9, fill: '#A09E9A', fontWeight: 'bold' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#13131E', borderColor: '#ffffff20', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}
                itemStyle={{ color: '#F0EFE8' }}
                labelStyle={{ color: '#D4AF37', marginBottom: '4px' }}
                formatter={(value: number) => [formatNumber(value), 'Points']}
              />
              {threeMonthAvg > 0 && (
                <ReferenceLine 
                  y={threeMonthAvg} 
                  stroke="#D4AF37" 
                  strokeDasharray="3 3" 
                  opacity={0.5} 
                  label={{ position: 'top', value: '3-Mo Avg', fill: '#D4AF37', fontSize: 8, fontWeight: 'bold', offset: 5 }}
                />
              )}
              <Line 
                type="monotone" 
                dataKey="earnings" 
                stroke="#6366f1" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#13131E', stroke: '#6366f1', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#6366f1', stroke: '#F0EFE8', strokeWidth: 2 }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderRandomPK = () => (
    <div className="space-y-3 flex-1">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#A09E9A] font-outfit">RANDOM PK PERFORMANCE</h4>
        <div className="px-2.5 py-0.5 text-[8px] font-bold text-[#D4AF37] border border-[#D4AF37]/30 bg-[#D4AF37]/10 rounded-full uppercase tracking-wider">
          PUBLIC SUMMARY
        </div>
      </div>
      
      <div className="flex justify-end gap-2 mt-2">
        <button 
          onClick={() => setIsFanbaseFormOpen(true)}
          className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
        >
          Submit Fanbase Report
        </button>
        <button 
          onClick={() => setIsRpkFormOpen(true)}
          className="px-3 py-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
        >
          Submit RPK Report
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2.5 bg-[#1A1A28]/50 border border-white/5 p-3 rounded-2xl">
        {[
          { label: 'PK WIN %', value: `${pkData.win_percentage}%`, subLabel: 'Monthly' },
          { label: 'PK SCORE', value: formatNumber(pkData.pk_score), subLabel: 'Monthly' },
          { label: 'PK SESSIONS', value: String(pkData.sessions), subLabel: 'Weekly' },
        ].map((cell, idx) => (
          <div key={idx} className="bg-[#222235]/40 border border-white/5 p-3 rounded-xl flex flex-col justify-between min-h-[78px] hover:border-[#D4AF37]/20 transition-colors shadow-sm">
            <span className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest leading-none">{cell.label}</span>
            <span className="text-xs md:text-sm font-black text-[#F0EFE8] tracking-tight mt-2.5 block">
              {cell.value}
            </span>
            <span className="text-[7px] font-bold text-[#A09E9A]/60 uppercase tracking-wider mt-1">{cell.subLabel}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEventExposure = () => (
    <div className="space-y-3 bg-[#1A1A28]/50 border border-white/5 p-4 rounded-2xl flex-1">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#A09E9A] font-outfit">Event Exposure (Section 2)</h4>
        <span className="text-[8px] font-bold text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          Total: {participatedEvents.length}
        </span>
      </div>
      <div className="space-y-2 mt-2 max-h-48 overflow-y-auto custom-scrollbar">
        {participatedEvents.length > 0 ? (
          participatedEvents.map((e, idx) => {
            const eventDate = e.eventDate instanceof Timestamp ? e.eventDate.toDate().toLocaleDateString() : (e.eventDate ? new Date(e.eventDate).toLocaleDateString() : 'N/A');
            return (
              <div key={idx} className="bg-[#222235]/40 border border-white/5 p-3 rounded-xl flex items-center justify-between hover:border-[#D4AF37]/20 transition-colors shadow-sm">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#F0EFE8] leading-tight truncate">{e.description || e.eventType}</p>
                  <p className="text-[8px] text-[#A09E9A] font-medium mt-1 truncate">{eventDate} • {e.timeslot}</p>
                </div>
                <span className="text-[8px] font-black uppercase tracking-wider bg-[#1A1A28] border border-white/5 px-2 py-0.5 rounded text-[#A09E9A] shrink-0">
                  {e.status}
                </span>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-[#A09E9A]/40 italic text-center py-6">No historical event participations found for this host.</p>
        )}
      </div>
    </div>
  );

  const renderFanbaseBlock = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#A09E9A] font-outfit">Fanbase Health</h4>
        {fanbaseLatest?.timestamp && (
          <span className="text-[8px] font-bold text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            {new Date(fanbaseLatest.timestamp).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#1A1A28]/50 border border-white/5 p-3 rounded-2xl">
        {[
          { label: 'Followers', value: fanbaseLatest?.total_followers != null ? formatNumber(fanbaseLatest.total_followers) : '—', color: 'text-[#D4AF37]' },
          { label: 'FC Subscribers', value: fanbaseLatest?.fanclub_subscribers != null ? formatNumber(fanbaseLatest.fanclub_subscribers) : '—', color: 'text-indigo-400' },
          { label: 'GC Members', value: fanbaseLatest?.fanclub_gc_members != null ? formatNumber(fanbaseLatest.fanclub_gc_members) : '—', color: 'text-emerald-400' },
          { label: 'Host GC Posts', value: fanbaseLatest?.gc_activity_count_host != null ? formatNumber(fanbaseLatest.gc_activity_count_host) : '—', color: 'text-pink-400' },
        ].map((cell, idx) => (
          <div key={idx} className="bg-[#222235]/40 border border-white/5 p-3 rounded-xl flex flex-col justify-between min-h-[78px] hover:border-[#D4AF37]/20 transition-colors">
            <span className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest leading-none">{cell.label}</span>
            <span className={`text-sm font-black tracking-tight mt-2.5 block ${cell.color}`}>{cell.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAIAnalysis = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#A09E9A] font-outfit">AI Performance Analysis</h4>
        <span className="text-[8px] font-bold text-[#D4AF37] border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Gemini AI</span>
      </div>

      {/* Generate button */}
      {!isGeneratingAI && !aiReport && (
        <button
          onClick={handleGenerateAI}
          className="w-full py-3.5 rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-r from-[#D4AF37]/10 to-[#D4AF37]/5 text-[#D4AF37] font-black text-xs uppercase tracking-widest hover:from-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2.5 shadow-lg shadow-[#D4AF37]/5"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
          Generate AI Report
        </button>
      )}

      {/* Loading state */}
      {isGeneratingAI && (
        <div className="w-full py-8 rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]/60">Analyzing performance data...</p>
        </div>
      )}

      {/* Error */}
      {aiError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold">{aiError}</div>
      )}

      {/* Report output */}
      {aiReport && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="bg-[#1A1A28]/70 border border-[#D4AF37]/15 rounded-2xl p-4 space-y-1.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/70">Performance Summary</p>
            <p className="text-xs text-[#F0EFE8]/90 leading-relaxed font-medium">{aiReport.summary}</p>
          </div>
          {/* Journey */}
          <div className="bg-[#1A1A28]/70 border border-indigo-500/15 rounded-2xl p-4 space-y-1.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400/70">Career Journey</p>
            <p className="text-xs text-[#F0EFE8]/90 leading-relaxed font-medium">{aiReport.journey}</p>
          </div>
          {/* Recommendations */}
          {aiReport.recommendations.length > 0 && (
            <div className="bg-[#1A1A28]/70 border border-emerald-500/15 rounded-2xl p-4 space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400/70">Recommendations</p>
              <ul className="space-y-1.5">
                {aiReport.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5 shrink-0">›</span>
                    <span className="text-xs text-[#F0EFE8]/85 leading-relaxed font-medium">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* Re-generate */}
          <button
            onClick={handleGenerateAI}
            className="text-[9px] font-black uppercase tracking-widest text-[#A09E9A]/60 hover:text-[#D4AF37] transition-colors cursor-pointer w-full text-right pr-1"
          >
            ↻ Regenerate Report
          </button>
        </div>
      )}
    </div>
  );


  const renderRpkModal = () => {
    if (!isRpkFormOpen) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-[#13131E] border border-white/10 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative">
          <button 
            title="Close"
            onClick={() => setIsRpkFormOpen(false)}
            className="absolute top-4 right-4 p-1.5 bg-[#1A1A28] border border-white/10 rounded-full text-[#A09E9A] hover:text-[#F0EFE8] cursor-pointer"
          >
            <X size={14} />
          </button>
          
          <h3 className="text-sm font-black uppercase tracking-wider text-[#F0EFE8] mb-1">Submit RPK Report</h3>
          <p className="text-[10px] text-[#A09E9A] mb-4">Submitting performance data for Host: <span className="text-[#D4AF37] font-bold">{host.nickname || host.name}</span></p>

          <form onSubmit={handleRpkSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">From Date (DD-MM-YYYY)</label>
                <input 
                  type="text" 
                  required
                  placeholder="DD-MM-YYYY"
                  value={rpkFormData.from_date}
                  onChange={(e) => setRpkFormData({...rpkFormData, from_date: e.target.value})}
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">To Date (DD-MM-YYYY)</label>
                <input 
                  type="text" 
                  required
                  placeholder="DD-MM-YYYY"
                  value={rpkFormData.to_date}
                  onChange={(e) => setRpkFormData({...rpkFormData, to_date: e.target.value})}
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">PK Wins %</label>
              <input 
                type="text" 
                placeholder="e.g. 75%"
                value={rpkFormData.pk_wins_percent}
                onChange={(e) => setRpkFormData({...rpkFormData, pk_wins_percent: e.target.value})}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">PK Points</label>
              <input 
                type="text" 
                placeholder="Total PK Points"
                value={rpkFormData.pk_points}
                onChange={(e) => setRpkFormData({...rpkFormData, pk_points: e.target.value})}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">PK Sessions</label>
              <input 
                type="text" 
                placeholder="Total Sessions"
                value={rpkFormData.pk_sessions}
                onChange={(e) => setRpkFormData({...rpkFormData, pk_sessions: e.target.value})}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              />
            </div>

            <button 
              type="submit"
              disabled={isSubmittingRpk}
              className="w-full mt-2 py-2.5 bg-[#D4AF37] hover:bg-[#C5A028] text-black rounded-xl text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmittingRpk ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  const renderFanbaseModal = () => {
    if (!isFanbaseFormOpen) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-[#13131E] border border-white/10 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
          <button 
            title="Close"
            onClick={() => setIsFanbaseFormOpen(false)}
            className="absolute top-4 right-4 p-1.5 bg-[#1A1A28] border border-white/10 rounded-full text-[#A09E9A] hover:text-[#F0EFE8] cursor-pointer"
          >
            <X size={14} />
          </button>
          
          <h3 className="text-sm font-black uppercase tracking-wider text-[#F0EFE8] mb-1">Submit Fanbase Report</h3>
          <p className="text-[10px] text-[#A09E9A] mb-4">Submitting data for Host: <span className="text-indigo-400 font-bold">{host.nickname || host.name}</span></p>

          <form onSubmit={handleFanbaseSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">From Date (DD-MM-YYYY)</label>
                <input 
                  type="text" 
                  required
                  placeholder="DD-MM-YYYY"
                  value={fanbaseFormData.from_date}
                  onChange={(e) => setFanbaseFormData({...fanbaseFormData, from_date: e.target.value})}
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">To Date (DD-MM-YYYY)</label>
                <input 
                  type="text" 
                  required
                  placeholder="DD-MM-YYYY"
                  value={fanbaseFormData.to_date}
                  onChange={(e) => setFanbaseFormData({...fanbaseFormData, to_date: e.target.value})}
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Total Followers</label>
              <input 
                type="text" 
                placeholder="0"
                value={fanbaseFormData.total_followers}
                onChange={(e) => setFanbaseFormData({...fanbaseFormData, total_followers: e.target.value})}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Fanclub Subs</label>
                <input 
                  type="text" 
                  placeholder="0"
                  value={fanbaseFormData.fanclub_subscribers}
                  onChange={(e) => setFanbaseFormData({...fanbaseFormData, fanclub_subscribers: e.target.value})}
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Fanclub GC</label>
                <input 
                  type="text" 
                  placeholder="0"
                  value={fanbaseFormData.fanclub_gc_members}
                  onChange={(e) => setFanbaseFormData({...fanbaseFormData, fanclub_gc_members: e.target.value})}
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">GC Host Activity</label>
                <input 
                  type="text" 
                  placeholder="0"
                  value={fanbaseFormData.gc_activity_count_host}
                  onChange={(e) => setFanbaseFormData({...fanbaseFormData, gc_activity_count_host: e.target.value})}
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">GC Fans Activity</label>
                <input 
                  type="text" 
                  placeholder="0"
                  value={fanbaseFormData.gc_activity_count_fans}
                  onChange={(e) => setFanbaseFormData({...fanbaseFormData, gc_activity_count_fans: e.target.value})}
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Notes</label>
              <textarea 
                placeholder="Optional notes..."
                rows={2}
                value={fanbaseFormData.notes}
                onChange={(e) => setFanbaseFormData({...fanbaseFormData, notes: e.target.value})}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <button 
              type="submit"
              disabled={isSubmittingFanbase}
              className="w-full mt-2 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmittingFanbase ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  const renderTrendBadge = () => {
    if (performanceReports.length < 2) return null;
    const { trend, pct } = trendData;
    const cfg: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; label: string }> = {
      Growing:   { icon: <TrendingUp size={14} />,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: `+${pct}% vs 3-mo avg` },
      Declining: { icon: <TrendingDown size={14} />, color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     label: `${pct}% vs 3-mo avg` },
      Stable:    { icon: <Minus size={14} />,        color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   label: `${pct >= 0 ? '+' : ''}${pct}% vs 3-mo avg` },
      New:       { icon: <Star size={14} />,         color: 'text-indigo-400',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20',  label: 'New host — tracking started' },
    };
    const c = cfg[trend] || cfg.Stable;
    return (
      <div className={`flex items-center gap-3 px-4 py-3 ${c.bg} border ${c.border} rounded-2xl shadow-md`}>
        <span className={c.color}>{c.icon}</span>
        <div>
          <p className={`text-xs font-black uppercase tracking-wider leading-none ${c.color}`}>{trend}</p>
          <p className="text-[9px] text-[#A09E9A] font-bold mt-0.5">{c.label}</p>
        </div>
        <span className="ml-auto text-[8px] font-black uppercase tracking-[0.15em] text-[#A09E9A]/40">Trend</span>
      </div>
    );
  };

  const renderConsistencyScore = () => {
    if (performanceReports.length === 0) return null;
    const score = consistencyScore;
    const radius = 38;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const scoreColor = score >= 75 ? '#10b981' : score >= 50 ? '#D4AF37' : score >= 25 ? '#f59e0b' : '#ef4444';
    const scoreLabel = score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : score >= 25 ? 'Fair' : 'Low';
    return (
      <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-4 flex items-center gap-4 shadow-md">
        <div className="relative shrink-0 w-24 h-24">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r={radius} fill="none" stroke="#ffffff08" strokeWidth="8" />
            <circle
              cx="48" cy="48" r={radius} fill="none"
              stroke={scoreColor} strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 48 48)"
              style={{ transition: 'stroke-dashoffset 1.2s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-black leading-none" style={{ color: scoreColor }}>{score}</span>
            <span className="text-[8px] text-[#A09E9A] font-bold">/100</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black text-[#A09E9A]/50 uppercase tracking-[0.2em] mb-1">Consistency Score</p>
          <p className="text-sm font-black" style={{ color: scoreColor }}>{scoreLabel}</p>
          <p className="text-[10px] text-[#A09E9A] mt-1">{performanceReports.length} months active</p>
        </div>
      </div>
    );
  };

  const renderAwardsBlock = () => {
    if (awards.length === 0) return null;
    const ICON_MAP: Record<string, string> = { trophy: '🏆', star: '⭐', medal: '🥇', crown: '👑', badge: '🎖️' };
    return (
      <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award size={12} className="text-[#D4AF37]/60" />
            <p className="text-[9px] font-black text-[#A09E9A]/50 uppercase tracking-[0.2em]">Agency Awards & Badges</p>
          </div>
          <span className="text-[8px] font-bold text-[#D4AF37] border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-2 py-0.5 rounded-full uppercase tracking-wider">{awards.length} earned</span>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {awards.map((award: any, i: number) => (
            <div key={i} className="flex flex-col items-center gap-1.5 bg-[#0D0D14] border border-[#D4AF37]/15 rounded-xl p-3 w-[88px] text-center hover:border-[#D4AF37]/40 transition-all group">
              <span className="text-2xl group-hover:scale-110 transition-transform inline-block">{ICON_MAP[award.iconType] || '🎖️'}</span>
              <p className="text-[8px] font-black text-[#F0EFE8] leading-tight">{award.title}</p>
              {(award.dateAwarded || award.awardedAt) && (
                <p className="text-[7px] text-[#A09E9A]/40 font-mono">{new Date(award.dateAwarded || award.awardedAt).getFullYear()}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderWeeklyLiveStats = () => {
    if (weeklyLiveData.length === 0) return null;
    return (
      <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-black text-[#A09E9A]/50 uppercase tracking-[0.2em]">Weekly Live Stats</p>
          <span className="text-[8px] font-bold text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 rounded-full uppercase tracking-wider">{weeklyLiveData.length} weeks</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[#A09E9A] font-black text-[8px] uppercase tracking-wider">
                <th className="py-2 px-1">Period</th>
                <th className="py-2 px-1 text-right">Avg Viewers</th>
                <th className="py-2 px-1 text-right">New Fans</th>
                <th className="py-2 px-1 text-right">Gifting</th>
                <th className="py-2 px-1 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {weeklyLiveData.map((w: any, i: number) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2 px-1 text-[9px] text-[#A09E9A] font-mono whitespace-nowrap">{w.from_date} → {w.to_date}</td>
                  <td className="py-2 px-1 text-[10px] text-right font-black text-cyan-400">{Number(w.avg_online_users || 0).toLocaleString()}</td>
                  <td className="py-2 px-1 text-[10px] text-right font-black text-pink-400">{Number(w.new_fans || 0).toLocaleString()}</td>
                  <td className="py-2 px-1 text-[10px] text-right font-black text-amber-400">{Number(w.gifting_count || 0).toLocaleString()}</td>
                  <td className="py-2 px-1 text-[10px] text-right font-black text-emerald-400">{Number(w.total_points || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderAgentNotes = () => {
    if (agentNotes.length === 0) return null;
    const TYPE_STYLES: Record<string, string> = {
      Note:     'text-indigo-400 border-indigo-500/20 bg-indigo-500/5',
      Task:     'text-amber-400 border-amber-500/20 bg-amber-500/5',
      Feedback: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
    };
    return (
      <div className="bg-[#1A1A28] border border-white/5 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={12} className="text-indigo-400/60" />
            <p className="text-[9px] font-black text-[#A09E9A]/50 uppercase tracking-[0.2em]">Agent Notes</p>
          </div>
          <span className="text-[8px] font-bold text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 px-2 py-0.5 rounded-full uppercase tracking-wider">Read-Only</span>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
          {agentNotes.map((note: any, i: number) => (
            <div key={i} className="bg-[#0D0D14] border border-white/5 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${TYPE_STYLES[note.type] || TYPE_STYLES.Note}`}>{note.type || 'Note'}</span>
                <span className="text-[8px] font-mono text-[#A09E9A]/40 ml-auto">{note.createdAt ? new Date(note.createdAt).toLocaleDateString() : ''}</span>
              </div>
              <p className="text-[10px] text-[#F0EFE8]/80 leading-relaxed">{note.content}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={cn(
      "w-full text-[#F0EFE8] flex flex-col",
      isSpotlight 
        ? "bg-[#13131E] p-5 space-y-5 relative max-w-md mx-auto border border-white/5 rounded-[24px] shadow-2xl overflow-hidden" 
        : "space-y-6 max-w-4xl mx-auto pb-12 pt-2"
    )}>
      
      {/* Top Header Grid line style */}
      {isSpotlight ? (
        <div className="flex items-center justify-between pb-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            {onClose && (
              <button 
                onClick={onClose}
                className="p-1.5 rounded-full bg-[#1A1A28] hover:bg-[#222235] text-[#A09E9A] hover:text-[#F0EFE8] transition-all border border-white/10 cursor-pointer"
                aria-label="Back to Roster"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-black text-[#F0EFE8] leading-tight tracking-[0.05em]">NINERS</span>
              <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">APP</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#A09E9A]">PUBLIC VIEW</span>
            {onClose && (
              <button 
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-[#1A1A28] border border-white/10 flex items-center justify-center text-[#A09E9A] hover:text-[#F0EFE8] hover:border-[#D4AF37]/45 hover:bg-[#222235] transition-all shadow-md cursor-pointer"
                aria-label="Close Profile Spotlight"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between pb-4 border-b border-white/5 shrink-0">
          <div className="flex flex-col">
            <span className="text-lg font-black text-[#F0EFE8] leading-tight tracking-[0.05em]">MY PROFILE &amp; SETTINGS</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#D4AF37]">Niners App Portal</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSelfEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A28] border border-white/10 hover:border-[#D4AF37]/40 text-[#A09E9A] hover:text-[#D4AF37] rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
              title="Edit Profile"
            >
              <Edit2 size={11} />
              Edit Profile
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]/45">Syncing Profile Metrics...</p>
        </div>
      ) : (
        <div className={cn(
          isSpotlight 
            ? "space-y-5 overflow-y-auto pr-0.5 py-1 custom-scrollbar max-h-[72vh]" 
            : "grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2"
        )}>
          {isSpotlight ? (
            <>
              {renderIdentityCard()}
              {renderBiographyCard()}
              {renderSocialAndStreamingCard()}
              {renderEarningsBreakdown()}
              {renderMonthlyPointsTrend()}
              {renderPerformanceHistory()}
              {renderEarningsTrend()}
              <div className="flex flex-col md:flex-row gap-6">
                {renderRandomPK()}
                {renderEventExposure()}
              </div>
              {renderFanbaseBlock()}
              {renderAwardsBlock()}
              {renderTrendBadge()}
              {renderConsistencyScore()}
              {renderWeeklyLiveStats()}
              {renderAgentNotes()}
              {renderAIAnalysis()}
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-full mt-4 py-3 bg-[#222235] hover:bg-[#2A2A3F] border border-white/10 hover:border-[#D4AF37]/40 text-[#F0EFE8] hover:text-[#D4AF37] rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer text-center"
                >
                  Close Profile Spotlight
                </button>
              )}
            </>
          ) : (
            <>
              {/* Left Column (Identity & Bio) */}
              <div className="space-y-6 lg:col-span-1">
                {renderIdentityCard()}
                {renderBiographyCard()}
                {renderSocialAndStreamingCard()}
              </div>
              
              {/* Right Column (Performance Stats) */}
              <div className="space-y-6 lg:col-span-2">
                {renderEarningsBreakdown()}
                {renderMonthlyPointsTrend()}
                {renderEarningsTrend()}
                {renderPerformanceHistory()}
                <div className="flex flex-col md:flex-row gap-6">
                  {renderRandomPK()}
                  {renderEventExposure()}
                </div>
                {renderFanbaseBlock()}
                {renderAwardsBlock()}
                <div className="flex flex-col sm:flex-row gap-4">
                  {renderTrendBadge()}
                  {renderConsistencyScore()}
                </div>
                {renderWeeklyLiveStats()}
                {renderAgentNotes()}
                {renderAIAnalysis()}
              </div>
            </>
          )}
        </div>
      )}
      
      {renderRpkModal()}
      {renderFanbaseModal()}
      {renderSelfEditModal()}
    </div>
  );
};

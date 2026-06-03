/* eslint-disable */
/* eslint-disable */
import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, ChevronLeft, Edit2, Loader2, Save, Instagram, Twitter, Facebook, TrendingUp, TrendingDown, Minus, ArrowUpDown, Award, MessageSquare, Star } from 'lucide-react';
import { Host, CommissionEntry, CalendarEvent } from '../types';
import { FirebaseService } from '../lib/firebaseService';
import { Storage } from '../lib/storage';
import { cn, formatNumber } from '../lib/utils';
import { MANAGERS, BASE_SALARY_POLICIES } from '../lib/constants';
import { collection, query, where, getDocs, Timestamp, documentId, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts';

interface HostProfileViewProps {
  host: Host;
  isReadOnly?: boolean;
  onClose?: () => void;
  onProfileUpdated?: () => void;
}

// Helper to determine live hours from report safely
const getLiveHoursForReport = (r: any): number => {
  const mins = r.liveDurationMinutes ?? r.live_duration_minutes;
  if (mins !== undefined && mins !== null && mins !== '') return Number(mins) / 60;
  const hrs = r.liveDuration ?? r.live_duration ?? r.live_hours ?? r.liveHours;
  if (hrs !== undefined && hrs !== null && hrs !== '') return Number(hrs);
  return 0;
};

// Helper to format date uniformly (e.g. "Jun 02, 2026")
const formatDateStandard = (dateInput: any): string => {
  if (!dateInput) return '—';
  try {
    let date: Date;
    if (dateInput instanceof Timestamp) {
      date = dateInput.toDate();
    } else if (dateInput?.seconds) {
      date = new Date(dateInput.seconds * 1000);
    } else {
      date = new Date(dateInput);
    }
    if (isNaN(date.getTime())) return '—';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  } catch (e) {
    return '—';
  }
};

// Helper to format period uniformly (e.g. "Jan/26")
const formatPeriodShort = (monthNameOrNum: any, year: any): string => {
  if (!monthNameOrNum) return '—';
  const MONTH_SHORT: Record<string, string> = {
    '1': 'Jan', '2': 'Feb', '3': 'Mar', '4': 'Apr', '5': 'May', '6': 'Jun',
    '7': 'Jul', '8': 'Aug', '9': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
    'january': 'Jan', 'february': 'Feb', 'march': 'Mar', 'april': 'Apr', 'may': 'May', 'june': 'Jun',
    'july': 'Jul', 'august': 'Aug', 'september': 'Sep', 'october': 'Oct', 'november': 'Nov', 'december': 'Dec'
  };
  
  let mStr = 'Jan';
  const inputMonth = String(monthNameOrNum).toLowerCase();
  if (MONTH_SHORT[inputMonth]) {
    mStr = MONTH_SHORT[inputMonth];
  } else {
    for (const [k, v] of Object.entries(MONTH_SHORT)) {
      if (inputMonth.startsWith(k.slice(0, 3))) {
        mStr = v;
        break;
      }
    }
  }
  
  let yStr = '26';
  if (year) {
    const fullY = String(year);
    yStr = fullY.length > 2 ? fullY.slice(-2) : fullY;
  }
  return `${mStr}/${yStr}`;
};

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
  const [sortAscending, setSortAscending] = useState(true);

  // Dynamic styles based on base salary category
  const styles = useMemo(() => {
    const getCategoryStyles = (category: string) => {
      const norm = String(category || '').trim().toLowerCase();
      if (norm === 'star host') {
        return {
          borderColor: 'border-[#D4AF37]/50',
          shadow: 'shadow-lg shadow-[#D4AF37]/15',
          badgeText: 'text-[#D4AF37]',
          accentColor: '#D4AF37',
        };
      }
      if (norm === 's idol') {
        return {
          borderColor: 'border-[#ec4899]/50',
          shadow: 'shadow-lg shadow-[#ec4899]/15',
          badgeText: 'text-[#ec4899]',
          accentColor: '#ec4899',
        };
      }
      if (norm === 'rocket host') {
        return {
          borderColor: 'border-[#3b82f6]/50',
          shadow: 'shadow-lg shadow-[#3b82f6]/15',
          badgeText: 'text-[#3b82f6]',
          accentColor: '#3b82f6',
        };
      }
      if (norm === 'esport host' || norm.includes('esport')) {
        return {
          borderColor: 'border-[#a855f7]/50',
          shadow: 'shadow-lg shadow-[#a855f7]/15',
          badgeText: 'text-[#a855f7]',
          accentColor: '#a855f7',
        };
      }
      // Regular Host
      return {
        borderColor: 'border-white/5',
        shadow: 'shadow-md',
        badgeText: 'text-[#F0EFE8]',
        accentColor: '#ffffff',
      };
    };
    return getCategoryStyles(host.base_salary_category || '');
  }, [host.base_salary_category]);

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
  const [managersList, setManagersList] = useState<{ id: string; name: string }[]>([]);

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

  // New States for dropdown selections, RPK metadata, event form data, and AI reports triggers
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [eventFormData, setEventFormData] = useState({
    eventType: 'Solo Livehouse',
    eventDate: '',
    timeslot: '',
    description: ''
  });
  const [isAddEventFormOpen, setIsAddEventFormOpen] = useState(false);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [rpkMetadata, setRpkMetadata] = useState<{ lastUpdated: string; updatedBy: string } | null>(null);
  
  // AI report states
  const [postedAiReport, setPostedAiReport] = useState<any>(null);
  const [myRecentAiReport, setMyRecentAiReport] = useState<any>(null);
  const [isPostingAiReport, setIsPostingAiReport] = useState(false);
  const [aiReportReloadTrigger, setAiReportReloadTrigger] = useState(0);

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
        // Section 1: Query performance_reports by document ID prefix (poppoId_month_year)
        const cleanHostId = String(host.id).trim();
        const perfQuery = query(
          collection(db, 'performance_reports'), 
          where(documentId(), '>=', `${cleanHostId}_`),
          where(documentId(), '<=', `${cleanHostId}_\uf8ff`)
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
        // Sort by date descending (supporting both date and eventDate fields)
        eventsList.sort((a, b) => {
          const getEventTime = (evt: any) => {
            if (evt.eventDate) {
              if (evt.eventDate instanceof Timestamp) return evt.eventDate.toDate().getTime();
              if (evt.eventDate.seconds) return evt.eventDate.seconds * 1000;
              return new Date(evt.eventDate).getTime();
            }
            if (evt.date) return new Date(evt.date).getTime();
            return 0;
          };
          return getEventTime(b) - getEventTime(a);
        });
        setParticipatedEvents(eventsList);

        // Load PK data from Firestore subcollection if available, else fallback
        try {
          const rpkSnap = await getDocs(collection(db, 'host', host.id, 'rpk_reporting'));
          if (!rpkSnap.empty) {
            const reports = rpkSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            reports.sort((a: any, b: any) => (b.timestamp || '').localeCompare(a.timestamp || ''));
            const latestRpk = reports[0];
            setPkData({
              win_percentage: parseFloat(latestRpk.pk_wins_percent) || 0,
              pk_score: parseInt(latestRpk.pk_points) || 0,
              sessions: parseInt(latestRpk.pk_sessions) || 0
            });
            setRpkMetadata({
              lastUpdated: latestRpk.timestamp,
              updatedBy: latestRpk.reporter_name || latestRpk.reporter_id || 'Unknown'
            });
          } else {
            const localPks = Storage.getPKData(host.id);
            if (localPks && localPks.length > 0) {
              setPkData({
                win_percentage: localPks[0].win_percentage,
                pk_score: localPks[0].pk_score,
                sessions: localPks[0].sessions
              });
            }
            setRpkMetadata(null);
          }
        } catch (e) {
          console.warn('Could not load RPK report:', e);
          const localPks = Storage.getPKData(host.id);
          if (localPks && localPks.length > 0) {
            setPkData({
              win_percentage: localPks[0].win_percentage,
              pk_score: localPks[0].pk_score,
              sessions: localPks[0].sessions
            });
          }
          setRpkMetadata(null);
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

        // Load AI reports from Firestore
        try {
          const aiSnap = await getDocs(query(collection(db, 'ai_reports'), where('hostId', '==', host.id)));
          const allAi = aiSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          allAi.sort((a: any, b: any) => (b.timestamp || '').localeCompare(a.timestamp || ''));
          
          const latestPosted = allAi.find((r: any) => r.isPosted === true);
          const currentAuth = Storage.getAuthState();
          const latestByUser = allAi.find((r: any) => r.generatedBy === currentAuth?.poppo_id);
          
          setPostedAiReport(latestPosted || null);
          setMyRecentAiReport(latestByUser || null);
          
          const userRoleLower = String(currentAuth?.role || '').toLowerCase();
          const isStaffUser = ['manager', 'agent', 'admin', 'head admin', 'director'].includes(userRoleLower);
          
          if (isStaffUser) {
            const displayReport = latestByUser || latestPosted;
            if (displayReport) {
              setAiReport({
                summary: displayReport.summary,
                journey: displayReport.journey,
                recommendations: displayReport.recommendations || []
              });
            } else {
              setAiReport(null);
            }
          } else {
            if (latestPosted) {
              setAiReport({
                summary: latestPosted.summary,
                journey: latestPosted.journey,
                recommendations: latestPosted.recommendations || []
              });
            } else {
              setAiReport(null);
            }
          }
        } catch (e) {
          console.warn("Could not load AI reports:", e);
        }

        // Load awards
        try {
          const awardsData = await FirebaseService.getAwards(host.id);
          const sortedAwards = (awardsData || []).sort((a: any, b: any) => {
            const dateA = a.dateAwarded || a.awardedAt || '';
            const dateB = b.dateAwarded || b.awardedAt || '';
            return dateB.localeCompare(dateA);
          });
          setAwards(sortedAwards);
        } catch (e) { console.warn('Could not load awards:', e); }

        // Load agent notes
        try {
          const notesData = await FirebaseService.getNotesByHost(host.id);
          const sortedNotes = [...notesData].sort((a: any, b: any) => {
            const dateA = a.createdAt || '';
            const dateB = b.createdAt || '';
            return dateB.localeCompare(dateA);
          });
          setAgentNotes(sortedNotes.slice(0, 5));
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

  useEffect(() => {
    const reloadAiReports = async () => {
      try {
        const aiSnap = await getDocs(query(collection(db, 'ai_reports'), where('hostId', '==', host.id)));
        const allAi = aiSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allAi.sort((a: any, b: any) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        
        const latestPosted = allAi.find((r: any) => r.isPosted === true);
        const currentAuth = Storage.getAuthState();
        const latestByUser = allAi.find((r: any) => r.generatedBy === currentAuth?.poppo_id);
        
        setPostedAiReport(latestPosted || null);
        setMyRecentAiReport(latestByUser || null);
        
        const userRoleLower = String(currentAuth?.role || '').toLowerCase();
        const isStaffUser = ['manager', 'agent', 'admin', 'head admin', 'director'].includes(userRoleLower);
        
        if (isStaffUser) {
          const displayReport = latestByUser || latestPosted;
          if (displayReport) {
            setAiReport({
              summary: displayReport.summary,
              journey: displayReport.journey,
              recommendations: displayReport.recommendations || []
            });
          } else {
            setAiReport(null);
          }
        } else {
          if (latestPosted) {
            setAiReport({
              summary: latestPosted.summary,
              journey: latestPosted.journey,
              recommendations: latestPosted.recommendations || []
            });
          } else {
            setAiReport(null);
          }
        }
      } catch (e) {
        console.warn("Could not reload AI reports:", e);
      }
    };
    if (host.id) {
      reloadAiReports();
    }
  }, [aiReportReloadTrigger, host.id]);

  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const allHosts = await FirebaseService.getAllHosts();
        const mgrs = allHosts
          .filter(h => (h.role || '').toLowerCase() === 'manager' || (h.role || '').toLowerCase() === 'agent')
          .map(h => ({ id: h.id || (h as any).poppoId || (h as any).poppo_id, name: h.nickname || h.name || h.id }));
        setManagersList(mgrs);
      } catch (err) {
        console.error("Failed to load managers list:", err);
      }
    };
    fetchManagers();
  }, []);



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
      const selectedMgr = managersList.find(m => m.name === editManager);
      const assignedManagerId = selectedMgr ? selectedMgr.id : null;

      const truncatedDesc = editDescription.slice(0, 100);
      const updatedHost: Host = {
        ...host,
        nickname: editNickname.trim(),
        name: editNickname.trim() || host.name,
        photoUrl: editPhotoUrl,
        description: truncatedDesc,
        bio: truncatedDesc,
        role: editRole as any,
        team: editTeam,
        manager: editManager,
        assignedManagerId: assignedManagerId,
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
      
      // Reload latest RPK report immediately
      try {
        const rpkSnap = await getDocs(collection(db, 'host', host.id, 'rpk_reporting'));
        if (!rpkSnap.empty) {
          const reports = rpkSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          reports.sort((a: any, b: any) => (b.timestamp || '').localeCompare(a.timestamp || ''));
          const latestRpk = reports[0];
          setPkData({
            win_percentage: parseFloat(latestRpk.pk_wins_percent) || 0,
            pk_score: parseInt(latestRpk.pk_points) || 0,
            sessions: parseInt(latestRpk.pk_sessions) || 0
          });
          setRpkMetadata({
            lastUpdated: latestRpk.timestamp,
            updatedBy: latestRpk.reporter_name || latestRpk.reporter_id || 'Unknown'
          });
        }
      } catch (e) {
        console.warn('Could not reload RPK report:', e);
      }

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
      const userRoleLower = String(currentAuth?.role || '').toLowerCase();
      const isStaffUser = ['manager', 'agent', 'admin', 'head admin', 'director'].includes(userRoleLower);

      const reportData = {
        reporter_id: currentAuth?.poppo_id || "Unknown",
        reporter_name: currentAuth?.name || currentAuth?.nickname || "Unknown",
        reporter_role: currentAuth?.role || "Unknown",
        poppo_id: host.id,
        nickname: host.nickname || host.name,
        from_date: fanbaseFormData.from_date,
        to_date: fanbaseFormData.to_date,
        total_followers: parseFloat(fanbaseFormData.total_followers) || 0,
        fanclub_subscribers: parseFloat(fanbaseFormData.fanclub_subscribers) || 0,
        fanclub_gc_members: parseFloat(fanbaseFormData.fanclub_gc_members) || 0,
        // Exclude host gc posts and fans gc posts if not staff
        gc_activity_count_host: isStaffUser ? (parseFloat(fanbaseFormData.gc_activity_count_host) || 0) : 0,
        gc_activity_count_fans: isStaffUser ? (parseFloat(fanbaseFormData.gc_activity_count_fans) || 0) : 0,
        notes: fanbaseFormData.notes
      };

      await FirebaseService.submitFanbaseReport(host.id, fanbaseFormData.from_date, fanbaseFormData.to_date, reportData);
      
      // Reload latest fanbase report immediately
      try {
        const fanbaseSnap = await getDocs(collection(db, 'host', host.id, 'fanbase_report'));
        if (!fanbaseSnap.empty) {
          const reports = fanbaseSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          reports.sort((a: any, b: any) => (b.timestamp || '').localeCompare(a.timestamp || ''));
          setFanbaseLatest(reports[0]);
        }
      } catch (e) {
        console.warn('Could not reload fanbase report:', e);
      }

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
      const truncatedBio = selfBio.slice(0, 100);
      const updatedHost: Host = {
        ...host,
        bio: truncatedBio,
        description: truncatedBio,
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

  const handleAddEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventFormData.eventDate || !eventFormData.timeslot || !eventFormData.description) {
      alert("All fields are required.");
      return;
    }
    setIsSubmittingEvent(true);
    try {
      const currentAuth = Storage.getAuthState();
      const eventId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      
      const newEvent = {
        eventDate: Timestamp.fromDate(new Date(eventFormData.eventDate)),
        timeslot: eventFormData.timeslot,
        eventType: eventFormData.eventType,
        description: eventFormData.description,
        participantIds: [host.id],
        participants: [host.id],
        status: 'Approved',
        actualParticipants: [host.id],
        adminFeedback: '',
        createdBy: currentAuth?.name || currentAuth?.nickname || 'Host',
        attendanceSubmittedBy: {
          poppoId: currentAuth?.poppo_id || '',
          name: currentAuth?.name || currentAuth?.nickname || '',
          role: currentAuth?.role || ''
        },
        timestamp: new Date().toISOString()
      };

      await setDoc(doc(db, 'events', eventId), newEvent);

      // Refresh participated events list
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
      eventsList.sort((a, b) => {
        const getEventTime = (evt: any) => {
          if (evt.eventDate) {
            if (evt.eventDate instanceof Timestamp) return evt.eventDate.toDate().getTime();
            if (evt.eventDate.seconds) return evt.eventDate.seconds * 1000;
            return new Date(evt.eventDate).getTime();
          }
          if (evt.date) return new Date(evt.date).getTime();
          return 0;
        };
        return getEventTime(b) - getEventTime(a);
      });
      setParticipatedEvents(eventsList);

      setIsAddEventFormOpen(false);
      setEventFormData({
        eventType: 'Solo Livehouse',
        eventDate: '',
        timeslot: '',
        description: ''
      });
      alert("Event registered successfully.");
    } catch (err) {
      console.error("Failed to add event:", err);
      alert("Failed to register event.");
    } finally {
      setIsSubmittingEvent(false);
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
    const liveHrs =       sum(r => getLiveHoursForReport(r));
    const partyHrs =      sum(r => pf(r, 'partyHostDurationMinutes','party_host_duration_minutes','partyHostDuration','partyDuration') / 60);
    const points =        sum(r => pf(r, 'totalEarningsOfPoints','total_earnings_of_points','totalPoints','total_points','points'));
    const liveEarnings =  sum(r => pf(r, 'liveEarnings','live_earnings'));
    const partyEarnings = sum(r => pf(r, 'partyEarnings','party_earnings'));
    const privateChat =   sum(r => pf(r, 'privateChatEarnings','private_chat_earnings','privateChat'));
    const tips =          sum(r => pf(r, 'tips'));
    const platformReward =sum(r => pf(r, 'platformReward','platform_reward'));
    const otherEarnings = sum(r => pf(r, 'otherEarnings','other_earnings'));
    const platformHourly =sum(r => pf(r, 'platformHourlySalary','platform_hourly_salary'));
    const superSalary =   sum(r => pf(r, 'superSalary','super_salary'));
    const superRank =     sum(r => pf(r, 'superRank','super_rank'));
    
    // Sum of all earnings components for total_earnings
    const totalEarnings = liveEarnings + partyEarnings + platformReward + tips + otherEarnings + superSalary + superRank;
    
    return {
      liveHrs,
      partyHrs,
      points,
      liveEarnings,
      partyEarnings,
      privateChat,
      tips,
      platformReward,
      otherEarnings,
      platformHourly,
      superSalary,
      superRank,
      totalEarnings,
    };
  }, [performanceReports]);

  const activeReport = useMemo(() => {
    if (selectedPeriod === 'all') return null;
    return performanceReports.find(r => r.id === selectedPeriod) || null;
  }, [selectedPeriod, performanceReports]);

  const selectedMetrics = useMemo(() => {
    if (!activeReport) {
      return perfTotals;
    }
    const liveHrs =       getLiveHoursForReport(activeReport);
    const partyHrs =      pf(activeReport, 'partyHostDurationMinutes','party_host_duration_minutes','partyHostDuration','partyDuration') / 60;
    const points =        pf(activeReport, 'totalEarningsOfPoints','total_earnings_of_points','totalPoints','total_points','points');
    const liveEarnings =  pf(activeReport, 'liveEarnings','live_earnings');
    const partyEarnings = pf(activeReport, 'partyEarnings','party_earnings');
    const privateChat =   pf(activeReport, 'privateChatEarnings','private_chat_earnings','privateChat');
    const tips =          pf(activeReport, 'tips');
    const platformReward =pf(activeReport, 'platformReward','platform_reward');
    const otherEarnings = pf(activeReport, 'otherEarnings','other_earnings');
    const platformHourly =pf(activeReport, 'platformHourlySalary','platform_hourly_salary');
    const superSalary =   pf(activeReport, 'superSalary','super_salary');
    const superRank =     pf(activeReport, 'superRank','super_rank');
    
    const totalEarnings = liveEarnings + partyEarnings + platformReward + tips + otherEarnings + superSalary + superRank;
    
    return {
      liveHrs,
      partyHrs,
      points,
      liveEarnings,
      partyEarnings,
      privateChat,
      tips,
      platformReward,
      otherEarnings,
      platformHourly,
      superSalary,
      superRank,
      totalEarnings,
    };
  }, [activeReport, perfTotals]);

  // Sort performance reports chronologically
  const sortedReportsForRender = useMemo(() => {
    const MONTH_ORDER = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    
    return [...performanceReports].sort((a, b) => {
      const yearA = Number(a.year) || 0;
      const yearB = Number(b.year) || 0;
      
      let monthA = Number(a.month) || 0;
      if (!monthA && a.monthName) {
        monthA = MONTH_ORDER.findIndex(m => m.toLowerCase() === String(a.monthName).toLowerCase()) + 1;
      }
      let monthB = Number(b.month) || 0;
      if (!monthB && b.monthName) {
        monthB = MONTH_ORDER.findIndex(m => m.toLowerCase() === String(b.monthName).toLowerCase()) + 1;
      }
      
      if (yearA !== yearB) {
        return sortAscending ? yearA - yearB : yearB - yearA;
      }
      return sortAscending ? monthA - monthB : monthB - monthA;
    });
  }, [performanceReports, sortAscending]);

  // AI Report Generator — defined here so perfTotals is in scope
  const handleGenerateAI = async () => {
    const currentAuth = Storage.getAuthState();
    const userRoleLower = String(currentAuth?.role || '').toLowerCase();
    const canGenerateAI = 
      (userRoleLower === 'manager' && String(host.assignedManagerId) === String(currentAuth?.poppo_id)) ||
      (userRoleLower === 'agent' && String(host.assignedManagerId) === String(currentAuth?.poppo_id)) ||
      (userRoleLower === 'head admin') ||
      (userRoleLower === 'head_admin') ||
      (userRoleLower === 'director');

    if (!canGenerateAI) {
      alert("Only assigned managers, head admins, and the director can generate AI reports.");
      return;
    }

    setIsGeneratingAI(true);
    setAiError('');
    try {
      // Check last 7 days successful generation constraint
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const checkQuery = query(
        collection(db, 'ai_reports'),
        where('generatedBy', '==', currentAuth.poppo_id),
        where('timestamp', '>=', oneWeekAgo.toISOString())
      );
      const checkSnap = await getDocs(checkQuery);
      if (!checkSnap.empty) {
        // Find the most recent one
        const sortedHistory = checkSnap.docs.map(doc => doc.data()).sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp));
        const lastGen = new Date(sortedHistory[0].timestamp);
        throw new Error(`You have already generated an AI report this week. Limit is 1 per week. Next generation available after ${new Date(lastGen.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleString()}`);
      }

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

CRITICAL REQUIREMENT: When generating the analysis, recommendations, and tasks, you MUST reference ONLY the concepts and terminology from the Nine Pillars of Streaming Success training framework. Categorize your recommendations and tasks strictly using the following 9 Pillars:
1. Profile Optimization (Digital Handshake - Cover photo billboard, Nametag cognitive fluency, Bio elevator pitch)
2. Live Quality (Psychological Comfort - Audio priority, lighting, background, camera placement)
3. Timing & Consistency (Engine of Loyalty - Habit formation, pre-stream and no-stream updates)
4. Visibility Investment (Overcoming Obscurity - Lucky Box timing, Random PK scheduling, peak hour matching)
5. In-Stream Interaction (Engagement Engine - Reciprocity, open-ended questions, eliminating dead air)
6. Fanbase Development (Architecting Your Tribe - Conversion funnel, Follow/Fanclub CTAs, tribe name/symbols)
7. Retention (Maintaining Loyalty - Emotional continuity, Group Chat check-ins, weekly rituals)
8. Monetization (Activating Financial Support - Goal framing, gratitude loops, monetization moments)
9. Intentional Goal Setting (Guiding Principle - Four Goal Arches: Financial, Community, Skill, Quality; Declare-Track-Review loop)

[SUMMARY] Write a 2-3 sentence performance summary of this host. Be specific, data-driven, and relate findings directly to the 9 Pillars.
[JOURNEY] Write a 2-3 sentence narrative about their streamer career journey and growth trajectory, evaluated using the 9 Pillars milestones.
[RECOMMENDATIONS] List 3-5 specific, actionable bullet points to help this host improve. Use "• " prefix for each. Each bullet point MUST start by identifying the relevant Pillar (e.g. "[Pillar 4: Visibility Investment]") and contain a specific training task referencing the framework concepts (e.g., "Run 3 PKs back-to-back with a Lucky Box dropped 2 minutes prior").`;

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

      const reportId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      const newReportDoc = {
        reportId,
        hostId: host.id,
        hostName: host.nickname || host.name,
        generatedBy: currentAuth.poppo_id,
        generatedByName: currentAuth.name || currentAuth.nickname || 'Unknown',
        generatedRole: currentAuth.role || 'Unknown',
        timestamp: new Date().toISOString(),
        summary,
        journey,
        recommendations,
        isPosted: false
      };
      await setDoc(doc(db, 'ai_reports', reportId), newReportDoc);

      setAiReport({ summary, journey, recommendations });
      setMyRecentAiReport(newReportDoc);
      setAiReportReloadTrigger(prev => prev + 1);
      alert("AI Report generated successfully. You can now post it to the host profile.");
    } catch (err: any) {
      setAiError(err.message || 'Failed to generate AI report.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handlePostAiReport = async () => {
    const reportToPost = myRecentAiReport || postedAiReport;
    if (!reportToPost) return;
    setIsPostingAiReport(true);
    try {
      await setDoc(doc(db, 'ai_reports', reportToPost.reportId), { isPosted: true }, { merge: true });
      alert("Report posted successfully to host profile!");
      setAiReportReloadTrigger(prev => prev + 1);
    } catch (err: any) {
      console.error("Failed to post AI report:", err);
      alert("Failed to post report: " + err.message);
    } finally {
      setIsPostingAiReport(false);
    }
  };

  // Monthly bar chart data - chronologically ascending (earliest to newest)
  const monthlyChartData = useMemo(() => {
    const MONTH_ORDER = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return [...performanceReports]
      .sort((a, b) => {
        const yearA = Number(a.year) || 0;
        const yearB = Number(b.year) || 0;
        if (yearA !== yearB) return yearA - yearB;
        
        let monthA = Number(a.month) || 0;
        if (!monthA && a.monthName) {
          monthA = MONTH_ORDER.findIndex(m => m.toLowerCase() === String(a.monthName).toLowerCase()) + 1;
        }
        let monthB = Number(b.month) || 0;
        if (!monthB && b.monthName) {
          monthB = MONTH_ORDER.findIndex(m => m.toLowerCase() === String(b.monthName).toLowerCase()) + 1;
        }
        return monthA - monthB;
      })
      .map(r => {
        return {
          label: formatPeriodShort(r.monthName || r.month, r.year),
          points: pf(r, 'totalEarningsOfPoints','total_earnings_of_points','totalPoints','total_points','points'),
        };
      });
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
    { label: 'TOTAL LIVE\nDURATION', value: selectedMetrics.liveHrs + selectedMetrics.partyHrs, color: '#06b6d4', fmt: (v: number) => v ? `${v.toFixed(1)}h` : '—' },
    { label: 'Live\nEarnings',      value: selectedMetrics.liveEarnings,   color: '#3b82f6',  fmt: (v: number) => v ? v.toLocaleString() : '—' },
    { label: 'Total\nEarnings',     value: selectedMetrics.totalEarnings,  color: '#22d3ee',  fmt: (v: number) => v ? v.toLocaleString() : '—' },
    { label: 'Total\nPoints',       value: selectedMetrics.points,         color: '#D4AF37',  fmt: (v: number) => v ? v.toLocaleString() : '—' },
    { label: 'Party\nEarnings',     value: selectedMetrics.partyEarnings,  color: '#8b5cf6',  fmt: (v: number) => v ? v.toLocaleString() : '—' },
    { label: 'Platform\nReward',    value: selectedMetrics.platformReward, color: '#10b981',  fmt: (v: number) => v ? v.toLocaleString() : '—' },
    { label: 'Tips',                value: selectedMetrics.tips,           color: '#f59e0b',  fmt: (v: number) => v ? v.toLocaleString() : '—' },
    { label: 'Other\nEarnings',     value: selectedMetrics.otherEarnings,  color: '#a78bfa',  fmt: (v: number) => v ? v.toLocaleString() : '—' },
    { label: 'Super\nRank',         value: selectedMetrics.superRank,      color: '#fb923c',  fmt: (v: number) => v ? v.toLocaleString() : '—' },
    { label: 'Super\nSalary',       value: selectedMetrics.superSalary,    color: '#fbbf24',  fmt: (v: number) => v ? v.toLocaleString() : '—' },
    { label: 'Party\nHours',        value: selectedMetrics.partyHrs,       color: '#c084fc',  fmt: (v: number) => v ? `${v.toFixed(1)}h` : '—' },
    { label: 'SOLO LIVE\nHOURS',    value: selectedMetrics.liveHrs,        color: '#22d3ee',  fmt: (v: number) => v ? `${v.toFixed(1)}h` : '—' },
  ];

  const renderEarningsBreakdown = () => {
    if (performanceReports.length === 0) return null;
    return (
      <div className={cn("bg-[#1A1A28] border-2 rounded-2xl p-4 transition-all duration-300", styles.borderColor, styles.shadow)}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[9px] font-black text-[#A09E9A]/50 uppercase tracking-[0.2em]">
            {activeReport ? `PERFORMANCE ANALYTICS — ${formatPeriodShort(activeReport.monthName || activeReport.month, activeReport.year)}` : 'PERFORMANCE ANALYTICS — All Time'}
          </p>
          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
            className="bg-[#0D0D14] border border-white/10 rounded-xl px-2 py-0.5 text-[8px] font-black text-[#D4AF37] outline-none focus:border-[#D4AF37]/50 cursor-pointer transition-all uppercase tracking-wider"
          >
            <option value="all">All Time</option>
            {performanceReports.map(r => (
              <option key={r.id} value={r.id}>
                {formatPeriodShort(r.monthName || r.month, r.year)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {earningTiles.map((tile, i) => {
            const valStr = tile.fmt(tile.value);
            const textClass = valStr.length > 7 
              ? "text-[9px]" 
              : valStr.length > 5 
                ? "text-[11px]" 
                : "text-xs md:text-sm";
            return (
              <div key={i} className="bg-[#09090e] border border-white/10 rounded-xl p-2.5 flex flex-col items-center text-center hover:border-white/20 transition-all">
                <p className="text-[7px] font-black uppercase tracking-wider leading-tight mb-1.5 whitespace-pre-line" style={{ color: tile.color + 'aa' }}>
                  {tile.label}
                </p>
                <p className={cn("font-black leading-none truncate max-w-full", textClass)} style={{ color: tile.color }}>
                  {valStr}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthlyPointsTrend = () => {
    if (monthlyChartData.length === 0) return null;
    const COLORS = ['#D4AF37','#6366f1','#ec4899','#10b981','#f59e0b','#06b6d4','#a78bfa','#fb923c','#38bdf8','#34d399','#f472b6','#818cf8'];
    return (
      <div className={cn("bg-[#1A1A28] border-2 rounded-2xl p-4 transition-all duration-300", styles.borderColor, styles.shadow)}>
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
            {/* Host Public Message */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Host Public Message</label>
                <span className="text-[8px] text-[#A09E9A]/50 font-bold">{selfBio.length}/100</span>
              </div>
              <textarea
                rows={3}
                maxLength={100}
                value={selfBio}
                onChange={e => setSelfBio(e.target.value.slice(0, 100))}
                placeholder="Enter your public message (max 100 characters)..."
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
                <div className="flex flex-col">
                  <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Streaming Schedule (Max 2)</label>
                  <span className="text-[7.5px] text-[#A09E9A]/50 font-bold">Use AM/PM format (e.g. 08:00 AM - 10:00 PM)</span>
                </div>
                {selfStreamSlots.length < 2 && (
                  <button
                    type="button"
                    onClick={() => setSelfStreamSlots([...selfStreamSlots, { from: '', to: '' }])}
                    className="text-[8px] font-black text-[#D4AF37] border border-[#D4AF37]/30 rounded px-2 py-0.5 hover:bg-[#D4AF37]/10 transition-all cursor-pointer"
                  >
                    + Add Slot
                  </button>
                )}
              </div>
              {selfStreamSlots.map((slot, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text" value={slot.from}
                    onChange={e => { const s = [...selfStreamSlots]; s[idx] = { ...s[idx], from: e.target.value }; setSelfStreamSlots(s); }}
                    placeholder="From (e.g. 08:00 AM)"
                    className="flex-1 bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                  />
                  <span className="text-[#A09E9A]/40 text-xs">→</span>
                  <input
                    type="text" value={slot.to}
                    onChange={e => { const s = [...selfStreamSlots]; s[idx] = { ...s[idx], to: e.target.value }; setSelfStreamSlots(s); }}
                    placeholder="To (e.g. 10:00 PM)"
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



  const renderIdentityCard = () => {
    const currentAuth = Storage.getAuthState();
    const isOwnProfile = currentAuth.poppo_id === host.id;
    const userRoleLower = String(currentAuth?.role || '').toLowerCase();
    const isStaffUser = ['manager', 'agent', 'admin', 'head admin', 'director'].includes(userRoleLower);

    return (
      <div className={cn("bg-[#1A1A28] border-2 rounded-2xl p-4 flex flex-col gap-4 relative group/card transition-all duration-300", styles.borderColor, styles.shadow)}>
        {/* Top area: Photo + Nickname/PoppoID/Admin Fields */}
        <div className="flex gap-4 items-start">
          {/* Host Photo Section */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <span className="text-[8px] font-black text-[#A09E9A]/60 uppercase tracking-widest leading-none">HOST PHOTO</span>
            <div className="w-16 h-16 rounded-full bg-[#0D0D14] border-2 flex items-center justify-center font-bold text-[#F0EFE8] overflow-hidden shadow-lg relative" style={{ borderColor: styles.accentColor }}>
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

            {/* Social Media (placed directly under profile photo) */}
            {host.social_links && (host.social_links.ig || host.social_links.tiktok || host.social_links.fb || host.social_links.whatsapp) && (
              <div className="flex gap-1.5 mt-2.5 justify-center">
                {host.social_links.ig && (
                  <a 
                    href={host.social_links.ig.startsWith('http') ? host.social_links.ig : `https://instagram.com/${host.social_links.ig.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-1 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 text-pink-400 rounded-md transition-colors flex items-center justify-center"
                    title="Instagram"
                  >
                    <Instagram size={11} />
                  </a>
                )}
                {host.social_links.tiktok && (
                  <a 
                    href={host.social_links.tiktok.startsWith('http') ? host.social_links.tiktok : `https://tiktok.com/@${host.social_links.tiktok.replace('@', '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-1 bg-[#00f2fe]/10 hover:bg-[#00f2fe]/20 border border-[#00f2fe]/20 text-[#00f2fe] rounded-md transition-colors flex items-center justify-center font-bold text-[9px] leading-none"
                    title="TikTok"
                  >
                    <span>🎵</span>
                  </a>
                )}
                {host.social_links.fb && (
                  <a 
                    href={host.social_links.fb.startsWith('http') ? host.social_links.fb : `https://facebook.com/${host.social_links.fb}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="p-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 rounded-md transition-colors flex items-center justify-center"
                    title="Facebook"
                  >
                    <Facebook size={11} />
                  </a>
                )}
                {host.social_links.whatsapp && (
                  <a 
                    href={`https://wa.me/${host.social_links.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-md transition-colors flex items-center justify-center text-[10px] font-bold"
                    title="WhatsApp"
                  >
                    <span>💬</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Identity Details */}
          <div className="flex-1 min-w-0 space-y-2.5 pr-16">
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
                    {!managersList.some(m => m.name === editManager) && editManager && (
                      <option value={editManager} className="bg-[#1A1A28] text-[#F0EFE8]">{editManager}</option>
                    )}
                    {managersList.map(mgr => (
                      <option key={mgr.id} value={mgr.name} className="bg-[#1A1A28] text-[#F0EFE8]">{mgr.name}</option>
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
                  <span className={cn("font-semibold", styles.badgeText)}>{host.base_salary_category || 'Regular Host'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#A09E9A] font-bold uppercase tracking-wider">Assigned Manager:</span>
                  <span className="text-[#F0EFE8] font-semibold">{host.manager}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#A09E9A] font-bold uppercase tracking-wider">Team / Anchor Group:</span>
                  <span className="text-indigo-400 font-semibold">{host.team}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#A09E9A] font-bold uppercase tracking-wider">Status:</span>
                  <span className={cn("font-semibold", host.status === 'Active' ? "text-emerald-400" : "text-amber-400")}>{host.status}</span>
                </div>
              </div>
            )}

            {/* Streaming Schedule (placed under edit button and details) */}
            {host.streaming_hours && host.streaming_hours.length > 0 && (
              <div className="pt-2.5 border-t border-white/5 space-y-1">
                <span className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest block">STREAMING SCHEDULE</span>
                <div className="grid grid-cols-2 gap-2">
                  {host.streaming_hours.slice(0, 2).map((slot, idx) => (
                    <div key={idx} className="bg-[#0D0D14] border border-white/5 rounded px-2 py-1 text-center">
                      <span className="text-[9px] font-bold text-[#F0EFE8]">{slot.from} - {slot.to}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Host Public Message (Biography limited to 100 characters) */}
        <div className="pt-3 border-t border-white/5 space-y-1">
          <span className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest block">Host Public Message</span>
          <p className="text-xs text-[#A09E9A] leading-relaxed italic whitespace-pre-wrap">
            "{String(host.bio || host.description || 'No public message set.').slice(0, 100)}"
          </p>
        </div>

        {/* Edit / Save Options */}
        {(!isReadOnly || isOwnProfile) && (
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            {isOwnProfile && (
              <button
                onClick={() => setIsSelfEditing(true)}
                className="px-2 py-1 bg-[#222235] hover:bg-[#2A2A3F] border border-white/10 text-[#A09E9A] hover:text-[#D4AF37] rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                title="Edit Profile"
              >
                <Edit2 size={11} />
                Edit Profile
              </button>
            )}
            {!isReadOnly && isStaffUser && (
              <>
                {!isEditing ? (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 bg-[#222235] hover:bg-[#2A2A3F] text-[#A09E9A] hover:text-[#D4AF37] rounded-lg transition-all border border-white/10 cursor-pointer shadow-sm"
                    title="Admin Edit"
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
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPerformanceHistory = () => {
    return (
      <div className={cn("space-y-3 bg-[#1A1A28]/50 border-2 p-4 rounded-2xl transition-all duration-300", styles.borderColor, styles.shadow)}>
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#A09E9A] font-outfit">Earning Diversity</h4>
            <button
              onClick={() => setSortAscending(prev => !prev)}
              className="p-1 hover:bg-white/5 rounded text-[#A09E9A] hover:text-[#D4AF37] transition-all cursor-pointer"
              title="Toggle Chronological Sort"
            >
              <ArrowUpDown size={11} />
            </button>
          </div>
          <span className="text-[8px] font-bold text-[#D4AF37] border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Performance Records
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs mt-2">
            <thead>
              <tr className="border-b border-white/5 text-[#A09E9A] font-bold uppercase tracking-wider text-[8.5px]">
                <th className="py-2 px-1">Period</th>
                <th className="py-2 px-1 text-right">Live Earnings</th>
                <th className="py-2 px-1 text-right">Party Earnings</th>
                <th className="py-2 px-1 text-right">Platform Reward</th>
                <th className="py-2 px-1 text-right">Tips</th>
                <th className="py-2 px-1 text-right">Other</th>
                <th className="py-2 px-1 text-right">Super Rank</th>
                <th className="py-2 px-1 text-right">Super Salary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300">
              {sortedReportsForRender.length > 0 ? (
                sortedReportsForRender.map((r, i) => (
                  <tr key={i} className="hover:bg-white/2 transition-colors text-[10.5px]">
                    <td className="py-2.5 px-1 capitalize whitespace-nowrap">{formatPeriodShort(r.monthName || r.month, r.year)}</td>
                    <td className="py-2.5 px-1 text-right font-mono text-cyan-400">{pf(r, 'liveEarnings', 'live_earnings').toLocaleString()}</td>
                    <td className="py-2.5 px-1 text-right font-mono text-indigo-400">{pf(r, 'partyEarnings', 'party_earnings').toLocaleString()}</td>
                    <td className="py-2.5 px-1 text-right font-mono text-emerald-400">{pf(r, 'platformReward', 'platform_reward').toLocaleString()}</td>
                    <td className="py-2.5 px-1 text-right font-mono text-amber-400">{pf(r, 'tips').toLocaleString()}</td>
                    <td className="py-2.5 px-1 text-right font-mono text-slate-400">{pf(r, 'otherEarnings', 'other_earnings').toLocaleString()}</td>
                    <td className="py-2.5 px-1 text-right font-mono text-orange-400">{pf(r, 'superRank', 'super_rank').toLocaleString()}</td>
                    <td className="py-2.5 px-1 text-right font-mono text-yellow-400">{pf(r, 'superSalary', 'super_salary').toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#A09E9A]/40 italic">No historical performance records found in database.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderEarningsTrend = () => {
    if (!performanceReports || performanceReports.length === 0) return null;

    // Sort based on toggle state for the line chart
    const MONTH_ORDER = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const chartData = [...performanceReports]
      .sort((a, b) => {
        const yearA = Number(a.year) || 0;
        const yearB = Number(b.year) || 0;
        let monthA = Number(a.month) || 0;
        if (!monthA && a.monthName) {
          monthA = MONTH_ORDER.findIndex(m => m.toLowerCase() === String(a.monthName).toLowerCase()) + 1;
        }
        let monthB = Number(b.month) || 0;
        if (!monthB && b.monthName) {
          monthB = MONTH_ORDER.findIndex(m => m.toLowerCase() === String(b.monthName).toLowerCase()) + 1;
        }
        if (yearA !== yearB) {
          return sortAscending ? yearA - yearB : yearB - yearA;
        }
        return sortAscending ? monthA - monthB : monthB - monthA;
      })
      .map(report => {
        return {
          month: formatPeriodShort(report.monthName || report.month, report.year),
          points: pf(report, 'totalEarningsOfPoints','total_earnings_of_points','totalPoints','total_points','points'),
          live_duration: getLiveHoursForReport(report)
        };
      });

    if (chartData.length === 0) return null;

    return (
      <div className={cn("space-y-4 bg-[#1A1A28]/50 border-2 p-5 rounded-2xl transition-all duration-300", styles.borderColor, styles.shadow)}>
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#A09E9A] font-outfit">Earnings &amp; Duration Trend</h4>
          <div className="flex gap-3 text-[8px] font-bold">
            <span className="text-[#D4AF37] uppercase">● Points</span>
            <span className="text-[#06b6d4] uppercase">● Live Hours</span>
          </div>
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
                yAxisId="left"
                tick={{ fontSize: 9, fill: '#A09E9A', fontWeight: 'bold' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 9, fill: '#A09E9A', fontWeight: 'bold' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${value.toFixed(0)}h`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#13131E', borderColor: '#ffffff20', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}
                itemStyle={{ color: '#F0EFE8' }}
                labelStyle={{ color: '#D4AF37', marginBottom: '4px' }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="points" 
                name="Points"
                stroke="#D4AF37" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#13131E', stroke: '#D4AF37', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#D4AF37', stroke: '#F0EFE8', strokeWidth: 2 }}
                animationDuration={1500}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="live_duration" 
                name="Live Duration"
                stroke="#06b6d4" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#13131E', stroke: '#06b6d4', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#06b6d4', stroke: '#F0EFE8', strokeWidth: 2 }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderRandomPK = () => {
    const currentAuth = Storage.getAuthState();
    const isOwnProfile = currentAuth.poppo_id === host.id;
    const userRoleLower = String(currentAuth?.role || '').toLowerCase();
    const isStaffUser = ['manager', 'agent', 'admin', 'head admin', 'director'].includes(userRoleLower);

    return (
      <div className={cn("space-y-3 flex-1 bg-[#1A1A28]/50 border-2 p-4 rounded-2xl transition-all duration-300", styles.borderColor, styles.shadow)}>
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#A09E9A] font-outfit">RANDOM PK PERFORMANCE</h4>
          <div className="px-2.5 py-0.5 text-[8px] font-bold text-[#D4AF37] border border-[#D4AF37]/30 bg-[#D4AF37]/10 rounded-full uppercase tracking-wider">
            PUBLIC SUMMARY
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-2">
          {(isOwnProfile || isStaffUser) && (
            <button 
              onClick={() => setIsRpkFormOpen(true)}
              className="px-3 py-1.5 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              Submit RPK Report
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2.5 bg-[#0D0D14]/40 border border-white/5 p-3 rounded-2xl">
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

        {rpkMetadata && (
          <p className="text-[8px] text-[#A09E9A]/60 italic px-1">
            Last updated: {formatDateStandard(rpkMetadata.lastUpdated)} by {rpkMetadata.updatedBy}
          </p>
        )}
      </div>
    );
  };

  const renderEventExposure = () => {
    const currentAuth = Storage.getAuthState();
    const isOwnProfile = currentAuth.poppo_id === host.id;
    return (
      <div className={cn("space-y-3 bg-[#1A1A28]/50 border-2 p-4 rounded-2xl flex-1 transition-all duration-300", styles.borderColor, styles.shadow)}>
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#A09E9A] font-outfit">Event Exposure (Section 2)</h4>
          <div className="flex items-center gap-2">
            {isOwnProfile && (
              <button
                onClick={() => setIsAddEventFormOpen(true)}
                className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                + Add Event
              </button>
            )}
            <span className="text-[8px] font-bold text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Total: {participatedEvents.length}
            </span>
          </div>
        </div>
        <div className="space-y-2 mt-2 max-h-48 overflow-y-auto custom-scrollbar">
          {participatedEvents.length > 0 ? (
            participatedEvents.map((e, idx) => {
              const eventDate = formatDateStandard(e.eventDate || e.date);
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
  };

  const renderFanbaseBlock = () => {
    const currentAuth = Storage.getAuthState();
    const isOwnProfile = currentAuth.poppo_id === host.id;
    const userRoleLower = String(currentAuth?.role || '').toLowerCase();
    const isStaffUser = ['manager', 'agent', 'admin', 'head admin', 'director'].includes(userRoleLower);

    return (
      <div className={cn("space-y-3 bg-[#1A1A28]/50 border-2 p-4 rounded-2xl transition-all duration-300", styles.borderColor, styles.shadow)}>
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#A09E9A] font-outfit">Fanbase Health</h4>
          <div className="flex items-center gap-2">
            {(isOwnProfile || isStaffUser) && (
              <button 
                onClick={() => setIsFanbaseFormOpen(true)}
                className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Submit Fanbase Report
              </button>
            )}
            {fanbaseLatest?.timestamp && (
              <span className="text-[8px] font-bold text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {formatDateStandard(fanbaseLatest.timestamp)}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-[#1A1A28]/50 border border-white/5 p-3 rounded-2xl">
          {[
            { label: 'Followers', value: fanbaseLatest?.total_followers != null ? formatNumber(fanbaseLatest.total_followers) : '—', color: 'text-[#D4AF37]' },
            { label: 'FC Subscribers', value: fanbaseLatest?.fanclub_subscribers != null ? formatNumber(fanbaseLatest.fanclub_subscribers) : '—', color: 'text-indigo-400' },
            { label: 'GC Members', value: fanbaseLatest?.fanclub_gc_members != null ? formatNumber(fanbaseLatest.fanclub_gc_members) : '—', color: 'text-emerald-400' },
            { 
              label: 'GC Activeness', 
              value: fanbaseLatest && (fanbaseLatest.gc_activity_count_host != null || fanbaseLatest.gc_activity_count_fans != null)
                ? formatNumber(Number(fanbaseLatest.gc_activity_count_host || 0) + Number(fanbaseLatest.gc_activity_count_fans || 0)) 
                : '—', 
              color: 'text-pink-400' 
            },
          ].map((cell, idx) => (
            <div key={idx} className="bg-[#222235]/40 border border-white/5 p-3 rounded-xl flex flex-col justify-between min-h-[78px] hover:border-[#D4AF37]/20 transition-colors">
              <span className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest leading-none">{cell.label}</span>
              <span className={`text-sm font-black tracking-tight mt-2.5 block ${cell.color}`}>{cell.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAIAnalysis = () => {
    const currentAuth = Storage.getAuthState();
    const userRoleLower = String(currentAuth?.role || '').toLowerCase();
    const canGenerateAI = 
      (userRoleLower === 'manager' && String(host.assignedManagerId) === String(currentAuth?.poppo_id)) ||
      (userRoleLower === 'agent' && String(host.assignedManagerId) === String(currentAuth?.poppo_id)) ||
      (userRoleLower === 'head admin') ||
      (userRoleLower === 'head_admin') ||
      (userRoleLower === 'director');

    return (
      <div className={cn("space-y-4 bg-[#1A1A28]/50 border-2 p-4 rounded-2xl transition-all duration-300", styles.borderColor, styles.shadow)}>
        <div className="flex items-center justify-between px-1">
          <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#A09E9A] font-outfit">AI Performance Analysis</h4>
          <span className="text-[8px] font-bold text-[#D4AF37] border border-[#D4AF37]/20 bg-[#D4AF37]/5 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Gemini AI</span>
        </div>

        {/* Generate button (Only visible to managers/admins who can generate) */}
        {!isGeneratingAI && !aiReport && canGenerateAI && (
          <button
            onClick={handleGenerateAI}
            className="w-full py-3.5 rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-r from-[#D4AF37]/10 to-[#D4AF37]/5 text-[#D4AF37] font-black text-xs uppercase tracking-widest hover:from-[#D4AF37]/20 hover:border-[#D4AF37]/50 transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2.5 shadow-lg shadow-[#D4AF37]/5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
            Generate AI Report
          </button>
        )}

        {/* Placeholder if no report exists and user cannot generate one */}
        {!isGeneratingAI && !aiReport && !canGenerateAI && (
          <div className="bg-[#1A1A28]/50 border border-white/5 p-4 rounded-2xl text-center text-[#A09E9A]/40 italic text-xs">
            No AI performance analysis has been posted by management yet.
          </div>
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
            {aiReport.recommendations && aiReport.recommendations.length > 0 && (
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
            
            {/* Post option for draft reports */}
            {canGenerateAI && myRecentAiReport && !myRecentAiReport.isPosted && (
              <button
                onClick={handlePostAiReport}
                disabled={isPostingAiReport}
                className="w-full mt-2 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
              >
                {isPostingAiReport ? <Loader2 size={12} className="animate-spin" /> : null}
                Post Report to Host's Profile
              </button>
            )}

            {/* Posted status badge */}
            {myRecentAiReport?.isPosted && (
              <div className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl text-center">
                ✓ Report Posted to Host's Profile
              </div>
            )}

            {/* Re-generate option (Only visible to managers/admins who can generate) */}
            {canGenerateAI && (
              <button
                onClick={handleGenerateAI}
                className="text-[9px] font-black uppercase tracking-widest text-[#A09E9A]/60 hover:text-[#D4AF37] transition-colors cursor-pointer w-full text-right pr-1"
              >
                ↻ Regenerate Report
              </button>
            )}
          </div>
        )}
      </div>
    );
  };


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

            {isStaffUser && (
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
            )}
            
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

  const renderAddEventModal = () => {
    if (!isAddEventFormOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-[#13131E] border border-white/10 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative">
          <button 
            title="Close"
            onClick={() => setIsAddEventFormOpen(false)}
            className="absolute top-4 right-4 p-1.5 bg-[#1A1A28] border border-white/10 rounded-full text-[#A09E9A] hover:text-[#F0EFE8] cursor-pointer"
          >
            <X size={14} />
          </button>
          
          <h3 className="text-sm font-black uppercase tracking-wider text-[#F0EFE8] mb-1">Add Event Exposure</h3>
          <p className="text-[10px] text-[#A09E9A] mb-4">Registering past event for Host: <span className="text-indigo-400 font-bold">{host.nickname || host.name}</span></p>

          <form onSubmit={handleAddEventSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Event Type</label>
              <select 
                value={eventFormData.eventType}
                onChange={(e) => setEventFormData({...eventFormData, eventType: e.target.value})}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500"
              >
                <option value="Solo Livehouse" className="bg-[#1A1A28]">Solo Livehouse</option>
                <option value="Party Livehouse" className="bg-[#1A1A28]">Party Livehouse</option>
                <option value="Official PK" className="bg-[#1A1A28]">Official PK</option>
                <option value="Agency Event" className="bg-[#1A1A28]">Agency Event</option>
                <option value="Other Event" className="bg-[#1A1A28]">Other Event</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Event Date</label>
              <input 
                type="date" 
                required
                value={eventFormData.eventDate}
                onChange={(e) => setEventFormData({...eventFormData, eventDate: e.target.value})}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Timeslot (e.g. 20:00 - 22:00)</label>
              <input 
                type="text" 
                required
                placeholder="20:00 - 22:00"
                value={eventFormData.timeslot}
                onChange={(e) => setEventFormData({...eventFormData, timeslot: e.target.value})}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Description</label>
              <textarea 
                required
                placeholder="Event description..."
                rows={3}
                value={eventFormData.description}
                onChange={(e) => setEventFormData({...eventFormData, description: e.target.value})}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <button 
              type="submit"
              disabled={isSubmittingEvent}
              className="w-full mt-2 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmittingEvent ? 'Submitting...' : 'Register Event'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  const generateCategorizedInsights = () => {
    const { trend, pct } = trendData;
    const sorted = [...performanceReports].sort((a, b) => {
      const yearA = Number(a.year) || 0;
      const yearB = Number(b.year) || 0;
      if (yearA !== yearB) return yearB - yearA;
      return (Number(b.month) || 0) - (Number(a.month) || 0);
    });

    const latestReport = sorted[0];
    const latestPoints = latestReport ? pf(latestReport, 'totalEarningsOfPoints', 'total_earnings_of_points', 'totalPoints', 'total_points', 'points') : 0;
    const latestHours = latestReport ? getLiveHoursForReport(latestReport) : 0;

    // 1. General Summary & Recommendation
    let general = `The host shows a ${trend.toLowerCase()} trend. `;
    if (latestReport) {
      general += `During the last tracked month (${formatPeriodShort(latestReport.monthName || latestReport.month, latestReport.year)}), they achieved ${latestPoints.toLocaleString()} points over ${latestHours.toFixed(1)} live hours. `;
      if (trend === 'Growing') {
        general += `Performance is up ${pct}% vs. the 3-month rolling average. Recommendation: Maintain current streaming schedules and coordinate milestone PK battles to capture higher viewer volume.`;
      } else if (trend === 'Declining') {
        general += `Performance is down ${Math.abs(pct)}% vs. the 3-month average. Recommendation: Schedule emergency alignment sessions with the assigned manager to adjust target goals and optimize livehouse hours.`;
      } else {
        general += `Performance is stable (deviation of ${pct}%). Recommendation: Introduce theme events and new fanbase interactive segments to break the revenue plateau.`;
      }
    } else {
      general += "No performance records available. Recommendation: Upload the initial report to start performance tracking.";
    }

    // 2. Earnings & Duration Analysis
    let earningsDuration = "";
    if (sorted.length >= 2) {
      const latest = sorted[0];
      const prev = sorted[1];
      const latestPoints = pf(latest, 'totalEarningsOfPoints', 'total_earnings_of_points', 'totalPoints', 'total_points', 'points');
      const prevPoints = pf(prev, 'totalEarningsOfPoints', 'total_earnings_of_points', 'totalPoints', 'total_points', 'points');
      const latestHrs = getLiveHoursForReport(latest);
      const prevHrs = getLiveHoursForReport(prev);
      
      const hrsDiff = latestHrs - prevHrs;
      const ptsDiff = latestPoints - prevPoints;

      if (hrsDiff > 0 && ptsDiff > 0) {
        earningsDuration = `Streaming longer has directly translated to higher earnings. By increasing duration by ${hrsDiff.toFixed(1)}h (from ${prevHrs.toFixed(1)}h to ${latestHrs.toFixed(1)}h), the host generated ${ptsDiff.toLocaleString()} more points. This confirms a positive correlation between active hours and viewer support.`;
      } else if (hrsDiff > 0 && ptsDiff <= 0) {
        earningsDuration = `Although streaming hours increased by ${hrsDiff.toFixed(1)}h (to ${latestHrs.toFixed(1)}h), total earnings decreased slightly by ${Math.abs(ptsDiff).toLocaleString()} points. This suggests that while stream volume is high, the host needs to focus on audience engagement or special events during streams to improve hourly efficiency.`;
      } else if (hrsDiff <= 0 && ptsDiff > 0) {
        earningsDuration = `Despite streaming ${Math.abs(hrsDiff).toFixed(1)} fewer hours (down to ${latestHrs.toFixed(1)}h), the host earned ${ptsDiff.toLocaleString()} more points. This indicates extremely high streaming efficiency and stronger viewer support per hour. Scheduling longer sessions could unlock even higher payout brackets.`;
      } else {
        earningsDuration = `Both streaming hours and earnings decreased compared to the previous period. Stream duration dropped by ${Math.abs(hrsDiff).toFixed(1)}h and points dropped by ${Math.abs(ptsDiff).toLocaleString()}. Increasing streaming hours is highly recommended to restore audience momentum and revenue.`;
      }
    } else if (latestReport) {
      const latestPoints = pf(latestReport, 'totalEarningsOfPoints', 'total_earnings_of_points', 'totalPoints', 'total_points', 'points');
      const latestHrs = getLiveHoursForReport(latestReport);
      earningsDuration = `The host currently streams ${latestHrs.toFixed(1)} hours with ${latestPoints.toLocaleString()} points. Maintaining or increasing live hours beyond 40-60h per month is key to building audience consistency and driving point growth.`;
    } else {
      earningsDuration = "No live hours or points records found to analyze.";
    }

    // 3. Earning Diversity Summary
    let diversity = "";
    if (latestReport) {
      const liveEarn = pf(latestReport, 'liveEarnings', 'live_earnings');
      const partyEarn = pf(latestReport, 'partyEarnings', 'party_earnings');
      const reward = pf(latestReport, 'platformReward', 'platform_reward');
      const tips = pf(latestReport, 'tips');
      
      const total = liveEarn + partyEarn + reward + tips;
      if (total > 0) {
        const livePct = Math.round((liveEarn / total) * 100);
        const partyPct = Math.round((partyEarn / total) * 100);
        diversity += `Earnings are composed of ${livePct}% live streaming and ${partyPct}% party room activity. `;
        if (partyEarn > liveEarn) {
          diversity += `Party room hosting is their primary revenue source; boosting solo livehouse events could further balance their portfolio.`;
        } else {
          diversity += `Solo streaming is the main driver. Introducing more party hosting can add a reliable secondary stream.`;
        }
      } else {
        diversity += "Earnings components are at baseline or flat-rate values.";
      }
    } else {
      diversity = "No diversity data available.";
    }

    // 4. PK Performance
    let pk = "";
    if (pkData.sessions > 0) {
      pk += `The host maintains a ${pkData.win_percentage}% win percentage over ${pkData.sessions} sessions this week. `;
      if (pkData.win_percentage >= 70) {
        pk += `This is an excellent competitive rate, showing great supporter activity during random PK matches.`;
      } else if (pkData.win_percentage >= 50) {
        pk += `A solid baseline. Collaborating with other high-ranking anchors during PKs could boost their win rate.`;
      } else {
        pk += `Win rate is below average. It is recommended to schedule PK events with regular gifters to secure more wins.`;
      }
    } else {
      pk = "No active PK session records reported in the current cycle.";
    }

    // 5. Event Exposure
    let event = "";
    if (participatedEvents.length > 0) {
      const latestEvent = participatedEvents[0];
      event += `The host participated in ${participatedEvents.length} events recently. The latest event was "${latestEvent.description || latestEvent.eventType}". `;
      if (participatedEvents.length >= 3) {
        event += `They show great active presence in agency and official livehouse sessions.`;
      } else {
        event += `Increasing event frequency can dramatically improve visibility on the platform's public index.`;
      }
    } else {
      event = "No historical event exposure records found. Enrolling in solo or party livehouses is highly recommended.";
    }

    // 6. Fanbase Health
    let fanbase = "";
    if (fanbaseLatest) {
      const followers = fanbaseLatest.total_followers || 0;
      const subs = fanbaseLatest.fanclub_subscribers || 0;
      const gcMembers = fanbaseLatest.fanclub_gc_members || 0;
      const gcActiveness = (fanbaseLatest.gc_activity_count_host || 0) + (fanbaseLatest.gc_activity_count_fans || 0);

      fanbase += `The host has a fanbase of ${followers.toLocaleString()} followers, ${subs.toLocaleString()} FC subscribers, and ${gcMembers.toLocaleString()} group chat members. `;
      fanbase += `GC Activeness is at ${gcActiveness.toLocaleString()} messages. `;
      if (gcActiveness > 100) {
        fanbase += `This indicates a highly active and engaged community space.`;
      } else {
        fanbase += `Audience engagement is low; regular chat prompts from the host could activate the group.`;
      }
    } else {
      fanbase = "No active fanbase health stats found.";
    }

    return { general, earningsDuration, diversity, pk, event, fanbase };
  };

  const renderTrendBadge = () => {
    if (performanceReports.length === 0) return null;
    const { trend, pct } = trendData;
    const cfg: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; label: string }> = {
      Growing:   { icon: <TrendingUp size={16} />,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: `+${pct}% vs 3-mo avg` },
      Declining: { icon: <TrendingDown size={16} />, color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     label: `${pct}% vs 3-mo avg` },
      Stable:    { icon: <Minus size={16} />,        color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   label: `${pct >= 0 ? '+' : ''}${pct}% vs 3-mo avg` },
      New:       { icon: <Star size={16} />,         color: 'text-indigo-400',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/20',  label: 'New host — tracking started' },
    };
    const c = cfg[trend] || cfg.Stable;
    const insights = generateCategorizedInsights();

    return (
      <div className={cn("bg-[#1A1A28] border-2 rounded-2xl p-5 space-y-4 transition-all duration-300", styles.borderColor, styles.shadow)}>
        {/* Header with main badge */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-[#D4AF37]" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#A09E9A] font-outfit">Performance Trend Insights</h4>
          </div>
          <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-wider", c.color, c.bg, c.border)}>
            {c.icon} {trend}
          </div>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* a. General Summary Insight & Recommendation */}
          <div className="bg-[#0D0D14]/40 border border-white/5 rounded-xl p-3 space-y-1">
            <p className="text-[9px] font-black text-[#D4AF37] uppercase tracking-wider">a. General Summary Insight &amp; Recommendation</p>
            <p className="text-[#A09E9A] leading-relaxed font-medium">{insights.general}</p>
          </div>

          {/* b. Earnings & Duration Analysis */}
          <div className="bg-[#0D0D14]/40 border border-white/5 rounded-xl p-3 space-y-1">
            <p className="text-[9px] font-black text-cyan-400 uppercase tracking-wider">b. Earnings &amp; Duration Analysis</p>
            <p className="text-[#A09E9A] leading-relaxed font-medium">{insights.earningsDuration}</p>
          </div>

          {/* c. Earning Diversity Summary */}
          <div className="bg-[#0D0D14]/40 border border-white/5 rounded-xl p-3 space-y-1">
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-wider">c. Earning Diversity Summary</p>
            <p className="text-[#A09E9A] leading-relaxed font-medium">{insights.diversity}</p>
          </div>

          {/* d. PK Performance */}
          <div className="bg-[#0D0D14]/40 border border-white/5 rounded-xl p-3 space-y-1">
            <p className="text-[9px] font-black text-amber-400 uppercase tracking-wider">d. PK Performance</p>
            <p className="text-[#A09E9A] leading-relaxed font-medium">{insights.pk}</p>
          </div>

          {/* e. Event Exposure */}
          <div className="bg-[#0D0D14]/40 border border-white/5 rounded-xl p-3 space-y-1">
            <p className="text-[9px] font-black text-emerald-400 tracking-wider">e. Event Exposure</p>
            <p className="text-[#A09E9A] leading-relaxed font-medium">{insights.event}</p>
          </div>

          {/* f. Fanbase Health */}
          <div className="bg-[#0D0D14]/40 border border-white/5 rounded-xl p-3 space-y-1">
            <p className="text-[9px] font-black text-pink-400 uppercase tracking-wider">f. Fanbase Health</p>
            <p className="text-[#A09E9A] leading-relaxed font-medium">{insights.fanbase}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderConsistencyScore = () => null;

  const renderAwardsBlock = () => {
    if (awards.length === 0) return null;
    const ICON_MAP: Record<string, string> = { trophy: '🏆', star: '⭐', medal: '🥇', crown: '👑', badge: '🎖️' };
    return (
      <div className={cn("bg-[#1A1A28] border-2 rounded-2xl p-4 space-y-3 transition-all duration-300", styles.borderColor, styles.shadow)}>
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
      <div className={cn("bg-[#1A1A28] border-2 rounded-2xl p-4 space-y-3 transition-all duration-300", styles.borderColor, styles.shadow)}>
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
                  <td className="py-2 px-1 text-[9px] text-[#A09E9A] font-mono whitespace-nowrap">{formatDateStandard(w.from_date)} → {formatDateStandard(w.to_date)}</td>
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
      <div className={cn("bg-[#1A1A28] border-2 rounded-2xl p-4 space-y-3 transition-all duration-300", styles.borderColor, styles.shadow)}>
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
                <span className="text-[8px] font-mono text-[#A09E9A]/40 ml-auto">{note.createdAt ? formatDateStandard(note.createdAt) : ''}</span>
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
              {/* Left Column (Identity Details, Bio, Social, Streaming) */}
              <div className="space-y-6 lg:col-span-1">
                {renderIdentityCard()}
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
                {renderTrendBadge()}
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
      {renderAddEventModal()}
    </div>
  );
};

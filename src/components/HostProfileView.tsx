/* eslint-disable */
/* eslint-disable */
import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, ChevronLeft, Edit2, Loader2, Save, Instagram, Twitter, Facebook, TrendingUp, TrendingDown, Minus, ArrowUpDown, Award, MessageSquare, Star, Users, Send, ClipboardList, Trash2, Clock, Plus, CheckCircle2, AlertCircle, Briefcase, ListTodo, Activity, Search, RefreshCw } from 'lucide-react';
import { Host, CommissionEntry, CalendarEvent, Task, AwardBadge, AwardAssignment } from '../types';
import { FirebaseService, generateSubmissionId } from '../lib/firebaseService';
import { Storage } from '../lib/storage';
import { cn, formatNumber } from '../lib/utils';
import { MANAGERS, BASE_SALARY_POLICIES } from '../lib/constants';
import { collection, query, where, getDocs, Timestamp, documentId, doc, setDoc, addDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ComposedChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts';
import { SingleDatePicker, DateRangePicker } from './InteractiveDatePicker';

import { BadgeAndTaskControlPanel } from './BadgeAndTaskControlPanel';
interface HostProfileViewProps {
  host: Host;
  isReadOnly?: boolean;
  onClose?: () => void;
  onProfileUpdated?: () => void;
  hidePerformanceStats?: boolean;
}

// Helper to determine live hours from report safely
const getLiveHoursForReport = (r: any): number => {
  const mins = r.liveDurationMinutes ?? r.live_duration_minutes;
  if (mins !== undefined && mins !== null && mins !== '') return Number(mins) / 60;
  const hrs = r.liveDuration ?? r.live_duration ?? r.live_hours ?? r.liveHours;
  if (hrs !== undefined && hrs !== null && hrs !== '') return Number(hrs);
  return 0;
};

// Helper to abbreviate month names in award titles
const abbreviateMonths = (text: string): string => {
  if (!text) return '';
  const monthReplacements: Record<string, string> = {
    'JANUARY': 'JAN',
    'FEBRUARY': 'FEB',
    'MARCH': 'MAR',
    'APRIL': 'APR',
    'MAY': 'MAY',
    'JUNE': 'JUN',
    'JULY': 'JUL',
    'AUGUST': 'AUG',
    'SEPTEMBER': 'SEP',
    'OCTOBER': 'OCT',
    'NOVEMBER': 'NOV',
    'DECEMBER': 'DEC'
  };
  let result = text.toUpperCase();
  for (const [full, short] of Object.entries(monthReplacements)) {
    result = result.replace(new RegExp(`\\b${full}\\b`, 'g'), short);
  }
  return result;
};

const getIsLastMonth = (startDateStr: string, endDateStr: string): boolean => {
  if (!startDateStr || !endDateStr) return false;
  try {
    const today = new Date();
    let lastMonthYear = today.getFullYear();
    let lastMonthIndex = today.getMonth() - 1;
    if (lastMonthIndex < 0) {
      lastMonthIndex = 11;
      lastMonthYear -= 1;
    }

    const startParts = startDateStr.split('-');
    const endParts = endDateStr.split('-');
    if (startParts.length < 3 || endParts.length < 3) return false;

    const startYear = parseInt(startParts[0], 10);
    const startMonth = parseInt(startParts[1], 10) - 1;

    const endYear = parseInt(endParts[0], 10);
    const endMonth = parseInt(endParts[1], 10) - 1;

    return startYear === lastMonthYear && startMonth === lastMonthIndex &&
      endYear === lastMonthYear && endMonth === lastMonthIndex;
  } catch (e) {
    return false;
  }
};

// Helper to format date and time like "Jun 6/26 7PM"
const formatLogDateAndTime = (dateInput: any, timeInput: string): string => {
  if (!dateInput) return '';
  let year = 26;
  let monthIndex = 5;
  let day = 6;

  try {
    if (typeof dateInput === 'string') {
      const match = dateInput.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const y = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const d = parseInt(match[3], 10);
        year = y % 100;
        monthIndex = m - 1;
        day = d;
      } else {
        const d = new Date(dateInput);
        if (!isNaN(d.getTime())) {
          year = d.getFullYear() % 100;
          monthIndex = d.getMonth();
          day = d.getDate();
        }
      }
    } else if (dateInput?.toDate) {
      const d = dateInput.toDate();
      year = d.getFullYear() % 100;
      monthIndex = d.getMonth();
      day = d.getDate();
    } else if (dateInput?.seconds) {
      const d = new Date(dateInput.seconds * 1000);
      year = d.getFullYear() % 100;
      monthIndex = d.getMonth();
      day = d.getDate();
    } else {
      const d = new Date(dateInput);
      if (!isNaN(d.getTime())) {
        year = d.getFullYear() % 100;
        monthIndex = d.getMonth();
        day = d.getDate();
      }
    }
  } catch (e) {
    // Fallback
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[monthIndex] || 'Jun';

  let formattedTime = '';
  if (timeInput) {
    // Grab first part before '-' or space
    const parts = timeInput.split('-');
    const startPart = (parts[0] || '').trim();

    // Extract hour, minute, and AM/PM
    const matchAMPM = startPart.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m)/i);
    if (matchAMPM) {
      const h = parseInt(matchAMPM[1], 10);
      const mStr = matchAMPM[2]; // minutes if present
      const ampm = matchAMPM[3].toUpperCase();

      if (mStr && mStr !== '00') {
        formattedTime = `${h}:${mStr}${ampm}`;
      } else {
        formattedTime = `${h}${ampm}`;
      }
    } else {
      const match24h = startPart.match(/^(\d{1,2}):(\d{2})/);
      if (match24h) {
        let h = parseInt(match24h[1], 10);
        const mStr = match24h[2];
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12;

        if (mStr && mStr !== '00') {
          formattedTime = `${h}:${mStr}${ampm}`;
        } else {
          formattedTime = `${h}${ampm}`;
        }
      } else {
        formattedTime = startPart.replace(/\s+/g, '').toUpperCase();
      }
    }
  }

  return `${monthName} ${day}/${year}${formattedTime ? ' ' + formattedTime : ''}`;
};

// Helper to format date uniformly (e.g. "Jun 02, 2026")
const formatDateStandard = (dateInput: any): string => {
  if (!dateInput) return '—';
  try {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // First try to parse YYYY-MM-DD string directly to avoid local timezone offset shifting
    if (typeof dateInput === 'string') {
      const clean = dateInput.trim();
      const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const yyyy = parseInt(match[1], 10);
        const mm = parseInt(match[2], 10);
        const dd = parseInt(match[3], 10);
        const monthName = months[mm - 1] || 'Jun';
        const dayStr = String(dd).padStart(2, '0');
        return `${monthName} ${dayStr}, ${yyyy}`;
      }
    }

    let date: Date;
    if (dateInput instanceof Timestamp) {
      date = dateInput.toDate();
    } else if (dateInput?.seconds) {
      date = new Date(dateInput.seconds * 1000);
    } else {
      date = new Date(dateInput);
    }
    if (isNaN(date.getTime())) return '—';

    // Detect if Date object represents UTC midnight date (common for date strings parsed in JS)
    const isUTCDate = date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;

    const day = String(isUTCDate ? date.getUTCDate() : date.getDate()).padStart(2, '0');
    const month = months[isUTCDate ? date.getUTCMonth() : date.getMonth()];
    const year = isUTCDate ? date.getUTCFullYear() : date.getFullYear();
    return `${month} ${day}, ${year}`;
  } catch (e) {
    return '—';
  }
};

const formatUpdateMetaDate = (timestampInput: any): string => {
  if (!timestampInput) return '—';
  try {
    let date: Date;
    if (timestampInput instanceof Timestamp) {
      date = timestampInput.toDate();
    } else if (timestampInput?.seconds) {
      date = new Date(timestampInput.seconds * 1000);
    } else {
      date = new Date(timestampInput);
    }
    if (isNaN(date.getTime())) return '—';
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${mm}/${dd}/${yy} ${hh}:${min}`;
  } catch (e) {
    return '—';
  }
};

const renderCardFooter = (dateInput: any, role?: string, nickname?: string) => {
  if (!dateInput) return null;
  const formattedDate = formatDateStandard(dateInput);
  if (formattedDate === '—') return null;

  const cleanRole = role && role.trim() !== 'Unknown' ? role.trim() : '';
  const cleanNickname = nickname && nickname.trim() !== 'Unknown' ? nickname.trim() : '';

  let userStr = '';
  if (cleanRole && cleanNickname) {
    userStr = ` by ${cleanRole} ${cleanNickname}`;
  } else if (cleanNickname) {
    userStr = ` by ${cleanNickname}`;
  } else if (cleanRole) {
    userStr = ` by ${cleanRole}`;
  }

  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5 w-full">
      <p className="text-[9px] text-[#A09E9A]/60 italic font-medium">
        Last Updated on {formattedDate}{userStr}
      </p>
    </div>
  );
};

const formatDateYYYYMMDD = (dateInput: any): string => {
  if (!dateInput) return '—';
  try {
    // First try to parse YYYY-MM-DD string directly to avoid local timezone offset shifting
    if (typeof dateInput === 'string') {
      const clean = dateInput.trim();
      const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return `${match[1]}-${match[2]}-${match[3]}`;
      }
    }

    let date: Date;
    if (dateInput?.seconds) {
      date = new Date(dateInput.seconds * 1000);
    } else if (dateInput?.toDate) {
      date = dateInput.toDate();
    } else {
      date = new Date(dateInput);
    }
    if (isNaN(date.getTime())) return String(dateInput);

    const isUTCDate = date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;

    const yyyy = isUTCDate ? date.getUTCFullYear() : date.getFullYear();
    const mm = String((isUTCDate ? date.getUTCMonth() : date.getMonth()) + 1).padStart(2, '0');
    const dd = String(isUTCDate ? date.getUTCDate() : date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch (e) {
    return String(dateInput);
  }
};

const formatDateMMDDYYYY = (dateInput: any): string => {
  if (!dateInput) return '—';
  try {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // First try to parse YYYY-MM-DD string directly to avoid local timezone offset shifting
    if (typeof dateInput === 'string') {
      const clean = dateInput.trim();
      const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const yyyy = parseInt(match[1], 10);
        const mm = parseInt(match[2], 10);
        const dd = parseInt(match[3], 10);
        const monthName = months[mm - 1] || 'Jun';
        const dayStr = String(dd).padStart(2, '0');
        return `${monthName} ${dayStr} - ${yyyy}`;
      }
    }

    let date: Date;
    if (dateInput?.seconds) {
      date = new Date(dateInput.seconds * 1000);
    } else if (dateInput?.toDate) {
      date = dateInput.toDate();
    } else {
      date = new Date(dateInput);
    }
    if (isNaN(date.getTime())) return String(dateInput);

    const isUTCDate = date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;

    const yyyy = isUTCDate ? date.getUTCFullYear() : date.getFullYear();
    const mm = (isUTCDate ? date.getUTCMonth() : date.getMonth()) + 1;
    const dd = isUTCDate ? date.getUTCDate() : date.getDate();

    const monthName = months[mm - 1] || 'Jun';
    const dayStr = String(dd).padStart(2, '0');
    return `${monthName} ${dayStr} - ${yyyy}`;
  } catch (e) {
    return String(dateInput);
  }
};

const formatTimeslot = (timeStr: string) => {
  if (!timeStr) return 'TBA Manila Time';
  const clean = timeStr.trim();

  // Extract time part and strip/ignore any existing timezone string to avoid duplicates or misformatting
  let timePart = clean;
  const tzMatch = clean.match(/\s*(pht|pst|gmt|utc|est|philippine|manila.*)$/i);
  if (tzMatch) {
    timePart = clean.substring(0, tzMatch.index).trim();
  }

  let formattedTime = timePart;
  const ampmMatch = timePart.match(/^(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)/i);
  if (ampmMatch) {
    const hours = parseInt(ampmMatch[1], 10);
    const minutes = ampmMatch[2];
    const ampm = ampmMatch[3].toUpperCase().replace(/\./g, '');
    const hoursStr = String(hours).padStart(2, '0');
    formattedTime = `${hoursStr}:${minutes} ${ampm}`;
  } else {
    const match = timePart.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const hoursStr = String(hours).padStart(2, '0');
      formattedTime = `${hoursStr}:${minutes} ${ampm}`;
    }
  }

  return `${formattedTime} Manila Time`;
};

const convertManilaToLocal = (dateInput: any, timeStr: string): Date | null => {
  try {
    if (!dateInput) return null;
    let baseDateStr = '';

    // First try to parse YYYY-MM-DD string directly to avoid local timezone offset shifting
    if (typeof dateInput === 'string') {
      const cleanInput = dateInput.trim();
      const match = cleanInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        baseDateStr = `${match[1]}-${match[2]}-${match[3]}`;
      }
    }

    if (!baseDateStr) {
      let date: Date;
      if (dateInput?.seconds) {
        date = new Date(dateInput.seconds * 1000);
      } else if (typeof dateInput?.toDate === 'function') {
        date = dateInput.toDate();
      } else {
        date = new Date(dateInput);
      }

      if (!isNaN(date.getTime())) {
        const isUTCDate = date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;
        const yyyy = isUTCDate ? date.getUTCFullYear() : date.getFullYear();
        const mm = String((isUTCDate ? date.getUTCMonth() : date.getMonth()) + 1).padStart(2, '0');
        const dd = String(isUTCDate ? date.getUTCDate() : date.getDate()).padStart(2, '0');
        baseDateStr = `${yyyy}-${mm}-${dd}`;
      } else {
        return null;
      }
    }

    let hour = 19; // Default to 7:00 PM if parsing fails
    let min = 0;

    if (timeStr) {
      const clean = timeStr.trim();
      let timePart = clean;
      const tzMatch = clean.match(/\s*(pht|pst|gmt|utc|est|philippine|manila.*)$/i);
      if (tzMatch) {
        timePart = clean.substring(0, tzMatch.index).trim();
      }

      const ampmMatch = timePart.match(/^(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)/i);
      if (ampmMatch) {
        let h = parseInt(ampmMatch[1], 10);
        const m = parseInt(ampmMatch[2], 10);
        const ampm = ampmMatch[3].toUpperCase().replace(/\./g, '');
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        hour = h;
        min = m;
      } else {
        const match = timePart.match(/^(\d{1,2}):(\d{2})/);
        if (match) {
          hour = parseInt(match[1], 10);
          min = parseInt(match[2], 10);
        }
      }
    }

    const hourStr = String(hour).padStart(2, '0');
    const minStr = String(min).padStart(2, '0');
    const isoString = `${baseDateStr}T${hourStr}:${minStr}:00+08:00`;
    const localDate = new Date(isoString);
    if (isNaN(localDate.getTime())) return null;
    return localDate;
  } catch (e) {
    return null;
  }
};

const formatToLocalTimezone = (date: Date): string => {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, '0');

  let tzAbbr = '';
  try {
    const tzName = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
      .formatToParts(date)
      .find(p => p.type === 'timeZoneName')?.value;
    if (tzName) tzAbbr = tzName;
  } catch (e) { }

  if (!tzAbbr) {
    const offset = date.getTimezoneOffset();
    const absOffset = Math.abs(offset);
    const sign = offset <= 0 ? '+' : '-';
    const hrs = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const mins = String(absOffset % 60).padStart(2, '0');
    tzAbbr = `UTC${sign}${hrs}:${mins}`;
  }

  return `Local Time: ${mm}-${dd}-${yyyy} • ${hoursStr}:${minutes} ${ampm} (${tzAbbr})`;
};

const getSocialLink = (type: string, url?: string): string | null => {
  if (!url || String(url).trim() === '') return null;
  const trimmed = String(url).trim();
  if (type === 'instagram') {
    return trimmed.startsWith('http') ? trimmed : `https://instagram.com/${trimmed.replace('@', '')}`;
  }
  if (type === 'tiktok') {
    return trimmed.startsWith('http') ? trimmed : `https://tiktok.com/@${trimmed.replace('@', '')}`;
  }
  if (type === 'facebook') {
    return trimmed.startsWith('http') ? trimmed : `https://facebook.com/${trimmed}`;
  }
  if (type === 'whatsapp') {
    const phone = trimmed.replace(/[^0-9+]/g, '');
    return phone.startsWith('+') ? `https://wa.me/${phone.replace('+', '')}` : `https://wa.me/${phone}`;
  }
  return null;
};

const MONTH_ORDER = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
  onProfileUpdated,
  hidePerformanceStats = false
}) => {
  const rootAuth = Storage.getAuthState();
  const managerPoppoId = String(rootAuth?.poppo_id || rootAuth?.poppoId || rootAuth?.id || '');
  const [toasts, setToasts] = useState<{ id: number; type: 'success' | 'error'; message: string }[]>([]);
  const [toastIdCounter, setToastIdCounter] = useState(0);
  const [assignedHostsList, setAssignedHostsList] = useState<any[]>([]);
  const [isLoadingAssignedHosts, setIsLoadingAssignedHosts] = useState(false);
  const [spotlightHost, setSpotlightHost] = useState<Host | null>(null);
  const [adminLogsPage, setAdminLogsPage] = useState(1);

  // States for Badge & Task Assignment
  const [opsHosts, setOpsHosts] = useState<Host[]>([]);
  const [opsTasks, setOpsTasks] = useState<Task[]>([]);
  const [opsAwards, setOpsAwards] = useState<AwardBadge[]>([]);
  const [opsAwardAssignments, setOpsAwardAssignments] = useState<AwardAssignment[]>([]);
  const [isOpsLoading, setIsOpsLoading] = useState(false);
  const [opsErrorMessage, setOpsErrorMessage] = useState<string | null>(null);
  const [opsSuccessMessage, setOpsSuccessMessage] = useState('');

  // Task form states
  const [taskDueDateVal, setTaskDueDateVal] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Award form states
  const [newAwardName, setNewAwardName] = useState('');
  const [newAwardColor, setNewAwardColor] = useState('Gold');
  const [newAwardStartDate, setNewAwardStartDate] = useState('');
  const [newAwardEndDate, setNewAwardEndDate] = useState('');
  const [isCreatingAward, setIsCreatingAward] = useState(false);
  const [awardCreateMode, setAwardCreateMode] = useState<'single' | 'bulk'>('single');
  const [bulkMonth, setBulkMonth] = useState('06');
  const [bulkYear, setBulkYear] = useState('2026');

  const [assignAwardId, setAssignAwardId] = useState('');
  const [assignHostId, setAssignHostId] = useState('');
  const [assignRoleFilter, setAssignRoleFilter] = useState('All');
  const [awardStartDate, setAwardStartDate] = useState('');
  const [awardEndDate, setAwardEndDate] = useState('');
  const [isAssigningAward, setIsAssigningAward] = useState(false);

  const loggedInUserRole = String(rootAuth?.role || '').toLowerCase();
  const isDirectorOrHeadAdmin = loggedInUserRole === 'director' || loggedInUserRole === 'head admin' || loggedInUserRole === 'head_admin';

  // Inherit dates when selecting an award to assign
  useEffect(() => {
    if (assignAwardId) {
      const match = opsAwards.find(a => a.id === assignAwardId);
      if (match) {
        setAwardStartDate(match.startDate || '');
        setAwardEndDate(match.endDate || '');
      }
    } else {
      setAwardStartDate('');
      setAwardEndDate('');
    }
  }, [assignAwardId, opsAwards]);

  const loadOpsData = async () => {
    if (!isDirectorOrHeadAdmin || onClose) return;
    setIsOpsLoading(true);
    try {
      const [h, t, a, aa] = await Promise.all([
        FirebaseService.getHosts(),
        FirebaseService.getTasks(),
        FirebaseService.getAwards(),
        FirebaseService.getAwardAssignments()
      ]);
      setOpsHosts(h);
      setOpsTasks(t);
      setOpsAwards(a);
      setOpsAwardAssignments(aa);
    } catch (err) {
      console.error(err);
      setOpsErrorMessage("Failed to load badge & task data.");
    } finally {
      setIsOpsLoading(false);
    }
  };

  useEffect(() => {
    if (isDirectorOrHeadAdmin && !onClose) {
      loadOpsData();
    }
  }, [onClose]);

  const showOpsSuccess = (msg: string) => {
    setOpsSuccessMessage(msg);
    setTimeout(() => setOpsSuccessMessage(''), 4000);
  };

  const auditOpsLogAction = async (actionType: string, beforeValue: any, afterValue: any) => {
    try {
      let systemDescription = `Administrative action performed: ${actionType}`;
      await FirebaseService.logSystemActivity(systemDescription, 'Info');
    } catch (err) {
      console.error("Audit log failed", err);
    }
  };

  // Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskDescription || !taskDueDateVal) return;
    setIsSubmittingTask(true);

    const newTask: Task = {
      taskId: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      assignedToUserId: 'agency_wide', // Defaulting for simple task form
      relatedPoppoId: '',
      taskType: 'Operational',
      title: taskTitle,
      description: taskDescription,
      status: 'Assigned',
      dueDate: taskDueDateVal
    };

    try {
      await FirebaseService.saveTasks([newTask]);
      await auditOpsLogAction('CREATE_TASK', null, newTask);
      showOpsSuccess('Task assigned to agency queue.');
      setTaskTitle('');
      setTaskDescription('');
      loadOpsData();
    } catch (err: any) {
      setOpsErrorMessage("Failed to delegate task: " + (err.message || String(err)));
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // Delete Task
  const handleDirectorDeleteTask = async (taskId: string) => {
    if (!confirm('Hard delete this task assignment?')) return;
    try {
      await FirebaseService.deleteTask(taskId);
      showOpsSuccess('Task removed.');
      loadOpsData();
    } catch (err: any) {
      setOpsErrorMessage("Failed to delete task: " + (err.message || String(err)));
    }
  };

  // Create Award template
  const handleCreateAward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAwardName || !newAwardStartDate || !newAwardEndDate) return;
    setIsCreatingAward(true);
    try {
      const awardId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      const award: AwardBadge = {
        id: awardId,
        name: newAwardName,
        color: newAwardColor,
        startDate: newAwardStartDate,
        endDate: newAwardEndDate,
        createdAt: new Date().toISOString()
      };
      await FirebaseService.saveAwards([award]);
      showOpsSuccess('Custom award tag created.');
      setNewAwardName('');
      setNewAwardStartDate('');
      setNewAwardEndDate('');
      loadOpsData();
    } catch (err: any) {
      setOpsErrorMessage('Failed to create award: ' + (err.message || String(err)));
    } finally {
      setIsCreatingAward(false);
    }
  };

  // Bulk Generate Awards
  const handleBulkGenerateAwards = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkMonth || !bulkYear) return;
    setIsCreatingAward(true);
    try {
      const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      const monthIndex = parseInt(bulkMonth, 10) - 1;
      const monthName = months[monthIndex];
      const yearNum = parseInt(bulkYear, 10);

      // Compute start and end dates
      const pad = (n: number) => String(n).padStart(2, '0');
      const startDateStr = `${yearNum}-${pad(bulkMonth)}-01`;

      const lastDay = new Date(yearNum, monthIndex + 1, 0).getDate();
      const endDateStr = `${yearNum}-${pad(bulkMonth)}-${pad(lastDay)}`;

      const newAwardsList: AwardBadge[] = [];

      for (let rank = 1; rank <= 9; rank++) {
        const awardId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

        let color = 'Gold';
        if (rank >= 4 && rank <= 6) color = 'Orange';
        else if (rank >= 7) color = 'Red';

        const newAward: AwardBadge = {
          id: awardId,
          name: `Top ${rank} Niner - ${monthName} ${bulkYear}`,
          color,
          startDate: startDateStr,
          endDate: endDateStr,
          createdAt: new Date().toISOString()
        };

        newAwardsList.push(newAward);
      }

      await FirebaseService.saveAwards(newAwardsList);
      await FirebaseService.logSystemActivity(`Director/Admin bulk generated Monthly Top Niners awards templates for ${monthName} ${bulkYear}`, 'Info');

      showOpsSuccess(`Successfully generated 9 Monthly Top Niner awards for ${monthName} ${bulkYear}!`);
      loadOpsData();
    } catch (err: any) {
      setOpsErrorMessage('Failed to bulk generate awards: ' + (err.message || String(err)));
    } finally {
      setIsCreatingAward(false);
    }
  };

  // Assign Award
  const handleAssignAward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignAwardId || !assignHostId || !awardStartDate || !awardEndDate) return;
    setIsAssigningAward(true);
    try {
      const award = opsAwards.find(a => a.id === assignAwardId);
      const hostUser = opsHosts.find(h => h.id === assignHostId);
      if (!award || !hostUser) throw new Error('Invalid selection');

      const assignmentId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      const assignment: AwardAssignment = {
        id: assignmentId,
        awardId: award.id,
        awardName: award.name,
        awardColor: award.color,
        hostId: hostUser.id,
        hostNickname: hostUser.nickname || hostUser.name,
        startDate: awardStartDate,
        endDate: awardEndDate,
        assignedAt: new Date().toISOString()
      };
      await FirebaseService.saveAwardAssignments([assignment]);
      showOpsSuccess('Award tag assigned to member.');
      setAssignHostId('');
      loadOpsData();
    } catch (err: any) {
      setOpsErrorMessage('Failed to assign award: ' + (err.message || String(err)));
    } finally {
      setIsAssigningAward(false);
    }
  };

  // Revoke Assignment
  const handleRevokeAssignment = async (id: string) => {
    if (!confirm('Revoke this award tag assignment?')) return;
    try {
      await FirebaseService.deleteAwardAssignment(id);
      showOpsSuccess('Award tag revoked.');
      loadOpsData();
    } catch (err: any) {
      setOpsErrorMessage('Failed to revoke award: ' + (err.message || String(err)));
    }
  };

  const filteredAssignHosts = useMemo(() => {
    return opsHosts.filter(h => {
      const roleLower = String(h.role || '').toLowerCase().replace('_', ' ');
      if (roleLower === 'director') return false;

      if (assignRoleFilter === 'All') return true;
      if (assignRoleFilter === 'Host' && (roleLower === 'host' || roleLower === 'talent')) return true;
      const filterRoleLower = assignRoleFilter.toLowerCase().replace('_', ' ');
      return roleLower === filterRoleLower;
    });
  }, [opsHosts, assignRoleFilter]);

  // Intake Request States
  const [intakePoppoId, setIntakePoppoId] = useState('');
  const [intakeNickname, setIntakeNickname] = useState('');
  const [intakeSuccess, setIntakeSuccess] = useState('');
  const [intakeError, setIntakeError] = useState('');
  const [isSubmittingIntake, setIsSubmittingIntake] = useState(false);

  // Progress Notes States
  const [noteHostId, setNoteHostId] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [notesHistory, setNotesHistory] = useState<any[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState('');
  const [noteError, setNoteError] = useState('');
  const [activeTab, setActiveTab] = useState<'todo' | 'add' | 'history'>('todo');
  const [todoList, setTodoList] = useState<any[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoHostId, setNewTodoHostId] = useState('');
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [recSelectedHosts, setRecSelectedHosts] = useState<Record<string, string>>({});

  const showToast = (type: 'success' | 'error', message: string) => {
    const id = toastIdCounter;
    setToastIdCounter(prev => prev + 1);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // User Impersonation States
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [impersonationSearch, setImpersonationSearch] = useState('');
  const [selectedImpersonationUser, setSelectedImpersonationUser] = useState<any | null>(null);
  const [isImpersonateDropdownOpen, setIsImpersonateDropdownOpen] = useState(false);

  // --- ROSTER MANAGEMENT PANEL STATES ---
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');
  const [rosterSearchResults, setRosterSearchResults] = useState<any[]>([]);
  const [isSearchingRoster, setIsSearchingRoster] = useState(false);
  const [selectedRosterUser, setSelectedRosterUser] = useState<any | null>(null);
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [rosterEditableFields, setRosterEditableFields] = useState<any>({});
  const [rosterHostSearchQuery, setRosterHostSearchQuery] = useState('');
  const [rosterHostSearchResults, setRosterHostSearchResults] = useState<any[]>([]);
  const [isSavingRoster, setIsSavingRoster] = useState(false);
  const [isResettingLogin, setIsResettingLogin] = useState(false);
  const [isRosterPushModalOpen, setIsRosterPushModalOpen] = useState(false);
  const [rosterPushTitle, setRosterPushTitle] = useState('');
  const [rosterPushBody, setRosterPushBody] = useState('');
  const [rosterPushUrl, setRosterPushUrl] = useState('');
  const [isSendingRosterPush, setIsSendingRosterPush] = useState(false);

  // Admin Fanbase Report Form States
  const [fanReportHostId, setFanReportHostId] = useState('');
  const [currentFollowers, setCurrentFollowers] = useState('');
  const [fanclubGcMembers, setFanclubGcMembers] = useState('');
  const [fanclubSubscribers, setFanclubSubscribers] = useState('');
  const [gcUpdatesFans, setGcUpdatesFans] = useState('');
  const [gcUpdatesHost, setGcUpdatesHost] = useState('');
  const [fanRangeStart, setFanRangeStart] = useState('');
  const [fanRangeEnd, setFanRangeEnd] = useState('');
  const [isFanProcessing, setIsFanProcessing] = useState(false);
  const [fanErrors, setFanErrors] = useState<string[]>([]);
  const [fanSuccessMsg, setFanSuccessMsg] = useState('');
  const [hostSearchQuery, setHostSearchQuery] = useState('');
  const [selectedHostUser, setSelectedHostUser] = useState<any | null>(null);
  const [isHostDropdownOpen, setIsHostDropdownOpen] = useState(false);

  // Admins Log States
  const [rawFanbase, setRawFanbase] = useState<any[]>([]);
  const [rawAttendance, setRawAttendance] = useState<any[]>([]);
  const [rawCalendar, setRawCalendar] = useState<any[]>([]);

  // Roster Events & Attendance States
  const [rosterEvents, setRosterEvents] = useState<any[]>([]);
  const [rosterAttendance, setRosterAttendance] = useState<any[]>([]);
  const [isLoadingRosterData, setIsLoadingRosterData] = useState(false);

  // Edit target and states
  const [editTargetLogItem, setEditTargetLogItem] = useState<any | null>(null);
  const [logErrors, setLogErrors] = useState<string[]>([]);
  const [logSuccessMsg, setLogSuccessMsg] = useState('');
  const [isLogProcessing, setIsLogProcessing] = useState(false);

  // Edit fanbase report fields
  const [editFollowers, setEditFollowers] = useState('');
  const [editSubscribers, setEditSubscribers] = useState('');
  const [editGcMembers, setEditGcMembers] = useState('');
  const [editGcUpdatesHost, setEditGcUpdatesHost] = useState('');
  const [editGcUpdatesFans, setEditGcUpdatesFans] = useState('');
  const [editRangeStart, setEditRangeStart] = useState('');
  const [editRangeEnd, setEditRangeEnd] = useState('');

  // Edit attendance fields
  const [editEventId, setEditEventId] = useState('');
  const [editEventTitle, setEditEventTitle] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editTimeslot, setEditTimeslot] = useState('');
  const [editAttendees, setEditAttendees] = useState<any[]>([]);
  const [editFeedback, setEditFeedback] = useState('');
  const [editSearch, setEditSearch] = useState('');
  const [editRoleFilter, setEditRoleFilter] = useState('All Roles');

  // Edit calendar fields
  const [editCalTitle, setEditCalTitle] = useState('');
  const [editCalDescription, setEditCalDescription] = useState('');
  const [editCalDate, setEditCalDate] = useState('');
  const [editCalTime, setEditCalTime] = useState('');
  const [editCalType, setEditCalType] = useState('solo livehouse');
  const [editCalLocation, setEditCalLocation] = useState('');
  const [editCalParticipants, setEditCalParticipants] = useState<any[]>([]);
  const [editCalSearch, setEditCalSearch] = useState('');
  const [editCalRoleFilter, setEditCalRoleFilter] = useState('All Roles');

  const filteredHostUsersForSearch = useMemo(() => {
    if (!hostSearchQuery.trim()) return [];
    const q = hostSearchQuery.toLowerCase();
    return allUsers.filter(u => {
      const uRole = String(u.role || '').toLowerCase();
      if (uRole !== 'host' && uRole !== 'talent') return false;

      const id = String(u.poppo_id || u.poppoId || u.id || '');
      const name = String(u.name || '').toLowerCase();
      const nickname = String(u.nickname || '').toLowerCase();

      return id.includes(q) || name.includes(q) || nickname.includes(q);
    });
  }, [allUsers, hostSearchQuery]);

  useEffect(() => {
    const userRoleLower = String(rootAuth?.role || '').toLowerCase();
    const profileRoleLower = String(host.role || '').toLowerCase();
    
    if (
      userRoleLower === 'director' || 
      userRoleLower === 'head admin' ||
      userRoleLower === 'head_admin' ||
      userRoleLower === 'admin' ||
      profileRoleLower === 'head admin' ||
      profileRoleLower === 'head_admin' ||
      profileRoleLower === 'admin'
    ) {
      const fetchAllUsers = async () => {
        try {
          const list = await FirebaseService.getAllRoleMetadata();
          setAllUsers(list || []);
        } catch (err) {
          console.error("Failed to load all users:", err);
        }
      };
      fetchAllUsers();
    }
  }, [host.role, rootAuth?.role]);

  useEffect(() => {
    const profileRoleLower = String(host.role || '').toLowerCase();
    const poppoId = host.poppo_id || host.poppoId || host.id;
    if ((profileRoleLower === 'agent' || profileRoleLower === 'manager') && poppoId) {
      const fetchAssignedHosts = async () => {
        setIsLoadingAssignedHosts(true);
        try {
          const list = await FirebaseService.getAllRoleMetadata();
          const filtered = list.filter(u => {
            const uRole = String(u.role || '').toLowerCase();
            const mgrId = String(u.assigned_manager_poppo_id || u.assignedManagerId || '');
            return (uRole === 'host' || uRole === 'talent') && mgrId === String(poppoId);
          });
          setAssignedHostsList(filtered);
        } catch (err) {
          console.error("Failed to load assigned hosts:", err);
        } finally {
          setIsLoadingAssignedHosts(false);
        }
      };
      fetchAssignedHosts();
    } else {
      setAssignedHostsList([]);
    }
  }, [host.role, host.poppo_id, host.poppoId, host.id]);

  useEffect(() => {
    const profileRoleLower = String(host.role || '').toLowerCase();
    const poppoId = host.poppo_id || host.poppoId || host.id;
    const isManagerOrAgent = profileRoleLower === 'manager' || profileRoleLower === 'agent';

    if (isManagerOrAgent && poppoId && assignedHostsList.length > 0) {
      const fetchRosterData = async () => {
        setIsLoadingRosterData(true);
        try {
          const [calendarSnap, attendanceSnap] = await Promise.all([
            getDocs(collection(db, 'calendar')),
            getDocs(collection(db, 'attendance'))
          ]);

          const calList: any[] = [];
          calendarSnap.forEach(docSnap => {
            calList.push({ id: docSnap.id, ...docSnap.data() });
          });

          const attList: any[] = [];
          attendanceSnap.forEach(docSnap => {
            attList.push({ id: docSnap.id, ...docSnap.data() });
          });

          setRosterEvents(calList);
          setRosterAttendance(attList);
        } catch (err) {
          console.error("Failed to fetch roster events & attendance:", err);
        } finally {
          setIsLoadingRosterData(false);
        }
      };
      fetchRosterData();
    } else {
      setRosterEvents([]);
      setRosterAttendance([]);
    }
  }, [assignedHostsList, host.role, host.poppo_id, host.poppoId, host.id]);

  useEffect(() => {
    const userRoleLower = String(rootAuth?.role || '').toLowerCase();
    const poppoId = rootAuth?.poppo_id || rootAuth?.poppoId || rootAuth?.id;
    const isManagerOrAgent = userRoleLower === 'manager' || userRoleLower === 'agent';

    if (isManagerOrAgent && poppoId) {
      const q = query(
        collection(db, 'todos'),
        where('managerId', '==', String(poppoId))
      );
      const unsub = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        list.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        setTodoList(list);
      }, (err) => {
        console.error("Failed to sync todos:", err);
      });
      return () => unsub();
    } else {
      setTodoList([]);
    }
  }, [rootAuth?.role, rootAuth?.poppo_id, rootAuth?.poppoId, rootAuth?.id]);

  // --- ROSTER MANAGEMENT PANEL HELPERS & MEMOS ---
  const rosterManagerAgentList = useMemo(() => {
    return allUsers.filter(u => {
      const r = String(u.role || '').toLowerCase();
      return r === 'manager' || r === 'agent';
    });
  }, [allUsers]);

  const selectedRosterUserAssignedHosts = useMemo(() => {
    if (!selectedRosterUser) return [];
    const targetId = String(selectedRosterUser.poppo_id || selectedRosterUser.id || '');
    const targetRole = String(selectedRosterUser.role || '').toLowerCase();
    const targetAnchor = String(selectedRosterUser.teamAnchor || selectedRosterUser.team || selectedRosterUser.team_anchor || '').trim().toLowerCase();
    
    // 1. Hosts assigned to this manager/agent
    const directlyAssignedHosts = allUsers.filter(u => {
      const uRole = String(u.role || '').toLowerCase();
      const isHost = uRole === 'host' || uRole === 'talent';
      const mgrId = String(u.assignedManagerId || u.assigned_manager_poppo_id || '').trim();
      return isHost && mgrId === targetId;
    });

    // 2. Special rule: If agent, find any Admin with matching Team Anchor
    const automaticallyAssignedAdmins = (targetRole === 'agent' && targetAnchor) ? allUsers.filter(u => {
      const uRole = String(u.role || '').toLowerCase();
      const isAdmin = uRole === 'admin';
      const uAnchor = String(u.teamAnchor || u.team || u.team_anchor || '').trim().toLowerCase();
      return isAdmin && uAnchor === targetAnchor;
    }) : [];

    // Combine them (make sure unique)
    const combined = [...directlyAssignedHosts];
    automaticallyAssignedAdmins.forEach(admin => {
      const adminId = String(admin.poppo_id || admin.id);
      if (!combined.some(c => String(c.poppo_id || c.id) === adminId)) {
        combined.push(admin);
      }
    });

    return combined;
  }, [allUsers, selectedRosterUser]);

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const authState = Storage.getAuthState();
    const token = authState?.token;
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };
    return fetch(url, { ...options, headers });
  };

  const rosterSearchTimeoutRef = React.useRef<any>(null);
  const rosterSearchAbortControllerRef = React.useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (rosterSearchTimeoutRef.current) clearTimeout(rosterSearchTimeoutRef.current);
      if (rosterSearchAbortControllerRef.current) rosterSearchAbortControllerRef.current.abort();
    };
  }, []);

  const handleRosterSearch = (queryVal: string) => {
    setRosterSearchQuery(queryVal);
  };

  const handleSelectRosterUser = async (user: any, usersList: any[] = allUsers) => {
    setIsRosterLoading(true);
    try {
      const poppoId = String(user.poppo_id || user.id);
      const matchedUser = usersList.find(u => String(u.poppo_id || u.id) === poppoId);
      if (matchedUser) {
        setSelectedRosterUser(matchedUser);
        setRosterEditableFields({
          ...matchedUser,
          nickname: matchedUser.nickname || matchedUser.name || '',
          role: matchedUser.role || 'Host',
          teamAnchor: matchedUser.teamAnchor || matchedUser.team || matchedUser.team_anchor || '',
          tier_pay: matchedUser.tier_pay || matchedUser.tierPay || '',
          status: matchedUser.status || 'Active',
          photoUrl: matchedUser.photoUrl || matchedUser.profile_photo || '',
          assignedManagerId: matchedUser.assignedManagerId || matchedUser.assigned_manager_poppo_id || '',
          assignedManagerName: matchedUser.manager || matchedUser.assigned_manager || ''
        });
        // Clear host search state
        setRosterHostSearchQuery('');
        setRosterHostSearchResults([]);
      } else {
        showToast('error', 'User not found in roster list.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Error selecting user.');
    } finally {
      setIsRosterLoading(false);
    }
  };

  const handleSaveRosterChanges = async () => {
    if (!selectedRosterUser || !rosterEditableFields) return;
    setIsSavingRoster(true);
    try {
      const poppoId = selectedRosterUser.poppo_id;
      const originalRole = selectedRosterUser.role;
      const newRole = rosterEditableFields.role;
      
      // 1. If role changed, call change-role first
      if (String(originalRole).toLowerCase() !== String(newRole).toLowerCase()) {
        const roleRes = await fetchWithAuth('/api/roster-management/change-role', {
          method: 'PATCH',
          body: JSON.stringify({
            poppo_id: poppoId,
            old_role: originalRole,
            new_role: newRole
          })
        });
        if (!roleRes.ok) {
          const errData = await roleRes.json();
          showToast('error', errData.error || 'Failed to change role.');
          setIsSavingRoster(false);
          return;
        }
      }
 
      // 2. Call update for the fields
      const updateRes = await fetchWithAuth('/api/roster-management/update', {
        method: 'PATCH',
        body: JSON.stringify({
          poppo_id: poppoId,
          role: newRole,
          nickname: rosterEditableFields.nickname,
          photoUrl: rosterEditableFields.photoUrl,
          profile_photo: rosterEditableFields.photoUrl,
          status: rosterEditableFields.status,
          teamAnchor: rosterEditableFields.teamAnchor,
          tier_pay: rosterEditableFields.tier_pay,
          assignedManagerId: rosterEditableFields.assignedManagerId,
          manager: rosterEditableFields.assignedManagerName
        })
      });
 
      if (updateRes.ok) {
        showToast('success', 'Roster changes saved successfully.');
        
        // Update local allUsers array instead of refetching from Firestore
        setAllUsers(prev => prev.map(u => {
          if (String(u.poppo_id || u.id) === String(poppoId)) {
            return {
              ...u,
              ...rosterEditableFields,
              role: newRole,
              nickname: rosterEditableFields.nickname,
              teamAnchor: rosterEditableFields.teamAnchor,
              tier_pay: rosterEditableFields.tier_pay,
              status: rosterEditableFields.status,
              photoUrl: rosterEditableFields.photoUrl
            };
          }
          return u;
        }));
        
        // Auto-clear selection
        setSelectedRosterUser(null);
      } else {
        const errData = await updateRes.json();
        showToast('error', errData.error || 'Failed to update user.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Network error saving roster changes.');
    } finally {
      setIsSavingRoster(false);
    }
  };
 
  const handleResetLoginState = async () => {
    if (!selectedRosterUser) return;
    if (!confirm(`Are you sure you want to reset the login state for ${selectedRosterUser.nickname || selectedRosterUser.name || 'this user'}? This will force them to set a new password on their next login.`)) return;
    setIsResettingLogin(true);
    try {
      const poppoId = selectedRosterUser.poppo_id;
      const res = await fetchWithAuth('/api/users/reset-login', {
        method: 'PATCH',
        body: JSON.stringify({
          poppo_id: poppoId,
          is_first_time: true
        })
      });
      if (res.ok) {
        showToast('success', 'Login state reset successful. User must set a new password on next login.');
        
        // Update local allUsers array
        setAllUsers(prev => prev.map(u => {
          if (String(u.poppo_id || u.id) === String(poppoId)) {
            return {
              ...u,
              is_first_time: true,
              is_temp_password: true
            };
          }
          return u;
        }));
 
        // Auto-clear selection
        setSelectedRosterUser(null);
      } else {
        const errData = await res.json();
        showToast('error', errData.error || 'Failed to reset login state.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Network error resetting login state.');
    } finally {
      setIsResettingLogin(false);
    }
  };

  const handleSendPushNotification = async () => {
    if (!selectedRosterUser || !rosterPushTitle || !rosterPushBody) return;
    setIsSendingRosterPush(true);
    try {
      const poppoId = selectedRosterUser.poppo_id;
      
      // Auto-prepend https:// to external links if they don't have it
      let finalUrl = rosterPushUrl ? rosterPushUrl.trim() : '';
      if (finalUrl && !finalUrl.startsWith('/') && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
      }

      const res = await fetchWithAuth('/api/push/send-to-user', {
        method: 'POST',
        body: JSON.stringify({
          poppo_id: poppoId,
          title: rosterPushTitle,
          body: rosterPushBody,
          url: finalUrl || undefined
        })
      });
      if (res.ok) {
        showToast('success', 'Notification sent');
        setIsRosterPushModalOpen(false);
        setRosterPushTitle('');
        setRosterPushBody('');
        setRosterPushUrl('');
      } else {
        const errData = await res.json();
        showToast('error', errData.error || 'Failed to send notification.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Network error sending notification.');
    } finally {
      setIsSendingRosterPush(false);
    }
  };

  const handleSearchHosts = (queryVal: string) => {
    setRosterHostSearchQuery(queryVal);
    if (!queryVal.trim()) {
      setRosterHostSearchResults([]);
      return;
    }
    const q = queryVal.toLowerCase();
    const filtered = allUsers.filter(u => {
      const roleLower = String(u.role || '').toLowerCase();
      const isHost = roleLower === 'host' || roleLower === 'talent';
      if (!isHost) return false;
      
      const poppoId = String(u.poppo_id || u.id || '');
      const nickname = String(u.nickname || u.name || '').toLowerCase();
      const name = String(u.name || '').toLowerCase();
      
      return poppoId.includes(q) || nickname.includes(q) || name.includes(q);
    });
    setRosterHostSearchResults(filtered);
  };

  const handleAssignHostToManager = async (hostId: string) => {
    if (!selectedRosterUser) return;
    try {
      const res = await fetchWithAuth('/api/roster-management/assign-host', {
        method: 'PATCH',
        body: JSON.stringify({
          manager_id: selectedRosterUser.poppo_id,
          host_id: hostId,
          action: 'assign'
        })
      });
      if (res.ok) {
        showToast('success', 'Host successfully assigned.');
        
        // Update the host locally in allUsers
        setAllUsers(prev => prev.map(u => {
          if (String(u.poppo_id || u.id) === String(hostId)) {
            return {
              ...u,
              assignedManagerId: selectedRosterUser.poppo_id,
              assigned_manager_poppo_id: selectedRosterUser.poppo_id,
              manager: selectedRosterUser.nickname || selectedRosterUser.name,
              assigned_manager: selectedRosterUser.nickname || selectedRosterUser.name,
              assigned_manager_nickname: selectedRosterUser.nickname || selectedRosterUser.name
            };
          }
          return u;
        }));
      } else {
        const errData = await res.json();
        showToast('error', errData.error || 'Failed to assign host.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Network error assigning host.');
    }
  };
 
  const handleUnassignHostFromManager = async (hostId: string) => {
    if (!selectedRosterUser) return;
    if (!confirm('Are you sure you want to unassign this host?')) return;
    try {
      const res = await fetchWithAuth('/api/roster-management/assign-host', {
        method: 'PATCH',
        body: JSON.stringify({
          manager_id: selectedRosterUser.poppo_id,
          host_id: hostId,
          action: 'unassign'
        })
      });
      if (res.ok) {
        showToast('success', 'Host successfully unassigned.');
        
        // Update the host locally in allUsers
        setAllUsers(prev => prev.map(u => {
          if (String(u.poppo_id || u.id) === String(hostId)) {
            return {
              ...u,
              assignedManagerId: '',
              assigned_manager_poppo_id: '',
              manager: 'Unassigned',
              assigned_manager: 'Unassigned',
              assigned_manager_nickname: 'Unassigned'
            };
          }
          return u;
        }));
      } else {
        const errData = await res.json();
        showToast('error', errData.error || 'Failed to unassign host.');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Network error unassigning host.');
    }
  };

  const handleRosterPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRosterUser) return;
    
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please upload an image file.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async () => {
      const fileData = reader.result as string;
      try {
        const res = await fetch('/api/upload-profile-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData,
            fileName: `${selectedRosterUser.poppo_id}_${Date.now()}_${file.name}`,
            contentType: file.type
          })
        });
        if (res.ok) {
          const data = await res.json();
          setRosterEditableFields(prev => ({
            ...prev,
            photoUrl: data.url
          }));
          showToast('success', 'Profile photo uploaded. Remember to Save Changes.');
        } else {
          showToast('error', 'Failed to upload image.');
        }
      } catch (err) {
        console.error(err);
        showToast('error', 'Network error uploading image.');
      }
    };
    reader.readAsDataURL(file);
  };

  const renderRosterManagementPanel = () => {
    if (!isDirectorOrHeadAdmin) return null;

    return (
      <div className="glass-card p-6 space-y-6 relative overflow-hidden transition-all duration-300 roster-management-panel">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-3">
          <div className="flex items-center gap-2">
            <Users className="text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]" size={20} />
            <h3 className="font-black text-sm uppercase tracking-widest text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.3)]">
              Roster Management Panel
            </h3>
          </div>
          {selectedRosterUser && (
            <button
              onClick={() => setSelectedRosterUser(null)}
              className="px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#A09E9A] hover:text-[#F0EFE8] border border-white/10 hover:border-[#D4AF37]/45 bg-black/40 rounded-lg transition-all cursor-pointer"
            >
              Clear Selection
            </button>
          )}
        </div>

        {/* Search Section */}
        {!selectedRosterUser ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A09E9A]" size={16} />
              <input
                type="text"
                placeholder="Search roster by Nickname/Name or POPPO ID..."
                className="w-full pl-10 pr-4 py-3 glass-input text-xs focus:border-[#D4AF37]/60"
                value={rosterSearchQuery}
                onChange={(e) => handleRosterSearch(e.target.value)}
              />
            </div>

            {/* Search Results */}
            {filteredRosterSearchResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {filteredRosterSearchResults.map((usr) => (
                  <div
                    key={usr.poppo_id}
                    onClick={() => handleSelectRosterUser(usr)}
                    className="flex items-center gap-3 bg-black/30 border border-[#D4AF37]/20 hover:border-[#D4AF37]/60 p-3 rounded-2xl cursor-pointer hover:bg-black/50 transition-all duration-300 group"
                  >
                    {usr.photoUrl ? (
                      <img src={usr.photoUrl} alt={usr.nickname} className="w-10 h-10 rounded-full object-cover border border-[#D4AF37]/30" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-black/80 to-black border border-[#D4AF37]/30 flex items-center justify-center text-xs font-black text-[#D4AF37]">
                        {usr.nickname ? usr.nickname[0].toUpperCase() : 'U'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <h4 className="text-xs font-bold text-[#F0EFE8] truncate group-hover:text-[#D4AF37] transition-colors">
                        {usr.nickname}
                      </h4>
                      <p className="text-[9px] text-[#A09E9A] font-mono">ID: {usr.poppo_id}</p>
                    </div>
                    <span className="px-2 py-0.5 text-[8px] font-black rounded-full uppercase tracking-widest border border-amber-500/30 text-amber-400 bg-amber-500/10">
                      {usr.role}
                    </span>
                  </div>
                ))}
              </div>
            ) : rosterSearchQuery.trim() ? (
              <p className="text-xs text-[#A09E9A]/60 italic text-center py-4">No matching users found.</p>
            ) : null}
          </div>
        ) : (
          /* Editable Section */
          <div className="space-y-6 text-left">
            {/* User Identity Card */}
            <div className="bg-[#1A140A]/50 border border-[#D4AF37]/20 p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group cursor-pointer shrink-0">
                {rosterEditableFields.photoUrl ? (
                  <img src={rosterEditableFields.photoUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-[#D4AF37]/40 shadow-md" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-black/80 to-black border-2 border-[#D4AF37]/40 flex items-center justify-center text-xl font-black text-[#D4AF37]">
                    {rosterEditableFields.nickname ? rosterEditableFields.nickname[0].toUpperCase() : 'U'}
                  </div>
                )}
                <label className="absolute inset-0 bg-black/75 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[8px] font-black uppercase tracking-widest text-[#D4AF37] transition-opacity cursor-pointer">
                  <span>Change</span>
                  <span>Photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleRosterPhotoUpload} />
                </label>
              </div>

              <div className="text-center sm:text-left flex-1 min-w-0">
                <h4 className="text-sm font-bold text-[#F0EFE8] flex items-center justify-center sm:justify-start gap-2">
                  <span className="truncate">{rosterEditableFields.nickname || 'No Nickname'}</span>
                  <span className="px-2 py-0.5 text-[8px] font-black rounded-full uppercase tracking-widest border border-amber-500/30 text-amber-400 bg-amber-500/10 shrink-0">
                    {selectedRosterUser.role}
                  </span>
                </h4>
                <p className="text-[10px] text-[#A09E9A] font-mono mt-1">Poppo ID: {selectedRosterUser.poppo_id} (Read-only)</p>
              </div>

              {/* Action Buttons: Reset Login & Notification */}
              <div className="flex gap-2 w-full sm:w-auto shrink-0">
                <button
                  onClick={handleResetLoginState}
                  disabled={isResettingLogin}
                  className="flex-1 sm:flex-none px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#D4AF37] border border-[#D4AF37]/30 hover:border-[#D4AF37] bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(212,175,55,0.05)]"
                >
                  {isResettingLogin ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw size={11} />}
                  Reset Login State
                </button>
                <button
                  onClick={() => setIsRosterPushModalOpen(true)}
                  className="flex-1 sm:flex-none px-3 py-2 text-[9px] font-black uppercase tracking-widest text-black bg-[#D4AF37] hover:bg-yellow-400 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 font-bold shadow-[0_0_15px_rgba(212,175,55,0.3)] border-none"
                >
                  <Send size={11} />
                  Send Notification
                </button>
              </div>
            </div>

            {/* Editable Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Field: Nickname */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="editable-nickname" className="text-[9px] font-black uppercase tracking-widest text-[#A09E9A]">Nickname / Name</label>
                <input
                  id="editable-nickname"
                  type="text"
                  className="glass-input text-xs border-[#D4AF37]/30 focus:border-[#D4AF37]/70"
                  value={rosterEditableFields.nickname}
                  onChange={(e) => setRosterEditableFields(prev => ({ ...prev, nickname: e.target.value }))}
                  title="Nickname / Name"
                  placeholder="Nickname / Name"
                />
              </div>

              {/* Field: Role Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="editable-role" className="text-[9px] font-black uppercase tracking-widest text-[#A09E9A]">Role</label>
                <select
                  id="editable-role"
                  className="glass-input text-xs border-[#D4AF37]/30 focus:border-[#D4AF37]/70 bg-black"
                  value={rosterEditableFields.role}
                  onChange={(e) => setRosterEditableFields(prev => ({ ...prev, role: e.target.value }))}
                  title="Role"
                >
                  <option value="Host">Host</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Agent">Agent</option>
                  {loggedInUserRole === 'director' && (
                    <>
                      <option value="Head Admin">Head Admin</option>
                      <option value="Director">Director</option>
                    </>
                  )}
                </select>
              </div>

              {/* Field: Tier Pay Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="editable-tier-pay" className="text-[9px] font-black uppercase tracking-widest text-[#A09E9A]">Tier Pay</label>
                <select
                  id="editable-tier-pay"
                  className="glass-input text-xs border-[#D4AF37]/30 focus:border-[#D4AF37]/70 bg-black"
                  value={rosterEditableFields.tier_pay}
                  onChange={(e) => setRosterEditableFields(prev => ({ ...prev, tier_pay: e.target.value }))}
                  title="Tier Pay"
                >
                  <option value="">Select Tier...</option>
                  <option value="Star Host">Star Host</option>
                  <option value="Rocket Host">Rocket Host</option>
                  <option value="S idol">S idol</option>
                  <option value="Esports">Esports</option>
                  <option value="Regular Host">Regular Host</option>
                </select>
              </div>

              {/* Field: Status Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="editable-status" className="text-[9px] font-black uppercase tracking-widest text-[#A09E9A]">Status</label>
                <select
                  id="editable-status"
                  className="glass-input text-xs border-[#D4AF37]/30 focus:border-[#D4AF37]/70 bg-black"
                  value={rosterEditableFields.status}
                  onChange={(e) => setRosterEditableFields(prev => ({ ...prev, status: e.target.value }))}
                  title="Status"
                >
                  <option value="Active">Active</option>
                  <option value="Intermittent">Intermittent</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Releasing">Releasing</option>
                  <option value="Released">Released</option>
                </select>
              </div>

              {/* Field: Team Anchor */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="editable-team-anchor" className="text-[9px] font-black uppercase tracking-widest text-[#A09E9A]">Team Anchor</label>
                <input
                  id="editable-team-anchor"
                  type="text"
                  className="glass-input text-xs border-[#D4AF37]/30 focus:border-[#D4AF37]/70"
                  value={rosterEditableFields.teamAnchor}
                  onChange={(e) => setRosterEditableFields(prev => ({ ...prev, teamAnchor: e.target.value }))}
                  placeholder="e.g. Alpha, Beta..."
                  title="Team Anchor"
                />
              </div>

              {/* HOST ONLY FIELD: Assigned Manager/Agent Dropdown */}
              {String(rosterEditableFields.role).toLowerCase() === 'host' && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="editable-assigned-manager" className="text-[9px] font-black uppercase tracking-widest text-[#A09E9A]">Assigned Manager / Agent</label>
                  <select
                    id="editable-assigned-manager"
                    className="glass-input text-xs border-[#D4AF37]/30 focus:border-[#D4AF37]/70 bg-black"
                    value={rosterEditableFields.assignedManagerId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      const selMgr = rosterManagerAgentList.find(m => String(m.poppo_id || m.id) === String(selId));
                      setRosterEditableFields(prev => ({
                        ...prev,
                        assignedManagerId: selId,
                        assignedManagerName: selMgr ? (selMgr.nickname || selMgr.name || '') : ''
                      }));
                    }}
                    title="Assigned Manager / Agent"
                  >
                    <option value="">Unassigned</option>
                    {rosterManagerAgentList.map(mgr => (
                      <option key={mgr.poppo_id || mgr.id} value={mgr.poppo_id || mgr.id}>
                        {mgr.nickname || mgr.name} ({mgr.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* MANAGER / AGENT ONLY: Assigned Hosts Management Section */}
            {['manager', 'agent'].includes(String(rosterEditableFields.role).toLowerCase()) && (
              <div className="border-t border-white/5 pt-4 space-y-4">
                <h5 className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">
                  Assigned Hosts Management
                </h5>

                {/* Host Search Box for Assignment */}
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#A09E9A]">Search Host to Assign</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A09E9A]" size={14} />
                    <input
                      type="text"
                      placeholder="Type nickname or Poppo ID of host..."
                      className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-[#F0EFE8]"
                      value={rosterHostSearchQuery}
                      onChange={(e) => handleSearchHosts(e.target.value)}
                    />
                  </div>

                  {/* Host Search Results */}
                  {rosterHostSearchResults.length > 0 && (
                    <div className="bg-black/60 border border-white/5 rounded-xl p-2 max-h-[200px] overflow-y-auto custom-scrollbar space-y-1">
                      {rosterHostSearchResults.map(h => {
                        const isAlreadyAssigned = selectedRosterUserAssignedHosts.some(x => String(x.poppo_id || x.id) === String(h.poppo_id || h.id));
                        return (
                          <div key={h.poppo_id} className="flex items-center justify-between p-2 hover:bg-white/[0.03] rounded-lg transition-colors">
                            <div className="flex items-center gap-2">
                              {h.photoUrl ? (
                                <img src={h.photoUrl} alt="Host" className="w-7 h-7 rounded-full object-cover border border-[#D4AF37]/20" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-black border border-[#D4AF37]/20 flex items-center justify-center text-[10px] font-black text-[#D4AF37]">
                                  {h.nickname ? h.nickname[0].toUpperCase() : 'U'}
                                </div>
                              )}
                              <div className="text-left">
                                <p className="text-xs font-bold text-[#F0EFE8]">{h.nickname}</p>
                                <p className="text-[9px] text-[#A09E9A] font-mono">ID: {h.poppo_id}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleAssignHostToManager(h.poppo_id)}
                              disabled={isAlreadyAssigned}
                              className={cn(
                                "px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border transition-all cursor-pointer",
                                isAlreadyAssigned
                                  ? "text-[#A09E9A]/40 border-white/5 bg-white/[0.01] cursor-not-allowed"
                                  : "text-black bg-[#D4AF37] border-transparent hover:bg-yellow-400 font-bold"
                              )}
                            >
                              {isAlreadyAssigned ? 'Assigned' : 'Assign Host'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Grid of Assigned Hosts */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#A09E9A] block">
                    Assigned Hosts ({selectedRosterUserAssignedHosts.length})
                  </label>
                  {selectedRosterUserAssignedHosts.length === 0 ? (
                    <p className="text-xs text-[#A09E9A]/40 italic py-2">No hosts assigned.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {selectedRosterUserAssignedHosts.map(h => {
                        const isAutofilledAdmin = String(h.role || '').toLowerCase() === 'admin';
                        return (
                          <div key={h.poppo_id} className="relative group bg-black/40 border border-[#D4AF37]/20 hover:border-[#D4AF37]/50 p-2.5 rounded-xl flex flex-col items-center text-center transition-all duration-300">
                            {h.photoUrl ? (
                              <img src={h.photoUrl} alt="Host" className="w-12 h-12 rounded-full object-cover border border-[#D4AF37]/20" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-black border border-[#D4AF37]/20 flex items-center justify-center text-base font-black text-[#D4AF37]">
                                {h.nickname ? h.nickname[0].toUpperCase() : 'U'}
                              </div>
                            )}
                            <span className="text-[10px] font-bold text-[#F0EFE8] mt-1.5 truncate w-full">{h.nickname}</span>
                            <span className="text-[8px] text-[#A09E9A] font-mono mt-0.5">ID: {h.poppo_id}</span>
                            {isAutofilledAdmin && (
                              <span className="mt-1 text-[7px] font-black uppercase tracking-widest text-[#D4AF37] px-1 py-0.5 rounded bg-[#D4AF37]/10 border border-[#D4AF37]/25" title="Automatically assigned admin with matching Team Anchor">
                                Admin Anchor
                              </span>
                            )}
                            
                            {/* Unassign button (hidden for auto-assigned admins) */}
                            {!isAutofilledAdmin && (
                              <button
                                onClick={() => handleUnassignHostFromManager(h.poppo_id)}
                                className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-rose-950/80 text-[#A09E9A] hover:text-rose-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity border border-white/5 hover:border-rose-500/30 cursor-pointer"
                                title="Unassign Host"
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Save / Cancel Buttons */}
            <div className="flex gap-3 justify-end border-t border-white/5 pt-4">
              <button
                onClick={() => setSelectedRosterUser(null)}
                className="px-4 py-2.5 text-xs font-black uppercase tracking-widest text-[#A09E9A] hover:text-[#F0EFE8] border border-white/10 hover:border-[#D4AF37]/45 rounded-xl transition-all cursor-pointer bg-black/20"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRosterChanges}
                disabled={isSavingRoster}
                className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-black bg-[#D4AF37] hover:bg-yellow-400 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 font-bold shadow-[0_0_20px_rgba(212,175,55,0.25)] border-none"
              >
                {isSavingRoster ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save size={14} />}
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Send Notification Modal */}
        {isRosterPushModalOpen && selectedRosterUser && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsRosterPushModalOpen(false)}></div>
            <div className="glass-card w-full max-w-md p-6 relative z-10 space-y-4 text-left send-push-modal">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">
                  Send Push Notification
                </h4>
                <button
                  onClick={() => setIsRosterPushModalOpen(false)}
                  className="w-6 h-6 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-[#A09E9A] hover:text-[#F0EFE8] transition-all cursor-pointer"
                  title="Close"
                >
                  <X size={10} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#A09E9A]">Target User</label>
                  <p className="text-xs font-bold text-[#F0EFE8]">{rosterEditableFields.nickname} (ID: {selectedRosterUser.poppo_id})</p>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#A09E9A]">Title</label>
                  <input
                    type="text"
                    placeholder="Enter notification title..."
                    className="glass-input text-xs border-[#D4AF37]/20 focus:border-[#D4AF37]/50"
                    value={rosterPushTitle}
                    onChange={(e) => setRosterPushTitle(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#A09E9A]">Message Body</label>
                  <textarea
                    placeholder="Type message body here..."
                    className="glass-input text-xs h-20 border-[#D4AF37]/20 focus:border-[#D4AF37]/50 resize-none"
                    value={rosterPushBody}
                    onChange={(e) => setRosterPushBody(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#A09E9A]">Optional Action URL</label>
                  <input
                    type="text"
                    placeholder="e.g. /dashboard or https://..."
                    className="glass-input text-xs border-[#D4AF37]/20 focus:border-[#D4AF37]/50"
                    value={rosterPushUrl}
                    onChange={(e) => setRosterPushUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setIsRosterPushModalOpen(false)}
                  className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#A09E9A] hover:text-[#F0EFE8] border border-white/5 rounded-lg transition-all cursor-pointer bg-black/20"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendPushNotification}
                  disabled={isSendingRosterPush || !rosterPushTitle || !rosterPushBody}
                  className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-black bg-[#D4AF37] hover:bg-yellow-400 disabled:opacity-40 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-bold shadow-[0_0_15px_rgba(212,175,55,0.2)] border-none"
                >
                  {isSendingRosterPush ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send size={10} />}
                  Send Notification
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const userRoleLower = String(rootAuth?.role || '').toLowerCase();
    const managerPoppoId = rootAuth?.poppo_id || rootAuth?.poppoId || rootAuth?.id;
    if (userRoleLower !== 'agent') {
      setIntakeError('Exclusion error: Only Agent accounts are permitted to request host intake.');
      return;
    }
    if (!intakePoppoId.trim() || !intakeNickname.trim()) {
      setIntakeError('Please enter both Poppo ID and Nickname.');
      return;
    }
    setIsSubmittingIntake(true);
    setIntakeError('');
    setIntakeSuccess('');

    try {
      // Check for an existing request first
      const q = query(
        collection(db, 'host_requests'),
        where('poppoId', '==', intakePoppoId.trim())
      );
      const snap = await getDocs(q);
      let existingStatus = '';
      snap.forEach(d => {
        const data = d.data();
        existingStatus = data.status || 'Pending';
      });

      if (existingStatus) {
        const msg = `Intake request has been sent! Status: ${existingStatus}`;
        showToast('success', msg);
        setIntakeSuccess(msg);
        setIntakePoppoId('');
        setIntakeNickname('');
        return;
      }

      // Otherwise create a new request
      const managerName = rootAuth.nickname || rootAuth.name || 'Agent';
      const requestId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      const newRequest = {
        poppoId: intakePoppoId.trim(),
        nickname: intakeNickname.trim(),
        managerId: String(managerPoppoId),
        managerName,
        status: 'Pending',
        timestamp: new Date().toISOString()
      };

      await setDoc(doc(db, 'host_requests', requestId), newRequest);
      await FirebaseService.logSystemActivity(`Agent ${managerName} requested intake for host "${intakeNickname}" (Poppo ID: ${intakePoppoId.trim()})`, 'Info');

      const msg = `Intake request has been sent! Status: Pending`;
      showToast('success', msg);
      setIntakeSuccess(msg);
      setIntakePoppoId('');
      setIntakeNickname('');
    } catch (err: any) {
      console.error('Error submitting intake request:', err);
      setIntakeError(err.message || 'Failed to submit intake request.');
    } finally {
      setIsSubmittingIntake(false);
    }
  };

  // Fetch progress notes when selected host or manager changes
  useEffect(() => {
    const fetchNotesHistory = async () => {
      const managerPoppoId = rootAuth?.poppo_id || rootAuth?.poppoId || rootAuth?.id;
      if (!noteHostId || !managerPoppoId) {
        setNotesHistory([]);
        return;
      }
      setIsLoadingNotes(true);
      try {
        const q = query(
          collection(db, 'notes'),
          where('hostId', '==', noteHostId)
        );
        const snap = await getDocs(q);
        const list: any[] = [];
        snap.forEach((doc) => {
          const data = doc.data();
          if (data.managerId === String(managerPoppoId)) {
            list.push({ id: doc.id, ...data });
          }
        });
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setNotesHistory(list);
      } catch (err) {
        console.error('Error fetching notes history:', err);
      } finally {
        setIsLoadingNotes(false);
      }
    };

    fetchNotesHistory();
  }, [noteHostId, rootAuth?.poppo_id, rootAuth?.poppoId, rootAuth?.id]);

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const managerPoppoId = rootAuth?.poppo_id || rootAuth?.poppoId || rootAuth?.id;
    if (!noteHostId || !noteContent.trim() || !managerPoppoId) {
      setNoteError('Please select a host and enter note content.');
      return;
    }
    setNoteError('');
    setNoteSuccess('');

    const selectedHost = assignedHostsList.find(h => (h.poppo_id || h.poppoId || h.id) === noteHostId);
    const hostNickname = selectedHost ? (selectedHost.nickname || selectedHost.name) : '';

    try {
      const managerName = rootAuth.nickname || rootAuth.name || 'Manager';
      const newNote = {
        hostId: noteHostId,
        hostNickname,
        managerId: String(managerPoppoId),
        managerName,
        content: noteContent,
        timestamp: new Date().toISOString()
      };

      const noteId = generateSubmissionId(String(managerPoppoId), rootAuth?.role || 'Manager', managerName);
      const docRef = doc(db, 'notes', noteId);
      await setDoc(docRef, newNote);
      await FirebaseService.logSystemActivity(`Manager/Agent ${managerName} added coaching feedback note for host "${hostNickname}" (Poppo ID: ${noteHostId})`, 'Info');
      setNoteSuccess('Note successfully saved!');
      setNoteContent('');
      setNotesHistory(prev => [{ id: noteId, ...newNote }, ...prev]);
      setActiveTab('history');
    } catch (err: any) {
      console.error('Error adding note:', err);
      setNoteError(err.message || 'Failed to save note.');
    }
  };

  const handleAddTodo = async (title: string, hostId: string) => {
    const managerPoppoId = rootAuth?.poppo_id || rootAuth?.poppoId || rootAuth?.id;
    if (!title.trim() || !managerPoppoId) return;

    try {
      const selectedHost = assignedHostsList.find(h => String(h.poppo_id || h.poppoId || h.id || '') === String(hostId));
      const hostNickname = selectedHost ? (selectedHost.nickname || selectedHost.name) : 'Roster';
      const todoId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);

      const newTodo = {
        todoId,
        managerId: String(managerPoppoId),
        hostId: hostId || 'roster',
        hostNickname,
        title: title.trim(),
        completed: false,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'todos', todoId), newTodo);
      showToast('success', `Added to-do: "${title}"`);
    } catch (err) {
      console.error("Failed to add todo:", err);
      showToast('error', "Failed to add to-do item.");
    }
  };

  const handleToggleTodo = async (todo: any) => {
    const managerPoppoId = rootAuth?.poppo_id || rootAuth?.poppoId || rootAuth?.id;
    if (!managerPoppoId) return;

    const nextCompleted = !todo.completed;

    try {
      await setDoc(doc(db, 'todos', todo.todoId), {
        ...todo,
        completed: nextCompleted,
        completedAt: nextCompleted ? new Date().toISOString() : null
      });

      if (nextCompleted) {
        const selectedHost = assignedHostsList.find(h => String(h.poppo_id || h.poppoId || h.id || '') === String(todo.hostId));
        const hostNickname = selectedHost ? (selectedHost.nickname || selectedHost.name) : 'Roster';
        const managerName = rootAuth.nickname || rootAuth.name || 'Manager';

        const completionNote = {
          hostId: todo.hostId || 'roster',
          hostNickname,
          managerId: String(managerPoppoId),
          managerName,
          content: `[To-Do Completed] Task: "${todo.title}"`,
          timestamp: new Date().toISOString()
        };

        const noteId = generateSubmissionId(String(managerPoppoId), rootAuth?.role || 'Manager', managerName);
        const docRef = doc(db, 'notes', noteId);
        await setDoc(docRef, completionNote);
        await FirebaseService.logSystemActivity(`Manager/Agent ${managerName} completed task "${todo.title}" for host "${hostNickname}"`, 'Info');

        if (todo.hostId === noteHostId) {
          setNotesHistory(prev => [{ id: noteId, ...completionNote }, ...prev]);
        }
      }

      showToast('success', nextCompleted ? `Completed: "${todo.title}"` : `Reopened: "${todo.title}"`);
    } catch (err) {
      console.error("Failed to toggle todo status:", err);
      showToast('error', "Failed to update task status.");
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    try {
      await deleteDoc(doc(db, 'todos', todoId));
      showToast('success', "To-do item deleted.");
    } catch (err) {
      console.error("Failed to delete todo:", err);
      showToast('error', "Failed to delete to-do item.");
    }
  };

  useEffect(() => {
    const userRoleLower = String(rootAuth?.role || '').toLowerCase();
    const poppoId = rootAuth?.poppo_id || rootAuth?.poppoId || rootAuth?.id;

    if (userRoleLower === 'admin' && poppoId) {
      // 1. Subscribe to fanbase reports
      const qFanbase = query(collection(db, 'fanbase_reports'), where('reporterId', '==', poppoId));
      const unsubFanbase = onSnapshot(qFanbase, (snapshot) => {
        const list = snapshot.docs.map(doc => {
          const data = doc.data();
          const sortDate = data.submittedAt?.toDate ? data.submittedAt.toDate() : new Date(data.timestamp || data.submittedAt || Date.now());
          return {
            id: doc.id,
            logType: 'fanbase',
            sortDate,
            ...data
          };
        });
        setRawFanbase(list);
      });

      // 2. Subscribe to attendance logs
      const qAttendance = query(collection(db, 'attendance'), where('reporterId', '==', poppoId));
      const unsubAttendance = onSnapshot(qAttendance, (snapshot) => {
        const list = snapshot.docs.map(doc => {
          const data = doc.data();
          const sortDate = data.submittedAt?.toDate ? data.submittedAt.toDate() : new Date(data.timestamp || data.submittedAt || Date.now());
          return {
            id: doc.id,
            logType: 'attendance',
            sortDate,
            ...data
          };
        });
        setRawAttendance(list);
      });

      // 3. Subscribe to calendar events
      const qCalendar = query(collection(db, 'calendar'), where('created_by_id', '==', poppoId));
      const unsubCalendar = onSnapshot(qCalendar, (snapshot) => {
        const list = snapshot.docs.map(doc => {
          const data = doc.data();
          let sortDate = new Date();
          if (data.created_at) {
            sortDate = new Date(data.created_at);
          } else if (data.date) {
            sortDate = new Date(data.date);
          }
          return {
            id: doc.id,
            logType: 'calendar',
            sortDate,
            ...data
          };
        });
        setRawCalendar(list);
      });

      return () => {
        unsubFanbase();
        unsubAttendance();
        unsubCalendar();
      };
    }
  }, [rootAuth?.role, rootAuth?.poppo_id, rootAuth?.poppoId, rootAuth?.id]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.impersonation-search-container')) {
        setIsImpersonateDropdownOpen(false);
      }
      if (!target.closest('.host-search-container')) {
        setIsHostDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const filteredSearchUsers = useMemo(() => {
    if (!impersonationSearch.trim()) return [];
    const q = impersonationSearch.toLowerCase();
    return allUsers.filter(u => {
      const id = String(u.poppo_id || u.id || '');
      const name = String(u.name || '').toLowerCase();
      const nickname = String(u.nickname || '').toLowerCase();
      return id.includes(q) || name.includes(q) || nickname.includes(q);
    });
  }, [allUsers, impersonationSearch]);

  const filteredRosterSearchResults = useMemo(() => {
    if (!rosterSearchQuery.trim()) return [];
    const q = rosterSearchQuery.toLowerCase().trim();
    return allUsers
      .filter(u => {
        const role = String(u.role || 'host').toLowerCase();
        if (role === 'director') return false;
        
        const id = String(u.poppo_id || u.id || '');
        const name = String(u.name || '').toLowerCase();
        const nickname = String(u.nickname || '').toLowerCase();
        return id.includes(q) || name.includes(q) || nickname.includes(q);
      })
      .map(u => ({
        poppo_id: u.poppo_id || u.id,
        nickname: u.nickname || u.name || 'Unknown',
        name: u.name || u.nickname || 'Unknown',
        role: u.role || 'Host',
        photoUrl: u.photoUrl || u.profile_photo || ''
      }));
  }, [allUsers, rosterSearchQuery]);

  const handleImpersonate = async () => {
    if (!selectedImpersonationUser) return;
    try {
      await FirebaseService.logSystemActivity(
        `Director "${rootAuth.nickname || rootAuth.name}" started impersonating user "${selectedImpersonationUser.nickname || selectedImpersonationUser.name}" (Poppo ID: ${selectedImpersonationUser.poppo_id || selectedImpersonationUser.id})`,
        'Warning'
      );
    } catch (err) {
      console.error("Failed to log impersonation start:", err);
    }
    Storage.setMockUser({
      role: selectedImpersonationUser.role,
      poppo_id: selectedImpersonationUser.poppo_id || selectedImpersonationUser.id,
      nickname: selectedImpersonationUser.nickname || selectedImpersonationUser.name,
      name: selectedImpersonationUser.name || selectedImpersonationUser.nickname,
    });
    window.location.href = '/dashboard';
  };

  const renderImpersonationBlock = () => {
    return (
      <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 p-5 rounded-3xl transition-all duration-300 hover:border-[#D4AF37]/50 group space-y-4 shadow-[0_0_15px_rgba(212,175,55,0.15)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm shadow-inner">👤</div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8]">User Impersonation</h4>
            <p className="text-[9px] text-[#A09E9A] uppercase tracking-wider mt-0.5 font-bold">Director Control Panel</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="impersonation-search-container relative flex-1">
            <input
              type="text"
              placeholder="Search member by Name, Nickname or Poppo ID..."
              value={impersonationSearch}
              onChange={(e) => {
                setImpersonationSearch(e.target.value);
                setIsImpersonateDropdownOpen(true);
                if (selectedImpersonationUser) {
                  setSelectedImpersonationUser(null);
                }
              }}
              onFocus={() => setIsImpersonateDropdownOpen(true)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500/50 placeholder:text-white/20 transition-all font-medium"
            />
            {isImpersonateDropdownOpen && filteredSearchUsers.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[#11111A]/95 border border-white/10 backdrop-blur-md rounded-xl shadow-2xl z-55 custom-scrollbar p-1">
                {filteredSearchUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      setSelectedImpersonationUser(user);
                      setImpersonationSearch(user.nickname || user.name || user.id);
                      setIsImpersonateDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex justify-between items-center cursor-pointer"
                  >
                    <span className="font-bold">{user.nickname || user.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">ID: {user.poppo_id || user.id} ({user.role})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={!selectedImpersonationUser}
            onClick={handleImpersonate}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md whitespace-nowrap",
              selectedImpersonationUser
                ? "bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer"
                : "bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed"
            )}
          >
            View as {selectedImpersonationUser ? (selectedImpersonationUser.nickname || selectedImpersonationUser.name) : 'User'}
          </button>
        </div>
      </div>
    );
  };

  const renderBadgeAndTaskAssignment = () => {
    return (
      <BadgeAndTaskControlPanel />
    );
  };

  const handleFanbaseReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFanErrors([]);
    setFanSuccessMsg('');

    if (!selectedHostUser) {
      setFanErrors(['Please select a target host.']);
      return;
    }
    const hostId = selectedHostUser.poppo_id || selectedHostUser.poppoId || selectedHostUser.id;
    if (!hostId) {
      setFanErrors(['Selected host does not have a valid ID.']);
      return;
    }

    if (!fanRangeStart || !fanRangeEnd) {
      setFanErrors(['Please select the date range.']);
      return;
    }

    const followersNum = Number(currentFollowers);
    const gcMembersNum = Number(fanclubGcMembers);
    const subsNum = Number(fanclubSubscribers);
    const updatesFansNum = Number(gcUpdatesFans);
    const updatesHostNum = Number(gcUpdatesHost);

    if (isNaN(followersNum) || followersNum < 0 ||
      isNaN(gcMembersNum) || gcMembersNum < 0 ||
      isNaN(subsNum) || subsNum < 0 ||
      isNaN(updatesFansNum) || updatesFansNum < 0 ||
      isNaN(updatesHostNum) || updatesHostNum < 0) {
      setFanErrors(['All metric counts must be positive numbers.']);
      return;
    }

    setIsFanProcessing(true);

    try {
      const hostNickname = selectedHostUser.nickname || selectedHostUser.name || 'Unknown Host';
      const fromTimestamp = Timestamp.fromDate(new Date(fanRangeStart));
      const toTimestamp = Timestamp.fromDate(new Date(fanRangeEnd));

      const reportData = {
        // camelCase schema for standard writes
        fromDate: fromTimestamp,
        toDate: toTimestamp,
        poppoId: hostId,
        nickname: hostNickname,
        currentFollowers: followersNum,
        fanclubSubscribers: subsNum,
        fanclubGcMembers: gcMembersNum,
        gcUpdatesHost: updatesHostNum,
        gcUpdatesFans: updatesFansNum,
        reporterId: rootAuth.poppo_id || rootAuth.poppoId || 'SystemAdmin',
        reporterName: rootAuth.nickname || rootAuth.name || 'Admin',
        reporterRole: rootAuth.role || 'Admin',
        submittedAt: Timestamp.now(),

        // snake_case schema for subcollection compatibility
        from_date: new Date(fanRangeStart).toISOString(),
        to_date: new Date(fanRangeEnd).toISOString(),
        poppo_id: hostId,
        total_followers: followersNum,
        fanclub_subscribers: subsNum,
        fanclub_gc_members: gcMembersNum,
        gc_activity_count_host: updatesHostNum,
        gc_activity_count_fans: updatesFansNum,
        reporter_id: rootAuth.poppo_id || rootAuth.poppoId || 'SystemAdmin',
        reporter_name: rootAuth.nickname || rootAuth.name || 'Admin',
        reporter_role: rootAuth.role || 'Admin',
        timestamp: new Date().toISOString()
      };

      // Direct write to fanbase_reports collection
      await addDoc(collection(db, 'fanbase_reports'), reportData);

      await FirebaseService.logSystemActivity(
        `Submitted fanbase report for Host: ${hostNickname} (Poppo ID: ${hostId}) - Period: ${fanRangeStart} to ${fanRangeEnd} - Followers: ${followersNum}, Subscribers: ${subsNum}, GC Members: ${gcMembersNum}, GC Activity Host/Fans: ${updatesHostNum}/${updatesFansNum}`,
        'Info'
      );

      Storage.addLog('Fanbase', `Submitted admin fanbase report for ${hostNickname}`, rootAuth.nickname || rootAuth.name);

      setFanSuccessMsg(`Successfully submitted fanbase report for ${hostNickname}!`);
      showToast('success', `Submitted fanbase report for ${hostNickname}`);

      // Reset form
      setFanReportHostId('');
      setCurrentFollowers('');
      setFanclubGcMembers('');
      setFanclubSubscribers('');
      setGcUpdatesFans('');
      setGcUpdatesHost('');
      setFanRangeStart('');
      setFanRangeEnd('');
      setHostSearchQuery('');
      setSelectedHostUser(null);
    } catch (err: any) {
      console.error('[HostProfileView] Fanbase Submit Error:', err);
      setFanErrors([err.message || 'Failed to save fanbase report to database']);
      showToast('error', err.message || 'Failed to submit fanbase report');
    } finally {
      setIsFanProcessing(false);
    }
  };

  const renderAdminFanbaseReportSection = () => {
    return (
      <div className={cn("backdrop-blur-xl border-2 rounded-3xl p-5 space-y-6 transition-all duration-300 group shadow-lg", styles.gradientBg, styles.borderColor, styles.topTrim)}>
        <div className="flex items-center gap-4 pb-4 border-b border-white/5">
          <div className="p-3 rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#F0EFE8] uppercase tracking-wide">Submit Host Fanbase Report</h3>
            <p className="text-[10px] text-[#A09E9A] uppercase font-black tracking-widest mt-0.5">Admin version — full host lookup & edit access</p>
          </div>
        </div>

        {fanErrors.length > 0 && (
          <div className="bg-rose-950/50 border border-rose-500/30 rounded-xl p-3.5 space-y-1">
            {fanErrors.map((err, idx) => (
              <p key={idx} className="text-xs text-rose-300 font-bold">⚠️ {err}</p>
            ))}
          </div>
        )}

        {fanSuccessMsg && (
          <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-xl p-3.5">
            <p className="text-xs text-emerald-300 font-bold">✅ {fanSuccessMsg}</p>
          </div>
        )}

        <form onSubmit={handleFanbaseReportSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Select Host via dynamic search box */}
            <div className="space-y-1.5 host-search-container relative">
              <label htmlFor="fanbase-host-search" className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">
                Select Target Niner Host
              </label>
              <input
                id="fanbase-host-search"
                type="text"
                placeholder="Search host by Name, Nickname or Poppo ID..."
                value={hostSearchQuery}
                onChange={(e) => {
                  setHostSearchQuery(e.target.value);
                  setIsHostDropdownOpen(true);
                  if (selectedHostUser) {
                    setSelectedHostUser(null);
                  }
                }}
                onFocus={() => setIsHostDropdownOpen(true)}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 transition-all font-bold placeholder:text-white/20"
                required={!selectedHostUser}
              />
              {isHostDropdownOpen && filteredHostUsersForSearch.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[#11111A]/95 border border-white/10 backdrop-blur-md rounded-xl shadow-2xl z-55 custom-scrollbar p-1">
                  {filteredHostUsersForSearch.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setSelectedHostUser(user);
                        setHostSearchQuery(user.nickname || user.name || user.id);
                        setIsHostDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex justify-between items-center cursor-pointer"
                    >
                      <span className="font-bold">{user.nickname || user.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">ID: {user.poppo_id || user.id} ({user.role})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date Range */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Reporting Date Range</label>
              <DateRangePicker
                startDate={fanRangeStart}
                endDate={fanRangeEnd}
                onChange={(start, end) => { setFanRangeStart(start); setFanRangeEnd(end); }}
                required
              />
            </div>
          </div>

          {/* Metrics */}
          <div className="bg-[#0D0D14]/50 p-6 rounded-2xl border border-white/5 space-y-6">
            <span className="text-[10px] font-black text-[#A09E9A] uppercase tracking-widest block border-b border-white/5 pb-2">Fanbase Health Indicators</span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Followers */}
              <div className="space-y-1.5">
                <label htmlFor="followers" className="text-[10px] font-bold text-[#A09E9A]">Current Followers count</label>
                <input
                  id="followers"
                  type="number"
                  value={currentFollowers}
                  onChange={(e) => setCurrentFollowers(e.target.value)}
                  placeholder="e.g. 15000"
                  required
                  min="0"
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* FC Subscribers */}
              <div className="space-y-1.5">
                <label htmlFor="subscribers" className="text-[10px] font-bold text-[#A09E9A]">Fanclub Subscribers</label>
                <input
                  id="subscribers"
                  type="number"
                  value={fanclubSubscribers}
                  onChange={(e) => setFanclubSubscribers(e.target.value)}
                  placeholder="e.g. 120"
                  required
                  min="0"
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* FC GC Members */}
              <div className="space-y-1.5">
                <label htmlFor="members" className="text-[10px] font-bold text-[#A09E9A]">Fanclub GC Members</label>
                <input
                  id="members"
                  type="number"
                  value={fanclubGcMembers}
                  onChange={(e) => setFanclubGcMembers(e.target.value)}
                  placeholder="e.g. 450"
                  required
                  min="0"
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-4 py-3 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

          </div>

          {/* Submitter & Host Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] font-bold text-[#A09E9A] uppercase tracking-wider bg-black/20 p-4 rounded-xl border border-white/5">
            <div className="space-y-1">
              <span className="block">SubmittedBy: <span className="text-[#F0EFE8]">{rootAuth.nickname || rootAuth.name} (Role: {rootAuth.role})</span></span>
              <span className="block font-mono">ReporterID: {rootAuth.poppo_id || rootAuth.poppoId || 'SystemAdmin'}</span>
            </div>
            <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-white/5 pt-2 sm:pt-0 sm:pl-4">
              {selectedHostUser ? (
                <>
                  <span className="block">TargetHost: <span className="text-[#D4AF37]">{selectedHostUser.nickname || selectedHostUser.name || 'Unknown'}</span></span>
                  <span className="block font-mono">PoppoID: {selectedHostUser.poppo_id || selectedHostUser.id}</span>
                </>
              ) : (
                <span className="text-white/20 italic">No target host selected</span>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isFanProcessing}
              className={cn("w-full sm:w-auto px-8 py-3 rounded-xl border-2 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg transition-all", styles.gradientBg, styles.borderColor, styles.shadow, styles.badgeText)}
            >
              <Send size={14} className="text-[#0D0D14]" />
              {isFanProcessing ? 'Processing...' : 'Submit fanbase report'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  const combinedAdminLogs = useMemo(() => {
    const combined = [...rawFanbase, ...rawAttendance, ...rawCalendar];
    // sort chronologically descending (newest first)
    combined.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
    return combined;
  }, [rawFanbase, rawAttendance, rawCalendar]);

  useEffect(() => {
    setAdminLogsPage(1);
  }, [combinedAdminLogs.length]);

  const adminLogBadgeStyles = useMemo(() => ({
    base: "px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider",
    gold: "bg-[#D4AF37]/10 text-[#D4AF37] border-[#D4AF37]/20",
    indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    pink: "bg-pink-500/10 text-pink-400 border-pink-500/20"
  }), []);

  const filteredEditUsers = useMemo(() => {
    return allUsers.filter(u => {
      const userRole = String(u.role || '').toLowerCase();
      if (userRole === 'director') return false;

      if (editRoleFilter !== 'All Roles') {
        if (editRoleFilter === 'hosts' && userRole !== 'host' && userRole !== 'talent') return false;
        if (editRoleFilter === 'managers' && userRole !== 'manager') return false;
        if (editRoleFilter === 'agents' && userRole !== 'agent') return false;
        if (editRoleFilter === 'admins' && userRole !== 'admin' && userRole !== 'head admin') return false;
      }

      const searchStr = editSearch.toLowerCase().trim();
      if (searchStr) {
        const nickname = String(u.nickname || u.name || '').toLowerCase();
        const poppoId = String(u.poppo_id || u.poppoId || u.id || '').toLowerCase();
        return nickname.includes(searchStr) || poppoId.includes(searchStr);
      }

      return true;
    });
  }, [allUsers, editSearch, editRoleFilter]);

  const filteredEditCalUsers = useMemo(() => {
    return allUsers.filter(u => {
      const userRole = String(u.role || '').toLowerCase();
      if (userRole === 'director') return false;

      if (editCalRoleFilter !== 'All Roles') {
        if (editCalRoleFilter === 'hosts' && userRole !== 'host' && userRole !== 'talent') return false;
        if (editCalRoleFilter === 'managers' && userRole !== 'manager') return false;
        if (editCalRoleFilter === 'agents' && userRole !== 'agent') return false;
        if (editCalRoleFilter === 'admins' && userRole !== 'admin' && userRole !== 'head admin') return false;
      }

      const searchStr = editCalSearch.toLowerCase().trim();
      if (searchStr) {
        const nickname = String(u.nickname || u.name || '').toLowerCase();
        const poppoId = String(u.poppo_id || u.poppoId || u.id || '').toLowerCase();
        return nickname.includes(searchStr) || poppoId.includes(searchStr);
      }

      return true;
    });
  }, [allUsers, editCalSearch, editCalRoleFilter]);

  const isOriginalAuthor = (item: any) => {
    const poppoId = rootAuth?.poppo_id || rootAuth?.poppoId || rootAuth?.id;
    if (!poppoId) return false;
    if (item.logType === 'calendar') {
      return String(item.created_by_id) === String(poppoId);
    } else {
      return String(item.reporterId || item.reporter_id) === String(poppoId);
    }
  };

  const handleDeleteLogItem = async (item: any) => {
    if (!window.confirm(`Are you sure you want to delete this ${item.logType === 'calendar' ? 'calendar event' : item.logType === 'fanbase' ? 'fanbase report' : 'attendance log'}?`)) {
      return;
    }

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Authentication token not found.");

      let url = '';
      let payload: any = {};
      if (item.logType === 'calendar') {
        url = '/api/admin/delete-event';
        payload = { eventId: item.id };
      } else if (item.logType === 'fanbase') {
        url = '/api/admin/delete-fanbase-report';
        payload = { reportId: item.id };
      } else {
        url = '/api/admin/delete-attendance-log';
        payload = { attendanceId: item.id };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Failed to delete ${item.logType}`);
      }

      showToast('success', `Successfully deleted ${item.logType === 'calendar' ? 'event' : 'report'}`);
      await FirebaseService.logSystemActivity(
        `${rootAuth.nickname || rootAuth.name} deleted their own ${item.logType} log/event (ID: ${item.id})`,
        'Info'
      );
    } catch (err: any) {
      console.error("Failed to delete log item:", err);
      showToast('error', err.message || "Deletion failed.");
    }
  };

  const handleEditLogItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTargetLogItem) return;

    setIsLogProcessing(true);
    setLogErrors([]);
    setLogSuccessMsg('');

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("Authentication token not found.");

      let url = '';
      let payload: any = {};

      if (editTargetLogItem.logType === 'fanbase') {
        const followersNum = Number(editFollowers);
        const subsNum = Number(editSubscribers);
        const gcMembersNum = Number(editGcMembers);
        const updatesHostNum = Number(editGcUpdatesHost);
        const updatesFansNum = Number(editGcUpdatesFans);

        if (isNaN(followersNum) || followersNum < 0 ||
          isNaN(subsNum) || subsNum < 0 ||
          isNaN(gcMembersNum) || gcMembersNum < 0 ||
          isNaN(updatesHostNum) || updatesHostNum < 0 ||
          isNaN(updatesFansNum) || updatesFansNum < 0) {
          throw new Error('All metrics must be positive numbers.');
        }

        url = '/api/admin/update-fanbase-report';
        payload = {
          reportId: editTargetLogItem.id,
          updatedFields: {
            fromDate: editRangeStart,
            toDate: editRangeEnd,
            currentFollowers: followersNum,
            fanclubSubscribers: subsNum,
            fanclubGcMembers: gcMembersNum,
            gcUpdatesHost: updatesHostNum,
            gcUpdatesFans: updatesFansNum,
            from_date: new Date(editRangeStart).toISOString(),
            to_date: new Date(editRangeEnd).toISOString(),
            total_followers: followersNum,
            fanclub_subscribers: subsNum,
            fanclub_gc_members: gcMembersNum,
            gc_activity_count_host: updatesHostNum,
            gc_activity_count_fans: updatesFansNum,
          }
        };
      } else if (editTargetLogItem.logType === 'attendance') {
        if (editAttendees.length === 0) {
          throw new Error('Please add at least one attendee.');
        }

        url = '/api/admin/update-attendance-log';
        payload = {
          attendanceId: editTargetLogItem.id,
          updatedFields: {
            eventId: editEventId,
            eventTitle: editEventTitle,
            eventDate: editEventDate,
            timeslot: editTimeslot,
            attendees: editAttendees.map(a => ({
              poppoId: a.poppoId || a.poppo_id || a.id,
              nickname: a.nickname || a.name,
              role: a.role
            })),
            attendeeIds: editAttendees.map(a => a.poppoId || a.poppo_id || a.id),
            eventFeedback: editFeedback.trim()
          }
        };
      } else if (editTargetLogItem.logType === 'calendar') {
        if (!editCalTitle.trim()) {
          throw new Error('Event Title is required.');
        }

        url = '/api/admin/update-event';
        payload = {
          eventId: editTargetLogItem.id,
          updatedFields: {
            title: editCalTitle.trim(),
            description: editCalDescription.trim(),
            date: editCalDate,
            time: editCalTime,
            type: editCalType,
            location: editCalLocation.trim(),
            participants: editCalParticipants.map(p => ({
              poppoId: p.poppoId || p.poppo_id || p.id,
              nickname: p.nickname || p.name,
              role: p.role
            })),
            participantIds: editCalParticipants.map(p => p.poppoId || p.poppo_id || p.id)
          }
        };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `Failed to update ${editTargetLogItem.logType}`);
      }

      setLogSuccessMsg(`Successfully updated the ${editTargetLogItem.logType === 'calendar' ? 'event' : 'report'}!`);
      showToast('success', `Updated ${editTargetLogItem.logType === 'calendar' ? 'event' : 'report'}`);

      setTimeout(() => {
        setEditTargetLogItem(null);
      }, 800);
    } catch (err: any) {
      console.error("Failed to edit log item:", err);
      setLogErrors([err.message || "Update failed."]);
      showToast('error', err.message || "Update failed.");
    } finally {
      setIsLogProcessing(false);
    }
  };

  const handleOpenLogEditModal = (item: any) => {
    setEditTargetLogItem(item);
    setLogErrors([]);
    setLogSuccessMsg('');
    setIsLogProcessing(false);

    if (item.logType === 'fanbase') {
      setEditFollowers(String(item.currentFollowers ?? item.total_followers ?? ''));
      setEditSubscribers(String(item.fanclubSubscribers ?? item.fanclub_subscribers ?? ''));
      setEditGcMembers(String(item.fanclubGcMembers ?? item.fanclub_gc_members ?? ''));
      setEditGcUpdatesHost(String(item.gcUpdatesHost ?? item.gc_activity_count_host ?? ''));
      setEditGcUpdatesFans(String(item.gcUpdatesFans ?? item.gc_activity_count_fans ?? ''));

      const getIsoDate = (d: any) => {
        if (!d) return '';
        if (d.toDate) return d.toDate().toISOString().substring(0, 10);
        try {
          return new Date(d).toISOString().substring(0, 10);
        } catch (e) {
          return '';
        }
      };
      setEditRangeStart(getIsoDate(item.fromDate || item.from_date));
      setEditRangeEnd(getIsoDate(item.toDate || item.to_date));
    } else if (item.logType === 'attendance') {
      setEditEventId(item.eventId || '');
      setEditEventTitle(item.eventTitle || '');
      setEditEventDate(item.eventDate || '');
      setEditTimeslot(item.timeslot || '');
      setEditAttendees(item.attendees || []);
      setEditFeedback(item.eventFeedback || '');
      setEditSearch('');
      setEditRoleFilter('All Roles');
    } else if (item.logType === 'calendar') {
      setEditCalTitle(item.title || '');
      setEditCalDescription(item.description || '');
      setEditCalDate(item.date || '');
      setEditCalTime(item.time || '');
      setEditCalType(item.type || 'solo livehouse');
      setEditCalLocation(item.location || '');
      setEditCalParticipants(item.participants || []);
      setEditCalSearch('');
      setEditCalRoleFilter('All Roles');
    }
  };

  const renderAdminsLogSection = () => {
    return (
      <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 p-5 rounded-3xl transition-all duration-300 hover:border-[#D4AF37]/50 group space-y-6 shadow-[0_0_15px_rgba(212,175,55,0.15)] text-left">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
              <ClipboardList size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black text-[#F0EFE8] uppercase tracking-wide">Admins Log & Submissions</h3>
              <p className="text-[10px] text-[#A09E9A] uppercase font-black tracking-widest mt-0.5">Your aggregated report & event history</p>
            </div>
          </div>
          <div className="text-[10px] bg-black/40 border border-white/5 px-3 py-1 rounded-full font-bold text-[#A09E9A] uppercase">
            Total entries: {combinedAdminLogs.length}
          </div>
        </div>

        {combinedAdminLogs.length > 0 ? (
          <div className="space-y-4">
            <div className="overflow-x-auto no-scrollbar rounded-2xl border border-white/5">
              <table className="w-full text-left text-xs divide-y divide-white/5">
                <thead className="bg-black/30 text-[#A09E9A] text-[9px] font-black uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Subject / Target</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-black/10 font-medium">
                  {combinedAdminLogs.slice((adminLogsPage - 1) * 10, adminLogsPage * 10).map((item) => {
                    let badgeStyles = adminLogBadgeStyles.base;
                    let typeLabel = '';
                    let titleStr = '';
                    let subtitleStr = '';
                    let dateAndTimeStr = '';

                    if (item.logType === 'fanbase') {
                      badgeStyles = cn(badgeStyles, adminLogBadgeStyles.gold);
                      typeLabel = 'Fanbase';
                      titleStr = item.nickname || 'Unknown Host';
                      subtitleStr = `Poppo: ${item.poppoId || item.poppo_id}`;

                      const start = formatLogDateAndTime(item.fromDate || item.from_date, '');
                      const end = formatLogDateAndTime(item.toDate || item.to_date, '');
                      dateAndTimeStr = `${start} - ${end}`;
                    } else if (item.logType === 'attendance') {
                      badgeStyles = cn(badgeStyles, adminLogBadgeStyles.indigo);
                      typeLabel = 'Attendance';
                      titleStr = item.eventTitle || 'Unknown Event';
                      subtitleStr = `Poppo IDs: ${(item.attendeeIds || []).length} logged`;
                      dateAndTimeStr = formatLogDateAndTime(item.eventDate, item.timeslot || '');
                    } else if (item.logType === 'calendar') {
                      badgeStyles = cn(badgeStyles, adminLogBadgeStyles.pink);
                      typeLabel = 'Event';
                      titleStr = item.title || 'Untitled Event';
                      subtitleStr = `Type: ${item.type || 'solo'}`;
                      dateAndTimeStr = formatLogDateAndTime(item.date, item.time || '');
                    }

                    const isAuthor = isOriginalAuthor(item);

                    return (
                      <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={badgeStyles}>
                            {typeLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-[#F0EFE8]">{titleStr}</div>
                          <div className="text-[10px] text-[#D4AF37] font-mono mt-0.5">{dateAndTimeStr}</div>
                          <div className="text-[9px] font-mono text-[#A09E9A] mt-0.5">{subtitleStr}</div>
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          {isAuthor ? (
                            <div className="flex items-center gap-1.5 justify-end">
                              <button
                                type="button"
                                onClick={() => handleOpenLogEditModal(item)}
                                className="px-2 py-1 bg-white/5 hover:bg-white/10 text-[#F0EFE8] border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all"
                              >
                                <Edit2 size={9} /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLogItem(item)}
                                className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all"
                              >
                                <Trash2 size={9} /> Delete
                              </button>
                            </div>
                          ) : (
                            <span className="text-[9px] text-slate-500 italic select-none">ReadOnly</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {combinedAdminLogs.length > 10 && (
              <div className="flex items-center justify-between border-t border-white/5 pt-3">
                <button
                  type="button"
                  disabled={adminLogsPage === 1}
                  onClick={() => setAdminLogsPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-wider text-[#F0EFE8] transition-all cursor-pointer"
                >
                  ← Previous
                </button>
                <span className="text-[10px] font-black uppercase text-[#A09E9A]">
                  Page {adminLogsPage} of {Math.ceil(combinedAdminLogs.length / 10)}
                </span>
                <button
                  type="button"
                  disabled={adminLogsPage >= Math.ceil(combinedAdminLogs.length / 10)}
                  onClick={() => setAdminLogsPage(p => p + 1)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-wider text-[#F0EFE8] transition-all cursor-pointer"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center text-[#A09E9A]/30 italic text-xs bg-black/20 rounded-2xl border border-white/5">
            No submissions recorded by you yet.
          </div>
        )}
      </div>
    );
  };

  const renderAdminLogEditModal = () => {
    if (!editTargetLogItem) return null;

    return (
      <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="w-full max-w-lg bg-[#13131E] border border-white/10 rounded-3xl p-6 shadow-2xl relative my-8 text-left">
          <button
            type="button"
            title="Close"
            onClick={() => setEditTargetLogItem(null)}
            className="absolute top-4 right-4 text-[#A09E9A] hover:text-[#F0EFE8] cursor-pointer"
          >
            <X size={16} />
          </button>

          <h3 className="text-sm font-black text-[#F0EFE8] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Edit2 size={16} className="text-[#D4AF37]" />
            Edit {editTargetLogItem.logType === 'fanbase' ? 'Fanbase Report' : editTargetLogItem.logType === 'attendance' ? 'Attendance Log' : 'Calendar Event'}
          </h3>

          {logErrors.length > 0 && (
            <div className="bg-rose-950/50 border border-rose-500/30 rounded-xl p-3 mb-4 space-y-1 text-left">
              {logErrors.map((err, idx) => (
                <p key={idx} className="text-xs text-rose-300 font-bold">⚠️ {err}</p>
              ))}
            </div>
          )}

          {logSuccessMsg && (
            <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-xl p-3 mb-4 text-left">
              <p className="text-xs text-emerald-300 font-bold">✅ {logSuccessMsg}</p>
            </div>
          )}

          <form onSubmit={handleEditLogItemSubmit} className="space-y-4">
            {editTargetLogItem.logType === 'fanbase' && (
              <div className="space-y-4">
                <div className="p-3 bg-black/20 rounded-xl border border-white/5 text-[10px] text-[#A09E9A] font-bold uppercase space-y-1">
                  <div>Target Host: <span className="text-[#D4AF37]">{editTargetLogItem.nickname || 'Unknown'}</span></div>
                  <div>Poppo ID: <span className="text-[#F0EFE8] font-mono">{editTargetLogItem.poppoId || editTargetLogItem.poppo_id}</span></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="edit-start" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">Start Date</label>
                    <input
                      id="edit-start"
                      type="date"
                      value={editRangeStart}
                      onChange={(e) => setEditRangeStart(e.target.value)}
                      required
                      className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="edit-end" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">End Date</label>
                    <input
                      id="edit-end"
                      type="date"
                      value={editRangeEnd}
                      onChange={(e) => setEditRangeEnd(e.target.value)}
                      required
                      className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="edit-followers" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">Followers</label>
                    <input
                      id="edit-followers"
                      type="number"
                      min="0"
                      value={editFollowers}
                      onChange={(e) => setEditFollowers(e.target.value)}
                      required
                      className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="edit-subscribers" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">Subscribers</label>
                    <input
                      id="edit-subscribers"
                      type="number"
                      min="0"
                      value={editSubscribers}
                      onChange={(e) => setEditSubscribers(e.target.value)}
                      required
                      className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="edit-gc-members" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">GC Members</label>
                    <input
                      id="edit-gc-members"
                      type="number"
                      min="0"
                      value={editGcMembers}
                      onChange={(e) => setEditGcMembers(e.target.value)}
                      required
                      className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="edit-updates-host" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">GC Updates (Host)</label>
                    <input
                      id="edit-updates-host"
                      type="number"
                      min="0"
                      value={editGcUpdatesHost}
                      onChange={(e) => setEditGcUpdatesHost(e.target.value)}
                      required
                      className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="edit-updates-fans" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">GC Updates (Fans)</label>
                    <input
                      id="edit-updates-fans"
                      type="number"
                      min="0"
                      value={editGcUpdatesFans}
                      onChange={(e) => setEditGcUpdatesFans(e.target.value)}
                      required
                      className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              </div>
            )}

            {editTargetLogItem.logType === 'attendance' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="edit-attendance-title" className="text-[9px] font-black text-[#A09E9A] uppercase tracking-widest ml-1">Event Title</label>
                  <input
                    id="edit-attendance-title"
                    type="text"
                    value={editEventTitle}
                    disabled
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-[#A09E9A] outline-none font-bold"
                  />
                </div>

                {/* Attendees Selection */}
                <div className="border border-white/5 rounded-xl bg-black/40 p-4 space-y-3">
                  <span className="text-[9px] font-black text-[#A09E9A] uppercase tracking-widest block text-left">Edit Attendees ({editAttendees.length})</span>

                  <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2 bg-[#0D0D14]/80 rounded-lg border border-white/5">
                    {editAttendees.map((att, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] text-[#D4AF37] font-bold flex items-center gap-1">
                        {att.nickname || att.name}
                        <button
                          type="button"
                          onClick={() => setEditAttendees(editAttendees.filter(a => (a.poppoId || a.id || a.poppo_id) !== (att.poppoId || att.id || att.poppo_id)))}
                          className="text-red-400 hover:text-red-300 font-bold ml-0.5 cursor-pointer text-xs"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {editAttendees.length === 0 && (
                      <span className="text-white/20 italic text-[10px] self-center">No attendees selected yet</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editSearch}
                        onChange={(e) => setEditSearch(e.target.value)}
                        placeholder="Search users..."
                        className="flex-1 bg-[#0A0B0E] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                      />
                      <select
                        value={editRoleFilter}
                        onChange={(e) => setEditRoleFilter(e.target.value)}
                        title="Role Filter"
                        className="bg-[#0A0B0E] border border-white/10 rounded-lg px-2 text-xs text-[#F0EFE8] outline-none cursor-pointer font-bold"
                      >
                        <option value="All Roles">All Roles</option>
                        <option value="hosts">Hosts</option>
                        <option value="managers">Managers</option>
                        <option value="agents">Agents</option>
                        <option value="admins">Admins</option>
                      </select>
                    </div>

                    <div className="max-h-[120px] overflow-y-auto border border-white/5 rounded-lg bg-black/20 divide-y divide-white/5 custom-scrollbar">
                      {filteredEditUsers.map(user => {
                        const userPoppo = user.poppo_id || user.id;
                        const isAdded = editAttendees.some(a => (a.poppoId || a.id || a.poppo_id) === userPoppo);
                        return (
                          <div key={user.id} className="flex items-center justify-between p-2 text-xs hover:bg-white/[0.01]">
                            <div>
                              <span className="font-bold text-[#F0EFE8]">{user.nickname || user.name}</span>
                              <span className="text-[9px] text-[#A09E9A] ml-2">({user.role})</span>
                            </div>
                            <button
                              type="button"
                              disabled={isAdded}
                              onClick={() => {
                                if (!isAdded) {
                                  setEditAttendees([...editAttendees, {
                                    poppoId: userPoppo,
                                    nickname: user.nickname || user.name,
                                    role: user.role
                                  }]);
                                }
                              }}
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors",
                                isAdded
                                  ? "bg-white/5 text-slate-500 cursor-not-allowed"
                                  : "bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] cursor-pointer"
                              )}
                            >
                              {isAdded ? 'Added' : 'Add'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="edit-attendance-feedback" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">Feedback / Comments</label>
                  <textarea
                    id="edit-attendance-feedback"
                    rows={3}
                    value={editFeedback}
                    onChange={(e) => setEditFeedback(e.target.value)}
                    placeholder="Attendance records notes or comments..."
                    className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] resize-none"
                  />
                </div>
              </div>
            )}

            {editTargetLogItem.logType === 'calendar' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="edit-cal-title" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">Event Title</label>
                    <input
                      id="edit-cal-title"
                      type="text"
                      value={editCalTitle}
                      disabled
                      className="w-full bg-[#0D0D14]/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-500 cursor-not-allowed outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="edit-cal-type" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">Event Type</label>
                    <select
                      id="edit-cal-type"
                      value={editCalType}
                      disabled
                      className="w-full bg-[#0D0D14]/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-500 cursor-not-allowed outline-none"
                    >
                      <option value="solo livehouse">Solo Livehouse</option>
                      <option value="party livehouse">Party Livehouse</option>
                      <option value="pk event">PK Event</option>
                      <option value="agency meeting">Agency Meeting</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="edit-cal-date" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">Date</label>
                    <input
                      id="edit-cal-date"
                      type="date"
                      value={editCalDate}
                      disabled
                      className="w-full bg-[#0D0D14]/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-500 cursor-not-allowed outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="edit-cal-time" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">Time Slot</label>
                    <input
                      id="edit-cal-time"
                      type="text"
                      value={editCalTime}
                      disabled
                      className="w-full bg-[#0D0D14]/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-500 cursor-not-allowed outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="edit-cal-loc" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">Location / Room Link</label>
                  <input
                    id="edit-cal-loc"
                    type="text"
                    value={editCalLocation}
                    disabled
                    className="w-full bg-[#0D0D14]/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-500 cursor-not-allowed outline-none"
                  />
                </div>

                {/* Calendar Participants */}
                <div className="border border-white/5 rounded-xl bg-black/40 p-4 space-y-3">
                  <span className="text-[9px] font-black text-[#A09E9A] uppercase tracking-widest block text-left">Edit Participants ({editCalParticipants.length})</span>

                  <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2 bg-[#0D0D14]/80 rounded-lg border border-white/5">
                    {editCalParticipants.map((part, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] text-[#D4AF37] font-bold flex items-center gap-1">
                        {part.nickname || part.name}
                        <button
                          type="button"
                          onClick={() => setEditCalParticipants(editCalParticipants.filter(p => (p.poppoId || p.id || p.poppo_id) !== (part.poppoId || part.id || part.poppo_id)))}
                          className="text-red-400 hover:text-red-300 font-bold ml-0.5 cursor-pointer text-xs"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {editCalParticipants.length === 0 && (
                      <span className="text-white/20 italic text-[10px] self-center">No participants selected yet</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editCalSearch}
                        onChange={(e) => setEditCalSearch(e.target.value)}
                        placeholder="Search users..."
                        className="flex-1 bg-[#0A0B0E] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
                      />
                      <select
                        value={editCalRoleFilter}
                        onChange={(e) => setEditCalRoleFilter(e.target.value)}
                        title="Role Filter"
                        className="bg-[#0A0B0E] border border-white/10 rounded-lg px-2 text-xs text-[#F0EFE8] outline-none cursor-pointer font-bold"
                      >
                        <option value="All Roles">All Roles</option>
                        <option value="hosts">Hosts</option>
                        <option value="managers">Managers</option>
                        <option value="agents">Agents</option>
                        <option value="admins">Admins</option>
                      </select>
                    </div>

                    <div className="max-h-[120px] overflow-y-auto border border-white/5 rounded-lg bg-black/20 divide-y divide-white/5 custom-scrollbar">
                      {filteredEditCalUsers.map(user => {
                        const userPoppo = user.poppo_id || user.id;
                        const isAdded = editCalParticipants.some(p => (p.poppoId || p.id || p.poppo_id) === userPoppo);
                        return (
                          <div key={user.id} className="flex items-center justify-between p-2 text-xs hover:bg-white/[0.01]">
                            <div>
                              <span className="font-bold text-[#F0EFE8]">{user.nickname || user.name}</span>
                              <span className="text-[9px] text-[#A09E9A] ml-2">({user.role})</span>
                            </div>
                            <button
                              type="button"
                              disabled={isAdded}
                              onClick={() => {
                                if (!isAdded) {
                                  setEditCalParticipants([...editCalParticipants, {
                                    poppoId: userPoppo,
                                    nickname: user.nickname || user.name,
                                    role: user.role
                                  }]);
                                }
                              }}
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors",
                                isAdded
                                  ? "bg-white/5 text-slate-500 cursor-not-allowed"
                                  : "bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] cursor-pointer"
                              )}
                            >
                              {isAdded ? 'Added' : 'Add'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="edit-cal-desc" className="text-[9px] font-bold text-[#A09E9A] uppercase tracking-widest">Description</label>
                  <textarea
                    id="edit-cal-desc"
                    rows={2}
                    value={editCalDescription}
                    disabled
                    className="w-full bg-[#0D0D14]/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-500 cursor-not-allowed outline-none resize-none"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => setEditTargetLogItem(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-bold uppercase rounded-lg text-[#F0EFE8] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLogProcessing}
                className="px-4 py-2 bg-[#D4AF37] text-black hover:bg-[#C5A028] text-xs font-black uppercase rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all font-bold"
              >
                {isLogProcessing ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const [performanceReports, setPerformanceReports] = useState<any[]>([]);
  const [participatedEvents, setParticipatedEvents] = useState<any[]>([]);
  const [pkData, setPkData] = useState<{ win_percentage: number; pk_score: number; sessions: number }>({
    win_percentage: 0,
    pk_score: 0,
    sessions: 0
  });
  const [attendedEvents, setAttendedEvents] = useState<any[]>([]);
  const [totalAgencyEventsCount, setTotalAgencyEventsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sortAscending, setSortAscending] = useState(true);

  // Dynamic styles based on tier_pay
  const tierPayStyles = useMemo(() => {
    const getTierPayStyles = (category: string) => {
      const norm = String(category || '').trim().toLowerCase();
      if (norm === 'agency founder') {
        return {
          borderColor: 'border-white',
          badgeText: 'text-white font-bold',
          bgStyle: 'bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.8)]'
        };
      }
      if (norm === 'star host') {
        return { borderColor: 'border-[#FFEA00]/50', badgeText: 'text-[#FFEA00]', bgStyle: 'bg-[#FFEA00]/20 shadow-[0_0_12px_rgba(255,234,0,0.5)]' };
      }
      if (norm === 's idol') {
        return { borderColor: 'border-[#FF007F]/50', badgeText: 'text-[#FF007F]', bgStyle: 'bg-[#FF007F]/20 shadow-[0_0_12px_rgba(255,0,127,0.5)]' };
      }
      if (norm === 'rocket host') {
        return { borderColor: 'border-[#60A5FA]/60', badgeText: 'text-[#60A5FA]', bgStyle: 'bg-[#1E3A8A]/60 shadow-[0_0_12px_rgba(96,165,250,0.5)]' };
      }
      if (norm === 'esport host' || norm.includes('esport')) {
        return { borderColor: 'border-[#B026FF]/50', badgeText: 'text-[#B026FF]', bgStyle: 'bg-[#B026FF]/20 shadow-[0_0_12px_rgba(176,38,255,0.5)]' };
      }
      // Regular Host
      return { borderColor: 'border-emerald-400/45', badgeText: 'text-emerald-400', bgStyle: 'bg-emerald-400/20 shadow-[0_0_12px_rgba(52,211,153,0.3)]' };
    };
    return getTierPayStyles(host.tier_pay || '');
  }, [host.tier_pay]);

  // Global fiery gold glassmorphism UI design
  const styles = useMemo(() => ({
    borderColor: 'border-[#D4AF37]/30',
    shadow: 'shadow-[0_0_20px_rgba(212,175,55,0.15)]',
    badgeText: 'text-[#D4AF37]',
    accentColor: '#D4AF37',
    topTrim: 'border-t-[#D4AF37] border-t-2',
    gradientBg: 'bg-[#1A140A]/80'
  }), []);

  // Profile Edit States
  const [editNickname, setEditNickname] = useState(host.nickname || host.name || '');
  const [editPhotoUrl, setEditPhotoUrl] = useState(host.photoUrl || '');
  const [editDescription, setEditDescription] = useState(host.description || '');
  const [editRole, setEditRole] = useState<string>(host.role || 'Host');
  const [editTeam, setEditTeam] = useState<string>(host.teamAnchor || host.team || 'Unassigned');
  const [editManager, setEditManager] = useState<string>(host.manager || 'Nine Management');
  const [editBaseSalaryCategory, setEditBaseSalaryCategory] = useState<string>(host.tier_pay || 'N/A');
  const [editStatus, setEditStatus] = useState<string>(host.status || 'Active');

  const [editLevel, setEditLevel] = useState<number>(host.level || 1);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [managersList, setManagersList] = useState<any[]>([]);

  const assignedManager = useMemo(() => {
    const managerId = host.assignedManagerId || host.assigned_manager_poppo_id;
    if (managerId) {
      return managersList.find(m => String(m.id).trim() === String(managerId).trim());
    }
    const managerName = host.manager;
    if (managerName) {
      return managersList.find(m => String(m.name).trim().toLowerCase() === String(managerName).trim().toLowerCase());
    }
    return null;
  }, [host.assignedManagerId, host.assigned_manager_poppo_id, host.manager, managersList]);

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
  const [trendChartViewMode, setTrendChartViewMode] = useState<'area' | 'bar'>('area');

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

  // Monthly Live Data Reporting States (For non-Nine Agency)
  const [isMonthlyDataFormOpen, setIsMonthlyDataFormOpen] = useState(false);
  const [isSubmittingMonthlyData, setIsSubmittingMonthlyData] = useState(false);
  const [monthlyDataForm, setMonthlyDataForm] = useState({
    total_earnings: '',
    total_duration: '',
    last_3_months_total_earnings: ''
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
  const [activeAwards, setActiveAwards] = useState<any[]>([]);
  const [agentNotes, setAgentNotes] = useState<any[]>([]);
  const [weeklyLiveData, setWeeklyLiveData] = useState<any[]>([]);

  // New States for dropdown selections, RPK metadata, event form data, and AI reports triggers
  const [analyticsYear, setAnalyticsYear] = useState<string>('all');
  const [analyticsMonth, setAnalyticsMonth] = useState<string>('all');
  const [perfActiveTab, setPerfActiveTab] = useState<'metrics' | 'diversity'>('metrics');
  const [assignedAwards, setAssignedAwards] = useState<any[]>([]);
  const [eventFormData, setEventFormData] = useState({
    eventType: 'SOLO LIVEHOUSE',
    eventDate: '',
    timeslot: '',
    description: ''
  });
  const [isAddEventFormOpen, setIsAddEventFormOpen] = useState(false);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [eventActiveTab, setEventActiveTab] = useState<'exposure' | 'attendance' | 'recognitions'>('exposure');
  const [rpkMetadata, setRpkMetadata] = useState<any>(null);

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
    setEditRole(host.role || 'Host');
    setEditTeam(host.teamAnchor || host.team || 'Unassigned');
    setEditManager(host.manager || 'Nine Management');
    setEditBaseSalaryCategory(host.tier_pay || 'N/A');
    setEditStatus(host.status || 'Active');

    setEditLevel(host.level || 1);

    // Sync self-edit states for other fields
    setSelfBio(host.bio || host.description || '');
    setSelfSocialIg(host.social_links?.ig || '');
    setSelfSocialTk(host.social_links?.tiktok || '');
    setSelfSocialFb(host.social_links?.fb || '');
    setSelfSocialWa(host.social_links?.whatsapp || '');
    setSelfStreamSlots(host.streaming_hours?.length ? host.streaming_hours : [{ from: '', to: '' }]);

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
        const MONTH_MAP: Record<string, number> = {
          January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
          July: 7, August: 8, September: 9, October: 10, November: 11, December: 12
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
          return a.month - b.month;
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
                January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
                July: 7, August: 8, September: 9, October: 10, November: 11, December: 12
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
                return a.month - b.month;
              });
              setPerformanceReports(mapped);
            }
          } catch (e) {
            console.warn('Fallback commission load failed:', e);
          }
        }

        // Section 2: Query exposures from 'calendar' collection
        const [eventsSnap1, eventsSnap2, eventsSnap3, eventsSnap4] = await Promise.all([
          getDocs(query(collection(db, 'calendar'), where('participantIds', 'array-contains', host.id))),
          getDocs(query(collection(db, 'calendar'), where('participants', 'array-contains', host.id))),
          getDocs(query(collection(db, 'calendar'), where('participants_id', 'array-contains', host.id))),
          getDocs(query(collection(db, 'calendar'), where('poppo_id', '==', host.id)))
        ]);
        const seenEventIds = new Set<string>();
        const eventsList: any[] = [];
        [...eventsSnap1.docs, ...eventsSnap2.docs, ...eventsSnap3.docs, ...eventsSnap4.docs].forEach(doc => {
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

        // Load PK data from top-level 'pk_reports' collection (deletes static mocks)
        try {
          const pkSnap = await getDocs(
            query(
              collection(db, 'pk_reports'),
              where('poppo_id', '==', host.id)
            )
          );
          if (!pkSnap.empty) {
            const reports = pkSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            reports.sort((a: any, b: any) => {
              const getReportTime = (r: any) => {
                if (r.timestamp) return new Date(r.timestamp).getTime();
                if (r.submittedAt) {
                  if (r.submittedAt instanceof Timestamp) return r.submittedAt.toDate().getTime();
                  if (r.submittedAt.seconds) return r.submittedAt.seconds * 1000;
                  return new Date(r.submittedAt).getTime();
                }
                if (r.from_date) return new Date(r.from_date).getTime();
                return 0;
              };
              return getReportTime(b) - getReportTime(a);
            });
            const latestRpk = reports[0];
            setPkData({
              win_percentage: parseFloat(latestRpk.pk_wins_percent) || parseFloat(latestRpk.win_percentage) || 0,
              pk_score: parseInt(latestRpk.pk_points) || parseInt(latestRpk.pk_score) || 0,
              sessions: parseInt(latestRpk.pk_sessions) || parseInt(latestRpk.sessions) || 0
            });
            setRpkMetadata({
              lastUpdated: latestRpk.timestamp || latestRpk.submittedAt,
              reporterRole: latestRpk.reporter_role || latestRpk.reporterRole || 'Staff',
              reporterName: latestRpk.reporter_name || latestRpk.reporterName || 'Unknown',
              reporterId: latestRpk.reporter_id || latestRpk.reporterId || 'Unknown'
            });
          } else {
            setPkData({ win_percentage: 0, pk_score: 0, sessions: 0 });
            setRpkMetadata(null);
          }
        } catch (e) {
          console.warn('Could not load PK report:', e);
          setPkData({ win_percentage: 0, pk_score: 0, sessions: 0 });
          setRpkMetadata(null);
        }

        // Section 3: Load latest fanbase report from top-level 'fanbase_reports' collection
        try {
          const fanbaseSnap = await getDocs(
            query(
              collection(db, 'fanbase_reports'),
              where('poppo_id', '==', host.id)
            )
          );
          if (!fanbaseSnap.empty) {
            const reports = fanbaseSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            reports.sort((a: any, b: any) => {
              const getReportTime = (r: any) => {
                if (r.timestamp) return new Date(r.timestamp).getTime();
                if (r.submittedAt) {
                  if (r.submittedAt instanceof Timestamp) return r.submittedAt.toDate().getTime();
                  if (r.submittedAt.seconds) return r.submittedAt.seconds * 1000;
                  return new Date(r.submittedAt).getTime();
                }
                if (r.from_date) return new Date(r.from_date).getTime();
                return 0;
              };
              return getReportTime(b) - getReportTime(a);
            });
            setFanbaseLatest(reports[0]);
          } else {
            setFanbaseLatest(null);
          }
        } catch (e) {
          console.warn('Could not load fanbase report:', e);
        }

        // Section 4: Load attendance details for Agency Presence Rating
        try {
          const [attSnap, allAttSnap] = await Promise.all([
            getDocs(query(collection(db, 'attendance'), where('attendeeIds', 'array-contains', host.id))),
            getDocs(collection(db, 'attendance'))
          ]);
          const presenceList = attSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          presenceList.sort((a: any, b: any) => {
            const getEvtTime = (x: any) => {
              if (x.eventDate) return new Date(x.eventDate).getTime();
              if (x.timestamp) return new Date(x.timestamp).getTime();
              return 0;
            };
            return getEvtTime(b) - getEvtTime(a);
          });
          setAttendedEvents(presenceList);
          setTotalAgencyEventsCount(allAttSnap.size);
        } catch (e) {
          console.warn('Could not load attendance logs:', e);
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
          const awardsData = await FirebaseService.getHostAwards(host.id);
          const sortedAwards = (awardsData || []).sort((a: any, b: any) => {
            const dateA = a.dateAwarded || a.awardedAt || '';
            const dateB = b.dateAwarded || b.awardedAt || '';
            return dateB.localeCompare(dateA);
          });
          setAwards(sortedAwards);
        } catch (e) { console.warn('Could not load awards:', e); }

        // Load active award assignments
        try {
          const assignSnap = await getDocs(query(collection(db, 'award_assignments'), where('hostId', '==', host.id)));
          const assignList: any[] = [];
          const activeList: any[] = [];
          const nowStr = new Date().toISOString().slice(0, 10);
          assignSnap.forEach(d => {
            const data = d.data();
            const item = { id: d.id, ...data };
            assignList.push(item);
            if (data.startDate && data.endDate && nowStr >= data.startDate && nowStr <= data.endDate) {
              activeList.push(item);
            }
          });
          setAssignedAwards(assignList);
          setActiveAwards(activeList);
        } catch (e) {
          console.warn('Could not load award assignments:', e);
        }

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
          .map(h => ({
            ...h,
            id: h.id || (h as any).poppoId || (h as any).poppo_id,
            name: h.nickname || h.name || h.id,
            photoUrl: h.photoUrl
          }));
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
            canvas.width = 1080;
            canvas.height = 1080;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              // Fill background with theme color #0D0D14
              ctx.fillStyle = '#0D0D14';
              ctx.fillRect(0, 0, 1080, 1080);

              // Calculate scale to fit original image entirely inside the 1080x1080 square box
              const scale = Math.min(1080 / img.width, 1080 / img.height);
              const drawWidth = img.width * scale;
              const drawHeight = img.height * scale;
              const x = (1080 - drawWidth) / 2;
              const y = (1080 - drawHeight) / 2;

              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, img.width, img.height, x, y, drawWidth, drawHeight);
            }
            resolve(canvas.toDataURL('image/jpeg', 0.8));
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
      await FirebaseService.logSystemActivity(`Submitted RPK report for Host: ${host.nickname || host.name} (Poppo ID: ${host.id}) - Period: ${rpkFormData.from_date} to ${rpkFormData.to_date} - Win %: ${rpkFormData.pk_wins_percent}, Points: ${rpkFormData.pk_points}, Sessions: ${rpkFormData.pk_sessions}`, 'Info');

      // Reload latest RPK report immediately from 'pk_reports'
      try {
        const pkSnap = await getDocs(
          query(
            collection(db, 'pk_reports'),
            where('poppo_id', '==', host.id)
          )
        );
        if (!pkSnap.empty) {
          const reports = pkSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          reports.sort((a: any, b: any) => {
            const getReportTime = (r: any) => {
              if (r.timestamp) return new Date(r.timestamp).getTime();
              if (r.from_date) return new Date(r.from_date).getTime();
              return 0;
            };
            return getReportTime(b) - getReportTime(a);
          });
          const latestRpk = reports[0];
          setPkData({
            win_percentage: parseFloat(latestRpk.pk_wins_percent) || parseFloat(latestRpk.win_percentage) || 0,
            pk_score: parseInt(latestRpk.pk_points) || parseInt(latestRpk.pk_score) || 0,
            sessions: parseInt(latestRpk.pk_sessions) || parseInt(latestRpk.sessions) || 0
          });
          setRpkMetadata({
            lastUpdated: latestRpk.timestamp || latestRpk.submittedAt,
            reporterRole: latestRpk.reporter_role || latestRpk.reporterRole || 'Staff',
            reporterName: latestRpk.reporter_name || latestRpk.reporterName || 'Unknown',
            reporterId: latestRpk.reporter_id || latestRpk.reporterId || 'Unknown'
          });
        }
      } catch (e) {
        console.warn('Could not reload RPK report:', e);
      }

      setIsRpkFormOpen(false);
      setRpkFormData({ from_date: '', to_date: '', pk_wins_percent: '', pk_points: '', pk_sessions: '' });
      alert("RPK Report submitted successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to submit RPK Report");
    } finally {
      setIsSubmittingRpk(false);
    }
  };

  // Submit Fanbase Report
  const handleFanbaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmittingFanbase(true);
    try {
      const currentAuth = Storage.getAuthState();
      const roleLower = String(currentAuth?.role || '').toLowerCase();
      const isElevatedStaff = ['admin', 'head admin', 'head_admin', 'director'].includes(roleLower);
      const isManagerAgent = ['manager', 'agent'].includes(roleLower);
      const isOwnProfile = String(currentAuth?.poppo_id) === String(host.id);
      const isAssignedManagerAgent = isManagerAgent && String(host.assignedManagerId) === String(currentAuth?.poppo_id);
      const canSubmit = isOwnProfile || isAssignedManagerAgent || isElevatedStaff;

      if (!canSubmit) {
        alert("You are not authorized to submit reports for this host.");
        setIsSubmittingFanbase(false);
        return;
      }

      const fromDateVal = isElevatedStaff ? fanbaseFormData.from_date : new Date().toISOString();
      const toDateVal = isElevatedStaff ? fanbaseFormData.to_date : new Date().toISOString();

      if (!fromDateVal || !toDateVal) {
        alert("From Date and To Date are required.");
        setIsSubmittingFanbase(false);
        return;
      }

      const reportData = {
        // snake_case fields for subcollection schema
        reporter_id: currentAuth?.poppo_id || "Unknown",
        reporter_name: currentAuth?.name || currentAuth?.nickname || "Unknown",
        reporter_role: currentAuth?.role || "Unknown",
        poppo_id: host.id,
        nickname: host.nickname || host.name,
        from_date: fromDateVal,
        to_date: toDateVal,
        total_followers: parseFloat(fanbaseFormData.total_followers) || 0,
        fanclub_subscribers: parseFloat(fanbaseFormData.fanclub_subscribers) || 0,
        fanclub_gc_members: parseFloat(fanbaseFormData.fanclub_gc_members) || 0,
        gc_activity_count_host: isElevatedStaff ? (parseFloat(fanbaseFormData.gc_activity_count_host) || 0) : 0,
        gc_activity_count_fans: isElevatedStaff ? (parseFloat(fanbaseFormData.gc_activity_count_fans) || 0) : 0,
        notes: fanbaseFormData.notes,

        // camelCase fields for top-level schema compatibility
        reporterId: currentAuth?.poppo_id || "Unknown",
        reporterName: currentAuth?.name || currentAuth?.nickname || "Unknown",
        reporterRole: currentAuth?.role || "Unknown",
        poppoId: host.id,
        currentFollowers: parseFloat(fanbaseFormData.total_followers) || 0,
        fanclubSubscribers: parseFloat(fanbaseFormData.fanclub_subscribers) || 0,
        fanclubGcMembers: parseFloat(fanbaseFormData.fanclub_gc_members) || 0,
        gcUpdatesHost: isElevatedStaff ? (parseFloat(fanbaseFormData.gc_activity_count_host) || 0) : 0,
        gcUpdatesFans: isElevatedStaff ? (parseFloat(fanbaseFormData.gc_activity_count_fans) || 0) : 0,
        fromDate: fromDateVal,
        toDate: toDateVal,
        submittedAt: new Date().toISOString()
      };

      await FirebaseService.submitFanbaseReport(host.id, fromDateVal, toDateVal, reportData);
      await FirebaseService.logSystemActivity(`Submitted codebase fanbase report for Host: ${host.nickname || host.name} (Poppo ID: ${host.id}) - Period: ${fromDateVal} to ${toDateVal} - Followers: ${fanbaseFormData.total_followers}, Subscribers: ${fanbaseFormData.fanclub_subscribers}, GC Members: ${fanbaseFormData.fanclub_gc_members}`, 'Info');

      // Reload latest fanbase report immediately from 'fanbase_reports'
      try {
        const fanbaseSnap = await getDocs(
          query(
            collection(db, 'fanbase_reports'),
            where('poppo_id', '==', host.id)
          )
        );
        if (!fanbaseSnap.empty) {
          const reports = fanbaseSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          reports.sort((a: any, b: any) => {
            const getReportTime = (r: any) => {
              if (r.timestamp) return new Date(r.timestamp).getTime();
              if (r.from_date) return new Date(r.from_date).getTime();
              return 0;
            };
            return getReportTime(b) - getReportTime(a);
          });
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
    } catch (err) {
      console.error(err);
      alert("Failed to submit Fanbase Report");
    } finally {
      setIsSubmittingFanbase(false);
    }
  };

  // Save host profile edits (both public self-profile and administrative fields if Director/Head Admin)
  const handleSaveSelf = async () => {
    const currentAuth = Storage.getAuthState();
    const isOwnProfile = currentAuth.poppo_id === host.id;
    const userRoleLower = String(currentAuth?.role || '').toLowerCase();
    const isDirectorOrHeadAdmin = ['director', 'head admin', 'head_admin'].includes(userRoleLower);

    if (!isOwnProfile && !isDirectorOrHeadAdmin) {
      alert("Unauthorized: Only the host themselves through their profile page, director, or head admin can edit profile info.");
      return;
    }

    setIsSavingSelf(true);
    try {
      const truncatedBio = selfBio.slice(0, 100);
      let updatedHost: Host;

      const updatedFields: Record<string, any> = {};

      if (isDirectorOrHeadAdmin) {
        const selectedMgr = managersList.find(m => m.name === editManager);
        const assignedManagerId = selectedMgr ? selectedMgr.id : null;
        updatedFields.nickname = editNickname.trim();
        updatedFields.role = editRole;
        updatedFields.manager = editManager;
        updatedFields.assignedManagerId = assignedManagerId;
        updatedFields.status = editStatus;
        updatedFields.teamAnchor = editTeam;
      }

      if (isOwnProfile || isDirectorOrHeadAdmin) {
        updatedFields.photoUrl = editPhotoUrl;
        updatedFields.tier_pay = editBaseSalaryCategory;
        updatedFields.bio = truncatedBio;
        updatedFields.description = truncatedBio;
        updatedFields.social_links = { ig: selfSocialIg, tiktok: selfSocialTk, fb: selfSocialFb, whatsapp: selfSocialWa };
        updatedFields.streaming_hours = selfStreamSlots.filter(s => s.from && s.to);
      }

      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error("Unable to retrieve authentication token. Please re-login.");
      }

      const res = await fetch('/api/admin/update-host-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          hostId: host.id,
          updatedFields
        })
      });
      if (!res.ok) {
        let errMsg = "Failed to update profile.";
        try {
          const resData = await res.clone().json();
          errMsg = resData.error || errMsg;
        } catch (parseErr) {
          try {
            const text = await res.clone().text();
            if (text) errMsg = text;
          } catch (e) { }
        }
        showToast('error', errMsg);
        console.error(`[UpdateProfile Error] HTTP ${res.status}: ${errMsg}`);
        throw new Error(errMsg);
      }
      try {
        const resData = await res.clone().json();
        console.log("[UpdateProfile Success] Response data:", resData);
      } catch (e) { }

      updatedHost = {
        ...host,
        ...updatedFields,
        nickname: updatedFields.nickname !== undefined ? updatedFields.nickname : host.nickname,
        name: updatedFields.nickname !== undefined ? updatedFields.nickname : host.name,
        photoUrl: updatedFields.photoUrl !== undefined ? updatedFields.photoUrl : host.photoUrl,
        bio: updatedFields.bio !== undefined ? updatedFields.bio : host.bio,
        description: updatedFields.description !== undefined ? updatedFields.description : host.description,
        role: updatedFields.role !== undefined ? updatedFields.role as any : host.role,
        teamAnchor: updatedFields.teamAnchor !== undefined ? updatedFields.teamAnchor : host.teamAnchor,
        manager: updatedFields.manager !== undefined ? updatedFields.manager : host.manager,
        assignedManagerId: updatedFields.assignedManagerId !== undefined ? updatedFields.assignedManagerId : host.assignedManagerId,
        tier_pay: updatedFields.tier_pay !== undefined ? updatedFields.tier_pay as any : host.tier_pay,
        status: updatedFields.status !== undefined ? updatedFields.status as any : host.status,
        social_links: updatedFields.social_links !== undefined ? updatedFields.social_links : host.social_links,
        streaming_hours: updatedFields.streaming_hours !== undefined ? updatedFields.streaming_hours : host.streaming_hours,
        updated_at: new Date().toISOString()
      };

      showToast('success', "Profile updated successfully!");

      if (isDirectorOrHeadAdmin) {
        await FirebaseService.logSystemActivity(`Admin/Director edited profile metadata/info for Host: ${host.nickname || host.name} (Poppo ID: ${host.id}) - Fields: ${JSON.stringify(updatedFields)}`, 'Warning');
      } else {
        await FirebaseService.logSystemActivity(`Host edited self profile public info (Poppo ID: ${host.id}) - Fields: ${JSON.stringify(updatedFields)}`, 'Info');
      }

      // Update auth state if editing own profile
      if (currentAuth.poppo_id === host.id) {
        const newAuth = {
          ...currentAuth,
          name: updatedHost.nickname || updatedHost.name,
          nickname: updatedHost.nickname || updatedHost.name,
          profile_photo: updatedHost.photoUrl,
          bio: updatedHost.bio,
          anchor_team: updatedHost.teamAnchor || updatedHost.team || ''
        };
        Storage.setAuthState(newAuth);
      }

      setIsSelfEditing(false);
      if (onProfileUpdated) onProfileUpdated();
    } catch (err) {
      console.error('Failed to save profile:', err);
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

      await setDoc(doc(db, 'attendance', eventId), newEvent);
      await FirebaseService.logSystemActivity(`Added livehouse event details for Host: ${host.nickname || host.name} (Poppo ID: ${host.id}) - Date: ${eventFormData.eventDate}, Timeslot: ${eventFormData.timeslot}, Type: ${eventFormData.eventType}, Desc: "${eventFormData.description}"`, 'Info');

      // Refresh participated events list
      const [eventsSnap1, eventsSnap2] = await Promise.all([
        getDocs(query(collection(db, 'attendance'), where('participantIds', 'array-contains', host.id))),
        getDocs(query(collection(db, 'attendance'), where('participants', 'array-contains', host.id)))
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
        eventType: 'SOLO LIVEHOUSE',
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

  // Available years from reports
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(performanceReports.map(r => String(r.year)).filter(Boolean)));
    return years.sort().reverse();
  }, [performanceReports]);

  // Filtered performance reports based on analyticsYear & analyticsMonth selectors
  const filteredReports = useMemo(() => {
    return performanceReports.filter(r => {
      if (analyticsYear !== 'all' && String(r.year) !== analyticsYear) return false;
      if (analyticsMonth !== 'all' && String(r.monthName) !== analyticsMonth) return false;
      return true;
    });
  }, [performanceReports, analyticsYear, analyticsMonth]);

  const selectedMetrics = useMemo(() => {
    const sum = (fn: (r: any) => number) => filteredReports.reduce((s, r) => s + fn(r), 0);
    const liveHrs = sum(r => getLiveHoursForReport(r));
    const partyHrs = sum(r => pf(r, 'partyHostDurationMinutes', 'party_host_duration_minutes', 'partyHostDuration', 'partyDuration') / 60);
    const points = sum(r => pf(r, 'totalEarningsOfPoints', 'total_earnings_of_points', 'totalPoints', 'total_points', 'points'));
    const liveEarnings = sum(r => pf(r, 'liveEarnings', 'live_earnings'));
    const partyEarnings = sum(r => pf(r, 'partyEarnings', 'party_earnings'));
    const privateChat = sum(r => pf(r, 'privateChatEarnings', 'private_chat_earnings', 'privateChat'));
    const tips = sum(r => pf(r, 'tips'));
    const platformReward = sum(r => pf(r, 'platformReward', 'platform_reward'));
    const otherEarnings = sum(r => pf(r, 'otherEarnings', 'other_earnings'));
    const platformHourly = sum(r => pf(r, 'platformHourlySalary', 'platform_hourly_salary'));
    const superSalary = sum(r => pf(r, 'superSalary', 'super_salary'));
    const superRank = sum(r => pf(r, 'superRank', 'super_rank'));

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
  }, [filteredReports]);

  // Sort performance reports chronologically
  const sortedReportsForRender = useMemo(() => {
    const MONTH_ORDER = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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

      const perfTotals = performanceReports.reduce((acc, r) => {
        acc.liveEarnings += Number(r.earningsBreakdown?.liveEarnings || r.liveEarnings || r.live_earnings || 0);
        acc.partyEarnings += Number(r.earningsBreakdown?.partyEarnings || r.partyEarnings || r.party_earnings || 0);
        acc.points += Number(r.earningsBreakdown?.totalEarningsOfPoints || r.totalEarningsOfPoints || r.total_points || 0);
        acc.liveHrs += Number(r.liveDurationMinutes ? r.liveDurationMinutes / 60 : (r.liveDuration || 0));
        return acc;
      }, { liveEarnings: 0, partyEarnings: 0, points: 0, liveHrs: 0 });
      perfTotals.liveHrs = parseFloat(perfTotals.liveHrs.toFixed(1));

      const prompt = `You are an AI analyst and mentor for Nine Talent Management, a live streaming agency.
Analyze the following host data and write a performance report addressed DIRECTLY to the host. Use the second-person perspective ("you", "your", "yours") throughout the entire response. Do not use third-person (e.g. "this host", "she", "he", "their", "Miss Nine").

Return EXACTLY three sections with these exact labels on their own lines:
[SUMMARY]
[JOURNEY]
[RECOMMENDATIONS]

Host: ${host.nickname || host.name} (Poppo ID: ${host.id})
Status: ${host.status || 'Unknown'} | Level: ${host.level || 1}
Role: ${host.role || 'Host'} | Manager: ${host.manager || 'N/A'} | Team Anchor: ${host.teamAnchor || host.team || 'N/A'}
Total Live Earnings: ${perfTotals.liveEarnings.toLocaleString()} | Party Earnings: ${perfTotals.partyEarnings.toLocaleString()}
Total Points Earned (all time): ${perfTotals.points.toLocaleString()}
Live Hours (all time): ${perfTotals.liveHrs}h
Events Participated: ${participatedEvents.length}
PK Win Rate: ${pkData.win_percentage}% over ${pkData.sessions} sessions
Fanbase: ${fanbaseLatest ? `${fanbaseLatest.total_followers || 0} followers, ${fanbaseLatest.fanclub_subscribers || 0} FC subs, ${fanbaseLatest.fanclub_gc_members || 0} GC members` : 'No fanbase data'}
Monthly Performance (last 6): ${JSON.stringify(last6)}

[SUMMARY] Write a 2-3 sentence performance summary addressed directly to you (the host) using "you" and "your". Be specific, supportive, and data-driven. If there are no performance records or fanbase records, or if there is not enough historical data (e.g., less than 3 monthly records), you MUST explicitly note in this summary that you (the host) should submit more data now to get a deep dive analysis.
[JOURNEY] Write a 2-3 sentence narrative about your career journey and growth trajectory, addressed directly to you (the host).
[RECOMMENDATIONS] List 3-5 specific, actionable recommendations and suggestions addressed directly to you (the host) to help you improve. Use "• " prefix for each.`;

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
      await FirebaseService.logSystemActivity(`Generated AI performance review report for Host: ${host.nickname || host.name} (Poppo ID: ${host.id}) - Report ID: ${reportId}`, 'Info');

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
      await FirebaseService.logSystemActivity(`Posted shared AI performance review report to Host profile page: Host: ${host.nickname || host.name} (Poppo ID: ${host.id}) - Report ID: ${reportToPost.reportId}`, 'Info');
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
  const trendChartData = useMemo(() => {
    const MONTH_ORDER = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
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
          points: pf(r, 'totalEarningsOfPoints', 'total_earnings_of_points', 'totalPoints', 'total_points', 'points'),
          live_duration: getLiveHoursForReport(r)
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
    // Row 1
    {
      label: 'TOTAL EARNINGS',
      value: selectedMetrics.totalEarnings,
      bgGradient: 'linear-gradient(to bottom right, #3A2A18, #221A15)',
      accentColor: '#FFB800',
      hoverBorder: 'hover:border-[#FFB800]/50',
      fmt: (v: number) => v ? v.toLocaleString() : '0'
    },
    {
      label: 'TOTAL POINTS',
      value: selectedMetrics.points,
      bgGradient: 'linear-gradient(to bottom right, #3D221C, #221515)',
      accentColor: '#FF7B00',
      hoverBorder: 'hover:border-[#FF7B00]/50',
      fmt: (v: number) => v ? v.toLocaleString() : '0'
    },
    {
      label: 'TOTAL INCENTIVES',
      value: selectedMetrics.superRank + selectedMetrics.superSalary,
      bgGradient: 'linear-gradient(to bottom right, #3A1C28, #20131A)',
      accentColor: '#FF3B5C',
      hoverBorder: 'hover:border-[#FF3B5C]/50',
      fmt: (v: number) => v ? v.toLocaleString() : '0'
    },
    // Row 2
    {
      label: 'SOLO LIVE POINTS',
      value: selectedMetrics.liveEarnings,
      bgGradient: 'linear-gradient(to bottom right, #3A2A18, #221A15)',
      accentColor: '#FFB800',
      hoverBorder: 'hover:border-[#FFB800]/50',
      fmt: (v: number) => v ? v.toLocaleString() : '0'
    },
    {
      label: 'PARTY LIVE POINTS',
      value: selectedMetrics.partyEarnings,
      bgGradient: 'linear-gradient(to bottom right, #3D221C, #221515)',
      accentColor: '#FF7B00',
      hoverBorder: 'hover:border-[#FF7B00]/50',
      fmt: (v: number) => v ? v.toLocaleString() : '0'
    },
    {
      label: 'TIPS',
      value: selectedMetrics.tips,
      bgGradient: 'linear-gradient(to bottom right, #3A1C28, #20131A)',
      accentColor: '#FF3B5C',
      hoverBorder: 'hover:border-[#FF3B5C]/50',
      fmt: (v: number) => v ? v.toLocaleString() : '0'
    },
    // Row 3
    {
      label: 'SUPER RANK',
      value: selectedMetrics.superRank,
      bgGradient: 'linear-gradient(to bottom right, #3A2A18, #221A15)',
      accentColor: '#FFB800',
      hoverBorder: 'hover:border-[#FFB800]/50',
      fmt: (v: number) => v ? v.toLocaleString() : '0'
    },
    {
      label: 'SUPER SALARY',
      value: selectedMetrics.superSalary,
      bgGradient: 'linear-gradient(to bottom right, #3D221C, #221515)',
      accentColor: '#FF7B00',
      hoverBorder: 'hover:border-[#FF7B00]/50',
      fmt: (v: number) => v ? v.toLocaleString() : '0'
    },
    {
      label: 'OTHER EARNINGS',
      value: selectedMetrics.otherEarnings,
      bgGradient: 'linear-gradient(to bottom right, #3A1C28, #20131A)',
      accentColor: '#FF3B5C',
      hoverBorder: 'hover:border-[#FF3B5C]/50',
      fmt: (v: number) => v ? v.toLocaleString() : '0'
    },
    // Row 4
    {
      label: 'TOTAL HOURS',
      value: selectedMetrics.liveHrs + selectedMetrics.partyHrs,
      bgGradient: 'linear-gradient(to bottom right, #3A2A18, #221A15)',
      accentColor: '#FFB800',
      hoverBorder: 'hover:border-[#FFB800]/50',
      fmt: (v: number) => v ? `${v.toFixed(1)}h` : '0.0h'
    },
    {
      label: 'SOLO LIVE HOURS',
      value: selectedMetrics.liveHrs,
      bgGradient: 'linear-gradient(to bottom right, #3D221C, #221515)',
      accentColor: '#FF7B00',
      hoverBorder: 'hover:border-[#FF7B00]/50',
      fmt: (v: number) => v ? `${v.toFixed(1)}h` : '0.0h'
    },
    {
      label: 'PARTY LIVE HOURS',
      value: selectedMetrics.partyHrs,
      bgGradient: 'linear-gradient(to bottom right, #3A1C28, #20131A)',
      accentColor: '#FF3B5C',
      hoverBorder: 'hover:border-[#FF3B5C]/50',
      fmt: (v: number) => v ? `${v.toFixed(1)}h` : '0.0h'
    },
  ];

  const renderPerformanceMetricsAndDiversity = () => {
    if (performanceReports.length === 0) return null;
    return (
      <div className={cn("space-y-4 bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 p-5 rounded-3xl transition-all duration-300 hover:border-[#D4AF37]/50 group", styles.shadow)}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 pb-2 border-b border-white/5">
          {/* Tab Switcher on the left */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 self-start">
            <button
              type="button"
              onClick={() => setPerfActiveTab('metrics')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                perfActiveTab === 'metrics'
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                  : "text-white/40 hover:text-white/70 border border-transparent"
              )}
            >
              PERFORMANCE METRICS
            </button>
            <button
              type="button"
              onClick={() => setPerfActiveTab('diversity')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer",
                perfActiveTab === 'diversity'
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                  : "text-white/40 hover:text-white/70 border border-transparent"
              )}
            >
              EARNINGS DIVERSITY
            </button>
          </div>

          {/* Right side controls depending on active tab */}
          <div className="flex items-center gap-2 relative z-10 self-end sm:self-center">
            {perfActiveTab === 'metrics' ? (
              <>
                <select
                  title="Filter by Year"
                  value={analyticsYear}
                  onChange={e => setAnalyticsYear(e.target.value)}
                  className="bg-[#0D0D14] border border-[#D4AF37]/20 rounded-lg px-3 py-1.5 text-xs font-bold text-[#F0EFE8] outline-none focus:border-[#D4AF37] cursor-pointer shadow-inner transition-all hover:border-[#D4AF37]/50"
                >
                  <option value="all">All Years</option>
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select
                  title="Filter by Month"
                  value={analyticsMonth}
                  onChange={e => setAnalyticsMonth(e.target.value)}
                  className="bg-[#0D0D14] border border-[#D4AF37]/20 rounded-lg px-3 py-1.5 text-xs font-bold text-[#F0EFE8] outline-none focus:border-[#D4AF37] cursor-pointer shadow-inner transition-all hover:border-[#D4AF37]/50"
                >
                  <option value="all">All Months</option>
                  {MONTH_ORDER.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSortAscending(prev => !prev)}
                  className="p-1.5 bg-[#0D0D14] hover:bg-white/5 border border-amber-500/20 hover:border-amber-500/40 rounded-lg text-[#A09E9A] hover:text-amber-400 transition-all cursor-pointer shadow-sm flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"
                  title="Toggle Chronological Sort"
                >
                  <ArrowUpDown size={12} className="text-amber-400" />
                  Sort
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Panel */}
        <div className="transition-all duration-300">
          {perfActiveTab === 'metrics' ? (
            <div className="grid grid-cols-3 gap-3 pt-1">
              {earningTiles.map((tile, i) => {
                const valStr = tile.fmt(tile.value);
                const textClass = valStr.length > 10
                  ? "text-xs sm:text-sm md:text-base"
                  : valStr.length > 7
                    ? "text-sm sm:text-base md:text-lg"
                    : "text-base sm:text-lg md:text-xl";
                return (
                  <div
                    key={i}
                    ref={el => { if (el) el.style.background = tile.bgGradient; }}
                    className={cn(
                      "border border-white/5 p-3 sm:p-4.5 rounded-2xl flex flex-col items-center justify-center text-center min-h-[90px] transition-all duration-300 transform group-hover:translate-y-[-2px] shadow-lg gap-1.5",
                      tile.hoverBorder
                    )}
                  >
                    <span className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-white/50 uppercase tracking-widest leading-tight">
                      {tile.label}
                    </span>
                    <span
                      ref={el => { if (el) el.style.color = tile.accentColor; }}
                      className={cn("font-black tracking-tight drop-shadow-md", textClass)}
                    >
                      {valStr}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto pt-1 custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-amber-500/20 text-amber-400/90 font-black uppercase tracking-wider text-[8.5px]">
                    <th className="py-2.5 px-2">Period</th>
                    <th className="py-2.5 px-2 text-right">Live Earnings</th>
                    <th className="py-2.5 px-2 text-right">Party Earnings</th>
                    <th className="py-2.5 px-2 text-right">Platform Reward</th>
                    <th className="py-2.5 px-2 text-right">Tips</th>
                    <th className="py-2.5 px-2 text-right">Other</th>
                    <th className="py-2.5 px-2 text-right">Super Rank</th>
                    <th className="py-2.5 px-2 text-right">Super Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[#F0EFE8]">
                  {sortedReportsForRender.length > 0 ? (
                    sortedReportsForRender.map((r, i) => (
                      <tr key={i} className="hover:bg-amber-500/5 hover:text-amber-200 transition-colors text-[10.5px]">
                        <td className="py-3 px-2 font-bold capitalize whitespace-nowrap">{formatPeriodShort(r.monthName || r.month, r.year)}</td>
                        <td className="py-3 px-2 text-right font-mono text-[#FFB800]">{pf(r, 'liveEarnings', 'live_earnings').toLocaleString()}</td>
                        <td className="py-3 px-2 text-right font-mono text-[#FF7B00]">{pf(r, 'partyEarnings', 'party_earnings').toLocaleString()}</td>
                        <td className="py-3 px-2 text-right font-mono text-[#FF3B5C]">{pf(r, 'platformReward', 'platform_reward').toLocaleString()}</td>
                        <td className="py-3 px-2 text-right font-mono text-[#FFB800]">{pf(r, 'tips').toLocaleString()}</td>
                        <td className="py-3 px-2 text-right font-mono text-[#A09E9A]">{pf(r, 'otherEarnings', 'other_earnings').toLocaleString()}</td>
                        <td className="py-3 px-2 text-right font-mono text-[#FF7B00]">{pf(r, 'superRank', 'super_rank').toLocaleString()}</td>
                        <td className="py-3 px-2 text-right font-mono text-[#FFB800]">{pf(r, 'superSalary', 'super_salary').toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-amber-400/30 italic font-medium">No historical performance records found in database.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMonthlyTrend = () => {
    if (trendChartData.length === 0) return null;

    return (
      <div className={cn("space-y-4 bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 p-5 rounded-3xl transition-all duration-300 hover:border-[#D4AF37]/50 group", styles.shadow)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm shadow-inner">📊</div>
            <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8]">Points & Duration Trend</h4>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
          {/* Legend */}
          <div className="flex gap-3 text-[9px] font-black uppercase tracking-widest">
            <span className="text-[#D4AF37] drop-shadow-sm">● Points</span>
            <span className="text-[#06b6d4] drop-shadow-sm">● Live Hours</span>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setTrendChartViewMode('area')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                trendChartViewMode === 'area'
                  ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                  : "text-white/40 hover:text-white/70 border border-transparent"
              )}
            >
              Area
            </button>
            <button
              type="button"
              onClick={() => setTrendChartViewMode('bar')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer",
                trendChartViewMode === 'bar'
                  ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                  : "text-white/40 hover:text-white/70 border border-transparent"
              )}
            >
              Bar
            </button>
          </div>
        </div>

        <div className="h-48 w-full mt-4">
          {trendChartViewMode === 'area' ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis
                  dataKey="label"
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
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="points"
                  name="Points"
                  stroke="#D4AF37"
                  strokeWidth={2}
                  fill="url(#colorPoints)"
                  activeDot={{ r: 6, fill: '#D4AF37', stroke: '#F0EFE8', strokeWidth: 2 }}
                  animationDuration={1000}
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
                  animationDuration={1000}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis
                  dataKey="label"
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
                  contentStyle={{ backgroundColor: '#13131E', borderColor: '#ffffff20', borderRadius: '12px', fontSize: '10px', fontStyle: 'normal', fontWeight: 'bold' }}
                  itemStyle={{ color: '#F0EFE8' }}
                  labelStyle={{ color: '#D4AF37', marginBottom: '4px' }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="points"
                  name="Points"
                  fill="#D4AF37"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  animationDuration={1000}
                />
                <Bar
                  yAxisId="right"
                  dataKey="live_duration"
                  name="Live Duration"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  animationDuration={1000}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  };

  const renderSelfEditModal = () => {
    if (!isSelfEditing) return null;
    const currentAuth = Storage.getAuthState();
    const isOwnProfile = currentAuth.poppo_id === host.id;
    const userRoleLower = String(currentAuth?.role || '').toLowerCase();
    const isDirectorOrHeadAdmin = ['director', 'head admin', 'head_admin'].includes(userRoleLower);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-[#13131E] border border-white/10 rounded-2xl w-full p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto transition-all duration-300 max-w-lg">
          <button
            title="Close"
            onClick={() => setIsSelfEditing(false)}
            className="absolute top-4 right-4 p-1.5 bg-[#1A1A28] border border-white/10 rounded-full text-[#A09E9A] hover:text-[#F0EFE8] cursor-pointer"
          >
            <X size={14} />
          </button>

          <h3 className="text-sm font-black uppercase tracking-wider text-[#F0EFE8] mb-0.5">
            Edit Host Profile
          </h3>
          <p className="text-[10px] text-[#A09E9A] mb-4">
            Update administrative fields (Director/Head Admin only) or public profile settings (Profile owner only).
          </p>

          <div className="space-y-4">
            {/* 1. Administrative Fields Section */}
            <div className="bg-black/40 border border-white/5 p-4 rounded-xl space-y-3">
              <div className="border-b border-white/5 pb-1 flex justify-between items-center">
                <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-wider">Administrative Fields</span>
                {!isDirectorOrHeadAdmin && (
                  <span className="text-[7.5px] font-black text-[#A09E9A]/50 uppercase tracking-widest border border-white/10 px-1.5 py-0.5 rounded bg-white/5">Read-Only</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest block">Nickname</label>
                  <input
                    type="text"
                    title="Nickname"
                    placeholder="Nickname"
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-[#F0EFE8] outline-none focus:border-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                    disabled={!isDirectorOrHeadAdmin}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest block">Role</label>
                  <select
                    title="Role"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!isDirectorOrHeadAdmin}
                  >
                    {['Host', 'Manager', 'Admin', 'Agent']
                      .concat(host.role === 'Director' ? ['Director'] : [])
                      .map(r => (
                        <option key={r} value={r} className="bg-[#1A1A28] text-[#F0EFE8]">{r}</option>
                      ))
                    }
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest block">Assigned Manager</label>
                  <select
                    title="Assigned Manager"
                    value={editManager}
                    onChange={(e) => setEditManager(e.target.value)}
                    className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!isDirectorOrHeadAdmin}
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
                  <label className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest block">Team Anchor</label>
                  <input
                    type="text"
                    title="Team Anchor"
                    placeholder="Team Anchor"
                    value={editTeam}
                    onChange={(e) => setEditTeam(e.target.value)}
                    className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!isDirectorOrHeadAdmin}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest block">Status</label>
                  <select
                    title="Status"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className={cn(
                      "w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#D4AF37] font-bold disabled:opacity-50 disabled:cursor-not-allowed",
                      editStatus === 'Active' ? "text-emerald-400" : "text-[#F0EFE8]"
                    )}
                    disabled={!isDirectorOrHeadAdmin}
                  >
                    {['Active', 'Intermittent', 'Released', 'Inactive'].map(s => (
                      <option key={s} value={s} className="bg-[#1A1A28] text-[#F0EFE8]">{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 2. Profile Details & Pay Tier (Owner or Admin) */}
            <div className="bg-black/20 border border-white/5 p-4 rounded-xl space-y-3">
              <div className="border-b border-white/5 pb-1 flex justify-between items-center">
                <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-wider">Profile Info &amp; Pay Tier</span>
                {!isOwnProfile && !isDirectorOrHeadAdmin && (
                  <span className="text-[7.5px] font-black text-[#A09E9A]/50 uppercase tracking-widest border border-white/10 px-1.5 py-0.5 rounded bg-white/5">Read-Only</span>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest block">Photo Upload &amp; URL</label>
                <div className="flex gap-2 items-center">
                  <label className={cn("px-3 py-2 bg-[#222235] border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-wider text-[#F0EFE8] whitespace-nowrap", !isOwnProfile && !isDirectorOrHeadAdmin ? "opacity-50 cursor-not-allowed pointer-events-none" : "hover:bg-[#2A2A3F] cursor-pointer")}>
                    {isProcessingPhoto ? 'Uploading...' : 'Choose File'}
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={!isOwnProfile && !isDirectorOrHeadAdmin} />
                  </label>
                  <input
                    type="text"
                    placeholder="Or paste photo URL..."
                    value={editPhotoUrl}
                    onChange={(e) => setEditPhotoUrl(e.target.value)}
                    className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!isOwnProfile && !isDirectorOrHeadAdmin}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black text-[#A09E9A] uppercase tracking-widest block">Tier Pay</label>
                <select
                  title="Tier Pay"
                  value={editBaseSalaryCategory}
                  onChange={(e) => setEditBaseSalaryCategory(e.target.value)}
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!isOwnProfile && !isDirectorOrHeadAdmin}
                >
                  {BASE_SALARY_POLICIES.map(policy => (
                    <option key={policy} value={policy} className="bg-[#1A1A28] text-[#F0EFE8]">{policy}</option>
                  ))}
                </select>
              </div>
            </div>

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
                className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!isOwnProfile && !isDirectorOrHeadAdmin}
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
                      className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!isOwnProfile && !isDirectorOrHeadAdmin}
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
                {(isOwnProfile || isDirectorOrHeadAdmin) && selfStreamSlots.length < 2 && (
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
                    className="flex-1 bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!isOwnProfile && !isDirectorOrHeadAdmin}
                  />
                  <span className="text-[#A09E9A]/40 text-xs">→</span>
                  <input
                    type="text" value={slot.to}
                    onChange={e => { const s = [...selfStreamSlots]; s[idx] = { ...s[idx], to: e.target.value }; setSelfStreamSlots(s); }}
                    placeholder="To (e.g. 10:00 PM)"
                    className="flex-1 bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37] disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!isOwnProfile && !isDirectorOrHeadAdmin}
                  />
                  {(isOwnProfile || isDirectorOrHeadAdmin) && selfStreamSlots.length > 1 && (
                    <button type="button" title="Remove Slot" onClick={() => setSelfStreamSlots(selfStreamSlots.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 cursor-pointer">
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button onClick={() => setIsSelfEditing(false)} className="flex-1 py-2.5 bg-black/40 border border-white/10 text-[#A09E9A] rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-[#222235] transition-all cursor-pointer">
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



  // Helper to render social icons with hover state transitions and muted/grayed-out state if empty
  const renderSocialIcon = ({ type, url, icon, label, colorClass }: {
    type: string;
    url?: string;
    icon: React.ReactNode;
    label: string;
    colorClass: string;
  }) => {
    const hasLink = !!url && String(url).trim() !== '';
    let linkUrl = '';

    if (hasLink) {
      const trimmed = String(url).trim();
      if (type === 'instagram') {
        linkUrl = trimmed.startsWith('http') ? trimmed : `https://instagram.com/${trimmed.replace('@', '')}`;
      } else if (type === 'tiktok') {
        linkUrl = trimmed.startsWith('http') ? trimmed : `https://tiktok.com/@${trimmed.replace('@', '')}`;
      } else if (type === 'facebook') {
        linkUrl = trimmed.startsWith('http') ? trimmed : `https://facebook.com/${trimmed}`;
      } else if (type === 'whatsapp') {
        const phone = trimmed.replace(/[^0-9+]/g, '');
        linkUrl = phone.startsWith('+') ? `https://wa.me/${phone.replace('+', '')}` : `https://wa.me/${phone}`;
      }
    }

    if (!hasLink) {
      return (
        <div
          className="w-9 h-9 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-[#A09E9A]/20 cursor-not-allowed transition-all duration-300"
          title={`${label} (Not linked)`}
        >
          {icon}
        </div>
      );
    }

    return (
      <a
        href={linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center transition-all duration-300 shadow-md cursor-pointer",
          colorClass
        )}
        title={`Visit ${label}: ${url}`}
      >
        {icon}
      </a>
    );
  };

  const renderIdentityCard = () => {
    const currentAuth = Storage.getAuthState();
    const isOwnProfile = currentAuth.poppo_id === host.id;
    const userRoleLower = String(currentAuth?.role || '').toLowerCase();
    const isDirectorOrHeadAdmin = ['director', 'head admin', 'head_admin'].includes(userRoleLower);

    const now = new Date();
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lastMonthVal = now.getMonth() === 0 ? 12 : now.getMonth();
    const lastMonthStr = `${lastMonthYear}-${String(lastMonthVal).padStart(2, '0')}`;
    const lastMonthAwards = assignedAwards.filter(a => a.startDate && a.startDate.startsWith(lastMonthStr));

    return (
      <div className={cn("bg-[#1A140A]/80 backdrop-blur-xl border-2 border-[#D4AF37]/30 shadow-[0_0_20px_rgba(212,175,55,0.15)] rounded-3xl overflow-hidden flex flex-col relative group/card transition-all duration-300 border-t-[#D4AF37] border-t-2")}>

        {/* Full-width square profile photo acting as a header banner */}
        <div className="w-full aspect-square relative bg-black">
          {isProcessingPhoto && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
              <Loader2 size={24} className="animate-spin text-[#D4AF37]" />
            </div>
          )}
          {editPhotoUrl ? (
            <img src={editPhotoUrl} alt={host.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-7xl text-[#A09E9A] font-black bg-gradient-to-br from-black/80 to-black">
              {editNickname?.[0]?.toUpperCase() || host.name?.[0] || 'JD'}
            </div>
          )}

          {/* Top Overlay (17% total height, top 12% is solid black, remaining 5% fades) */}
          <div className="absolute top-0 inset-x-0 h-[17%] pointer-events-none profile-top-overlay" />

          {/* Bottom Overlay (30% total height, bottom 20% is solid black, remaining 10% fades) */}
          <div className="absolute bottom-0 inset-x-0 h-[30%] pointer-events-none profile-bottom-overlay" />

          {/* Faded gradient overlay at the bottom 25% to merge with profile block */}
          <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black via-black/60 to-transparent z-10" />

          {/* Absolute positioned last month's awards overlaying the image top-left */}
          {lastMonthAwards.length > 0 && (
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 max-w-[60%] pointer-events-auto">
              {lastMonthAwards.map((a: any) => {
                let badgeColorStyle = 'border-amber-500 text-amber-200 bg-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.8)]';
                if (a.awardColor === 'Purple') badgeColorStyle = 'border-purple-500 text-purple-200 bg-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.8)]';
                else if (a.awardColor === 'Emerald') badgeColorStyle = 'border-emerald-500 text-emerald-200 bg-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.8)]';
                else if (a.awardColor === 'Blue') badgeColorStyle = 'border-blue-500 text-blue-200 bg-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.8)]';
                else if (a.awardColor === 'Red') badgeColorStyle = 'border-red-500 text-red-200 bg-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.8)]';
                else if (a.awardColor === 'Orange') badgeColorStyle = 'border-orange-500 text-orange-200 bg-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.8)]';

                return (
                  <span
                    key={a.id}
                    className={cn(
                      "text-[9px] font-black uppercase tracking-wider leading-tight px-3 py-1.5 rounded-xl border backdrop-blur-md truncate block max-w-full text-white text-center z-10",
                      badgeColorStyle
                    )}
                    title={`Last Month's Award: ${a.awardName}`}
                  >
                    {abbreviateMonths(a.awardName)}
                  </span>
                );
              })}
            </div>
          )}

          {/* Absolute positioned status badge overlaying the image top-right */}
          {host.status && String(host.status).toLowerCase() !== 'active' && (
            <div className="absolute top-4 right-4 z-20">
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border backdrop-blur-md shadow-lg bg-red-500/20 text-red-400 border-red-500/30">
                {host.status}
              </span>
            </div>
          )}

        </div>

        {/* Identity Details Block (merged below the photo) */}
        <div className="px-6 pb-6 -mt-8 relative z-20 flex-1 flex flex-col space-y-2">
          {/* Top Row: Nickname and Edit pencil icon */}
          <div className="flex justify-between items-center gap-4">
            <h2 className="text-3xl md:text-4xl font-black text-[#F0EFE8] tracking-tight drop-shadow-md truncate">
              {host.nickname || host.name}
            </h2>
            {(isDirectorOrHeadAdmin || (isOwnProfile && !isSpotlight)) && (
              <div className="shrink-0">
                <button
                  onClick={() => setIsSelfEditing(true)}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-[#A09E9A] hover:text-[#F0EFE8] transition-all shadow-xl cursor-pointer"
                  title="Edit Profile"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Bottom Row: ID/Awards (left) and Tier Pay badge (right, aligned with Team Anchor column) */}
          <div className="grid grid-cols-2 gap-x-4 items-center">
            {/* Left Column: ID and Awards */}
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xs font-mono font-bold text-[#D4AF37]">ID: {host.id}</span>
              {activeAwards.map(a => {
                let badgeStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                if (a.awardColor === 'Purple') badgeStyle = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                else if (a.awardColor === 'Emerald') badgeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                else if (a.awardColor === 'Blue') badgeStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                else if (a.awardColor === 'Red') badgeStyle = 'bg-red-500/10 text-red-400 border-red-500/20';
                else if (a.awardColor === 'Orange') badgeStyle = 'bg-orange-500/10 text-orange-400 border-orange-500/20';

                return (
                  <span
                    key={a.id}
                    className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 backdrop-blur-sm", badgeStyle)}
                    title={`Active Award: ${a.awardName} (${a.startDate} to ${a.endDate})`}
                  >
                    {abbreviateMonths(a.awardName)}
                  </span>
                );
              })}
            </div>

            {/* Right Column: Tier Pay Badge */}
            <div>
              <span className={cn("text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border inline-block backdrop-blur-md", tierPayStyles.badgeText, tierPayStyles.borderColor, tierPayStyles.bgStyle)}>
                {host.tier_pay || 'Regular Host'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-2 gap-x-4 pt-1.5 border-t border-white/5 text-xs text-[#A09E9A]">
            {String(host.role || '').toLowerCase() === 'host' || String(host.role || '').toLowerCase() === 'talent' ? (
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest mb-1 text-white/40">Assigned Manager</span>
                <div 
                  className={cn("flex items-center gap-2 mt-0.5", assignedManager ? "cursor-pointer hover:opacity-80 transition-opacity" : "")}
                  onClick={() => {
                    if (assignedManager) setSpotlightHost(assignedManager);
                  }}
                  title={assignedManager ? "View Manager Profile" : ""}
                >
                  {assignedManager?.photoUrl ? (
                    <img
                      src={assignedManager.photoUrl}
                      alt={assignedManager.name || host.manager}
                      className="w-12 h-12 rounded-full object-cover border border-white/10 shrink-0 shadow-inner"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-black/80 to-black border border-white/10 flex items-center justify-center text-base font-black text-indigo-400 shrink-0 shadow-inner">
                      {(assignedManager?.name || host.manager || 'M')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="font-bold truncate text-[#D4AF37]">{assignedManager?.name || host.manager}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest mb-1 text-white/40">Role</span>
                <span className="text-[#D4AF37] font-black">{host.role}</span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest mb-1 text-white/40">Team Anchor</span>
              <span className="text-indigo-400 font-bold">{host.teamAnchor || host.team}</span>
              {(() => {
                const igLink = getSocialLink('instagram', host.social_links?.ig);
                const tiktokLink = getSocialLink('tiktok', host.social_links?.tiktok);
                const fbLink = getSocialLink('facebook', host.social_links?.fb);
                const waLink = getSocialLink('whatsapp', host.social_links?.whatsapp);

                const hasAnySocial = igLink || tiktokLink || fbLink || waLink;
                if (!hasAnySocial) return null;

                return (
                  <div className="flex items-center gap-2 mt-2">
                    {igLink && (
                      <a
                        href={igLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-6 h-6 rounded-full bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 hover:border-pink-500/40 flex items-center justify-center text-pink-400 transition-all shadow-inner"
                        title="Instagram"
                      >
                        <Instagram size={12} />
                      </a>
                    )}
                    {tiktokLink && (
                      <a
                        href={tiktokLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-6 h-6 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/40 flex items-center justify-center text-cyan-400 transition-all shadow-inner"
                        title="TikTok"
                      >
                        <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.95-1.72-.1.08-.21.17-.31.25-.02 3.78-.01 7.56-.02 11.34-.1 2.39-1.39 4.71-3.64 5.63-2.18.97-4.88.75-6.85-.56-2.03-1.32-3.08-3.83-2.67-6.21.36-2.28 2.14-4.22 4.41-4.72.16-.03.32-.06.49-.09V12.3c-.15.02-.29.04-.44.07-3.23.51-5.74 3.49-5.69 6.78.07 3.32 2.7 6.18 6.01 6.3 3.25.17 6.18-2.19 6.57-5.41.09-.76.08-1.53.08-2.3V5.19c-.87.59-1.89.97-2.95 1.07-1.12.11-2.27-.1-3.27-.63-.97-.53-1.73-1.39-2.13-2.42C12.98 2.2 12.87 1.09 12.525.02z" />
                        </svg>
                      </a>
                    )}
                    {fbLink && (
                      <a
                        href={fbLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-6 h-6 rounded-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 flex items-center justify-center text-blue-400 transition-all shadow-inner"
                        title="Facebook"
                      >
                        <Facebook size={12} className="text-blue-450" />
                      </a>
                    )}
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-6 h-6 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 flex items-center justify-center text-emerald-400 transition-all shadow-inner"
                        title="WhatsApp"
                      >
                        <svg className="w-3 h-3 fill-current text-emerald-400" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.019-5.117-2.875-6.973-1.857-1.857-4.339-2.875-6.98-2.875-5.437 0-9.86 4.42-9.863 9.865-.001 1.716.463 3.39 1.342 4.877l-.994 3.634 3.716-.975zm12.167-7.79c-.273-.137-1.62-.8-1.871-.892-.253-.09-.437-.137-.621.137-.184.272-.713.89-.873 1.073-.16.184-.321.206-.594.07-1.12-.56-1.92-.937-2.678-2.23-.2-.345.2-.32.57-.962.082-.136.04-.256-.02-.393-.06-.137-.506-1.22-.693-1.67-.182-.44-.367-.38-.506-.388-.13-.004-.28-.006-.43-.006-.15 0-.395.056-.6.28-.206.223-.787.77-.787 1.877 0 1.107.805 2.176.918 2.33.113.15 1.583 2.417 3.834 3.388.536.23 1.012.38 1.357.49.538.172 1.028.148 1.416.09.431-.064 1.332-.546 1.518-1.072.186-.527.186-.978.13-1.07-.056-.09-.206-.137-.478-.273z" />
                        </svg>
                      </a>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {host.streaming_hours && host.streaming_hours.length > 0 && (
            <div className="pt-2 border-t border-white/5 space-y-2">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Streaming Schedule</span>
              <div className="grid grid-cols-2 gap-3">
                {host.streaming_hours.slice(0, 2).map((slot, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2 text-center shadow-inner min-w-0",
                      host.streaming_hours.length === 1 && "col-span-2"
                    )}
                  >
                    <span className="text-[10px] font-bold text-white/90 truncate block">{slot.from} - {slot.to}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Host Public Message */}
          {String(host.bio || host.description || '').trim() && (
            <div className="pt-2 border-t border-white/5 space-y-1.5">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest block">Host Public Message</span>
              <p className="text-xs text-[#A09E9A] leading-relaxed italic whitespace-pre-wrap bg-black/20 p-3 rounded-xl border border-white/5">
                "{String(host.bio || host.description).trim().slice(0, 100)}"
              </p>
            </div>
          )}

        </div>
      </div>
    );
  };

  // renderPerformanceHistory is merged into renderPerformanceMetricsAndDiversity

  const renderRandomPK = () => {
    const currentAuth = Storage.getAuthState();
    const isOwnProfile = currentAuth.poppo_id === host.id;
    const userRoleLower = String(currentAuth?.role || '').toLowerCase();
    const isStaffUser = ['manager', 'agent', 'admin', 'head admin', 'director'].includes(userRoleLower);

    return (
      <div className={cn("space-y-4 flex-1 backdrop-blur-xl border-2 rounded-3xl p-5 transition-all duration-300 group", styles.gradientBg, styles.borderColor, styles.shadow, styles.topTrim)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm shadow-inner">⚔️</div>
            <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8]">PK Performance</h4>
          </div>
          {(isOwnProfile || isStaffUser) && (
            <button
              onClick={() => setIsRpkFormOpen(true)}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-md hover:shadow-amber-500/20"
            >
              Submit Report
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-[12px] pt-2">
          {[
            {
              label: 'WIN %',
              value: `${pkData.win_percentage}%`,
              subLabel: 'Monthly',
              bgGradient: 'linear-gradient(to bottom right, #3A2A18, #221A15)',
              accentColor: '#FFB800',
              hoverBorder: 'hover:border-[#FFB800]/50'
            },
            {
              label: 'SCORE',
              value: formatNumber(pkData.pk_score),
              subLabel: 'Monthly',
              bgGradient: 'linear-gradient(to bottom right, #3D221C, #221515)',
              accentColor: '#FF7B00',
              hoverBorder: 'hover:border-[#FF7B00]/50'
            },
            {
              label: 'SESSIONS',
              value: String(pkData.sessions),
              subLabel: 'Weekly',
              bgGradient: 'linear-gradient(to bottom right, #3A1C28, #20131A)',
              accentColor: '#FF3B5C',
              hoverBorder: 'hover:border-[#FF3B5C]/50'
            },
          ].map((cell, idx) => (
            <div
              key={idx}
              ref={el => { if (el) el.style.background = cell.bgGradient; }}
              className={cn(
                "border border-white/5 p-2.5 sm:p-4 rounded-2xl flex flex-col justify-between min-h-[85px] sm:min-h-[90px] transition-all duration-300 transform group-hover:translate-y-[-2px] shadow-lg",
                cell.hoverBorder
              )}
            >
              <span className="text-[8px] sm:text-[9px] font-black text-[#A09E9A] uppercase tracking-widest leading-none">
                {cell.label}
              </span>
              <span
                ref={el => { if (el) el.style.color = cell.accentColor; }}
                className="text-sm sm:text-lg md:text-xl font-black tracking-tight mt-2 block drop-shadow-md font-mono"
              >
                {cell.value}
              </span>
              <span className="text-[7px] sm:text-[8px] font-bold text-white/30 uppercase tracking-wider mt-1">
                {cell.subLabel}
              </span>
            </div>
          ))}
        </div>

        {rpkMetadata && renderCardFooter(
          rpkMetadata.lastUpdated,
          rpkMetadata.reporterRole,
          rpkMetadata.reporterName
        )}
      </div>
    );
  };

  const renderExposuresAndAttendance = () => {
    const currentAuth = Storage.getAuthState();
    const isOwnProfile = currentAuth.poppo_id === host.id;
    const userRoleLower = String(currentAuth?.role || '').toLowerCase();
    const canAddEvent = isOwnProfile || userRoleLower !== 'host';

    const attendedCount = attendedEvents.length;
    const totalCount = totalAgencyEventsCount || 0;
    const presenceRatio = totalCount > 0 ? (attendedCount / totalCount) : 0;
    const presencePercentage = Math.round(presenceRatio * 100);

    return (
      <div className={cn("space-y-4 flex-1 backdrop-blur-xl border-2 rounded-3xl p-5 transition-all duration-300 group", styles.gradientBg, styles.borderColor, styles.shadow, styles.topTrim)}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 bg-black/40 p-1 rounded-xl border border-white/5 flex">
            <button
              type="button"
              onClick={() => setEventActiveTab('exposure')}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center",
                eventActiveTab === 'exposure'
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "text-white/40 hover:text-white/70 border border-transparent"
              )}
            >
              EVENTS
            </button>
            <button
              type="button"
              onClick={() => setEventActiveTab('attendance')}
              className={cn(
                "flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center",
                eventActiveTab === 'attendance'
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "text-white/40 hover:text-white/70 border border-transparent"
              )}
            >
              ATTENDANCE
            </button>

          </div>
        </div>

        {eventActiveTab === 'exposure' && (
          <>
            <div className="space-y-3 mt-4 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {participatedEvents.length > 0 ? (
                participatedEvents.map((e, idx) => {
                  const eventDate = formatDateMMDDYYYY(e.eventDate || e.date);
                  const eventTitle = e.eventType || e.eventTitle || e.title || 'Event';
                  const hostName = host.nickname || host.name;
                  const cleanHostName = hostName.trim().toLowerCase();
                  const cleanEventTitle = eventTitle.trim();

                  let displayTitle = '';
                  if (cleanEventTitle.toLowerCase().startsWith(cleanHostName)) {
                    displayTitle = cleanEventTitle;
                  } else {
                    displayTitle = `${hostName} - ${cleanEventTitle}`;
                  }

                  const localTimeObj = convertManilaToLocal(e.eventDate || e.date, e.timeslot || e.time);
                  const localTooltip = localTimeObj
                    ? formatToLocalTimezone(localTimeObj)
                    : undefined;

                  return (
                    <div
                      key={idx}
                      className="bg-white/5 border border-white/10 p-3 rounded-xl hover:border-amber-500/30 transition-all duration-300 shadow-sm flex flex-col gap-1.5 group/item cursor-help"
                      title={localTooltip}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="font-bold text-[#F0EFE8] text-sm group-hover/item:text-amber-400 transition-colors truncate">
                          {displayTitle}
                        </h4>
                        <span className="text-[9px] font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 inline-block uppercase tracking-wider shrink-0">
                          {e.status || 'Scheduled'}
                        </span>
                      </div>
                      <div className="text-xs text-[#A09E9A]">
                        {eventDate} • <span className="text-amber-400 font-medium">{formatTimeslot(e.timeslot || e.time)}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-white/30 italic text-center py-6 font-medium">No historical event participations found.</p>
              )}
            </div>
            {canAddEvent && (
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setIsAddEventFormOpen(true)}
                  className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-md"
                >
                  + Add Event
                </button>
              </div>
            )}
          </>
        )}

        {eventActiveTab === 'attendance' && (
          <>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              {[
                {
                  label: 'Events Attended',
                  value: `${attendedCount} / ${totalCount}`,
                  subLabel: 'Total Agency',
                  bgGradient: 'linear-gradient(to bottom right, #3A2A18, #221A15)',
                  accentColor: '#FFB800',
                  hoverBorder: 'hover:border-[#FFB800]/50'
                },
                {
                  label: 'Presence Score',
                  value: `${presencePercentage}%`,
                  subLabel: 'Consistency',
                  bgGradient: 'linear-gradient(to bottom right, #3D221C, #221515)',
                  accentColor: '#FF7B00',
                  hoverBorder: 'hover:border-[#FF7B00]/50'
                },
              ].map((cell, idx) => (
                <div
                  key={idx}
                  ref={el => { if (el) el.style.background = cell.bgGradient; }}
                  className={cn(
                    "border border-white/5 p-2.5 sm:p-4 rounded-2xl flex flex-col justify-between min-h-[85px] transition-all duration-300 transform group-hover:translate-y-[-2px] shadow-lg",
                    cell.hoverBorder
                  )}
                >
                  <span className="text-[8px] sm:text-[9px] font-black text-[#A09E9A] uppercase tracking-widest leading-none">
                    {cell.label}
                  </span>
                  <span
                    ref={el => { if (el) el.style.color = cell.accentColor; }}
                    className="text-sm sm:text-lg font-black tracking-tight mt-2 block drop-shadow-md font-mono"
                  >
                    {cell.value}
                  </span>
                  <span className="text-[7px] sm:text-[8px] font-bold text-white/30 uppercase tracking-wider mt-1">
                    {cell.subLabel}
                  </span>
                </div>
              ))}
            </div>

            {/* Progress Bar */}
            <div className="px-1 py-1 mt-2.5">
              <div className="w-full bg-black/40 rounded-full h-1.5 border border-white/5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-400 h-1.5 rounded-full transition-all duration-500"
                  ref={el => { if (el) el.style.width = `${Math.min(100, Math.max(0, presencePercentage))}%`; }}
                />
              </div>
            </div>

            {/* Scrollable list of attended events */}
            <div className="space-y-3 mt-4 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {attendedEvents.length > 0 ? (
                attendedEvents.map((e, idx) => {
                  const eventDate = formatDateStandard(e.eventDate || e.date);
                  return (
                    <div key={idx} className="bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10 p-4 rounded-2xl hover:border-amber-500/30 transition-all duration-300 shadow-sm space-y-2 group/item">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black text-[#F0EFE8] leading-tight truncate group-hover/item:text-amber-400 transition-colors">{e.eventTitle || e.eventType || 'Unnamed Event'}</p>
                        <span className="text-[9px] font-black uppercase tracking-widest bg-black/40 border border-white/10 px-3 py-1 rounded-full text-amber-400 shrink-0 shadow-inner">
                          Attended
                        </span>
                      </div>
                      <p className="text-[10px] text-white/50 font-bold tracking-wide">{eventDate} • {e.timeslot || 'N/A'}</p>
                      {e.eventFeedback && (
                        <div className="bg-black/20 border border-white/5 p-3 rounded-xl mt-1.5">
                          <p className="text-xs text-[#A09E9A] leading-relaxed font-medium">
                            <span className="font-bold text-[#F0EFE8]/70">Feedback: </span>
                            {e.eventFeedback}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-[#A09E9A]/40 italic text-center py-6 font-medium">No attended agency events found for this host.</p>
              )}
            </div>
          </>
        )}


        {participatedEvents.length > 0 && (() => {
          const latestEvent = participatedEvents[0];
          return renderCardFooter(
            latestEvent.eventDate || latestEvent.date,
            latestEvent.attendanceSubmittedBy?.role || latestEvent.created_by_role || 'Host',
            latestEvent.attendanceSubmittedBy?.name || latestEvent.created_by_name || latestEvent.createdBy
          );
        })()}
      </div>
    );
  };

  const renderRecognitionsCard = () => {
    if (assignedAwards.length === 0) return null;

    const activeCount = assignedAwards.filter(a => a.startDate && a.endDate && getIsLastMonth(a.startDate, a.endDate)).length;

    const sortedAwards = [...assignedAwards].sort((a, b) => {
      const dateA = a.startDate || a.awardedAt || a.dateAwarded || a.assignedAt || '';
      const dateB = b.startDate || b.awardedAt || b.dateAwarded || b.assignedAt || '';
      return dateB.localeCompare(dateA);
    });

    return (
      <div className={cn("space-y-4 bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 p-5 rounded-3xl transition-all duration-300 hover:border-[#D4AF37]/50 group", styles.shadow)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-sm shadow-inner">🏆</div>
            <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8]">AGENCY RECOGNITION</h4>
          </div>
          <span className="px-2.5 py-0.5 text-[9px] font-black text-amber-400 border border-amber-500/20 bg-amber-500/10 rounded-full uppercase tracking-widest shadow-inner">
            {activeCount} active / {assignedAwards.length} total
          </span>
        </div>

        {/* Badges list */}
        <div className="space-y-3 mt-4 max-h-48 overflow-y-auto custom-scrollbar pr-1">
          {sortedAwards.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {sortedAwards.map((a: any) => {
                const isActive = getIsLastMonth(a.startDate, a.endDate);

                let glowStyle = '';
                if (isActive) {
                  if (a.awardColor === 'Purple') glowStyle = 'border-purple-500 text-purple-200 bg-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.8)] opacity-100 z-10 font-bold';
                  else if (a.awardColor === 'Emerald') glowStyle = 'border-emerald-500 text-emerald-200 bg-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.8)] opacity-100 z-10 font-bold';
                  else if (a.awardColor === 'Blue') glowStyle = 'border-blue-500 text-blue-200 bg-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.8)] opacity-100 z-10 font-bold';
                  else if (a.awardColor === 'Red') glowStyle = 'border-red-500 text-red-200 bg-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.8)] opacity-100 z-10 font-bold';
                  else if (a.awardColor === 'Orange') glowStyle = 'border-orange-500 text-orange-200 bg-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.8)] opacity-100 z-10 font-bold';
                  else glowStyle = 'border-amber-500 text-amber-200 bg-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.8)] opacity-100 z-10 font-bold';
                } else {
                  if (a.awardColor === 'Purple') glowStyle = 'bg-purple-500/10 text-purple-300 border-purple-500/30 opacity-100';
                  else if (a.awardColor === 'Emerald') glowStyle = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 opacity-100';
                  else if (a.awardColor === 'Blue') glowStyle = 'bg-blue-500/10 text-blue-300 border-blue-500/30 opacity-100';
                  else if (a.awardColor === 'Red') glowStyle = 'bg-red-500/10 text-red-300 border-red-500/30 opacity-100';
                  else if (a.awardColor === 'Orange') glowStyle = 'bg-orange-500/10 text-orange-300 border-orange-500/30 opacity-100';
                  else glowStyle = 'bg-amber-500/10 text-amber-300 border-amber-500/30 opacity-100';
                }

                const getCustomBadgeStyle = (colorStr: string, active: boolean) => {
                  const isGradient = colorStr?.includes('gradient');
                  const isHex = colorStr?.startsWith('#');
                  if (!isGradient && !isHex) return null;

                  if (active) {
                    if (isGradient) {
                      return {
                        className: "border-transparent text-white opacity-100 z-10 font-bold",
                        style: {
                          background: colorStr,
                          boxShadow: "0 0 20px rgba(255,255,255,0.4)"
                        }
                      };
                    } else {
                      return {
                        className: "text-white opacity-100 z-10 font-bold",
                        style: {
                          backgroundColor: `${colorStr}4D`,
                          borderColor: colorStr,
                          boxShadow: `0 0 20px ${colorStr}CC`
                        }
                      };
                    }
                  } else {
                    if (isGradient) {
                      return {
                        className: "text-white/70 border-transparent opacity-60",
                        style: {
                          background: colorStr
                        }
                      };
                    } else {
                      return {
                        className: "opacity-100",
                        style: {
                          backgroundColor: `${colorStr}1A`,
                          borderColor: `${colorStr}40`,
                          color: colorStr
                        }
                      };
                    }
                  }
                };

                const customStyle = getCustomBadgeStyle(a.awardColor, isActive);

                return (
                  <div
                    key={a.id}
                    className={cn(
                      "flex flex-col justify-center items-center border rounded-xl px-3 py-1.5 transition-all duration-300 hover:scale-[1.02] hover:border-amber-500/50 shadow-md cursor-help relative group/badge w-full min-w-0 text-center",
                      customStyle ? customStyle.className : glowStyle
                    )}
                    ref={el => { if (el) { if (customStyle?.style) { Object.assign(el.style, customStyle.style); } else { el.removeAttribute('style'); } } }}
                    title={`Award: ${a.awardName}\nDuration: ${a.startDate} to ${a.endDate}\nStatus: ${isActive ? 'Active Badge' : 'Past Award'}`}
                  >
                    <div className="flex flex-col min-w-0 items-center justify-center">
                      <span className={cn("text-[9px] font-black uppercase tracking-wider leading-tight truncate w-full", isActive ? "text-white" : "text-[#F0EFE8]/70")}>
                        {abbreviateMonths(a.awardName)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[#A09E9A]/40 italic text-center py-6 font-medium">No agency badges or recognitions found for this host.</p>
          )}
        </div>
      </div>
    );
  };

  const renderFanbaseBlock = () => {
    const currentAuth = Storage.getAuthState();
    const isOwnProfile = String(currentAuth?.poppo_id) === String(host.id);
    const roleLower = String(currentAuth?.role || '').toLowerCase();
    const isElevatedStaff = ['admin', 'head admin', 'head_admin', 'director'].includes(roleLower);
    const isManagerAgent = ['manager', 'agent'].includes(roleLower);
    const isAssignedManagerAgent = isManagerAgent && String(host.assignedManagerId) === String(currentAuth?.poppo_id);
    const canSubmitFanbase = isOwnProfile || isAssignedManagerAgent || isElevatedStaff;

    return (
      <div className={cn("space-y-4 backdrop-blur-xl border-2 rounded-3xl p-5 transition-all duration-300 group", styles.gradientBg, styles.borderColor, styles.shadow, styles.topTrim)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 text-sm shadow-inner">💖</div>
            <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8]">Fanbase Health</h4>
          </div>
          <div className="flex items-center gap-2">
            {canSubmitFanbase && (
              <button
                onClick={() => setIsFanbaseFormOpen(true)}
                className="px-3 py-1.5 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-md hover:shadow-pink-500/20"
              >
                Submit Report
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 pt-2 w-full">
          {[
            {
              label: 'Followers',
              value: fanbaseLatest?.total_followers != null ? formatNumber(fanbaseLatest.total_followers) : '—',
              bgGradient: 'linear-gradient(to bottom right, #3A2A18, #221A15)',
              accentColor: '#FFB800',
              hoverBorder: 'hover:border-[#FFB800]/50'
            },
            {
              label: 'FC Subs',
              value: fanbaseLatest?.fanclub_subscribers != null ? formatNumber(fanbaseLatest.fanclub_subscribers) : '—',
              bgGradient: 'linear-gradient(to bottom right, #3D221C, #221515)',
              accentColor: '#FF7B00',
              hoverBorder: 'hover:border-[#FF7B00]/50'
            },
            {
              label: 'GC Members',
              value: fanbaseLatest?.fanclub_gc_members != null ? formatNumber(fanbaseLatest.fanclub_gc_members) : '—',
              bgGradient: 'linear-gradient(to bottom right, #3A1C28, #20131A)',
              accentColor: '#FF3B5C',
              hoverBorder: 'hover:border-[#FF3B5C]/50'
            },
            {
              label: 'GC Activity',
              value: fanbaseLatest && (fanbaseLatest.gc_activity_count_host != null || fanbaseLatest.gc_activity_count_fans != null)
                ? formatNumber(Number(fanbaseLatest.gc_activity_count_host || 0) + Number(fanbaseLatest.gc_activity_count_fans || 0))
                : '—',
              bgGradient: 'linear-gradient(to bottom right, #2A1C3A, #161220)',
              accentColor: '#B388FF',
              hoverBorder: 'hover:border-[#B388FF]/50'
            },
          ].map((cell, idx) => (
            <div
              key={idx}
              ref={el => { if (el) el.style.background = cell.bgGradient; }}
              className={cn(
                "border border-white/5 p-2.5 sm:p-4 rounded-2xl flex flex-col justify-between min-h-[85px] sm:min-h-[90px] transition-all duration-300 transform group-hover:translate-y-[-2px] shadow-lg w-full min-w-0",
                cell.hoverBorder
              )}
            >
              <span className="text-[8px] sm:text-[9px] font-black text-[#A09E9A] uppercase tracking-widest leading-none">
                {cell.label}
              </span>
              <span
                ref={el => { if (el) el.style.color = cell.accentColor; }}
                className="text-sm sm:text-lg md:text-xl font-black tracking-tight mt-2 block drop-shadow-md font-mono"
              >
                {cell.value}
              </span>
            </div>
          ))}
        </div>

        {fanbaseLatest && renderCardFooter(
          fanbaseLatest.timestamp || fanbaseLatest.from_date || fanbaseLatest.to_date,
          fanbaseLatest.reporter_role || fanbaseLatest.reporterRole,
          fanbaseLatest.reporter_name || fanbaseLatest.reporterName
        )}
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
      <div className={cn("space-y-4 bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 p-5 rounded-3xl transition-all duration-300 hover:border-[#D4AF37]/50 group", styles.shadow)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] text-sm shadow-inner">🤖</div>
            <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8]">AI Performance Analysis</h4>
          </div>
          <span className="px-3 py-1 text-[9px] font-black text-[#D4AF37] border border-[#D4AF37]/30 bg-[#D4AF37]/10 rounded-full uppercase tracking-widest shadow-[0_0_10px_rgba(212,175,55,0.2)]">Gemini AI</span>
        </div>

        {/* Generate button (Only visible to managers/admins who can generate) */}
        {!isGeneratingAI && !aiReport && canGenerateAI && (
          <button
            onClick={handleGenerateAI}
            className="w-full py-4 mt-2 rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-r from-[#D4AF37]/20 to-[#D4AF37]/5 text-[#D4AF37] font-black text-xs uppercase tracking-widest hover:from-[#D4AF37]/30 hover:border-[#D4AF37]/50 transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2.5 shadow-lg shadow-[#D4AF37]/10"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>
            Generate AI Report
          </button>
        )}

        {/* Placeholder if no report exists and user cannot generate one */}
        {!isGeneratingAI && !aiReport && !canGenerateAI && (
          <div className="bg-black/20 border border-white/5 p-6 rounded-2xl text-center text-white/40 italic text-xs font-medium">
            No AI performance analysis has been posted by management yet.
          </div>
        )}

        {/* Loading state */}
        {isGeneratingAI && (
          <div className="w-full py-10 rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-b from-[#D4AF37]/10 to-transparent flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin shadow-[0_0_15px_rgba(212,175,55,0.5)]" />
            <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] animate-pulse">Analyzing performance data...</p>
          </div>
        )}

        {/* Error */}
        {aiError && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-black tracking-wide shadow-inner">{aiError}</div>
        )}

        {/* Report output */}
        {aiReport && (
          <div className="space-y-4 mt-4">
            {/* Summary */}
            <div className="bg-gradient-to-br from-white/5 to-transparent border border-[#D4AF37]/20 rounded-2xl p-5 space-y-2 shadow-lg">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Performance Summary</p>
              <p className="text-sm text-white/90 leading-relaxed font-medium">{aiReport.summary}</p>
            </div>
            {/* Journey */}
            <div className="bg-gradient-to-br from-white/5 to-transparent border border-indigo-500/20 rounded-2xl p-5 space-y-2 shadow-lg">
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Career Journey</p>
              <p className="text-sm text-white/90 leading-relaxed font-medium">{aiReport.journey}</p>
            </div>
            {/* Recommendations */}
            {aiReport.recommendations && aiReport.recommendations.length > 0 && (
              <div className="bg-gradient-to-br from-white/5 to-transparent border border-emerald-500/20 rounded-2xl p-5 space-y-3 shadow-lg">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Recommendations</p>
                <ul className="space-y-2.5">
                  {aiReport.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="text-emerald-400 mt-1 shrink-0 text-sm">✦</span>
                      <span className="text-sm text-white/80 leading-relaxed font-medium">{rec}</span>
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
                className="w-full mt-4 py-3.5 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/20 to-indigo-500/5 text-indigo-300 hover:text-indigo-200 hover:from-indigo-500/30 hover:border-indigo-500/50 font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xl"
              >
                {isPostingAiReport ? <Loader2 size={14} className="animate-spin" /> : null}
                Post Report to Host's Profile
              </button>
            )}

            {/* Posted status badge */}
            {myRecentAiReport?.isPosted && (
              <div className="text-[10px] text-emerald-400 font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 rounded-2xl text-center shadow-inner mt-4">
                ✓ Report Posted to Host's Profile
              </div>
            )}

            {/* Re-generate option (Only visible to managers/admins who can generate) */}
            {canGenerateAI && (
              <button
                onClick={handleGenerateAI}
                className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-[#D4AF37] transition-colors cursor-pointer w-full text-right pr-2 pt-2"
              >
                ↻ Regenerate Report
              </button>
            )}
          </div>
        )}
        {(() => {
          const activeReportSource = myRecentAiReport || postedAiReport;
          return activeReportSource && renderCardFooter(
            activeReportSource.timestamp,
            activeReportSource.generatedRole,
            activeReportSource.generatedByName
          );
        })()}
      </div>
    );
  };


  const renderRpkModal = () => {
    if (!isRpkFormOpen) return null;

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className={cn("backdrop-blur-xl border-2 rounded-3xl max-w-sm w-full p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar", styles.gradientBg, styles.borderColor, styles.shadow, styles.topTrim)}>
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
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Date Range</label>
              <DateRangePicker
                required
                startDate={rpkFormData.from_date}
                endDate={rpkFormData.to_date}
                onChange={(start, end) => setRpkFormData({ ...rpkFormData, from_date: start, to_date: end })}
                dateFormat="dd-MM-yyyy"
              />
              <p className="text-[8.5px] text-[#D4AF37]/90 font-medium bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-lg px-2.5 py-1.5 mt-1.5 leading-normal">
                💡 <strong>Recommended:</strong> Date range should be weekly Monday to Sunday.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">PK Wins %</label>
              <input
                type="text"
                placeholder="e.g. 75%"
                value={rpkFormData.pk_wins_percent}
                onChange={(e) => setRpkFormData({ ...rpkFormData, pk_wins_percent: e.target.value })}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">PK Points</label>
              <input
                type="text"
                placeholder="Total PK Points"
                value={rpkFormData.pk_points}
                onChange={(e) => setRpkFormData({ ...rpkFormData, pk_points: e.target.value })}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">PK Sessions</label>
              <input
                type="text"
                placeholder="Total Sessions"
                value={rpkFormData.pk_sessions}
                onChange={(e) => setRpkFormData({ ...rpkFormData, pk_sessions: e.target.value })}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-[#D4AF37]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingRpk}
              className={cn("w-full py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all mt-6 shadow-lg", styles.gradientBg, styles.borderColor, styles.shadow, styles.badgeText)}
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

    const currentAuth = Storage.getAuthState();
    const roleLower = String(currentAuth?.role || '').toLowerCase();
    const isElevatedStaff = ['admin', 'head admin', 'head_admin', 'director'].includes(roleLower);

    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className={cn("backdrop-blur-xl border-2 rounded-3xl max-w-sm w-full p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar", styles.gradientBg, styles.borderColor, styles.shadow, styles.topTrim)}>
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
            {isElevatedStaff && (
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Date Range</label>
                <DateRangePicker
                  required
                  startDate={fanbaseFormData.from_date}
                  endDate={fanbaseFormData.to_date}
                  onChange={(start, end) => setFanbaseFormData({ ...fanbaseFormData, from_date: start, to_date: end })}
                  dateFormat="dd-MM-yyyy"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Total Followers</label>
              <input
                type="text"
                placeholder="0"
                value={fanbaseFormData.total_followers}
                onChange={(e) => setFanbaseFormData({ ...fanbaseFormData, total_followers: e.target.value })}
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
                  onChange={(e) => setFanbaseFormData({ ...fanbaseFormData, fanclub_subscribers: e.target.value })}
                  className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Fanclub GC</label>
                <input
                  type="text"
                  placeholder="0"
                  value={fanbaseFormData.fanclub_gc_members}
                  onChange={(e) => setFanbaseFormData({ ...fanbaseFormData, fanclub_gc_members: e.target.value })}
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
                onChange={(e) => setFanbaseFormData({ ...fanbaseFormData, notes: e.target.value })}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingFanbase}
              className={cn("w-full py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all mt-6 shadow-lg", styles.gradientBg, styles.borderColor, styles.shadow, styles.badgeText)}
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
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className={cn("backdrop-blur-xl border-2 rounded-3xl max-w-sm w-full p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar", styles.gradientBg, styles.borderColor, styles.shadow, styles.topTrim)}>
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
                title="Event Type"
                value={eventFormData.eventType}
                onChange={(e) => setEventFormData({ ...eventFormData, eventType: e.target.value })}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500"
              >
                <option value="SOLO LIVEHOUSE" className="bg-black/40">SOLO LIVEHOUSE</option>
                <option value="PARTY LIVEHOUSE" className="bg-black/40">PARTY LIVEHOUSE</option>
                <option value="OFFICIAL PK" className="bg-black/40">OFFICIAL PK</option>
                <option value="AGENCY EVENT" className="bg-black/40">AGENCY EVENT</option>
                <option value="POPPO EVENT" className="bg-black/40">POPPO EVENT</option>
                <option value="EXTERNAL EVENT" className="bg-black/40">EXTERNAL EVENT</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Event Date</label>
              <SingleDatePicker
                required
                value={eventFormData.eventDate}
                onChange={(val) => setEventFormData({ ...eventFormData, eventDate: val })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-[#A09E9A]">Timeslot (e.g. 08:00 PM - 10:00 PM Manila Time)</label>
              <input
                type="text"
                required
                placeholder="08:00 PM - 10:00 PM (Manila Time)"
                value={eventFormData.timeslot}
                onChange={(e) => setEventFormData({ ...eventFormData, timeslot: e.target.value })}
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
                onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-lg px-3 py-2 text-xs text-[#F0EFE8] outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingEvent}
              className={cn("w-full py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all mt-6 shadow-lg", styles.gradientBg, styles.borderColor, styles.shadow, styles.badgeText)}
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
      Growing: { icon: <TrendingUp size={16} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: `+${pct}% vs 3-mo avg` },
      Declining: { icon: <TrendingDown size={16} />, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: `${pct}% vs 3-mo avg` },
      Stable: { icon: <Minus size={16} />, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: `${pct >= 0 ? '+' : ''}${pct}% vs 3-mo avg` },
      New: { icon: <Star size={16} />, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', label: 'New host — tracking started' },
    };
    const c = cfg[trend] || cfg.Stable;
    const insights = generateCategorizedInsights();

    return (
      <div className={cn("backdrop-blur-xl border-2 rounded-3xl p-5 space-y-4 transition-all duration-300", styles.gradientBg, styles.borderColor, styles.shadow, styles.topTrim)}>
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





  const renderWeeklyLiveStats = () => {
    if (weeklyLiveData.length === 0) return null;
    return (
      <div className={cn("space-y-4 bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 p-5 rounded-3xl transition-all duration-300 hover:border-[#D4AF37]/50 group", styles.shadow)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm shadow-inner">📊</div>
            <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8]">Weekly Live Stats</h4>
          </div>
          <span className="px-3 py-1 text-[9px] font-black text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-full uppercase tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            {weeklyLiveData.length} weeks
          </span>
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
        {weeklyLiveData.length > 0 && renderCardFooter(
          weeklyLiveData[0].timestamp || weeklyLiveData[0].to_date || weeklyLiveData[0].from_date,
          undefined,
          weeklyLiveData[0].submitted_by
        )}
      </div>
    );
  };

  const renderAgentNotes = () => {
    if (agentNotes.length === 0) return null;
    const TYPE_STYLES: Record<string, string> = {
      Note: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5',
      Task: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
      Feedback: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
    };
    return (
      <div className={cn("space-y-4 bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 p-5 rounded-3xl transition-all duration-300 hover:border-[#D4AF37]/50 group", styles.shadow)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm shadow-inner">📝</div>
            <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8]">Agent Notes</h4>
          </div>
          <span className="px-3 py-1 text-[9px] font-black text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 rounded-full uppercase tracking-widest shadow-[0_0_10px_rgba(99,102,241,0.2)]">
            Read-Only
          </span>
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
        {agentNotes.length > 0 && renderCardFooter(
          agentNotes[0].timestamp || agentNotes[0].createdAt,
          agentNotes[0].managerRole || agentNotes[0].authorRole || agentNotes[0].role,
          agentNotes[0].managerName || agentNotes[0].authorName || agentNotes[0].createdBy
        )}
      </div>
    );
  };

  const renderAssignedHostsSection = () => {
    const profileRoleLower = String(host.role || '').toLowerCase();
    if (profileRoleLower !== 'agent' && profileRoleLower !== 'manager') return null;

    const displayName = host.nickname || host.name || 'Unnamed';
    let blockTitle = `${displayName}'s Team`;
    if (profileRoleLower === 'agent') {
      blockTitle = host.teamAnchor || host.team || `${displayName}'s Team`;
    }

    return (
      <div className="space-y-4 bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 p-5 rounded-3xl transition-all duration-300 hover:border-[#D4AF37]/50 group shadow-[0_0_15px_rgba(212,175,55,0.15)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] text-sm shadow-inner">👤</div>
            <h4 className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">{blockTitle}</h4>
          </div>
          <span className="px-3 py-1 text-[9px] font-black text-indigo-400 border border-indigo-500/30 bg-indigo-500/10 rounded-full uppercase tracking-widest">
            {assignedHostsList.length} assigned
          </span>
        </div>

        {isLoadingAssignedHosts ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <div className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400/60">Loading assigned hosts...</p>
          </div>
        ) : assignedHostsList.length === 0 ? (
          <p className="text-xs text-[#A09E9A]/40 italic text-center py-6 font-medium">No assigned hosts found.</p>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {assignedHostsList.map((h, idx) => {
              const nickname = h.nickname || h.name || 'Unnamed';
              return (
                <div key={h.id || idx} className="flex flex-col gap-2">
                  {/* Photo Container */}
                  <div
                    onClick={() => setSpotlightHost(h)}
                    className="relative overflow-hidden flex items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-[#1E2838] to-[#0E131C] w-full h-[76px] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 cursor-pointer select-none"
                  >
                    {h.photoUrl ? (
                      <img src={h.photoUrl} alt={nickname} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl text-[#A09E9A] font-black">
                        {nickname[0]?.toUpperCase() || 'H'}
                      </div>
                    )}
                  </div>

                  {/* Text Elements */}
                  <div className="flex flex-col">
                    <span className="text-sm font-normal text-[#F0EFE8] truncate">
                      {nickname}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderIntakeSection = () => {
    const userRole = rootAuth?.role || '';
    if (userRole !== 'Agent' && userRole !== 'agent') return null;

    return (
      <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 p-5 rounded-3xl transition-all duration-300 hover:border-[#D4AF37]/50 group shadow-[0_0_15px_rgba(212,175,55,0.15)]">
        <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm shadow-inner">📥</div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8]">Request Host Intake</h4>
            <p className="text-[9px] text-[#A09E9A] uppercase tracking-wider mt-0.5 font-bold">Submit a new host to the Director for onboarding</p>
          </div>
        </div>

        <form onSubmit={handleIntakeSubmit} className="space-y-3.5 max-w-md">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Poppo ID</label>
              <input
                type="text"
                value={intakePoppoId}
                onChange={(e) => setIntakePoppoId(e.target.value)}
                placeholder="e.g. 1234567"
                className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50"
                required
                title="Poppo ID"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Nickname</label>
              <input
                type="text"
                value={intakeNickname}
                onChange={(e) => setIntakeNickname(e.target.value)}
                placeholder="e.g. SweetHost"
                className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50"
                required
                title="Nickname"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmittingIntake}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
          >
            {isSubmittingIntake && <Loader2 className="h-3 w-3 animate-spin" />}
            <span>{isSubmittingIntake ? 'Submitting...' : 'Submit Request'}</span>
          </button>

          {intakeSuccess && (
            <div className="p-2 bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-bold flex items-center gap-1.5">
              <span>✅</span>
              <span>{intakeSuccess}</span>
            </div>
          )}

          {intakeError && (
            <div className="p-2 bg-rose-950/40 border border-rose-500/20 text-rose-400 rounded-lg text-[9px] font-bold flex items-center gap-1.5">
              <span>❌</span>
              <span>{intakeError}</span>
            </div>
          )}
        </form>
      </div>
    );
  };

  const renderProgressNotes = () => {
    const userRole = String(rootAuth?.role || '').toLowerCase();
    const isManagerOrAgent = userRole === 'manager' || userRole === 'agent';
    if (!isManagerOrAgent) return null;

    // Calculate recommendations dynamic justifications
    const getDynamicWhy = (templateId: string, hostId: string) => {
      if (!hostId) return "Select a host to see dynamic task justification.";
      const selectedHost = assignedHostsList.find(h => String(h.poppo_id || h.poppoId || h.id || '') === hostId);
      if (!selectedHost) return "Select a host to see dynamic task justification.";

      const nickname = selectedHost.nickname || selectedHost.name || 'Unnamed';

      const hostEvents = rosterEvents.filter(evt => {
        const pIds = evt.participantIds || evt.participants_id || [];
        const participants = evt.participants || [];
        return (Array.isArray(pIds) && pIds.includes(hostId)) ||
          (Array.isArray(participants) && participants.includes(hostId)) ||
          String(evt.poppo_id || evt.event_host_id || '') === hostId;
      });

      const getEventDateStringLocal = (evt: any): string => {
        if (evt.date) return evt.date;
        if (evt.event_date) return evt.event_date;
        if (evt.eventDate) {
          if (typeof evt.eventDate === 'string') return evt.eventDate.split('T')[0];
          if (evt.eventDate.toDate) return evt.eventDate.toDate().toISOString().split('T')[0];
          if (evt.eventDate.seconds) return new Date(evt.eventDate.seconds * 1000).toISOString().split('T')[0];
          return new Date(evt.eventDate).toISOString().split('T')[0];
        }
        return '';
      };

      const todayDate = new Date();
      const yyyyVal = todayDate.getFullYear();
      const mmVal = String(todayDate.getMonth() + 1).padStart(2, '0');
      const ddVal = String(todayDate.getDate()).padStart(2, '0');
      const todayStrLocal = `${yyyyVal}-${mmVal}-${ddVal}`;

      const hostUpcomingEvents = hostEvents.filter(evt => {
        const dateStr = getEventDateStringLocal(evt).replace(/\//g, '-');
        return dateStr >= todayStrLocal;
      });

      const hostPastEvents = hostEvents.filter(evt => {
        const dateStr = getEventDateStringLocal(evt).replace(/\//g, '-');
        return dateStr < todayStrLocal;
      });

      let hostPastEventParticipations = 0;
      let hostAttendedEventParticipations = 0;
      let hostMissedEventsCount = 0;

      hostPastEvents.forEach(evt => {
        hostPastEventParticipations++;
        const att = rosterAttendance.find(a => a.eventId === evt.event_id || a.eventId === evt.id);
        if (att) {
          const isPresent = (Array.isArray(att.attendeeIds) && att.attendeeIds.includes(hostId)) ||
            (Array.isArray(att.attendees) && att.attendees.some((a: any) => String(a.poppoId || a.id || '').trim() === hostId));
          if (isPresent) {
            hostAttendedEventParticipations++;
          } else {
            hostMissedEventsCount++;
          }
        } else {
          hostMissedEventsCount++;
        }
      });

      const hostAttendanceRate = hostPastEventParticipations > 0 ? (hostAttendedEventParticipations / hostPastEventParticipations) : 1.0;

      switch (templateId) {
        case 'livehouse':
          return hostUpcomingEvents.length <= 1
            ? `⚠️ ${nickname} has only ${hostUpcomingEvents.length} upcoming event(s). Scheduling a Livehouse is urgent to prevent room visibility decay.`
            : `✅ ${nickname} currently has ${hostUpcomingEvents.length} upcoming events. Suggest scheduling another to maintain exposure.`;
        case 'talent_auction':
          return `✨ Register ${nickname} on the Monthly Talent Auction to boost exposure and attract new supporters/spenders.`;
        case 'attendance':
          return hostMissedEventsCount > 0
            ? `⚠️ ${nickname} missed ${hostMissedEventsCount} event(s) recently. Remind them of upcoming events to stop attendance slippage.`
            : `✅ ${nickname} has kept a strong attendance sheet (${Math.round(hostAttendanceRate * 100)}%). Keep encouraging them!`;
        case 'pk':
          return `⚔️ Completing 1 hour of random PK battles helps ${nickname} build room dynamics, match experience, and supporter support.`;
        case 'voice_seat':
          return `🎙️ Bringing viewers to voice seats increases live interaction, room retention, and chat gift-giving rates for ${nickname}.`;
        case 'song_requests':
          return `🎵 Suggesting ${nickname} perform 9 song requests per stream drives chat engagement and lengthens session duration.`;
        case 'gc_members':
          return `💬 Growing ${nickname}'s Group Chat (GC) members ensures instant reach and notifications whenever they go live.`;
        case 'pre_stream':
          return `📢 Reminding ${nickname} to post feed/social updates 15 minutes before going live drives launch-traffic directly.`;
        default:
          return '';
      }
    };

    const recommendationTemplates = [
      { id: 'livehouse', category: 'Exposure & Scheduling', title: 'Schedule a Livehouse Event', priority: 'High' },
      { id: 'talent_auction', category: 'Exposure & Scheduling', title: 'Register on the Talent Auction', priority: 'High' },
      { id: 'attendance', category: 'Coaching & Retention', title: 'Encourage to Show Up to Next Event', priority: 'High' },
      { id: 'pk', category: 'Coaching & Retention', title: 'Complete 1 Hour of Random PK', priority: 'Normal' },
      { id: 'voice_seat', category: 'Live & Engagement', title: 'Suggest to Bring Audience to Voice Seat', priority: 'Normal' },
      { id: 'song_requests', category: 'Live & Engagement', title: 'Complete 9 Song Requests per Stream', priority: 'Normal' },
      { id: 'gc_members', category: 'Fanbase & Communication', title: 'Grow Fanclub GC Members', priority: 'Normal' },
      { id: 'pre_stream', category: 'Fanbase & Communication', title: 'Post Pre-Stream Update Message', priority: 'Normal' }
    ];

    const categories = ['Exposure & Scheduling', 'Coaching & Retention', 'Live & Engagement', 'Fanbase & Communication'];

    return (
      <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 p-5 rounded-3xl transition-all duration-300 hover:border-[#D4AF37]/50 group shadow-[0_0_15px_rgba(212,175,55,0.15)] space-y-4">
        {/* Header and Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm shadow-inner">📝</div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-[#F0EFE8]">Progress Notes</h4>
              <p className="text-[9px] text-[#A09E9A] uppercase tracking-wider mt-0.5 font-bold">Record and review host coaching logs</p>
            </div>
          </div>

          <div className="flex bg-black/20 p-1 rounded-xl border border-white/5 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setActiveTab('todo')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'todo'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'text-[#A09E9A] hover:text-white'
                }`}
            >
              To-Do List
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('add')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'add'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'text-[#A09E9A] hover:text-white'
                }`}
            >
              Add Notes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'history'
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                : 'text-[#A09E9A] hover:text-white'
                }`}
            >
              Notes History
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'todo' && (
          <div className="space-y-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newTodoTitle.trim()) return;
                handleAddTodo(newTodoTitle, newTodoHostId);
                setNewTodoTitle('');
                setNewTodoHostId('');
              }}
              className="bg-[#0D0D14]/80 border border-white/5 p-4 rounded-2xl space-y-3"
            >
              <div className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A] border-b border-white/5 pb-1">
                Create New Task
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={newTodoTitle}
                    onChange={(e) => setNewTodoTitle(e.target.value)}
                    placeholder="E.g., Host exposure check, attendance sync..."
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50"
                    required
                    title="Task Title"
                  />
                </div>
                <div className="sm:w-48 space-y-1">
                  <select
                    value={newTodoHostId}
                    onChange={(e) => setNewTodoHostId(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                    title="Assign Host"
                  >
                    <option value="">-- General Roster --</option>
                    {assignedHostsList.map((h) => (
                      <option key={h.poppo_id || h.poppoId || h.id} value={h.poppo_id || h.poppoId || h.id}>
                        {h.nickname || h.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-md self-stretch flex items-center justify-center"
                >
                  Add
                </button>
              </div>
            </form>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A] flex items-center gap-1.5">
                  <span>📌</span> Active Tasks ({todoList.filter(t => !t.completed).length})
                </div>
                {todoList.filter(t => !t.completed).length === 0 ? (
                  <p className="text-[11px] text-[#A09E9A]/40 italic py-4 text-center bg-[#0D0D14]/30 border border-dashed border-white/5 rounded-2xl">
                    No active tasks.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                    {todoList.filter(t => !t.completed).map(todo => (
                      <div key={todo.id || todo.todoId} className="flex items-center justify-between gap-3 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 p-3 rounded-xl transition-all">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={false}
                            onChange={() => handleToggleTodo(todo)}
                            className="w-4 h-4 rounded border-white/10 bg-black/40 text-indigo-600 focus:ring-0 cursor-pointer"
                            title="Complete Task"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs text-[#F0EFE8] font-medium leading-normal">{todo.title}</span>
                            {todo.hostNickname && todo.hostId !== 'roster' && (
                              <span className="text-[9px] font-black text-indigo-400 uppercase mt-0.5 tracking-wider bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/10 self-start">
                                {todo.hostNickname}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTodo(todo.id || todo.todoId)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/15 text-[#A09E9A] hover:text-rose-400 transition-all cursor-pointer"
                          title="Delete Task"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Smart Recommendations Section */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A] flex items-center gap-1.5 flex-wrap">
                <span>✨</span> Coaching Recommendations
              </div>

              <div className="space-y-5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                {categories.map(cat => {
                  const catTemplates = recommendationTemplates.filter(t => t.category === cat);
                  return (
                    <div key={cat} className="space-y-2.5">
                      <div className="text-[9px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/5 px-2 py-1 rounded border border-indigo-500/10 self-start inline-block">
                        {cat}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {catTemplates.map(template => {
                          const selectedHostId = recSelectedHosts[template.id] || '';
                          const selectedHost = assignedHostsList.find(h => String(h.poppo_id || h.poppoId || h.id || '') === selectedHostId);
                          const whyText = selectedHostId ? getDynamicWhy(template.id, selectedHostId) : '';

                          const alreadyAdded = selectedHostId
                            ? todoList.some(todo => String(todo.hostId) === String(selectedHostId) && todo.title === template.title && !todo.completed)
                            : false;

                          return (
                            <div key={template.id} className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl flex flex-col justify-between gap-3 hover:border-indigo-500/20 transition-all">
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-black text-[#F0EFE8] leading-tight">
                                    {template.title}
                                  </span>
                                  <span className={cn(
                                    "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0",
                                    template.priority === 'High' ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
                                  )}>
                                    {template.priority}
                                  </span>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[8px] font-black uppercase text-[#A09E9A] tracking-wider">Select Host</label>
                                  <select
                                    value={selectedHostId}
                                    onChange={(e) => setRecSelectedHosts(prev => ({ ...prev, [template.id]: e.target.value }))}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
                                    title="Recommend Host"
                                  >
                                    <option value="">-- Choose Host --</option>
                                    {assignedHostsList.map(h => (
                                      <option key={h.poppo_id || h.poppoId || h.id} value={h.poppo_id || h.poppoId || h.id}>
                                        {h.nickname || h.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {selectedHostId ? (
                                  <div className="text-[10px] text-[#F0EFE8]/90 font-medium leading-relaxed bg-indigo-500/5 p-2 rounded-xl border border-indigo-500/10">
                                    {whyText}
                                  </div>
                                ) : (
                                  <div className="text-[9px] text-[#A09E9A]/40 italic">
                                    Select a host to see dynamic task justification.
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                disabled={!selectedHostId || alreadyAdded}
                                onClick={() => handleAddTodo(template.title, selectedHostId)}
                                className={cn(
                                  "w-full py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer text-center border",
                                  !selectedHostId
                                    ? "bg-black/20 border-white/5 text-[#A09E9A]/40 cursor-not-allowed"
                                    : alreadyAdded
                                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-not-allowed"
                                      : "bg-indigo-600/10 hover:bg-indigo-600 border-indigo-500/20 hover:border-indigo-500 text-indigo-400 hover:text-white"
                                )}
                              >
                                {!selectedHostId
                                  ? 'Select Host First'
                                  : alreadyAdded
                                    ? 'Added to To-Do'
                                    : 'Add to To-Do List'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'add' && (
          <form onSubmit={handleNoteSubmit} className="space-y-4 max-w-md">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Select Host</label>
              <select
                value={noteHostId}
                onChange={(e) => setNoteHostId(e.target.value)}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                required
                title="Host Selection"
              >
                <option value="">-- Choose Host --</option>
                {assignedHostsList.map((h) => {
                  const name = h.nickname || h.name || 'Unnamed';
                  const poppoId = h.poppo_id || h.poppoId || h.id;
                  return (
                    <option key={poppoId} value={poppoId}>
                      {name} - {poppoId}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Feedback Content</label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write notes, coaching feedback, or action steps..."
                className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white h-24 resize-none focus:outline-none focus:border-indigo-500/50"
                required
                title="Note Content"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
            >
              Save Feedback Note
            </button>

            {noteSuccess && (
              <div className="p-2 bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-bold flex items-center gap-1.5">
                <span>✅</span>
                <span>{noteSuccess}</span>
              </div>
            )}

            {noteError && (
              <div className="p-2 bg-rose-950/40 border border-rose-500/20 text-rose-400 rounded-lg text-[9px] font-bold flex items-center gap-1.5">
                <span>❌</span>
                <span>{noteError}</span>
              </div>
            )}
          </form>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="space-y-1.5 max-w-md">
              <label className="text-[9px] font-black uppercase text-[#A09E9A] tracking-wider">Select Host</label>
              <select
                value={noteHostId}
                onChange={(e) => setNoteHostId(e.target.value)}
                className="w-full bg-[#0D0D14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                title="Host Selection"
              >
                <option value="">-- Choose Host --</option>
                {assignedHostsList.map((h) => {
                  const name = h.nickname || h.name || 'Unnamed';
                  const poppoId = h.poppo_id || h.poppoId || h.id;
                  return (
                    <option key={poppoId} value={poppoId}>
                      {name} - {poppoId}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* History List */}
            {!noteHostId ? (
              <div className="bg-[#0D0D14] border border-white/5 rounded-xl py-6 text-center text-xs text-[#A09E9A]/40 italic font-medium">
                Please select a host to view their progress feedback logs.
              </div>
            ) : isLoadingNotes ? (
              <div className="bg-[#0D0D14] border border-white/5 rounded-xl py-6 flex flex-col items-center justify-center gap-1.5">
                <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
                <span className="text-[8px] text-[#A09E9A] uppercase tracking-wider">Loading history...</span>
              </div>
            ) : notesHistory.length === 0 ? (
              <div className="bg-[#0D0D14] border border-white/5 rounded-xl py-6 text-center text-xs text-[#A09E9A]/40 italic font-medium">
                No notes recorded for this host yet.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[200px] overflow-y-auto custom-scrollbar bg-[#0D0D14] border border-white/5 rounded-xl p-2.5">
                {notesHistory.map((note) => (
                  <div key={note.id} className="bg-white/[0.02] border border-white/5 p-3 rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] font-mono text-[#A09E9A]/60">
                      <span className="font-bold text-indigo-400">{note.managerName || 'Manager'}</span>
                      <span>{new Date(note.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-white text-xs leading-relaxed whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderRosterEventsAndAttendance = () => {
    const profileRoleLower = String(host.role || '').toLowerCase();
    const isManagerOrAgent = profileRoleLower === 'manager' || profileRoleLower === 'agent';
    if (!isManagerOrAgent) return null;

    // Helper to extract date string in YYYY-MM-DD
    const getEventDateString = (evt: any): string => {
      if (evt.date) return evt.date;
      if (evt.event_date) return evt.event_date;
      if (evt.eventDate) {
        if (typeof evt.eventDate === 'string') return evt.eventDate.split('T')[0];
        if (evt.eventDate.toDate) return evt.eventDate.toDate().toISOString().split('T')[0];
        if (evt.eventDate.seconds) return new Date(evt.eventDate.seconds * 1000).toISOString().split('T')[0];
        return new Date(evt.eventDate).toISOString().split('T')[0];
      }
      return '';
    };

    // Calculate today's date in local time YYYY-MM-DD
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const hostIds = assignedHostsList.map(h => String(h.poppo_id || h.poppoId || h.id || ''));

    // Filter events for assigned hosts
    const filteredEvents = rosterEvents.filter(evt => {
      const pIds = evt.participantIds || evt.participants_id || [];
      const participants = evt.participants || [];
      const isPart = (Array.isArray(pIds) && pIds.some((id: any) => hostIds.includes(String(id)))) ||
        (Array.isArray(participants) && participants.some((id: any) => hostIds.includes(String(id)))) ||
        hostIds.includes(String(evt.poppo_id || evt.event_host_id || ''));
      return isPart;
    });

    // Separate upcoming and past
    const upcomingEvents = filteredEvents.filter(evt => {
      const dateStr = getEventDateString(evt).replace(/\//g, '-');
      return dateStr >= todayStr;
    });

    const pastEvents = filteredEvents.filter(evt => {
      const dateStr = getEventDateString(evt).replace(/\//g, '-');
      return dateStr < todayStr;
    });

    // Sort upcoming events: date ascending (soonest first)
    upcomingEvents.sort((a, b) => {
      const dateA = getEventDateString(a).replace(/\//g, '-');
      const dateB = getEventDateString(b).replace(/\//g, '-');
      return dateA.localeCompare(dateB);
    });

    // Filter attendance for assigned hosts
    const filteredAttendance = rosterAttendance.filter(att => {
      const attendeeIds = att.attendeeIds || [];
      const attendees = att.attendees || [];
      const participantIds = att.participantIds || [];
      const participants = att.participants || [];
      const isAtt = (Array.isArray(attendeeIds) && attendeeIds.some((id: any) => hostIds.includes(String(id)))) ||
        (Array.isArray(participantIds) && participantIds.some((id: any) => hostIds.includes(String(id)))) ||
        (Array.isArray(participants) && participants.some((id: any) => hostIds.includes(String(id)))) ||
        (Array.isArray(attendees) && attendees.some((a: any) => hostIds.includes(String(a.poppoId || a.id || '')))) ||
        hostIds.includes(String(att.poppo_id || att.poppoId || att.hostId || ''));
      return isAtt;
    });

    // Helper to get attendance Date for sorting
    const getAttendanceDate = (att: any): Date => {
      if (att.eventDate) {
        if (att.eventDate.toDate) return att.eventDate.toDate();
        if (att.eventDate.seconds) return new Date(att.eventDate.seconds * 1000);
        return new Date(att.eventDate);
      }
      if (att.submittedAt) {
        if (att.submittedAt.toDate) return att.submittedAt.toDate();
        if (att.submittedAt.seconds) return new Date(att.submittedAt.seconds * 1000);
        return new Date(att.submittedAt);
      }
      if (att.timestamp) return new Date(att.timestamp);
      return new Date(0);
    };

    // Sort attendance logs: date descending
    filteredAttendance.sort((a, b) => getAttendanceDate(b).getTime() - getAttendanceDate(a).getTime());

    // Calculate Insights Condition
    let totalPastEventParticipations = 0;
    let totalAttendedEventParticipations = 0;
    let hasMissedEvent = false;

    pastEvents.forEach(evt => {
      const eventHosts = assignedHostsList.filter(h => {
        const hostId = String(h.poppo_id || h.poppoId || h.id || '');
        const pIds = evt.participantIds || evt.participants_id || [];
        const participants = evt.participants || [];
        return (Array.isArray(pIds) && pIds.includes(hostId)) ||
          (Array.isArray(participants) && participants.includes(hostId)) ||
          String(evt.poppo_id || evt.event_host_id || '') === hostId;
      });

      eventHosts.forEach(h => {
        const hostId = String(h.poppo_id || h.poppoId || h.id || '');
        totalPastEventParticipations++;

        // Find attendance record for this event
        const att = rosterAttendance.find(a => a.eventId === evt.event_id || a.eventId === evt.id);
        if (att) {
          const isPresent = (Array.isArray(att.attendeeIds) && att.attendeeIds.includes(hostId)) ||
            (Array.isArray(att.attendees) && att.attendees.some((a: any) => String(a.poppoId || a.id || '').trim() === hostId));
          if (isPresent) {
            totalAttendedEventParticipations++;
          } else {
            hasMissedEvent = true;
          }
        } else {
          hasMissedEvent = true;
        }
      });
    });

    const attendanceRate = totalPastEventParticipations > 0 ? (totalAttendedEventParticipations / totalPastEventParticipations) : 1.0;
    const isAttendanceLow = attendanceRate < 0.8 || hasMissedEvent;

    let insightType: 'warning' | 'success' = 'success';
    let insightMessage = '';

    if (upcomingEvents.length <= 1) {
      insightType = 'warning';
      insightMessage = "Action Needed: Your roster has very few upcoming events. Encourage your hosts to schedule a Solo Livehouse or participate in external events like the Monthly Talent Auction to boost their exposure!";
    } else if (isAttendanceLow) {
      insightType = 'warning';
      insightMessage = "Action Needed: Roster attendance is slipping. Push your hosts to be present at upcoming calendar events and drop supportive comments during the stream to show team solidarity.";
    } else {
      insightType = 'success';
      insightMessage = "Great job! Your roster is highly engaged with a healthy event schedule and strong attendance.";
    }

    return (
      <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 p-5 rounded-3xl transition-all duration-300 hover:border-[#D4AF37]/50 group shadow-[0_0_15px_rgba(212,175,55,0.15)] space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] text-sm shadow-inner">
              <Calendar size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">Roster Events &amp; Attendance</h4>
              <p className="text-[9px] text-[#A09E9A] uppercase tracking-wider mt-0.5 font-bold">Roster scheduling and check-in logs</p>
            </div>
          </div>
        </div>

        {/* Actionable Insights callout box */}
        {!isSpotlight && (
          <div className={cn(
            "p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 shadow-md transition-all duration-300",
            insightType === 'warning'
              ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          )}>
            <span className="text-base leading-none select-none shrink-0 mt-0.5">
              {insightType === 'warning' ? '⚠️' : '✅'}
            </span>
            <div className="space-y-1">
              <h5 className="font-black uppercase tracking-wider text-[10px]">
                {insightType === 'warning' ? 'Actionable Insights' : 'Recommendations'}
              </h5>
              <p className="font-medium text-[#F0EFE8]/90">{insightMessage}</p>
            </div>
          </div>
        )}

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upcoming Events Column */}
          <div className="space-y-3">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] flex items-center gap-1.5 border-b border-white/5 pb-1.5">
              <span>📅</span> Upcoming Events ({upcomingEvents.length})
            </h5>
            {isLoadingRosterData ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
                <span className="text-[8px] text-[#A09E9A] uppercase tracking-wider">Syncing Events...</span>
              </div>
            ) : upcomingEvents.length === 0 ? (
              <p className="text-xs text-[#A09E9A]/40 italic py-6 text-center bg-[#0D0D14] border border-white/5 rounded-2xl">
                No upcoming events scheduled.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {upcomingEvents.map(evt => {
                  const eventHosts = assignedHostsList.filter(h => {
                    const hostId = String(h.poppo_id || h.poppoId || h.id || '');
                    const pIds = evt.participantIds || evt.participants_id || [];
                    const participants = evt.participants || [];
                    return (Array.isArray(pIds) && pIds.includes(hostId)) ||
                      (Array.isArray(participants) && participants.includes(hostId)) ||
                      String(evt.poppo_id || evt.event_host_id || '') === hostId;
                  });

                  return (
                    <div key={evt.id || evt.event_id} className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 p-3 rounded-2xl transition-all space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-black text-[#F0EFE8] leading-tight line-clamp-1">{evt.title}</span>
                        <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-[8px] font-black uppercase text-indigo-400 tracking-wider shrink-0">
                          {evt.type || evt.type_of_event || 'Event'}
                        </span>
                      </div>
                      <p className="text-[10px] text-[#A09E9A] font-medium leading-relaxed line-clamp-2">{evt.description}</p>

                      <div className="flex flex-col gap-1 pt-1.5 border-t border-white/[0.03] text-[9px] font-mono text-[#A09E9A]/60">
                        <div className="flex items-center gap-1">
                          <span className="text-[#A09E9A]/40">Date:</span>
                          <span className="text-[#F0EFE8]/80 font-bold">{getEventDateString(evt)}</span>
                          {evt.time && (
                            <>
                              <span className="text-[#A09E9A]/30">|</span>
                              <span className="text-[#F0EFE8]/80">{evt.time}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[#A09E9A]/40">Host(s):</span>
                          {eventHosts.map(h => (
                            <span key={h.id || h.poppo_id} className="text-indigo-400 font-bold bg-indigo-500/5 px-1.5 py-0.5 rounded border border-indigo-500/10 mr-1 my-0.5">
                              {h.nickname || h.name || 'Unnamed'} ({h.poppo_id || h.poppoId || h.id})
                            </span>
                          ))}
                          {eventHosts.length === 0 && (
                            <span className="text-[#A09E9A]/40 italic">None assigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Attendance Logs Column */}
          <div className="space-y-3">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] flex items-center gap-1.5 border-b border-white/5 pb-1.5">
              <span>📋</span> Recent Attendance Logs ({filteredAttendance.length})
            </h5>
            {isLoadingRosterData ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
                <span className="text-[8px] text-[#A09E9A] uppercase tracking-wider">Syncing Attendance...</span>
              </div>
            ) : filteredAttendance.length === 0 ? (
              <p className="text-xs text-[#A09E9A]/40 italic py-6 text-center bg-[#0D0D14] border border-white/5 rounded-2xl">
                No recent attendance records.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {filteredAttendance.slice(0, 10).map(att => {
                  const presentHosts = assignedHostsList.filter(h => {
                    const hostId = String(h.poppo_id || h.poppoId || h.id || '');
                    const attendeeIds = att.attendeeIds || [];
                    const attendees = att.attendees || [];
                    const participantIds = att.participantIds || [];
                    const participants = att.participants || [];
                    return (Array.isArray(attendeeIds) && attendeeIds.includes(hostId)) ||
                      (Array.isArray(participantIds) && participantIds.includes(hostId)) ||
                      (Array.isArray(participants) && participants.includes(hostId)) ||
                      (Array.isArray(attendees) && attendees.some((a: any) => String(a.poppoId || a.id || '').trim() === hostId)) ||
                      String(att.poppo_id || att.poppoId || att.hostId || '') === hostId;
                  });

                  const formattedDate = att.eventDate || (att.timestamp ? att.timestamp.split('T')[0] : '');

                  return (
                    <div key={att.id || att.attendanceId} className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 p-3 rounded-2xl transition-all space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-black text-[#F0EFE8] leading-tight line-clamp-1">{att.eventTitle || 'Event Attendance'}</span>
                        <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-[8px] font-black uppercase text-emerald-400 tracking-wider shrink-0">
                          Checked-In
                        </span>
                      </div>
                      {att.eventFeedback && (
                        <p className="text-[10px] text-[#A09E9A] font-medium leading-relaxed bg-black/15 p-2 rounded-xl border border-white/5 italic">
                          "{att.eventFeedback}"
                        </p>
                      )}

                      <div className="flex flex-col gap-1 pt-1.5 border-t border-white/[0.03] text-[9px] font-mono text-[#A09E9A]/60">
                        <div className="flex items-center gap-1">
                          <span className="text-[#A09E9A]/40">Date:</span>
                          <span className="text-[#F0EFE8]/80 font-bold">{formattedDate}</span>
                          {att.timeslot && (
                            <>
                              <span className="text-[#A09E9A]/30">|</span>
                              <span className="text-[#F0EFE8]/80">{att.timeslot}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="text-[#A09E9A]/40">Present:</span>
                          {presentHosts.map(h => (
                            <span key={h.id || h.poppo_id} className="text-emerald-400 font-bold bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10 mr-1 my-0.5">
                              {h.nickname || h.name || 'Unnamed'} ({h.poppo_id || h.poppoId || h.id})
                            </span>
                          ))}
                          {presentHosts.length === 0 && (
                            <span className="text-[#A09E9A]/40 italic">None assigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderHeadAdminReportsTo = () => {
    const directorUser = allUsers.find(u => String(u.role || '').toLowerCase() === 'director');
    const headAdminNickname = host.nickname || host.name || 'Unnamed';

    return (
      <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 p-5 rounded-3xl transition-all duration-300 hover:border-[#D4AF37]/50 group shadow-[0_0_15px_rgba(212,175,55,0.15)] space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A] border-b border-white/5 pb-2">
          Reports To:
        </h4>
        {directorUser ? (
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity p-2 rounded-xl bg-white/[0.02] border border-white/5"
            onClick={() => setSpotlightHost(directorUser)}
          >
            {directorUser.photoUrl ? (
              <img src={directorUser.photoUrl} alt="Director" className="w-14 h-14 rounded-full object-cover border-2 border-[#D4AF37]/30 shadow-inner" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-black/80 to-black border-2 border-[#D4AF37]/30 flex items-center justify-center text-xl font-black text-[#D4AF37]">
                {(directorUser.nickname || directorUser.name || 'D')[0].toUpperCase()}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Director</span>
              <span className="text-sm font-bold text-[#F0EFE8]">{directorUser.nickname || directorUser.name}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#A09E9A]/60 italic">Director profile not found.</p>
        )}

        <div className="pt-4 mt-2 border-t border-white/5 space-y-3">
          <h3 className="text-sm font-black">
            <span className="text-[#D4AF37]">{headAdminNickname}'s Position:</span> <span className="text-[#F0EFE8]">Head of Operations</span>
          </h3>
          <div className="bg-black/20 p-4 rounded-xl border border-white/5">
            <h5 className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37] mb-2">Role Description</h5>
            <p className="text-sm font-medium text-[#F0EFE8]/90 leading-relaxed">
              Leads daily agency operations and oversees all Agents and Managers to keep teams running smoothly. Handles escalations, high-level issues, and account troubleshooting through direct access to Poppo Live admins. Ensures structure, compliance, and efficient day-to-day performance.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderGrid = (title: string, list: any[], colorClass: string, bgClass: string, borderClass: string) => (
    <div className={cn("p-4 rounded-2xl border backdrop-blur-md shadow-inner space-y-4", bgClass, borderClass)}>
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h4 className={cn("text-[10px] font-black uppercase tracking-widest", colorClass)}>{title}</h4>
        <span className={cn("px-2 py-0.5 text-[8px] font-black rounded-full uppercase tracking-widest border", colorClass, bgClass, borderClass)}>
          {list.length} Total
        </span>
      </div>
      {list.length === 0 ? (
        <p className="text-xs text-[#A09E9A]/40 italic py-4 text-center">No profiles found.</p>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {list.map((u, idx) => {
            const nickname = u.nickname || u.name || 'Unnamed';
            return (
              <div key={u.id || idx} className="flex flex-col gap-2">
                <div
                  onClick={() => setSpotlightHost(u)}
                  className="relative overflow-hidden flex items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-[#1E2838] to-[#0E131C] w-full h-[76px] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 cursor-pointer select-none"
                  title={`View ${nickname}`}
                >
                  {u.photoUrl ? (
                    <img src={u.photoUrl} alt={nickname} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl text-[#A09E9A] font-black">
                      {nickname[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#F0EFE8] truncate">{nickname}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderRoleSupervision = () => {
    const managers = allUsers.filter(u => String(u.role || '').toLowerCase() === 'manager');
    const agents = allUsers.filter(u => String(u.role || '').toLowerCase() === 'agent');
    const admins = allUsers.filter(u => String(u.role || '').toLowerCase() === 'admin');
    const hosts = allUsers.filter(u => {
      const r = String(u.role || '').toLowerCase();
      const s = String(u.status || '').toLowerCase();
      return (r === 'host' || r === 'talent') && s !== 'released';
    });

    return (
      <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 p-5 rounded-3xl transition-all duration-300 hover:border-[#D4AF37]/50 group shadow-[0_0_15px_rgba(212,175,55,0.15)] space-y-6">
        <h3 className="text-sm font-black uppercase tracking-widest text-[#D4AF37] border-b border-[#D4AF37]/20 pb-3">
          Role Oversight & Supervision
        </h3>
        
        {renderGrid('Managers', managers, 'text-emerald-400', 'bg-emerald-500/10', 'border-emerald-500/30')}
        {renderGrid('Agents', agents, 'text-indigo-400', 'bg-indigo-500/10', 'border-indigo-500/30')}
        {renderGrid('Admins', admins, 'text-purple-400', 'bg-purple-500/10', 'border-purple-500/30')}
        {renderGrid('Hosts', hosts, 'text-[#D4AF37]', 'bg-[#D4AF37]/10', 'border-[#D4AF37]/30')}
      </div>
    );
  };

  const renderAdminReportsTo = () => {
    const directorUser = allUsers.find(u => String(u.role || '').toLowerCase() === 'director');
    const headAdminUser = allUsers.find(u => String(u.role || '').toLowerCase() === 'head admin' || String(u.role || '').toLowerCase() === 'head_admin');
    const adminNickname = host.nickname || host.name || 'Unnamed';

    return (
      <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 p-5 rounded-3xl transition-all duration-300 hover:border-[#D4AF37]/50 group shadow-[0_0_15px_rgba(212,175,55,0.15)] space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A] border-b border-white/5 pb-2">
          Reports To:
        </h4>
        
        <div className="grid grid-cols-2 gap-4">
          {directorUser ? (
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity p-2 rounded-xl bg-white/[0.02] border border-white/5"
              onClick={() => setSpotlightHost(directorUser)}
            >
              {directorUser.photoUrl ? (
                <img src={directorUser.photoUrl} alt="Director" className="w-14 h-14 rounded-full object-cover border-2 border-[#D4AF37]/30 shadow-inner" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-black/80 to-black border-2 border-[#D4AF37]/30 flex items-center justify-center text-xl font-black text-[#D4AF37]">
                  {(directorUser.nickname || directorUser.name || 'D')[0].toUpperCase()}
                </div>
              )}
              <div className="flex flex-col overflow-hidden">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Director</span>
                <span className="text-sm font-bold text-[#F0EFE8] truncate">{directorUser.nickname || directorUser.name}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#A09E9A]/60 italic p-2">Director profile not found.</p>
          )}

          {headAdminUser ? (
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity p-2 rounded-xl bg-white/[0.02] border border-white/5"
              onClick={() => setSpotlightHost(headAdminUser)}
            >
              {headAdminUser.photoUrl ? (
                <img src={headAdminUser.photoUrl} alt="Head Admin" className="w-14 h-14 rounded-full object-cover border-2 border-[#D4AF37]/30 shadow-inner" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-black/80 to-black border-2 border-[#D4AF37]/30 flex items-center justify-center text-xl font-black text-indigo-400">
                  {(headAdminUser.nickname || headAdminUser.name || 'H')[0].toUpperCase()}
                </div>
              )}
              <div className="flex flex-col overflow-hidden">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Head Admin</span>
                <span className="text-sm font-bold text-[#F0EFE8] truncate">{headAdminUser.nickname || headAdminUser.name}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#A09E9A]/60 italic p-2">Head Admin profile not found.</p>
          )}
        </div>

        <div className="pt-4 mt-2 border-t border-white/5 space-y-3">
          <h3 className="text-sm font-black">
            <span className="text-[#D4AF37]">{adminNickname}'s Position:</span> <span className="text-[#F0EFE8]">Agency Admin</span>
          </h3>
          <div className="bg-black/20 p-4 rounded-xl border border-white/5">
            <h5 className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37] mb-2">Role Description</h5>
            <p className="text-sm font-medium text-[#F0EFE8]/90 leading-relaxed">
              Responsible for daily reporting of all hosts' livestream data for growth tracking. Manages accurate data entry, including Fanbase Health metrics, event creation, and attendance logs, ensuring all host records stay updated and organized. Also handles events promotion inside the platform's fanclub group chat feature.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderAdminRoleSupervision = () => {
    const hosts = allUsers.filter(u => {
      const r = String(u.role || '').toLowerCase();
      const s = String(u.status || '').toLowerCase();
      return (r === 'host' || r === 'talent') && s !== 'released';
    });

    return (
      <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 p-5 rounded-3xl transition-all duration-300 hover:border-[#D4AF37]/50 group shadow-[0_0_15px_rgba(212,175,55,0.15)] space-y-6">
        <h3 className="text-sm font-black uppercase tracking-widest text-[#D4AF37] border-b border-[#D4AF37]/20 pb-3">
          Role Oversight & Supervision
        </h3>
        
        <div className="p-4 rounded-2xl border backdrop-blur-md shadow-inner space-y-4 bg-[#D4AF37]/5 border-[#D4AF37]/20">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Hosts</h4>
            <span className="px-2 py-0.5 text-[8px] font-black rounded-full uppercase tracking-widest border text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/30">
              {hosts.length} Total
            </span>
          </div>
          {hosts.length === 0 ? (
            <p className="text-xs text-[#A09E9A]/40 italic py-4 text-center">No profiles found.</p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {hosts.map((u, idx) => {
                const nickname = u.nickname || u.name || 'Unnamed';
                return (
                  <div key={u.id || idx} className="flex flex-col gap-2">
                    <div
                      onClick={() => setSpotlightHost(u)}
                      className="relative overflow-hidden flex items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-[#1E2838] to-[#0E131C] w-full h-[76px] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 cursor-pointer select-none"
                      title={`View ${nickname}`}
                    >
                      {u.photoUrl ? (
                        <img src={u.photoUrl} alt={nickname} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl text-[#A09E9A] font-black">
                          {nickname[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[#F0EFE8] truncate">{nickname}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderManagerAgentReportsTo = () => {
    const directorUser = allUsers.find(u => String(u.role || '').toLowerCase() === 'director');
    const headAdminUser = allUsers.find(u => String(u.role || '').toLowerCase() === 'head admin' || String(u.role || '').toLowerCase() === 'head_admin');
    const roleNickname = host.nickname || host.name || 'Unnamed';
    const displayRole = (host.role || 'Manager').charAt(0).toUpperCase() + (host.role || 'Manager').slice(1).toLowerCase();

    return (
      <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 p-5 rounded-3xl transition-all duration-300 hover:border-[#D4AF37]/50 group shadow-[0_0_15px_rgba(212,175,55,0.15)] space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#A09E9A] border-b border-white/5 pb-2">
          Reports To:
        </h4>
        
        <div className="grid grid-cols-2 gap-4">
          {directorUser ? (
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity p-2 rounded-xl bg-white/[0.02] border border-white/5"
              onClick={() => setSpotlightHost(directorUser)}
            >
              {directorUser.photoUrl ? (
                <img src={directorUser.photoUrl} alt="Director" className="w-14 h-14 rounded-full object-cover border-2 border-[#D4AF37]/30 shadow-inner" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-black/80 to-black border-2 border-[#D4AF37]/30 flex items-center justify-center text-xl font-black text-[#D4AF37]">
                  {(directorUser.nickname || directorUser.name || 'D')[0].toUpperCase()}
                </div>
              )}
              <div className="flex flex-col overflow-hidden">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]">Director</span>
                <span className="text-sm font-bold text-[#F0EFE8] truncate">{directorUser.nickname || directorUser.name}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#A09E9A]/60 italic p-2">Director profile not found.</p>
          )}

          {headAdminUser ? (
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity p-2 rounded-xl bg-white/[0.02] border border-white/5"
              onClick={() => setSpotlightHost(headAdminUser)}
            >
              {headAdminUser.photoUrl ? (
                <img src={headAdminUser.photoUrl} alt="Head Admin" className="w-14 h-14 rounded-full object-cover border-2 border-[#D4AF37]/30 shadow-inner" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-black/80 to-black border-2 border-[#D4AF37]/30 flex items-center justify-center text-xl font-black text-indigo-400">
                  {(headAdminUser.nickname || headAdminUser.name || 'H')[0].toUpperCase()}
                </div>
              )}
              <div className="flex flex-col overflow-hidden">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Head Admin</span>
                <span className="text-sm font-bold text-[#F0EFE8] truncate">{headAdminUser.nickname || headAdminUser.name}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#A09E9A]/60 italic p-2">Head Admin profile not found.</p>
          )}
        </div>

        <div className="pt-4 mt-2 border-t border-white/5 space-y-3">
          <h3 className="text-sm font-black">
            <span className="text-[#D4AF37]">{roleNickname}'s Position:</span> <span className="text-[#F0EFE8]">{displayRole}</span>
          </h3>
          <div className="bg-black/20 p-4 rounded-xl border border-white/5">
            <h5 className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37] mb-2">Role Description</h5>
            <p className="text-sm font-medium text-[#F0EFE8]/90 leading-relaxed">
              Oversees the growth of their assigned hosts through close, one-on-one guidance. Serves as the primary contact for their team and ensures hosts receive steady exposure opportunities. Actively watches over their hosts during livestreams to safeguard them, provide real-time support, and handle any situations that require attention.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderDirectorPosition = () => {
    const directorNickname = host.nickname || host.name || 'Unnamed';

    return (
      <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 p-5 rounded-3xl transition-all duration-300 hover:border-[#D4AF37]/50 group shadow-[0_0_15px_rgba(212,175,55,0.15)] space-y-4">
        <h3 className="text-sm font-black">
          <span className="text-[#D4AF37]">{directorNickname}'s Position:</span> <span className="text-[#F0EFE8]">Founder & Director</span>
        </h3>
        <div className="bg-black/20 p-4 rounded-xl border border-white/5">
          <h5 className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37] mb-2">Role Description</h5>
          <p className="text-sm font-medium text-[#F0EFE8]/90 leading-relaxed">
            Serves as the agency's primary decision-maker for all operational and strategic matters. Plans and organizes exposure-driven events, sets direction, and ensures every host has the tools, resources, and support needed for growth. Oversees overall agency performance and maintains the standards, structure, and vision that guide the entire organization.
          </p>
        </div>
      </div>
    );
  };

  const renderDirectorRoleSupervision = () => {
    const headAdmins = allUsers.filter(u => String(u.role || '').toLowerCase() === 'head admin' || String(u.role || '').toLowerCase() === 'head_admin');
    const managers = allUsers.filter(u => String(u.role || '').toLowerCase() === 'manager');
    const agents = allUsers.filter(u => String(u.role || '').toLowerCase() === 'agent');
    const admins = allUsers.filter(u => String(u.role || '').toLowerCase() === 'admin');
    const hosts = allUsers.filter(u => {
      const r = String(u.role || '').toLowerCase();
      const s = String(u.status || '').toLowerCase();
      return (r === 'host' || r === 'talent') && s !== 'released';
    });

    return (
      <div className="bg-[#1A140A]/80 backdrop-blur-xl border border-[#D4AF37]/20 p-5 rounded-3xl transition-all duration-300 hover:border-[#D4AF37]/50 group shadow-[0_0_15px_rgba(212,175,55,0.15)] space-y-6">
        <h3 className="text-sm font-black uppercase tracking-widest text-[#D4AF37] border-b border-[#D4AF37]/20 pb-3">
          Role Oversight & Supervision
        </h3>
        
        {renderGrid('Head Admins', headAdmins, 'text-pink-400', 'bg-pink-500/10', 'border-pink-500/30')}
        {renderGrid('Managers', managers, 'text-emerald-400', 'bg-emerald-500/10', 'border-emerald-500/30')}
        {renderGrid('Agents', agents, 'text-indigo-400', 'bg-indigo-500/10', 'border-indigo-500/30')}
        {renderGrid('Admins', admins, 'text-purple-400', 'bg-purple-500/10', 'border-purple-500/30')}
        {renderGrid('Hosts', hosts, 'text-[#D4AF37]', 'bg-[#D4AF37]/10', 'border-[#D4AF37]/30')}
      </div>
    );
  };

  const profileOwnerRole = String(host.role || '').toLowerCase();
  const isNonHostRole = ['admin', 'manager', 'agent', 'head admin', 'head_admin', 'director'].includes(profileOwnerRole);

  return (
    <>
      <div className={cn(
        "w-full text-[#F0EFE8] flex flex-col",
        isSpotlight
          ? cn("glass-card p-5 space-y-4 relative mx-auto rounded-[24px] overflow-y-auto custom-scrollbar max-h-[calc(100dvh-2rem)]", hidePerformanceStats ? "max-w-4xl" : "max-w-md")
          : "space-y-4 max-w-4xl mx-auto pb-8 pt-0"
      )}>

      {/* Top Header Grid line style */}
      {isSpotlight && (
        <div className="flex items-center justify-between pb-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-[#A09E9A] hover:text-[#F0EFE8] transition-all border border-white/10 cursor-pointer"
                aria-label="Back to Roster"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-black text-[#F0EFE8] leading-tight tracking-[0.05em]">{host.nickname || host.name}'s Profile</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-[#A09E9A] hover:text-[#F0EFE8] hover:border-[#D4AF37]/45 hover:bg-black/60 transition-all shadow-md cursor-pointer"
                aria-label="Close Profile Spotlight"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="w-8 h-8 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37]/45">Syncing Profile Metrics...</p>
        </div>
      ) : profileOwnerRole === 'director' ? (
        <div className={cn("mx-auto w-full pt-1 space-y-4", (!onClose && (loggedInUserRole === 'director' || loggedInUserRole === 'head admin' || loggedInUserRole === 'head_admin')) ? "max-w-4xl" : "max-w-xl")}>
          {renderIdentityCard()}
          {isSpotlight && renderDirectorPosition()}
          {!isSpotlight && String(rootAuth?.role || '').toLowerCase() === 'director' && renderImpersonationBlock()}
          {!onClose && (loggedInUserRole === 'director' || loggedInUserRole === 'head admin' || loggedInUserRole === 'head_admin') && renderRosterManagementPanel()}
          {!onClose && (loggedInUserRole === 'director' || loggedInUserRole === 'head admin' || loggedInUserRole === 'head_admin') && renderBadgeAndTaskAssignment()}
          {isSpotlight && renderDirectorRoleSupervision()}
        </div>
      ) : (profileOwnerRole === 'head admin' || profileOwnerRole === 'head_admin') ? (
        <div className={cn("mx-auto w-full pt-1 space-y-4", (!onClose && (loggedInUserRole === 'director' || loggedInUserRole === 'head admin' || loggedInUserRole === 'head_admin')) ? "max-w-4xl" : "max-w-xl")}>
          {renderIdentityCard()}
          {renderHeadAdminReportsTo()}
          {!isSpotlight && String(rootAuth?.role || '').toLowerCase() === 'director' && renderImpersonationBlock()}
          {!onClose && (loggedInUserRole === 'director' || loggedInUserRole === 'head admin' || loggedInUserRole === 'head_admin') && renderRosterManagementPanel()}
          {!onClose && (loggedInUserRole === 'director' || loggedInUserRole === 'head admin' || loggedInUserRole === 'head_admin') && renderBadgeAndTaskAssignment()}
          {renderRoleSupervision()}
        </div>
      ) : profileOwnerRole === 'admin' ? (
        <div className={cn("mx-auto w-full pt-1 space-y-4", (String(rootAuth?.role || '').toLowerCase() === 'admin' || (!onClose && (loggedInUserRole === 'director' || loggedInUserRole === 'head admin' || loggedInUserRole === 'head_admin'))) ? "max-w-4xl" : "max-w-xl")}>
          {renderIdentityCard()}
          {renderAdminReportsTo()}
          {String(rootAuth?.role || '').toLowerCase() === 'admin' && renderAdminFanbaseReportSection()}
          {String(rootAuth?.role || '').toLowerCase() === 'admin' && renderAdminsLogSection()}
          {!isSpotlight && String(rootAuth?.role || '').toLowerCase() === 'director' && renderImpersonationBlock()}
          {!onClose && (loggedInUserRole === 'director' || loggedInUserRole === 'head admin' || loggedInUserRole === 'head_admin') && renderBadgeAndTaskAssignment()}
          {renderAdminRoleSupervision()}
        </div>
      ) : isNonHostRole ? (
        <div className={cn("mx-auto w-full pt-1 space-y-4", (String(rootAuth?.role || '').toLowerCase() === 'admin' || (!onClose && (loggedInUserRole === 'director' || loggedInUserRole === 'head admin' || loggedInUserRole === 'head_admin'))) ? "max-w-4xl" : "max-w-xl")}>
          {renderIdentityCard()}
          {['manager', 'agent'].includes(profileOwnerRole) && renderManagerAgentReportsTo()}
          {renderAssignedHostsSection()}
          {renderIntakeSection()}
          {renderProgressNotes()}
          {['agent', 'manager'].includes(profileOwnerRole) && renderRosterEventsAndAttendance()}
          {!isSpotlight && String(rootAuth?.role || '').toLowerCase() === 'director' && renderImpersonationBlock()}
          {String(rootAuth?.role || '').toLowerCase() === 'admin' && renderAdminFanbaseReportSection()}
          {String(rootAuth?.role || '').toLowerCase() === 'admin' && renderAdminsLogSection()}
          {!onClose && (loggedInUserRole === 'director' || loggedInUserRole === 'head admin' || loggedInUserRole === 'head_admin') && renderBadgeAndTaskAssignment()}
        </div>
      ) : (
        <div className={cn(
          isSpotlight
            ? "mx-auto w-full pt-1 space-y-4 max-w-xl"
            : "grid grid-cols-1 lg:grid-cols-3 gap-6 pt-1"
        )}>
          {isSpotlight ? (
            <>
              {renderIdentityCard()}
              {renderFanbaseBlock()}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {renderRandomPK()}
                {renderExposuresAndAttendance()}
              </div>
              {renderRecognitionsCard()}
              {!hidePerformanceStats && (
                <>
                  {renderMonthlyTrend()}
                  {renderPerformanceMetricsAndDiversity()}
                  {renderTrendBadge()}
                  {renderWeeklyLiveStats()}
                  {renderAgentNotes()}
                  {renderAIAnalysis()}
                </>
              )}
              {onClose && (
                <button
                  onClick={onClose}
                  className={cn("w-full mt-4 py-3 border-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer text-center backdrop-blur-md", styles.gradientBg, styles.borderColor, styles.shadow, styles.badgeText)}
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
              <div className="space-y-4 lg:col-span-2">
                {!isSpotlight && String(rootAuth?.role || '').toLowerCase() === 'director' && renderImpersonationBlock()}
                {renderFanbaseBlock()}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {renderRandomPK()}
                  {renderExposuresAndAttendance()}
                </div>
                {renderRecognitionsCard()}
                {!hidePerformanceStats && (
                  <>
                    {renderMonthlyTrend()}
                    {renderPerformanceMetricsAndDiversity()}
                    {renderTrendBadge()}
                    {renderWeeklyLiveStats()}
                    {renderAgentNotes()}
                    {renderAIAnalysis()}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>

      {renderRpkModal()}
      {renderFanbaseModal()}
      {renderSelfEditModal()}
      {renderAddEventModal()}
      {renderAdminLogEditModal()}
      {/* renderMonthlyDataModal() */}

      {spotlightHost && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSpotlightHost(null)}></div>
          <div className="absolute inset-0 overflow-y-auto p-4 py-10 pointer-events-none">
            <div className="pointer-events-auto w-full mx-auto flex justify-center min-h-full">
              <HostProfileView
                host={spotlightHost}
                isReadOnly={true}
                onClose={() => setSpotlightHost(null)}
              />
            </div>
          </div>
        </div>
      )}


      {/* Floating Toast Notification Container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-xl transition-all duration-300 pointer-events-auto transform translate-y-0 opacity-100",
              toast.type === 'success'
                ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                : "bg-rose-950/90 border-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
            )}
          >
            <span className="text-sm">
              {toast.type === 'success' ? '✅' : '❌'}
            </span>
            <span className="text-xs font-bold tracking-wide">{toast.message}</span>
          </div>
        ))}
      </div>
    </>
  );
};

export default HostProfileView;
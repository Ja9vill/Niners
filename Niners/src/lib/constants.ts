import { Host, CommissionEntry, BaseSalaryTier } from '../types';

export const MANAGERS = [
  'Ely', 'Jean', 'March', 'Myrill', 'Vine', 'Yoshi', 'Nikita', 'Yudi', 'Nameless', 'Lina'
];

export const BASE_SALARY_POLICIES: BaseSalaryTier[] = [
  'Regular Host', 'Rocket Host', 'Star Host', 'S idol', 'ESport Host', 'N/A'
];

export const INITIAL_HOSTS: Host[] = [];

export const INITIAL_COMMISSION: CommissionEntry[] = [];

// Map actual months requested
// Aug 2025: 2.49M | Sep 2025: 45.1M | Oct 2025: 36.1M | Dec 2025: 389K (crash) | Jan 2026: 31.3M | Feb 2026: 29.1M | Mar 2026: 24.2M | Apr 2026: 36.5M
export const TIMELINE_DATA = [
  { month: 'Aug 2025', value: 2490000 },
  { month: 'Sep 2025', value: 45100000 },
  { month: 'Oct 2025', value: 36100000 },
  { month: 'Nov 2025', value: 12000000 }, // estimation for trend
  { month: 'Dec 2025', value: 389000 },
  { month: 'Jan 2026', value: 31300000 },
  { month: 'Feb 2026', value: 29100000 },
  { month: 'Mar 2026', value: 24200000 },
  { month: 'Apr 2026', value: 36500000 },
];

export const EVENT_COLORS: Record<string, { bg: string; text: string; gradient: string }> = {
  'SOLO LIVEHOUSE': { text: 'text-amber-400', bg: 'bg-amber-500/10', gradient: 'from-amber-600 to-yellow-400' },
  'PARTY LIVEHOUSE': { text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', gradient: 'from-fuchsia-600 to-pink-400' },
  'AGENCY MEETING': { text: 'text-indigo-400', bg: 'bg-indigo-500/10', gradient: 'from-indigo-600 to-blue-400' },
  'PK MATCH': { text: 'text-rose-400', bg: 'bg-rose-500/10', gradient: 'from-rose-600 to-red-400' },
  'OTHER': { text: 'text-slate-400', bg: 'bg-white/5', gradient: 'from-slate-600 to-slate-400' }
};

export const TIMESLOTS = [
  '08:00 AM - 10:00 AM (Manila Time)',
  '10:00 AM - 12:00 PM (Manila Time)',
  '12:00 PM - 02:00 PM (Manila Time)',
  '02:00 PM - 04:00 PM (Manila Time)',
  '04:00 PM - 06:00 PM (Manila Time)',
  '06:00 PM - 08:00 PM (Manila Time)',
  '08:00 PM - 10:00 PM (Manila Time)',
  '10:00 PM - 12:00 AM (Manila Time)',
  '12:00 AM - 02:00 AM (Manila Time)',
  '02:00 AM - 04:00 AM (Manila Time)',
  '04:00 AM - 06:00 AM (Manila Time)',
  '06:00 AM - 08:00 AM (Manila Time)'
];

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

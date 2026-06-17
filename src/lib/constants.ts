import { Host, CommissionEntry, BaseSalaryTier } from '../types';

export const MANAGERS = [
  'Ely', 'Jean', 'March', 'Myrill', 'Vine', 'Yoshi', 'Nikita', 'Yudi', 'Nameless', 'Lina'
];

export const BASE_SALARY_POLICIES: BaseSalaryTier[] = [
  'Regular Host', 'Rocket Host', 'Star Host', 'S idol', 'ESport Host'
];

// Mock initial data if empty
export const INITIAL_HOSTS: Host[] = [
  { 
    id: '1001', 
    name: 'Ye Joon', 
    nickname: 'Efficiency King',
    role: 'Talent',
    team: 'Alpha',
    manager: 'Ely', 
    anchor_type: 'Nine Agency', 
    base_salary_category: 'S idol',
    status: 'Active', 
    level: 50, 
    tier: 'S',
    password: '1234',
    is_temp_password: true,
    isActive: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  { 
    id: '1002', 
    name: 'LYKA', 
    nickname: 'LYKA',
    role: 'Talent',
    team: 'Beta',
    manager: 'Jean', 
    anchor_type: 'Nine Agency', 
    base_salary_category: 'Rocket Host',
    status: 'Active', 
    level: 45,
    tier: 'A',
    password: '1234',
    is_temp_password: true,
    isActive: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  // ... others can be derived or kept minimal for now
];

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

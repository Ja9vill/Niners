export type Position = 'Talent' | 'Manager' | 'Admin' | 'Head Admin' | 'Director' | 'Sub Agent' | 'Police Admin';
export type BaseSalaryTier = 'N/A' | 'Rocket Host' | 'Star Host' | 'S idol' | 'ESport Host';
export type HostStatus = 'Active' | 'Inconsistent' | 'Released' | 'Inactive';
export type AnchorType = 'Nine Agency' | 'Sub Agency' | 'External';
export type Tier = 'S' | 'A' | 'B' | 'C' | 'X';
export type EventType = 'Solo Livehouse' | 'Party Livehouse' | 'Poppo Official Event' | 'Niners Day' | 'Agency Event' | 'External Event' | 'PK Tournament' | 'Platform Feature' | 'Collaboration';
export type Trend = 'Growing' | 'Declining' | 'Stable' | 'At Risk' | 'New' | 'Explosive';
export type NoteType = 'Note' | 'Task' | 'Feedback';

export type TaskStatus = 'To Do' | 'In Progress' | 'Completed';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface HostTask {
  id: string;
  hostId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedBy: string;
  createdAt: string;
  dueDate?: string;
}

export interface PerformanceGoal {
  id: string;
  hostId: string;
  type: 'fanbase' | 'fanclub_gc' | 'hours' | 'pk' | 'song_requests';
  target: number;
  current: number;
  period: 'Daily' | 'Weekly' | 'Monthly';
  deadline: string;
}

export interface Host {
  id: string; // POPPO ID (numeric master key)
  name: string;
  position: Position;
  role: Position; // Added redundant field for transition if needed
  team: string;
  manager: string;
  anchor_type: AnchorType;
  base_salary_category: BaseSalaryTier;
  status: HostStatus;
  level: number;
  tier: Tier;
  last_login?: string;
  created_at: string;
  updated_at: string;
  photoUrl?: string;
  nickname?: string;
  description?: string;
  password?: string;
  is_temp_password?: boolean;
  reset_requested?: boolean;
  // Legacy fields for compatibility during transition
  anchor?: AnchorType;
  baseSalary?: BaseSalaryTier;
}

export interface PasswordResetRequest {
  id: string;
  poppoId: string;
  hostName: string;
  status: 'Pending' | 'Resolved';
  requestedAt: string;
  resolvedAt?: string;
}

export interface FanbaseHealthEntry {
  id: string;
  hostId: string;
  subscribers: number;
  gcMembers: number;
  preStreamUpdate: string;
  postStreamUpdate: string;
  submittedBy: string;
  submittedAt: string;
}

export interface CommissionEntry {
  my_commission: number; // Total Commission
  poppo_id: string; // ID
  poppo_name: string; // Nickname
  live_duration: number; // Live duration
  party_host_duration?: number; // Party host duration
  total_points: number; // Total earnings of points
  agentweb_commission_earning: number; // agentweb_commission_earning
  live_earnings: number; // Live earnings
  party_earnings?: number; // Party Earnings
  private_chat?: number; // Private chat
  tips?: number; // Tips
  platform_reward?: number; // Platform reward
  other_earn?: number; // Other Earnings
  platform_hourly_salary?: number; // Platform hourly salary
  super_salary?: number; // Super Salary
  super_rank?: string; // Super Rank
  level?: number; // Level
  month: string; // YYYY-MM
  updated_at: string;
}

export interface PKEntry {
  id: string; // auto_id
  poppo_id: string;
  start_date: string;
  end_date: string;
  win_percentage: number;
  pk_score: number;
  sessions: number;
  submitted_by: string;
  submitted_role: string;
  timestamp: string;
}

export interface ExposureEntry {
  id: string; // auto_id
  poppo_id: string;
  event_type: string;
  event_date: string; // YYYY-MM-DD
  description: string;
  submitted_by: string;
  submitted_role: string;
  timestamp: string;
}

export interface DirectorNote {
  id: string;
  hostId: string;
  type: NoteType;
  content: string;
  createdAt: string;
}

export interface CalendarEvent {
  event_id: string;
  poppo_id: string;
  title: string;
  description: string;
  date: string;
  time: string; // 12-hour format
  created_by_name: string;
  created_by_role: string;
  visibility: 'All' | 'Leadership' | 'Director Only';
  timestamp: string;
}

export interface ActivityLog {
  id: string;
  type: 'AUTH' | 'FINANCE' | 'TOURNAMENT' | 'EXPOSURE' | 'ROSTER' | 'INTAKE' | 'PROFILE_UPDATE' | 'PK_SUBMISSION' | 'EXPOSURE_SUBMISSION' | 'NEW_MEMBER' | 'SUPPORTER_REVIEW' | 'DIRECTOR_ACTION' | 'SYSTEM_EVENT';
  action: string;
  user: string;
  timestamp: string;
}

export interface VersionLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  changelog: string;
}

export interface FileEntry {
  id: string;
  name: string;
  category: string;
  type: 'upload' | 'paste';
  timestamp: string;
  status: 'Processed' | 'Pending' | 'Failed';
  matchedCount: number;
  description?: string;
  month?: string;
}

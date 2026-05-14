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
  // Legacy fields for compatibility during transition
  anchor?: AnchorType;
  baseSalary?: BaseSalaryTier;
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
  poppo_id: string;
  poppo_name: string;
  month: string;
  live_duration: number;
  live_earnings: number;
  video_duration: number;
  video_earnings: number;
  agentweb_commission_rate: number;
  agentweb_commission_earning: number;
  total_points: number;
  total_earnings: number;
  my_commission: number;
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
  type: string;
  action: string;
  user: string;
  timestamp: string;
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

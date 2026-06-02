export type Role = 'Talent' | 'Manager' | 'Admin' | 'Head Admin' | 'Director' | 'Agent';
export type BaseSalaryTier = 'N/A' | 'Rocket Host' | 'Star Host' | 'S idol' | 'ESport Host' | 'Regular Host';
export type HostStatus = 'Active' | 'Inconsistent' | 'Released' | 'Inactive' | 'Releasing';
export type AnchorType = 'Nine Agency' | 'Sub Agency' | 'External';
export type Tier = 'S' | 'A' | 'B' | 'C' | 'X';
export type EventType = 'Solo Livehouse' | 'Party Livehouse' | 'Poppo Official Event' | 'Niners Day' | 'Agency Event' | 'External Event' | 'PK Tournament' | 'Platform Feature' | 'Collaboration' | 'Broadcast Block' | 'Staff Meeting';
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
  role: Role;
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
  followers_count?: number;
  is_temp_password?: boolean;
  reset_requested?: boolean;
  isActive: boolean;
  // Profile enhancements
  bio?: string;
  social_links?: {
    fb?: string;
    ig?: string;
    tiktok?: string;
    whatsapp?: string;
  };
  streaming_hours?: {
    from: string;
    to: string;
  }[];
  // Google OAuth fields
  googleUid?: string;
  googleEmail?: string;
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
  // Updated fields
  party_host_duration?: number;
  party_earnings?: number;
  private_chat?: number;
  tips?: number;
  platform_reward?: number;
  other_earn?: number;
  platform_hourly_salary?: number;
  super_salary?: number;
  super_rank?: number;
  level?: number;
  agency_commission_override?: number;
  timestamp?: string;
  from_date?: string;
  to_date?: string;
  year?: number;
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
  agency_attendance?: string[]; // Array of Poppo IDs
}

export interface WeeklyLiveDataEntry {
  id: string;
  poppo_id: string;
  nickname: string;
  from_date: string;
  to_date: string;
  total_duration: number;
  total_earnings: number;
  avg_online_users: number;
  new_fans: number;
  new_fanclub_members: number;
  gifting_count: number;
  unfollowers: number;
  total_points: number;
  notes: string;
  submitted_by: string;
  submitted_role: string;
  timestamp: string;
}

export interface MonthlyLiveDataEntry {
  id: string;
  poppo_id: string;
  nickname: string;
  from_date: string;
  to_date: string;
  total_duration: number;
  total_earnings: number;
  avg_online_users: number;
  new_fans: number;
  new_fanclub_members: number;
  gifting_count: number;
  unfollowers: number;
  total_points: number;
  notes: string;
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
  type?: string;
  location?: string;
  event_host_id?: string;
  participants?: string[];      // Poppo IDs of participants (display)
  participantIds?: string[];    // Same data, used for Firestore array-contains queries
}

export interface LivehouseRequest {
  id: string;
  poppoId: string;
  name: string;
  date: string;
  timeslot: string; // e.g., "14:00 - 15:00"
  status: 'Pending Approval' | 'New Timeslot Proposed' | 'Approved' | 'Closed' | 'Host Accepted Proposal';
  proposedTimeslot?: string;
  proposedDate?: string;
  proposedBy?: string;
  managerId: string; // Assigned manager's Poppo ID
  notes?: string;
  timestamp: string;
}

export interface AgencyAward {
  id: string;
  hostId: string;
  title: string;
  dateAwarded?: string;   // new field name
  awardedAt?: string;     // legacy alias — some docs use this
  iconType: 'trophy' | 'star' | 'medal' | 'crown' | 'badge';
  description?: string;
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

export interface TopNinersEarningsSummary {
  summaryId: string;
  periodKey: 'all_time' | string; // Constraint: 'all_time' or 'YYYY-MM' format
  month: number | null;
  year: number | null;
  poppoId: string;
  nickname: string;
  role: string;
  totalEarningsPoints: number;
  rank: number;
  isPublished: boolean;
  profilePhotoUrl: string;
}

export interface EventsCalendarPublic {
  // Primary schema (structured calendar events)
  eventId?: string;
  eventTitle?: string;
  eventDate?: string; // YYYY-MM-DD
  eventDay?: number;
  eventMonth?: number;
  eventYear?: number;
  eventStartTime?: string; // HH:MM
  eventEndTime?: string; // HH:MM
  locationOrPlatform?: string;
  isPublished?: boolean;
  // Alternative schema (general events collection)
  id?: string;
  title?: string;
  description?: string;
  startDate?: string;
  date?: string;
  type?: string;
  eventType?: string;
  status?: string;
  hostId?: string;
}

export interface ReportingSubmissionPayload {
  poppoId: string;
  nickname: string;
  // Dates
  weekStartDate?: string;
  weekEndDate?: string;
  from_date?: string;
  to_date?: string;
  // Random PK
  pk_score?: number;
  win_percentage?: number;
  sessions?: number;
  // Fanbase
  fanclubSubscribers?: number;
  fanclubGcMembers?: number;
  preStreamUpdate?: string;
  postStreamUpdate?: string;
  // Live Data (Weekly & Monthly)
  totalDuration?: number;
  totalEarnings?: number;
  totalPoints?: number;
  avg_online_users?: number;
  new_fans?: number;
  new_fanclub_members?: number;
  gifting_count?: number;
  unfollowers?: number;
  notes?: string;
  submitted_by?: string;
  submitted_role?: string;
  timestamp?: string;
  // Legacy
  "3mosEarnings"?: number;
}

export interface ReportingSubmission {
  submissionId: string;
  reportType: 'random_pk' | 'fanbase' | 'weekly_live_data' | 'monthly_live_data';
  submittedByUserId: string;
  status: 'draft' | 'submitted';
  dataPayload: ReportingSubmissionPayload;
}

export interface Task {
  taskId: string;
  assignedToUserId: string;
  relatedPoppoId: string;
  taskType: string;
  title: string;
  description: string;
  status: 'Assigned' | 'In Progress' | 'Completed';
  dueDate: string;
}

export interface ActivityAuditLog {
  logId: string;
  timestamp: string; // DateTime/String
  actorUserId: string;
  actionType: string;
  beforeValue: string; // String/JSON
  afterValue: string; // String/JSON
}

export interface EventsCalendarPublic {
  id: string;
  eventType?: string;
  description?: string;
  date?: string;
  eventDate?: string;
  timeslot?: string;
  status?: string;
  participantIds?: string[];
  participants?: string[];
  [key: string]: any;
}

export interface FanbaseHealthEntry {
  id?: string;
  poppo_id?: string;
  timestamp?: string;
  from_date?: string;
  to_date?: string;
  total_followers?: number;
  fanclub_subscribers?: number;
  fanclub_gc_members?: number;
  gc_activity_count_host?: number;
  gc_activity_count_fans?: number;
  notes?: string;
  reporter_id?: string;
  reporter_name?: string;
  [key: string]: any;
}

export interface ExposureEntry {
  id?: string;
  poppo_id?: string;
  event_type?: string;
  description?: string;
  date?: string;
  status?: string;
  notes?: string;
  [key: string]: any;
}


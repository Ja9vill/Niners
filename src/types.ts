import { AuthState } from "./lib/storage";

export type Role = 'Host' | 'Manager' | 'Admin' | 'Head Admin' | 'Director' | 'Agent';
export type BaseSalaryTier = 'N/A' | 'Rocket Host' | 'Star Host' | 'S idol' | 'ESport Host' | 'Regular Host';
export type HostStatus = 'Active' | 'Inconsistent' | 'Intermittent' | 'Released' | 'Inactive' | 'Releasing';
export type AnchorType = 'Nine Agency' | 'Sub Agency' | 'External';
export type EventType = 'Official PK' | 'Solo Livehouse' | 'Party Livehouse' | 'Agency Event' | 'Poppo Event' | 'External Event';
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

// User Authentication data mapped to `users` collection
export interface UserAuth {
  id: string; // POPPO ID
  poppo_id?: string;
  nickname: string;
  role: Role;
  is_temp_password?: boolean;
  password?: string;
  googleUid?: string;
  last_login?: string;
}

// Unified Host interface representing profile data and auth merged
export interface Host {
  // Auth mapped
  id: string; // POPPO ID (numeric master key)
  poppo_id?: string;
  name: string;
  nickname?: string;
  role: Role;
  is_temp_password?: boolean;
  password?: string;
  googleUid?: string;
  last_login?: string;

  // Profile data
  status: HostStatus;
  tier_pay?: string;
  photoUrl?: string;
  bio?: string;
  description?: string;
  social_links?: {
    fb?: string;
    ig?: string;
    tiktok?: string;
    whatsapp?: string;
  };
  followers_count?: number;
  created_at: string;
  updated_at: string;
  isActive: boolean;
  reset_requested?: boolean;

  // Role specific
  teamAnchor?: string;
  team_anchor?: string;
  assigned_manager_poppo_id?: string;
  manager?: string; // Legacy alias for assigned_manager_poppo_id
  assignedHosts?: string[];

  // Misc legacy
  level?: number;
  team?: string;
  anchor_type?: AnchorType;
  anchor?: AnchorType;
  base_salary_category?: string;
}

export interface PasswordResetRequest {
  id: string;
  poppoId: string;
  hostName: string;
  status: 'Pending' | 'Resolved';
  requestedAt: string;
  resolvedAt?: string;
}

export interface PerformanceReportEntry {
  poppo_id: string;
  nickname: string;
  month: string;
  year: number;
  from_date?: string;
  to_date?: string;
  level: number;
  live_duration: number;
  party_host_duration: number;
  total_earnings: number; // merged with total_points
  agent_commission: number;
  my_commission?: number;
  live_earnings: number;
  party_earnings: number;
  private_chat: number;
  tips: number;
  platform_reward: number;
  other_earnings: number;
  other_earn?: number;
  platform_hourly_salary: number;
  super_salary: number;
  super_rank: number;
  agentweb_commission_rate: number;
  _isUnknownHost?: boolean;
  owner_id?: string;
  owner_role?: string;
  report_type?: 'monthly' | 'weekly' | 'daily';

  // legacy fallbacks
  total_points?: number;
  agentweb_commission_earning?: number;
  video_duration?: number;
  video_earnings?: number;
  timestamp?: string;
}

// Ensure CommissionEntry points to PerformanceReportEntry during migration to avoid breaking current code types outright
export type CommissionEntry = PerformanceReportEntry;

export interface PKReportEntry {
  id: string; // auto_id
  poppo_id: string;
  start_date: string;
  end_date: string;
  win_percentage: number;
  pk_score: number;
  sessions: number;
  submitted_by: string;
  timestamp: string;
}

// Aliased for backwards compatibility during migration
export type PKEntry = PKReportEntry;

export interface WeeklyLiveDataEntry {
  id?: string;
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
  submitted_by?: string;
  timestamp?: string;
}

export interface MonthlyLiveDataEntry {
  id?: string;
  poppo_id: string;
  nickname: string;
  total_earnings: number;
  total_duration: number;
  last_3_months_total_earnings: number;
  timestamp?: string;
}

export interface FanbaseReportEntry {
  id?: string;
  poppo_id: string;
  total_followers: number;
  fanclub_subscribers: number;
  fanclub_gc_members: number;
  gc_activity_count_host: number;
  gc_activity_count_fans: number;
  from_date: string;
  to_date: string;
  timestamp?: string;
}

export type FanbaseHealthEntry = FanbaseReportEntry;

export interface DirectorNote {
  id: string;
  hostId: string;
  type: NoteType;
  content: string;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  event_id: string;
  event_type: string;
  event_title: string;
  event_description: string;
  event_date: string;
  from_time: string;
  to_time: string;
  event_host_id: string;
  event_host_name: string;
  is_external_host: boolean;
  participant_ids: string[];
  participant_nicknames: string[];
  created_by_id: string;
  created_by_name: string;
  created_by_role: string;
  timestamp: string;
  notified30min: boolean;
  notifiedStart: boolean;

  // Backward-compat aliases for reads from legacy documents
  /** @deprecated use participant_ids */
  participants_id?: string[];
  /** @deprecated use participant_ids */
  participants?: string[];
  /** @deprecated use participant_ids */
  participantIds?: string[];
  /** @deprecated legacy misspelling */
  type_of_event?: string;
  /** @deprecated use event_title */
  title?: string;
  /** @deprecated use event_description */
  description?: string;
  poppo_id?: string;
  date?: string;
  time?: string;
  visibility?: string;
  type?: string;
  location?: string;
  is_automated?: boolean;
}

export type ExposureEntry = CalendarEvent;

export interface AttendanceEntry {
  id?: string;
  event_id: string;
  attendees: {
    poppo_id: string;
    nickname: string;
  }[];
  timestamp?: string;
}

export interface LivehouseRequest {
  id: string;
  poppoId: string;
  name: string;
  date: string;
  timeslot: string; // e.g., "14:00 - 15:00"
  status: 'Pending Approval' | 'New Timeslot Proposed' | 'Approved' | 'Closed' | 'Host Accepted Proposal' | 'Completed';
  proposedTimeslot?: string;
  proposedDate?: string;
  proposedBy?: string;
  managerId: string; // Assigned manager's Poppo ID
  notes?: string;
  livehouseType?: string;
  reporterId?: string;
  reporterName?: string;
  reporterRole?: string;
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
  id?: string;
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
  title?: string;
  description?: string;
  startDate?: string;
  date?: string;
  type?: string;
  eventType?: string;
  status?: string;
  hostId?: string;
  timeslot?: string;
  participantIds?: string[];
  participants?: string[];
  [key: string]: any;
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

export interface AwardBadge {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  startDate?: string;
  endDate?: string;
}

export interface AwardAssignment {
  id: string;
  awardId: string;
  awardName: string;
  awardColor: string;
  hostId: string;
  hostNickname: string;
  startDate: string;
  endDate: string;
  assignedAt: string;
}

export interface ManagerNote {
  id: string;
  managerName: string;
  hostNickname: string;
  content: string;
  timestamp: string;
}

export interface PublicPageAsset {
  id: string;
  slotId: string;
  imageUrl: string;
  description?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface BlogPost {
  id: string;
  title: string;
  subtitle?: string;
  slug: string;
  content: string;
  coverImage?: string;
  authorName: string;
  authorRole: string;
  category?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  isPublished: boolean;
  readTimeMinutes?: number;
  viewCount?: number;
  seoMetadata?: {
    metaTitle?: string;
    metaDescription?: string;
  };
}

export interface AgentFinancialReport {
  agent_id: string;
  poppo_id: string;
  nickname: string;
  type: 'monthly' | 'weekly' | 'daily';
  solo_live_duration: string;
  party_live_duration: string;
  total_points: string;
  agent_commission: string;
  solo_live_earnings: string;
  party_live_earnings: string;
  private_chat: string;
  tips: string;
  platform_reward: string;
  other_earnings: string;
  platform_salary: string;
  super_salary: string;
  super_rank: string;
  stream_level: number;
  total_incentives: string;
  total_duration: string;
  total_earnings: string;
  total_income: string;
  from_date: string;
  to_date: string;
  created_at: string;
  updated_at: string;
  submitted_by_id?: string;
  submitted_by_name?: string;
  submitted_by_role: string;
}

export interface UserRegistration {
  agent_id: string;
  poppo_id: string;
  nickname: string;
  role: string;
  requestedAt: string;
  requestedByName: string;
  request_status: 'Pending' | 'Approved' | 'Denied' | 'Add later';
}

export const emptyAuthState: AuthState = {
  level: 0,
  role: "",
  name: "",
  poppo_id: "",
  nickname: "",
  status: "",
  manager_assigned: "",
  anchor_team: "",
  profile_photo: "",
  token: "",
};
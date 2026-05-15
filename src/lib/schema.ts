// ============================================================================
// NINERS Canonical 14-Collection Schema
//
// Source of truth for collection names, document key shapes, and field types.
// Field names match Firestore exactly (PascalCase as defined by the schema
// specification). Do not rename without updating firestore.rules and indexes.
// ============================================================================

export const COLLECTIONS = {
  roster: 'roster',
  monthly_commission: 'monthly_commission',
  pk_weekly: 'pk_weekly',
  pk_random: 'pk_random',
  events: 'events',
  host_updates: 'host_updates',
  performance: 'performance',
  director_notes: 'director_notes',
  newbie_pipeline: 'newbie_pipeline',
  inactive_released: 'inactive_released',
  director_dashboard: 'director_dashboard',
  file_manager: 'file_manager',
  fanclub_metrics_base: 'fanclub_metrics_base',
  fanclub_metrics_stream_growth: 'fanclub_metrics_stream_growth',
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

// ---------------------------------------------------------------------------
// 1. roster — primary, document ID = HostID
// ---------------------------------------------------------------------------
export interface RosterDoc {
  HostID: string;
  HostNickname: string;
  FullName: string;
  Position: string;
  HostType: string;
  Level: number;
  BaseSalaryTier: string;
  BaseSalaryAmount: string;
  Status: string;
  JoinDate: string;            // ISO 8601
  ReleaseDate: string | null;  // ISO 8601 or null
  ManagerAssigned: string;
  AnchorAssigned: string;
  TitlesTags: string;
  ProfileBio: string;
  ProfilePhotoURL: string;
  LastUpdated: string;         // ISO 8601
  UpdatedBy: string;
}

// ---------------------------------------------------------------------------
// 2. monthly_commission — append-only, composite key: HostID + ReportMonth
// ---------------------------------------------------------------------------
export interface MonthlyCommissionDoc {
  ReportMonth: string;
  HostID: string;
  HostNickname: string;
  LiveDurationHrs: number;
  PartyDurationHrs: number;
  TotalEarningsPts: number;
  AgentwebCommission: number;
  LiveEarnings: number;
  PartyEarnings: number;
  PrivateChatEarnings: number;
  Tips: number;
  PlatformReward: number;
  OtherEarnings: number;
  PlatformHourlySalary: number;
  SuperSalary: number;
  SuperRank: string;
  Level: number;
  UploadTimestamp: string;  // ISO 8601
  UploadedBy: string;
}

// ---------------------------------------------------------------------------
// 3. pk_weekly — append-only, composite key: HostID + WeekStart + WeekEnd
// ---------------------------------------------------------------------------
export interface PkWeeklyDoc {
  HostID: string;
  HostNickname: string;
  WeekStart: string;       // ISO 8601
  WeekEnd: string;         // ISO 8601
  WinPercent: string;
  PKScore: number;
  PKSessions: number;
  Timestamp: string;       // ISO 8601
  SubmittedBy: string;
  SubmitterRole: string;
}

// ---------------------------------------------------------------------------
// 4. pk_random — append-only
// ---------------------------------------------------------------------------
export interface PkRandomDoc {
  HostID: string;
  HostNickname: string;
  WinPercent: string;
  PKScore: number;
  Sessions: number;
  DateSubmitted: string;   // ISO 8601
  SubmittedBy: string;
  Notes: string;
}

// ---------------------------------------------------------------------------
// 5. events — append-only
// ---------------------------------------------------------------------------
export interface EventDoc {
  HostID: string;
  HostNickname: string;
  EventType: string;
  EventDate: string;       // ISO 8601
  Notes: string;
  SubmittedBy: string;
  SubmitterRole: string;
  Timestamp: string;       // ISO 8601
}

// ---------------------------------------------------------------------------
// 6. host_updates — append-only
// ---------------------------------------------------------------------------
export interface HostUpdateDoc {
  HostID: string;
  HostNickname: string;
  UpdatedBio: string;
  UpdatedPhotoURL: string;
  UpdatedSocialLinks: string;
  UpdatedSkills: string;
  UpdatedSchedule: string;
  UpdatedGoals: string;
  UpdatedAvailability: string;
  Timestamp: string;       // ISO 8601
}

// ---------------------------------------------------------------------------
// 7. performance — append-only, composite key: HostID + ReportingPeriod
// ---------------------------------------------------------------------------
export interface PerformanceDoc {
  HostID: string;
  HostNickname: string;
  ReportingPeriod: string;
  LastMonthEarnings: number;
  LastWeekEarnings: number;
  Last30DEarnings: number;
  LiveEarnings: number;
  PartyEarnings: number;
  Tips: number;
  PlatformReward: number;
  LiveVsPartyRatio: string;
  TipsRatio: string;
  PlatformRewardPercent: string;
  PtsPerHour: number;
  MoMGrowthPercent: string;
  HoursStreamed: number;
  AvgDailyHours: number;
  PeakHours: string;
  PeakEarningsDay: string;
  ConsistencyScore: string;
  EngagementScore: string;
  Trend: string;
}

// ---------------------------------------------------------------------------
// 8. director_notes — append-only, director-only write
// ---------------------------------------------------------------------------
export interface DirectorNoteDoc {
  HostID: string;
  HostNickname: string;
  RiskLevel: string;
  GrowthPotential: string;
  BehavioralNotes: string;
  AttendanceIssues: string;
  SalaryConcerns: string;
  PerformanceFlags: string;
  ManagerFeedback: string;
  DirectorStrategyNotes: string;
  HostDevelopmentPlan: string;
  LastUpdated: string;     // ISO 8601
}

// ---------------------------------------------------------------------------
// 9. newbie_pipeline — append-only
// ---------------------------------------------------------------------------
export interface NewbiePipelineDoc {
  HostID: string;
  HostNickname: string;
  OnboardingDate: string;  // ISO 8601
  First30DPerformance: string;
  FirstPKResults: string;
  FirstEventParticipation: string;
  FirstEarningsMilestone: string;
  RedFlags: string;
  Strengths: string;
  TrainingPath: string;
  AssignedMentor: string;
  Week1Notes: string;
  Week2Notes: string;
  Week3Notes: string;
  Week4Notes: string;
  Status: string;
}

// ---------------------------------------------------------------------------
// 10. inactive_released — append-only, composite key: HostID + ReleaseDate
// ---------------------------------------------------------------------------
export interface InactiveReleasedDoc {
  HostID: string;
  HostNickname: string;
  JoinDate: string;        // ISO 8601
  ReleaseDate: string;     // ISO 8601
  ReasonForRelease: string;
  LastMonthPerformance: string;
  LastPKData: string;
  LastEventParticipation: string;
  JourneyNotes: string;
  ManagerAtRelease: string;
  FinalStatus: string;
}

// ---------------------------------------------------------------------------
// 11. director_dashboard — append-only, keyed by ReportingMonth, director-only
// ---------------------------------------------------------------------------
export interface DirectorDashboardDoc {
  AgencyTotalEarnings: number;
  ActiveHosts: number;
  InactiveAlerts: string;
  TopEarner: string;
  ReportingMonth: string;
  ActivityRate: string;
  BurnoutRisk: string;
  RevenueConcentration: string;
  SalaryObligations: string;
}

// ---------------------------------------------------------------------------
// 12. file_manager — append-only, primary key = EntryID
// ---------------------------------------------------------------------------
export interface FileManagerDoc {
  EntryID: string;
  Timestamp: string;       // ISO 8601
  HostID: string | null;
  HostNickname: string | null;
  Category: string;
  SubCategory: string;
  FileLabel: string;
  EntrySource: string;
  SubmitterName: string;
  SubmitterRole: string;
  DeviceType: string;
  Notes: string | null;
}

// ---------------------------------------------------------------------------
// 13. fanclub_metrics_base — append-only, composite key: HostID + ReportingMonth
// ---------------------------------------------------------------------------
export interface FanclubMetricsBaseDoc {
  HostID: string;
  HostNickname: string;
  ReportingMonth: string;
  FanclubGC: number;
  FanclubSubscribers: number;
  MoMGCChange: string;
  MoMSubscriberChange: string;
  Notes: string;
  Timestamp: string;       // ISO 8601
  UpdatedBy: string;
}

// ---------------------------------------------------------------------------
// 14. fanclub_metrics_stream_growth — append-only
// ---------------------------------------------------------------------------
export interface FanclubStreamGrowthDoc {
  HostID: string;
  HostNickname: string;
  StreamLabel: string;
  PreStreamCount: number;
  PostStreamCount: number;
  FanGrowth: number;
  FanGrowthPercent: string;
  DateFrom: string;        // ISO 8601
  DateTo: string;          // ISO 8601
  DurationDays: number;
  Notes: string;
  SubmittedBy: string;
}

// ---------------------------------------------------------------------------
// Composite key helpers
// ---------------------------------------------------------------------------
export const compositeId = {
  monthlyCommission: (hostId: string, reportMonth: string) =>
    `${hostId}__${reportMonth}`,
  pkWeekly: (hostId: string, weekStart: string, weekEnd: string) =>
    `${hostId}__${weekStart}__${weekEnd}`,
  performance: (hostId: string, reportingPeriod: string) =>
    `${hostId}__${reportingPeriod}`,
  inactiveReleased: (hostId: string, releaseDate: string) =>
    `${hostId}__${releaseDate}`,
  fanclubMetricsBase: (hostId: string, reportingMonth: string) =>
    `${hostId}__${reportingMonth}`,
};

// ---------------------------------------------------------------------------
// Type-level registry mapping collection name -> document shape.
// Used to constrain the schema-aware service layer.
// ---------------------------------------------------------------------------
export interface CollectionDocMap {
  roster: RosterDoc;
  monthly_commission: MonthlyCommissionDoc;
  pk_weekly: PkWeeklyDoc;
  pk_random: PkRandomDoc;
  events: EventDoc;
  host_updates: HostUpdateDoc;
  performance: PerformanceDoc;
  director_notes: DirectorNoteDoc;
  newbie_pipeline: NewbiePipelineDoc;
  inactive_released: InactiveReleasedDoc;
  director_dashboard: DirectorDashboardDoc;
  file_manager: FileManagerDoc;
  fanclub_metrics_base: FanclubMetricsBaseDoc;
  fanclub_metrics_stream_growth: FanclubStreamGrowthDoc;
}

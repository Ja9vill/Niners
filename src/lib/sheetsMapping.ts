// ============================================================================
// Google Sheets → Firestore Collection Mapping
//
// Spreadsheet ID: 1G2tbG_gR8b6ojag7M143YBICq_3BlNLERKYMhc6o-5s
//
// Maps each Google Sheets tab (by exact tab title) to its target Firestore
// collection in the 14-collection canonical schema, and lists the field
// order that incoming rows are expected to provide. Field names match
// Firestore exactly — no aliases, no inventions.
//
// Used by the MasterSheet importer to translate sheet rows into typed
// Firestore documents.
// ============================================================================

import type { CollectionName } from './schema';

export const SHEETS_SPREADSHEET_ID =
  '1G2tbG_gR8b6ojag7M143YBICq_3BlNLERKYMhc6o-5s';

export interface SheetTabMapping {
  /** Exact Google Sheets tab title. */
  tabTitle: string;
  /** Target Firestore collection name. */
  collection: CollectionName;
  /** Ordered field names — must match the spec exactly. */
  fields: readonly string[];
  /** Fields that are numeric in Firestore (others default to string). */
  numericFields: readonly string[];
  /** Fields that may be null (optional). */
  optionalFields: readonly string[];
}

export const SHEET_TAB_MAPPINGS: readonly SheetTabMapping[] = [
  {
    tabTitle: 'Roster & Identity',
    collection: 'roster',
    fields: [
      'HostID', 'HostNickname', 'FullName', 'Position', 'HostType', 'Level',
      'BaseSalaryTier', 'BaseSalaryAmount', 'Status', 'JoinDate', 'ReleaseDate',
      'ManagerAssigned', 'AnchorAssigned', 'TitlesTags', 'ProfileBio',
      'ProfilePhotoURL', 'LastUpdated', 'UpdatedBy',
    ],
    numericFields: ['Level'],
    optionalFields: ['ReleaseDate'],
  },
  {
    tabTitle: 'Monthly Commission Report',
    collection: 'monthly_commission',
    fields: [
      'ReportMonth', 'HostID', 'HostNickname', 'LiveDurationHrs',
      'PartyDurationHrs', 'TotalEarningsPts', 'AgentwebCommission',
      'LiveEarnings', 'PartyEarnings', 'PrivateChatEarnings', 'Tips',
      'PlatformReward', 'OtherEarnings', 'PlatformHourlySalary', 'SuperSalary',
      'SuperRank', 'Level', 'UploadTimestamp', 'UploadedBy',
    ],
    numericFields: [
      'LiveDurationHrs', 'PartyDurationHrs', 'TotalEarningsPts',
      'AgentwebCommission', 'LiveEarnings', 'PartyEarnings',
      'PrivateChatEarnings', 'Tips', 'PlatformReward', 'OtherEarnings',
      'PlatformHourlySalary', 'SuperSalary', 'Level',
    ],
    optionalFields: [],
  },
  {
    tabTitle: 'PK Data (Weekly)',
    collection: 'pk_weekly',
    fields: [
      'HostID', 'HostNickname', 'WeekStart', 'WeekEnd', 'WinPercent', 'PKScore',
      'PKSessions', 'Timestamp', 'SubmittedBy', 'SubmitterRole',
    ],
    numericFields: ['PKScore', 'PKSessions'],
    optionalFields: [],
  },
  {
    tabTitle: 'PK Data (Random)',
    collection: 'pk_random',
    fields: [
      'HostID', 'HostNickname', 'WinPercent', 'PKScore', 'Sessions',
      'DateSubmitted', 'SubmittedBy', 'Notes',
    ],
    numericFields: ['PKScore', 'Sessions'],
    optionalFields: [],
  },
  {
    tabTitle: 'Event & Exposure Log',
    collection: 'events',
    fields: [
      'HostID', 'HostNickname', 'EventType', 'EventDate', 'Notes',
      'SubmittedBy', 'SubmitterRole', 'Timestamp',
    ],
    numericFields: [],
    optionalFields: [],
  },
  {
    tabTitle: 'Host Profile Updates',
    collection: 'host_updates',
    fields: [
      'HostID', 'HostNickname', 'UpdatedBio', 'UpdatedPhotoURL',
      'UpdatedSocialLinks', 'UpdatedSkills', 'UpdatedSchedule', 'UpdatedGoals',
      'UpdatedAvailability', 'Timestamp',
    ],
    numericFields: [],
    optionalFields: [],
  },
  {
    tabTitle: 'performance',
    collection: 'performance',
    fields: [
      'HostID', 'HostNickname', 'ReportingPeriod', 'LastMonthEarnings',
      'LastWeekEarnings', 'Last30DEarnings', 'LiveEarnings', 'PartyEarnings',
      'Tips', 'PlatformReward', 'LiveVsPartyRatio', 'TipsRatio',
      'PlatformRewardPercent', 'PtsPerHour', 'MoMGrowthPercent',
      'HoursStreamed', 'AvgDailyHours', 'PeakHours', 'PeakEarningsDay',
      'ConsistencyScore', 'EngagementScore', 'Trend',
    ],
    numericFields: [
      'LastMonthEarnings', 'LastWeekEarnings', 'Last30DEarnings',
      'LiveEarnings', 'PartyEarnings', 'Tips', 'PlatformReward', 'PtsPerHour',
      'HoursStreamed', 'AvgDailyHours',
    ],
    optionalFields: [],
  },
  {
    tabTitle: 'director_notes',
    collection: 'director_notes',
    fields: [
      'HostID', 'HostNickname', 'RiskLevel', 'GrowthPotential',
      'BehavioralNotes', 'AttendanceIssues', 'SalaryConcerns',
      'PerformanceFlags', 'ManagerFeedback', 'DirectorStrategyNotes',
      'HostDevelopmentPlan', 'LastUpdated',
    ],
    numericFields: [],
    optionalFields: [],
  },
  {
    tabTitle: 'newbie_pipeline',
    collection: 'newbie_pipeline',
    fields: [
      'HostID', 'HostNickname', 'OnboardingDate', 'First30DPerformance',
      'FirstPKResults', 'FirstEventParticipation', 'FirstEarningsMilestone',
      'RedFlags', 'Strengths', 'TrainingPath', 'AssignedMentor', 'Week1Notes',
      'Week2Notes', 'Week3Notes', 'Week4Notes', 'Status',
    ],
    numericFields: [],
    optionalFields: [],
  },
  {
    tabTitle: 'inactive_released',
    collection: 'inactive_released',
    fields: [
      'HostID', 'HostNickname', 'JoinDate', 'ReleaseDate', 'ReasonForRelease',
      'LastMonthPerformance', 'LastPKData', 'LastEventParticipation',
      'JourneyNotes', 'ManagerAtRelease', 'FinalStatus',
    ],
    numericFields: [],
    optionalFields: [],
  },
  {
    tabTitle: 'director_dashboard',
    collection: 'director_dashboard',
    fields: [
      'AgencyTotalEarnings', 'ActiveHosts', 'InactiveAlerts', 'TopEarner',
      'ReportingMonth', 'ActivityRate', 'BurnoutRisk', 'RevenueConcentration',
      'SalaryObligations',
    ],
    numericFields: ['AgencyTotalEarnings', 'ActiveHosts'],
    optionalFields: [],
  },
  {
    tabTitle: 'file_manager',
    collection: 'file_manager',
    fields: [
      'EntryID', 'Timestamp', 'HostID', 'HostNickname', 'Category',
      'SubCategory', 'FileLabel', 'EntrySource', 'SubmitterName',
      'SubmitterRole', 'DeviceType', 'Notes',
    ],
    numericFields: [],
    optionalFields: ['HostID', 'HostNickname', 'Notes'],
  },
  {
    tabTitle: 'fanclub_metrics_base',
    collection: 'fanclub_metrics_base',
    fields: [
      'HostID', 'HostNickname', 'ReportingMonth', 'FanclubGC',
      'FanclubSubscribers', 'MoMGCChange', 'MoMSubscriberChange', 'Notes',
      'Timestamp', 'UpdatedBy',
    ],
    numericFields: ['FanclubGC', 'FanclubSubscribers'],
    optionalFields: [],
  },
  {
    tabTitle: 'fanclub_metrics_stream_growth',
    collection: 'fanclub_metrics_stream_growth',
    fields: [
      'HostID', 'HostNickname', 'StreamLabel', 'PreStreamCount',
      'PostStreamCount', 'FanGrowth', 'FanGrowthPercent', 'DateFrom', 'DateTo',
      'DurationDays', 'Notes', 'SubmittedBy',
    ],
    numericFields: [
      'PreStreamCount', 'PostStreamCount', 'FanGrowth', 'DurationDays',
    ],
    optionalFields: [],
  },
];

export const COLLECTION_BY_TAB: Readonly<Record<string, CollectionName>> =
  Object.freeze(
    Object.fromEntries(
      SHEET_TAB_MAPPINGS.map((m) => [m.tabTitle, m.collection]),
    ) as Record<string, CollectionName>,
  );

export const MAPPING_BY_COLLECTION: Readonly<Record<CollectionName, SheetTabMapping>> =
  Object.freeze(
    Object.fromEntries(
      SHEET_TAB_MAPPINGS.map((m) => [m.collection, m]),
    ) as Record<CollectionName, SheetTabMapping>,
  );

/**
 * Convert a single sheet row (object keyed by header cell) into a typed
 * Firestore document for the given collection.
 *
 * - Numeric fields are coerced via Number(...). NaN becomes 0.
 * - Optional fields with empty/missing values become null.
 * - Unknown fields are dropped.
 */
export function rowToDoc(
  collectionName: CollectionName,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const mapping = MAPPING_BY_COLLECTION[collectionName];
  const out: Record<string, unknown> = {};
  for (const field of mapping.fields) {
    const raw = row[field];
    const isOptional = mapping.optionalFields.includes(field);
    const isNumeric = mapping.numericFields.includes(field);

    if (raw === undefined || raw === null || raw === '') {
      out[field] = isOptional ? null : isNumeric ? 0 : '';
      continue;
    }
    if (isNumeric) {
      const n = typeof raw === 'number' ? raw : Number(raw);
      out[field] = Number.isFinite(n) ? n : 0;
    } else {
      out[field] = typeof raw === 'string' ? raw : String(raw);
    }
  }
  return out;
}

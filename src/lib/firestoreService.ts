// ============================================================================
// NINERS Schema-Aware Firestore Service
//
// Strongly-typed read/append helpers bound to the 14-collection canonical
// schema. Append-only collections expose `append(...)`; only `roster`
// exposes `upsert(...)`. All field names match Firestore exactly.
// ============================================================================

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  type QueryConstraint,
} from 'firebase/firestore';

import { db } from './firebase';
import {
  COLLECTIONS,
  type CollectionDocMap,
  type CollectionName,
  type RosterDoc,
  compositeId,
} from './schema';

function colRef<K extends CollectionName>(name: K) {
  return collection(db, name);
}

async function listAll<K extends CollectionName>(name: K): Promise<CollectionDocMap[K][]> {
  const snap = await getDocs(colRef(name));
  return snap.docs.map((d) => d.data() as CollectionDocMap[K]);
}

async function queryWhere<K extends CollectionName>(
  name: K,
  ...constraints: QueryConstraint[]
): Promise<CollectionDocMap[K][]> {
  const q = query(colRef(name), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as CollectionDocMap[K]);
}

async function appendWithKey<K extends CollectionName>(
  name: K,
  docId: string,
  data: CollectionDocMap[K],
): Promise<string> {
  await setDoc(doc(db, name, docId), data);
  return docId;
}

async function appendAuto<K extends CollectionName>(
  name: K,
  data: CollectionDocMap[K],
): Promise<string> {
  const ref = await addDoc(colRef(name), data as any);
  return ref.id;
}

// ===========================================================================
// 1. roster
// ===========================================================================
export const RosterService = {
  async upsert(rosterDoc: RosterDoc): Promise<void> {
    // HostID is the document ID; firestore.rules enforces incoming().HostID == hostId.
    await setDoc(doc(db, COLLECTIONS.roster, rosterDoc.HostID), rosterDoc);
  },
  async get(hostId: string): Promise<RosterDoc | null> {
    const snap = await getDoc(doc(db, COLLECTIONS.roster, hostId));
    return snap.exists() ? (snap.data() as RosterDoc) : null;
  },
  list(): Promise<RosterDoc[]> {
    return listAll('roster');
  },
};

// ===========================================================================
// 2. monthly_commission  (append-only; composite HostID + ReportMonth)
// ===========================================================================
export const MonthlyCommissionService = {
  append(d: CollectionDocMap['monthly_commission']) {
    return appendWithKey('monthly_commission', compositeId.monthlyCommission(d.HostID, d.ReportMonth), d);
  },
  byHost(hostId: string) {
    return queryWhere('monthly_commission', where('HostID', '==', hostId));
  },
  byMonth(reportMonth: string) {
    return queryWhere('monthly_commission', where('ReportMonth', '==', reportMonth));
  },
  list: () => listAll('monthly_commission'),
};

// ===========================================================================
// 3. pk_weekly  (append-only; composite HostID + WeekStart + WeekEnd)
// ===========================================================================
export const PkWeeklyService = {
  append(d: CollectionDocMap['pk_weekly']) {
    return appendWithKey('pk_weekly', compositeId.pkWeekly(d.HostID, d.WeekStart, d.WeekEnd), d);
  },
  byHost(hostId: string) {
    return queryWhere('pk_weekly', where('HostID', '==', hostId));
  },
  list: () => listAll('pk_weekly'),
};

// ===========================================================================
// 4. pk_random  (append-only)
// ===========================================================================
export const PkRandomService = {
  append(d: CollectionDocMap['pk_random']) {
    return appendAuto('pk_random', d);
  },
  byHost(hostId: string) {
    return queryWhere('pk_random', where('HostID', '==', hostId));
  },
  list: () => listAll('pk_random'),
};

// ===========================================================================
// 5. events  (append-only)
// ===========================================================================
export const EventsService = {
  append(d: CollectionDocMap['events']) {
    return appendAuto('events', d);
  },
  byHost(hostId: string) {
    return queryWhere('events', where('HostID', '==', hostId));
  },
  list: () => listAll('events'),
};

// ===========================================================================
// 6. host_updates  (append-only)
// ===========================================================================
export const HostUpdatesService = {
  append(d: CollectionDocMap['host_updates']) {
    return appendAuto('host_updates', d);
  },
  byHost(hostId: string) {
    return queryWhere('host_updates', where('HostID', '==', hostId));
  },
  list: () => listAll('host_updates'),
};

// ===========================================================================
// 7. performance  (append-only; composite HostID + ReportingPeriod)
// ===========================================================================
export const PerformanceService = {
  append(d: CollectionDocMap['performance']) {
    return appendWithKey('performance', compositeId.performance(d.HostID, d.ReportingPeriod), d);
  },
  byHost(hostId: string) {
    return queryWhere('performance', where('HostID', '==', hostId));
  },
  list: () => listAll('performance'),
};

// ===========================================================================
// 8. director_notes  (append-only, director-only writes)
// ===========================================================================
export const DirectorNotesService = {
  append(d: CollectionDocMap['director_notes']) {
    return appendAuto('director_notes', d);
  },
  byHost(hostId: string) {
    return queryWhere('director_notes', where('HostID', '==', hostId));
  },
  list: () => listAll('director_notes'),
};

// ===========================================================================
// 9. newbie_pipeline  (append-only)
// ===========================================================================
export const NewbiePipelineService = {
  append(d: CollectionDocMap['newbie_pipeline']) {
    return appendAuto('newbie_pipeline', d);
  },
  byHost(hostId: string) {
    return queryWhere('newbie_pipeline', where('HostID', '==', hostId));
  },
  list: () => listAll('newbie_pipeline'),
};

// ===========================================================================
// 10. inactive_released  (append-only; composite HostID + ReleaseDate)
// ===========================================================================
export const InactiveReleasedService = {
  append(d: CollectionDocMap['inactive_released']) {
    return appendWithKey('inactive_released', compositeId.inactiveReleased(d.HostID, d.ReleaseDate), d);
  },
  byHost(hostId: string) {
    return queryWhere('inactive_released', where('HostID', '==', hostId));
  },
  list: () => listAll('inactive_released'),
};

// ===========================================================================
// 11. director_dashboard  (append-only; keyed by ReportingMonth)
// ===========================================================================
export const DirectorDashboardService = {
  append(d: CollectionDocMap['director_dashboard']) {
    return appendWithKey('director_dashboard', d.ReportingMonth, d);
  },
  byMonth(reportingMonth: string) {
    return queryWhere('director_dashboard', where('ReportingMonth', '==', reportingMonth));
  },
  list: () => listAll('director_dashboard'),
};

// ===========================================================================
// 12. file_manager  (append-only; primary EntryID)
// ===========================================================================
export const FileManagerService = {
  append(d: CollectionDocMap['file_manager']) {
    return appendWithKey('file_manager', d.EntryID, d);
  },
  byHost(hostId: string) {
    return queryWhere('file_manager', where('HostID', '==', hostId));
  },
  list: () => listAll('file_manager'),
};

// ===========================================================================
// 13. fanclub_metrics_base  (append-only; composite HostID + ReportingMonth)
// ===========================================================================
export const FanclubMetricsBaseService = {
  append(d: CollectionDocMap['fanclub_metrics_base']) {
    return appendWithKey('fanclub_metrics_base', compositeId.fanclubMetricsBase(d.HostID, d.ReportingMonth), d);
  },
  byHost(hostId: string) {
    return queryWhere('fanclub_metrics_base', where('HostID', '==', hostId));
  },
  list: () => listAll('fanclub_metrics_base'),
};

// ===========================================================================
// 14. fanclub_metrics_stream_growth  (append-only)
// ===========================================================================
export const FanclubStreamGrowthService = {
  append(d: CollectionDocMap['fanclub_metrics_stream_growth']) {
    return appendAuto('fanclub_metrics_stream_growth', d);
  },
  byHost(hostId: string) {
    return queryWhere('fanclub_metrics_stream_growth', where('HostID', '==', hostId));
  },
  list: () => listAll('fanclub_metrics_stream_growth'),
};

// ===========================================================================
// Aggregate export — convenience handle for callers that prefer one import
// ===========================================================================
export const Firestore14 = {
  collections: COLLECTIONS,
  roster: RosterService,
  monthly_commission: MonthlyCommissionService,
  pk_weekly: PkWeeklyService,
  pk_random: PkRandomService,
  events: EventsService,
  host_updates: HostUpdatesService,
  performance: PerformanceService,
  director_notes: DirectorNotesService,
  newbie_pipeline: NewbiePipelineService,
  inactive_released: InactiveReleasedService,
  director_dashboard: DirectorDashboardService,
  file_manager: FileManagerService,
  fanclub_metrics_base: FanclubMetricsBaseService,
  fanclub_metrics_stream_growth: FanclubStreamGrowthService,
};

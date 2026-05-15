// ============================================================================
// NINERS — FirebaseService (legacy-shape adapter over canonical 14 collections)
//
// The UI components (RosterTab, DirectorTab, ProfilesTab, TrendsTab, AuthGate)
// were written against the original camelCase/snake_case `Host`,
// `CommissionEntry`, `PKEntry`, `ExposureEntry`, `FanbaseHealthEntry` shapes.
//
// This file is the ONLY place in app code that bridges those shapes to the
// canonical 14-collection NINERS schema (PascalCase fields, snake_case
// collection names). It writes to and reads from:
//
//   - roster                    (replaces legacy "hosts")
//   - monthly_commission        (replaces legacy "commissions")
//   - pk_random                 (replaces legacy "pk_records")
//   - events                    (replaces legacy "exposures")
//   - fanclub_metrics_base      (replaces legacy "fanbase_health")
//
// No other file in the codebase references any legacy collection string.
// Components that need direct typed access to the canonical schema should
// import from `./firestoreService` (the strongly-typed per-collection API).
// ============================================================================

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { auth, db } from './firebase';
import {
  COLLECTIONS,
  compositeId,
  type MonthlyCommissionDoc,
  type RosterDoc,
} from './schema';
import type {
  CommissionEntry,
  ExposureEntry,
  FanbaseHealthEntry,
  Host,
  PKEntry,
} from '../types';

// ---------------------------------------------------------------------------
// Error reporting (preserves prior behavior so existing catch sites still work)
// ---------------------------------------------------------------------------
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ---------------------------------------------------------------------------
// Mapping helpers — legacy Host <-> canonical roster (RosterDoc)
// ---------------------------------------------------------------------------
const nowIso = () => new Date().toISOString();
const submitterId = () =>
  auth.currentUser?.email ?? auth.currentUser?.uid ?? 'unknown';

function hostToRosterDoc(h: Host): RosterDoc {
  return {
    HostID: h.id,
    HostNickname: h.nickname ?? h.name ?? '',
    FullName: h.name ?? '',
    Position: h.position ?? 'Talent',
    HostType: h.anchor_type ?? 'Nine Agency',
    Level: Number(h.level ?? 0),
    BaseSalaryTier: h.base_salary_category ?? 'N/A',
    BaseSalaryAmount: '',
    Status: h.status ?? 'Active',
    JoinDate: h.created_at ?? nowIso(),
    ReleaseDate: null,
    ManagerAssigned: h.manager ?? '',
    AnchorAssigned: h.anchor_type ?? 'Nine Agency',
    TitlesTags: h.tier ?? '',
    ProfileBio: h.description ?? '',
    ProfilePhotoURL: h.photoUrl ?? '',
    LastUpdated: nowIso(),
    UpdatedBy: submitterId(),
  };
}

function rosterDocToHost(r: RosterDoc & Partial<Host>): Host {
  // Tolerate legacy documents that still carry camelCase fields by reading
  // them from the same object — Firestore returns whatever was written.
  return {
    id: r.HostID ?? r.id ?? '',
    name: r.FullName ?? r.name ?? '',
    position: (r.Position as Host['position']) ?? r.position ?? 'Talent',
    role: (r.Position as Host['role']) ?? r.role ?? 'Talent',
    team: r.team ?? '',
    manager: r.ManagerAssigned ?? r.manager ?? '',
    anchor_type:
      (r.AnchorAssigned as Host['anchor_type']) ??
      r.anchor_type ??
      'Nine Agency',
    base_salary_category:
      (r.BaseSalaryTier as Host['base_salary_category']) ??
      r.base_salary_category ??
      'N/A',
    status: (r.Status as Host['status']) ?? r.status ?? 'Active',
    level: Number(r.Level ?? r.level ?? 0),
    tier: (r.TitlesTags as Host['tier']) ?? r.tier ?? 'X',
    created_at: r.JoinDate ?? r.created_at ?? nowIso(),
    updated_at: r.LastUpdated ?? r.updated_at ?? nowIso(),
    photoUrl: r.ProfilePhotoURL ?? r.photoUrl ?? '',
    nickname: r.HostNickname ?? r.nickname ?? '',
    description: r.ProfileBio ?? r.description ?? '',
    password: r.password,
    is_temp_password: r.is_temp_password,
  };
}

// ---------------------------------------------------------------------------
// Mapping helpers — CommissionEntry <-> monthly_commission (MonthlyCommissionDoc)
// ---------------------------------------------------------------------------
function commissionToMonthlyDoc(
  c: CommissionEntry,
  hostNickname: string,
): MonthlyCommissionDoc {
  return {
    ReportMonth: c.month,
    HostID: c.poppo_id,
    HostNickname: hostNickname || c.poppo_name || '',
    LiveDurationHrs: Number(c.live_duration ?? 0),
    PartyDurationHrs: Number(c.video_duration ?? 0),
    TotalEarningsPts: Number(c.total_points ?? 0),
    AgentwebCommission: Number(c.agentweb_commission_earning ?? 0),
    LiveEarnings: Number(c.live_earnings ?? 0),
    PartyEarnings: Number(c.video_earnings ?? 0),
    PrivateChatEarnings: 0,
    Tips: 0,
    PlatformReward: 0,
    OtherEarnings: 0,
    PlatformHourlySalary: 0,
    SuperSalary: Number(c.my_commission ?? 0),
    SuperRank: '',
    Level: 0,
    UploadTimestamp: nowIso(),
    UploadedBy: submitterId(),
  };
}

function monthlyDocToCommission(d: MonthlyCommissionDoc): CommissionEntry {
  return {
    poppo_id: d.HostID,
    poppo_name: d.HostNickname,
    month: d.ReportMonth,
    live_duration: Number(d.LiveDurationHrs ?? 0),
    live_earnings: Number(d.LiveEarnings ?? 0),
    video_duration: Number(d.PartyDurationHrs ?? 0),
    video_earnings: Number(d.PartyEarnings ?? 0),
    agentweb_commission_rate: 0,
    agentweb_commission_earning: Number(d.AgentwebCommission ?? 0),
    total_points: Number(d.TotalEarningsPts ?? 0),
    total_earnings: Number(d.TotalEarningsPts ?? 0),
    my_commission: Number(d.SuperSalary ?? 0),
  };
}

// ---------------------------------------------------------------------------
// FirebaseService — public API preserved from the original implementation,
// now backed entirely by the canonical 14-collection schema.
// ---------------------------------------------------------------------------
export const FirebaseService = {
  // ---------- Hosts (-> roster) ----------
  async saveHosts(hosts: Host[]) {
    try {
      const batch = writeBatch(db);
      hosts.forEach((h) => {
        const ref = doc(db, COLLECTIONS.roster, h.id);
        batch.set(ref, hostToRosterDoc(h));
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.roster);
    }
  },

  async updateHost(host: Host) {
    try {
      const ref = doc(db, COLLECTIONS.roster, host.id);
      await setDoc(ref, hostToRosterDoc(host));
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `${COLLECTIONS.roster}/${host.id}`,
      );
    }
  },

  async deleteHost(hostId: string) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.roster, hostId));
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `${COLLECTIONS.roster}/${hostId}`,
      );
    }
  },

  async getAllHosts(): Promise<Host[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.roster));
      return snap.docs.map((d) => rosterDocToHost(d.data() as RosterDoc));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, COLLECTIONS.roster);
    }
  },

  async getHost(hostId: string): Promise<Host | null> {
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.roster, hostId));
      return snap.exists() ? rosterDocToHost(snap.data() as RosterDoc) : null;
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.GET,
        `${COLLECTIONS.roster}/${hostId}`,
      );
    }
  },

  // ---------- Commissions (-> monthly_commission) ----------
  async saveCommissions(commissions: CommissionEntry[]) {
    try {
      // Look up nicknames in one round-trip so we can populate HostNickname.
      const ids = Array.from(new Set(commissions.map((c) => c.poppo_id)));
      const nicknameById = await fetchNicknames(ids);

      const batch = writeBatch(db);
      commissions.forEach((c) => {
        const id = compositeId.monthlyCommission(c.poppo_id, c.month);
        const ref = doc(db, COLLECTIONS.monthly_commission, id);
        batch.set(
          ref,
          commissionToMonthlyDoc(c, nicknameById.get(c.poppo_id) ?? c.poppo_name ?? ''),
        );
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        COLLECTIONS.monthly_commission,
      );
    }
  },

  async getCommissionsByMonth(month: string): Promise<CommissionEntry[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.monthly_commission),
        where('ReportMonth', '==', month),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) =>
        monthlyDocToCommission(d.data() as MonthlyCommissionDoc),
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.LIST,
        COLLECTIONS.monthly_commission,
      );
    }
  },

  async getAllCommissions(): Promise<CommissionEntry[]> {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.monthly_commission));
      return snap.docs.map((d) =>
        monthlyDocToCommission(d.data() as MonthlyCommissionDoc),
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.LIST,
        COLLECTIONS.monthly_commission,
      );
    }
  },

  async deleteCommissionsByMonth(month: string) {
    // monthly_commission is append-only in firestore.rules. Deletions are
    // server-rejected and only retained here so existing UI flows surface a
    // clear error rather than silently no-op.
    try {
      const q = query(
        collection(db, COLLECTIONS.monthly_commission),
        where('ReportMonth', '==', month),
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.DELETE,
        `${COLLECTIONS.monthly_commission}/${month}`,
      );
    }
  },

  // ---------- PK records (-> pk_random, append-only) ----------
  async savePKRecords(records: PKEntry[]) {
    try {
      const ids = Array.from(new Set(records.map((r) => r.poppo_id)));
      const nicknameById = await fetchNicknames(ids);

      const batch = writeBatch(db);
      records.forEach((r) => {
        const ref = doc(collection(db, COLLECTIONS.pk_random));
        batch.set(ref, {
          HostID: r.poppo_id,
          HostNickname: nicknameById.get(r.poppo_id) ?? '',
          WinPercent: String(r.win_percentage ?? 0),
          PKScore: Number(r.pk_score ?? 0),
          Sessions: Number(r.sessions ?? 0),
          DateSubmitted: r.timestamp ?? nowIso(),
          SubmittedBy: r.submitted_by ?? submitterId(),
          Notes: `Range ${r.start_date} → ${r.end_date}`,
        });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.pk_random);
    }
  },

  // ---------- Exposures (-> events, append-only) ----------
  async saveExposures(exposures: ExposureEntry[]) {
    try {
      const ids = Array.from(new Set(exposures.map((e) => e.poppo_id)));
      const nicknameById = await fetchNicknames(ids);

      const batch = writeBatch(db);
      exposures.forEach((e) => {
        const ref = doc(collection(db, COLLECTIONS.events));
        batch.set(ref, {
          HostID: e.poppo_id,
          HostNickname: nicknameById.get(e.poppo_id) ?? '',
          EventType: e.event_type ?? '',
          EventDate: e.event_date ?? nowIso(),
          Notes: e.description ?? '',
          SubmittedBy: e.submitted_by ?? submitterId(),
          SubmitterRole: e.submitted_role ?? '',
          Timestamp: e.timestamp ?? nowIso(),
        });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, COLLECTIONS.events);
    }
  },

  // ---------- Fanbase health (-> fanclub_metrics_base, append-only) ----------
  async saveFanbaseHealth(records: FanbaseHealthEntry[]) {
    try {
      const ids = Array.from(new Set(records.map((r) => r.hostId)));
      const nicknameById = await fetchNicknames(ids);

      const batch = writeBatch(db);
      records.forEach((r) => {
        const reportingMonth = (r.submittedAt ?? nowIso()).slice(0, 7); // YYYY-MM
        const id = compositeId.fanclubMetricsBase(r.hostId, reportingMonth);
        const ref = doc(db, COLLECTIONS.fanclub_metrics_base, id);
        batch.set(ref, {
          HostID: r.hostId,
          HostNickname: nicknameById.get(r.hostId) ?? '',
          ReportingMonth: reportingMonth,
          FanclubGC: Number(r.gcMembers ?? 0),
          FanclubSubscribers: Number(r.subscribers ?? 0),
          MoMGCChange: '',
          MoMSubscriberChange: '',
          Notes: [r.preStreamUpdate, r.postStreamUpdate].filter(Boolean).join(' | '),
          Timestamp: r.submittedAt ?? nowIso(),
          UpdatedBy: r.submittedBy ?? submitterId(),
        });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        COLLECTIONS.fanclub_metrics_base,
      );
    }
  },
};

// ---------------------------------------------------------------------------
// Internal: batch-fetch nicknames from roster so writes can populate
// HostNickname without each caller having to load the roster manually.
// ---------------------------------------------------------------------------
async function fetchNicknames(hostIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (hostIds.length === 0) return out;
  const reads = await Promise.all(
    hostIds.map((id) => getDoc(doc(db, COLLECTIONS.roster, id))),
  );
  reads.forEach((snap, i) => {
    if (snap.exists()) {
      const data = snap.data() as RosterDoc;
      out.set(hostIds[i], data.HostNickname ?? '');
    }
  });
  return out;
}

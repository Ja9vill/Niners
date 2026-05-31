import { auth, db, storage } from './firebase';
import { ref, uploadString, getBytes, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Storage } from './storage';
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, writeBatch, Timestamp, onSnapshot, updateDoc } from 'firebase/firestore';
import { CommissionEntry, Host, PKEntry, ExposureEntry, FanbaseHealthEntry, WeeklyLiveDataEntry, MonthlyLiveDataEntry, TopNinersEarningsSummary, EventsCalendarPublic, ReportingSubmission, Task, ActivityAuditLog, CalendarEvent, LivehouseRequest } from '../types';

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
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const user = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: user?.uid,
      email: user?.email,
      emailVerified: user?.emailVerified,
      isAnonymous: user?.isAnonymous,
      tenantId: user?.tenantId,
      providerInfo: user?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  // Log more details about the environment
  console.error('Firestore Error Detailed Context:', {
    dbId: (db as any).databaseId,
    authUid: user?.uid,
    authEmail: user?.email,
    operation: operationType,
    path: path
  });

  console.error('Firestore Error JSON: ', JSON.stringify(errInfo));
  
  if (operationType === OperationType.LIST) {
    console.warn(`[FirebaseService] Returning empty list for failed LIST operation on ${path}`);
    return;
  }
  throw new Error(JSON.stringify(errInfo));
}

export const FirebaseService = {
  // Users management
  async getAllUsers(): Promise<any[]> {
    const path = 'users';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => ({ poppo_id: d.id, ...d.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async updateUser(poppoId: string, data: any) {
    const path = `users/${poppoId}`;
    try {
      const docRef = doc(db, 'users', poppoId);
      await setDoc(docRef, { ...data, updated_at: new Date().toISOString() }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async updateRoleMetadata(role: string, id: string, data: any): Promise<void> {
    try {
      if (!id) throw new Error("ID is required for role metadata updates.");
      const safeRole = (role || 'host').toLowerCase().replace(/\s+/g, '_');
      
      const roleRef = doc(db, safeRole, id);
      const userRef = doc(db, 'users', id);
      
      const finalData = { ...data, updated_at: new Date().toISOString() };
      
      // Attempt to update the users collection first as the source of truth
      try {
        await setDoc(userRef, finalData, { merge: true });
      } catch (e: any) {
         console.warn(`[UPDATE] Could not update 'users' collection for ID: ${id}: ${e.message}`);
      }

      await setDoc(roleRef, finalData, { merge: true });
      console.log(`[UPDATE] Role metadata updated for ${id} in ${safeRole}`);
    } catch (error: any) {
      console.error(`[UPDATE] Role metadata error for ID: ${id}`, error);
      handleFirestoreError(error, OperationType.UPDATE, `role_metadata/${id}`);
    }
  },

  async uploadProfilePhoto(file: File, id: string, name: string, role: string): Promise<string> {
    try {
      if (!file || !id) throw new Error("File and ID are required.");
      
      // Create SEO friendly filename based on nickname
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const cleanName = (name || id).replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
      const fileName = `${cleanName}-${id}.${extension}`;
      const storageRef = ref(storage, `profile_photos/${fileName}`);

      // Set SEO optimized metadata
      const metadata = {
        contentType: file.type,
        cacheControl: 'public,max-age=31536000',
        customMetadata: {
          alt: `${name} - Nine Dashboard Profile`,
          description: `Profile photo for ${name} (${role}) on Nine Dashboard.`,
          'og:image': 'true',
          uploadedAt: new Date().toISOString()
        }
      };

      // Upload the file
      await uploadBytes(storageRef, file, metadata);
      
      // Get the direct download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Update both the specific role collection and the main 'users' collection
      await this.updateRoleMetadata(role, id, { photoUrl: downloadURL });

      return downloadURL;
    } catch (error: any) {
      console.error(`[UPLOAD] Profile photo upload failed for ID: ${id}`, error);
      throw error;
    }
  },

  async getAllRoleMetadata(): Promise<any[]> {
    const collections = ['users', 'host', 'manager', 'admin', 'head_admin', 'agent', 'director'];
    let metadataMap: Record<string, any> = {};
    let errors: string[] = [];
    for (const col of collections) {
      try {
        const snapshot = await getDocs(collection(db, col));
        snapshot.docs.forEach(d => {
          const id = d.id;
          const data = d.data();
          metadataMap[id] = { ...metadataMap[id], poppo_id: id, ...data };
        });
      } catch (error: any) {
        console.warn(`Could not fetch metadata for collection: ${col}`, error);
        errors.push(`${col}: ${error.message}`);
      }
    }
    
    const allMetadata = Object.values(metadataMap);
    
    // If we have errors and NO data was fetched, throw the errors so the UI shows them
    if (errors.length > 0 && allMetadata.length === 0) {
      throw new Error(`Permission Denied fetching collections: ${errors.join(', ')}`);
    }
    
    return allMetadata;
  },



  async submitRpkReport(hostId: string, fromDate: string, toDate: string, data: any) {
    const docId = `${fromDate}_${toDate}`;
    const path = `host/${hostId}/rpk_reporting/${docId}`;
    try {
      const docRef = doc(db, 'host', hostId, 'rpk_reporting', docId);
      await setDoc(docRef, { ...data, timestamp: new Date().toISOString() });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },



  async submitFanbaseReport(hostId: string, fromDate: string, toDate: string, data: any) {
    const docId = `${fromDate}_${toDate}`;
    const path = `host/${hostId}/fanbase_report/${docId}`;
    try {
      const docRef = doc(db, 'host', hostId, 'fanbase_report', docId);
      await setDoc(docRef, { ...data, timestamp: new Date().toISOString() });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Hosts management
  async saveHosts(hosts: Host[]) {
    const path = 'users';
    try {
      const batch = writeBatch(db);
      hosts.forEach(h => {
        const docRef = doc(db, path, h.id);
        batch.set(docRef, { ...h, updated_at: new Date().toISOString() });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async updateHost(host: Host) {
    const path = `hosts/${host.id}`;
    try {
      const docRef = doc(db, 'users', host.id);
      await setDoc(docRef, { ...host, updated_at: new Date().toISOString() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteHost(hostId: string) {
    const path = `hosts/${hostId}`;
    try {
      await deleteDoc(doc(db, 'users', hostId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async getAllHosts(): Promise<Host[]> {
    const collections = ['host', 'manager', 'admin', 'head_admin', 'agent', 'director'];
    let allHosts: any[] = [];
    for (const col of collections) {
      try {
        const snapshot = await getDocs(collection(db, col));
        const docs = snapshot.docs.map(d => {
          const data = d.data();
          return { 
            ...data, 
            id: d.id, 
            poppo_id: d.id,
            name: data.nickname || data.name || 'Unknown',
            nickname: data.nickname || data.name || 'Unknown',
          } as Host;
        });
        allHosts = allHosts.concat(docs);
      } catch (error) {
        console.warn(`Could not fetch hosts for collection: ${col}`, error);
      }
    }
    return allHosts;
  },
  
  // *** User credentials retrieval ***
  async getUserCredentials(): Promise<{ poppo_id: string; password?: string }[]> {
    const path = 'users';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => {
        const data = d.data() as Host;
        return { poppo_id: d.id, password: data.password };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // Commission management
  async saveCommissions(commissions: CommissionEntry[]) {
    const path = 'commissions';
    try {
      const batch = writeBatch(db);
      commissions.forEach(c => {
        const id = `${c.poppo_id}_${c.month}`;
        const docRef = doc(db, path, id);
        batch.set(docRef, c);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getCommissionsByMonth(month: string): Promise<CommissionEntry[]> {
    const path = 'commissions';
    try {
      const q = query(collection(db, path), where('month', '==', month));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data() as CommissionEntry);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getAllCommissions(): Promise<CommissionEntry[]> {
    const path = 'commissions';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => d.data() as CommissionEntry);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async deleteCommissionsByMonth(month: string) {
    const path = `commissions/${month}`;
    try {
      const q = query(collection(db, 'commissions'), where('month', '==', month));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async deleteCommission(poppoId: string, month: string) {
    const path = `commissions/${poppoId}_${month}`;
    try {
      await deleteDoc(doc(db, 'commissions', `${poppoId}_${month}`));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async updateCommission(commission: CommissionEntry) {
    const path = `commissions/${commission.poppo_id}_${commission.month}`;
    try {
      const docRef = doc(db, 'commissions', `${commission.poppo_id}_${commission.month}`);
      await setDoc(docRef, commission, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Reporting & Other entities
  async savePKRecords(records: PKEntry[]) {
    const path = 'pk_records';
    try {
      const batch = writeBatch(db);
      records.forEach(r => {
        const id = r.id || crypto.randomUUID();
        const docRef = doc(db, path, id);
        batch.set(docRef, { ...r, id });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async saveExposures(exposures: ExposureEntry[]) {
    const path = 'exposures';
    try {
      const batch = writeBatch(db);
      exposures.forEach(e => {
        const id = e.id || crypto.randomUUID();
        const docRef = doc(db, path, id);
        batch.set(docRef, { ...e, id });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getAllExposures(): Promise<ExposureEntry[]> {
    const path = 'exposures';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => d.data() as ExposureEntry);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async saveWeeklyLiveData(records: WeeklyLiveDataEntry[]) {
    const path = 'weekly_live_data';
    try {
      const batch = writeBatch(db);
      records.forEach(r => {
        const id = r.id || crypto.randomUUID();
        const docRef = doc(db, path, id);
        batch.set(docRef, { ...r, id });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async saveMonthlyLiveData(records: MonthlyLiveDataEntry[]) {
    const path = 'monthly_live_data';
    try {
      const batch = writeBatch(db);
      records.forEach(r => {
        const id = r.id || crypto.randomUUID();
        const docRef = doc(db, path, id);
        batch.set(docRef, { ...r, id });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async saveFanbaseHealth(records: FanbaseHealthEntry[]) {
    const path = 'fanbase_health';
    try {
      const batch = writeBatch(db);
      records.forEach(r => {
        const id = r.id || crypto.randomUUID();
        const docRef = doc(db, path, id);
        batch.set(docRef, { ...r, id });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async saveTasks(tasks: any[]) {
    const path = 'tasks';
    try {
      const batch = writeBatch(db);
      tasks.forEach(t => {
        const id = t.id || crypto.randomUUID();
        const docRef = doc(db, path, id);
        batch.set(docRef, { ...t, id });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async saveGoals(goals: any[]) {
    const path = 'goals';
    try {
      const batch = writeBatch(db);
      goals.forEach(g => {
        const id = g.id || crypto.randomUUID();
        const docRef = doc(db, path, id);
        batch.set(docRef, { ...g, id });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async saveCalendarEvents(events: CalendarEvent[]) {
    const path = 'calendar';
    try {
      const batch = writeBatch(db);
      events.forEach(e => {
        const id = e.event_id || crypto.randomUUID();
        const docRef = doc(db, path, id);
        batch.set(docRef, { ...e, event_id: id });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getCalendarEvents(): Promise<CalendarEvent[]> {
    const path = 'calendar';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => d.data() as CalendarEvent);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async saveLivehouseRequests(requests: LivehouseRequest[]) {
    const path = 'livehouse_requests';
    try {
      const batch = writeBatch(db);
      requests.forEach(r => {
        const id = r.id || crypto.randomUUID();
        const docRef = doc(db, path, id);
        batch.set(docRef, r);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getLivehouseRequests(): Promise<LivehouseRequest[]> {
    const path = 'livehouse_requests';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => d.data() as LivehouseRequest);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // Password Management
  async createResetRequest(request: any) {
    const path = `reset_requests/${request.id}`;
    try {
      await setDoc(doc(db, 'reset_requests', request.id), request);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async getResetRequests(): Promise<any[]> {
    const path = 'reset_requests';
    try {
      const q = query(collection(db, path), where('status', '==', 'Pending'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async resolveResetRequest(requestId: string) {
    const path = `reset_requests/${requestId}`;
    try {
      const docRef = doc(db, 'reset_requests', requestId);
      await setDoc(docRef, { status: 'Resolved', resolvedAt: new Date().toISOString() }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Notes Management
  async saveNote(note: any) {
    const path = `notes/${note.id}`;
    try {
      await setDoc(doc(db, 'notes', note.id), note);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async getNotesByHost(hostId: string): Promise<any[]> {
    const path = 'notes';
    try {
      const q = query(collection(db, path), where('hostId', '==', hostId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async deleteNote(noteId: string) {
    const path = `notes/${noteId}`;
    try {
      await deleteDoc(doc(db, 'notes', noteId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Top Niners summary
  async saveTopNinersSummary(summaries: TopNinersEarningsSummary[]) {
    const path = 'top_niners_earnings_summary';
    try {
      const batch = writeBatch(db);
      summaries.forEach(s => {
        const id = s.summaryId || crypto.randomUUID();
        const docRef = doc(db, path, id);
        batch.set(docRef, { ...s, summaryId: id });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getTopNinersSummary(periodKey: string): Promise<TopNinersEarningsSummary[]> {
    const path = 'top_niners_earnings_summary';
    try {
      const q = query(collection(db, path), where('periodKey', '==', periodKey));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data() as TopNinersEarningsSummary);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // Public Calendar
  async savePublicCalendarEvents(events: EventsCalendarPublic[]) {
    const path = 'events_calendar_public';
    try {
      const batch = writeBatch(db);
      events.forEach(e => {
        const id = e.eventId || crypto.randomUUID();
        const docRef = doc(db, path, id);
        batch.set(docRef, { ...e, eventId: id });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getPublicCalendarEvents(): Promise<EventsCalendarPublic[]> {
    const path = 'events_calendar_public';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => d.data() as EventsCalendarPublic);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // Reporting Submissions
  async saveReportingSubmission(submission: ReportingSubmission) {
    const path = `reporting_submissions/${submission.submissionId}`;
    try {
      const docRef = doc(db, 'reporting_submissions', submission.submissionId);
      await setDoc(docRef, submission);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getReportingSubmissions(): Promise<ReportingSubmission[]> {
    const path = 'reporting_submissions';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => d.data() as ReportingSubmission);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // Tasks Management
  async getTasks(): Promise<Task[]> {
    const path = 'tasks';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => d.data() as Task);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async deleteTask(taskId: string) {
    const path = `tasks/${taskId}`;
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Activity Audit Logs
  async logActivity(log: ActivityAuditLog) {
    const path = `activity_audit_logs/${log.logId}`;
    try {
      const docRef = doc(db, 'activity_audit_logs', log.logId);
      await setDoc(docRef, log);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getActivityLogs(): Promise<ActivityAuditLog[]> {
    const path = 'activity_audit_logs';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => d.data() as ActivityAuditLog);
    } catch (error) {
      console.error("Failed to read system audit logs", error);
      return [];
    }
  },

  async getAwards(hostId: string): Promise<any[]> {
    // Stub implementation to fix TS error. Can be implemented later.
    return Promise.resolve([]);
  },

  /**
   * Subscribe to real-time updates on the hosts collection via Firestore onSnapshot.
   * Returns an unsubscribe function — call it on component unmount to stop listening.
   */
  subscribeToHosts(callback: (hosts: Host[]) => void): () => void {
    const path = 'users';
    const unsubscribe = onSnapshot(
      collection(db, path),
      (snapshot) => {
        const hosts = snapshot.docs.map(d => d.data() as Host);
        callback(hosts);
      },
      (error) => {
        console.error('[FirebaseService] onSnapshot error for hosts:', error);
      }
    );
    return unsubscribe;
  },

  /**
   * Partially update specific fields of a host document without overwriting the rest.
   * Uses updateDoc (merge-style) so only the specified fields are modified.
   * @param poppoId - The Firestore document ID (same as poppo_id)
   * @param patch - Object with only the fields to update
   */
  async patchHost(poppoId: string, patch: Partial<Host>): Promise<void> {
    const path = `hosts/${poppoId}`;
    try {
      const docRef = doc(db, 'users', poppoId);
      await updateDoc(docRef, { ...patch, updated_at: new Date().toISOString() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async saveFinancials(type: 'monthly' | 'weekly', data: any[]): Promise<void> {
    try {
      const authState = Storage.getAuthState();
      const res = await fetch("/api/admin/financials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authState.token ? { Authorization: `Bearer ${authState.token}` } : {}),
        },
        body: JSON.stringify({ type, data }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData?.error || "Failed to save financials to backend");
      }
    } catch (error) {
      console.error(`[FirebaseService] Error saving financials for ${type}:`, error);
      throw error;
    }
  },

  async fetchFinancials(type: 'monthly' | 'weekly'): Promise<any[]> {
    try {
      const authState = Storage.getAuthState();
      const res = await fetch(`/api/admin/financials?type=${type}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(authState.token ? { Authorization: `Bearer ${authState.token}` } : {}),
        },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData?.error || "Failed to fetch financials from backend");
      }
      return await res.json();
    } catch (error: any) {
      console.error(`[FirebaseService] Error fetching financials for ${type}:`, error);
      return [];
    }
  },

  async savePerformanceReport(data: any[]): Promise<void> {
    const path = 'performance_report';
    try {
      const batch = writeBatch(db);
      data.forEach(r => {
        const id = `${r.poppo_id}_${r.from_date || ''}_${r.to_date || ''}`;
        const docRef = doc(db, path, id);
        batch.set(docRef, r, { merge: true });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
};
// ─── Roster Management types & standalone exports ─────────────────────────────
// These are used by AppUsersTab for the admin roster management feature.
// `db` is already imported at the top of this file from './firebase'.

/** Strict role set allowed in the application */
export type UserRole = 'director' | 'head admin' | 'manager' | 'agent' | 'admin' | 'host';

export interface HostRosterUser {
  poppo_id: string;       // Used as the Firestore Document ID
  nickname: string;
  role: UserRole;
  isActive: boolean;
  is_temp_password?: boolean;
}

/**
 * Listens to the 'hosts' collection in real-time.
 * poppo_id is pulled from docSnap.id (the document key).
 * Returns an unsubscribe function — call it in useEffect cleanup.
 */
export const subscribeToHosts = (callback: (hosts: HostRosterUser[]) => void): (() => void) => {
  const q = query(collection(db, 'users'));
  return onSnapshot(
    q,
    (snapshot) => {
      const data: HostRosterUser[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          poppo_id: docSnap.id,
          nickname: d.nickname || '',
          role: (d.role as UserRole) || 'host',
          isActive: d.isActive ?? true,
          is_temp_password: d.is_temp_password ?? false,
        };
      });
      callback(data);
    },
    (error) => {
      console.error('[subscribeToHosts] Firestore onSnapshot error:', error);
    }
  );
};

/**
 * Partially updates a host document by poppo_id.
 * Only the supplied fields are written — other fields are untouched.
 */
export const patchHost = async (
  poppoId: string,
  updates: Partial<Omit<HostRosterUser, 'poppo_id'>>
): Promise<{ success: true }> => {
  const hostDocRef = doc(db, 'users', poppoId);
  await updateDoc(hostDocRef, { ...updates, updated_at: new Date().toISOString() });
  return { success: true };
};
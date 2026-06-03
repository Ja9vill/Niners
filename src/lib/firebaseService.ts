import { auth, db, storage } from './firebase';
import { ref, uploadString, getBytes, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Storage } from './storage';
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, writeBatch, Timestamp, onSnapshot, updateDoc, arrayUnion, arrayRemove, deleteField } from 'firebase/firestore';
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
      
      let managerIdToSync: string | null = undefined;
      if (data.assignedManagerId !== undefined) {
        managerIdToSync = data.assignedManagerId;
      } else if (data.assigned_manager_poppo_id !== undefined) {
        managerIdToSync = data.assigned_manager_poppo_id;
        data.assignedManagerId = data.assigned_manager_poppo_id;
      }

      // Normalize bidirectional fields to prevent any format mismatch between UI-expected and legacy fields
      const normalizedData = { ...data };
      const managerName = data.manager || data.assigned_manager_nickname || data.assigned_manager || '';
      const managerId = data.assignedManagerId || data.assigned_manager_poppo_id || '';
      const teamName = data.team || data.team_anchor || '';
      const salaryCategory = data.base_salary_category || data.tier_pay || '';

      if (managerName) {
        normalizedData.manager = managerName;
        normalizedData.assigned_manager = managerName;
        normalizedData.assigned_manager_nickname = managerName;
      }
      if (managerId) {
        normalizedData.assignedManagerId = managerId;
        normalizedData.assigned_manager_poppo_id = managerId;
      }
      if (teamName) {
        normalizedData.team = teamName;
        normalizedData.team_anchor = teamName;
      }
      if (salaryCategory) {
        normalizedData.base_salary_category = salaryCategory;
        normalizedData.tier_pay = salaryCategory;
      }

      const roleRef = doc(db, safeRole, id);
      const userRef = doc(db, 'users', id);
      
      const finalData = { ...normalizedData, updated_at: new Date().toISOString() };
      
      // Attempt to update the users collection first as the source of truth
      try {
        await setDoc(userRef, finalData, { merge: true });
      } catch (e: any) {
         console.warn(`[UPDATE] Could not update 'users' collection for ID: ${id}: ${e.message}`);
      }

      await setDoc(roleRef, finalData, { merge: true });
      console.log(`[UPDATE] Role metadata updated for ${id} in ${safeRole}`);

      if (managerIdToSync !== undefined) {
        await this.syncHostManagerRelationship(id, managerIdToSync);
      }
    } catch (error: any) {
      console.error(`[UPDATE] Role metadata error for ID: ${id}`, error);
      handleFirestoreError(error, OperationType.UPDATE, `role_metadata/${id}`);
    }
  },

  async uploadProfilePhoto(file: File, id: string, name: string, role: string): Promise<string> {
    try {
      if (!file || !id) throw new Error("File and ID are required.");
      
      const cleanName = (name || id).replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
      const fileName = `${cleanName}-${id}.jpg`; // Always save as jpg after compression

      // Compress image using canvas before uploading (reduces payload from ~5MB to ~100KB)
      const compressedBase64 = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          const MAX = 800;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
            else { width = Math.round((width * MAX) / height); height = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          URL.revokeObjectURL(objectUrl);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = objectUrl;
      });

      console.log(`[UPLOAD] Sending compressed photo for ${id} to /api/upload-profile-photo`);

      // Send to our backend proxy which bypasses Firebase CORS and Storage Rules
      const response = await fetch('/api/upload-profile-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: compressedBase64,
          fileName,
          contentType: 'image/jpeg'
        })
      });

      console.log(`[UPLOAD] Server responded with status: ${response.status}`);

      if (!response.ok) {
        const errText = await response.text().catch(() => 'No response body');
        console.error(`[UPLOAD] Server error body:`, errText);
        throw new Error(`Upload failed with status ${response.status}: ${errText}`);
      }

      const { url } = await response.json();
      
      if (!url) {
        throw new Error("Failed to retrieve upload URL from server.");
      }

      // Update both the specific role collection and the main 'users' collection
      await this.updateRoleMetadata(role, id, { photoUrl: url });

      return url;
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
          const collectionRole = col === 'users' ? 'host' : col;
          metadataMap[id] = { role: collectionRole, ...metadataMap[id], poppo_id: id, ...data };
        });
      } catch (error: any) {
        console.warn(`Could not fetch metadata for collection: ${col}`, error);
        errors.push(`${col}: ${error.message}`);
      }
    }
    
    const allMetadata = Object.values(metadataMap).map(item => {
      const data = item as any;
      const managerName = data.manager || data.assigned_manager_nickname || data.assigned_manager || 'Nine Management';
      const managerId = data.assignedManagerId || data.assigned_manager_poppo_id || null;
      const teamName = data.team || data.team_anchor || 'Unassigned';
      const salaryCategory = data.base_salary_category || data.tier_pay || 'Regular Host';
      return {
        ...data,
        id: data.id || data.poppo_id,
        name: data.nickname || data.name || 'Unknown',
        nickname: data.nickname || data.name || 'Unknown',
        manager: managerName,
        team: teamName,
        base_salary_category: salaryCategory,
        assignedManagerId: managerId,
        assigned_manager_nickname: managerName,
        assigned_manager_poppo_id: managerId,
        team_anchor: teamName,
        tier_pay: salaryCategory
      };
    });
    
    // If we have errors and NO data was fetched, throw the errors so the UI shows them
    if (errors.length > 0 && allMetadata.length === 0) {
      throw new Error(`Permission Denied fetching collections: ${errors.join(', ')}`);
    }
    
    return allMetadata;
  },



  async submitRpkReport(hostId: string, fromDate: string, toDate: string, data: any) {
    const docId = `${hostId}_${fromDate}_${toDate}`;
    const path = `pk_reports/${docId}`;
    try {
      const docRef = doc(db, 'pk_reports', docId);
      await setDoc(docRef, { ...data, poppo_id: hostId, timestamp: new Date().toISOString() });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },



  async submitFanbaseReport(hostId: string, fromDate: string, toDate: string, data: any) {
    const docId = `${hostId}_${fromDate}_${toDate}`;
    const path = `fanbase_reports/${docId}`;
    try {
      const docRef = doc(db, 'fanbase_reports', docId);
      await setDoc(docRef, { ...data, poppo_id: hostId, timestamp: new Date().toISOString() });
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

  async updateManagerHostFields(managerId: string, hostIdToAdd: string | null, hostIdToRemove: string | null, forceHosts?: string[]): Promise<void> {
    const managerUserRef = doc(db, 'users', managerId);
    const managerSnap = await getDoc(managerUserRef);
    if (!managerSnap.exists()) return;

    const mgrData = managerSnap.data();
    const mgrRole = String(mgrData?.role || '').toLowerCase();
    
    let assignedHosts: string[] = forceHosts !== undefined 
      ? forceHosts 
      : (mgrData?.assignedHosts || []);

    // Apply changes locally if not forced
    if (forceHosts === undefined) {
      if (hostIdToAdd && !assignedHosts.includes(hostIdToAdd)) {
        assignedHosts.push(hostIdToAdd);
      }
      if (hostIdToRemove) {
        assignedHosts = assignedHosts.filter(id => id !== hostIdToRemove);
      }
    }

    // Prepare fields to update
    const updateData: Record<string, any> = {
      assignedHosts: assignedHosts
    };

    // Find any existing "Assigned Host X" keys to delete them
    Object.keys(mgrData).forEach(key => {
      if (key.startsWith('Assigned Host') || key.startsWith('Assigned host')) {
        updateData[key] = deleteField();
      }
    });

    // Generate new "Assigned Host X" fields
    assignedHosts.forEach((hId, index) => {
      updateData[`Assigned Host ${index + 1}`] = hId;
    });

    // Update both collections (users and manager/agent)
    const batchUpdate = writeBatch(db);
    batchUpdate.set(managerUserRef, updateData, { merge: true });

    const col = mgrRole === 'agent' ? 'agent' : 'manager';
    const roleRef = doc(db, col, managerId);
    
    // For the role collections, also delete old fields
    try {
      const roleSnap = await getDoc(roleRef);
      if (roleSnap.exists()) {
        const roleData = roleSnap.data();
        Object.keys(roleData).forEach(key => {
          if (key.startsWith('Assigned Host') || key.startsWith('Assigned host')) {
            if (!(key in updateData)) {
              updateData[key] = deleteField();
            }
          }
        });
      }
    } catch (e) {}

    batchUpdate.set(roleRef, updateData, { merge: true });
    await batchUpdate.commit();
  },

  async syncHostManagerRelationship(hostId: string, newManagerId: string | null): Promise<void> {
    const hostUserRef = doc(db, 'users', hostId);
    
    // 1. Fetch current host document to find old manager
    let oldManagerId: string | null = null;
    try {
      const hostSnap = await getDoc(hostUserRef);
      if (hostSnap.exists()) {
        const hostData = hostSnap.data();
        oldManagerId = hostData?.assignedManagerId || hostData?.assigned_manager_poppo_id || null;
      }
    } catch (e) {
      console.warn("Could not fetch current host to determine old manager:", e);
    }

    // 2. Fetch new manager's info to get name for host document update
    let newManagerName = '';
    if (newManagerId) {
      try {
        const newManagerUserRef = doc(db, 'users', newManagerId);
        const newManagerUserSnap = await getDoc(newManagerUserRef);
        if (newManagerUserSnap.exists()) {
          const mgrData = newManagerUserSnap.data();
          newManagerName = mgrData?.nickname || mgrData?.name || '';
        }
      } catch (e) {
        console.error(`Failed to fetch new manager name ${newManagerId}:`, e);
      }
    }

    // 3. Update host documents across users, host, and hosts collections
    const hostFieldsToUpdate = {
      manager: newManagerName || null,
      assigned_manager: newManagerName || null,
      assigned_manager_nickname: newManagerName || null,
      assigned_manager_poppo_id: newManagerId || null,
      assignedManagerId: newManagerId || null,
      updated_at: new Date().toISOString()
    };

    const hostBatch = writeBatch(db);
    hostBatch.set(hostUserRef, hostFieldsToUpdate, { merge: true });
    for (const col of ['host', 'hosts']) {
      try {
        const ref = doc(db, col, hostId);
        hostBatch.set(ref, hostFieldsToUpdate, { merge: true });
      } catch (e) {}
    }
    await hostBatch.commit();

    // 4. Update the new manager's assignedHosts and "Assigned Host X" fields
    if (newManagerId) {
      await this.updateManagerHostFields(newManagerId, hostId, null);
    }

    // 5. Update the old manager's assignedHosts and "Assigned Host X" fields
    if (oldManagerId && oldManagerId !== newManagerId) {
      await this.updateManagerHostFields(oldManagerId, null, hostId);
    }
  },

  async updateHost(host: Host, oldRole?: string) {
    const poppoId = host.id;
    const path = `users/${poppoId}`;
    try {
      const managerName = host.manager || host.assigned_manager_nickname || host.assigned_manager || '';
      const managerId = host.assignedManagerId || host.assigned_manager_poppo_id || '';
      const teamName = host.team || host.team_anchor || '';
      const salaryCategory = host.base_salary_category || host.tier_pay || '';

      const updateData = {
        ...host,
        poppo_id: poppoId,
        nickname: host.nickname || host.name,
        manager: managerName,
        assigned_manager: managerName,
        assigned_manager_nickname: managerName,
        assigned_manager_poppo_id: managerId || null,
        assignedManagerId: managerId || null,
        team: teamName,
        team_anchor: teamName,
        base_salary_category: salaryCategory,
        tier_pay: salaryCategory,
        updated_at: new Date().toISOString()
      };

      const getSafeRoleCollection = (r: string) => {
        const norm = String(r || 'host').toLowerCase();
        if (norm === 'talent' || norm === 'host') return 'host';
        if (norm === 'head admin' || norm === 'head_admin') return 'head_admin';
        return norm; // 'manager', 'admin', 'agent', 'director'
      };

      const newRoleCol = getSafeRoleCollection(host.role);
      
      // If oldRole is provided and has changed, delete the old role document
      if (oldRole) {
        const oldRoleCol = getSafeRoleCollection(oldRole);
        if (oldRoleCol !== newRoleCol) {
          try {
            await deleteDoc(doc(db, oldRoleCol, poppoId));
          } catch (e) {
            console.warn(`Could not delete old role document from ${oldRoleCol} for ${poppoId}`);
          }
        }
      }

      // Write to new/current role collection
      const roleDocRef = doc(db, newRoleCol, poppoId);
      await setDoc(roleDocRef, updateData, { merge: true });

      // If host, also write to legacy 'hosts' collection
      if (newRoleCol === 'host') {
        try {
          const hostsDocRef = doc(db, 'hosts', poppoId);
          await setDoc(hostsDocRef, updateData, { merge: true });
        } catch (e) {}
      }

      // Write to users collection
      const userDocRef = doc(db, 'users', poppoId);
      await setDoc(userDocRef, updateData, { merge: true });

      // Sync manager relationships if host
      if (newRoleCol === 'host') {
        await this.syncHostManagerRelationship(poppoId, host.assignedManagerId || null);
      }
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
          const managerName = data.manager || data.assigned_manager_nickname || data.assigned_manager || 'Nine Management';
          const managerId = data.assignedManagerId || data.assigned_manager_poppo_id || null;
          const teamName = data.team || data.team_anchor || 'Unassigned';
          const salaryCategory = data.base_salary_category || data.tier_pay || 'Regular Host';
          return { 
            ...data, 
            id: d.id, 
            poppo_id: d.id,
            name: data.nickname || data.name || 'Unknown',
            nickname: data.nickname || data.name || 'Unknown',
            manager: managerName,
            team: teamName,
            base_salary_category: salaryCategory,
            assignedManagerId: managerId,
            assigned_manager_nickname: managerName,
            assigned_manager_poppo_id: managerId,
            team_anchor: teamName,
            tier_pay: salaryCategory,
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

  async getPublicCalendarEvents(): Promise<EventsCalendarPublic[]> {
    const path = 'attendance';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EventsCalendarPublic));
    } catch (error) {
      console.warn('[FirebaseService] getPublicCalendarEvents failed:', error);
      return [];
    }
  },

  async getAwards(hostId: string): Promise<any[]> {
    try {
      // Try host/{id}/agency_awards subcollection first
      const subSnap = await getDocs(collection(db, 'host', hostId, 'agency_awards'));
      if (!subSnap.empty) {
        return subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      // Fallback: top-level agency_awards where poppoId == hostId
      const topSnap = await getDocs(
        query(collection(db, 'agency_awards'), where('poppoId', '==', hostId))
      );
      return topSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.warn('[FirebaseService] getAwards failed for', hostId, error);
      return [];
    }
  },

  async getFanbaseHealth(hostId: string): Promise<FanbaseHealthEntry[]> {
    try {
      const snap = await getDocs(collection(db, 'host', hostId, 'fanbase_report'));
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as FanbaseHealthEntry));
      }
      const fallback = await getDocs(
        query(collection(db, 'fanbase_health'), where('poppo_id', '==', hostId))
      );
      return fallback.docs.map(d => d.data() as FanbaseHealthEntry);
    } catch (error) {
      console.warn('[FirebaseService] getFanbaseHealth failed for', hostId, error);
      return [];
    }
  },

  async getExposures(hostId: string): Promise<ExposureEntry[]> {
    try {
      const snap = await getDocs(
        query(collection(db, 'exposures'), where('poppo_id', '==', hostId))
      );
      return snap.docs.map(d => d.data() as ExposureEntry);
    } catch (error) {
      console.warn('[FirebaseService] getExposures failed for', hostId, error);
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
    const path = 'performance_reports';
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

  /**
   * Fetch all performance_reports documents.
   * Doc ID format: {poppoId}_{MonthName}_{Year} e.g. 19157913_March_2025
   * Falls back to reading poppoId field if present in the document.
   */
  async getAllPerformanceReports(): Promise<any[]> {
    const path = 'performance_reports';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        // Parse poppoId from doc ID: format is {poppoId}_{MonthName}_{Year}
        const parts = docSnap.id.split('_');
        const poppoIdFromId = parts[0] || '';
        // Also try to get month/year from doc ID if not in data
        const monthNameFromId = parts[1] || '';
        const yearFromId = parts[2] ? parseInt(parts[2]) : 0;

        const MONTH_MAP: Record<string,number> = {
          January:1,February:2,March:3,April:4,May:5,June:6,
          July:7,August:8,September:9,October:10,November:11,December:12
        };

        return {
          docId: docSnap.id,
          ...data,
          // Prefer fields in the doc, fallback to parsed from doc ID
          poppoId: data.poppoId || poppoIdFromId,
          monthName: data.monthName || monthNameFromId,
          month: data.month || MONTH_MAP[monthNameFromId] || 0,
          year: data.year || yearFromId,
        };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async logSystemActivity(actionDescription: string, severity: 'Info' | 'Warning' | 'Error' = 'Info') {
    try {
      const authState = Storage.getAuthState();
      const logEntry = {
        timestamp: new Date().toISOString(),
        severity,
        actionDescription,
        userId: authState?.poppo_id || authState?.poppoId || 'System',
        userRole: authState?.role || 'System',
        stackTrace: ''
      };
      const newDocRef = doc(collection(db, 'system_logs'));
      await setDoc(newDocRef, logEntry);
    } catch (error) {
      console.error('[FirebaseService] logSystemActivity failed:', error);
    }
  }
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

export const deleteUser = async (
  poppoId: string,
  role: string
): Promise<void> => {
  const getSafeRoleCollection = (r: string) => {
    const norm = String(r || 'host').toLowerCase();
    if (norm === 'talent' || norm === 'host') return 'host';
    if (norm === 'head admin' || norm === 'head_admin') return 'head_admin';
    return norm;
  };
  const safeRole = getSafeRoleCollection(role);
  await deleteDoc(doc(db, 'users', poppoId));
  await deleteDoc(doc(db, safeRole, poppoId));
  if (safeRole === 'host') {
    try {
      await deleteDoc(doc(db, 'hosts', poppoId));
    } catch (e) {}
  }
};
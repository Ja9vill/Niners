import { auth, db, storage } from './firebase';
import { ref, uploadString, getBytes, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Storage } from './storage';
<<<<<<< HEAD
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, writeBatch, Timestamp, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { CommissionEntry, Host, PKEntry, ExposureEntry, FanbaseHealthEntry, WeeklyLiveDataEntry, MonthlyLiveDataEntry, TopNinersEarningsSummary, EventsCalendarPublic, ReportingSubmission, Task, ActivityAuditLog, CalendarEvent, LivehouseRequest, AwardBadge, AwardAssignment } from '../types';
=======
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, writeBatch, Timestamp, onSnapshot, updateDoc, arrayUnion, arrayRemove, deleteField } from 'firebase/firestore';
import { CommissionEntry, Host, PKEntry, ExposureEntry, FanbaseHealthEntry, WeeklyLiveDataEntry, MonthlyLiveDataEntry, TopNinersEarningsSummary, EventsCalendarPublic, Task, ActivityAuditLog, CalendarEvent, LivehouseRequest, AwardBadge, AwardAssignment, ManagerNote } from '../types';
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93

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

export const normalizeRoleTypography = (r: string): string => {
  const norm = String(r || '').trim().toLowerCase();
  if (norm === 'host' || norm === 'talent') return 'Host';
  if (norm === 'admin') return 'Admin';
  if (norm === 'manager') return 'Manager';
  if (norm === 'agent') return 'Agent';
  if (norm === 'head admin' || norm === 'head_admin') return 'Head Admin';
  if (norm === 'director') return 'Director';
  return r.split(/[\s_-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

export const getSafeRoleCollection = (r: string): string => {
  const norm = String(r || '').trim().toLowerCase();
  if (norm === 'host' || norm === 'talent') return 'host';
  if (norm === 'admin') return 'admin';
  if (norm === 'manager') return 'manager';
  if (norm === 'agent') return 'agent';
  if (norm === 'head admin' || norm === 'head_admin') return 'head_admin';
  if (norm === 'director') return 'director';
  return 'host';
};

export const sanitizeDocumentByRole = (docData: any, role: string): any => {
  const cleanData = { ...docData };
  const normRole = normalizeRoleTypography(role);

  // Enforce normalized role field inside the document
  cleanData.role = normRole;

  // Rule 1: The field 'tier' (and base_salary_category, tierPay) is merged into tier_pay and permanently deleted
  const rawTier = cleanData.tier_pay ?? cleanData.tierPay ?? cleanData.base_salary_category ?? cleanData.baseSalaryCategory ?? cleanData.tier;
  if (rawTier !== undefined) {
    cleanData.tier_pay = rawTier;
  }
  delete cleanData.tier;
  delete cleanData.tierPay;
  delete cleanData.base_salary_category;
  delete cleanData.baseSalaryCategory;
  delete cleanData.salaryCategory;

  // Rule 2: Merge team, team_anchor, teamAnchor, teamGroup, team_group, group, etc. into teamAnchor and delete others
  const rawTeamAnchor = cleanData.teamAnchor ?? cleanData.team_anchor ?? cleanData.team ?? cleanData.teamGroup ?? cleanData.team_group ?? cleanData.group;
  if (rawTeamAnchor !== undefined) {
    cleanData.teamAnchor = rawTeamAnchor;
  }
  delete cleanData.team;
  delete cleanData.team_anchor;
  delete cleanData.teamGroup;
  delete cleanData.team_group;
  delete cleanData.group;



  // Rule 3: Only role 'host' has assigned_manager_poppo_id
  if (normRole !== 'Host') {
    delete cleanData.assigned_manager_poppo_id;
    delete cleanData.assignedManagerId;
    delete cleanData.manager;
    delete cleanData.assigned_manager;
    delete cleanData.assigned_manager_nickname;
  }

  // Rule 4: Only roles 'manager' and 'agent' have assignedHosts
  if (normRole !== 'Manager' && normRole !== 'Agent') {
    delete cleanData.assignedHosts;
    Object.keys(cleanData).forEach(key => {
      if (key.match(/^assigned\s*host/i)) {
        delete cleanData[key];
      }
    });
  }

  return cleanData;
};

export const sanitizeUserAuthDoc = (docData: any, id: string): any => {
  const userAuthData: any = {};
  const poppoId = docData.poppo_id || docData.id || id;
  if (poppoId) {
    userAuthData.poppo_id = poppoId;
    userAuthData.id = poppoId;
  }
  if (docData.role) {
    userAuthData.role = normalizeRoleTypography(docData.role);
  }
  const nickname = docData.nickname || docData.name || '';
  if (nickname) {
    userAuthData.nickname = nickname;
  }
  const authKeys = [
    'password',
    'googleUid',
    'is_temp_password',
    'last_login',
    'isActive',
    'updated_at',
    'email',
    'teamAnchor',
    'team',
    'team_anchor',
    'manager',
    'assignedManagerId',
    'assigned_manager',
    'assigned_manager_nickname',
    'assigned_manager_poppo_id',
    'status',
    'level'
  ];
  authKeys.forEach(k => {
    if (docData[k] !== undefined) {
      userAuthData[k] = docData[k];
    }
  });
  return userAuthData;
};

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
      const sanitized = sanitizeUserAuthDoc({ ...data, id: poppoId }, poppoId);
      await setDoc(docRef, { ...sanitized, updated_at: new Date().toISOString() }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async updateRoleMetadata(role: string, id: string, data: any): Promise<void> {
    try {
      if (!id) throw new Error("ID is required for role metadata updates.");
      
      const normRole = normalizeRoleTypography(role || data.role || 'Host');
      const safeRole = getSafeRoleCollection(normRole);
      
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
      const teamAnchorVal = data.teamAnchor || data.team || data.team_anchor || data.teamGroup || data.team_group || data.group || '';

      if (managerName) {
        normalizedData.manager = managerName;
        normalizedData.assigned_manager = managerName;
        normalizedData.assigned_manager_nickname = managerName;
      }
      if (managerId) {
        normalizedData.assignedManagerId = managerId;
        normalizedData.assigned_manager_poppo_id = managerId;
      }
      if (teamAnchorVal) {
        normalizedData.teamAnchor = teamAnchorVal;
        normalizedData.team = teamAnchorVal;
        normalizedData.team_anchor = teamAnchorVal;
      }

      const roleRef = doc(db, safeRole, id);
      const userRef = doc(db, 'users', id);
      
      const baseData = { ...normalizedData, updated_at: new Date().toISOString() };
      
      // Sanitize for Role collection
      const finalRoleData = sanitizeDocumentByRole(baseData, normRole);

      // Sanitize for Users collection
      const finalUserData = sanitizeUserAuthDoc(baseData, id);

      // Attempt to update the users collection first as the source of truth
      try {
        if (Object.keys(finalUserData).length > 0) {
          await setDoc(userRef, finalUserData, { merge: true });
        }
      } catch (e: any) {
         console.warn(`[UPDATE] Could not update 'users' collection for ID: ${id}: ${e.message}`);
      }

      // Update role collection
      await setDoc(roleRef, finalRoleData, { merge: true });
      console.log(`[UPDATE] Role metadata updated for ${id} in ${safeRole}`);

      if (managerIdToSync !== undefined && normRole === 'Host') {
        await this.syncHostManagerRelationship(id, managerIdToSync);
      }
    } catch (error: any) {
      console.error(`[UPDATE] Role metadata error for ID: ${id}`, error);
      handleFirestoreError(error, OperationType.UPDATE, `role_metadata/${id}`);
    }
  },


  async getAwards(): Promise<AwardBadge[]> {
    try {
      const snap = await getDocs(collection(db, 'awards'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AwardBadge));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'awards');
      return [];
    }
  },
  async saveAwards(awards: AwardBadge[]) {
    try {
      const batch = writeBatch(db);
      awards.forEach(a => batch.set(doc(db, 'awards', a.id), a, { merge: true }));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'awards');
      throw error;
    }
  },
  async getAwardAssignments(): Promise<AwardAssignment[]> {
    try {
      const snap = await getDocs(collection(db, 'award_assignments'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as AwardAssignment));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'award_assignments');
      return [];
    }
  },
  async saveAwardAssignments(assignments: AwardAssignment[]) {
    try {
      const batch = writeBatch(db);
      assignments.forEach(a => batch.set(doc(db, 'award_assignments', a.id), a, { merge: true }));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'award_assignments');
    }
  },
  async deleteAwardAssignment(id: string) {
    try {
      await deleteDoc(doc(db, 'award_assignments', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `award_assignments/${id}`);
    }
  },
  async getLivehouses(): Promise<LivehouseRequest[]> {
    try {
      const snap = await getDocs(collection(db, 'livehouse_requests'));
      return snap.docs.map(d => d.data() as LivehouseRequest);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'livehouse_requests');
      return [];
    }
  },
  async saveLivehouses(requests: LivehouseRequest[]) {
    try {
      const batch = writeBatch(db);
      requests.forEach(r => batch.set(doc(db, 'livehouse_requests', r.id), r, { merge: true }));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'livehouse_requests');
    }
  },
  async updateLivehouseStatus(id: string, status: string) {
    try {
      await updateDoc(doc(db, 'livehouse_requests', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `livehouse_requests/${id}`);
    }
  },
  async getManagerNotes(): Promise<ManagerNote[]> {
    try {
      const snap = await getDocs(collection(db, 'manager_notes'));
      return snap.docs.map(d => d.data() as ManagerNote);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'manager_notes');
      return [];
    }
  },

  async uploadProfilePhoto(file: File, id: string, name: string, role: string): Promise<string> {
    try {
      if (!file || !id) throw new Error("File and ID are required.");
      
      const cleanName = (name || id).replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
      const fileName = `${cleanName}-${id}.jpg`; // Always save as jpg after compression

      // Compress image using canvas before uploading (reduces payload from ~5MB to ~100KB)
      // Embed and fit the image inside a 1080x1080px square box (maintaining original aspect ratio)
      const compressedBase64 = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 1080;
          canvas.height = 1080;
          const ctx = canvas.getContext('2d')!;
          
          // Fill background with theme color #0D0D14
          ctx.fillStyle = '#0D0D14';
          ctx.fillRect(0, 0, 1080, 1080);
          
          // Calculate scale to fit original image entirely inside the 1080x1080 square box
          const scale = Math.min(1080 / img.width, 1080 / img.height);
          const drawWidth = img.width * scale;
          const drawHeight = img.height * scale;
          const x = (1080 - drawWidth) / 2;
          const y = (1080 - drawHeight) / 2;

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, img.width, img.height, x, y, drawWidth, drawHeight);
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
    let metadataMap: Record<string, any> = {};
    let errors: string[] = [];

    // 1. Fetch from 'users' (auth data)
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.docs.forEach(d => {
        const id = d.id;
        const data = d.data();
        const normRole = normalizeRoleTypography(data.role || 'Host');
        metadataMap[id] = {
          id,
          poppo_id: id,
          ...data,
          role: normRole
        };
      });
    } catch (error: any) {
      console.warn("Could not fetch users collection:", error);
      errors.push(`users: ${error.message}`);
    }

    // 2. Fetch from specific role collections and merge
    const roleCols = ['host', 'manager', 'admin', 'head_admin', 'agent', 'director'];
    for (const col of roleCols) {
      try {
        const snapshot = await getDocs(collection(db, col));
        snapshot.docs.forEach(d => {
          const id = d.id;
          const data = d.data();
          
          // Merge data, keeping the auth fields from users if already present
          metadataMap[id] = {
            ...data,
            ...metadataMap[id],
            id,
            poppo_id: id
          };

          const normRole = normalizeRoleTypography(metadataMap[id].role || col);
          metadataMap[id] = sanitizeDocumentByRole(metadataMap[id], normRole);
        });
      } catch (error: any) {
        console.warn(`Could not fetch metadata for role collection: ${col}`, error);
        errors.push(`${col}: ${error.message}`);
      }
    }
    
    const allMetadata = Object.values(metadataMap).map(item => {
      const data = item as any;
      const managerName = data.manager || data.assigned_manager_nickname || data.assigned_manager || 'Nine Management';
      const managerId = data.assignedManagerId || data.assigned_manager_poppo_id || null;
      const teamName = data.teamAnchor || data.team || data.team_anchor || data.teamGroup || data.team_group || data.group || 'Unassigned';
      const tierPayVal = data.tier_pay || data.tierPay || data.base_salary_category || 'Regular Host';
      return {
        ...data,
        id: data.id || data.poppo_id,
        name: data.nickname || data.name || 'Unknown',
        nickname: data.nickname || data.name || 'Unknown',
        manager: managerName,
        team: teamName,
        assignedManagerId: managerId,
        assigned_manager_nickname: managerName,
        assigned_manager_poppo_id: managerId,
        team_anchor: teamName,
        teamAnchor: teamName,
        tier_pay: tierPayVal
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
<<<<<<< HEAD
    const path = 'host';
=======
    const path = 'users';
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
    try {
      const batch = writeBatch(db);
      hosts.forEach(h => {
        const baseData = { ...h, updated_at: new Date().toISOString() };
        const normRole = normalizeRoleTypography(h.role || 'Host');
        const roleCol = getSafeRoleCollection(normRole);

        // Extract only UserAuth fields for users collection
        const userAuthData = sanitizeUserAuthDoc(baseData, h.id);

        // Sanitize for Role collection
        const finalRoleData = sanitizeDocumentByRole(baseData, normRole);

        // Write auth info to users
        if (Object.keys(userAuthData).length > 0) {
          const userRef = doc(db, 'users', h.id);
          batch.set(userRef, userAuthData, { merge: true });
        }

        // Write full profile info to role collection
        const roleRef = doc(db, roleCol, h.id);
        batch.set(roleRef, finalRoleData, { merge: true });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

<<<<<<< HEAD
  async syncHostManagerRelationship(hostId: string, newManagerId: string | null): Promise<void> {
    const hostUserRef = doc(db, 'users', hostId);
    const hostHostsRef = doc(db, 'host', hostId);
    
    // 1. Fetch current host document to find old manager
    let oldManagerId: string | null = null;
    try {
      const hostSnap = await getDoc(hostUserRef);
      if (hostSnap.exists()) {
        const hostData = hostSnap.data();
        oldManagerId = hostData?.assignedManagerId || hostData?.assigned_manager_poppo_id || null;
      } else {
        const hostHostsSnap = await getDoc(hostHostsRef);
        if (hostHostsSnap.exists()) {
          const hostData = hostHostsSnap.data();
          oldManagerId = hostData?.assignedManagerId || hostData?.assigned_manager_poppo_id || null;
        }
=======
  async updateManagerHostFields(managerId: string, hostIdToAdd: string | null, hostIdToRemove: string | null, forceHosts?: string[]): Promise<void> {
    // Get current manager data from role collection first, since it contains the profile fields
    const normRoleCol = 'manager';
    let managerRef = doc(db, 'manager', managerId);
    let managerSnap = await getDoc(managerRef);
    let currentRole = 'manager';
    if (!managerSnap.exists()) {
      // Try agent collection
      managerRef = doc(db, 'agent', managerId);
      managerSnap = await getDoc(managerRef);
      currentRole = 'agent';
      if (!managerSnap.exists()) {
        // Fallback to check users collection
        const userRef = doc(db, 'users', managerId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return;
        const uRole = String(userSnap.data()?.role || '').toLowerCase();
        currentRole = uRole === 'agent' ? 'agent' : 'manager';
        managerRef = doc(db, currentRole, managerId);
        managerSnap = await getDoc(managerRef);
      }
    }

    const mgrData = managerSnap.exists() ? managerSnap.data() : {};
    
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
    if (mgrData) {
      Object.keys(mgrData).forEach(key => {
        if (key.startsWith('Assigned Host') || key.startsWith('Assigned host')) {
          updateData[key] = deleteField();
        }
      });
    }

    // Generate new "Assigned Host X" fields
    assignedHosts.forEach((hId, index) => {
      updateData[`Assigned Host ${index + 1}`] = hId;
    });

    // Update only the specific role collection (users collection only keeps credentials, not assignments)
    const batchUpdate = writeBatch(db);
    batchUpdate.set(managerRef, updateData, { merge: true });
    
    // Make sure we also update updated_at in users
    const userUserRef = doc(db, 'users', managerId);
    batchUpdate.set(userUserRef, { updated_at: new Date().toISOString() }, { merge: true });

    await batchUpdate.commit();
  },

  async syncHostManagerRelationship(hostId: string, newManagerId: string | null): Promise<void> {
    const hostUserRef = doc(db, 'users', hostId);
    
    // 1. Fetch current host document from 'host' collection to find old manager
    let oldManagerId: string | null = null;
    try {
      const hostSnap = await getDoc(doc(db, 'host', hostId));
      if (hostSnap.exists()) {
        const hostData = hostSnap.data();
        oldManagerId = hostData?.assignedManagerId || hostData?.assigned_manager_poppo_id || null;
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
      }
    } catch (e) {
      console.warn("Could not fetch current host to determine old manager:", e);
    }

<<<<<<< HEAD
    if (oldManagerId === newManagerId) {
      return;
    }

    const batch = writeBatch(db);

    // Ensure host document in both users and hosts collections has the correct assignedManagerId
    try {
      const snap = await getDoc(hostUserRef);
      if (snap.exists()) {
        batch.update(hostUserRef, { assignedManagerId: newManagerId });
      }
    } catch (e) {}
    try {
      const snap = await getDoc(hostHostsRef);
      if (snap.exists()) {
        batch.update(hostHostsRef, { assignedManagerId: newManagerId });
      }
    } catch (e) {}

    // Ensure new manager document in both users and hosts collections has hostId in assignedHosts
    if (newManagerId) {
      const newManagerUserRef = doc(db, 'users', newManagerId);
      const newManagerHostsRef = doc(db, 'host', newManagerId);
      try {
        const snap = await getDoc(newManagerUserRef);
        if (snap.exists()) {
          batch.update(newManagerUserRef, { assignedHosts: arrayUnion(hostId) });
        }
      } catch (e) {}
      try {
        const snap = await getDoc(newManagerHostsRef);
        if (snap.exists()) {
          batch.update(newManagerHostsRef, { assignedHosts: arrayUnion(hostId) });
        }
      } catch (e) {}
    }

    // Ensure old manager document has hostId removed from assignedHosts
    if (oldManagerId) {
      const oldManagerUserRef = doc(db, 'users', oldManagerId);
      const oldManagerHostsRef = doc(db, 'host', oldManagerId);
      try {
        const snap = await getDoc(oldManagerUserRef);
        if (snap.exists()) {
          batch.update(oldManagerUserRef, { assignedHosts: arrayRemove(hostId) });
        }
      } catch (e) {}
      try {
        const snap = await getDoc(oldManagerHostsRef);
        if (snap.exists()) {
          batch.update(oldManagerHostsRef, { assignedHosts: arrayRemove(hostId) });
        }
      } catch (e) {}
    }

    await batch.commit();
  },

  async updateHost(host: Host) {
    const path = `host/${host.id}`;
    try {
      const managerName = host.manager || host.assigned_manager_nickname || host.assigned_manager || '';
      const managerId = host.assignedManagerId || host.assigned_manager_poppo_id || '';
      const teamName = host.team || host.team_anchor || '';
      const salaryCategory = host.base_salary_category || host.tier_pay || '';

      const updateData = {
        ...host,
        poppo_id: host.id,
=======
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

    // 3. Update host documents across users and host collections (omit legacy hosts)
    const hostFieldsToUpdate = {
      manager: newManagerName || null,
      assigned_manager: newManagerName || null,
      assigned_manager_nickname: newManagerName || null,
      assigned_manager_poppo_id: newManagerId || null,
      assignedManagerId: newManagerId || null,
      updated_at: new Date().toISOString()
    };

    const hostBatch = writeBatch(db);
    
    // Users collection only gets updated_at (it is auth only, no manager fields)
    hostBatch.set(hostUserRef, { updated_at: hostFieldsToUpdate.updated_at }, { merge: true });
    
    // Host collection gets full manager sync fields
    const hostRoleRef = doc(db, 'host', hostId);
    hostBatch.set(hostRoleRef, hostFieldsToUpdate, { merge: true });

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
      const managerName = host.manager || (host as any).assigned_manager_nickname || (host as any).assigned_manager || '';
      const managerId = (host as any).assignedManagerId || host.assigned_manager_poppo_id || '';
      const teamName = host.teamAnchor || host.team || host.team_anchor || '';

      const baseData = {
        ...host,
        poppo_id: poppoId,
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
        nickname: host.nickname || host.name,
        manager: managerName,
        assigned_manager: managerName,
        assigned_manager_nickname: managerName,
        assigned_manager_poppo_id: managerId || null,
        assignedManagerId: managerId || null,
        team: teamName,
        team_anchor: teamName,
<<<<<<< HEAD
        base_salary_category: salaryCategory,
        tier_pay: salaryCategory,
        updated_at: new Date().toISOString()
      };
      
      const hostDocRef = doc(db, 'host', host.id);
      await setDoc(hostDocRef, updateData, { merge: true });
      
      try {
        const userDocRef = doc(db, 'users', host.id);
        await setDoc(userDocRef, updateData, { merge: true });
      } catch (userErr) {
        console.warn(`[UPDATE] Could not sync user authentication document for ${host.id}:`, userErr);
      }
      
      await this.syncHostManagerRelationship(host.id, host.assignedManagerId || null);
=======
        teamAnchor: teamName,
        updated_at: new Date().toISOString()
      };

      const normRole = normalizeRoleTypography(host.role);
      const newRoleCol = getSafeRoleCollection(normRole);
      
      // If oldRole is provided and has changed, delete the old role document
      if (oldRole) {
        const oldNormRole = normalizeRoleTypography(oldRole);
        const oldRoleCol = getSafeRoleCollection(oldNormRole);
        if (oldRoleCol !== newRoleCol) {
          try {
            await deleteDoc(doc(db, oldRoleCol, poppoId));
          } catch (e) {
            console.warn(`Could not delete old role document from ${oldRoleCol} for ${poppoId}`);
          }
        }
      }

      // Sanitize for Role collection
      const finalRoleData = sanitizeDocumentByRole(baseData, normRole);

      // Write to new/current role collection
      const roleDocRef = doc(db, newRoleCol, poppoId);
      await setDoc(roleDocRef, finalRoleData, { merge: true });

      // Sanitize for Users collection
      const userAuthData = sanitizeUserAuthDoc(baseData, poppoId);

      // Write to users collection
      const userDocRef = doc(db, 'users', poppoId);
      if (Object.keys(userAuthData).length > 0) {
        await setDoc(userDocRef, userAuthData, { merge: true });
      }

      // Sync manager relationships if host
      if (newRoleCol === 'host') {
        await this.syncHostManagerRelationship(poppoId, (host as any).assignedManagerId || host.assigned_manager_poppo_id || null);
      }
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteHost(hostId: string) {
    const path = `host/${hostId}`;
    try {
<<<<<<< HEAD
      await deleteDoc(doc(db, 'host', hostId));
=======
      await deleteDoc(doc(db, 'users', hostId));
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async getAllHosts(): Promise<Host[]> {
<<<<<<< HEAD
    const path = 'host';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => {
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
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
=======
    return this.getAllRoleMetadata();
  },
  async getHosts(): Promise<Host[]> {
    return this.getAllRoleMetadata();
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
  },
  
  // *** User credentials retrieval ***
  async getUserCredentials(): Promise<{ poppo_id: string; password?: string }[]> {
<<<<<<< HEAD
    const path = 'host';
=======
    const path = 'users';
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
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

  // Performance Reports Management
  async saveCommissions(commissions: CommissionEntry[]) {
    const path = 'performance_reports';
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
    const path = 'performance_reports';
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
    const path = 'performance_reports';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => d.data() as CommissionEntry);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async deleteCommissionsByMonth(month: string) {
    const path = `performance_reports/${month}`;
    try {
      const q = query(collection(db, 'performance_reports'), where('month', '==', month));
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
    const path = `performance_reports/${poppoId}_${month}`;
    try {
      await deleteDoc(doc(db, 'performance_reports', `${poppoId}_${month}`));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Agent-Specific Team Financials
  async saveAgentCommissions(commissions: CommissionEntry[], agentId: string, isWeekly: boolean = false) {
    const collectionName = isWeekly ? 'agent_financials_weekly' : 'agent_financials_monthly';
    try {
      const batch = writeBatch(db);
      commissions.forEach(c => {
        const id = isWeekly ? `${c.poppo_id}_${c.from_date}_${c.to_date}` : `${c.poppo_id}_${c.month}`;
        const docRef = doc(db, collectionName, id);
        batch.set(docRef, { ...c, agentId });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, collectionName);
    }
  },

  async getAgentCommissions(agentId: string, isWeekly: boolean = false): Promise<CommissionEntry[]> {
    const collectionName = isWeekly ? 'agent_financials_weekly' : 'agent_financials_monthly';
    try {
      const q = query(collection(db, collectionName), where('agentId', '==', agentId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => d.data() as CommissionEntry);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, collectionName);
      return [];
    }
  },

  async deleteAgentCommission(poppoId: string, dateKey: string, agentId: string, isWeekly: boolean = false) {
    const collectionName = isWeekly ? 'agent_financials_weekly' : 'agent_financials_monthly';
    const path = `${collectionName}/${poppoId}_${dateKey}`;
    try {
      // Security check could be handled by rules, but we explicitly use the known ID
      await deleteDoc(doc(db, collectionName, `${poppoId}_${dateKey}`));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async updateCommission(commission: CommissionEntry) {
    const path = `performance_reports/${commission.poppo_id}_${commission.month}`;
    try {
      const docRef = doc(db, 'performance_reports', `${commission.poppo_id}_${commission.month}`);
      await setDoc(docRef, commission, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Reporting & Other entities
  async savePKRecords(records: PKEntry[]) {
    const path = 'pk_reports';
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
    const path = 'fanbase_reports';
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

  async getHostAwards(hostId: string): Promise<any[]> {
    if (!hostId) return [];
    try {
      let legacyAwards: any[] = [];
      try {
        // Try host/{id}/host_awards subcollection first
        const subSnap = await getDocs(collection(db, 'host', hostId, 'host_awards'));
        if (!subSnap.empty) {
          legacyAwards = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } else {
          // Fallback: top-level host_awards where poppoId == hostId
          const topSnap = await getDocs(
            query(collection(db, 'host_awards'), where('poppoId', '==', hostId))
          );
          legacyAwards = topSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      } catch (err) {
        console.warn('[FirebaseService] Failed to load legacy awards from subcollection/fallback for', hostId, err);
        // Fallback to top-level host_awards just in case the subcollection query failed due to permission or other errors
        try {
          const topSnap = await getDocs(
            query(collection(db, 'host_awards'), where('poppoId', '==', hostId))
          );
          legacyAwards = topSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (err2) {
          console.warn('[FirebaseService] Fallback top-level host_awards load failed for', hostId, err2);
        }
      }

      let assignedAwards: any[] = [];
      try {
        // Also get from award_assignments where hostId == hostId
        const assignSnap = await getDocs(
          query(collection(db, 'award_assignments'), where('hostId', '==', hostId))
        );
        assignedAwards = assignSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            title: data.awardName,
            description: `Effectivity Period: ${data.startDate} to ${data.endDate}`,
            dateAwarded: data.startDate || data.assignedAt,
            awardedAt: data.assignedAt,
            color: data.awardColor,
            ...data
          };
        });
      } catch (err) {
        console.warn('[FirebaseService] Failed to load award_assignments for', hostId, err);
      }

      // Combine and deduplicate by ID
      const allAwards = [...legacyAwards, ...assignedAwards];
      const seen = new Set<string>();
      return allAwards.filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
    } catch (error) {
      console.warn('[FirebaseService] getHostAwards failed for', hostId, error);
      return [];
    }
  },

  async assignAward(hostId: string, awardData: any): Promise<void> {
    try {
      // We will write to the top-level host_awards collection
      const awardId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      const awardRef = doc(db, 'host_awards', awardId);
      await setDoc(awardRef, {
        ...awardData,
        poppoId: hostId,
        hostId: hostId,
        awardedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('[FirebaseService] assignAward failed', error);
      throw error;
    }
  },

  async getFanbaseHealth(hostId: string): Promise<FanbaseHealthEntry[]> {
    try {
      const snap = await getDocs(collection(db, 'host', hostId, 'fanbase_report'));
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as FanbaseHealthEntry));
      }
      const fallback = await getDocs(
        query(collection(db, 'fanbase_reports'), where('poppo_id', '==', hostId))
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
        query(collection(db, 'calendar'), where('participants_id', 'array-contains', hostId))
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
<<<<<<< HEAD
    const path = 'host';
=======
    const path = 'users';
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
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
    const path = `host/${poppoId}`;
    try {
<<<<<<< HEAD
      const docRef = doc(db, 'host', poppoId);
=======
      const docRef = doc(db, 'users', poppoId);
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
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

<<<<<<< HEAD
  // Hosts alias (some callers use getHosts, others use getAllHosts)
  async getHosts(): Promise<Host[]> {
    return this.getAllHosts();
  },

  // Awards (badges) management
  async getAwards(): Promise<AwardBadge[]> {
    const path = 'awards';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AwardBadge));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async saveAwards(awards: AwardBadge[]): Promise<void> {
    const path = 'awards';
    try {
      const batch = writeBatch(db);
      awards.forEach(a => {
        const docRef = doc(db, path, a.id);
        batch.set(docRef, a);
=======
  async savePerformanceReport(data: any[]): Promise<void> {
    const path = 'performance_reports';
    try {
      const batch = writeBatch(db);
      data.forEach(r => {
        const id = `${r.poppo_id}_${r.from_date || ''}_${r.to_date || ''}`;
        const docRef = doc(db, path, id);
        batch.set(docRef, r, { merge: true });
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

<<<<<<< HEAD
  async deleteAward(awardId: string): Promise<void> {
    const path = `awards/${awardId}`;
    try {
      await deleteDoc(doc(db, 'awards', awardId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Award assignments management
  async getAwardAssignments(): Promise<AwardAssignment[]> {
    const path = 'award_assignments';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AwardAssignment));
=======
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
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

<<<<<<< HEAD
  async saveAwardAssignments(assignments: AwardAssignment[]): Promise<void> {
    const path = 'award_assignments';
    try {
      const batch = writeBatch(db);
      assignments.forEach(a => {
        const docRef = doc(db, path, a.id);
        batch.set(docRef, a);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteAwardAssignment(assignmentId: string): Promise<void> {
    const path = `award_assignments/${assignmentId}`;
    try {
      await deleteDoc(doc(db, 'award_assignments', assignmentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // System activity log (used by audit trail in HostProfileView)
  async logSystemActivity(description: string, level: 'Info' | 'Warning' | 'Error' = 'Info'): Promise<void> {
    const path = 'system_activity_logs';
    try {
      const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      const docRef = doc(db, path, id);
      await setDoc(docRef, {
        id,
        description,
        level,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.warn('[FirebaseService] logSystemActivity failed:', error);
    }
  },
=======
  async logSystemActivity(actionDescription: string, severity: 'Info' | 'Warning' | 'Error' = 'Info') {
    try {
      const authState = Storage.getAuthState();
      const logEntry = {
        timestamp: new Date().toISOString(),
        severity,
        actionDescription,
        userId: authState?.poppo_id || 'System',
        userRole: authState?.role || 'System',
        stackTrace: ''
      };
      const newDocRef = doc(collection(db, 'system_logs'));
      await setDoc(newDocRef, logEntry);
    } catch (error) {
      console.error('[FirebaseService] logSystemActivity failed:', error);
    }
  }
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
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
<<<<<<< HEAD
export const subscribeToHosts = (
  callback: (hosts: HostRosterUser[]) => void,
  onError?: (error: any) => void
): (() => void) => {
=======
export const subscribeToHosts = (callback: (hosts: HostRosterUser[]) => void): (() => void) => {
>>>>>>> 1caeedfed0e8d150b835bb818f205219a88c9b93
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
      if (onError) onError(error);
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
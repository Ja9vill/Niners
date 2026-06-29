import { auth, db, storage } from './firebase';
import { ref, uploadString, getBytes, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Storage } from './storage';
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, writeBatch, Timestamp, onSnapshot, updateDoc, arrayUnion, arrayRemove, deleteField, orderBy, limit } from 'firebase/firestore';
import { CommissionEntry, Host, PKEntry, ExposureEntry, FanbaseHealthEntry, WeeklyLiveDataEntry, MonthlyLiveDataEntry, TopNinersEarningsSummary, EventsCalendarPublic, Task, ActivityAuditLog, CalendarEvent, LivehouseRequest, AwardBadge, AwardAssignment, ManagerNote } from '../types';
import { LivehouseDataRow } from '../types/livehouse';

export const generateSubmissionId = (reporterId: string, role: string, name: string): string => {
  const safeId = reporterId || 'Unknown';
  const safeRole = role || 'Unknown';
  const safeName = name || 'Unknown';
  
  const now = new Date();
  const dateStr = `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear()}`;
  let hours = now.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}${ampm}`;
  const timestamp = `${dateStr}-${timeStr}`;
  
  return `${safeId}_${safeRole}_${safeName}_${timestamp}`.replace(/\s+/g, '');
};

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

  // === CMS: Public Page Assets ===
  async getPublicPageAssets(): Promise<any[]> {
    const path = 'public_page_assets';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async savePublicPageAsset(asset: any): Promise<void> {
    const path = `public_page_assets/${asset.slotId}`;
    try {
      await setDoc(doc(db, 'public_page_assets', asset.slotId), {
        ...asset,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // === CMS: Blogs ===
  async getBlogs(): Promise<any[]> {
    const path = 'blogs';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getBlogBySlug(slug: string): Promise<any | null> {
    const path = `blogs (slug: ${slug})`;
    try {
      const q = query(collection(db, 'blogs'), where('slug', '==', slug));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async saveBlog(blog: any): Promise<void> {
    const path = `blogs/${blog.id}`;
    try {
      await setDoc(doc(db, 'blogs', blog.id), {
        ...blog,
        updatedAt: new Date().toISOString(),
        createdAt: blog.createdAt || new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async incrementBlogViewCount(blogId: string): Promise<void> {
    const path = `blogs/${blogId}`;
    try {
      const docRef = doc(db, 'blogs', blogId);
      const snapshot = await getDocs(query(collection(db, 'blogs'), where('id', '==', blogId)));
      // Note: In a production app, use increment() from firestore. But we are working with the simple generic wrapper here.
      if (!snapshot.empty) {
        const currentData = snapshot.docs[0].data();
        await setDoc(docRef, { viewCount: (currentData.viewCount || 0) + 1 }, { merge: true });
      }
    } catch (error) {
      console.error('Failed to increment view count', error);
    }
  },

  async uploadBlogImage(file: File): Promise<string> {
    const { storage } = await import('./firebase');
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const storageRef = ref(storage, `blog-images/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  },

  async deleteBlog(blogId: string): Promise<void> {
    const path = `blogs/${blogId}`;
    try {
      await deleteDoc(doc(db, 'blogs', blogId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
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

      // Notify registered hosts whose requests are approved
      for (const r of requests) {
        if (r.status === 'Approved') {
          FirebaseService.notifyHostIfRegistered(r.poppoId, r.date || r.proposedDate, r.timeslot || r.proposedTimeslot).catch(console.error);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'livehouse_requests');
    }
  },
  async updateLivehouseStatus(id: string, status: string) {
    try {
      const docRef = doc(db, 'livehouse_requests', id);
      await updateDoc(docRef, { status });
      if (status === 'Approved') {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const req = snap.data();
          FirebaseService.notifyHostIfRegistered(req.poppoId, req.date || req.proposedDate, req.timeslot || req.proposedTimeslot).catch(console.error);
        }
      }
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

    // 3. Fetch from {role}_profile collections to get photos and extra data
    const profileCols = ['host_profile', 'manager_profile', 'admin_profile', 'head_admin_profile', 'agent_profile', 'director_profile'];
    for (const col of profileCols) {
      try {
        const snapshot = await getDocs(collection(db, col));
        snapshot.docs.forEach(d => {
          const id = d.id;
          const data = d.data();
          const poppoId = data.poppo_id || id;

          // Merge profile data into existing user record (profile OVERWRITES users data)
          if (metadataMap[poppoId]) {
            metadataMap[poppoId] = {
              ...metadataMap[poppoId],
              ...data,
              poppo_id: poppoId,
              id: poppoId
            };
          } else {
            // Create a new entry if user wasn't in users collection
            metadataMap[poppoId] = {
              ...data,
              id: poppoId,
              poppo_id: poppoId,
            };
          }

          const normRole = normalizeRoleTypography(metadataMap[poppoId].role || col.replace('_profile', ''));
          metadataMap[poppoId] = sanitizeDocumentByRole(metadataMap[poppoId], normRole);
        });
      } catch (error: any) {
        console.warn(`Could not fetch metadata for profile collection: ${col}`, error);
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

  // ---------------------------------------------------------
  // DATABASE VAULT & STAGING QUEUE (Safeguard Mechanism)
  // ---------------------------------------------------------
  async submitToStaging(originalCollection: string, docId: string, data: any) {
    const path = `staging_queue/${docId}`;
    try {
      const payload = {
        id: docId,
        isBulk: false,
        originalCollection,
        data,
        status: 'PENDING',
        tags: [],
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'staging_queue', docId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async submitBulkToStaging(originalCollection: string, uploadId: string, items: any[], submitterName: string = 'Admin') {
    const docId = `BULK_${originalCollection}_${uploadId}`;
    const path = `staging_queue/${docId}`;
    try {
      const payload = {
        id: docId,
        isBulk: true,
        originalCollection,
        items,
        status: 'PENDING',
        tags: [],
        submittedBy: submitterName,
        timestamp: new Date().toISOString()
      };
      await setDoc(doc(db, 'staging_queue', docId), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getPendingStagingData() {
    try {
      const q = query(collection(db, 'staging_queue'), where('status', '==', 'PENDING'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id }));
    } catch (error) {
      console.error("Error fetching staging data:", error);
      return [];
    }
  },

  async approveStagingData(stagingDoc: any) {
    const { id: stagingId, originalCollection, isBulk, data, items } = stagingDoc;
    try {
      if (isBulk && items) {
        // Bulk approval: Write all items via batch
        const batch = writeBatch(db);
        items.forEach((item: any) => {
          // Attempt to extract an ID from the item, or generate a random one
          const itemId = item.poppo_id ? `${item.poppo_id}_${item.month || item.from_date || item.id || Math.random().toString(36).substring(2,9)}` : Math.random().toString(36).substring(2, 15);
          const lockedData = { ...item, isLocked: true, lockedAt: new Date().toISOString() };
          const docRef = doc(db, originalCollection, itemId);
          batch.set(docRef, lockedData);
        });
        await batch.commit();
      } else {
        // Single approval
        const lockedData = { ...data, isLocked: true, lockedAt: new Date().toISOString() };
        await setDoc(doc(db, originalCollection, stagingId), lockedData);
      }
      
      // Mark staging as APPROVED
      await updateDoc(doc(db, 'staging_queue', stagingId), { status: 'APPROVED', approvedAt: new Date().toISOString() });
    } catch (error) {
      console.error("Error approving staging data:", error);
      throw error;
    }
  },

  async rejectStagingData(stagingId: string) {
    try {
      await updateDoc(doc(db, 'staging_queue', stagingId), { status: 'REJECTED', rejectedAt: new Date().toISOString() });
    } catch (error) {
      console.error("Error rejecting staging data:", error);
      throw error;
    }
  },

  async updateStagingTags(stagingId: string, tags: string[]) {
    try {
      await updateDoc(doc(db, 'staging_queue', stagingId), { tags });
    } catch (error) {
      console.error("Error updating staging tags:", error);
      throw error;
    }
  },

  async submitRpkReport(hostId: string, fromDate: string, toDate: string, data: any) {
    const docId = generateSubmissionId(data.reporter_id, data.reporter_role, data.reporter_name);
    const finalData = { ...data, poppo_id: hostId, timestamp: new Date().toISOString() };
    await this.submitToStaging('pk_reports', docId, finalData);
  },

  async submitFanbaseReport(hostId: string, fromDate: string, toDate: string, data: any) {
    const docId = generateSubmissionId(data.reporter_id, data.reporter_role, data.reporter_name);
    const finalData = { ...data, poppo_id: hostId, timestamp: new Date().toISOString() };
    await this.submitToStaging('fanbase_reports', docId, finalData);
  },

  // Hosts management
  async saveHosts(hosts: Host[]) {
    const path = 'users';
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

  async saveAgentCommissions(commissions: CommissionEntry[], agentId: string, isWeekly: boolean = false, submitterName: string = 'Agent') {
    const uploadId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    
    // Tag data with Agent identifiers
    const taggedCommissions = commissions.map(c => ({
      ...c,
      isAgentData: true,
      uploadedById: agentId
    }));
    
    await this.submitBulkToStaging('performance_reports', uploadId, taggedCommissions, submitterName);
  },

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
        nickname: host.nickname || host.name,
        manager: managerName,
        assigned_manager: managerName,
        assigned_manager_nickname: managerName,
        assigned_manager_poppo_id: managerId || null,
        assignedManagerId: managerId || null,
        team: teamName,
        team_anchor: teamName,
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
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async deleteHost(hostId: string) {
    const path = `host/${hostId}`;
    try {
      await deleteDoc(doc(db, 'users', hostId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async getAllHosts(): Promise<Host[]> {
    return this.getAllRoleMetadata();
  },
  async getHosts(): Promise<Host[]> {
    return this.getAllRoleMetadata();
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

  // Performance Reports Management
  async saveCommissions(commissions: CommissionEntry[], submitterName: string = 'Admin', isWeekly: boolean = false) {
    const uploadId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    const collectionName = isWeekly ? 'performance_weekly_reports' : 'performance_reports';
    await this.submitBulkToStaging(collectionName, uploadId, commissions, submitterName);
  },

  async getCommissionsByMonth(month: string): Promise<CommissionEntry[]> {
    const path = 'performance_reports';
    try {
      const q = query(collection(db, path), where('month', '==', month));
      const snapshot = await getDocs(q);
      const all = snapshot.docs.map(d => d.data() as CommissionEntry);
      // Filter out agent data for directors
      return all.filter(c => !c.isAgentData);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getAllCommissions(): Promise<CommissionEntry[]> {
    try {
      const [monthlySnap, weeklySnap] = await Promise.all([
        getDocs(collection(db, 'performance_reports')),
        getDocs(collection(db, 'performance_weekly_reports'))
      ]);
      const monthly = monthlySnap.docs.map(d => d.data() as CommissionEntry);
      const weekly = weeklySnap.docs.map(d => d.data() as CommissionEntry);
      return [...monthly, ...weekly].filter(c => !c.isAgentData);
    } catch (error) {
      console.error("Error getting all commissions:", error);
      return [];
    }
  },

  async getAgentCommissions(agentId: string, isWeekly: boolean = false): Promise<CommissionEntry[]> {
    const path = isWeekly ? 'performance_weekly_reports' : 'performance_reports';
    try {
      const snapshot = await getDocs(collection(db, path));
      const all = snapshot.docs.map(d => d.data() as CommissionEntry);
      
      return all.filter(c => 
        c.isAgentData === true && 
        c.uploadedById === agentId && 
        (isWeekly ? (c.from_date && c.to_date) : c.month)
      );
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

  async deleteCommission(poppoId: string, monthOrRange: string, isWeekly: boolean = false) {
    const colName = isWeekly ? 'performance_weekly_reports' : 'performance_reports';
    const path = `${colName}/${poppoId}_${monthOrRange}`;
    try {
      await deleteDoc(doc(db, colName, `${poppoId}_${monthOrRange}`));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async deleteAgentCommission(poppoId: string, monthOrRange: string, agentId: string, isWeekly: boolean = false) {
    const colName = isWeekly ? 'performance_weekly_reports' : 'performance_reports';
    const path = `${colName}/${poppoId}_${monthOrRange}`;
    try {
      const docRef = doc(db, colName, `${poppoId}_${monthOrRange}`);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.isAgentData && data.uploadedById === agentId) {
          await deleteDoc(docRef);
        } else {
          console.error("Agent tried to delete a non-agent or unauthorized commission row.");
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async updateCommission(commission: CommissionEntry, isWeekly: boolean = false) {
    const colName = isWeekly ? 'performance_weekly_reports' : 'performance_reports';
    const monthOrRange = isWeekly ? `${commission.from_date}_${commission.to_date}` : commission.month;
    const path = `${colName}/${commission.poppo_id}_${monthOrRange}`;
    try {
      const docRef = doc(db, colName, `${commission.poppo_id}_${monthOrRange}`);
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
      return snapshot.docs.map(d => {
        const raw = d.data();
        const eventId = raw.event_id || raw.eventId || d.id;
        const participants = raw.panticipantids || raw.participantids || raw.participantIds || raw.participants || [];
        if (raw.panticipantids) {
          console.warn(`[DEPRECATION] Document ${d.id} uses legacy field 'panticipantids'. Consider migrating to 'participants'.`);
        }
        const participantNicknames = raw.participant_nicknames || [];
        return {
          ...raw,
          id: eventId,
          event_id: eventId,
          date: raw.event_date || raw.date || '',
          title: raw.event_tittle || raw.title || '',
          type: raw.event_type || raw.type || '',
          time: raw.from_time && raw.to_time ? `${raw.from_time} - ${raw.to_time}` : (raw.time || ''),
          poppo_id: raw.event_host_id || raw.poppo_id || '',
          event_host_id: raw.event_host_id || '',
          description: raw.event_description || raw.description || '',
          participants: participants,
          participantIds: participants,
          participants_id: participants,
          created_by_id: raw.created_by_id || '',
          created_by_name: raw.created_by_name || raw.event_host_name || '',
          created_by_role: raw.created_by_role || '',
          timestamp: raw.timestamp || '',
          visibility: raw.visibility || '',
          location: raw.location || '',
          is_automated: raw.is_automated || false,
        } as CalendarEvent;
      });
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

  async getAllAssignedAwards(): Promise<any[]> {
    try {
      let legacyAwards: any[] = [];
      try {
        const topSnap = await getDocs(collection(db, 'host_awards'));
        legacyAwards = topSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn('[FirebaseService] Failed to load top-level host_awards for all hosts', err);
      }

      let assignedAwards: any[] = [];
      try {
        const assignSnap = await getDocs(collection(db, 'award_assignments'));
        assignedAwards = assignSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            title: data.awardName,
            description: `Effectivity Period: ${data.startDate} to ${data.endDate}`,
            dateAwarded: data.startDate || data.assignedAt,
            awardedAt: data.assignedAt,
            color: data.awardColor,
            hostId: data.hostId || data.poppoId,
            poppoId: data.hostId || data.poppoId,
            ...data
          };
        });
      } catch (err) {
        console.warn('[FirebaseService] Failed to load award_assignments for all hosts', err);
      }

      const allAwards = [...legacyAwards, ...assignedAwards];
      const seen = new Set<string>();
      return allAwards.filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
    } catch (error) {
      console.warn('[FirebaseService] getAllAssignedAwards failed', error);
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

  async getAllExposures(): Promise<ExposureEntry[]> {
    try {
      const snap = await getDocs(collection(db, 'calendar'));
      return snap.docs.map(d => d.data() as ExposureEntry);
    } catch (error) {
      console.warn('[FirebaseService] getAllExposures failed', error);
      return [];
    }
  },

  async saveLivehouseSchedule(scheduleRows: LivehouseDataRow[]) {
    const path = 'livehouse_schedule';
    try {
      // Chunk batches because of Firestore's 500 operation limit per batch
      const maxBatchSize = 400;
      let batch = writeBatch(db);
      let batchCount = 0;
      
      const commitBatchIfNeeded = async () => {
        if (batchCount >= maxBatchSize) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      };
      
      // 1. Clear existing Livehouse schedule but keep in memory for diffing
      const snap = await getDocs(collection(db, path));
      const oldSchedule = new Map<string, any>();
      for (const d of snap.docs) {
        oldSchedule.set(d.id, d.data());
        batch.delete(d.ref);
        batchCount++;
        await commitBatchIfNeeded();
      }

      // 2. Set new Livehouse schedule & generate calendar events and logs
      const validCalendarEventIds: string[] = [];
      const logsRef = collection(db, 'livehouse_logs');

      // Fetch all users to match poppo_id quickly
      const usersSnap = await getDocs(collection(db, 'users'));
      const existingUserIds = new Set(usersSnap.docs.map(doc => doc.id.trim()));

      for (const r of scheduleRows) {
        if (!r.date || !r.timeslot) continue;
        const docId = `${r.date}_${r.timeslot}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        
        const oldRow = oldSchedule.get(docId);
        
        const newSlot1 = String(r.slot_1?.poppo_id || '').trim();
        const oldSlot1 = String(oldRow?.slot_1?.poppo_id || '').trim();
        
        if (newSlot1 && newSlot1 !== oldSlot1) {
          const logDocRef = doc(logsRef);
          batch.set(logDocRef, {
            poppo_id: newSlot1,
            date: r.date,
            timeslot: r.timeslot,
            timestamp: new Date().toISOString(),
            source: 'manual-sync'
          });
          batchCount++;
          await commitBatchIfNeeded();

          // Create notification if matched user in 'users'
          if (existingUserIds.has(newSlot1)) {
            const notifId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
            const notifRef = doc(db, 'user_notifications', notifId);
            batch.set(notifRef, {
              id: notifId,
              poppoId: newSlot1,
              title: 'Livehouse Event Scheduled',
              message: `Your Livehouse Event is scheduled on ${r.date} at ${r.timeslot}.`,
              type: 'success',
              timestamp: new Date().toISOString(),
              read: false
            });
            batchCount++;
            await commitBatchIfNeeded();
          }
        }
        
        const newSlot2 = String(r.slot_2?.poppo_id || '').trim();
        const oldSlot2 = String(oldRow?.slot_2?.poppo_id || '').trim();
        
        if (newSlot2 && newSlot2 !== oldSlot2) {
          const logDocRef = doc(logsRef);
          batch.set(logDocRef, {
            poppo_id: newSlot2,
            date: r.date,
            timeslot: r.timeslot,
            timestamp: new Date().toISOString(),
            source: 'manual-sync'
          });
          batchCount++;
          await commitBatchIfNeeded();

          // Create notification if matched user in 'users'
          if (existingUserIds.has(newSlot2)) {
            const notifId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
            const notifRef = doc(db, 'user_notifications', notifId);
            batch.set(notifRef, {
              id: notifId,
              poppoId: newSlot2,
              title: 'Livehouse Event Scheduled',
              message: `Your Livehouse Event is scheduled on ${r.date} at ${r.timeslot}.`,
              type: 'success',
              timestamp: new Date().toISOString(),
              read: false
            });
            batchCount++;
            await commitBatchIfNeeded();
          }
        }

        const docRef = doc(db, path, docId);
        batch.set(docRef, r);
        batchCount++;
        await commitBatchIfNeeded();
      }
      
      const syncStatusRef = doc(db, 'system', 'livehouse_sync');
      batch.set(syncStatusRef, {
        last_synced_iso: new Date().toISOString()
      }, { merge: true });
      batchCount++;
      await commitBatchIfNeeded();

      if (batchCount > 0) {
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getLivehouseSchedule(): Promise<LivehouseDataRow[]> {
    const path = 'livehouse_schedule';
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map(d => d.data() as LivehouseDataRow);
    } catch (error) {
      console.warn('[FirebaseService] getLivehouseSchedule failed', error);
      return [];
    }
  },

  async getLivehouseLogs(limitCount: number = 50, startAfterDoc?: any): Promise<{ logs: any[], lastVisible: any }> {
    try {
      let q = query(
        collection(db, 'livehouse_logs'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      if (startAfterDoc) {
        const { startAfter } = await import('firebase/firestore');
        q = query(q, startAfter(startAfterDoc));
      }
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      return { logs, lastVisible };
    } catch (error) {
      console.warn('[FirebaseService] getLivehouseLogs failed', error);
      return { logs: [], lastVisible: null };
    }
  },

  async getLivehouseSyncStatus(): Promise<string | null> {
    try {
      const docRef = doc(db, 'system', 'livehouse_sync');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data().last_synced_iso || null;
      }
      return null;
    } catch (error) {
      console.warn('[FirebaseService] getLivehouseSyncStatus failed', error);
      return null;
    }
  },

  async getAllCalendarEvents(): Promise<any[]> {
    try {
      const snap = await getDocs(collection(db, 'calendar'));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.warn('[FirebaseService] getAllCalendarEvents failed', error);
      return [];
    }
  },

  async deleteOldLivehouseLogs(count: number): Promise<void> {
    try {
      const q = query(
        collection(db, 'livehouse_logs'),
        orderBy('timestamp', 'asc'),
        limit(count)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      console.warn('[FirebaseService] deleteOldLivehouseLogs failed', error);
      throw error;
    }
  },



  async notifyHostIfRegistered(poppoId: string, date: string, timeslot: string) {
    if (!poppoId) return;
    try {
      const cleanId = String(poppoId).trim();
      const userDocRef = doc(db, 'users', cleanId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const notifId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
        await setDoc(doc(db, 'user_notifications', notifId), {
          id: notifId,
          poppoId: cleanId,
          title: 'Livehouse Event Scheduled',
          message: `Your Livehouse Event is scheduled on ${date} at ${timeslot}.`,
          type: 'success',
          timestamp: new Date().toISOString(),
          read: false
        });
      }
    } catch (err) {
      console.error('[FirebaseService] notifyHostIfRegistered failed:', err);
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

      // Notify registered hosts whose requests are approved
      for (const r of requests) {
        if (r.status === 'Approved') {
          FirebaseService.notifyHostIfRegistered(r.poppoId, r.date, r.timeslot).catch(console.error);
        }
      }
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

  async getLatestTopNinersSummaries(): Promise<TopNinersEarningsSummary[]> {
    const path = 'top_niners_earnings_summary';
    try {
      const q = query(collection(db, path));
      const snapshot = await getDocs(q);
      const allSummaries = snapshot.docs.map(d => d.data() as TopNinersEarningsSummary);
      
      if (allSummaries.length === 0) return [];
      
      let maxYear = 0;
      let maxMonth = 0;
      allSummaries.forEach(s => {
        if (s.year > maxYear) {
          maxYear = s.year;
          maxMonth = s.month;
        } else if (s.year === maxYear && s.month > maxMonth) {
          maxMonth = s.month;
        }
      });
      
      return allSummaries.filter(s => s.year === maxYear && s.month === maxMonth).sort((a, b) => b.totalPoints - a.totalPoints);
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
    const path = `host/${poppoId}`;
    try {
      const docRef = doc(db, 'users', poppoId);
      await updateDoc(docRef, { ...patch, updated_at: new Date().toISOString() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // ===== Financial Data Storage (Firebase Storage) =====

  getFinancialDataPath(period: string, role: string, filename: string): string {
    return `financial data/${role}/${period}/${filename}`;
  },

  getDataKey(period: string, role: string): string {
    return `nine_financial_${role}_${period}`;
  },

  getHistoryKey(period: string, role: string): string {
    return `nine_financial_history_${role}_${period}`;
  },

  async saveFinancialDataToStorage(period: 'monthly' | 'weekly' | 'daily', data: any[], role: 'director' | 'agents' = 'director', uploaderInfo?: { id?: string; name?: string; role?: string }): Promise<void> {
    const path = this.getFinancialDataPath(period, role, 'data.json');
    // Always save to localStorage fallback
    try {
      localStorage.setItem(this.getDataKey(period, role), JSON.stringify(data));
    } catch {}
    try {
      const jsonStr = JSON.stringify(data);
      await uploadString(ref(storage, path), jsonStr);
      await this.appendFinancialHistory(period, role, 'manual_save', data.length, undefined, uploaderInfo);
      console.log(`[FirebaseService] Saved financial data to ${path}`);
    } catch (error) {
      console.error(`[FirebaseService] Error saving financial data to storage (${path}):`, error);
      // Still append to localStorage history even if Storage fails
      await this.appendLocalHistory(period, role, 'manual_save', data.length, undefined, uploaderInfo);
      throw error;
    }
  },

  async loadFinancialDataFromStorage(period: 'monthly' | 'weekly' | 'daily', role: 'director' | 'agents' = 'director'): Promise<any[]> {
    const path = this.getFinancialDataPath(period, role, 'data.json');
    // Try Firebase Storage first
    try {
      const bytes = await getBytes(ref(storage, path));
      const data = JSON.parse(new TextDecoder().decode(bytes));
      // Sync to localStorage for offline fallback
      try { localStorage.setItem(this.getDataKey(period, role), JSON.stringify(data)); } catch {}
      return data;
    } catch (error: any) {
      if (error?.code === 'storage/object-not-found') {
        // Fallback to localStorage
        const local = localStorage.getItem(this.getDataKey(period, role));
        if (local) {
          try { return JSON.parse(local); } catch {}
        }
        return [];
      }
      // Fallback to localStorage on any error
      const local = localStorage.getItem(this.getDataKey(period, role));
      if (local) {
        try { return JSON.parse(local); } catch {}
      }
      console.error(`[FirebaseService] Error loading financial data from storage (${path}):`, error);
      return [];
    }
  },

  async commitFinancialReport(period: 'monthly' | 'weekly' | 'daily', reportName: string, data: any[], role: 'director' | 'agents' = 'director', uploaderInfo?: { id?: string; name?: string; role?: string }): Promise<void> {
    const reportPath = this.getFinancialDataPath(period, role, `reports/${reportName}.json`);
    const dataPath = this.getFinancialDataPath(period, role, 'data.json');
    try {
      const jsonStr = JSON.stringify(data);
      await uploadString(ref(storage, reportPath), jsonStr);
      await uploadString(ref(storage, dataPath), jsonStr);
      await this.appendFinancialHistory(period, role, 'commit', data.length, reportName, uploaderInfo);
      console.log(`[FirebaseService] Committed financial report to ${reportPath}`);
    } catch (error) {
      console.error(`[FirebaseService] Error committing financial report:`, error);
      throw error;
    }
  },

  async saveFinancialReport(period: 'monthly' | 'weekly' | 'daily', reportName: string, data: any[], role: 'director' | 'agents' = 'director', uploaderInfo?: { id?: string; name?: string; role?: string }): Promise<void> {
    const path = this.getFinancialDataPath(period, role, `reports/${reportName}.json`);
    try {
      const jsonStr = JSON.stringify(data);
      await uploadString(ref(storage, path), jsonStr);
      await this.appendFinancialHistory(period, role, 'save_report', data.length, reportName, uploaderInfo);
      console.log(`[FirebaseService] Saved financial report to ${path}`);
    } catch (error) {
      console.error(`[FirebaseService] Error saving financial report (${path}):`, error);
      throw error;
    }
  },

  async loadFinancialHistory(period: 'monthly' | 'weekly' | 'daily', role: 'director' | 'agents' = 'director'): Promise<{ timestamp: string; type: string; recordCount: number; reportName?: string; uploadedByRole?: string; uploaderId?: string; uploaderName?: string; uploaderRole?: string }[]> {
    const path = this.getFinancialDataPath(period, role, 'history.json');
    try {
      const bytes = await getBytes(ref(storage, path));
      const data = JSON.parse(new TextDecoder().decode(bytes));
      // Sync to localStorage
      try { localStorage.setItem(this.getHistoryKey(period, role), JSON.stringify(data)); } catch {}
      return data;
    } catch (error: any) {
      if (error?.code === 'storage/object-not-found') {
        // Fallback to localStorage
        const local = localStorage.getItem(this.getHistoryKey(period, role));
        if (local) {
          try { return JSON.parse(local); } catch {}
        }
        return [];
      }
      // Fallback to localStorage on any error
      const local = localStorage.getItem(this.getHistoryKey(period, role));
      if (local) {
        try { return JSON.parse(local); } catch {}
      }
      console.error(`[FirebaseService] Error loading financial history (${path}):`, error);
      return [];
    }
  },

  async loadFinancialReportFromStorage(reportPath: string): Promise<any[]> {
    try {
      const bytes = await getBytes(ref(storage, reportPath));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (error) {
      console.error(`[FirebaseService] Error loading financial report (${reportPath}):`, error);
      return [];
    }
  },

  async appendLocalHistory(period: 'monthly' | 'weekly' | 'daily', role: 'director' | 'agents', type: string, recordCount: number, reportName?: string, uploaderInfo?: { id?: string; name?: string; role?: string }): Promise<void> {
    try {
      let history: any[] = [];
      const existing = localStorage.getItem(this.getHistoryKey(period, role));
      if (existing) {
        try { history = JSON.parse(existing); } catch {}
      }
      history.push(this.buildHistoryEntry(period, role, type, recordCount, reportName, uploaderInfo));
      if (history.length > 100) history = history.slice(-100);
      localStorage.setItem(this.getHistoryKey(period, role), JSON.stringify(history));
    } catch {}
  },

  buildHistoryEntry(period: string, role: string, type: string, recordCount: number, reportName?: string, uploaderInfo?: { id?: string; name?: string; role?: string }): any {
    return {
      timestamp: new Date().toISOString(),
      type,
      recordCount,
      reportName: reportName || `${type}_${new Date().toISOString()}`,
      uploadedByRole: role,
      uploaderId: uploaderInfo?.id || '',
      uploaderName: uploaderInfo?.name || '',
      uploaderRole: uploaderInfo?.role || role
    };
  },

  async appendFinancialHistory(period: 'monthly' | 'weekly' | 'daily', role: 'director' | 'agents', type: string, recordCount: number, reportName?: string, uploaderInfo?: { id?: string; name?: string; role?: string }): Promise<void> {
    const path = this.getFinancialDataPath(period, role, 'history.json');
    // Always save to localStorage fallback
    await this.appendLocalHistory(period, role, type, recordCount, reportName, uploaderInfo);
    try {
      let history: any[] = [];
      try {
        const bytes = await getBytes(ref(storage, path));
        history = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        // history doesn't exist yet, start fresh
      }
      history.push(this.buildHistoryEntry(period, role, type, recordCount, reportName, uploaderInfo));
      if (history.length > 100) history = history.slice(-100);
      await uploadString(ref(storage, path), JSON.stringify(history));
    } catch (error) {
      console.error(`[FirebaseService] Error appending financial history (${path}):`, error);
    }
  },

  async checkFinancialStorage(period: 'monthly' | 'weekly' | 'daily', role: 'director' | 'agents' = 'director'): Promise<{ ok: boolean; dataExists: boolean; historyExists: boolean; reportCount: number; error?: string }> {
    const result: { ok: boolean; dataExists: boolean; historyExists: boolean; reportCount: number; error?: string } = { ok: false, dataExists: false, historyExists: false, reportCount: 0 };
    try {
      try {
        const data = await this.loadFinancialDataFromStorage(period, role);
        result.dataExists = data.length > 0;
      } catch {} // load throws on permission error
      try {
        const bytes = await getBytes(ref(storage, `financial data/${role}/${period}/history.json`));
        result.historyExists = bytes.byteLength > 2;
      } catch {}
      result.ok = true;
    } catch (error: any) {
      result.ok = false;
      result.error = error?.message || String(error);
    }
    return result;
  },

  // ===== End Financial Data Storage =====

  async saveFinancials(type: 'monthly' | 'weekly', data: any[]): Promise<void> {
    const colName = type === 'weekly' ? 'performance_weekly_reports' : 'performance_reports';
    try {
      const batch = writeBatch(db);
      data.forEach(r => {
        const dateKey = type === 'weekly' ? `${r.from_date || ''}_${r.to_date || ''}` : (r.month || '');
        const id = `${r.poppo_id}_${dateKey}`;
        const docRef = doc(db, colName, id);
        batch.set(docRef, r, { merge: true });
      });
      await batch.commit();
    } catch (error) {
      console.error(`[FirebaseService] Error saving financials for ${type}:`, error);
      throw error;
    }
  },

  async fetchFinancials(type: 'monthly' | 'weekly' | 'daily'): Promise<any[]> {
    const colName = type === 'weekly' ? 'performance_weekly_reports' : 'performance_reports';
    try {
      const snapshot = await getDocs(collection(db, colName));
      return snapshot.docs.map(d => d.data());
    } catch (error) {
      console.error(`[FirebaseService] Error fetching financials for ${type}:`, error);
      return [];
    }
  },

  async savePerformanceReport(data: any[], isWeekly: boolean = false): Promise<void> {
    const path = isWeekly ? 'performance_weekly_reports' : 'performance_reports';
    try {
      const batch = writeBatch(db);
      data.forEach(r => {
        const dateKey = isWeekly ? `${r.from_date || ''}_${r.to_date || ''}` : (r.month || '');
        const id = `${r.poppo_id}_${dateKey}`;
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
export const subscribeToHosts = (callback: (hosts: HostRosterUser[]) => void, onError?: (error: any) => void): (() => void) => {
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
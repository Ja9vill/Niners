import { auth, db } from './firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { CommissionEntry, Host, PKEntry, ExposureEntry, FanbaseHealthEntry } from '../types';

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
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const FirebaseService = {
  // Hosts management
  async saveHosts(hosts: Host[]) {
    try {
      const batch = writeBatch(db);
      hosts.forEach(h => {
        const docRef = doc(db, 'hosts', h.id);
        batch.set(docRef, { ...h, updated_at: new Date().toISOString() });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'hosts');
    }
  },

  async updateHost(host: Host) {
    try {
      const docRef = doc(db, 'hosts', host.id);
      await setDoc(docRef, { ...host, updated_at: new Date().toISOString() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `hosts/${host.id}`);
    }
  },

  async deleteHost(hostId: string) {
    try {
      await deleteDoc(doc(db, 'hosts', hostId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `hosts/${hostId}`);
    }
  },

  async getAllHosts(): Promise<Host[]> {
    const path = 'hosts';
    try {
      const snapshot = await getDocs(collection(db, path));
      return snapshot.docs.map(d => d.data() as Host);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  // Commission management
  async saveCommissions(commissions: CommissionEntry[]) {
    try {
      const batch = writeBatch(db);
      commissions.forEach(c => {
        const id = `${c.poppo_id}_${c.month}`;
        const docRef = doc(db, 'commissions', id);
        batch.set(docRef, c);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'commissions');
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
    try {
      const q = query(collection(db, 'commissions'), where('month', '==', month));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `commissions/${month}`);
    }
  },

  // Reporting management
  async savePKRecords(records: PKEntry[]) {
    try {
      const batch = writeBatch(db);
      records.forEach(r => {
        const id = r.id || crypto.randomUUID();
        const docRef = doc(db, 'pk_records', id);
        batch.set(docRef, { ...r, id });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'pk_records');
    }
  },

  async saveExposures(exposures: ExposureEntry[]) {
    try {
      const batch = writeBatch(db);
      exposures.forEach(e => {
        const id = e.id || crypto.randomUUID();
        const docRef = doc(db, 'exposures', id);
        batch.set(docRef, { ...e, id });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'exposures');
    }
  },

  async saveFanbaseHealth(records: FanbaseHealthEntry[]) {
    try {
      const batch = writeBatch(db);
      records.forEach(r => {
        const id = r.id || crypto.randomUUID();
        const docRef = doc(db, 'fanbase_health', id);
        batch.set(docRef, { ...r, id });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'fanbase_health');
    }
  }
};

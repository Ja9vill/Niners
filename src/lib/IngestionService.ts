import { db } from './firebase';
import { collection, doc, setDoc, getDocs, getDoc, addDoc, query, where, orderBy, writeBatch, deleteDoc, Timestamp } from 'firebase/firestore';
import { Storage } from './storage';
import { AgentFinancialReport, UserRegistration } from '../types';

const AGENT_REPORTS_COL = 'agent_financial_reports';
const USERS_COL = 'users';
const REGISTRATIONS_COL = 'user_registration';
const ATTENDANCE_COL = 'attendance';

function now(): string {
  return new Date().toISOString();
}

function generateDocId(agentId: string, type: string, fromDate: string): string {
  const clean = fromDate.replace(/[/,\s]/g, '-');
  return `${agentId}_${type}_${clean}`;
}

export interface ParsedCSVRow {
  poppo_id: string;
  nickname: string;
  solo_live_duration: string;
  party_live_duration: string;
  total_point: number;
  agent_commission: number;
  solo_live_earnings: number;
  party_live_earnings: number;
  private_chat: number;
  tips: number;
  platform_reward: number;
  other_earnings: number;
  platform_salary: number;
  super_salary: number;
  super_rank: number;
  stream_level: number;
}

export interface PreviewRow {
  poppo_id: string;
  csvNickname: string;
  matchedNickname: string | null;
  matched: boolean;
}

export interface ProvisionRow {
  poppo_id: string;
  nickname: string;
  role: 'Host' | 'Manager' | 'Admin';
}

export interface UploadHistoryNode {
  id: string;
  label: string;
  children?: UploadHistoryNode[];
  data?: AgentFinancialReport;
}

export const IngestionService = {

  /** 0. Migrate legacy collection */
  async migrateLegacyData(): Promise<number> {
    let migratedCount = 0;
    try {
      const legacySnap = await getDocs(collection(db, 'director_performance_reports'));
      const batch = writeBatch(db);
      legacySnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const newRef = doc(collection(db, AGENT_REPORTS_COL), docSnap.id);
        batch.set(newRef, { ...data, agent_id: '19381364' });
        batch.delete(docSnap.ref);
        migratedCount++;
      });
      if (migratedCount > 0) await batch.commit();
    } catch (e) {
      console.warn('[IngestionService] Migration skipped or already done:', e);
    }
    return migratedCount;
  },

  /** 1. Parse CSV text into rows */
  parseCSV(csvText: string): ParsedCSVRow[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 3) return [];
    const rows: ParsedCSVRow[] = [];
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 15) continue;
      const parseNum = (v: string): number => {
        const cleaned = v.replace(/[^0-9.\-]/g, '');
        return parseFloat(cleaned) || 0;
      };
      rows.push({
        poppo_id: cols[0],
        nickname: cols[1],
        solo_live_duration: cols[2] || '00:00:00',
        party_live_duration: cols[3] || '00:00:00',
        total_point: parseNum(cols[4]),
        agent_commission: parseNum(cols[5]),
        solo_live_earnings: parseNum(cols[6]),
        party_live_earnings: parseNum(cols[7]),
        private_chat: parseNum(cols[8]),
        tips: parseNum(cols[9]),
        platform_reward: parseNum(cols[10]),
        other_earnings: parseNum(cols[11]),
        platform_salary: parseNum(cols[12]),
        super_salary: parseNum(cols[13]),
        super_rank: parseNum(cols[14]),
        stream_level: parseNum(cols[15]),
      });
    }
    return rows;
  },

  /** 2. Preview — match CSV rows with users collection */
  async buildPreview(rows: ParsedCSVRow[]): Promise<PreviewRow[]> {
    const usersSnap = await getDocs(collection(db, USERS_COL));
    const userMap = new Map<string, string>();
    usersSnap.docs.forEach(d => {
      const data = d.data();
      userMap.set(d.id, data.nickname || data.name || '');
    });
    return rows.map(r => {
      const matchedNickname = userMap.get(r.poppo_id) || null;
      return {
        poppo_id: r.poppo_id,
        csvNickname: r.nickname,
        matchedNickname,
        matched: matchedNickname !== null,
      };
    });
  },

  /** 3. Save financial report to agent_financial_reports */
  async saveReport(
    row: ParsedCSVRow,
    agentId: string,
    reportType: 'Monthly' | 'Weekly' | 'Daily',
    fromDate: string,
    toDate: string,
    loggedInName: string,
  ): Promise<string> {
    const docId = generateDocId(agentId, reportType, fromDate);
    const durationToMinutes = (d: string): number => {
      const parts = d.split(':');
      if (parts.length === 3) return parseInt(parts[0]) * 60 + parseInt(parts[1]) + Math.round(parseInt(parts[2]) / 60);
      if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      return parseInt(parts[0]) || 0;
    };
    const soloMin = durationToMinutes(row.solo_live_duration);
    const partyMin = durationToMinutes(row.party_live_duration);
    const report: AgentFinancialReport = {
      agent_id: agentId,
      poppo_id: row.poppo_id,
      nickname: row.nickname,
      type: reportType,
      solo_live_duration: row.solo_live_duration,
      party_live_duration: row.party_live_duration,
      total_point: row.total_point,
      agent_commission: row.agent_commission,
      solo_live_earnings: row.solo_live_earnings,
      party_live_earnings: row.party_live_earnings,
      private_chat: row.private_chat,
      tips: row.tips,
      platform_reward: row.platform_reward,
      other_earnings: row.other_earnings,
      platform_salary: row.platform_salary,
      super_salary: row.super_salary,
      super_rank: row.super_rank,
      stream_level: row.stream_level,
      total_incentives: row.super_salary + row.super_rank,
      total_duration: soloMin + partyMin,
      total_earnings: row.total_point + row.super_salary + row.super_rank,
      from_date: fromDate,
      to_date: toDate,
      created_at: now(),
      updated_at: now(),
    };
    await setDoc(doc(db, AGENT_REPORTS_COL, docId), report, { merge: false });
    return docId;
  },

  /** 4. Get all agents for Director dropdown */
  async getAgentList(): Promise<{ poppo_id: string; nickname: string }[]> {
    const q = query(collection(db, USERS_COL), where('role', '==', 'Agent'));
    const snap = await getDocs(q);
    const agents: { poppo_id: string; nickname: string }[] = [];
    snap.docs.forEach(d => {
      const data = d.data();
      agents.push({ poppo_id: d.id, nickname: data.nickname || data.name || d.id });
    });
    return agents.sort((a, b) => a.nickname.localeCompare(b.nickname));
  },

  /** 5. Provision — create user_registration or users directly */
  async provisionUser(
    row: ProvisionRow,
    loggedInRole: string,
    loggedInName: string,
    agentId: string,
    action: 'add_now' | 'add_later',
  ): Promise<void> {
    if (loggedInRole.toLowerCase() === 'director' && action === 'add_now') {
      const userDoc: Record<string, any> = {
        agent_id: agentId,
        id: row.poppo_id,
        poppo_id: row.poppo_id,
        nickname: row.nickname,
        role: row.role,
        password: '1212',
        is_temp_password: true,
        googleUid: '',
        last_login: '',
        isActive: true,
        status: 'Active',
        level: row.role === 'Manager' ? 65 : row.role === 'Admin' ? 55 : 30,
        profile_photo: '',
        updated_at: now(),
        email: '',
        notificationRequestedByDirector: true,
        fcmTokens: [],
        is_first_time: true,
      };
      await setDoc(doc(db, USERS_COL, row.poppo_id), userDoc);
    } else {
      const reg: UserRegistration = {
        agent_id: agentId,
        poppo_id: row.poppo_id,
        nickname: row.nickname,
        role: row.role,
        requestedAt: now(),
        requestedByName: loggedInName,
        request_status: action === 'add_later' ? 'Add later' : 'Pending',
      };
      await addDoc(collection(db, REGISTRATIONS_COL), reg);
    }
  },

  /** 6. Get upload history tree */
  async getUploadHistory(agentId: string, loggedInRole: string, loggedInAgentId: string): Promise<UploadHistoryNode[]> {
    let reportsQuery;
    if (loggedInRole === 'Agent') {
      reportsQuery = query(
        collection(db, AGENT_REPORTS_COL),
        where('agent_id', '==', loggedInAgentId),
        orderBy('created_at', 'desc')
      );
    } else {
      reportsQuery = query(
        collection(db, AGENT_REPORTS_COL),
        orderBy('created_at', 'desc')
      );
    }
    const snap = await getDocs(reportsQuery);
    const reports = snap.docs.map(d => ({ id: d.id, ...d.data() as AgentFinancialReport }));

    if (loggedInRole === 'Director') {
      const agentMap = new Map<string, AgentFinancialReport[]>();
      const agentNames = new Map<string, string>();
      for (const r of reports) {
        if (!agentMap.has(r.agent_id)) agentMap.set(r.agent_id, []);
        agentMap.get(r.agent_id)!.push(r);
        if (!agentNames.has(r.agent_id) && r.nickname) agentNames.set(r.agent_id, r.nickname);
      }
      // Fetch agent nicknames from users collection for agents
      const agentList = await this.getAgentList();
      for (const a of agentList) {
        if (!agentNames.has(a.poppo_id)) agentNames.set(a.poppo_id, a.nickname);
      }
      const root: UploadHistoryNode[] = [];
      for (const [aid, areports] of agentMap) {
        const agentNode: UploadHistoryNode = {
          id: `agent_${aid}`,
          label: `${aid} ${agentNames.get(aid) || aid}`,
          children: [],
        };
        agentNode.children = this.buildTypeTree(areports);
        root.push(agentNode);
      }
      return root;
    }

    return this.buildTypeTree(reports);
  },

  /** Build type → year → month → leaf tree from flat report list */
  buildTypeTree(reports: AgentFinancialReport[]): UploadHistoryNode[] {
    const typeMap = new Map<string, AgentFinancialReport[]>();
    for (const r of reports) {
      if (!typeMap.has(r.type)) typeMap.set(r.type, []);
      typeMap.get(r.type)!.push(r);
    }
    const types = ['Daily', 'Weekly', 'Monthly'];
    const tree: UploadHistoryNode[] = [];
    for (const t of types) {
      const treports = typeMap.get(t);
      if (!treports) continue;
      const typeNode: UploadHistoryNode = { id: `type_${t}`, label: t, children: [] };
      const yearMap = new Map<string, AgentFinancialReport[]>();
      for (const r of treports) {
        const year = r.from_date ? new Date(r.from_date).getFullYear().toString() : 'Unknown';
        if (!yearMap.has(year)) yearMap.set(year, []);
        yearMap.get(year)!.push(r);
      }
      for (const [year, yreports] of yearMap) {
        const yearNode: UploadHistoryNode = { id: `year_${t}_${year}`, label: year, children: [] };
        const monthMap = new Map<string, AgentFinancialReport[]>();
        for (const r of yreports) {
          const month = r.from_date ? new Date(r.from_date).toLocaleString('default', { month: 'long' }) : 'Unknown';
          if (!monthMap.has(month)) monthMap.set(month, []);
          monthMap.get(month)!.push(r);
        }
        for (const [month, mreports] of monthMap) {
          const monthNode: UploadHistoryNode = { id: `month_${t}_${year}_${month}`, label: month, children: [] };
          for (const r of mreports) {
            const leafLabel = t === 'Daily'
              ? r.from_date
              : t === 'Weekly'
                ? `${r.from_date} - ${r.to_date}`
                : r.from_date ? new Date(r.from_date).toLocaleString('default', { month: 'long', year: 'numeric' }) : r.from_date;
            monthNode.children!.push({
              id: r.poppo_id + '_' + r.from_date,
              label: leafLabel || r.from_date,
              data: r,
            });
          }
          yearNode.children!.push(monthNode);
        }
        typeNode.children!.push(yearNode);
      }
      tree.push(typeNode);
    }
    return tree;
  },

  /** 7. Delete a report */
  async deleteReport(docId: string): Promise<void> {
    await deleteDoc(doc(db, AGENT_REPORTS_COL, docId));
  },

  /** 8. Update a report */
  async updateReport(docId: string, data: Partial<AgentFinancialReport>): Promise<void> {
    await setDoc(doc(db, AGENT_REPORTS_COL, docId), { ...data, updated_at: now() }, { merge: true });
  },

  /** 9. Get exposure count from attendance */
  async getExposureCount(poppoId: string): Promise<number> {
    try {
      const q = query(collection(db, ATTENDANCE_COL), where('attendees', 'array-contains', poppoId));
      const snap = await getDocs(q);
      return snap.size;
    } catch {
      return 0;
    }
  },

  /** 10. Get reports for overview page */
  async getReportsForOverview(agentId: string): Promise<AgentFinancialReport[]> {
    const q = query(
      collection(db, AGENT_REPORTS_COL),
      where('agent_id', '==', agentId),
      orderBy('created_at', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() as AgentFinancialReport }));
  },

  /** 11. Request agent assignment */
  async requestAgentAssignment(userId: string, nickname: string, agentId: string): Promise<void> {
    const timestamp = now();
    const docId = `assign_req_${userId}_${timestamp}`;
    await setDoc(doc(db, 'agent_assignment_requests', docId), {
      userId,
      nickname,
      agentId,
      status: 'Pending',
      requestedAt: timestamp,
    });
  },

  /** 12. Get matched nickname from users */
  async getMatchedNickname(poppoId: string): Promise<string | null> {
    try {
      const snap = await getDoc(doc(db, USERS_COL, poppoId));
      if (snap.exists()) {
        const data = snap.data();
        return data.nickname || data.name || null;
      }
      return null;
    } catch {
      return null;
    }
  },

  /** 13. Get a single user's agent_id */
  async getUserAgentId(poppoId: string): Promise<string | null> {
    try {
      const snap = await getDoc(doc(db, USERS_COL, poppoId));
      if (snap.exists()) {
        return snap.data().agent_id || null;
      }
      return null;
    } catch {
      return null;
    }
  },

  /** 14. Get all users for attendance matching */
  async getAllUsers(): Promise<{ poppo_id: string; nickname: string; role: string; agent_id?: string }[]> {
    const snap = await getDocs(collection(db, USERS_COL));
    return snap.docs.map(d => {
      const data = d.data();
      return {
        poppo_id: d.id,
        nickname: data.nickname || data.name || d.id,
        role: data.role || 'Host',
        agent_id: data.agent_id,
      };
    });
  },

  /** 15. Get attendance documents */
  async getAttendanceDocs(): Promise<{ id: string; attendees: string[] }[]> {
    const snap = await getDocs(collection(db, ATTENDANCE_COL));
    return snap.docs.map(d => ({
      id: d.id,
      attendees: d.data().attendees || [],
    }));
  },
};

import { Host, CommissionEntry, PKEntry, ExposureEntry, DirectorNote, CalendarEvent, ActivityLog, FileEntry, FanbaseHealthEntry, AppNotification, HostTask, PerformanceGoal, LivehouseRequest } from '../types';

export interface AuthState {
  level: number;
  role: string;
  name: string;
  poppo_id: string;
  nickname: string;
  status: string;
  manager_assigned: string;
  anchor_team: string;
  profile_photo: string;
  token: string;
  mockRole?: string;
  originalRole?: string;
}

const PREFIX = "nine_";

const emptyAuthState: AuthState = {
  level: 0,
  role: "",
  name: "",
  poppo_id: "",
  nickname: "",
  status: "",
  manager_assigned: "",
  anchor_team: "",
  profile_photo: "",
  token: "",
};

export const Storage = {
  getHosts: (): Host[] => JSON.parse(localStorage.getItem(`${PREFIX}hosts`) || '[]'),
  setHosts: (hosts: Host[]) => localStorage.setItem(`${PREFIX}hosts`, JSON.stringify(hosts)),

  getCommission: (): CommissionEntry[] => JSON.parse(localStorage.getItem(`${PREFIX}commission`) || '[]'),
  setCommission: (data: CommissionEntry[]) => localStorage.setItem(`${PREFIX}commission`, JSON.stringify(data)),
  clearCommission: () => localStorage.setItem(`${PREFIX}commission`, '[]'),

  getPKData: (hostId: string): PKEntry[] => JSON.parse(localStorage.getItem(`${PREFIX}pk_${hostId}`) || '[]'),
  setPKData: (hostId: string, data: PKEntry[]) => localStorage.setItem(`${PREFIX}pk_${hostId}`, JSON.stringify(data)),

  getExposures: (hostId: string): ExposureEntry[] => JSON.parse(localStorage.getItem(`${PREFIX}exp_${hostId}`) || '[]'),
  setExposures: (hostId: string, data: ExposureEntry[]) => localStorage.setItem(`${PREFIX}exp_${hostId}`, JSON.stringify(data)),

  getFanbaseHealth: (hostId: string): FanbaseHealthEntry[] => JSON.parse(localStorage.getItem(`${PREFIX}fanbase_${hostId}`) || '[]'),
  setFanbaseHealth: (hostId: string, data: FanbaseHealthEntry[]) => localStorage.setItem(`${PREFIX}fanbase_${hostId}`, JSON.stringify(data)),

  getNotes: (hostId: string): DirectorNote[] => JSON.parse(localStorage.getItem(`${PREFIX}notes_${hostId}`) || '[]'),
  setNotes: (hostId: string, data: DirectorNote[]) => localStorage.setItem(`${PREFIX}notes_${hostId}`, JSON.stringify(data)),
  deleteNote: (hostId: string, noteId: string) => {
    const notes = Storage.getNotes(hostId);
    Storage.setNotes(hostId, notes.filter(n => n.id !== noteId));
  },
  updateNote: (hostId: string, noteId: string, content: string) => {
    const notes = Storage.getNotes(hostId);
    Storage.setNotes(hostId, notes.map(n => n.id === noteId ? { ...n, content } : n));
  },

  getEvents: (): CalendarEvent[] => JSON.parse(localStorage.getItem(`${PREFIX}cal_events`) || '[]'),
  setEvents: (events: CalendarEvent[]) => localStorage.setItem(`${PREFIX}cal_events`, JSON.stringify(events)),

  getLogs: (): ActivityLog[] => JSON.parse(localStorage.getItem(`${PREFIX}activity_log`) || '[]'),
  addLog: (type: string, action: string, user: string) => {
    const logs = Storage.getLogs();
    const newLog: ActivityLog = {
      id: crypto.randomUUID(),
      type,
      action,
      user,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(`${PREFIX}activity_log`, JSON.stringify([newLog, ...logs].slice(0, 100)));
  },

  getFiles: (): FileEntry[] => JSON.parse(localStorage.getItem(`${PREFIX}files`) || '[]'),
  setFiles: (files: FileEntry[]) => localStorage.setItem(`${PREFIX}files`, JSON.stringify(files)),

  getNotifications: (): AppNotification[] => JSON.parse(localStorage.getItem(`${PREFIX}notifications`) || '[]'),
  setNotifications: (notifications: AppNotification[]) => localStorage.setItem(`${PREFIX}notifications`, JSON.stringify(notifications)),
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const notifications = Storage.getNotifications();
    const newNotification: AppNotification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    Storage.setNotifications([newNotification, ...notifications].slice(0, 50));
  },

  getTasks: (hostId: string): HostTask[] => JSON.parse(localStorage.getItem(`${PREFIX}tasks_${hostId}`) || '[]'),
  setTasks: (hostId: string, tasks: HostTask[]) => localStorage.setItem(`${PREFIX}tasks_${hostId}`, JSON.stringify(tasks)),

  getGoals: (hostId: string): PerformanceGoal[] => JSON.parse(localStorage.getItem(`${PREFIX}goals_${hostId}`) || '[]'),
  setGoals: (hostId: string, goals: PerformanceGoal[]) => localStorage.setItem(`${PREFIX}goals_${hostId}`, JSON.stringify(goals)),

  getLivehouseRequests: (): LivehouseRequest[] => JSON.parse(localStorage.getItem(`${PREFIX}livehouse_requests`) || '[]'),
  setLivehouseRequests: (requests: LivehouseRequest[]) => localStorage.setItem(`${PREFIX}livehouse_requests`, JSON.stringify(requests)),

  getAuthState(): AuthState {
    try {
      const raw = sessionStorage.getItem(`${PREFIX}auth`);
      if (!raw) return { ...emptyAuthState };

      const parsed = JSON.parse(raw);
      const state = {
        level: Number(parsed?.level || 0),
        role: String(parsed?.role || ""),
        name: String(parsed?.name || ""),
        poppo_id: String(parsed?.poppo_id || ""),
        nickname: String(parsed?.nickname || ""),
        status: String(parsed?.status || ""),
        manager_assigned: String(parsed?.manager_assigned || ""),
        anchor_team: String(parsed?.anchor_team || ""),
        profile_photo: String(parsed?.profile_photo || ""),
        token: String(parsed?.token || ""),
      };

      const mockUserStr = sessionStorage.getItem(`${PREFIX}mock_user`);
      if (mockUserStr) {
        try {
          const mockUser = JSON.parse(mockUserStr);
          return {
            ...state,
            originalRole: state.role,
            role: String(mockUser.role || '').toLowerCase(),
            mockRole: String(mockUser.role || '').toLowerCase(),
            poppo_id: mockUser.poppo_id,
            nickname: mockUser.nickname || mockUser.name,
            name: mockUser.name || mockUser.nickname,
          };
        } catch (e) {
          // ignore
        }
      }

      const mockRole = sessionStorage.getItem(`${PREFIX}mock_role`);
      if (mockRole) {
        return {
          ...state,
          originalRole: state.role,
          role: mockRole,
          mockRole: mockRole,
        };
      }

      return state;
    } catch {
      return { ...emptyAuthState };
    }
  },

  setAuthState(state: Partial<AuthState>) {
    const nextState: AuthState = {
      ...emptyAuthState,
      ...state,
      level: Number(state?.level || 0),
      role: String(state?.role || ""),
      name: String(state?.name || ""),
      poppo_id: String(state?.poppo_id || ""),
      nickname: String(state?.nickname || ""),
      status: String(state?.status || ""),
      manager_assigned: String(state?.manager_assigned || ""),
      anchor_team: String(state?.anchor_team || ""),
      profile_photo: String(state?.profile_photo || ""),
      token: String(state?.token || ""),
    };

    sessionStorage.setItem(`${PREFIX}auth`, JSON.stringify(nextState));
  },

  setMockRole(role: string | null) {
    if (role) {
      sessionStorage.setItem(`${PREFIX}mock_role`, role);
    } else {
      sessionStorage.removeItem(`${PREFIX}mock_role`);
    }
  },

  setMockUser(user: any | null) {
    if (user) {
      sessionStorage.setItem(`${PREFIX}mock_user`, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(`${PREFIX}mock_user`);
      sessionStorage.removeItem(`${PREFIX}mock_role`);
    }
  },

  clearAuthState() {
    sessionStorage.removeItem(`${PREFIX}auth`);
    sessionStorage.removeItem(`${PREFIX}mock_role`);
    sessionStorage.removeItem(`${PREFIX}mock_user`);
  },
};

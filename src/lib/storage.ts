import { Host, CommissionEntry, PKEntry, ExposureEntry, DirectorNote, CalendarEvent, ActivityLog, FileEntry, FanbaseHealthEntry, AppNotification, HostTask, PerformanceGoal } from '../types';

const PREFIX = 'nine_';

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
    const normalizedType = type.toUpperCase() as any;
    const newLog: ActivityLog = {
      id: crypto.randomUUID(),
      type: normalizedType,
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

  // Auth State (session only)
  getAuthState: () => {
    const state = sessionStorage.getItem(`${PREFIX}auth`);
    return state ? JSON.parse(state) : { level: 0, role: '', name: '', poppo_id: '', team: '', manager: '' };
  },
  setAuthState: (state: { level: number; role: string; name: string; poppo_id: string; team: string; manager: string }) => {
    sessionStorage.setItem(`${PREFIX}auth`, JSON.stringify(state));
  }
};

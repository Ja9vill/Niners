import { ActivityLog, CommissionEntry, Host, PKEntry, ExposureEntry, VersionLog } from '../types';

// Client-side wrapper for Sheet operations proxied through the server
export const SheetService = {
  // Common error handler
  async handleResponse(response: Response) {
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Sheet operation failed');
    }
    return response.json();
  },

  // Auth - Validate Poppo ID and password against DATA MASTERSHEET
  async validateLogin(poppoId: string, password: string): Promise<Host | null> {
    const res = await fetch('/api/sheets/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poppoId, password })
    });
    const data = await this.handleResponse(res);
    return data.user;
  },

  // Roster Management
  async getRoster(): Promise<Host[]> {
    const res = await fetch('/api/sheets/roster');
    const data = await this.handleResponse(res);
    return data.hosts;
  },

  async updateHost(host: Host): Promise<void> {
    const res = await fetch('/api/sheets/roster/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host })
    });
    await this.handleResponse(res);
  },

  async saveHosts(hosts: Host[]): Promise<void> {
    const res = await fetch('/api/sheets/roster/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hosts })
    });
    await this.handleResponse(res);
  },

  // Financial Data
  async getCommissions(month?: string): Promise<CommissionEntry[]> {
    const url = month ? `/api/sheets/commissions?month=${month}` : '/api/sheets/commissions';
    const res = await fetch(url);
    const data = await this.handleResponse(res);
    return data.commissions;
  },

  async saveCommissions(commissions: CommissionEntry[]): Promise<void> {
    const res = await fetch('/api/sheets/commissions/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commissions })
    });
    await this.handleResponse(res);
  },

  async deleteCommissionsByMonth(month: string): Promise<void> {
    const res = await fetch(`/api/sheets/commissions/delete?month=${month}`, { method: 'DELETE' });
    await this.handleResponse(res);
  },

  // Logs (FEEDS & VERSION CONTROL)
  async saveLog(log: ActivityLog): Promise<void> {
    const res = await fetch('/api/sheets/logs/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log })
    });
    await this.handleResponse(res);
  },

  async saveVersionLog(log: VersionLog): Promise<void> {
    const res = await fetch('/api/sheets/logs/version', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log })
    });
    await this.handleResponse(res);
  },

  async getAllLogs(): Promise<ActivityLog[]> {
    const res = await fetch('/api/sheets/logs/activity');
    const data = await this.handleResponse(res);
    return data.logs;
  },

  // Notes Management (backed by Sheets)
  async getNotesByHost(hostId: string): Promise<any[]> {
    const res = await fetch(`/api/sheets/notes?hostId=${hostId}`);
    const data = await this.handleResponse(res);
    return data.notes;
  },

  async saveNote(note: any): Promise<void> {
    const res = await fetch('/api/sheets/notes/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note })
    });
    await this.handleResponse(res);
  },

  async deleteNote(noteId: string): Promise<void> {
    const res = await fetch(`/api/sheets/notes/delete?noteId=${noteId}`, { method: 'DELETE' });
    await this.handleResponse(res);
  },

  // PK & Exposure
  async savePKRecords(records: PKEntry[]): Promise<void> {
    const res = await fetch('/api/sheets/pk/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records })
    });
    await this.handleResponse(res);
  },

  async saveExposures(records: ExposureEntry[]): Promise<void> {
    const res = await fetch('/api/sheets/exposure/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records })
    });
    await this.handleResponse(res);
  },

  // Reset Requests
  async getResetRequests(): Promise<any[]> {
    const res = await fetch('/api/sheets/resets');
    const data = await this.handleResponse(res);
    return data.requests;
  },

  async createResetRequest(req: any): Promise<void> {
    const res = await fetch('/api/sheets/resets/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: req })
    });
    await this.handleResponse(res);
  },

  async resolveResetRequest(reqId: string): Promise<void> {
    const res = await fetch(`/api/sheets/resets/resolve?reqId=${reqId}`, { method: 'POST' });
    await this.handleResponse(res);
  }
};

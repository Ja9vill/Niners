import { getCachedSheetsToken } from './firebase';
import { Host, CommissionEntry } from '../types';

export const SheetsService = {
  /**
   * Helper to make authorized requests to Google API
   */
  async request(url: string, options: RequestInit = {}) {
    const token = getCachedSheetsToken();
    if (!token) {
      throw new Error('Google Sheets credentials are not active. Please click "Connect Google Sheets" first.');
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errText = await response.text();
      let errorMsg = 'Google Sheets API error';
      try {
        const errJson = JSON.parse(errText);
        errorMsg = errJson.error?.message || errorMsg;
      } catch {
        errorMsg = errText || errorMsg;
      }
      throw new Error(errorMsg);
    }

    return response.json();
  },

  /**
   * Parse Spreadsheet ID from various formats (URL or raw ID)
   */
  parseSpreadsheetId(input: string): string {
    const trimmed = input.trim();
    if (trimmed.includes('docs.google.com/spreadsheets')) {
      // Extract from URL: /spreadsheets/d/[ID]/
      const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
    return trimmed;
  },

  /**
   * Get sheet metadata or test if sheet is accessible
   */
  async getSpreadsheet(spreadsheetId: string) {
    const id = this.parseSpreadsheetId(spreadsheetId);
    return this.request(`https://sheets.googleapis.com/v4/spreadsheets/${id}`);
  },

  /**
   * Fetch data from spreadsheet, converting the output array of arrays to objects using headers in index 0
   */
  async fetchSheetRows(spreadsheetId: string, range: string): Promise<any[]> {
    const id = this.parseSpreadsheetId(spreadsheetId);
    let resolvedRange = range ? range.trim() : 'Sheet1';
    if (resolvedRange.includes('!') && !resolvedRange.includes(':')) {
      resolvedRange = `${resolvedRange}:Z5000`;
    }
    // Request raw values
    const data = await this.request(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(resolvedRange)}`);
    const values: string[][] = data.values;

    if (!values || values.length === 0) {
      return [];
    }

    const headers = values[0].map(h => String(h || '').trim());
    const rows: any[] = [];

    for (let i = 1; i < values.length; i++) {
      const rowVal = values[i];
      const rowObj: any = {};
      headers.forEach((header, idx) => {
        if (header) {
          rowObj[header] = rowVal[idx] !== undefined ? rowVal[idx] : '';
        }
      });
      rows.push(rowObj);
    }

    return rows;
  },

  /**
   * Create a brand new Google Spreadsheet
   */
  async createSpreadsheet(title: string): Promise<{ id: string; url: string }> {
    const data = await this.request('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      body: JSON.stringify({
        properties: {
          title: title,
        },
      }),
    });

    return {
      id: data.spreadsheetId,
      url: data.spreadsheetUrl,
    };
  },

  /**
   * Write full dataset to spreadsheet
   */
  async writeSheetValues(spreadsheetId: string, range: string, values: any[][]) {
    const id = this.parseSpreadsheetId(spreadsheetId);
    return this.request(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      body: JSON.stringify({
        range: range,
        majorDimension: 'ROWS',
        values: values,
      }),
    });
  },

  /**
   * Export the Niners Roster to a newly created Google Sheet
   */
  async exportRosterToNewSheet(hosts: Host[], title: string = 'Niners Agency - Active Roster'): Promise<{ id: string; url: string }> {
    const { id, url } = await this.createSpreadsheet(title);

    const headers = [
      'Poppo ID', 'Nickname', 'Position', 'Role', 'Status', 
      'Manager Assigned', 'Anchor / Team', 'Tier', 'Level', 'Biography'
    ];

    const rows = hosts.map(h => [
      h.id || '',
      h.name || h.nickname || '',
      h.role || 'Talent',
      h.role || 'Host',
      h.status || 'Active',
      h.manager || 'Unassigned',
      h.team || 'Unassigned',
      h.tier || 'X',
      String(h.level || 1),
      h.description || ''
    ]);

    await this.writeSheetValues(id, 'Sheet1!A1', [headers, ...rows]);
    return { id, url };
  },

  /**
   * Export Niners Commissions to a newly created Google Sheet
   */
  async exportCommissionsToNewSheet(commissions: CommissionEntry[], month: string, title: string = `Niners Commission Export - ${month}`): Promise<{ id: string; url: string }> {
    const { id, url } = await this.createSpreadsheet(title);

    const headers = [
      'Poppo ID', 'Nickname', 'Month', 'Live Duration (Min)', 'Video Duration (Min)',
      'Total Points', 'Agent Commission Earning', 'Live Earnings', 'Video Earnings',
      'Private Chat', 'Tips', 'Platform Reward', 'Other Earnings', 'Platform Hourly Salary',
      'My Commission'
    ];

    const rows = commissions.map(c => [
      c.poppo_id || '',
      c.poppo_name || '',
      c.month || month,
      String(c.live_duration || 0),
      String(c.video_duration || 0),
      String(c.total_points || 0),
      String(c.agentweb_commission_earning || 0),
      String(c.live_earnings || 0),
      String(c.video_earnings || 0),
      String(c.private_chat || 0),
      String(c.tips || 0),
      String(c.platform_reward || 0),
      String(c.other_earn || 0),
      String(c.platform_hourly_salary || 0),
      String(c.my_commission || 0)
    ]);

    await this.writeSheetValues(id, 'Sheet1!A1', [headers, ...rows]);
    return { id, url };
  },

  /**
   * Import the Niners Roster from an existing Google Sheet
   */
  async importRosterFromSheet(spreadsheetId: string, range: string): Promise<Host[]> {
    const rows = await this.fetchSheetRows(spreadsheetId, range);
    if (!rows || rows.length === 0) {
      return [];
    }

    return rows.map(row => {
      // Helper to find case-insensitive keys
      const findVal = (possibleKeys: string[]) => {
        const key = Object.keys(row).find(k => 
          possibleKeys.includes(k.trim()) || 
          possibleKeys.includes(k.trim().toLowerCase())
        );
        return key ? row[key] : undefined;
      };

      const id = String(findVal(['Poppo ID', 'poppo_id', 'id', 'UID', 'Id']) || '').trim();
      const nickname = String(findVal(['Nickname', 'nickname', 'Nick']) || '').trim();
      const name = String(findVal(['Name', 'name', 'host_name']) || nickname || 'Unnamed').trim();
      
      const role = (findVal(['Position', 'position', 'pos', 'Role', 'role']) || 'Talent') as any;
      const status = (findVal(['Status', 'status']) || 'Active') as any;
      const manager = String(findVal(['Manager Assigned', 'manager_assigned', 'manager', 'Manager']) || 'Unassigned').trim();
      const team = String(findVal(['Anchor / Team', 'anchor_team', 'team', 'Team', 'Anchor']) || 'Alpha').trim();
      const tier = (findVal(['Tier', 'tier']) || 'X') as any;
      const level = Number(findVal(['Level', 'level', 'lvl']) || 1);
      const bio = String(findVal(['Biography', 'biography', 'Bio', 'Profile Bio', 'description']) || '').trim();

      return {
        id,
        name: name || nickname || 'Unknown Host',
        nickname: nickname || name,
        role,
        status,
        manager,
        team,
        tier,
        level,
        description: bio,
        anchor_type: (team.includes('External') ? 'External' : team.includes('Sub') ? 'Sub Agency' : 'Nine Agency') as any,
        base_salary_category: (tier === 'Star Host' ? 'Star Host' : tier === 'Rocket Host' ? 'Rocket Host' : tier === 'S idol' ? 'S idol' : tier === 'Esports Host' ? 'ESport Host' : 'N/A') as any,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        password: '1234',
        is_temp_password: true
      };
    }).filter(h => h.id && h.id !== 'undefined' && h.id !== 'null' && h.id !== '');
  },

  /**
   * Export Weekly Reports to a newly created Google Sheet matching LIVE DATA WEEKLY REPORTING SHEET
   */
  async exportWeeklyReportsToNewSheet(reports: any[], title: string = 'Niners Weekly Performance Report'): Promise<{ id: string; url: string }> {
    const { id, url } = await this.createSpreadsheet(title);

    const headers = [
      'From Date', 'To Date', 'Poppo ID', 'Nickname', 'Total Duration', 'Total Earnings',
      'Average Online Users', 'New Fans', 'New Fanclub Members', 'Gifting Count', 'Unfollowers',
      'Total Points', 'Notes'
    ];

    const rows = reports.map(r => [
      r.fromDate || r.from_date || '',
      r.toDate || r.to_date || '',
      r.poppoId || r.poppo_id || '',
      r.nickname || r.poppo_name || '',
      String(r.totalDuration || r.total_duration || 0),
      String(r.totalEarnings || r.total_earnings || 0),
      String(r.averageOnlineUsers || r.average_online_users || 0),
      String(r.newFans || r.new_fans || 0),
      String(r.newFanclubMembers || r.new_fanclub_members || 0),
      String(r.giftingCount || r.gifting_count || 0),
      String(r.unfollowers || r.un_followers || 0),
      String(r.totalPoints || r.total_points || 0),
      r.notes || ''
    ]);

    await this.writeSheetValues(id, 'Sheet1!A1', [headers, ...rows]);
    return { id, url };
  },

  /**
   * Import Weekly Reports from Google Sheet
   */
  async importWeeklyReportsFromSheet(spreadsheetId: string, range: string): Promise<any[]> {
    const rows = await this.fetchSheetRows(spreadsheetId, range);
    if (!rows || rows.length === 0) {
      return [];
    }

    return rows.map(row => {
      const findVal = (possibleKeys: string[]) => {
        const key = Object.keys(row).find(k => 
          possibleKeys.includes(k.trim()) || 
          possibleKeys.includes(k.trim().toLowerCase())
        );
        return key ? row[key] : undefined;
      };

      return {
        fromDate: String(findVal(['From Date', 'from_date', 'FromDate', 'start_date', 'Start Date']) || '').trim(),
        toDate: String(findVal(['To Date', 'to_date', 'ToDate', 'end_date', 'End Date']) || '').trim(),
        poppoId: String(findVal(['Poppo ID', 'poppo_id', 'PoppoID', 'id', 'id_number']) || '').trim(),
        nickname: String(findVal(['Nickname', 'nickname', 'Name', 'poppo_name']) || '').trim(),
        totalDuration: Number(findVal(['Total Duration', 'total_duration', 'duration', 'Live Duration (Min)', 'hours']) || 0),
        totalEarnings: Number(findVal(['Total Earnings', 'total_earnings', 'earnings']) || 0),
        averageOnlineUsers: Number(findVal(['Average Online Users', 'average_online_users', 'average_users', 'avg_users']) || 0),
        newFans: Number(findVal(['New Fans', 'new_fans', 'fans_gained']) || 0),
        newFanclubMembers: Number(findVal(['New Fanclub Members', 'new_fanclub_members', 'fanclub_members']) || 0),
        giftingCount: Number(findVal(['Gifting Count', 'gifting_count', 'gifts']) || 0),
        unfollowers: Number(findVal(['Unfollowers', 'unfollowers', 'followers_lost']) || 0),
        totalPoints: Number(findVal(['Total Points', 'total_points', 'points']) || 0),
        notes: String(findVal(['Notes', 'notes', 'comment', 'Remarks']) || '').trim()
      };
    }).filter(r => r.poppoId && r.poppoId !== '');
  }
};

// ─────────────────────────────────────────────────────────────────
// LIVEHOUSE MATRIX SERVICE
// Fetches from the deployed Google Apps Script Web App which reads
// the CALENDAR dashboard sheet and exposes slot_1 / slot_2 per day/timeslot.
// Script URL: https://script.google.com/macros/s/AKfycbxLZMz62Ju2RCQAOJrMyuwaiT_sd-m3--uhTqzABO6Es6l3XEUnZlD54rsBxi2zdpyBIQ/exec
// ─────────────────────────────────────────────────────────────────

export const LIVEHOUSE_MATRIX_URL =
  'https://script.google.com/macros/s/AKfycbxLZMz62Ju2RCQAOJrMyuwaiT_sd-m3--uhTqzABO6Es6l3XEUnZlD54rsBxi2zdpyBIQ/exec';

/** One row as returned by doGet — primary and failover shapes are identical */
export interface LivehouseMatrixRow {
  source_origin: 'CALENDAR_DASHBOARD' | 'FAILOVER_MONTH_TAB_BACKUP';
  date_label: string;   // e.g. "June 10, 2026"
  day: number;          // 1–31
  timeslot: string;     // e.g. "12:00AM-1:00AM"
  slot_1: { available: boolean; poppo_id: string };
  slot_2: { available: boolean; poppo_id: string };
  fully_booked: boolean;
}

export interface LivehouseMatrixResponse {
  status: 'success' | 'error';
  schedule: LivehouseMatrixRow[];
  message?: string;
}

/**
 * Converts an API timeslot string ("12:00AM-1:00AM") to the Manila-time
 * display format used throughout the UI ("12:00 AM - 01:00 AM (Manila Time)").
 *
 * Mirrors the normalizeTimeString logic from the Apps Script while producing
 * a human-readable 12-hour display label instead of a numeric key.
 */
export function normalizeLivehouseTimeslot(apiSlot: string): string {
  if (!apiSlot) return apiSlot;

  const clean = apiSlot
    .toUpperCase()
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/\s+/g, '');

  // Split on the dash between end of first time and start of second
  // e.g. "12:00AM-1:00AM" -> ["12:00AM", "1:00AM"]
  // Handle midnight wrap: "23:00PM-12:00AM"
  const match = clean.match(/^(\d{1,2}(?::\d{2})?(?:AM|PM))-(\d{1,2}(?::\d{2})?(?:AM|PM))$/);
  if (!match) return apiSlot;

  const formatHalf = (s: string): string => {
    const isPM = s.endsWith('PM');
    const suffix = isPM ? 'PM' : 'AM';
    const digits = s.replace(/[^0-9:]/g, '');
    const [hStr, mStr = '00'] = digits.split(':');
    const hh = String(parseInt(hStr, 10) || 0).padStart(2, '0');
    const mm = String(parseInt(mStr, 10) || 0).padStart(2, '0');
    return `${hh}:${mm} ${suffix}`;
  };

  return `${formatHalf(match[1])} - ${formatHalf(match[2])} (Manila Time)`;
}

export const LivehouseMatrixService = {
  /**
   * Fetch the full livehouse schedule from the Google Apps Script endpoint.
   * Non-throwing — returns [] on any network or parse error.
   */
  async fetchSchedule(): Promise<LivehouseMatrixRow[]> {
    try {
      const res = await fetch(LIVEHOUSE_MATRIX_URL, { cache: 'no-store' });
      if (!res.ok) {
        console.warn('[LivehouseMatrix] HTTP error:', res.status);
        return [];
      }
      const json: LivehouseMatrixResponse = await res.json();
      if (json.status !== 'success' || !Array.isArray(json.schedule)) {
        console.warn('[LivehouseMatrix] Unexpected payload:', json);
        return [];
      }
      return json.schedule;
    } catch (err) {
      console.error('[LivehouseMatrix] Fetch failed:', err);
      return [];
    }
  },

  /**
   * Returns all rows for a given YYYY-MM-DD date string.
   * Converts it to "Month D, YYYY" to match date_label from the API.
   */
  filterByDate(schedule: LivehouseMatrixRow[], date: string): LivehouseMatrixRow[] {
    let label = date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const d = new Date(date + 'T00:00:00');
      label = d.toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      });
    }
    return schedule.filter(row => row.date_label === label);
  },

  /**
   * Returns all rows where a specific Poppo ID occupies slot_1 or slot_2.
   */
  filterByPoppoId(schedule: LivehouseMatrixRow[], poppoId: string): LivehouseMatrixRow[] {
    const id = String(poppoId).trim();
    return schedule.filter(
      row =>
        String(row.slot_1?.poppo_id || '').trim() === id ||
        String(row.slot_2?.poppo_id || '').trim() === id
    );
  },

  /**
   * Availability summary for a specific YYYY-MM-DD date, one entry per timeslot.
   * Drives the CalendarTab reservation modal's slot picker.
   */
  getDateAvailability(
    schedule: LivehouseMatrixRow[],
    date: string
  ): Array<{
    timeslot: string;        // raw API string, e.g. "14:00PM-15:00PM"
    manilaLabel: string;     // display string, e.g. "02:00 PM - 03:00 PM (Manila Time)"
    slot1Available: boolean;
    slot1PoppoId: string;
    slot2Available: boolean;
    slot2PoppoId: string;
    fullyBooked: boolean;
  }> {
    return this.filterByDate(schedule, date).map(row => ({
      timeslot:       row.timeslot,
      manilaLabel:    normalizeLivehouseTimeslot(row.timeslot),
      slot1Available: row.slot_1.available,
      slot1PoppoId:   row.slot_1.poppo_id,
      slot2Available: row.slot_2.available,
      slot2PoppoId:   row.slot_2.poppo_id,
      fullyBooked:    row.fully_booked,
    }));
  },
};

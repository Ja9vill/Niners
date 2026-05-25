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
      h.position || 'Talent',
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
      
      const position = (findVal(['Position', 'position', 'pos']) || 'Talent') as any;
      const role = (findVal(['Role', 'role']) || position) as any;
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
        position,
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

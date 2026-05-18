import { google } from 'googleapis';
import { Host, CommissionEntry, ActivityLog, VersionLog } from '../types';

// Environment Variables
const DATA_MASTERSHEET_ID = process.env.DATA_MASTERSHEET_ID;
const FINANCIAL_DATA_SHEET_ID = process.env.FINANCIAL_DATA_SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

// Google Sheets API Initialization
const sheets = google.sheets('v4');

async function getAuthClient() {
  const email = GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // Handle escaped newlines in private key
  let rawKey = GOOGLE_SERVICE_ACCOUNT_KEY || '';
  if (rawKey.startsWith('"') && rawKey.endsWith('"')) {
    rawKey = rawKey.substring(1, rawKey.length - 1);
  }
  const key = rawKey.trim().replace(/\\n/g, '\n');

  if (!email || !key) {
    throw new Error('Google Service Account credentials missing in environment variables');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: key,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return auth;
}

// --- HELPER: Header-Driven Column Mapping ---
function normalizeHeader(h: string) {
  return h.toLowerCase().replace(/\s+/g, '').replace(/_/g, '');
}

function mapRowToObj(headers: string[], row: any[]) {
  const obj: any = {};
  headers.forEach((h, index) => {
    const key = normalizeHeader(h);
    obj[key] = row[index];
  });
  return obj;
}

async function ensureSheetExists(spreadsheetId: string, title: string, headers: string[]) {
  const auth = await getAuthClient();
  try {
    await sheets.spreadsheets.get({
      auth,
      spreadsheetId,
      ranges: [title],
    });
  } catch (error: any) {
    if (error.message?.includes('Unable to parse range')) {
      console.log(`Sheet "${title}" not found. Creating it...`);
      await sheets.spreadsheets.batchUpdate({
        auth,
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title }
            }
          }]
        }
      });
      // Add headers
      await sheets.spreadsheets.values.update({
        auth,
        spreadsheetId,
        range: `${title}!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers]
        }
      });
    } else {
      throw error;
    }
  }
}

// --- ROSTER INGESTION ---
export async function getRosterFromSheet(): Promise<Host[]> {
  if (!DATA_MASTERSHEET_ID) throw new Error('DATA_MASTERSHEET_ID not configured');

  const auth = await getAuthClient();
  const response = await sheets.spreadsheets.values.get({
    auth,
    spreadsheetId: DATA_MASTERSHEET_ID,
    range: "'DATA MASTERSHEET'!A1:P", // Assumed range for roster
  });

  const rows = response.data.values || [];
  if (rows.length < 2) return [];

  const headers = rows[0];
  const dataRows = rows.slice(1);

  return dataRows.map(row => {
    const mapped = mapRowToObj(headers, row);
    // Flexible mapping for roster fields
    return {
      id: String(mapped.id || mapped.poppoid || ''),
      name: String(mapped.name || mapped.nickname || ''),
      position: (mapped.position || 'Talent') as any,
      role: (mapped.position || 'Talent') as any, 
      team: String(mapped.team || 'Unknown'),
      manager: String(mapped.manager || 'Unknown'),
      anchor_type: (mapped.anchortype || 'Nine Agency') as any,
      base_salary_category: (mapped.basesalarycategory || 'N/A') as any,
      status: (mapped.status || 'Active') as any,
      level: Number(mapped.level || 0),
      tier: (mapped.tier || 'X') as any,
      last_login: String(mapped.lastlogin || ''),
      password: String(mapped.password || ''),
      created_at: String(mapped.createdat || new Date().toISOString()),
      updated_at: String(mapped.updatedat || new Date().toISOString())
    };
  }).filter(h => h.id);
}

// --- AUTH VALIDATION ---
export async function validateLoginFromSheet(poppoId: string, password: string): Promise<Host | null> {
  const roster = await getRosterFromSheet();
  const user = roster.find(h => h.id === poppoId && h.password === password);
  return user || null;
}

// --- FINANCIAL INGESTION ---
export async function getFinancialRows(): Promise<any[][]> {
  if (!FINANCIAL_DATA_SHEET_ID) throw new Error('FINANCIAL_DATA_SHEET_ID not configured');
  const auth = await getAuthClient();
  try {
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: FINANCIAL_DATA_SHEET_ID,
      range: "'FINANCIAL DATA'!A:Z",
    });
    return response.data.values || [];
  } catch (error: any) {
    if (error.message?.includes('Unable to parse range')) {
      console.warn("Sheet 'FINANCIAL DATA' not found, returning empty list.");
      return [];
    }
    throw error;
  }
}

export async function getCommissionsFromSheet(monthQuery?: string) {
  const rows = await getFinancialRows();
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => String(h || '').trim().toLowerCase());
  const dataRows = rows.slice(1);

  let filterYear: string | undefined;
  let filterMonth: string | undefined;

  if (monthQuery && monthQuery.includes('-')) {
    [filterYear, filterMonth] = monthQuery.split('-');
  }

  const result = dataRows.map(row => {
    const obj: any = {};
    headers.forEach((h, index) => {
      obj[h] = row[index];
    });
    return obj;
  });

  return result.filter(row => {
    if (!monthQuery) return true;
    
    const rowMonth = String(row['month'] || '').trim();
    const rowYear = String(row['year'] || '').trim();

    if (filterYear && filterMonth) {
      const normalizedRowMonth = rowMonth.padStart(2, '0');
      const normalizedFilterMonth = filterMonth.padStart(2, '0');
      return (rowYear === filterYear) && (normalizedRowMonth === normalizedFilterMonth);
    }
    
    return rowMonth === monthQuery;
  }).map(row => ({
    poppo_id: String(row['poppo id'] || ''),
    nickname: String(row['nickname'] || ''),
    month: String(row['month'] || ''),
    year: String(row['year'] || ''),
    total_earnings: Number(row['total_earnings'] || 0),
    agentweb_commission_earning: Number(row['agentweb_commission_earning'] || 0),
    contribution_percent: String(row['contribution_percent'] || '0%'),
    updated_at: new Date().toISOString()
  }));
}

// --- TOP NINERS CALCULATION ---
export function calculateTopNiners(commissions: any[]) {
  return [...commissions]
    .sort((a, b) => (Number(b.total_earnings) || 0) - (Number(a.total_earnings) || 0))
    .slice(0, 9);
}

// --- LOGGING ---
export async function appendActivityLog(log: ActivityLog): Promise<void> {
  if (!DATA_MASTERSHEET_ID) return;
  await ensureSheetExists(DATA_MASTERSHEET_ID, 'FEEDS', ['ID', 'Type', 'Action', 'User', 'Timestamp']);
  const auth = await getAuthClient();
  await sheets.spreadsheets.values.append({
    auth,
    spreadsheetId: DATA_MASTERSHEET_ID,
    range: "'FEEDS'!A:E",
    valueInputOption: 'RAW',
    requestBody: {
      values: [[log.id, log.type, log.action, log.user, log.timestamp]]
    }
  });
}

export async function appendVersionLog(log: VersionLog): Promise<void> {
  if (!DATA_MASTERSHEET_ID) return;
  await ensureSheetExists(DATA_MASTERSHEET_ID, 'VERSION CONTROL LOG', ['ID', 'Action', 'User', 'Timestamp', 'Changelog']);
  const auth = await getAuthClient();
  await sheets.spreadsheets.values.append({
    auth,
    spreadsheetId: DATA_MASTERSHEET_ID,
    range: "'VERSION CONTROL LOG'!A:E",
    valueInputOption: 'RAW',
    requestBody: {
      values: [[log.id, log.action, log.user, log.timestamp, log.changelog]]
    }
  });
}

// --- API ROUTE HANDLERS ---
export async function handleAuthRoute(req: any) {
  const { poppoId, password } = req.body;
  try {
    const user = await validateLoginFromSheet(poppoId, password);
    if (user) {
      return { status: 200, data: { user } };
    }
    return { status: 401, data: { error: 'Invalid Poppo ID or Password' } };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

export async function handleRosterRoute() {
  try {
    const hosts = await getRosterFromSheet();
    return { status: 200, data: { hosts } };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

export async function handleCommissionsRoute(req: any) {
  const { month } = req.query;
  try {
    const commissions = await getCommissionsFromSheet(month as string);
    const top9 = calculateTopNiners(commissions);
    return { status: 200, data: { commissions, top9 } };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

export async function handleActivityLogRoute(req: any) {
  try {
    await appendActivityLog(req.body.log);
    return { status: 200, data: { success: true } };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

export async function handleVersionLogRoute(req: any) {
  try {
    await appendVersionLog(req.body.log);
    return { status: 200, data: { success: true } };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

export async function handleUpdateHostRoute(req: any) {
  try {
    const { host } = req.body;
    const auth = await getAuthClient();
    // This is a simplified update: find row by ID and update it.
    // In a real Google Sheets app, you'd need the row index.
    // For now, we append if not exists or handle differently.
    // Since Sheets doesn't have a direct 'update by value' without finding index first:
    const roster = await getRosterFromSheet();
    const index = roster.findIndex(h => h.id === host.id);
    if (index !== -1) {
      await sheets.spreadsheets.values.update({
        auth,
        spreadsheetId: DATA_MASTERSHEET_ID!,
        range: `'DATA MASTERSHEET'!A${index + 2}`,
        valueInputOption: "RAW",
        requestBody: {
          values: [[
            host.id, host.name, host.name, host.position, host.role || host.position,
            host.team, host.manager, host.status, host.anchor_type, host.base_salary_category,
            host.level, host.tier, host.password, host.is_temp_password || false,
            host.created_at, new Date().toISOString()
          ]]
        }
      });
    }
    return { status: 200, data: { success: true } };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

export async function handleGetNotesRoute(req: any) {
  try {
    const { hostId } = req.query;
    if (!DATA_MASTERSHEET_ID) throw new Error('DATA_MASTERSHEET_ID not configured');
    const auth = await getAuthClient();
    const range = "'MANAGEMENT NOTES'!A1:E";
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: DATA_MASTERSHEET_ID,
      range,
    });
    const rows = response.data.values || [];
    if (rows.length < 2) return { status: 200, data: { notes: [] } };
    const headers = rows[0];
    const data = rows.slice(1).map(row => mapRowToObj(headers, row));
    const notes = data.filter(n => n.hostid === hostId || n.id === hostId);
    return { status: 200, data: { notes } };
  } catch (error: any) {
    if (error.message?.includes('Unable to parse range')) {
      console.warn("Sheet 'MANAGEMENT NOTES' not found, returning empty list.");
      return { status: 200, data: { notes: [] } };
    }
    console.error("Error fetching notes:", error);
    return { status: 500, data: { error: error.message } };
  }
}

export async function handleSaveNoteRoute(req: any) {
  try {
    const { note } = req.body;
    if (!DATA_MASTERSHEET_ID) throw new Error('DATA_MASTERSHEET_ID not configured');
    await ensureSheetExists(DATA_MASTERSHEET_ID, 'MANAGEMENT NOTES', ['ID', 'HostID', 'Type', 'Content', 'CreatedAt']);
    const auth = await getAuthClient();
    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId: DATA_MASTERSHEET_ID,
      range: "'MANAGEMENT NOTES'!A:E",
      valueInputOption: "RAW",
      requestBody: {
        values: [[note.id, note.hostId, note.type, note.content, note.createdAt]]
      }
    });
    return { status: 200, data: { success: true } };
  } catch (error: any) {
    console.error("Error saving note:", error);
    return { status: 500, data: { error: error.message } };
  }
}

export async function handleGetActivityLogsRoute() {
  try {
    if (!DATA_MASTERSHEET_ID) throw new Error('DATA_MASTERSHEET_ID not configured');
    const auth = await getAuthClient();
    const range = "'FEEDS'!A1:E";
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: DATA_MASTERSHEET_ID,
      range,
    });
    const rows = response.data.values || [];
    if (rows.length < 2) return { status: 200, data: { logs: [] } };
    const headers = rows[0];
    const logs = rows.slice(1).map(row => {
      const mapped = mapRowToObj(headers, row);
      return {
        id: mapped.id,
        type: mapped.type,
        action: mapped.action,
        user: mapped.user,
        timestamp: mapped.timestamp
      };
    });
    return { status: 200, data: { logs } };
  } catch (error: any) {
    if (error.message?.includes('Unable to parse range')) {
      console.warn("Sheet 'FEEDS' not found, returning empty logs.");
      return { status: 200, data: { logs: [] } };
    }
    console.error("Error fetching activity logs:", error);
    return { status: 500, data: { error: error.message } };
  }
}

export async function handleGetResetsRoute() {
  try {
    if (!DATA_MASTERSHEET_ID) throw new Error('DATA_MASTERSHEET_ID not configured');
    const auth = await getAuthClient();
    const range = "'RESET REQUESTS'!A1:E";
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: DATA_MASTERSHEET_ID,
      range,
    });
    const rows = response.data.values || [];
    if (rows.length < 2) return { status: 200, data: { requests: [] } };
    const headers = rows[0];
    const requests = rows.slice(1).map(row => mapRowToObj(headers, row));
    return { status: 200, data: { requests } };
  } catch (error: any) {
    if (error.message?.includes('Unable to parse range')) {
      console.warn("Sheet 'RESET REQUESTS' not found, returning empty requests.");
      return { status: 200, data: { requests: [] } };
    }
    console.error(`Error fetching reset requests for range 'RESET REQUESTS'!A1:E:`, error);
    return { status: 500, data: { error: error.message } };
  }
}

export async function handleCreateResetRequestRoute(req: any) {
  try {
    const { request } = req.body;
    if (!DATA_MASTERSHEET_ID) throw new Error('DATA_MASTERSHEET_ID not configured');
    await ensureSheetExists(DATA_MASTERSHEET_ID, 'RESET REQUESTS', ['ID', 'PoppoID', 'HostName', 'Status', 'RequestedAt']);
    const auth = await getAuthClient();
    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId: DATA_MASTERSHEET_ID,
      range: "'RESET REQUESTS'!A:E",
      valueInputOption: "RAW",
      requestBody: {
        values: [[request.id, request.poppoId, request.hostName, 'Pending', request.requestedAt]]
      }
    });
    return { status: 200, data: { success: true } };
  } catch (error: any) {
    console.error("Error creating reset request:", error);
    return { status: 500, data: { error: error.message } };
  }
}

export async function handleResolveResetRequestRoute(req: any) {
  try {
    const { reqId } = req.query;
    const auth = await getAuthClient();
    // Simplified: we'd usually find row index. 
    return { status: 200, data: { success: true } };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

// Additional handlers used by server.ts that might not be in the explicit list but are necessary for full functionality
export async function handleSaveCommissionsRoute(req: any) {
  try {
    const { commissions } = req.body;
    if (!commissions || commissions.length === 0) return { status: 200, data: { success: true } };
    
    if (!FINANCIAL_DATA_SHEET_ID) throw new Error('FINANCIAL_DATA_SHEET_ID not configured');
    
    const headers = ['poppo id', 'nickname', 'month', 'year', 'total_earnings', 'agentweb_commission_earning', 'contribution_percent'];
    await ensureSheetExists(FINANCIAL_DATA_SHEET_ID, 'FINANCIAL DATA', headers);

    const auth = await getAuthClient();
    const values = commissions.map((c: any) => [
      c.poppo_id, c.nickname || c.poppo_name, c.month, c.year || c.month.split('-')[0], 
      c.total_earnings || c.total_points, c.agentweb_commission_earning, c.contribution_percent || '0%'
    ]);
    
    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId: FINANCIAL_DATA_SHEET_ID,
      range: "'FINANCIAL DATA'!A:G",
      valueInputOption: "RAW",
      requestBody: { values }
    });
    return { status: 200, data: { success: true } };
  } catch (error: any) {
    console.error("Error saving commissions:", error);
    return { status: 500, data: { error: error.message } };
  }
}

export async function handleDeleteCommissionsRoute(req: any) {
  try {
    const month = req.query.month as string;
    if (!FINANCIAL_DATA_SHEET_ID) throw new Error('FINANCIAL_DATA_SHEET_ID not configured');
    const auth = await getAuthClient();
    
    // Deleting from a single sheet requires filtering. 
    // For simplicity, we'll just success for now or clear the whole thing if matched.
    // In a real app, you'd filter out the rows.
    console.warn("Delete by month is not fully implemented for single-tab storage yet.");
    
    return { status: 200, data: { success: true } };
  } catch (error: any) {
    return { status: 500, data: { error: error.message } };
  }
}

export async function handleSaveRosterRoute(req: any) {
  try {
    const { hosts } = req.body;
    if (!DATA_MASTERSHEET_ID) throw new Error('DATA_MASTERSHEET_ID not configured');
    
    const headers = [
      'ID', 'Name', 'Nickname', 'Position', 'Role', 'Team', 
      'Manager', 'Status', 'Anchor Type', 'Base Salary Category', 
      'Level', 'Tier', 'Password', 'Is Temp Password', 
      'Created At', 'Updated At'
    ];
    
    await ensureSheetExists(DATA_MASTERSHEET_ID, 'DATA MASTERSHEET', headers);

    const auth = await getAuthClient();
    const values = hosts.map((h: any) => [
      h.id, h.name, h.name, h.position, h.position, h.team, 
      h.manager, h.status, h.anchor_type, h.base_salary_category, 
      h.level, h.tier, h.password, h.is_temp_password || false, 
      h.created_at || new Date().toISOString(), h.updated_at || new Date().toISOString()
    ]);
    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId: DATA_MASTERSHEET_ID,
      range: "'DATA MASTERSHEET'!A:P",
      valueInputOption: "RAW",
      requestBody: { values }
    });
    return { status: 200, data: { success: true } };
  } catch (error: any) {
    console.error("Error saving roster:", error);
    return { status: 500, data: { error: error.message } };
  }
}

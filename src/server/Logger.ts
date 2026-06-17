import { getAdminFirestore } from "./auth";

export type LogSeverity = 'Error' | 'Warning' | 'Info';

export interface SystemLog {
  timestamp: string;
  severity: LogSeverity;
  userRole?: string;
  userId?: string;
  actionDescription: string;
  stackTrace?: string;
}

const WEBHOOK_URL = process.env.CRITICAL_ALERT_WEBHOOK_URL || '';

/**
 * Logs an event to the system_logs Firestore collection.
 */
export async function logSystemEvent(log: Omit<SystemLog, 'timestamp'>) {
  try {
    const db = getAdminFirestore();
    const timestamp = new Date().toISOString();
    
    const logEntry: SystemLog = {
      ...log,
      timestamp
    };

    await db.collection('system_logs').add(logEntry);

    // Critical Alerting for Errors
    if (log.severity === 'Error') {
      await sendCriticalAlert(logEntry);
    }
    
    console.log(`[SystemLog] ${log.severity}: ${log.actionDescription}`);
  } catch (err) {
    console.error('Failed to write system log:', err);
  }
}

/**
 * Dispatches a critical alert via generic webhook
 */
async function sendCriticalAlert(log: SystemLog) {
  if (!WEBHOOK_URL) {
    console.warn('CRITICAL_ALERT_WEBHOOK_URL not configured. Skipping alert dispatch.');
    return;
  }
  try {
    const payload = {
      content: `🚨 **CRITICAL SYSTEM ERROR** 🚨\n**User**: ${log.userId || 'Unknown'} (${log.userRole || 'Unknown'})\n**Action**: ${log.actionDescription}\n**Time**: ${log.timestamp}\n**Stack**: ${log.stackTrace ? '```' + log.stackTrace + '```' : 'None provided'}`
    };

    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('Failed to dispatch critical alert:', err);
  }
}

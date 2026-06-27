import crypto from "crypto";

export interface AuditLogEntry {
  timestamp: string;
  hashedPoppoId: string;
  maskedPoppoId: string;
  status: "SUCCESS" | "FAILURE";
  failureReason?: string;
  ipAddress: string;
  severity: "INFO" | "WARNING";
}

/**
 * Audit log function for recording authentication events in a secure, structured format
 * optimized for Google Cloud Logging (Stackdriver).
 * Hard-coded to ignore any passwords, credentials, tokens, or PII.
 */
export function logAuthEvent(
  poppoId: string,
  status: "SUCCESS" | "FAILURE",
  ipAddress: string,
  failureReason?: "INVALID_FORMAT" | "USER_NOT_FOUND" | "INACTIVE_ACCOUNT" | "INCORRECT_PASSWORD" | "TOKEN_CREATION_FAILED" | "RATE_LIMIT_BLOCKED" | "RATE_LIMIT_TRIGGERED" | "INTERNAL_ERROR"
) {
  const timestamp = new Date().toISOString();
  
  // Clean inputs
  const cleanPoppoId = String(poppoId || "").trim();
  
  // Mask IP address (for additional privacy if needed, though standard audit logs keep client IP)
  const cleanIp = String(ipAddress || "unknown").trim();

  // Create SHA-256 hash of the Poppo ID to track distinct patterns without exposing the ID in plain text
  const hashedPoppoId = cleanPoppoId
    ? crypto.createHash("sha256").update(cleanPoppoId).digest("hex")
    : "anonymous";

  // Create a masked version for safe human triage (e.g. "1915****")
  let maskedPoppoId = "anonymous";
  if (cleanPoppoId) {
    if (cleanPoppoId.length > 4) {
      maskedPoppoId = cleanPoppoId.slice(0, 4) + "*".repeat(cleanPoppoId.length - 4);
    } else {
      maskedPoppoId = cleanPoppoId.slice(0, 1) + "*".repeat(cleanPoppoId.length - 1);
    }
  }

  // Map status to Stackdriver/Google Cloud severity field
  const severity = status === "SUCCESS" ? "INFO" : "WARNING";

  const logPayload: AuditLogEntry = {
    timestamp,
    hashedPoppoId,
    maskedPoppoId,
    status,
    ipAddress: cleanIp,
    severity,
  };

  if (failureReason) {
    logPayload.failureReason = failureReason;
  }

  // Structured JSON logged to stdout (Google Cloud Logging collects console.log as jsonPayload automatically)
  console.log(JSON.stringify({
    message: `[Auth Audit] ${status} login attempt for Poppo ID (${maskedPoppoId}) from IP: ${cleanIp}`,
    ...logPayload,
  }));
}

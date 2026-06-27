import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { logAuthEvent } from '../auditLogger';

describe('logAuthEvent', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs a SUCCESS event with correct structure', () => {
    logAuthEvent('19157913', 'SUCCESS', '192.168.1.1');

    expect(consoleSpy).toHaveBeenCalledOnce();
    const loggedStr = consoleSpy.mock.calls[0][0];
    const logged = JSON.parse(loggedStr);

    expect(logged.status).toBe('SUCCESS');
    expect(logged.severity).toBe('INFO');
    expect(logged.ipAddress).toBe('192.168.1.1');
    expect(logged.timestamp).toBeDefined();
    expect(logged.failureReason).toBeUndefined();
  });

  it('logs a FAILURE event with failure reason', () => {
    logAuthEvent('19157913', 'FAILURE', '10.0.0.1', 'INCORRECT_PASSWORD');

    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);

    expect(logged.status).toBe('FAILURE');
    expect(logged.severity).toBe('WARNING');
    expect(logged.failureReason).toBe('INCORRECT_PASSWORD');
  });

  it('hashes the Poppo ID with SHA-256', () => {
    logAuthEvent('19157913', 'SUCCESS', '127.0.0.1');

    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
    const expectedHash = crypto.createHash('sha256').update('19157913').digest('hex');

    expect(logged.hashedPoppoId).toBe(expectedHash);
  });

  it('masks the Poppo ID (shows first 4 chars + asterisks for IDs > 4 chars)', () => {
    logAuthEvent('19157913', 'SUCCESS', '127.0.0.1');

    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logged.maskedPoppoId).toBe('1915****');
  });

  it('masks short Poppo IDs (4 chars shows first 1 char + asterisks)', () => {
    logAuthEvent('123', 'SUCCESS', '127.0.0.1');

    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logged.maskedPoppoId).toBe('1**');
  });

  it('handles empty Poppo ID gracefully', () => {
    logAuthEvent('', 'FAILURE', '127.0.0.1', 'INVALID_FORMAT');

    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logged.hashedPoppoId).toBe('anonymous');
    expect(logged.maskedPoppoId).toBe('anonymous');
    expect(logged.failureReason).toBe('INVALID_FORMAT');
  });

  it('handles missing IP address', () => {
    logAuthEvent('19157913', 'SUCCESS', '');

    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
    // IP is trimmed but empty stays empty
    expect(typeof logged.ipAddress).toBe('string');
  });

  it('trims whitespace from Poppo ID', () => {
    logAuthEvent('  19157913  ', 'SUCCESS', '127.0.0.1');

    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
    const expectedHash = crypto.createHash('sha256').update('19157913').digest('hex');
    expect(logged.hashedPoppoId).toBe(expectedHash);
    expect(logged.maskedPoppoId).toBe('1915****');
  });

  it('includes a human-readable message field', () => {
    logAuthEvent('19157913', 'SUCCESS', '10.0.0.5');

    const logged = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(logged.message).toContain('[Auth Audit]');
    expect(logged.message).toContain('SUCCESS');
    expect(logged.message).toContain('1915');
    expect(logged.message).toContain('10.0.0.5');
  });
});

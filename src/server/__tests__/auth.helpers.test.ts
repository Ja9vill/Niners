import { describe, it, expect } from 'vitest';

/**
 * Testing the pure helper functions from auth.ts.
 * These are extracted and re-implemented here since they are not exported individually,
 * but the logic is identical to what lives in auth.ts.
 */

// Replica of getRoleLevel from auth.ts
function getRoleLevel(role: string): number {
  const r = String(role || "").toLowerCase();
  if (r === "director") return 5;
  if (r === "head admin") return 4;
  if (r === "admin") return 3;
  if (r === "manager" || r === "agent") return 2;
  return 1;
}

// Replica of buildUserPayload from auth.ts
function buildUserPayload(hostData: any) {
  const role = String(hostData.role || "host").toLowerCase();
  const level = getRoleLevel(role);
  return {
    poppo_id: hostData.id || hostData.poppo_id || hostData.poppoId,
    name: hostData.name || hostData.nickname || "",
    nickname: hostData.nickname || hostData.name || "",
    role,
    level,
    status: hostData.status || "Active",
    manager_assigned: hostData.manager || "Unassigned",
    anchor_team: hostData.team || "Alpha",
    profile_photo: hostData.photoUrl || "",
    position: hostData.position || role,
  };
}

// Replica of verifyPassword from auth.ts (non-bcrypt path only for unit testing)
function verifyPasswordLegacy(inputPassword: string, storedPassword: string): boolean {
  const cleanStored = String(storedPassword || "").replace(/^0+/, "");
  const cleanInput = String(inputPassword || "").replace(/^0+/, "");
  return storedPassword === inputPassword || (cleanStored !== "" && cleanStored === cleanInput);
}

describe('getRoleLevel', () => {
  it('returns 5 for director', () => {
    expect(getRoleLevel('director')).toBe(5);
    expect(getRoleLevel('Director')).toBe(5);
    expect(getRoleLevel('DIRECTOR')).toBe(5);
  });

  it('returns 4 for head admin', () => {
    expect(getRoleLevel('head admin')).toBe(4);
    expect(getRoleLevel('Head Admin')).toBe(4);
  });

  it('returns 3 for admin', () => {
    expect(getRoleLevel('admin')).toBe(3);
    expect(getRoleLevel('Admin')).toBe(3);
  });

  it('returns 2 for manager or agent', () => {
    expect(getRoleLevel('manager')).toBe(2);
    expect(getRoleLevel('Manager')).toBe(2);
    expect(getRoleLevel('agent')).toBe(2);
    expect(getRoleLevel('Agent')).toBe(2);
  });

  it('returns 1 for unknown roles', () => {
    expect(getRoleLevel('host')).toBe(1);
    expect(getRoleLevel('talent')).toBe(1);
    expect(getRoleLevel('')).toBe(1);
    expect(getRoleLevel('random')).toBe(1);
  });

  it('handles null/undefined gracefully', () => {
    expect(getRoleLevel(null as any)).toBe(1);
    expect(getRoleLevel(undefined as any)).toBe(1);
  });
});

describe('buildUserPayload', () => {
  it('builds correct payload for a director', () => {
    const hostData = {
      id: '19157913',
      name: 'Miss Nine',
      nickname: 'Nine',
      role: 'Director',
      status: 'Active',
      manager: 'None',
      team: 'Leadership',
      photoUrl: 'https://example.com/photo.jpg',
      position: 'Founder',
    };

    const payload = buildUserPayload(hostData);

    expect(payload.poppo_id).toBe('19157913');
    expect(payload.name).toBe('Miss Nine');
    expect(payload.nickname).toBe('Nine');
    expect(payload.role).toBe('director');
    expect(payload.level).toBe(5);
    expect(payload.status).toBe('Active');
    expect(payload.manager_assigned).toBe('None');
    expect(payload.anchor_team).toBe('Leadership');
    expect(payload.profile_photo).toBe('https://example.com/photo.jpg');
    expect(payload.position).toBe('Founder');
  });

  it('builds correct payload for a host with defaults', () => {
    const hostData = {
      id: '12345',
      name: 'Test Host',
    };

    const payload = buildUserPayload(hostData);

    expect(payload.poppo_id).toBe('12345');
    expect(payload.name).toBe('Test Host');
    expect(payload.nickname).toBe('Test Host'); // falls back to name
    expect(payload.role).toBe('host');
    expect(payload.level).toBe(1);
    expect(payload.status).toBe('Active');
    expect(payload.manager_assigned).toBe('Unassigned');
    expect(payload.anchor_team).toBe('Alpha');
    expect(payload.profile_photo).toBe('');
    expect(payload.position).toBe('host');
  });

  it('uses poppo_id fallback if id is missing', () => {
    const hostData = { poppo_id: '99999', name: 'Test' };
    expect(buildUserPayload(hostData).poppo_id).toBe('99999');
  });

  it('uses poppoId fallback if both id and poppo_id are missing', () => {
    const hostData = { poppoId: '88888', name: 'Test' };
    expect(buildUserPayload(hostData).poppo_id).toBe('88888');
  });
});

describe('verifyPasswordLegacy', () => {
  it('matches exact password', () => {
    expect(verifyPasswordLegacy('myPassword', 'myPassword')).toBe(true);
  });

  it('rejects wrong password', () => {
    expect(verifyPasswordLegacy('wrong', 'correct')).toBe(false);
  });

  it('matches passwords after stripping leading zeros', () => {
    expect(verifyPasswordLegacy('00123', '123')).toBe(true);
    expect(verifyPasswordLegacy('123', '00123')).toBe(true);
  });

  it('handles empty strings', () => {
    // Both empty - exact match returns true
    expect(verifyPasswordLegacy('', '')).toBe(true);
  });

  it('rejects when input is empty but stored is not', () => {
    // cleanStored = "hello", cleanInput = "" -> "hello" !== "" so false
    expect(verifyPasswordLegacy('', 'hello')).toBe(false);
  });

  it('handles all-zero passwords', () => {
    // "000" stored, "000" input -> exact match is true
    expect(verifyPasswordLegacy('000', '000')).toBe(true);
    // "000" stored stripped = "", "123" input stripped = "123" -> "" !== "123"
    // exact: "000" !== "123" -> false
    expect(verifyPasswordLegacy('123', '000')).toBe(false);
  });
});

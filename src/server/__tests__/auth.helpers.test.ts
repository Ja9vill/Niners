import { describe, it, expect } from 'vitest';
import { getRoleLevel, buildUserPayload, verifyPassword } from '../auth';

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

describe('verifyPassword', () => {
  it('matches exact plaintext password', async () => {
    expect(await verifyPassword('myPassword', 'myPassword')).toBe(true);
  });

  it('rejects wrong plaintext password', async () => {
    expect(await verifyPassword('wrong', 'correct')).toBe(false);
  });

  it('matches passwords after stripping leading zeros', async () => {
    expect(await verifyPassword('00123', '123')).toBe(true);
    expect(await verifyPassword('123', '00123')).toBe(true);
  });

  it('handles empty strings (exact match)', async () => {
    expect(await verifyPassword('', '')).toBe(true);
  });

  it('rejects when input is empty but stored is not', async () => {
    expect(await verifyPassword('', 'hello')).toBe(false);
  });

  it('handles all-zero passwords', async () => {
    expect(await verifyPassword('000', '000')).toBe(true);
    expect(await verifyPassword('123', '000')).toBe(false);
  });

  it('verifies against a bcrypt hash', async () => {
    // Pre-computed bcrypt hash of "TestPass1"
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('TestPass1', 10);
    expect(await verifyPassword('TestPass1', hash)).toBe(true);
    expect(await verifyPassword('WrongPass', hash)).toBe(false);
  });
});

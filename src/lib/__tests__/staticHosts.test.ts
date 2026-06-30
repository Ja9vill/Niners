import { describe, it, expect } from 'vitest';
import { getStaticHosts } from '../staticHosts';

describe('getStaticHosts', () => {
  const hosts = getStaticHosts();

  it('returns a non-empty array', () => {
    expect(hosts.length).toBeGreaterThan(0);
  });

  it('each host has required fields', () => {
    for (const host of hosts) {
      expect(host.id).toBeDefined();
      expect(typeof host.id).toBe('string');
      expect(host.name).toBeDefined();
      expect(typeof host.name).toBe('string');
      expect(host.role).toBeDefined();
      expect(host.level).toBeDefined();
      expect(typeof host.level).toBe('number');
      expect(host.tier).toBeDefined();
      expect(host.status).toBeDefined();
    }
  });

  it('parses Director role correctly', () => {
    const director = hosts.find(h => h.name === 'Miss Nine');
    expect(director).toBeDefined();
    expect(director!.role).toBe('Director');
    expect(director!.level).toBe(99);
    expect(director!.tier).toBe('S');
  });

  it('parses Agent role correctly', () => {
    const agents = hosts.filter(h => h.role === 'Agent');
    expect(agents.length).toBeGreaterThan(0);
    for (const agent of agents) {
      expect(agent.level).toBe(55);
      expect(agent.tier).toBe('B');
    }
  });

  it('parses Head Admin role correctly', () => {
    const headAdmin = hosts.find(h => h.name === 'Miles');
    expect(headAdmin).toBeDefined();
    expect(headAdmin!.role).toBe('Head Admin');
    expect(headAdmin!.level).toBe(80);
    expect(headAdmin!.tier).toBe('A');
  });

  it('parses Talent (Host) role correctly', () => {
    const talent = hosts.find(h => h.name === 'Alli');
    expect(talent).toBeDefined();
    expect(talent!.role).toBe('Talent');
    expect(talent!.level).toBe(30);
    expect(talent!.tier).toBe('B');
  });

  it('parses status values correctly', () => {
    const active = hosts.find(h => h.name === 'Alli');
    expect(active).toBeDefined();
    expect(active!.status).toBe('Active');

    const inactive = hosts.find(h => h.status === 'Inactive');
    expect(inactive).toBeDefined();
    expect(inactive!.status).toBe('Inactive');
  });

  it('parses base_salary_category correctly', () => {
    const alli = hosts.find(h => h.name === 'Alli');
    expect(alli).toBeDefined();
    expect(alli!.base_salary_category).toBe('S idol');

    const starHost = hosts.find(h => h.base_salary_category === 'Star Host');
    expect(starHost).toBeDefined();
    expect(starHost!.base_salary_category).toBe('Star Host');
  });

  it('parses anchor_type correctly', () => {
    const nineAgencyHost = hosts.find(h => h.name === 'Alli');
    expect(nineAgencyHost!.anchor_type).toBe('Nine Agency');
  });

  it('all hosts have isActive set to true', () => {
    for (const host of hosts) {
      expect(host.isActive).toBe(true);
    }
  });

  it('all hosts have created_at and updated_at timestamps', () => {
    for (const host of hosts) {
      expect(host.created_at).toBeDefined();
      expect(host.updated_at).toBeDefined();
    }
  });
});

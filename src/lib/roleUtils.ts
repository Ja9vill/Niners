export function normalizeRole(role: string | undefined | null): string {
  return String(role || '').toLowerCase();
}

export function isDirector(role: string | undefined | null): boolean {
  return normalizeRole(role) === 'director';
}

export function isManager(role: string | undefined | null): boolean {
  return normalizeRole(role) === 'manager';
}

export function isAgent(role: string | undefined | null): boolean {
  return normalizeRole(role) === 'agent';
}

export function isHost(role: string | undefined | null): boolean {
  const r = normalizeRole(role);
  return r === 'host' || r === 'talent';
}

export function isDirectorOrHeadAdmin(role: string | undefined | null): boolean {
  const r = normalizeRole(role);
  return r === 'director' || r === 'head admin' || r === 'head_admin';
}

export function isManagerOrAgent(role: string | undefined | null): boolean {
  const r = normalizeRole(role);
  return r === 'manager' || r === 'agent';
}

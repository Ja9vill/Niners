export type BadgeRole = 'director' | 'head admin' | 'manager' | 'agent' | 'admin' | 'host';

const ROLE_BADGE_STYLES: Record<BadgeRole, string> = {
  director:    'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'head admin':'bg-purple-500/10 text-purple-400 border-purple-500/20',
  manager:     'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  agent:       'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  admin:       'bg-blue-500/10 text-blue-400 border-blue-500/20',
  host:        'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const DEFAULT_BADGE_STYLE = 'bg-slate-500/10 text-slate-400 border-slate-500/20';

export function getRoleBadgeStyle(role: string): string {
  const normalized = (role || '').toLowerCase().replace('_', ' ') as BadgeRole;
  return ROLE_BADGE_STYLES[normalized] || DEFAULT_BADGE_STYLE;
}

export const ROLE_BADGE_BASE_CLASS = 'text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border capitalize';

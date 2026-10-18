import type { CSSProperties } from 'react';
import { House, Files, Calculator, HardHat, UsersRound, ShieldCheck, SlidersHorizontal, CalendarDays, TriangleAlert, LogOut, CircleDollarSign, ListChecks, CheckCircle2, Activity, Clock3, CircleX, Mail, type LucideIcon } from 'lucide-react';

export type Illustration = 'home' | 'claim' | 'estimate' | 'production' | 'team' | 'insurance' | 'settings' | 'calendar' | 'alert' | 'logout' | 'finance' | 'tasks' | 'success' | 'activity' | 'clock' | 'declined' | 'mail';
const icons: Record<Illustration, { icon: LucideIcon; color: string }> = {
  home: { icon: House, color: 'var(--xapcon-blue)' },
  claim: { icon: Files, color: '#367ac2' },
  estimate: { icon: Calculator, color: '#886327' },
  production: { icon: HardHat, color: '#b37924' },
  team: { icon: UsersRound, color: '#7962b0' },
  insurance: { icon: ShieldCheck, color: 'var(--xapcon-blue)' },
  settings: { icon: SlidersHorizontal, color: '#5c7491' },
  calendar: { icon: CalendarDays, color: '#367ac2' },
  alert: { icon: TriangleAlert, color: '#c26452' },
  logout: { icon: LogOut, color: '#bc6159' },
  finance: { icon: CircleDollarSign, color: 'var(--xapcon-blue)' },
  tasks: { icon: ListChecks, color: 'var(--xapcon-blue)' },
  success: { icon: CheckCircle2, color: '#278574' },
  activity: { icon: Activity, color: '#367ac2' },
  clock: { icon: Clock3, color: '#a4742d' },
  declined: { icon: CircleX, color: '#bc6159' },
  mail: { icon: Mail, color: '#367ac2' },
};

// Shared vector geometry at every size; the surface is reserved for section icons.
export default function IllustratedIcon({ name, className = '' }: { name: Illustration; className?: string }) {
  const { icon: Icon, color } = icons[name];
  return <span className={`contractor-illustration ${className}`} aria-hidden="true" style={{ '--icon-accent': color } as CSSProperties}>
    <Icon strokeWidth={1.65} aria-hidden="true" focusable="false" />
  </span>;
}

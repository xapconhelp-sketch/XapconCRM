import type { CSSProperties } from 'react';
import { House, Files, Calculator, HardHat, UsersRound, ShieldCheck, SlidersHorizontal, CalendarDays, TriangleAlert, type LucideIcon } from 'lucide-react';

export type Illustration = 'home' | 'claim' | 'estimate' | 'production' | 'team' | 'insurance' | 'settings' | 'calendar' | 'alert';
const icons: Record<Illustration, { icon: LucideIcon; color: string }> = {
  home: { icon: House, color: '#147d70' },
  claim: { icon: Files, color: '#367ac2' },
  estimate: { icon: Calculator, color: '#886327' },
  production: { icon: HardHat, color: '#b37924' },
  team: { icon: UsersRound, color: '#7962b0' },
  insurance: { icon: ShieldCheck, color: '#278775' },
  settings: { icon: SlidersHorizontal, color: '#5c7491' },
  calendar: { icon: CalendarDays, color: '#367ac2' },
  alert: { icon: TriangleAlert, color: '#c26452' },
};

// Shared vector geometry at every size; the surface is reserved for section icons.
export default function IllustratedIcon({ name, className = '' }: { name: Illustration; className?: string }) {
  const { icon: Icon, color } = icons[name];
  return <span className={`contractor-illustration ${className}`} aria-hidden="true" style={{ '--icon-accent': color } as CSSProperties}>
    <Icon strokeWidth={1.65} aria-hidden="true" focusable="false" />
  </span>;
}

import IllustratedIcon, { type Illustration } from './IllustratedIcon';
import { useState } from 'react';
import xapconLogo from '../../../LogoXapcon-letra.png';
import { PanelLeftClose, PanelLeftOpen, Menu, X } from 'lucide-react';
import { cn } from 'cn';
import { ViewType } from '../../types';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';

const sections = [
  { label: 'ESPACIO DE TRABAJO', items: [
    { type: ViewType.DASHBOARD, label: 'Inicio', icon: 'home' as Illustration },
    { type: ViewType.INSURANCE_CLAIM, label: 'Reclamos de seguro', icon: 'claim' as Illustration },
    { type: ViewType.CLAIMS, label: 'Estimador retail', icon: 'estimate' as Illustration },
    { type: ViewType.PRODUCTION, label: 'Producción', icon: 'production' as Illustration },
  ] },
  { label: 'EQUIPO Y RECURSOS', items: [
    { type: ViewType.TEAM, label: 'Equipo y cuadrillas', icon: 'team' as Illustration },
    { type: ViewType.INSURANCE_DIRECTORY, label: 'Aseguradoras', icon: 'insurance' as Illustration },
  ] },
];

export default function ContractorNavigation({ currentView, onViewChange, collapsed, onToggleCollapse, company, companyLogo }: {
  currentView: ViewType; onViewChange: (view: ViewType) => void;
  collapsed: boolean; onToggleCollapse: () => void; company: string; companyLogo?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const navigate = (view: ViewType) => { onViewChange(view); setOpen(false); };
  const links = (compact: boolean) => <>
    <div className="flex flex-1 flex-col gap-7 overflow-y-auto px-3 py-6">
      {sections.map(section => <div key={section.label} className="flex flex-col gap-1">
        {!compact && <p className="px-3 pb-2 text-[10px] font-semibold tracking-widest text-muted-foreground">{section.label}</p>}
        {section.items.map(({ type, label, icon }) => <Button key={type} variant="ghost" title={compact ? label : undefined} aria-label={label}
          aria-current={currentView === type ? 'page' : undefined} onClick={() => navigate(type)}
          className={cn('contractor-nav-link', compact && 'contractor-nav-compact')}>
          <IllustratedIcon name={icon} />{!compact && <span>{label}</span>}
        </Button>)}
      </div>)}
    </div>
    <div className="flex flex-col gap-2 p-3">
      <Separator />
      <div className={cn('contractor-company-logo', compact && 'is-compact')}>
        {companyLogo && failedLogo !== companyLogo
          ? <img src={companyLogo} alt={`Logo de ${company}`} onError={() => setFailedLogo(companyLogo)} />
          : <span className="contractor-company-logo-fallback" title={company}>{compact ? company.slice(0, 2).toUpperCase() : company}</span>}
      </div>
    </div>
  </>;
  const brand = <img src={xapconLogo} alt="Xapcon Group — Back Office Partner" className="contractor-official-logo" />;
  return <>
    <nav aria-label="Navegación principal" data-collapsed={collapsed} className="contractor-navigation no-print hidden md:flex">
      <div className="contractor-navigation-brand">{!collapsed && brand}<Button variant="ghost" size="icon-sm" aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'} onClick={onToggleCollapse}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</Button></div>
      {links(collapsed)}
    </nav>
    <header className="contractor-mobile-header no-print flex md:hidden">{brand}<Button variant="ghost" size="icon" aria-label="Abrir menú" onClick={() => setOpen(true)}><Menu /></Button></header>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent showCloseButton={false} className="no-print contractor-app contractor-mobile-menu" aria-describedby={undefined}>
      <DialogTitle className="sr-only">Navegación</DialogTitle><div className="contractor-navigation-brand">{brand}<Button variant="ghost" size="icon" aria-label="Cerrar menú" onClick={() => setOpen(false)}><X /></Button></div>{links(false)}
    </DialogContent></Dialog>
  </>;
}

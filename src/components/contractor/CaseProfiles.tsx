import { MapPin, Phone, Mail, UserRound, CalendarDays, CloudLightning, FileText, type LucideIcon } from 'lucide-react';
import type { Lead } from '../../types';
import IllustratedIcon from './IllustratedIcon';

function Detail({ icon: Icon, label, value, href }: { icon: LucideIcon; label: string; value?: string; href?: string }) {
  if (!value) return null;
  return <div className="case-profile-row"><Icon aria-hidden="true" className="size-4" /><div><dt>{label}</dt><dd>{href ? <a href={href}>{value}</a> : value}</dd></div></div>;
}

export function HomeownerProfile({ lead }: { lead: Lead }) {
  const initials = lead.name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('');
  return <div className="case-profile-editorial">
    <div className="case-person-identity"><span className="case-person-avatar" aria-hidden="true">{initials}</span><div><p>Propietario</p><h3>{lead.name}</h3></div></div>
    <dl className="case-profile-details">
      <Detail icon={MapPin} label="Propiedad" value={lead.address || 'Sin dirección'} />
      <Detail icon={Phone} label="Teléfono" value={lead.phone || 'No registrado'} href={lead.phone ? `tel:${lead.phone.replace(/[^\d+]/g, '')}` : undefined} />
      <Detail icon={Mail} label="Correo electrónico" value={lead.email || 'No registrado'} href={lead.email ? `mailto:${lead.email}` : undefined} />
      <Detail icon={UserRound} label="Representante asignado" value={lead.assignedRep} />
    </dl>
    {lead.notes && <div className="case-profile-memo"><h4>Notas del propietario</h4><p>{lead.notes}</p></div>}
  </div>;
}

export function InsuranceProfile({ lead }: { lead: Lead }) {
  return <div className="case-profile-editorial">
    <div className="case-insurer-identity"><IllustratedIcon name="insurance" /><div><p>Aseguradora</p><h3>{lead.insuranceProvider || 'No especificada'}</h3></div></div>
    <dl className="case-profile-details">
      <Detail icon={FileText} label="Número de claim" value={lead.claimNumber || 'Sin claim'} />
      <Detail icon={FileText} label="Póliza" value={lead.policyNumber} />
      <Detail icon={CloudLightning} label="Tipo de daño" value={lead.damageType} />
      <Detail icon={CalendarDays} label="Fecha de pérdida" value={lead.lossDate || 'No registrada'} />
      <Detail icon={UserRound} label="Perito / Ajustador" value={lead.adjusterName} />
      <Detail icon={Phone} label="Teléfono del seguro" value={lead.insurancePhone1 || 'No registrado'} href={lead.insurancePhone1 ? `tel:${lead.insurancePhone1.replace(/[^\d+]/g, '')}` : undefined} />
      <Detail icon={Mail} label="Correo del seguro" value={lead.insuranceEmail1 || 'No registrado'} href={lead.insuranceEmail1 ? `mailto:${lead.insuranceEmail1}` : undefined} />
    </dl>
    {lead.insuranceNotes && <div className="case-profile-memo"><h4>Notas de la aseguradora</h4><p>{lead.insuranceNotes}</p></div>}
  </div>;
}

import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, Building2, Check, CircleHelp, Crown, Headset, House, Search, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import type { Organization } from "../contexts/AuthContext";
import { homeownerFollowupLabels, membershipPlanPrivileges, membershipPlanLabels, resolveOrganizationMembership, type HomeownerFollowupLevel, type MembershipPlan, type MembershipPrivileges } from "../lib/membershipAccess";

interface MembershipAccessViewProps {
  organizations: Organization[];
  onSave: (organizationId: string, settings: { membership_plan: MembershipPlan } & MembershipPrivileges) => Promise<boolean>;
}

const plans: { id: MembershipPlan; description: string; icon: typeof Building2 }[] = [
  { id: "software_only", description: "Acceso al CRM sin servicios de seguimiento de Xapcon.", icon: Building2 },
  { id: "pro", description: "Seguimiento parcial al homeowner en casos con conflictos. Sin llamadas al seguro.", icon: BadgeCheck },
  { id: "plus", description: "Seguimiento total al homeowner y llamadas al seguro.", icon: Crown },
];

export default function MembershipAccessView({ organizations, onSave }: MembershipAccessViewProps) {
  const companies = useMemo(
    () => organizations.filter((organization) => !organization.is_internal && organization.name.trim().toLowerCase() !== "xapcon group").sort((a, b) => a.name.localeCompare(b.name)),
    [organizations],
  );
  const [selectedId, setSelectedId] = useState("");
  const loadedOrganizationId = useRef("");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<{ membership_plan: MembershipPlan } & MembershipPrivileges | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const filteredCompanies = companies.filter((company) => `${company.name} ${company.company_name || ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  const selectedCompany = companies.find((company) => company.id === selectedId) || filteredCompanies[0] || companies[0];

  useEffect(() => {
    if (!companies.length) {
      setSelectedId("");
      setDraft(null);
      return;
    }
    const company = companies.find((item) => item.id === selectedId) || companies[0];
    if (company.id !== selectedId) {
      setSelectedId(company.id);
      return;
    }
    if (loadedOrganizationId.current === company.id) return;
    loadedOrganizationId.current = company.id;
    const access = resolveOrganizationMembership(company);
    setDraft({ membership_plan: access.plan, insurance_calls_enabled: access.insurance_calls_enabled, homeowner_followup_level: access.homeowner_followup_level });
    setSaved(false);
    setError("");
  }, [companies, selectedId]);

  const chooseCompany = (organization: Organization) => {
    loadedOrganizationId.current = organization.id;
    setSelectedId(organization.id);
    const access = resolveOrganizationMembership(organization);
    setDraft({ membership_plan: access.plan, insurance_calls_enabled: access.insurance_calls_enabled, homeowner_followup_level: access.homeowner_followup_level });
    setSaved(false);
    setError("");
  };

  const choosePlan = (plan: MembershipPlan) => {
    setDraft({ membership_plan: plan, ...membershipPlanPrivileges(plan) });
    setSaved(false);
  };

  const save = async () => {
    if (!selectedCompany || !draft || saving) return;
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const ok = await onSave(selectedCompany.id, draft);
      if (ok) setSaved(true);
      else setError("No se pudieron guardar los cambios. Verifica que hayas aplicado el SQL de membresías en Supabase y vuelve a intentar.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  return <section className="mx-auto min-h-0 w-full max-w-[1440px] flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#102A46] sm:text-3xl">Membresías y privilegios</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52525b]">Define el plan contratado y los servicios activos para cada empresa. Estos permisos también controlan lo que aparece en el informe semanal.</p>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-[#e4e4e7] bg-white px-3 py-2 text-xs font-semibold text-[#3f3f46]"><UsersRound className="h-4 w-4 text-[#27272a]" /> {companies.length} {companies.length === 1 ? "empresa" : "empresas"}</div>
    </header>

    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-2xl border border-[#e4e4e7] bg-white shadow-[0_8px_26px_rgba(16,42,70,.045)]">
        <div className="border-b border-[#e4e4e7] p-4">
          <h2 className="text-sm font-bold text-[#102A46]">Empresas contratistas</h2>
          <label className="relative mt-3 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#71717a]" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empresa" className="h-10 w-full rounded-xl border border-[#e4e4e7] bg-[#fafafa] pl-9 pr-3 text-sm text-[#18181b] outline-none focus:border-[#27272a] focus:ring-2 focus:ring-[#27272a]/10" />
          </label>
        </div>
        <div className="max-h-[560px] space-y-1 overflow-y-auto p-2">
          {filteredCompanies.map((company) => {
            const active = selectedCompany?.id === company.id;
            const { plan } = resolveOrganizationMembership(company);
            return <button key={company.id} type="button" onClick={() => chooseCompany(company)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${active ? "border-[#d4d4d8] bg-[#f4f4f5]" : "border-transparent hover:bg-[#fafafa]"}`}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? "bg-[#e4e4e7] text-[#27272a]" : "bg-[#f4f4f5] text-[#52525b]"}`}><Building2 className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#18181b]">{company.company_name || company.name}</span><span className="mt-1 block text-[11px] text-[#71717a]">{membershipPlanLabels[plan]}</span></span>
              {active && <Check className="h-4 w-4 text-[#27272a]" />}
            </button>;
          })}
          {filteredCompanies.length === 0 && <p className="px-3 py-8 text-center text-sm text-[#71717a]">No hay empresas que coincidan con la búsqueda.</p>}
        </div>
      </aside>

      {selectedCompany && draft ? <div className="space-y-5">
        <section className="rounded-2xl border border-[#e4e4e7] bg-white p-5 shadow-[0_8px_26px_rgba(16,42,70,.045)] sm:p-6">
          <header className="-mx-5 -mt-5 flex flex-wrap items-center justify-between gap-3 rounded-t-[7px] bg-zinc-900 px-5 py-3 text-white sm:-mx-6 sm:-mt-6 sm:px-6">
            <h2 className="text-xl font-bold tracking-tight">{selectedCompany.company_name || selectedCompany.name}</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-700 px-3 py-1.5 text-xs font-semibold"><Sparkles className="h-3.5 w-3.5" /> {membershipPlanLabels[draft.membership_plan]}</span>
          </header>

          <div className="mt-5">
            <div className="mb-3 flex items-center gap-2"><Crown className="h-4 w-4 text-[#27272a]" /><h3 className="text-sm font-bold text-[#18181b]">Plan contratado</h3></div>
            <div className="grid gap-3 lg:grid-cols-3">
              {plans.map(({ id, description, icon: Icon }) => <button key={id} type="button" aria-pressed={draft.membership_plan === id} onClick={() => choosePlan(id)} className={`rounded-xl border p-4 text-left transition ${draft.membership_plan === id ? "border-[#27272a] bg-[#f4f4f5] shadow-[0_0_0_2px_rgba(31,92,145,.08)]" : "border-[#e4e4e7] hover:border-[#a1a1aa] hover:bg-[#fafafa]"}`}>
                <span className="flex items-center justify-between"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#27272a] shadow-sm"><Icon className="h-4 w-4" /></span>{draft.membership_plan === id && <Check className="h-4 w-4 text-[#27272a]" />}</span>
                <span className="mt-3 block text-sm font-bold text-[#18181b]">{membershipPlanLabels[id]}</span><span className="mt-1 block text-xs leading-5 text-[#71717a]">{description}</span>
              </button>)}
            </div>
            <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-[#71717a]"><CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Al cambiar el plan se aplican sus privilegios sugeridos. Puedes personalizar cada privilegio antes de guardar.</p>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e4e4e7] bg-white p-5 shadow-[0_8px_26px_rgba(16,42,70,.045)] sm:p-6">
          <header className="-mx-5 -mt-5 mb-3 rounded-t-[7px] bg-zinc-900 px-5 py-3 text-white sm:-mx-6 sm:-mt-6 sm:px-6">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-zinc-300">Accesos por empresa</p>
            <h3 className="mt-1 text-lg font-bold">Servicios incluidos</h3>
          </header>
          <div className="divide-y divide-[#e4e4e7]">
            <div className="flex items-center gap-3 py-4 sm:gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f4f5] text-[#27272a]"><Headset className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#18181b]">Llamadas a aseguradoras</span><span className="mt-1 block text-xs leading-5 text-[#71717a]">El equipo de Xapcon registra y gestiona llamadas con la aseguradora.</span></span>
              <button type="button" role="switch" aria-checked={draft.insurance_calls_enabled} aria-label={`Llamadas a aseguradoras: ${draft.insurance_calls_enabled ? "activas" : "inactivas"}`} onClick={() => { setDraft(previous => previous ? { ...previous, insurance_calls_enabled: !previous.insurance_calls_enabled } : previous); setSaved(false); }} className={`relative h-6 w-11 shrink-0 rounded-full transition ${draft.insurance_calls_enabled ? "bg-[#27272a]" : "bg-[#d4d4d8]"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${draft.insurance_calls_enabled ? "left-[22px]" : "left-0.5"}`} /></button>
              <span className={`hidden w-16 text-right text-[11px] font-semibold sm:block ${draft.insurance_calls_enabled ? "text-[#27272a]" : "text-[#71717a]"}`}>{draft.insurance_calls_enabled ? "Activo" : "Inactivo"}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 py-4 sm:gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f4f5] text-[#27272a]"><House className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#18181b]">Seguimiento al homeowner</span><span className="mt-1 block text-xs leading-5 text-[#71717a]">Parcial solo si hay conflictos; total durante todo el caso.</span></span>
              <select aria-label="Nivel de seguimiento al homeowner" value={draft.homeowner_followup_level} onChange={(event) => { setDraft(previous => previous ? { ...previous, homeowner_followup_level: event.target.value as HomeownerFollowupLevel } : previous); setSaved(false); }} className="h-10 rounded-xl border border-[#e4e4e7] bg-white px-3 text-xs font-semibold text-[#18181b] outline-none focus:border-[#27272a] focus:ring-2 focus:ring-[#27272a]/10">
                {Object.entries(homeownerFollowupLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e4e7] pt-4">
            <p aria-live="polite" className={`text-xs ${error ? "text-[#B54740]" : "text-[#33735D]"}`}>{error || (saved ? "Los privilegios se guardaron correctamente." : "Los cambios se aplicarán al guardar.")}</p>
            <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#102A46] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#27272a] disabled:cursor-wait disabled:opacity-60"><ShieldCheck className="h-4 w-4" />{saving ? "Guardando…" : "Guardar cambios"}</button>
          </div>
        </section>
      </div> : <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-[#e4e4e7] bg-white p-8 text-center text-sm text-[#71717a]">Registra o selecciona una empresa para administrar sus privilegios.</div>}
    </div>
  </section>;
}

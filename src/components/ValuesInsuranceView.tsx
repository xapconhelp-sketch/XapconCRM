import { queryAll } from "../lib/queryAll.js";
import React, { useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, CircleDollarSign, FileCheck2, LoaderCircle, Search, ShieldCheck, TrendingUp } from "lucide-react";
import { Lead } from "../types";
import { supabase } from "../lib/supabase";
import IllustratedIcon from "./contractor/IllustratedIcon";

type EntryKind = "estimate" | "sow" | "supplement";
type ValueEntry = {
  id: string;
  lead_id: string;
  organization_id: string;
  record_type: EntryKind;
  entry_number: number;
  amount: number | null;
  event_date: string | null;
  estimate_sent: boolean;
};
type AnalyticsValue = Pick<ValueEntry, "lead_id" | "record_type" | "entry_number" | "amount" | "event_date" | "estimate_sent">;
type AnalyticsFinance = { claim_id: string; rcv: number | null; acv: number | null };
const money = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);
const terminalCaseStatuses = new Set(["Finalizado", "Negados", "Cancelado"]);

function parseCaseDate(value?: string | null): Date | null {
  if (!value) return null;
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function searchText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function ClaimSmartSearch({ claims, query, onQuery, onSelect }: {
  claims: Lead[];
  query: string;
  onQuery: (value: string) => void;
  onSelect: (claim: Lead) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedQuery = searchText(query);
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const matches = tokens.length ? claims.map((claim) => {
    const name = searchText(claim.name || "");
    const number = searchText(claim.claimNumber || "");
    const searchable = searchText(`${claim.name} ${claim.claimNumber} ${claim.company} ${claim.insuranceProvider}`);
    const allTokensMatch = tokens.every((token) => searchable.includes(token));
    const rank = name === normalizedQuery || number === normalizedQuery ? 0
      : name.startsWith(normalizedQuery) || number.startsWith(normalizedQuery) ? 1
      : searchable.includes(normalizedQuery) ? 2 : 3;
    return { claim, allTokensMatch, rank };
  }).filter((item) => item.allTokensMatch).sort((a, b) => a.rank - b.rank || a.claim.name.localeCompare(b.claim.name)).slice(0, 8) : [];

  const choose = (claim: Lead) => {
    onSelect(claim);
    setOpen(false);
  };

  return <div className="relative z-30 w-full sm:max-w-[390px]">
    <label className="group relative block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8593A1] transition-colors group-focus-within:text-[#D3B566]" />
      <input
        value={query}
        onChange={(event) => { onQuery(event.target.value); setActiveIndex(0); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && matches.length) { event.preventDefault(); setActiveIndex((index) => (index + 1) % matches.length); setOpen(true); }
          if (event.key === "ArrowUp" && matches.length) { event.preventDefault(); setActiveIndex((index) => (index - 1 + matches.length) % matches.length); setOpen(true); }
          if (event.key === "Enter" && matches[activeIndex]) { event.preventDefault(); choose(matches[activeIndex].claim); }
          if (event.key === "Escape") setOpen(false);
        }}
        role="combobox"
        aria-label="Buscar expediente por nombre o número de reclamo"
        aria-autocomplete="list"
        aria-expanded={open && Boolean(normalizedQuery)}
        aria-controls="values-insurance-search-results"
        aria-activedescendant={open && matches[activeIndex] ? `values-insurance-result-${matches[activeIndex].claim.id}` : undefined}
        placeholder="Buscar homeowner o número de reclamo"
        className="h-10 w-full rounded-lg border border-white/20 bg-white pl-10 pr-3 text-[11px] text-[#19344F] outline-none transition placeholder:text-[#8997A4] focus:border-[#D3B566] focus:ring-4 focus:ring-[#D3B566]/[.16]"
      />
    </label>
    {open && normalizedQuery && <div id="values-insurance-search-results" role="listbox" className="absolute inset-x-0 top-[calc(100%+7px)] max-h-[min(55vh,360px)] overflow-y-auto rounded-xl border border-[#DDE3E8] bg-white p-1.5 text-[#19344F] shadow-[0_14px_36px_rgba(12,32,54,.22)]">
      {matches.length ? <>
        <p className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[.08em] text-[#81909D]">Coincidencias · selecciona un expediente</p>
        {matches.map(({ claim }, index) => <button
          id={`values-insurance-result-${claim.id}`}
          key={claim.id}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => choose(claim)}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${index === activeIndex ? "bg-[#F0F4F7]" : "hover:bg-[#F6F8FA]"}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF0F4] text-[#315D82]"><FileCheck2 className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-semibold">{claim.name}</span><span className="mt-0.5 block truncate text-[9px] text-[#778797]">{claim.claimNumber || "Sin número"} · {claim.company || claim.insuranceProvider || "Empresa sin identificar"}</span></span>
          <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[8px] font-medium text-[#65788A]">{claim.status || "Sin etapa"}</span>
        </button>)}
      </> : <p className="px-3 py-5 text-center text-[10px] text-[#718194]">No encontramos expedientes con esos términos.</p>}
    </div>}
  </div>;
}

function formatCaseDate(date: Date | null): string {
  return date ? new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" }).format(date) : "Sin registro";
}

function getCaseClosureDate(claim: Lead): Date | null {
  const terminalEvents = (claim.timeline || [])
    .filter((event) => event.type === "status_change" && event.toStatus === claim.status && terminalCaseStatuses.has(event.toStatus))
    .map((event) => parseCaseDate(event.timestamp) || parseCaseDate(event.date))
    .filter((date): date is Date => date !== null)
    .sort((a, b) => b.getTime() - a.getTime());
  return terminalEvents[0] || null;
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000));
}

function AnalyticsStat({ label, value, detail, icon: Icon, tone = "blue" }: {
  label: string; value: string; detail: string; icon: React.ElementType; tone?: "blue" | "gold" | "green" | "slate";
}) {
  const tones = {
    blue: "text-[#8AB9F3]",
    gold: "text-[#E8C879]",
    green: "text-[#74C9A0]",
    slate: "text-[#CFD8E0]",
  };
  return <article className="min-h-[122px] min-w-0 overflow-hidden rounded-lg border border-[#DDE2E7] bg-white shadow-[0_2px_8px_rgba(24,36,48,.045)]">
    <div className="flex min-h-10 items-center justify-between gap-2 bg-[#18181B] px-3 py-2">
      <p title={label} className="line-clamp-2 min-w-0 text-[9px] font-semibold uppercase leading-[1.35] tracking-[.08em] text-zinc-100">{label}</p>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[.08]"><Icon className={`h-4 w-4 ${tones[tone]}`} /></span>
    </div>
    <div className="px-3 py-2.5">
      <p title={value} className="truncate font-display text-[20px] font-semibold leading-tight tracking-[-.03em] tabular-nums text-[#17191D] sm:text-[22px] xl:text-[19px] 2xl:text-[22px]">{value}</p>
      <p title={detail} className="mt-1 line-clamp-2 min-h-[1.75rem] text-[9px] leading-[1.4] text-[#687687]">{detail}</p>
    </div>
  </article>;
}

function CaseMetric({ label, value, detail, tone = "blue" }: {
  label: string; value: string; detail: string; tone?: "blue" | "gold" | "green" | "slate";
}) {
  const tones = {
    blue: "border-[#DCE5EC] bg-[#F3F7FA]",
    gold: "border-[#E8DFCA] bg-[#FBF8EF]",
    green: "border-[#D8E7DE] bg-[#F1F7F3]",
    slate: "border-[#E2E7EA] bg-[#F6F8F9]",
  };
  return <article className={`min-w-0 rounded-xl border p-4 ${tones[tone]}`}>
    <p className="text-[10px] font-bold uppercase tracking-[.09em] text-[#596D78]">{label}</p>
    <p className="mt-2 truncate font-display text-[21px] font-semibold tracking-[-.03em] text-[#122B40]">{value}</p>
    <p className="mt-1 text-[11px] leading-4 text-[#637782]">{detail}</p>
  </article>;
}

function ValuesInsuranceAnalytics({ claims, selectedCaseId, query }: { claims: Lead[]; selectedCaseId: string; query: string }) {
  const [values, setValues] = useState<AnalyticsValue[]>([]);
  const [finances, setFinances] = useState<AnalyticsFinance[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [valueResult, financeResult] = await Promise.all([
        queryAll((from, to) => supabase.from("admin_insurance_values").select("lead_id,record_type,entry_number,amount,event_date,estimate_sent").order("id").range(from, to)),
        queryAll((from, to) => supabase.from("contractor_claim_financials").select("claim_id,rcv,acv").order("claim_id").range(from, to)),
      ]);
      if (cancelled) return;
      const nextErrors: string[] = [];
      if (valueResult.error) nextErrors.push(`Valores Insurance: ${valueResult.error.message}`);
      else setValues((valueResult.data || []) as AnalyticsValue[]);
      if (financeResult.error) nextErrors.push("No fue posible leer RCV/ACV. Revisa el acceso superadmin a las finanzas de contratistas.");
      else setFinances((financeResult.data || []) as AnalyticsFinance[]);
      setErrors(nextErrors);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  // These tables do not depend on the periodically refreshed claims array.
  // Keeping this effect mount-scoped prevents the analytics screen from
  // returning to its loading state on every background CRM refresh.
  }, []);

  const analysis = useMemo(() => {
    const claimIds = new Set(claims.map((claim) => claim.id));
    const scopedValues = values.filter((row) => claimIds.has(row.lead_id));
    const claimRows = claims.map((claim) => {
      const rows = scopedValues.filter((row) => row.lead_id === claim.id);
      const estimate = rows.find((row) => row.record_type === "estimate");
      const sows = rows.filter((row) => row.record_type === "sow");
      const sowsWithAmount = sows.filter((row) => row.amount !== null);
      const latestSow = [...sowsWithAmount].sort((a, b) => (b.event_date || "").localeCompare(a.event_date || "") || b.entry_number - a.entry_number)[0];
      const firstSow = [...sowsWithAmount].sort((a, b) => {
        if (a.event_date && b.event_date) return a.event_date.localeCompare(b.event_date) || a.entry_number - b.entry_number;
        if (a.event_date) return -1;
        if (b.event_date) return 1;
        return a.entry_number - b.entry_number;
      })[0];
      const estimateAmount = Number(estimate?.amount) || 0;
      const sowAmount = Number(latestSow?.amount) || 0;
      const firstSowAmount = Number(firstSow?.amount) || 0;
      const finance = finances.find((row) => row.claim_id === claim.id);
      return {
        claim, estimate, firstSow, latestSow, estimateAmount, firstSowAmount, sowAmount,
        gap: estimate && latestSow && estimate.amount !== null && latestSow.amount !== null ? estimateAmount - sowAmount : null,
        sowAmountCount: sowsWithAmount.length,
        sowChange: sowsWithAmount.length >= 2 && firstSow && latestSow ? Number(latestSow.amount) - Number(firstSow.amount) : null,
        sowChangePercent: sowsWithAmount.length >= 2 && firstSow && latestSow && Number(firstSow.amount) > 0
          ? ((Number(latestSow.amount) - Number(firstSow.amount)) / Number(firstSow.amount)) * 100
          : null,
        daysToFirstSow: estimate?.estimate_sent && estimate.event_date
          ? (() => {
              const firstDate = sows.map((row) => row.event_date).filter((date): date is string => Boolean(date) && date >= estimate.event_date!).sort()[0];
              if (!firstDate) return null;
              const days = Math.floor((Date.parse(firstDate) - Date.parse(estimate.event_date!)) / 86400000);
              return days >= 0 ? days : null;
            })()
          : null,
        rcv: Number(finance?.rcv) || 0,
        acv: Number(finance?.acv) || 0,
      };
    });
    const totals = claimRows.reduce((acc, row) => ({
      estimates: acc.estimates + row.estimateAmount,
      firstSow: acc.firstSow + row.firstSowAmount,
      latestSow: acc.latestSow + row.sowAmount,
      additionalSow: acc.additionalSow + (row.sowChange ?? 0),
      rcv: acc.rcv + row.rcv,
      acv: acc.acv + row.acv,
    }), { estimates: 0, firstSow: 0, latestSow: 0, additionalSow: 0, rcv: 0, acv: 0 });
    const claimsWithSow = claimRows.filter((row) => row.latestSow).length;
    const claimsWithFirstSow = claimRows.filter((row) => row.firstSow).length;
    const comparableSowCount = claimRows.filter((row) => row.sowChange !== null).length;
    return { claimRows, totals, claimsWithSow, claimsWithFirstSow, comparableSowCount };
  }, [claims, values, finances]);

  const normalizedQuery = query.trim().toLowerCase();
  const matchingClaims = normalizedQuery
    ? analysis.claimRows.filter((row) => `${row.claim.name} ${row.claim.claimNumber} ${row.claim.company} ${row.claim.insuranceProvider}`.toLowerCase().includes(normalizedQuery))
    : [];
  const exactMatch = normalizedQuery ? matchingClaims.find((row) => [row.claim.name, row.claim.claimNumber].some((value) => value.trim().toLowerCase() === normalizedQuery)) : undefined;
  const selectedCase = normalizedQuery
    ? analysis.claimRows.find((row) => row.claim.id === selectedCaseId && matchingClaims.some((match) => match.claim.id === row.claim.id)) || exactMatch || (matchingClaims.length === 1 ? matchingClaims[0] : undefined)
    : analysis.claimRows.find((row) => row.claim.id === selectedCaseId);
  const caseStartDate = selectedCase
    ? parseCaseDate(selectedCase.claim.created_at) || parseCaseDate(selectedCase.claim.createdAt)
    : null;
  const isCaseTerminal = Boolean(selectedCase && terminalCaseStatuses.has(selectedCase.claim.status));
  const caseClosureDate = selectedCase && isCaseTerminal ? getCaseClosureDate(selectedCase.claim) : null;
  const caseDurationDays = caseStartDate && (!isCaseTerminal || caseClosureDate)
    ? daysBetween(caseStartDate, caseClosureDate || new Date())
    : null;
  return <div className="min-w-0 space-y-5">
    {loading ? <div className="flex min-h-[230px] items-center justify-center gap-2 rounded-xl border border-[#DDE3E8] bg-white text-sm text-[#596D80]"><LoaderCircle className="h-4 w-4 animate-spin" />Calculando análisis de cartera…</div> : <>
    {errors.length > 0 && <div role="alert" className="rounded-xl border border-[#E9D9B2] bg-[#FBF7EB] px-4 py-3 text-[11px] leading-5 text-[#765B22]">{errors.join(" ")}</div>}
    <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-5">
      <AnalyticsStat label="Expedientes de seguro" value={String(claims.length)} detail={`${analysis.claimRows.filter((row) => row.claim.status !== "Finalizado" && row.claim.status !== "Cancelado" && row.claim.status !== "Negados").length} activos según etapa actual`} icon={ShieldCheck} />
      <AnalyticsStat label="Total esperado" value={money(analysis.totals.estimates)} detail="Suma de los montos que se esperan cobrar al seguro en todos los expedientes" icon={BadgeDollarSign} tone="gold" />
      <AnalyticsStat label="Total recibido · primer SOW" value={money(analysis.totals.firstSow)} detail={`Suma del primer SOW recibido en ${analysis.claimsWithFirstSow} expedientes`} icon={CircleDollarSign} tone="slate" />
      <AnalyticsStat label="Total aprobado · último SOW" value={money(analysis.totals.latestSow)} detail={`Suma del SOW más reciente en ${analysis.claimsWithSow} expedientes`} icon={FileCheck2} tone="blue" />
      <AnalyticsStat label="Incremento adicional logrado" value={money(analysis.totals.additionalSow)} detail={`Último SOW − primer SOW en ${analysis.comparableSowCount} expedientes comparables`} icon={TrendingUp} tone="green" />
    </div>

    <section className="overflow-hidden rounded-2xl border border-[#DDE3E8] bg-white shadow-[0_6px_22px_rgba(23,49,74,0.04)]">
      <header className="values-analytics-heading flex flex-col gap-4 border-b border-[#E9EDF0] bg-[linear-gradient(112deg,#102945_0%,#102A46_65%,#1A3854_100%)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-[#D3B566]" /><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#D3B566]">Lectura por expediente</p></div><h2 className="mt-1 font-display text-[17px] font-semibold tracking-[-.02em] text-white">Desempeño del caso</h2></div>
      </header>
      {selectedCase ? <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-5">
          <CaseMetric label="Estimado del equipo" value={selectedCase.estimate?.amount === null || !selectedCase.estimate ? "Sin registro" : money(Number(selectedCase.estimate.amount))} detail={selectedCase.estimate?.estimate_sent ? "Marcado como enviado" : "Estimado del alcance esperado"} tone="blue" />
          <CaseMetric label="Primer SOW recibido" value={selectedCase.firstSow?.amount === null || !selectedCase.firstSow ? "Sin registro" : money(Number(selectedCase.firstSow.amount))} detail={selectedCase.firstSow?.event_date ? `Base · ${selectedCase.firstSow.event_date}` : "Monto base de aseguradora"} tone="slate" />
          <CaseMetric label="SOW más reciente" value={selectedCase.latestSow?.amount === null || !selectedCase.latestSow ? "Sin registro" : money(Number(selectedCase.latestSow.amount))} detail={selectedCase.latestSow?.event_date ? `Última revisión · ${selectedCase.latestSow.event_date}` : "Último monto registrado"} tone="blue" />
          <CaseMetric label="Incremento adicional" value={selectedCase.sowChange === null ? "Sin comparación" : `${selectedCase.sowChange > 0 ? "+" : selectedCase.sowChange < 0 ? "−" : ""}${money(Math.abs(selectedCase.sowChange))}`} detail={selectedCase.sowChange === null ? "Registra dos SOW con monto" : "Último SOW menos primer SOW"} tone={selectedCase.sowChange !== null && selectedCase.sowChange > 0 ? "green" : "gold"} />
          <CaseMetric label="% adicional logrado" value={selectedCase.sowChangePercent === null ? "Sin comparación" : `${selectedCase.sowChangePercent > 0 ? "+" : selectedCase.sowChangePercent < 0 ? "−" : ""}${Math.abs(selectedCase.sowChangePercent).toFixed(1)}%`} detail={selectedCase.sowChangePercent === null ? "Requiere dos SOW y un primer SOW mayor a $0" : "Incremento respecto al primer SOW"} tone={selectedCase.sowChangePercent !== null && selectedCase.sowChangePercent > 0 ? "green" : "gold"} />
        </div>
        <div className="grid grid-cols-1 gap-2.5 rounded-xl border border-[#E5E9EC] bg-[#F7F9FA] p-3 sm:grid-cols-3">
          <div className="rounded-lg bg-white px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#758591]">Fecha de inicio</p>
            <p className="mt-1 text-[12px] font-semibold text-[#183249]">{formatCaseDate(caseStartDate)}</p>
            <p className="mt-0.5 text-[10px] text-[#81909D]">Creación del caso</p>
          </div>
          <div className="rounded-lg bg-white px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#758591]">Estado y cierre</p>
            <p className="mt-1 text-[12px] font-semibold text-[#183249]">{isCaseTerminal ? selectedCase.claim.status : "En curso"}</p>
            <p className="mt-0.5 text-[10px] text-[#81909D]">{isCaseTerminal ? (caseClosureDate ? `Cierre · ${formatCaseDate(caseClosureDate)}` : "Fecha de cierre no registrada") : `Etapa actual · ${selectedCase.claim.status || "Sin etapa"}`}</p>
          </div>
          <div className="rounded-lg bg-white px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-[.1em] text-[#758591]">Duración del caso</p>
            <p className="mt-1 text-[12px] font-semibold text-[#183249]">{caseDurationDays === null ? "Sin cálculo" : `${caseDurationDays} ${caseDurationDays === 1 ? "día" : "días"}`}</p>
            <p className="mt-0.5 text-[10px] text-[#81909D]">{caseDurationDays === null ? "Requiere fechas de inicio y cierre" : isCaseTerminal ? "Desde su creación hasta el cierre" : "Desde su creación hasta hoy"}</p>
          </div>
        </div>
      </div> : <div className="px-5 py-12 text-center text-sm text-[#637782]">{normalizedQuery ? matchingClaims.length > 1 ? `Hay ${matchingClaims.length} coincidencias. Escribe el nombre completo o el número de reclamo para precisar la búsqueda.` : "No encontramos un expediente con esa búsqueda." : claims.length ? "Busca un expediente por nombre o número de reclamo para consultar su desempeño." : "No hay expedientes para mostrar."}</div>}
    </section>
    </>}
  </div>;
}

export default function ValuesInsuranceView({ claims, activeOrganizationId }: { claims: Lead[]; activeOrganizationId?: string }) {
  const activeClaims = useMemo(() => claims.filter((claim) =>
    claim.is_insurance_claim && (!activeOrganizationId || claim.organizationId === activeOrganizationId),
  ), [claims, activeOrganizationId]);
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!activeClaims.length) {
      setSelectedClaimId("");
      return;
    }
    if (!activeClaims.some((claim) => claim.id === selectedClaimId)) setSelectedClaimId(activeClaims[0].id);
  }, [activeClaims, selectedClaimId]);

  return (
    <main className="crm-workspace min-h-0 flex-1 overflow-y-auto bg-[#F2F4F6]" aria-label="Valores Insurance, superadministrador">
      <div className="mx-auto w-full max-w-[1500px] space-y-5 px-4 py-5 sm:px-6 sm:py-7 xl:px-8">
        <header className="values-page-header relative isolate overflow-visible rounded-[22px] border border-[#29465D] bg-[linear-gradient(112deg,#102945_0%,#102A46_58%,#1A3854_100%)] px-5 py-3.5 shadow-[0_12px_32px_rgba(23,49,74,0.16)] sm:px-6 sm:py-4">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[22px]">
            <div className="absolute -right-10 -top-20 h-52 w-52 rounded-full border border-[#8C6A22]/20" />
            <div className="absolute -right-1 -top-11 h-36 w-36 rounded-full border border-[#D3B566]/30" />
            <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_top_right,rgba(183,122,75,0.18),transparent_68%)]" />
          </div>
          <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <IllustratedIcon name="finance" className="admin-values-header-icon" />
              <h1 className="font-display text-[23px] font-semibold tracking-[-0.04em] text-white sm:text-[25px]">Valores Insurance</h1>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <ClaimSmartSearch claims={activeClaims} query={query} onQuery={setQuery} onSelect={(claim) => { setSelectedClaimId(claim.id); setQuery(claim.name); }} />
              <span className="values-access-badge inline-flex w-fit items-center rounded-md border border-black bg-black px-3 py-1.5 text-[11px] font-semibold text-white">Solo superadmin</span>
            </div>
          </div>
        </header>

        <ValuesInsuranceAnalytics claims={activeClaims} selectedCaseId={selectedClaimId} query={query} />
      </div>
    </main>
  );
}

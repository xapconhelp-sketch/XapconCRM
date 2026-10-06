import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, BadgeDollarSign, BarChart3, CalendarDays, Check, CheckCircle2, ChevronRight, CircleDollarSign, Clock3, FileCheck2, FilePlus2, LoaderCircle, Plus, Search, ShieldCheck, Trash2, TrendingUp } from "lucide-react";
import { Lead } from "../types";
import { supabase } from "../lib/supabase";

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
type EntryDraft = Omit<Pick<ValueEntry, "record_type" | "entry_number" | "event_date" | "estimate_sent">, "amount"> & { amount: string; id?: string };
type AnalyticsValue = Pick<ValueEntry, "lead_id" | "record_type" | "entry_number" | "amount" | "event_date" | "estimate_sent">;
type AnalyticsFinance = { claim_id: string; rcv: number | null; acv: number | null };
type AnalyticsPayment = { claim_id: string; status: "expected" | "received"; amount: number };

const MAX_REPEATED_ENTRIES = 4;
const money = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);

function newDraft(recordType: "sow" | "supplement", entryNumber: number): EntryDraft {
  return { record_type: recordType, entry_number: entryNumber, amount: "", event_date: null, estimate_sent: false };
}

function ClaimSelector({ claims, selectedId, onSelect, query, onQuery }: {
  claims: Lead[]; selectedId: string; onSelect: (id: string) => void; query: string; onQuery: (value: string) => void;
}) {
  const visible = claims.filter((claim) => `${claim.name} ${claim.claimNumber} ${claim.company} ${claim.insuranceProvider}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <aside className="overflow-hidden rounded-[20px] border border-[#DDE3E8] bg-white shadow-[0_8px_30px_rgba(23,49,74,0.045)]">
      <div className="border-b border-white/10 bg-[linear-gradient(112deg,#102945_0%,#102A46_62%,#1A3854_100%)] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="font-display text-[16px] font-semibold tracking-[-0.02em] text-white">Expedientes</h2><p className="mt-1 text-[11px] text-[#CBD6DE]">Selecciona un caso para ver sus valores.</p></div>
          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-[#D3B566]/20 bg-[#8C6A22]/15 px-2 font-sans text-[11px] font-semibold text-[#D8C68A]">{claims.length}</span>
        </div>
        <label className="group relative mt-4 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#AFC0CD] transition-colors group-focus-within:text-[#D3B566]" />
          <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Buscar por nombre o reclamo" className="h-10 w-full rounded-xl border border-white/15 bg-[#0C2036]/55 pl-9 pr-3 text-[12px] text-white outline-none transition placeholder:text-[#AFC0CD] focus:border-[#D3B566]/60 focus:bg-[#0C2036]/75 focus:ring-4 focus:ring-[#8C6A22]/[0.14]" />
        </label>
      </div>
      <div className="max-h-[min(68vh,720px)] space-y-1 overflow-y-auto p-2.5">
        {visible.map((claim) => {
          const active = selectedId === claim.id;
          return <button key={claim.id} type="button" onClick={() => onSelect(claim.id)} className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border px-3 py-3 text-left transition duration-200 ${active ? "border-[#E8D8CB] bg-[#FBF9F2] shadow-[0_3px_12px_rgba(166,101,62,0.08)]" : "border-transparent text-[#344C60] hover:border-[#EDF0F2] hover:bg-[#FAFBFC]"}`}>
            {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[#8C6A22]" />}
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${active ? "bg-[#F1E2D6] text-[#664A14]" : "bg-[#F0F3F5] text-[#668095] group-hover:bg-white"}`}><FileCheck2 className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1"><span className={`block truncate font-sans text-[12px] font-semibold ${active ? "text-[#102A46]" : "text-[#344C60]"}`}>{claim.name}</span><span className="mt-1 block truncate font-sans text-[10px] tracking-[0.005em] text-[#82909C]">{claim.claimNumber} <span className="text-[#B0BAC2]">·</span> {claim.company || "Empresa sin identificar"}</span></span>
            <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition ${active ? "translate-x-0 text-[#755613]" : "-translate-x-1 text-[#C1CAD1] opacity-0 group-hover:translate-x-0 group-hover:opacity-100"}`} />
          </button>;
        })}
        {visible.length === 0 && <div className="px-3 py-10 text-center"><Search className="mx-auto h-5 w-5 text-[#BBC4CB]" /><p className="mt-2 text-[10px] font-medium text-[#82909C]">No encontramos expedientes.</p></div>}
      </div>
    </aside>
  );
}

function ValueEntryCard({ title, subtitle, kind, entries, onChange, onSave, onDelete, savingId, onAdd }: {
  title: string; subtitle: string; kind: "estimate" | "sow" | "supplement"; entries: EntryDraft[];
  onChange: (entryNumber: number, field: "amount" | "event_date" | "estimate_sent", value: number | string | boolean | null) => void;
  onSave: (entry: EntryDraft) => void; onDelete: (entry: EntryDraft) => void; savingId: string | null; onAdd?: () => void;
}) {
  const sum = entries.reduce((total, entry) => total + (Number(entry.amount) || 0), 0);
  const Icon = kind === "estimate" ? BadgeDollarSign : kind === "sow" ? FileCheck2 : FilePlus2;
  const count = kind === "estimate" ? "01 / 01" : `${String(entries.length).padStart(2, "0")} / 04`;
  return (
    <section className="overflow-hidden rounded-[20px] border border-[#DDE3E8] bg-white shadow-[0_8px_30px_rgba(23,49,74,0.045)] transition-shadow duration-200 hover:shadow-[0_12px_34px_rgba(23,49,74,0.065)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9EDF0] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFCFD_100%)] px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${kind === "estimate" ? "bg-[#EEF2F6] text-[#2F5270]" : kind === "sow" ? "bg-[#F7F4E9] text-[#755613]" : "bg-[#EDF4F0] text-[#477B62]"}`}><Icon className="h-[17px] w-[17px]" /></span>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-[15px] font-semibold tracking-[-0.02em] text-[#102A46]">{title}</h3><span className="rounded-md bg-[#F1F4F6] px-2 py-1 font-sans text-[10px] font-semibold tracking-wide text-[#596D78]">{count}</span></div><p className="mt-1 text-[12px] text-[#596D78]">{subtitle}</p></div>
        </div>
        <div className="flex w-full items-center justify-between gap-3 pl-[52px] sm:w-auto sm:justify-end sm:pl-0">
          {kind !== "estimate" && <div className="sm:text-right"><p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#87949F]">Total registrado</p><span className="mt-0.5 block text-[13px] font-semibold tabular-nums text-[#344C60]">{money(sum)}</span></div>}
          {onAdd && <button type="button" onClick={onAdd} disabled={entries.length >= MAX_REPEATED_ENTRIES} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#102A46] px-3.5 text-[12px] font-semibold text-white shadow-[0_3px_8px_rgba(23,49,74,0.12)] transition hover:-translate-y-px hover:bg-[#193856] hover:shadow-[0_5px_12px_rgba(23,49,74,0.17)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"><Plus className="h-3.5 w-3.5" />Agregar {kind === "sow" ? "SOW" : "suplemento"}</button>}
        </div>
      </header>

      {entries.length === 0 && kind !== "estimate" && <div className="flex min-h-[84px] items-center gap-3 px-5 py-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F4F6F8] text-[#9AA6AF]"><Plus className="h-4 w-4" /></span><div><p className="text-[12px] font-semibold text-[#526879]">Aún no hay {kind === "sow" ? "SOW" : "suplementos"} en este caso</p><p className="mt-1 text-[11px] text-[#81909D]">Agrega un registro cuando lo recibas o prepares.</p></div></div>}
      {entries.map((entry) => {
        const saving = savingId === `${entry.record_type}:${entry.entry_number}`;
        const label = kind === "estimate" ? "Estimado único" : `${kind === "sow" ? "SOW" : "Suplemento"} ${entry.entry_number}`;
        return <div key={`${entry.record_type}-${entry.entry_number}`} className="border-b border-[#EDF0F2] px-4 py-4 last:border-b-0 sm:px-5 sm:py-4.5">
          <div className="grid grid-cols-1 gap-3 rounded-xl bg-[#FAFBFC] p-3 sm:grid-cols-[minmax(150px,1.05fr)_minmax(145px,1fr)_minmax(150px,1fr)_auto] sm:items-end sm:gap-3.5 sm:p-3.5">
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#596D78]">{label}</p>
              {kind === "estimate" ? <label className={`group flex h-11 cursor-pointer items-center gap-2.5 rounded-lg border px-3 text-[12px] font-semibold transition ${entry.estimate_sent ? "border-[#BCD7C7] bg-[#F0F7F2] text-[#477B62]" : "border-[#E1E6EA] bg-white text-[#536879] hover:border-[#CED7DE]"}`}>
                <input type="checkbox" checked={entry.estimate_sent} onChange={(event) => onChange(entry.entry_number, "estimate_sent", event.target.checked)} className="h-4 w-4 accent-[#477B62]" />
                Estimado enviado
              </label> : <div className="flex h-11 items-center rounded-lg border border-[#E8ECEF] bg-white px-3 text-[12px] font-medium text-[#596D80]">{kind === "sow" ? "Presupuesto recibido del seguro" : "Suplemento preparado"}</div>}
            </div>
            <label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#596D78]">{kind === "estimate" ? "Monto del estimado" : "Monto"}</span><span className="flex h-11 items-center rounded-lg border border-[#E1E6EA] bg-white px-3 transition focus-within:border-[#8C6A22]/60 focus-within:ring-4 focus-within:ring-[#8C6A22]/[0.08]"><span className="mr-2 text-[13px] font-medium text-[#755613]">$</span><input type="number" min="0" step="0.01" inputMode="decimal" value={entry.amount} onChange={(event) => onChange(entry.entry_number, "amount", event.target.value)} placeholder="0.00" className="w-full bg-transparent text-[13px] font-medium tabular-nums text-[#102A46] outline-none placeholder:text-[#B0BAC2]" /></span></label>
            <label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#596D78]">{kind === "sow" ? "Fecha recibido" : kind === "supplement" ? "Fecha preparado" : "Fecha enviado"}</span><span className="flex h-11 items-center gap-2 rounded-lg border border-[#E1E6EA] bg-white px-3 transition focus-within:border-[#8C6A22]/60 focus-within:ring-4 focus-within:ring-[#8C6A22]/[0.08]"><CalendarDays className="h-4 w-4 shrink-0 text-[#755613]" /><input type="date" value={entry.event_date || ""} onChange={(event) => onChange(entry.entry_number, "event_date", event.target.value || null)} className="w-full bg-transparent text-[12px] font-medium text-[#536879] outline-none" /></span></label>
            <div className="flex items-center gap-2 sm:pb-0.5">
              <button type="button" onClick={() => onSave(entry)} disabled={saving} className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#102A46] px-3.5 text-[12px] font-bold text-white shadow-[0_3px_8px_rgba(23,49,74,0.13)] transition hover:-translate-y-px hover:bg-[#193856] hover:shadow-[0_5px_12px_rgba(23,49,74,0.18)] disabled:cursor-wait disabled:opacity-60 sm:flex-none"><Check className="h-4 w-4" />{saving ? "Guardando" : "Guardar"}</button>
              {kind !== "estimate" && <button type="button" onClick={() => onDelete(entry)} disabled={saving} aria-label={`Eliminar ${label}`} title={`Eliminar ${label}`} className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E4E8EB] bg-white text-[#A57272] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>}
            </div>
          </div>
        </div>;
      })}
    </section>
  );
}

function AnalyticsStat({ label, value, detail, icon: Icon, tone = "blue" }: {
  label: string; value: string; detail: string; icon: React.ElementType; tone?: "blue" | "gold" | "green" | "slate";
}) {
  const tones = {
    blue: "bg-[#EEF3F7] text-[#254C68]",
    gold: "bg-[#F7F2E5] text-[#80621F]",
    green: "bg-[#EDF5F0] text-[#39705A]",
    slate: "bg-[#F0F3F5] text-[#596D78]",
  };
  return <article className="min-w-0 rounded-2xl border border-[#DDE3E8] bg-white p-4 shadow-[0_5px_18px_rgba(23,49,74,0.035)] sm:p-5">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#687C89]">{label}</p><p className="mt-2 truncate font-display text-[24px] font-semibold tracking-[-.035em] text-[#122B40] sm:text-[28px]">{value}</p></div><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span></div>
    <p className="mt-2 text-[11px] leading-5 text-[#637782]">{detail}</p>
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

function ValuesInsuranceAnalytics({ claims }: { claims: Lead[] }) {
  const [values, setValues] = useState<AnalyticsValue[]>([]);
  const [finances, setFinances] = useState<AnalyticsFinance[]>([]);
  const [payments, setPayments] = useState<AnalyticsPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [caseQuery, setCaseQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [valueResult, financeResult, paymentResult] = await Promise.all([
        supabase.from("admin_insurance_values").select("lead_id,record_type,entry_number,amount,event_date,estimate_sent"),
        supabase.from("contractor_claim_financials").select("claim_id,rcv,acv"),
        supabase.from("contractor_claim_payments").select("claim_id,status,amount"),
      ]);
      if (cancelled) return;
      const nextErrors: string[] = [];
      if (valueResult.error) nextErrors.push(`Valores Insurance: ${valueResult.error.message}`);
      else setValues((valueResult.data || []) as AnalyticsValue[]);
      if (financeResult.error) nextErrors.push("No fue posible leer RCV/ACV. Revisa el acceso superadmin a las finanzas de contratistas.");
      else setFinances((financeResult.data || []) as AnalyticsFinance[]);
      if (paymentResult.error) nextErrors.push("No fue posible leer los pagos registrados. Revisa el acceso superadmin a pagos de contratistas.");
      else setPayments((paymentResult.data || []) as AnalyticsPayment[]);
      setErrors(nextErrors);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [claims]);

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
      const supplements = rows.filter((row) => row.record_type === "supplement");
      const estimateAmount = Number(estimate?.amount) || 0;
      const sowAmount = Number(latestSow?.amount) || 0;
      const finance = finances.find((row) => row.claim_id === claim.id);
      const claimPayments = payments.filter((row) => row.claim_id === claim.id);
      return {
        claim, estimate, firstSow, latestSow, estimateAmount, sowAmount,
        hasSupplement: supplements.length > 0,
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
        received: claimPayments.filter((row) => row.status === "received").reduce((sum, row) => sum + Number(row.amount || 0), 0),
        expected: claimPayments.filter((row) => row.status === "expected").reduce((sum, row) => sum + Number(row.amount || 0), 0),
      };
    });
    const totals = claimRows.reduce((acc, row) => ({
      estimates: acc.estimates + row.estimateAmount,
      latestSow: acc.latestSow + row.sowAmount,
      additionalSow: acc.additionalSow + (row.sowChange ?? 0),
      received: acc.received + row.received,
      expected: acc.expected + row.expected,
      rcv: acc.rcv + row.rcv,
      acv: acc.acv + row.acv,
    }), { estimates: 0, latestSow: 0, additionalSow: 0, received: 0, expected: 0, rcv: 0, acv: 0 });
    const carrierMap = new Map<string, typeof claimRows>();
    for (const row of claimRows) {
      const carrier = row.claim.insuranceProvider?.trim() || "Aseguradora sin registrar";
      carrierMap.set(carrier, [...(carrierMap.get(carrier) || []), row]);
    }
    const carriers = [...carrierMap.entries()].map(([name, rows]) => {
      const comparable = rows.filter((row) => row.gap !== null);
      const responseTimes = rows.map((row) => row.daysToFirstSow).filter((days): days is number => days !== null);
      return {
        name, claims: rows.length,
        estimates: rows.reduce((sum, row) => sum + row.estimateAmount, 0),
        latestSows: rows.reduce((sum, row) => sum + row.sowAmount, 0),
        avgGap: comparable.length ? comparable.reduce((sum, row) => sum + (row.gap || 0), 0) / comparable.length : null,
        avgResponse: responseTimes.length ? responseTimes.reduce((sum, days) => sum + days, 0) / responseTimes.length : null,
        comparable: comparable.length,
      };
    }).sort((a, b) => b.claims - a.claims || a.name.localeCompare(b.name));
    const statuses = [...new Set(claimRows.map((row) => row.claim.status || "Sin etapa"))].map((status) => ({
      status, count: claimRows.filter((row) => row.claim.status === status).length,
    })).sort((a, b) => b.count - a.count);
    const maxStatus = Math.max(1, ...statuses.map((row) => row.count));
    const missingValues = claimRows.filter((row) => !row.estimate && !row.latestSow && !row.hasSupplement).length;
    const claimsWithSow = claimRows.filter((row) => row.latestSow).length;
    const comparableSowCount = claimRows.filter((row) => row.sowChange !== null).length;
    const datedSowCount = scopedValues.filter((row) => row.record_type === "sow" && row.event_date).length;
    const responseRows = claimRows.filter((row) => row.daysToFirstSow !== null);
    const avgResponse = responseRows.length ? responseRows.reduce((sum, row) => sum + (row.daysToFirstSow || 0), 0) / responseRows.length : null;
    return { claimRows, totals, carriers, statuses, maxStatus, missingValues, claimsWithSow, comparableSowCount, datedSowCount, avgResponse, responseSample: responseRows.length, scopedValues };
  }, [claims, values, finances, payments]);

  const selectedCase = analysis.claimRows.find((row) => row.claim.id === selectedCaseId) || analysis.claimRows[0];
  const visibleCases = analysis.claimRows.filter(({ claim }) =>
    `${claim.name} ${claim.claimNumber} ${claim.insuranceProvider} ${claim.company}`.toLowerCase().includes(caseQuery.trim().toLowerCase()),
  );

  if (loading) return <div className="flex min-h-[300px] items-center justify-center gap-2 rounded-2xl border border-[#DDE3E8] bg-white text-sm text-[#596D80]"><LoaderCircle className="h-4 w-4 animate-spin" />Calculando análisis de cartera…</div>;

  return <div className="space-y-5">
    {errors.length > 0 && <div role="alert" className="rounded-xl border border-[#E9D9B2] bg-[#FBF7EB] px-4 py-3 text-[11px] leading-5 text-[#765B22]">{errors.join(" ")}</div>}
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <AnalyticsStat label="Expedientes de seguro" value={String(claims.length)} detail={`${analysis.claimRows.filter((row) => row.claim.status !== "Finalizado" && row.claim.status !== "Cancelado" && row.claim.status !== "Negados").length} activos según etapa actual`} icon={ShieldCheck} />
      <AnalyticsStat label="Total esperado" value={money(analysis.totals.estimates)} detail="Suma de los montos que se esperan cobrar al seguro en todos los expedientes" icon={BadgeDollarSign} tone="gold" />
      <AnalyticsStat label="Total aprobado · último SOW" value={money(analysis.totals.latestSow)} detail={`Suma del SOW más reciente en ${analysis.claimsWithSow} expedientes`} icon={FileCheck2} tone="blue" />
      <AnalyticsStat label="Incremento adicional logrado" value={money(analysis.totals.additionalSow)} detail={`Último SOW − primer SOW en ${analysis.comparableSowCount} expedientes comparables`} icon={TrendingUp} tone="green" />
    </div>

    <section className="overflow-hidden rounded-2xl border border-[#DDE3E8] bg-white shadow-[0_6px_22px_rgba(23,49,74,0.04)]">
      <header className="flex flex-col gap-3 border-b border-[#E9EDF0] bg-[linear-gradient(112deg,#102945_0%,#102A46_65%,#1A3854_100%)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-[#D3B566]" /><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#D3B566]">Lectura por expediente</p></div><h2 className="mt-1 font-display text-[17px] font-semibold tracking-[-.02em] text-white">Desempeño del caso</h2></div>
        {selectedCase && <div className="text-left sm:text-right"><p className="max-w-[320px] truncate text-[13px] font-semibold text-white">{selectedCase.claim.name}</p><p className="mt-1 text-[10px] text-[#D6E0E7]">{selectedCase.claim.claimNumber} <span className="mx-1 text-[#D3B566]">·</span> {selectedCase.claim.insuranceProvider || "Aseguradora sin registrar"}</p></div>}
      </header>
      {selectedCase ? <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-5">
          <CaseMetric label="Estimado del equipo" value={selectedCase.estimate?.amount === null || !selectedCase.estimate ? "Sin registro" : money(Number(selectedCase.estimate.amount))} detail={selectedCase.estimate?.estimate_sent ? "Marcado como enviado" : "Estimado del alcance esperado"} tone="blue" />
          <CaseMetric label="Primer SOW recibido" value={selectedCase.firstSow?.amount === null || !selectedCase.firstSow ? "Sin registro" : money(Number(selectedCase.firstSow.amount))} detail={selectedCase.firstSow?.event_date ? `Base · ${selectedCase.firstSow.event_date}` : "Monto base de aseguradora"} tone="slate" />
          <CaseMetric label="SOW más reciente" value={selectedCase.latestSow?.amount === null || !selectedCase.latestSow ? "Sin registro" : money(Number(selectedCase.latestSow.amount))} detail={selectedCase.latestSow?.event_date ? `Última revisión · ${selectedCase.latestSow.event_date}` : "Último monto registrado"} tone="blue" />
          <CaseMetric label="Incremento adicional" value={selectedCase.sowChange === null ? "Sin comparación" : `${selectedCase.sowChange > 0 ? "+" : selectedCase.sowChange < 0 ? "−" : ""}${money(Math.abs(selectedCase.sowChange))}`} detail={selectedCase.sowChange === null ? "Registra dos SOW con monto" : "Último SOW menos primer SOW"} tone={selectedCase.sowChange !== null && selectedCase.sowChange > 0 ? "green" : "gold"} />
          <CaseMetric label="% adicional logrado" value={selectedCase.sowChangePercent === null ? "Sin comparación" : `${selectedCase.sowChangePercent > 0 ? "+" : selectedCase.sowChangePercent < 0 ? "−" : ""}${Math.abs(selectedCase.sowChangePercent).toFixed(1)}%`} detail={selectedCase.sowChangePercent === null ? "Requiere dos SOW y un primer SOW mayor a $0" : "Incremento respecto al primer SOW"} tone={selectedCase.sowChangePercent !== null && selectedCase.sowChangePercent > 0 ? "green" : "gold"} />
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-[#E5E9EC] bg-[#F7F9FA] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] leading-5 text-[#526879]">Incremento por caso: último SOW menos primer SOW. El porcentaje se calcula sobre el monto del primer SOW.</p>
          <p className="shrink-0 text-[11px] font-semibold text-[#183249]">Pagos: <span className="text-[#39705A]">{money(selectedCase.received)} recibidos</span><span className="mx-1.5 text-[#A7B2BA]">·</span><span className="text-[#80621F]">{money(selectedCase.expected)} esperados</span></p>
        </div>
      </div> : <div className="px-5 py-12 text-center text-sm text-[#637782]">No hay expedientes para mostrar.</div>}
    </section>

    <section className="overflow-hidden rounded-2xl border border-[#DDE3E8] bg-white shadow-[0_6px_22px_rgba(23,49,74,0.035)]">
      <header className="flex flex-col gap-3 border-b border-[#E9EDF0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-[15px] font-semibold text-[#122B40]">Comparativo de expedientes</h2><p className="mt-1 text-[11px] text-[#637782]">Selecciona un caso para ver el cambio entre sus SOW y los montos registrados.</p></div><label className="relative block w-full sm:max-w-[280px]"><Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7B8D99]" /><input value={caseQuery} onChange={(event) => setCaseQuery(event.target.value)} placeholder="Buscar caso, reclamo o aseguradora" className="h-9 w-full rounded-lg border border-[#DDE3E8] bg-[#F8FAFB] pl-9 pr-3 text-[11px] text-[#183249] outline-none placeholder:text-[#82909A] focus:border-[#8C6A22]/60 focus:ring-4 focus:ring-[#8C6A22]/[0.08]" /></label></header>
      <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead className="bg-[#F4F6F7] text-[10px] uppercase tracking-[.08em] text-[#627582]"><tr><th className="px-5 py-3">Expediente</th><th className="px-4 py-3">Etapa</th><th className="px-4 py-3 text-right">Estimado</th><th className="px-4 py-3 text-right">Primer SOW</th><th className="px-4 py-3 text-right">Último SOW</th><th className="px-4 py-3 text-right">Incremento</th><th className="px-5 py-3 text-right">% adicional</th></tr></thead><tbody className="divide-y divide-[#EDF0F2]">{visibleCases.map((row) => <tr key={row.claim.id} className={`text-[11px] text-[#405766] transition hover:bg-[#F8FAFB] ${selectedCase?.claim.id === row.claim.id ? "bg-[#F3F7FA]" : ""}`}><td className="max-w-[260px] px-5 py-2.5"><button type="button" onClick={() => setSelectedCaseId(row.claim.id)} className="block max-w-full text-left"><span className="block truncate font-semibold text-[#183249] hover:text-[#755613]">{row.claim.name}</span><span className="mt-0.5 block truncate text-[10px] text-[#71838F]">{row.claim.claimNumber} · {row.claim.insuranceProvider || "Aseguradora sin registrar"}</span></button></td><td className="px-4 py-2.5">{row.claim.status || "Sin etapa"}</td><td className="px-4 py-2.5 text-right tabular-nums">{row.estimate?.amount === null || !row.estimate ? "—" : money(Number(row.estimate.amount))}</td><td className="px-4 py-2.5 text-right tabular-nums">{row.firstSow?.amount === null || !row.firstSow ? "—" : money(Number(row.firstSow.amount))}</td><td className="px-4 py-2.5 text-right tabular-nums">{row.latestSow?.amount === null || !row.latestSow ? "—" : money(Number(row.latestSow.amount))}</td><td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${row.sowChange !== null && row.sowChange > 0 ? "text-[#39705A]" : row.sowChange !== null && row.sowChange < 0 ? "text-[#9E4D4D]" : "text-[#71838F]"}`}>{row.sowChange === null ? "—" : `${row.sowChange > 0 ? "+" : row.sowChange < 0 ? "−" : ""}${money(Math.abs(row.sowChange))}`}</td><td className={`px-5 py-2.5 text-right font-semibold tabular-nums ${row.sowChangePercent !== null && row.sowChangePercent > 0 ? "text-[#39705A]" : row.sowChangePercent !== null && row.sowChangePercent < 0 ? "text-[#9E4D4D]" : "text-[#71838F]"}`}>{row.sowChangePercent === null ? "—" : `${row.sowChangePercent > 0 ? "+" : row.sowChangePercent < 0 ? "−" : ""}${Math.abs(row.sowChangePercent).toFixed(1)}%`}</td></tr>)}{visibleCases.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-xs text-[#6B7E89]">No encontramos casos con esa búsqueda.</td></tr>}</tbody></table></div>
    </section>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.85fr)]">
      <section className="overflow-hidden rounded-2xl border border-[#DDE3E8] bg-white shadow-[0_6px_22px_rgba(23,49,74,0.035)]">
        <header className="border-b border-[#E9EDF0] px-5 py-4"><h2 className="font-display text-[15px] font-semibold text-[#122B40]">Comparativo por aseguradora</h2><p className="mt-1 text-[11px] text-[#637782]">Diferencia entre el estimado y el SOW más reciente registrado por fecha.</p></header>
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="bg-[#F4F6F7] text-[9px] uppercase tracking-[.1em] text-[#627582]"><tr><th className="px-5 py-3">Aseguradora</th><th className="px-4 py-3 text-right">Casos</th><th className="px-4 py-3 text-right">Estimado</th><th className="px-4 py-3 text-right">Último SOW</th><th className="px-4 py-3 text-right">Brecha media</th><th className="px-5 py-3 text-right">Días al 1.er SOW</th></tr></thead><tbody className="divide-y divide-[#EDF0F2]">{analysis.carriers.map((carrier) => <tr key={carrier.name} className="text-[11px] text-[#405766]"><td className="max-w-[200px] truncate px-5 py-3 font-semibold text-[#183249]">{carrier.name}</td><td className="px-4 py-3 text-right tabular-nums">{carrier.claims}</td><td className="px-4 py-3 text-right tabular-nums">{money(carrier.estimates)}</td><td className="px-4 py-3 text-right tabular-nums">{money(carrier.latestSows)}</td><td className={`px-4 py-3 text-right font-semibold tabular-nums ${carrier.avgGap !== null && carrier.avgGap > 0 ? "text-[#956C22]" : "text-[#536879]"}`}>{carrier.avgGap === null ? "—" : money(carrier.avgGap)}<span className="ml-1 text-[9px] font-normal text-[#8997A0]">{carrier.comparable ? `n=${carrier.comparable}` : ""}</span></td><td className="px-5 py-3 text-right tabular-nums">{carrier.avgResponse === null ? "—" : `${carrier.avgResponse.toFixed(1)} d`}</td></tr>)}{analysis.carriers.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-xs text-[#6B7E89]">Todavía no hay casos para comparar.</td></tr>}</tbody></table></div>
      </section>

      <section className="rounded-2xl border border-[#DDE3E8] bg-white p-5 shadow-[0_6px_22px_rgba(23,49,74,0.035)]">
        <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-[#82621e]" /><h2 className="font-display text-[15px] font-semibold text-[#122B40]">Cartera por etapa</h2></div>
        <div className="mt-4 space-y-3">{analysis.statuses.map((row) => <div key={row.status}><div className="mb-1.5 flex items-center justify-between gap-2 text-[10px]"><span className="truncate font-medium text-[#425968]">{row.status}</span><span className="font-bold tabular-nums text-[#183249]">{row.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#EEF2F4]"><div className="h-full rounded-full bg-[#234662]" style={{ width: `${(row.count / analysis.maxStatus) * 100}%` }} /></div></div>)}{analysis.statuses.length === 0 && <p className="py-8 text-center text-xs text-[#6B7E89]">Sin expedientes.</p>}</div>
        <div className="mt-5 grid grid-cols-2 gap-2 border-t border-[#E9EDF0] pt-4"><div className="rounded-xl bg-[#F5F7F8] p-3"><p className="text-[9px] font-bold uppercase tracking-wide text-[#72838D]">RCV registrado</p><p className="mt-1 text-[14px] font-semibold tabular-nums text-[#183249]">{money(analysis.totals.rcv)}</p></div><div className="rounded-xl bg-[#F5F7F8] p-3"><p className="text-[9px] font-bold uppercase tracking-wide text-[#72838D]">ACV registrado</p><p className="mt-1 text-[14px] font-semibold tabular-nums text-[#183249]">{money(analysis.totals.acv)}</p></div></div>
      </section>
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <AnalyticsStat label="Pagos recibidos" value={money(analysis.totals.received)} detail="Suma de pagos que el equipo registró como recibidos." icon={CircleDollarSign} tone="green" />
      <AnalyticsStat label="Pagos esperados" value={money(analysis.totals.expected)} detail="Suma de pagos pendientes según los registros actuales." icon={Clock3} tone="gold" />
      <AnalyticsStat label="Sin valores de negociación" value={String(analysis.missingValues)} detail={`De ${claims.length} expedientes, no tienen estimado, SOW ni suplemento registrados.`} icon={FilePlus2} tone="slate" />
    </div>

    <section className="rounded-2xl border border-[#DDE3E8] bg-white p-5 shadow-[0_6px_22px_rgba(23,49,74,0.035)]">
      <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F5F1E4] text-[#80621F]"><Clock3 className="h-4 w-4" /></span><div><h2 className="font-display text-[14px] font-semibold text-[#122B40]">Calidad de datos y tiempos</h2><p className="mt-1 text-[11px] leading-5 text-[#637782]">{analysis.avgResponse === null ? "Aún no hay suficientes fechas enlazadas para calcular días entre el envío del estimado y la llegada del primer SOW." : `Promedio de ${analysis.avgResponse.toFixed(1)} días entre el estimado marcado como enviado y el primer SOW fechado, usando ${analysis.responseSample} casos con ambas fechas.`} {analysis.datedSowCount} SOW tienen fecha registrada.</p></div></div>
      <div className="mt-4 rounded-xl border border-[#E9DFBF] bg-[#FCFAF3] px-4 py-3 text-[10px] leading-5 text-[#6D5B32]">Los suplementos se muestran como <strong>preparados</strong>. El CRM todavía no registra si fueron enviados, aprobados, reducidos o rechazados; por eso este tablero no los cuenta como dinero recuperado ni calcula una tasa de éxito.</div>
    </section>
  </div>;
}

export default function ValuesInsuranceView({ claims }: { claims: Lead[] }) {
  const activeClaims = useMemo(() => claims.filter((claim) => claim.is_insurance_claim), [claims]);
  const [sectionTab, setSectionTab] = useState<"records" | "analysis">("records");
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const [query, setQuery] = useState("");
  const [estimate, setEstimate] = useState<EntryDraft>({ record_type: "estimate", entry_number: 1, amount: "", event_date: null, estimate_sent: false });
  const [sows, setSows] = useState<EntryDraft[]>([]);
  const [supplements, setSupplements] = useState<EntryDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!activeClaims.length) {
      setSelectedClaimId("");
      return;
    }
    if (!activeClaims.some((claim) => claim.id === selectedClaimId)) setSelectedClaimId(activeClaims[0].id);
  }, [activeClaims, selectedClaimId]);

  const selectedClaim = activeClaims.find((claim) => claim.id === selectedClaimId);

  useEffect(() => {
    let cancelled = false;
    if (!selectedClaim) return;
    setLoading(true);
    setNotice(null);
    setEstimate({ record_type: "estimate", entry_number: 1, amount: "", event_date: null, estimate_sent: false });
    setSows([]);
    setSupplements([]);

    const loadEntries = async () => {
      try {
        const { data, error } = await supabase.from("admin_insurance_values").select("*").eq("lead_id", selectedClaim.id).order("record_type").order("entry_number");
        if (cancelled) return;
        if (error) {
          const message = error.code === "42P01" || error.code === "PGRST205"
            ? "Falta aplicar schema_admin_insurance_values.sql a la base de datos."
            : `No se pudieron cargar los valores: ${error.message}`;
          setNotice({ kind: "error", message });
          return;
        }
        const rows = (data || []) as ValueEntry[];
        const estimateRow = rows.find((row) => row.record_type === "estimate");
        if (estimateRow) setEstimate({ id: estimateRow.id, record_type: "estimate", entry_number: 1, amount: estimateRow.amount === null ? "" : String(estimateRow.amount), event_date: estimateRow.event_date, estimate_sent: estimateRow.estimate_sent });
        setSows(rows.filter((row) => row.record_type === "sow").map(({ id, record_type, entry_number, amount, event_date, estimate_sent }) => ({ id, record_type, entry_number, amount: amount === null ? "" : String(amount), event_date, estimate_sent })));
        setSupplements(rows.filter((row) => row.record_type === "supplement").map(({ id, record_type, entry_number, amount, event_date, estimate_sent }) => ({ id, record_type, entry_number, amount: amount === null ? "" : String(amount), event_date, estimate_sent })));
      } catch (error) {
        if (!cancelled) setNotice({ kind: "error", message: `No se pudieron cargar los valores: ${error instanceof Error ? error.message : "Error de conexión"}` });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadEntries();

    return () => { cancelled = true; };
  }, [selectedClaim?.id]);

  const updateEntry = (kind: EntryKind, entryNumber: number, field: "amount" | "event_date" | "estimate_sent", value: number | string | boolean | null) => {
    const updater = (entry: EntryDraft) => entry.entry_number === entryNumber ? { ...entry, [field]: value } : entry;
    if (kind === "estimate") setEstimate(updater);
    if (kind === "sow") setSows((rows) => rows.map(updater));
    if (kind === "supplement") setSupplements((rows) => rows.map(updater));
    setNotice(null);
  };

  const saveEntry = async (entry: EntryDraft) => {
    if (!selectedClaim?.organizationId) {
      setNotice({ kind: "error", message: "Este expediente no tiene una empresa vinculada." });
      return;
    }
    const key = `${entry.record_type}:${entry.entry_number}`;
    const amount = entry.amount.trim() === "" ? null : Number(entry.amount);
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      setNotice({ kind: "error", message: "Ingresa un monto válido mayor o igual a cero." });
      return;
    }
    setSavingId(key);
    setNotice(null);
    const payload = {
      lead_id: selectedClaim.id,
      organization_id: selectedClaim.organizationId,
      record_type: entry.record_type,
      entry_number: entry.entry_number,
      amount,
      event_date: entry.event_date || null,
      estimate_sent: entry.record_type === "estimate" && entry.estimate_sent,
    };
    const { data, error } = await supabase.from("admin_insurance_values").upsert(payload, { onConflict: "lead_id,record_type,entry_number" }).select("*").single();
    if (error) {
      setNotice({ kind: "error", message: `No se pudo guardar: ${error.message}` });
    } else {
      const row = data as ValueEntry;
      const saved: EntryDraft = { id: row.id, record_type: row.record_type, entry_number: row.entry_number, amount: row.amount === null ? "" : String(row.amount), event_date: row.event_date, estimate_sent: row.estimate_sent };
      if (saved.record_type === "estimate") setEstimate(saved);
      if (saved.record_type === "sow") setSows((rows) => rows.map((item) => item.entry_number === saved.entry_number ? saved : item));
      if (saved.record_type === "supplement") setSupplements((rows) => rows.map((item) => item.entry_number === saved.entry_number ? saved : item));
      setNotice({ kind: "success", message: "Cambios guardados en el expediente." });
    }
    setSavingId(null);
  };

  const addEntry = (kind: "sow" | "supplement") => {
    const rows = kind === "sow" ? sows : supplements;
    if (rows.length >= MAX_REPEATED_ENTRIES) return;
    const occupied = new Set(rows.map((row) => row.entry_number));
    const entryNumber = [1, 2, 3, 4].find((value) => !occupied.has(value)) || rows.length + 1;
    const draft = newDraft(kind, entryNumber);
    if (kind === "sow") setSows((current) => [...current, draft].sort((a, b) => a.entry_number - b.entry_number));
    if (kind === "supplement") setSupplements((current) => [...current, draft].sort((a, b) => a.entry_number - b.entry_number));
    setNotice(null);
  };

  const deleteEntry = async (entry: EntryDraft) => {
    if (!selectedClaim) return;
    if (!entry.id) {
      if (entry.record_type === "sow") setSows((rows) => rows.filter((row) => row.entry_number !== entry.entry_number));
      if (entry.record_type === "supplement") setSupplements((rows) => rows.filter((row) => row.entry_number !== entry.entry_number));
      return;
    }
    const label = entry.record_type === "sow" ? `SOW ${entry.entry_number}` : `Suplemento ${entry.entry_number}`;
    if (!window.confirm(`¿Eliminar ${label} de este expediente? Esta acción no se puede deshacer.`)) return;
    const key = `${entry.record_type}:${entry.entry_number}`;
    setSavingId(key);
    setNotice(null);
    const { error } = await supabase.from("admin_insurance_values").delete().eq("id", entry.id).eq("lead_id", selectedClaim.id);
    if (error) setNotice({ kind: "error", message: `No se pudo eliminar: ${error.message}` });
    else {
      if (entry.record_type === "sow") setSows((rows) => rows.filter((row) => row.entry_number !== entry.entry_number));
      if (entry.record_type === "supplement") setSupplements((rows) => rows.filter((row) => row.entry_number !== entry.entry_number));
      setNotice({ kind: "success", message: "Registro eliminado del expediente." });
    }
    setSavingId(null);
  };

  return (
    <main className="crm-workspace min-h-0 flex-1 overflow-y-auto bg-[#F2F4F6]" aria-label="Valores Insurance, superadministrador">
      <div className="mx-auto w-full max-w-[1500px] space-y-5 px-4 py-5 sm:px-6 sm:py-7 xl:px-8">
        <header className="relative isolate overflow-hidden rounded-[22px] border border-[#29465D] bg-[linear-gradient(112deg,#102945_0%,#102A46_58%,#1A3854_100%)] px-5 py-3.5 shadow-[0_12px_32px_rgba(23,49,74,0.16)] sm:px-6 sm:py-4">
          <div className="pointer-events-none absolute -right-10 -top-20 -z-10 h-52 w-52 rounded-full border border-[#8C6A22]/20" />
          <div className="pointer-events-none absolute -right-1 -top-11 -z-10 h-36 w-36 rounded-full border border-[#D3B566]/30" />
          <div className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-1/2 bg-[radial-gradient(ellipse_at_top_right,rgba(183,122,75,0.18),transparent_68%)]" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-[#D3B566]/35 bg-[#8C6A22]/15 text-[#D5BF7A] shadow-[inset_0_1px_0_rgba(255,255,255,.1)]"><BadgeDollarSign className="h-[18px] w-[18px]" /></span>
              <div><p className="text-[9px] font-bold uppercase tracking-[0.17em] text-[#D3B566]">Administración de casos</p><h1 className="mt-0.5 font-display text-[23px] font-semibold tracking-[-0.04em] text-white sm:text-[25px]">Valores Insurance</h1></div>
            </div>
            <span className="ml-[58px] inline-flex w-fit items-center gap-1.5 rounded-full border border-[#D3B566]/25 bg-[#0C2036]/55 px-3 py-1.5 text-[9px] font-semibold tracking-wide text-[#D8C68A] sm:ml-0"><span className="h-1.5 w-1.5 rounded-full bg-[#D89B6D]" />Solo superadmin</span>
          </div>
        </header>

        <div role="tablist" aria-label="Secciones de Valores Insurance" className="inline-flex w-fit rounded-xl border border-[#DDE3E8] bg-white p-1 shadow-[0_3px_12px_rgba(23,49,74,0.04)]">
          <button type="button" role="tab" aria-selected={sectionTab === "records"} onClick={() => setSectionTab("records")} className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-[12px] font-semibold transition ${sectionTab === "records" ? "bg-[#102A46] text-white shadow-sm" : "text-[#526879] hover:bg-[#F3F6F8] hover:text-[#183249]"}`}><FileCheck2 className="h-4 w-4" />Registro</button>
          <button type="button" role="tab" aria-selected={sectionTab === "analysis"} onClick={() => setSectionTab("analysis")} className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-[12px] font-semibold transition ${sectionTab === "analysis" ? "bg-[#102A46] text-white shadow-sm" : "text-[#526879] hover:bg-[#F3F6F8] hover:text-[#183249]"}`}><BarChart3 className="h-4 w-4" />Análisis</button>
        </div>

        {sectionTab === "analysis" ? <ValuesInsuranceAnalytics claims={activeClaims} /> : activeClaims.length === 0 ? <section className="rounded-[20px] border border-dashed border-[#CED7DE] bg-white px-5 py-16 text-center shadow-[0_6px_24px_rgba(23,49,74,0.035)]"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F1F4F6] text-[#8294A2]"><FilePlus2 className="h-5 w-5" /></span><h2 className="mt-4 font-display text-[15px] font-semibold text-[#102A46]">No hay expedientes de seguro</h2><p className="mx-auto mt-1.5 max-w-sm text-[11px] leading-relaxed text-[#596D80]">Cuando la cartera tenga casos, podrás registrar sus estimados, SOW y suplementos aquí.</p></section> : <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
          <ClaimSelector claims={activeClaims} selectedId={selectedClaimId} onSelect={setSelectedClaimId} query={query} onQuery={setQuery} />
          <div className="min-w-0 space-y-4 sm:space-y-5">
            {selectedClaim && <section className="relative overflow-hidden rounded-[20px] border border-[#29465D] bg-[linear-gradient(112deg,#102945_0%,#102A46_62%,#1A3854_100%)] px-4 py-4 shadow-[0_10px_28px_rgba(23,49,74,0.15)] sm:px-5 sm:py-[18px]">
              <span className="absolute inset-y-4 left-0 w-[3px] rounded-r-full bg-gradient-to-b from-[#D3B566] via-[#8C6A22] to-[#D5BF7A]" />
              <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-40 w-40 rounded-full border border-[#D3B566]/15" />
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D3B566]/20 bg-[#8C6A22]/15 text-[#D5BF7A]"><FileCheck2 className="h-[17px] w-[17px]" /></span>
                  <div className="min-w-0"><p className="font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-[#D3B566]">Expediente seleccionado</p><h2 className="mt-1 truncate font-sans text-[18px] font-semibold tracking-[-0.015em] text-white">{selectedClaim.name}</h2><p className="mt-1 truncate font-sans text-[12px] text-[#CBD6DE]">{selectedClaim.company} <span className="mx-1 text-[#D3B566]/70">·</span> {selectedClaim.insuranceProvider}</p></div>
                </div>
                <span className="ml-[52px] w-fit rounded-lg border border-[#D3B566]/25 bg-[#0C2036]/55 px-2.5 py-1.5 font-sans text-[11px] font-semibold tracking-[0.01em] text-[#D8C68A] sm:ml-0">{selectedClaim.claimNumber}</span>
              </div>
            </section>}

            {notice && <div role={notice.kind === "error" ? "alert" : "status"} className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-[10px] font-medium shadow-[0_3px_12px_rgba(23,49,74,0.035)] ${notice.kind === "error" ? "border-[#F0D1D1] bg-[#FFF8F7] text-[#9E4D4D]" : "border-[#CFE2D6] bg-[#F5FAF6] text-[#477B62]"}`}>{notice.kind === "error" ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}{notice.message}</div>}

            {loading ? <div className="flex min-h-[260px] items-center justify-center gap-2 rounded-[20px] border border-[#DDE3E8] bg-white text-[11px] font-medium text-[#596D80] shadow-[0_8px_30px_rgba(23,49,74,0.04)]"><LoaderCircle className="h-4 w-4 animate-spin text-[#755613]" />Cargando valores guardados…</div> : selectedClaim && <>
              <ValueEntryCard title="Estimado" subtitle="Solo puede registrarse un estimado por expediente." kind="estimate" entries={[estimate]} onChange={(number, field, value) => updateEntry("estimate", number, field, value)} onSave={saveEntry} onDelete={deleteEntry} savingId={savingId} />
              <ValueEntryCard title="SOW recibidos" subtitle="Presupuestos enviados por la aseguradora · máximo 4." kind="sow" entries={sows} onChange={(number, field, value) => updateEntry("sow", number, field, value)} onSave={saveEntry} onDelete={deleteEntry} savingId={savingId} onAdd={() => addEntry("sow")} />
              <ValueEntryCard title="Suplementos" subtitle="Suplementos preparados por el equipo · máximo 4." kind="supplement" entries={supplements} onChange={(number, field, value) => updateEntry("supplement", number, field, value)} onSave={saveEntry} onDelete={deleteEntry} savingId={savingId} onAdd={() => addEntry("supplement")} />
              <p className="px-1 text-[9px] leading-relaxed text-[#5C6D7D]">Cada registro se guarda en el expediente seleccionado. El botón Guardar confirma los cambios de cada fila.</p>
            </>}
          </div>
        </div>}
      </div>
    </main>
  );
}

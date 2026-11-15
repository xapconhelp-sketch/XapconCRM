import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, BadgeDollarSign, FileCheck2, ReceiptText, Store, UsersRound, Wallet, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ViewType, type Lead } from "../../types";
import { supabase } from "../../lib/supabase";
import { queryAll } from "../../lib/queryAll.js";

type ClaimTotals = { rcv: number; retail: number; approved: number; collected: number };
type PeriodEntry = { kind: "income" | "expense" | "improvement" | "supplement"; amount: number; date: string };
type PeriodFilter = "week" | "month";
type AnalyticsView = ViewType.ANALYTICS | ViewType.ANALYTICS_RETAIL | ViewType.ANALYTICS_SPECIALIZED_INSURANCE | ViewType.ANALYTICS_SPECIALIZED_RETAIL;

const numberFormat = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const currency = (value: number) => `$${numberFormat.format(value || 0)}`;
const generalTabs: Array<{ view: AnalyticsView; label: string }> = [
  { view: ViewType.ANALYTICS, label: "Aseguranzas" },
  { view: ViewType.ANALYTICS_RETAIL, label: "Retail" },
];
const specializedTabs: Array<{ view: AnalyticsView; label: string }> = [
  { view: ViewType.ANALYTICS_SPECIALIZED_INSURANCE, label: "Aseguranzas" },
  { view: ViewType.ANALYTICS_SPECIALIZED_RETAIL, label: "Retail" },
];

function parseDate(value?: string | null) {
  if (!value) return Number.NaN;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return dateOnly ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])).getTime() : Date.parse(value);
}

function getPeriodRange(period: PeriodFilter, selectedMonth: string, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week") {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setMilliseconds(-1);
    const format = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" });
    return { start: start.getTime(), end: end.getTime(), label: `${format.format(start)} – ${format.format(end)}` };
  }
  const [selectedYear, monthNumber] = selectedMonth.split("-").map(Number);
  const monthStart = new Date(selectedYear, monthNumber - 1, 1);
  const monthEnd = new Date(selectedYear, monthNumber, 1);
  monthEnd.setMilliseconds(-1);
  return {
    start: monthStart.getTime(),
    end: monthEnd.getTime(),
    label: new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(monthStart),
  };
}

function inRange(value: string | undefined, range: { start: number; end: number }) {
  const date = parseDate(value);
  return Number.isFinite(date) && date >= range.start && date <= range.end;
}

function statusCounts(claims: Lead[], range: { start: number; end: number }) {
  const ids = {
    new: new Set<string>(),
    approved: new Set<string>(),
    denied: new Set<string>(),
    cancelled: new Set<string>(),
  };
  claims.forEach((claim) => {
    if (inRange(claim.created_at || claim.createdAt, range)) ids.new.add(claim.id);
    (claim.timeline || []).forEach((event) => {
      if (event.type !== "status_change") return;
      const eventDate = parseDate(event.date || event.timestamp);
      if (!Number.isFinite(eventDate) || eventDate < range.start || eventDate > range.end) return;
      const status = (event.toStatus || String(event.content || "").split("→").at(-1)?.trim() || "").toLowerCase();
      if (status.includes("aprobado")) ids.approved.add(claim.id);
      if (status.includes("negado") || status.includes("denied")) ids.denied.add(claim.id);
      if (status.includes("cancelado") || status.includes("cancelled") || status.includes("canceled")) ids.cancelled.add(claim.id);
    });
  });
  return [
    { key: "new", label: "Casos nuevos", count: ids.new.size, color: "#315875" },
    { key: "approved", label: "Casos aprobados", count: ids.approved.size, color: "#4D8A70" },
    { key: "denied", label: "Casos negados", count: ids.denied.size, color: "#C45B55" },
    { key: "cancelled", label: "Casos cancelados", count: ids.cancelled.size, color: "#9AA5B1" },
  ];
}

function CasesStatusChart({ counts, periodLabel }: { counts: ReturnType<typeof statusCounts>; periodLabel: string }) {
  const chart = { left: 48, right: 738, top: 36, bottom: 190 };
  const maxCount = Math.max(1, ...counts.map((item) => item.count));
  const step = Math.max(1, Math.ceil(maxCount / 4));
  const axisMax = step * 4;
  const plotWidth = chart.right - chart.left;
  const plotHeight = chart.bottom - chart.top;
  const groupWidth = plotWidth / counts.length;
  const barWidth = 42;
  const barX = (index: number) => chart.left + groupWidth * index + (groupWidth - barWidth) / 2;
  const barHeight = (value: number) => (value / axisMax) * plotHeight;
  const labels = [
    ["Casos", "nuevos"],
    ["Casos", "aprobados"],
    ["Casos", "negados"],
    ["Casos", "cancelados"],
  ];

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-labelledby="contractor-cases-chart-title">
    <div className="border-b border-[#EDF0F3] px-4 py-3 sm:px-6">
      <h2 id="contractor-cases-chart-title" className="text-[15px] font-semibold tracking-[-0.01em] text-[#202B38]">Casos por Status</h2>
      <p className="mt-1 text-[11px] text-slate-500">Reclamos creados y cambios de estado durante {periodLabel}.</p>
    </div>
    <div className="px-3 pb-3 pt-2 sm:px-5 sm:pb-4">
      <svg className="mx-auto block h-auto w-full max-w-[760px]" viewBox="0 0 760 246" role="img" aria-labelledby="contractor-cases-chart-title contractor-cases-chart-description">
        <desc id="contractor-cases-chart-description">Cantidad de casos nuevos, aprobados, negados y cancelados en el periodo seleccionado.</desc>
        {[0, 1, 2, 3, 4].map((tick) => {
          const value = axisMax - tick * step;
          const y = chart.top + (tick * plotHeight) / 4;
          return <g key={tick}>
            <line x1={chart.left} x2={chart.right} y1={y} y2={y} stroke={tick === 4 ? "#DDE3E9" : "#EDF0F3"} />
            <text x={chart.left - 12} y={y + 3.5} textAnchor="end" fill="#8993A0" fontSize="9" fontWeight="500">{value}</text>
          </g>;
        })}
        {counts.map((item, index) => {
          const height = barHeight(item.count);
          const x = barX(index);
          const y = chart.bottom - height;
          const center = x + barWidth / 2;
          return <g key={item.key}>
            <rect x={x} y={item.count === 0 ? chart.bottom - 2 : y} width={barWidth} height={Math.max(2, height)} rx="4" fill={item.color} opacity={item.count === 0 ? 0.35 : 0.98} />
            <text x={center} y={Math.max(14, y - 8)} textAnchor="middle" fill="#243449" fontSize="10" fontWeight="700">{item.count}</text>
            <text x={center} y="211" textAnchor="middle" fill="#596575" fontSize="10" fontWeight="600">
              <tspan x={center} dy="0">{labels[index][0]}</tspan>
              <tspan x={center} dy="12">{labels[index][1]}</tspan>
            </text>
            <title>{`${item.label}: ${item.count}`}</title>
          </g>;
        })}
      </svg>
    </div>
  </section>;
}

export default function ContractorAnalyticsView({ claims, organizationId, currentView, onViewChange }: {
  claims: Lead[];
  organizationId: string;
  currentView: AnalyticsView;
  onViewChange: (view: ViewType) => void;
}) {
  const [totals, setTotals] = useState<Record<string, ClaimTotals>>({});
  const [periodEntries, setPeriodEntries] = useState<PeriodEntry[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>("week");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const claimIdsKey = useMemo(() => claims.map((claim) => claim.id).sort().join("|"), [claims]);
  const claimIds = useMemo(() => claimIdsKey ? claimIdsKey.split("|") : [], [claimIdsKey]);
  const range = useMemo(() => getPeriodRange(period, selectedMonth), [period, selectedMonth]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      if (!organizationId || claimIds.length === 0) {
        setTotals({});
        setPeriodEntries([]);
        setLoading(false);
        return;
      }
      const [financials, supplements, payments, costs] = await Promise.all([
        queryAll((from, to) => supabase.from("contractor_claim_financials").select("claim_id, rcv, retail_upgrades, contract_signed_date, created_at").eq("organization_id", organizationId).in("claim_id", claimIds).range(from, to)),
        queryAll((from, to) => supabase.from("contractor_claim_supplements").select("claim_id, approved_amount, approval_date, created_at").eq("organization_id", organizationId).in("claim_id", claimIds).range(from, to)),
        queryAll((from, to) => supabase.from("contractor_claim_payments").select("claim_id, amount, status, received_date, created_at").eq("organization_id", organizationId).in("claim_id", claimIds).range(from, to)),
        queryAll((from, to) => supabase.from("contractor_claim_costs").select("claim_id, amount, is_return_credit, paid_date, created_at").eq("organization_id", organizationId).in("claim_id", claimIds).range(from, to)),
      ]);
      if (!active) return;
      const failed = financials.error || supplements.error || payments.error || costs.error;
      if (failed) {
        setError(`No se pudieron cargar las analíticas. ${failed.message}`);
        setLoading(false);
        return;
      }
      const next: Record<string, ClaimTotals> = {};
      const rowFor = (claimId: string) => next[claimId] ||= { rcv: 0, retail: 0, approved: 0, collected: 0 };
      const nextEntries: PeriodEntry[] = [];
      for (const row of financials.data || []) {
        const total = rowFor(row.claim_id);
        total.rcv = Number(row.rcv || 0);
        total.retail = Number(row.retail_upgrades || 0);
        if (total.retail > 0) nextEntries.push({ kind: "improvement", amount: total.retail, date: row.contract_signed_date || row.created_at || "" });
      }
      for (const row of supplements.data || []) {
        const amount = Number(row.approved_amount || 0);
        rowFor(row.claim_id).approved += amount;
        if (amount > 0) nextEntries.push({ kind: "supplement", amount, date: row.approval_date || row.created_at || "" });
      }
      for (const row of payments.data || []) {
        if (row.status !== "received" && row.status !== "deposited") continue;
        const amount = Number(row.amount || 0);
        rowFor(row.claim_id).collected += amount;
        nextEntries.push({ kind: "income", amount, date: row.received_date || row.created_at || "" });
      }
      for (const row of costs.data || []) {
        const amount = Number(row.amount || 0) * (row.is_return_credit ? -1 : 1);
        nextEntries.push({ kind: "expense", amount, date: row.paid_date || row.created_at || "" });
      }
      setTotals(next);
      setPeriodEntries(nextEntries);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [organizationId, claimIdsKey, claimIds]);

  const claimsInPeriod = useMemo(() => claims.filter((claim) => inRange(claim.created_at || claim.createdAt, range)), [claims, range]);
  const periodCaseCounts = useMemo(() => statusCounts(claims, range), [claims, range]);
  const filteredEntries = useMemo(() => periodEntries.filter((entry) => inRange(entry.date, range)), [periodEntries, range]);
  const projectsValue = claimsInPeriod.reduce((sum, claim) => {
    const total = totals[claim.id];
    return sum + (total?.rcv || 0) + (total?.retail || 0) + (total?.approved || 0);
  }, 0);
  const projectReceivable = Math.max(0, claimsInPeriod.reduce((sum, claim) => {
    const total = totals[claim.id];
    return sum + (total?.rcv || 0) + (total?.retail || 0) + (total?.approved || 0) - (total?.collected || 0);
  }, 0));
  const periodApproved = filteredEntries.filter((entry) => entry.kind === "supplement").reduce((sum, entry) => sum + entry.amount, 0);
  const periodIncome = filteredEntries.filter((entry) => entry.kind === "income").reduce((sum, entry) => sum + entry.amount, 0);
  const periodExpenses = filteredEntries.filter((entry) => entry.kind === "expense").reduce((sum, entry) => sum + entry.amount, 0);
  const periodImprovements = filteredEntries.filter((entry) => entry.kind === "improvement").reduce((sum, entry) => sum + entry.amount, 0);

  const isSpecializedView = currentView === ViewType.ANALYTICS_SPECIALIZED_INSURANCE || currentView === ViewType.ANALYTICS_SPECIALIZED_RETAIL;
  const isInsuranceView = currentView === ViewType.ANALYTICS || currentView === ViewType.ANALYTICS_SPECIALIZED_INSURANCE;
  const sectionTitle = `${isSpecializedView ? "Especializada" : "General"} · ${isInsuranceView ? "Aseguranzas" : "Retail"}`;
  const analyticsTabs = isSpecializedView ? specializedTabs : generalTabs;
  const coreKpis: Array<{ label: string; value: string; detail: string; icon: LucideIcon }> = [
    { label: "Valor de proyectos", value: currency(projectsValue), detail: "Proyectos creados en el periodo", icon: BadgeDollarSign },
    { label: "Saldo por cobrar", value: currency(projectReceivable), detail: "Saldo de los proyectos del periodo", icon: FileCheck2 },
    { label: "Suplementos aprobados", value: currency(periodApproved), detail: "Aprobaciones adicionales del periodo", icon: ReceiptText },
    { label: "Pagos recibidos", value: currency(periodIncome), detail: "Cobros marcados como recibidos o depositados", icon: ArrowDownToLine },
  ];
  const squadKpis: Array<{ label: string; value: string; detail: string; icon: LucideIcon }> = [
    { label: "Ingresos por Escuadra", value: currency(periodIncome), detail: "Cobros de reclamos de tu organización; aún sin desglose por cuadrilla", icon: UsersRound },
    { label: "Gastos por Escuadra", value: currency(periodExpenses), detail: "Costos registrados en reclamos de tu organización; aún sin desglose por cuadrilla", icon: Wallet },
    { label: "Ingresos de Mejoras", value: currency(periodImprovements), detail: "Valor de mejoras registrado en el periodo", icon: TrendingUp },
  ];

  return <section className="mx-auto min-h-0 w-full max-w-[1500px] flex-1 space-y-5 overflow-y-auto p-4 sm:p-6" aria-label={`Analítica de contratista · ${sectionTitle}`}>
    <header className="overflow-hidden rounded-2xl bg-black text-white">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-7">
        <div><h1 className="text-xl font-bold">Analítica</h1><p className="mt-0.5 text-xs text-slate-300">{sectionTitle}</p></div>
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label="Tipo de analítica" className="inline-flex rounded-lg border border-white/15 bg-white/5 p-1">
            {analyticsTabs.map(({ view, label }) => <button
              key={view}
              type="button"
              role="tab"
              aria-selected={currentView === view}
              onClick={() => onViewChange(view)}
              className={`min-h-9 rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${currentView === view ? "bg-white text-[#102A46] shadow-sm" : "text-slate-200 hover:bg-white/10 hover:text-white"}`}
            >{label}</button>)}
          </div>
          {!isSpecializedView && isInsuranceView && <span className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-slate-200">{claims.length} {claims.length === 1 ? "reclamo" : "reclamos"} de seguro</span>}
        </div>
      </div>
    </header>

    {!isSpecializedView && (isInsuranceView ? <div className="space-y-4">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div><p className="text-xs font-semibold text-[#102A46]">Periodo de análisis</p><p className="mt-0.5 text-base font-bold leading-6 text-slate-500">{range.label}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          {period === "month" && <label className="sr-only" htmlFor="analytics-month">Seleccionar mes y año</label>}
          {period === "month" && <input id="analytics-month" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} aria-label="Seleccionar mes y año" className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-[#102A46] outline-none focus:border-[#315875] focus:ring-2 focus:ring-[#315875]/15" />}
          <div role="group" aria-label="Filtrar analítica por periodo" className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {([{ value: "week", label: "Semana" }, { value: "month", label: "Mes" }] as const).map((option) => <button key={option.value} type="button" aria-pressed={period === option.value} onClick={() => setPeriod(option.value)} className={`min-h-8 rounded-md px-4 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315875] ${period === option.value ? "bg-[#102A46] text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-[#102A46]"}`}>{option.label}</button>)}
          </div>
        </div>
      </div>
      <div className="grid items-stretch gap-3 xl:grid-cols-2">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-rows-2">
          {coreKpis.map(({ label, value, detail, icon: Icon }) => <article key={label} className="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-[#102A46]">{loading ? "—" : value}</p></div><span className="shrink-0 rounded-lg bg-[#eff4f7] p-2 text-[#315875]"><Icon className="size-5"/></span></div><p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p></article>)}
        </div>
        <CasesStatusChart counts={periodCaseCounts} periodLabel={period === "week" ? "la semana seleccionada" : "el mes seleccionado"} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {squadKpis.map(({ label, value, detail, icon: Icon }) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-[#102A46]">{loading ? "—" : value}</p></div><span className="shrink-0 rounded-lg bg-[#eff4f7] p-2 text-[#315875]"><Icon className="size-5"/></span></div><p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p></article>)}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-base font-bold text-[#102A46]">Cartera de aseguranzas</h2><p className="mt-1 text-xs text-slate-500">Proyectos creados durante el periodo seleccionado.</p></div>
        {loading ? <p role="status" className="px-5 py-8 text-sm text-slate-500">Cargando analítica…</p> : claimsInPeriod.length === 0 ? <p className="px-5 py-8 text-sm text-slate-500">No hay reclamos de seguro registrados en este periodo.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Proyecto</th><th className="px-4 py-3 font-semibold">RCV inicial</th><th className="px-4 py-3 font-semibold">Suplementos</th><th className="px-4 py-3 font-semibold">Valor registrado</th><th className="px-5 py-3 text-right font-semibold">Pagos recibidos</th></tr></thead><tbody className="divide-y divide-slate-100">{claimsInPeriod.map((claim) => { const total = totals[claim.id] || { rcv: 0, retail: 0, approved: 0, collected: 0 }; return <tr key={claim.id} className="hover:bg-slate-50/70"><td className="px-5 py-3"><p className="font-semibold text-slate-800">{claim.name || "Sin nombre"}</p><p className="mt-0.5 text-xs text-slate-500">Reclamo {claim.claimNumber || "sin número"}</p></td><td className="px-4 py-3 tabular-nums">{currency(total.rcv)}</td><td className="px-4 py-3 tabular-nums">{currency(total.approved)}</td><td className="px-4 py-3 font-semibold tabular-nums text-[#102A46]">{currency(total.rcv + total.retail + total.approved)}</td><td className="px-5 py-3 text-right tabular-nums">{currency(total.collected)}</td></tr>; })}</tbody></table></div>}
      </div>
    </div> : <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center"><span className="mx-auto inline-flex rounded-2xl bg-[#eff4f7] p-3 text-[#315875]"><Store className="size-6"/></span><h2 className="mt-4 text-lg font-bold text-[#102A46]">Retail</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Esta sección está lista para incorporar los indicadores de tus proyectos retail.</p></div>)}
  </section>;
}

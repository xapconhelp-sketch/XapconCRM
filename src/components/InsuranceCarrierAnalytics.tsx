import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Lead } from "../types";
import { supabase } from "../lib/supabase";
import { queryAll } from "../lib/queryAll.js";

type FinanceRow = {
  claim_id: string;
  rcv: number | null;
  approval_date: string | null;
  depreciation_release_date: string | null;
  contract_signed_date: string | null;
  coc_sent_date: string | null;
};
type SupplementRow = { claim_id: string; approved_amount: number | null };
type AnalyticsData = { financials: FinanceRow[]; supplements: SupplementRow[] };

const COLORS = { blue: "#315875", green: "#4D8A70", red: "#C45B55", orange: "#B8794B", gray: "#E8EDF1" };
const money = (value: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);

function dateToUtcDay(value?: string | null) {
  if (!value) return Number.NaN;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? Number.NaN : Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function elapsedDays(start?: string | null, end?: string | null) {
  const startDay = dateToUtcDay(start);
  const endDay = dateToUtcDay(end);
  if (!Number.isFinite(startDay) || !Number.isFinite(endDay) || endDay < startDay) return null;
  return Math.round((endDay - startDay) / 86_400_000);
}

function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return { days: valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null, sample: valid.length };
}

function ChartCard({ title, subtitle, children, className = "" }: { title: string; subtitle: string; children: ReactNode; className?: string }) {
  return <section className={`min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_28px_-22px_rgba(15,23,42,.38)] ${className}`} aria-label={title}>
    <header className="border-b border-slate-100 px-4 py-3 sm:px-5">
      <h2 className="text-sm font-semibold text-[#102A46]">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </header>
    <div className="p-4 sm:p-5">{children}</div>
  </section>;
}

function StatusChart({ values }: { values: Array<{ label: string; count: number; color: string }> }) {
  const max = Math.max(1, ...values.map(({ count }) => count));
  return <div className="grid h-[224px] grid-cols-3 items-end gap-3 px-2 pb-1 pt-3 sm:gap-8 sm:px-8">
    {values.map((item) => {
      const height = item.count ? Math.max(8, (item.count / max) * 142) : 3;
      return <div key={item.label} className="flex h-full min-w-0 flex-col items-center justify-end">
        <span className="mb-2 text-xs font-bold tabular-nums text-[#243449]">{item.count}</span>
        <div className="flex h-[146px] w-full max-w-24 items-end justify-center border-b border-slate-200">
          <div className="w-full max-w-14 rounded-t-md transition-[height]" style={{ height, backgroundColor: item.count ? item.color : COLORS.gray }} title={`${item.label}: ${item.count}`} />
        </div>
        <span className="mt-2 text-center text-[11px] font-semibold leading-4 text-slate-600">{item.label}</span>
      </div>;
    })}
  </div>;
}

function HorizontalBars({ values, formatter, unit = "", color = COLORS.blue, columns = false }: {
  values: Array<{ label: string; value: number | null; sample?: number }>;
  formatter: (value: number) => string;
  unit?: string;
  color?: string;
  columns?: boolean;
}) {
  const max = Math.max(1, ...values.map(({ value }) => value || 0));
  return <div className={columns ? "grid grid-cols-1 gap-5 py-1 lg:grid-cols-3" : "space-y-5 py-1"}>
    {values.map((item) => {
      const width = item.value === null ? 0 : Math.max(item.value > 0 ? 2 : 0, (item.value / max) * 100);
      return <div key={item.label}>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium text-slate-600">{item.label}</span>
          <span className="shrink-0 text-xs font-bold tabular-nums text-[#102A46]">{item.value === null ? "Sin datos" : `${formatter(item.value)}${unit}`}</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${item.label}: ${item.value === null ? "sin datos" : `${formatter(item.value)}${unit}`}`}>
          <div className="h-full rounded-full transition-[width]" style={{ width: `${width}%`, backgroundColor: color }} />
        </div>
        {item.sample !== undefined && <p className="mt-1 text-[10px] text-slate-400">Calculado con {item.sample} {item.sample === 1 ? "caso" : "casos"} con fechas completas</p>}
      </div>;
    })}
  </div>;
}

export default function InsuranceCarrierAnalytics({ claims, organizationId }: { claims: Lead[]; organizationId: string }) {
  const insuranceClaims = useMemo(() => claims.filter((claim) => claim.is_insurance_claim !== false), [claims]);
  const [selectedCarrier, setSelectedCarrier] = useState("all");
  const [data, setData] = useState<AnalyticsData>({ financials: [], supplements: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const claimIdsKey = useMemo(() => insuranceClaims.map((claim) => claim.id).sort().join("|"), [insuranceClaims]);
  const claimIds = useMemo(() => claimIdsKey ? claimIdsKey.split("|") : [], [claimIdsKey]);

  const carriers = useMemo(() => {
    const names = new Map<string, string>();
    insuranceClaims.forEach((claim) => {
      const name = claim.insuranceProvider?.trim() || "Sin aseguradora";
      names.set(name.toLocaleLowerCase(), name);
    });
    return [...names.entries()].sort((a, b) => a[1].localeCompare(b[1], "es")).map(([key, name]) => ({ key, name }));
  }, [insuranceClaims]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      if (!organizationId || claimIds.length === 0) {
        setData({ financials: [], supplements: [] });
        setLoading(false);
        return;
      }
      const [financials, supplements] = await Promise.all([
        queryAll((from, to) => supabase.from("contractor_claim_financials")
          .select("claim_id,rcv,approval_date,depreciation_release_date,contract_signed_date,coc_sent_date")
          .eq("organization_id", organizationId).in("claim_id", claimIds).range(from, to)),
        queryAll((from, to) => supabase.from("contractor_claim_supplements")
          .select("claim_id,approved_amount")
          .eq("organization_id", organizationId).in("claim_id", claimIds).range(from, to)),
      ]);
      if (!active) return;
      const failure = financials.error || supplements.error;
      if (failure) {
        setError("No se pudieron cargar los datos de análisis de aseguradoras.");
        setData({ financials: [], supplements: [] });
      } else {
        setData({ financials: (financials.data || []) as FinanceRow[], supplements: (supplements.data || []) as SupplementRow[] });
      }
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [organizationId, claimIds, claimIdsKey]);

  const selectedClaims = useMemo(() => selectedCarrier === "all"
    ? insuranceClaims
    : insuranceClaims.filter((claim) => (claim.insuranceProvider?.trim() || "Sin aseguradora").toLocaleLowerCase() === selectedCarrier),
  [insuranceClaims, selectedCarrier]);

  const metrics = useMemo(() => {
    const selectedIds = new Set(selectedClaims.map((claim) => claim.id));
    const selectedFinancials = data.financials.filter((row) => selectedIds.has(row.claim_id));
    const selectedSupplements = data.supplements.filter((row) => selectedIds.has(row.claim_id));
    const claimById = new Map(selectedClaims.map((claim) => [claim.id, claim]));
    const approved = selectedClaims.filter((claim) => /aprob|finaliz|approved/i.test(claim.status || "")).length;
    const denied = selectedClaims.filter((claim) => /negad|denied/i.test(claim.status || "")).length;
    const disputed = selectedClaims.filter((claim) => /disputa|disputed/i.test(claim.status || "")).length;
    const releaseDurations = selectedFinancials.map((row) => elapsedDays(claimById.get(row.claim_id)?.created_at || claimById.get(row.claim_id)?.createdAt, row.depreciation_release_date));
    const approvalDurations = selectedFinancials.map((row) => elapsedDays(row.contract_signed_date, row.approval_date));
    const depreciationDurations = selectedFinancials.map((row) => elapsedDays(row.coc_sent_date, row.depreciation_release_date));
    return {
      statuses: [
        { label: "Aprobados", count: approved, color: COLORS.green },
        { label: "Negados", count: denied, color: COLORS.red },
        { label: "En disputa", count: disputed, color: COLORS.orange },
      ],
      rcv: selectedFinancials.reduce((sum, row) => sum + Number(row.rcv || 0), 0),
      supplements: selectedSupplements.reduce((sum, row) => sum + Number(row.approved_amount || 0), 0),
      durations: [
        { label: "Apertura a liberación de depreciación", ...average(releaseDurations) },
        { label: "Firma del contrato a aprobación", ...average(approvalDurations) },
        { label: "Envío del COC a liberación de depreciación", ...average(depreciationDurations) },
      ].map(({ label, days, sample }) => ({ label, value: days, sample })),
    };
  }, [data, selectedClaims]);

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-[0_8px_28px_-22px_rgba(15,23,42,.38)]">
      <label htmlFor="insurance-analysis-carrier" className="text-xs font-semibold text-slate-600">Aseguradora</label>
      <select id="insurance-analysis-carrier" value={selectedCarrier} onChange={(event) => setSelectedCarrier(event.target.value)} className="min-w-56 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#102A46] outline-none focus:border-[#8C6A22]">
        <option value="all">Todas las aseguradoras</option>
        {carriers.map((carrier) => <option key={carrier.key} value={carrier.key}>{carrier.name}</option>)}
      </select>
    </div>
    {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
      <ChartCard title="Casos por status" subtitle="Cantidad de casos aprobados, negados y en disputa.">
        {loading ? <ChartSkeleton /> : <StatusChart values={metrics.statuses} />}
      </ChartCard>
      <ChartCard title="Total RCV y suplementos" subtitle="Montos registrados y aprobados en los casos seleccionados.">
        {loading ? <ChartSkeleton /> : <HorizontalBars values={[{ label: "Total RCV", value: metrics.rcv }, { label: "Suplementos aprobados", value: metrics.supplements }]} formatter={money} color={COLORS.blue} />}
      </ChartCard>
      <ChartCard title="Tiempos promedio de caso" subtitle="Días transcurridos entre las fechas registradas para cada etapa." className="xl:col-span-2">
        {loading ? <ChartSkeleton /> : <HorizontalBars values={metrics.durations} formatter={(value) => value.toLocaleString("es-CO", { maximumFractionDigits: 1 })} unit=" días" color={COLORS.green} columns />}
      </ChartCard>
    </div>}
    {!loading && !error && <span className="sr-only" role="status">Análisis actualizado para {selectedClaims.length} casos.</span>}
  </div>;
}

function ChartSkeleton() {
  return <div role="status" aria-label="Cargando gráficas" className="flex h-[224px] items-center justify-center"><div className="h-2 w-40 animate-pulse rounded-full bg-slate-200" /></div>;
}

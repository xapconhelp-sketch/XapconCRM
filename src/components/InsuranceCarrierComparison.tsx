import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, TrendingUp } from "lucide-react";
import { Lead } from "../types";
import { queryAll } from "../lib/queryAll.js";
import { supabase } from "../lib/supabase";

type ValueRow = { lead_id: string; record_type: "estimate" | "sow" | "supplement"; entry_number: number; amount: number | null; event_date: string | null; estimate_sent: boolean };
type CarrierRow = { name: string; claims: number; estimate: number; sow: number; gap: number | null; comparable: number; responseDays: number | null };
const money = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);

export default function InsuranceCarrierComparison({ claims }: { claims: Lead[] }) {
  const [entries, setEntries] = useState<ValueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void queryAll((from, to) => supabase.from("admin_insurance_values").select("lead_id,record_type,entry_number,amount,event_date,estimate_sent").order("id").range(from, to)).then((result) => {
      if (cancelled) return;
      if (result.error) setError(`No se pudo cargar el comparativo: ${result.error.message}`);
      else setEntries((result.data || []) as ValueRow[]);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo<CarrierRow[]>(() => {
    const byClaim = new Map<string, ValueRow[]>();
    entries.forEach((entry) => byClaim.set(entry.lead_id, [...(byClaim.get(entry.lead_id) || []), entry]));
    const byCarrier = new Map<string, { claims: number; estimate: number; sow: number; gaps: number[]; responseDays: number[] }>();
    claims.forEach((claim) => {
      const name = claim.insuranceProvider?.trim() || "Aseguradora sin registrar";
      const aggregate = byCarrier.get(name) || { claims: 0, estimate: 0, sow: 0, gaps: [], responseDays: [] };
      const records = byClaim.get(claim.id) || [];
      const estimate = records.find((entry) => entry.record_type === "estimate");
      const sows = records.filter((entry) => entry.record_type === "sow" && entry.amount !== null);
      const latestSow = [...sows].sort((a, b) => (b.event_date || "").localeCompare(a.event_date || "") || b.entry_number - a.entry_number)[0];
      const firstSow = [...sows].sort((a, b) => (a.event_date || "9999").localeCompare(b.event_date || "9999") || a.entry_number - b.entry_number)[0];
      aggregate.claims += 1;
      aggregate.estimate += Number(estimate?.amount) || 0;
      aggregate.sow += Number(latestSow?.amount) || 0;
      if (estimate?.amount !== null && estimate?.amount !== undefined && latestSow) aggregate.gaps.push(Number(estimate.amount) - Number(latestSow.amount));
      if (estimate?.estimate_sent && estimate.event_date && firstSow?.event_date && firstSow.event_date >= estimate.event_date) {
        aggregate.responseDays.push(Math.max(0, Math.floor((Date.parse(firstSow.event_date) - Date.parse(estimate.event_date)) / 86_400_000)));
      }
      byCarrier.set(name, aggregate);
    });
    return [...byCarrier.entries()].map(([name, row]) => ({
      name, claims: row.claims, estimate: row.estimate, sow: row.sow,
      gap: row.gaps.length ? row.gaps.reduce((sum, value) => sum + value, 0) / row.gaps.length : null,
      comparable: row.gaps.length,
      responseDays: row.responseDays.length ? row.responseDays.reduce((sum, value) => sum + value, 0) / row.responseDays.length : null,
    })).sort((a, b) => b.claims - a.claims || a.name.localeCompare(b.name));
  }, [claims, entries]);

  return <section className="overflow-hidden rounded-xl border border-[#E1E6EB] bg-white shadow-[0_2px_10px_rgba(15,23,42,.035)]">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9EDF1] px-4 py-4 sm:px-5">
      <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EFF4F7] text-[#315B76]"><TrendingUp className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-[#202B38]">Comparativo por aseguradora</h2><p className="mt-0.5 text-[10px] text-[#758190]">Estimado, SOW más reciente y tiempos de respuesta · {claims.length} casos en el filtro actual</p></div></div>
      <span className="rounded-md border border-[#E5E9ED] bg-[#F7F8FA] px-2.5 py-1 text-[10px] font-semibold text-[#566273]">{rows.length} aseguradoras</span>
    </header>
    {loading ? <div className="flex items-center justify-center gap-2 py-12 text-xs text-[#667484]"><LoaderCircle className="h-4 w-4 animate-spin" />Calculando comparativo…</div> : error ? <p role="alert" className="m-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left"><thead className="bg-[#F6F8FA] text-[9px] font-semibold uppercase tracking-[.08em] text-[#687687]"><tr><th className="px-4 py-3 sm:px-5">Aseguradora</th><th className="px-3 py-3 text-right">Casos</th><th className="px-3 py-3 text-right">Estimado</th><th className="px-3 py-3 text-right">Último SOW</th><th className="px-3 py-3 text-right">Brecha media</th><th className="px-4 py-3 text-right sm:px-5">Días al 1.er SOW</th></tr></thead><tbody className="divide-y divide-[#EEF1F3]">{rows.map((row) => <tr key={row.name} className="text-[11px] text-[#465465] transition-colors hover:bg-[#FAFBFC]"><td className="max-w-[220px] truncate px-4 py-3 font-semibold text-[#263544] sm:px-5">{row.name}</td><td className="px-3 py-3 text-right tabular-nums">{row.claims}</td><td className="px-3 py-3 text-right tabular-nums">{money(row.estimate)}</td><td className="px-3 py-3 text-right tabular-nums">{money(row.sow)}</td><td className={`px-3 py-3 text-right font-semibold tabular-nums ${row.gap !== null && row.gap > 0 ? "text-[#9A6A24]" : "text-[#465465]"}`}>{row.gap === null ? "—" : <>{money(row.gap)}<span className="ml-1 text-[9px] font-normal text-[#8994A1]">n={row.comparable}</span></>}</td><td className="px-4 py-3 text-right tabular-nums sm:px-5">{row.responseDays === null ? "—" : `${row.responseDays.toFixed(1)} d`}</td></tr>)}{rows.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-xs text-[#758190]">No hay casos para comparar en este filtro.</td></tr>}</tbody></table></div>}
  </section>;
}

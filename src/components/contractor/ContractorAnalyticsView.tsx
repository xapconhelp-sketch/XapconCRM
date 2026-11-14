import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, BadgeDollarSign, FileCheck2, ReceiptText, Store } from "lucide-react";
import type { Lead } from "../../types";
import { supabase } from "../../lib/supabase";
import { queryAll } from "../../lib/queryAll.js";

type ClaimTotals = { rcv: number; retail: number; approved: number; collected: number };
const numberFormat = new Intl.NumberFormat("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const currency = (value: number) => `$${numberFormat.format(value || 0)}`;

type AnalyticsVariant = "general-insurance" | "general-retail" | "specialized-insurance" | "specialized-retail";

export default function ContractorAnalyticsView({ claims, organizationId, variant = "general-insurance" }: { claims: Lead[]; organizationId: string; variant?: AnalyticsVariant }) {
  const [totals, setTotals] = useState<Record<string, ClaimTotals>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const claimIdsKey = useMemo(() => claims.map(claim => claim.id).sort().join("|"), [claims]);
  const claimIds = useMemo(() => claimIdsKey ? claimIdsKey.split("|") : [], [claimIdsKey]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      if (!organizationId || claimIds.length === 0) {
        setTotals({});
        setLoading(false);
        return;
      }
      const [financials, supplements, payments] = await Promise.all([
        queryAll((from, to) => supabase.from("contractor_claim_financials").select("claim_id, rcv, retail_upgrades").eq("organization_id", organizationId).in("claim_id", claimIds).range(from, to)),
        queryAll((from, to) => supabase.from("contractor_claim_supplements").select("claim_id, approved_amount").eq("organization_id", organizationId).in("claim_id", claimIds).range(from, to)),
        queryAll((from, to) => supabase.from("contractor_claim_payments").select("claim_id, amount, status").eq("organization_id", organizationId).in("claim_id", claimIds).range(from, to)),
      ]);
      if (!active) return;
      const failed = financials.error || supplements.error || payments.error;
      if (failed) {
        setError(`No se pudieron cargar las analíticas. ${failed.message}`);
        setLoading(false);
        return;
      }
      const next: Record<string, ClaimTotals> = {};
      const rowFor = (claimId: string) => next[claimId] ||= { rcv: 0, retail: 0, approved: 0, collected: 0 };
      for (const row of financials.data || []) {
        const total = rowFor(row.claim_id);
        total.rcv = Number(row.rcv || 0);
        total.retail = Number(row.retail_upgrades || 0);
      }
      for (const row of supplements.data || []) rowFor(row.claim_id).approved += Number(row.approved_amount || 0);
      for (const row of payments.data || []) {
        if (row.status === "received" || row.status === "deposited") rowFor(row.claim_id).collected += Number(row.amount || 0);
      }
      setTotals(next);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [organizationId, claimIdsKey, claimIds]);

  const claimsTotal = claims.reduce((sum, claim) => {
    const total = totals[claim.id];
    return sum + (total?.rcv || 0) + (total?.retail || 0) + (total?.approved || 0);
  }, 0);
  const approvedTotal = claims.reduce((sum, claim) => sum + (totals[claim.id]?.approved || 0), 0);
  const collectedTotal = claims.reduce((sum, claim) => sum + (totals[claim.id]?.collected || 0), 0);
  const receivableTotal = Math.max(0, claimsTotal - collectedTotal);

  const isInsuranceView = variant === "general-insurance";
  const sectionTitle = variant === "general-insurance" ? "General · Aseguranzas" : variant === "general-retail" ? "General · Retail" : variant === "specialized-insurance" ? "Especializada · Aseguranzas" : "Especializada · Retail";

  return <section className="mx-auto min-h-0 w-full max-w-[1500px] flex-1 space-y-5 overflow-y-auto p-4 sm:p-6" aria-label={`Analítica de contratista · ${sectionTitle}`}>
    <header className="overflow-hidden rounded-2xl bg-black text-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-3 sm:px-7">
        <div><h1 className="text-xl font-bold">Analítica</h1><p className="mt-0.5 text-xs text-slate-300">{sectionTitle}</p></div>
        {isInsuranceView && <span className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-slate-200">{claims.length} reclamos de seguro</span>}
      </div>
    </header>

    {isInsuranceView ? <div className="space-y-4">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[["Valor de proyectos", currency(claimsTotal), "RCV, mejoras retail y suplementos aprobados", BadgeDollarSign], ["Saldo por cobrar", currency(receivableTotal), "Valor registrado menos pagos recibidos", FileCheck2], ["Suplementos aprobados", currency(approvedTotal), "Aprobaciones adicionales registradas", ReceiptText], ["Pagos recibidos", currency(collectedTotal), "Pagos marcados como recibidos o depositados", ArrowDownToLine]].map(([label, value, detail, Icon]) => <article key={label as string} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-slate-500">{label as string}</p><p className="mt-2 text-2xl font-bold tracking-tight text-[#102A46]">{loading ? "—" : value as string}</p></div><span className="rounded-lg bg-[#eff4f7] p-2 text-[#315875]"><Icon className="size-5"/></span></div><p className="mt-3 text-xs text-slate-500">{detail as string}</p></article>)}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-base font-bold text-[#102A46]">Cartera de aseguranzas</h2><p className="mt-1 text-xs text-slate-500">Montos de reclamaciones y cobros registrados por expediente.</p></div>
        {loading ? <p role="status" className="px-5 py-8 text-sm text-slate-500">Cargando analítica…</p> : claims.length === 0 ? <p className="px-5 py-8 text-sm text-slate-500">Aún no hay reclamos de seguro para mostrar.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">Proyecto</th><th className="px-4 py-3 font-semibold">RCV inicial</th><th className="px-4 py-3 font-semibold">Suplementos</th><th className="px-4 py-3 font-semibold">Valor registrado</th><th className="px-5 py-3 text-right font-semibold">Pagos recibidos</th></tr></thead><tbody className="divide-y divide-slate-100">{claims.map(claim => { const total = totals[claim.id] || { rcv: 0, retail: 0, approved: 0, collected: 0 }; return <tr key={claim.id} className="hover:bg-slate-50/70"><td className="px-5 py-3"><p className="font-semibold text-slate-800">{claim.name || "Sin nombre"}</p><p className="mt-0.5 text-xs text-slate-500">Reclamo {claim.claimNumber || "sin número"}</p></td><td className="px-4 py-3 tabular-nums">{currency(total.rcv)}</td><td className="px-4 py-3 tabular-nums">{currency(total.approved)}</td><td className="px-4 py-3 font-semibold tabular-nums text-[#102A46]">{currency(total.rcv + total.retail + total.approved)}</td><td className="px-5 py-3 text-right tabular-nums">{currency(total.collected)}</td></tr>; })}</tbody></table></div>}
      </div>
    </div> : <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center"><span className="mx-auto inline-flex rounded-2xl bg-[#eff4f7] p-3 text-[#315875]">{variant.endsWith("insurance") ? <FileCheck2 className="size-6"/> : <Store className="size-6"/>}</span><h2 className="mt-4 text-lg font-bold text-[#102A46]">{sectionTitle}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{variant.startsWith("specialized") ? "Esta sección está preparada para los indicadores especializados que definiremos más adelante." : "Esta sección está lista para incorporar los indicadores de tus proyectos retail."}</p></div>}
  </section>;
}

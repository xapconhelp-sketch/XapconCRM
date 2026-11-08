import React from "react";
import { Lead } from "../types";
import { CHART_PALETTE } from "../lib/chartPalette";

const STAGE_COLORS: Record<string, string> = {
  "Nuevo": CHART_PALETTE.green, "Nuevos": CHART_PALETTE.green, "Estimado": CHART_PALETTE.green, "Estimados": CHART_PALETTE.green,
  "En disputa": CHART_PALETTE.orange, "Aprobado": CHART_PALETTE.green, "Aprobado y Suplementado": CHART_PALETTE.green,
  "Construcción": CHART_PALETTE.violet, "Solicitud Depreciación": CHART_PALETTE.orange, "Esperando Depreciación": CHART_PALETTE.orange,
  "Finalizado": CHART_PALETTE.blue, "Cancelado": CHART_PALETTE.slate, "Negados": CHART_PALETTE.red,
};

export default function PortfolioByStage({ claims, idPrefix = "portfolio", className = "" }: { claims: Lead[]; idPrefix?: string; className?: string }) {
  const stages = React.useMemo(() => {
    const counts = new Map<string, number>();
    claims.forEach((claim) => {
      const stage = claim.status || "Sin etapa";
      counts.set(stage, (counts.get(stage) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [claims]);
  const max = Math.max(1, ...stages.map(([, count]) => count));
  return <section className={`rounded-xl border border-[#E4E8ED] bg-white px-4 py-4 shadow-[0_2px_10px_rgba(15,23,42,0.035)] sm:px-5 ${className}`} aria-labelledby={`${idPrefix}-portfolio-stage-heading`}>
    <div className="flex items-center justify-between gap-3"><div><h2 id={`${idPrefix}-portfolio-stage-heading`} className="text-sm font-semibold text-[#202B38]">Cartera por etapa</h2><p className="mt-0.5 text-[10px] text-[#778391]">Distribución de los casos según su etapa actual</p></div><span className="rounded-md bg-[#F2F4F6] px-2 py-1 text-[10px] font-semibold tabular-nums text-[#485565]">{claims.length} casos</span></div>
    <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">{stages.map(([stage, count]) => <div key={stage}>
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px]"><span className="truncate font-medium text-[#485565]">{stage}</span><span className="font-semibold tabular-nums text-[#202B38]">{count}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#EDF0F3]"><div className="h-full rounded-full transition-[width]" style={{ width: `${(count / max) * 100}%`, backgroundColor: STAGE_COLORS[stage] || CHART_PALETTE.slate }} /></div>
    </div>)}</div>
    {!stages.length && <p className="py-5 text-center text-xs text-[#778391]">Sin expedientes para mostrar.</p>}
  </section>;
}

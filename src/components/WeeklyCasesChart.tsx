import React from "react";
import { Lead } from "../types";
import { timelineEventTime } from "../lib/caseActivity";
import { CHART_PALETTE } from "../lib/chartPalette";

type WeeklySeries = { key: string; label: string; color: string; values: number[] };

const WEEKLY_SERIES = [
  { key: "new", label: "Nuevos", color: CHART_PALETTE.blue },
  { key: "approved", label: "Aprobados", color: CHART_PALETTE.green },
  { key: "finished", label: "Finalizados", color: CHART_PALETTE.violet },
  { key: "denied", label: "Negados", color: CHART_PALETTE.red },
] as const;

function weekStart(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

function getWeeklySeries(claims: Lead[], now = new Date()): { weeks: Date[]; series: WeeklySeries[] } {
  const currentWeek = weekStart(now);
  const weeks = Array.from({ length: 4 }, (_, index) => {
    const date = new Date(currentWeek);
    date.setDate(date.getDate() - (7 * (3 - index)));
    return date;
  });
  const weekIndex = (timestamp: number) => {
    if (!timestamp) return -1;
    const date = new Date(timestamp);
    const start = weekStart(date);
    const index = Math.round((start.getTime() - weeks[0].getTime()) / (7 * 86_400_000));
    return index >= 0 && index < weeks.length ? index : -1;
  };
  const counts: Record<(typeof WEEKLY_SERIES)[number]["key"], Set<string>[]> = {
    new: weeks.map(() => new Set<string>()),
    approved: weeks.map(() => new Set<string>()),
    finished: weeks.map(() => new Set<string>()),
    denied: weeks.map(() => new Set<string>()),
  };

  claims.forEach((claim) => {
    const createdIndex = weekIndex(Date.parse(claim.created_at || ""));
    if (createdIndex >= 0) counts.new[createdIndex].add(claim.id);

    (claim.timeline || []).forEach((event) => {
      if (event.type !== "status_change") return;
      const index = weekIndex(timelineEventTime(event));
      if (index < 0) return;
      const toStatus = event.toStatus || String(event.content || "").split("→").at(-1)?.trim() || "";
      if (["Aprobado", "Aprobado y Suplementado"].includes(toStatus)) counts.approved[index].add(claim.id);
      if (toStatus === "Finalizado") counts.finished[index].add(claim.id);
      if (toStatus === "Negados") counts.denied[index].add(claim.id);
    });
  });

  return {
    weeks,
    series: WEEKLY_SERIES.map(({ key, label, color }) => ({
      key,
      label,
      color,
      values: counts[key].map((ids) => ids.size),
    })),
  };
}

export default function WeeklyCasesChart({ claims, companyScope, companyScopeColor, showCompanyScope = true }: { claims: Lead[]; companyScope: string; companyScopeColor?: string | null; showCompanyScope?: boolean }) {
  const { weeks, series } = React.useMemo(() => getWeeklySeries(claims), [claims]);
  const chart = { left: 48, right: 738, top: 30, bottom: 202 };
  const highestValue = Math.max(0, ...series.flatMap((item) => item.values));
  const step = Math.max(1, Math.ceil(highestValue / 4));
  const axisMax = step * 4;
  const plotHeight = chart.bottom - chart.top;
  const groupWidth = (chart.right - chart.left) / weeks.length;
  const barWidth = 20;
  const barGap = 5;
  const groupBarsWidth = (barWidth * series.length) + (barGap * (series.length - 1));
  const barX = (weekIndex: number, seriesIndex: number) => chart.left + (groupWidth * weekIndex) + ((groupWidth - groupBarsWidth) / 2) + (seriesIndex * (barWidth + barGap));
  const barY = (value: number) => chart.bottom - Math.max(value === 0 ? 2 : 0, (value / axisMax) * plotHeight);
  const dateFormat = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" });
  const monthFormat = new Intl.DateTimeFormat("es-CO", { month: "short" });
  const weekRange = (start: Date) => {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${dateFormat.format(start)} – ${dateFormat.format(end)}`;
  };
  const weekAxisLabel = (start: Date) => {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const endMonth = monthFormat.format(end).replace(/\.$/, "");
    return start.getMonth() === end.getMonth()
      ? `${start.getDate()}–${end.getDate()} ${endMonth}`
      : `${dateFormat.format(start)}–${dateFormat.format(end)}`;
  };

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-xl border border-[#E4E8ED] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.035)]" aria-labelledby="weekly-cases-heading">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EDF0F3] px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 id="weekly-cases-heading" className="text-[15px] font-semibold tracking-[-0.01em] text-[#202B38]">Evolución de casos · últimas 4 semanas</h2>
        </div>
        {showCompanyScope && <span className="max-w-full truncate rounded-md border px-2.5 py-1.5 text-[10px] font-semibold text-white" style={{ backgroundColor: companyScope === "Todas las empresas" ? "#18181B" : companyScopeColor || "#18181B", borderColor: companyScope === "Todas las empresas" ? "#18181B" : companyScopeColor || "#18181B" }}>{companyScope}</span>}
      </div>
      <div className="px-3 pb-4 pt-3 sm:px-5 sm:pb-5">
        <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Series de la gráfica">
          {series.map((item) => <span key={item.key} className="inline-flex items-center gap-2 text-[10px] font-medium text-[#596575]"><i className="h-[3px] w-4 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>)}
        </div>
        <svg className="block h-auto w-full overflow-visible" viewBox="0 0 760 252" role="img" aria-labelledby="weekly-chart-title weekly-chart-desc">
          <title id="weekly-chart-title">Casos por semana y etapa</title>
          <desc id="weekly-chart-desc">Cantidad de casos nuevos, aprobados, finalizados y negados por semana para {companyScope}.</desc>
          <text x={chart.left} y="17" fill="#8993A0" fontSize="9" fontWeight="500">Casos</text>
          <rect x={chart.left} y={chart.top} width={chart.right - chart.left} height={plotHeight} rx="8" fill="#FBFCFD" />
          {[0, 1, 2, 3, 4].map((tick) => {
            const value = axisMax - (tick * step);
            const y = chart.top + (tick * plotHeight) / 4;
            return <g key={tick}><line x1={chart.left} x2={chart.right} y1={y} y2={y} stroke={tick === 4 ? "#DDE3E9" : "#EDF0F3"} /><text x={chart.left - 12} y={y + 3.5} textAnchor="end" fill="#8993A0" fontSize="9" fontWeight="500">{value}</text></g>;
          })}
          {weeks.map((week, weekIndex) => <g key={week.toISOString()}>
            {series.map((item, seriesIndex) => {
              const value = item.values[weekIndex];
              const height = Math.max(value === 0 ? 2 : 0, (value / axisMax) * plotHeight);
              return <rect key={item.key} x={barX(weekIndex, seriesIndex)} y={barY(value)} width={barWidth} height={height} rx="4" fill={item.color} opacity={value === 0 ? 0.42 : 0.98}>
                <title>{`${item.label}: ${value} casos · ${weekRange(week)}`}</title>
              </rect>;
            })}
            <text x={chart.left + (groupWidth * (weekIndex + 0.5))} y="224" textAnchor="middle" fill="#596575" fontSize="10" fontWeight="600">{weekAxisLabel(week)}</text>
          </g>)}
        </svg>
      </div>
    </section>
  );
}

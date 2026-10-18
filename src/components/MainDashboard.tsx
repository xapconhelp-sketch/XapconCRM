import React from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { KPI, Lead, TaskItem, ViewType } from "../types";
import IllustratedIcon, { type Illustration } from "./contractor/IllustratedIcon";

interface MainDashboardProps {
  kpis: KPI[];
  taskComposer?: React.ReactNode;
  onNavigateToView: (view: ViewType) => void;
  onNavigateToLead: (leadId: string) => void;
  claims: Lead[];
  onToggleTask?: (leadId: string, taskId: string) => void;
}

type TaskRow = { claimId: string; claimName: string; claimStatus: string; task: TaskItem };
type InactivityRow = { claim: Lead; days: number };
type TaskFilter = "all" | "urgent";

const xapconTaskCategories = new Set<NonNullable<TaskItem["category"]>>([
  "prepare_supplement",
  "prepare_estimate",
  "pending_coc",
  "request_depreciation",
]);

const metricIllustrations: Record<string, Illustration> = {
  "users": "team",
  "file-text": "claim",
  "hard-hat": "production",
  "check-circle": "success",
  "clock": "clock",
  "trending-up": "activity",
  "x-circle": "declined",
  "scale": "estimate",
  "plus-circle": "claim",
  "flag": "production",
};

const activeClaim = (claim: Lead) => !["Finalizado", "Cancelado", "Negados"].includes(claim.status);

function parseEventDate(event: Lead["timeline"][number]) {
  if (event.date) {
    const parsed = Date.parse(event.date);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (event.timestamp) {
    const parsed = Date.parse(event.timestamp);
    if (Number.isFinite(parsed)) return parsed;
    const match = event.timestamp.replace(" a las ", " ").match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})/);
    if (match) {
      const [, day, month, year, hour, minute] = match;
      return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).getTime();
    }
  }
  if (event.id?.startsWith("timeline-")) {
    const timestamp = Number(event.id.split("-")[1]);
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return 0;
}

function daysSinceLastActivity(claim: Lead) {
  let latest = claim.created_at ? Date.parse(claim.created_at) : Date.now();
  if (!Number.isFinite(latest)) latest = Date.now();
  for (const event of claim.timeline || []) latest = Math.max(latest, parseEventDate(event));
  return Math.max(0, Math.floor((Date.now() - latest) / 86_400_000));
}

function daysOverdue(task: TaskItem) {
  const match = task.dueDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 0;
  const [, year, month, day] = match;
  const due = new Date(Number(year), Number(month) - 1, Number(day)).getTime();
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Number.isFinite(due) ? Math.max(0, Math.floor((todayStart - due) / 86_400_000)) : 0;
}

function taskDueLabel(task: TaskItem, overdueDays: number) {
  if (overdueDays > 0) return `Vencida hace ${overdueDays} día${overdueDays === 1 ? "" : "s"}`;
  const match = task.dueDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "Sin fecha límite";
  const [, year, month, day] = match;
  const due = new Date(Number(year), Number(month) - 1, Number(day));
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (due.getTime() === todayStart.getTime()) return "Vence hoy";
  return `Vence ${new Intl.DateTimeFormat("es-US", { month: "short", day: "numeric" }).format(due)}`;
}

function TaskPanel({
  title,
  tasks,
  onNavigateToView,
  onNavigateToLead,
  onToggleTask,
}: {
  title: string;
  tasks: TaskRow[];
  onNavigateToView: (view: ViewType) => void;
  onNavigateToLead: (leadId: string) => void;
  onToggleTask?: (leadId: string, taskId: string) => void;
}) {
  const [taskFilter, setTaskFilter] = React.useState<TaskFilter>("all");
  const urgentCount = tasks.filter(({ task }) => daysOverdue(task) > 0).length;
  const visibleTasks = taskFilter === "urgent"
    ? tasks.filter(({ task }) => daysOverdue(task) > 0)
    : tasks;

  return (
    <section className="h-fit self-start overflow-hidden rounded-2xl border border-[#E0E5E8] border-t-[3px] border-t-[#8C6A22] bg-white shadow-[0_5px_22px_rgba(23,49,74,0.045)]" aria-label={title}>
      <div className="admin-task-panel-heading flex flex-wrap items-center justify-between gap-2.5 border-b border-[#E9EDEF] bg-[#FCFCFA] px-3.5 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <IllustratedIcon name="tasks" className="admin-task-heading-icon" />
          <div className="min-w-0"><h2 className="truncate text-[13px] font-bold text-[#102A46]">{title}</h2><p className="mt-0.5 text-[9px] font-medium text-[#78858D]">{tasks.length} {tasks.length === 1 ? "pendiente" : "pendientes"}</p></div>
        </div>
        <div className="flex w-fit rounded-lg border border-[#E3E7E7] bg-white p-0.5 shadow-[0_1px_2px_rgba(23,49,74,0.04)]" role="group" aria-label={`Filtrar ${title}`}>
          <FilterButton active={taskFilter === "all"} onClick={() => setTaskFilter("all")}>Todas</FilterButton>
          <FilterButton active={taskFilter === "urgent"} onClick={() => setTaskFilter("urgent")}>Vencidas <span className="ml-1 tabular-nums">{urgentCount}</span></FilterButton>
        </div>
      </div>
      <div className="max-h-[430px] divide-y divide-[#F0F2F3] overflow-y-auto">
        {visibleTasks.length === 0 ? (
          <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title={taskFilter === "urgent" ? "Sin tareas vencidas" : "Todo al día"} description={taskFilter === "urgent" ? "No hay tareas pendientes que hayan superado su fecha límite." : `No hay tareas pendientes en ${title.toLowerCase()}.`} />
        ) : visibleTasks.map(({ claimId, claimName, claimStatus, task }) => {
          const age = daysOverdue(task);
          const isUrgent = age > 0;
          return (
            <article key={`${claimId}-${task.id}`} className={`group flex items-start gap-2.5 border-l-2 px-3 py-3.5 transition-colors hover:bg-[#FAFBFB] sm:px-4 ${isUrgent ? "border-l-[#C95648] bg-[#FFFDFC]" : "border-l-transparent"}`}>
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isUrgent ? "bg-[#FCEDEA] text-[#B5493B]" : "bg-[#F7F4E9] text-[#755613]"}`}>{isUrgent ? <AlertCircle className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}</span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <button type="button" onClick={() => onNavigateToLead(claimId)} className="max-w-full truncate text-[10px] font-bold text-[#2F5270] hover:text-[#755613]">{claimName}</button>
                  {task.assignedTo && <span className="max-w-[100px] truncate rounded-full bg-[#EEF3F7] px-2 py-0.5 text-[9px] font-semibold text-[#465D70]">{task.assignedTo}</span>}
                  {isUrgent && <span className="rounded-full bg-[#FCEDEA] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#B5493B]">Vencida</span>}
                </div>
                <p className="break-words text-xs font-semibold leading-5 text-[#1D3449]">{task.title}</p>
                <p className="mt-1 truncate text-[10px] text-slate-500">{claimStatus} <span className="px-1 text-slate-300">·</span> {taskDueLabel(task, age)}</p>
              </div>
              {onToggleTask && <button type="button" onClick={() => onToggleTask(claimId, task.id)} aria-label={`Marcar como lista: ${task.title}`} className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-[#DCE4E8] px-2 text-[10px] font-bold text-[#465D70] transition hover:border-[#755613] hover:bg-[#FBF9F2] hover:text-[#664A14] focus-visible:outline-[#755613]"><Check className="h-3.5 w-3.5" /><span className="hidden sm:inline">Completar</span></button>}
            </article>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-[#EDF0F1] bg-[#FAFBFB] px-3 py-2.5 sm:px-4">
        <p className="truncate text-[9px] text-slate-500">{urgentCount ? <><span className="font-bold text-[#B5493B]">{urgentCount} requieren atención</span><span> por fecha límite</span></> : "Sin acciones vencidas"}</p>
        <button type="button" onClick={() => onNavigateToView(ViewType.INSURANCE_CLAIM)} className="inline-flex shrink-0 items-center gap-1 text-[9px] font-bold text-[#2F5270] transition hover:text-[#755613]">Ver expedientes <ArrowRight className="h-3 w-3" /></button>
      </div>
    </section>
  );
}

export default function MainDashboard({
  kpis,
  onNavigateToView,
  onNavigateToLead,
  claims = [],
  onToggleTask,
  taskComposer,
}: MainDashboardProps) {

  const pendingTasks = React.useMemo<TaskRow[]>(() => claims.flatMap(claim => {
    if (!claim || !activeClaim(claim)) return [];
    return (claim.tasks || [])
      .filter(task => task.status === "pending" && (!task.kind || task.kind === "task"))
      .map(task => ({ claimId: claim.id, claimName: claim.name, claimStatus: claim.status, task }));
  }), [claims]);

  const xapconTasks = pendingTasks.filter(({ task }) => task.category && xapconTaskCategories.has(task.category));
  const contractorTasks = pendingTasks.filter(({ task }) => !task.category || !xapconTaskCategories.has(task.category));

  const inactivityRows = React.useMemo<InactivityRow[]>(() => claims
    .filter(activeClaim)
    .map(claim => ({ claim, days: daysSinceLastActivity(claim) }))
    .sort((a, b) => b.days - a.days), [claims]);

  const visibleClaims = inactivityRows.filter(({ days }) => days >= 3);

  return (
    <main className="crm-workspace min-h-0 flex-1 overflow-y-auto bg-[#F2F4F6]" aria-label="Dashboard de superadministrador">
      <div className="mx-auto w-full max-w-[1680px] space-y-4 p-4 sm:space-y-5 sm:p-6 2xl:p-8">
        <section className="admin-dashboard-hero relative overflow-hidden rounded-[22px] bg-[#102A46] px-5 py-4 text-white shadow-[0_16px_38px_rgba(23,49,74,0.14)] sm:px-7 sm:py-5">
          <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 rounded-full border border-white/[0.07]" />
          <div className="pointer-events-none absolute -right-1 -top-16 h-56 w-56 rounded-full border border-white/[0.08]" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-1 w-2/5 bg-gradient-to-l from-[#8C6A22] to-transparent" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="font-display text-2xl font-bold tracking-tight sm:text-[30px]">Centro de operaciones</h1>
            </div>
            <div className="admin-dashboard-actions flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <div className="admin-dashboard-composer flex shrink-0 flex-wrap items-center gap-2">{taskComposer}</div>
            </div>
          </div>
        </section>

        <section aria-labelledby="portfolio-heading">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
            <MetricCard title="Expedientes" value={String(claims.length)} illustration="home" onClick={() => onNavigateToView(ViewType.INSURANCE_CLAIM)} />
            {kpis.map((kpi, index) => {
              const title = kpi.title.toLowerCase();
              const illustration = title.includes("constru") ? "production"
                : title.includes("depre") ? "finance"
                  : title.includes("disput") || title.includes("negad") ? "alert"
                    : title.includes("finaliz") ? "success"
                      : title.includes("activo") ? "claim"
                        : metricIllustrations[kpi.icon] || "claim";
              return <MetricCard key={`${kpi.title}-${index}`} title={kpi.title} value={kpi.value} illustration={illustration} onClick={() => onNavigateToView(kpi.title.toLowerCase().includes("constru") ? ViewType.PRODUCTION : ViewType.INSURANCE_CLAIM)} />;
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-5">
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:col-span-7">
            <TaskPanel title="Tareas Xapcon" tasks={xapconTasks} onNavigateToView={onNavigateToView} onNavigateToLead={onNavigateToLead} onToggleTask={onToggleTask} />
            <TaskPanel title="Tareas Contratistas" tasks={contractorTasks} onNavigateToView={onNavigateToView} onNavigateToLead={onNavigateToLead} onToggleTask={onToggleTask} />
          </div>

          <section className="overflow-hidden rounded-2xl border border-[#E0E5E8] bg-white shadow-[0_5px_22px_rgba(23,49,74,0.045)] xl:col-span-5" aria-labelledby="followup-heading">
            <div className="admin-followup-heading border-b border-white/10 bg-[linear-gradient(112deg,#102945_0%,#102A46_62%,#1A3854_100%)] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3">
                <span className="admin-followup-icon contractor-illustration" style={{ "--icon-accent": "var(--xapcon-blue)" } as React.CSSProperties}><Activity className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1"><h2 id="followup-heading" className="text-sm font-bold text-white">Seguimiento de expedientes</h2><p className="mt-0.5 text-[10px] text-[#CBD6DE]">Casos sin movimiento reciente</p></div>
                <span className="rounded-full border border-[#D3B566]/20 bg-[#8C6A22]/15 px-2.5 py-1 text-[10px] font-bold tabular-nums text-[#D8C68A]">{visibleClaims.length}</span>
              </div>
            </div>
            <div className="max-h-[430px] divide-y divide-[#F0F2F3] overflow-y-auto">
              {visibleClaims.length === 0 ? <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title="Cartera al día" description="No hay expedientes sin actividad por 3 días o más." /> : visibleClaims.map(({ claim, days }) => {
                const urgency = days >= 14
                  ? { dot: "bg-[#B5493B]", pill: "bg-[#FCEDEA] text-[#A64035]", label: "Prioridad alta" }
                  : days >= 7
                    ? { dot: "bg-[#D28B43]", pill: "bg-[#FBF2E7] text-[#96652B]", label: "Revisar" }
                    : { dot: "bg-[#8C9BA6]", pill: "bg-[#F1F4F5] text-[#657783]", label: "En seguimiento" };
                return (
                  <button type="button" key={claim.id} onClick={() => onNavigateToLead(claim.id)} className="group flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#FAFBFB] focus-visible:relative focus-visible:z-10 sm:px-5">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${urgency.dot}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2"><span className="truncate text-xs font-bold text-[#1D3449] group-hover:text-[#755613]">{claim.name}</span><span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold sm:inline-flex ${urgency.pill}`}>{urgency.label}</span></span>
                      <span className="mt-1 block truncate text-[10px] text-slate-500">{claim.address || "Sin dirección"} <span className="px-0.5 text-slate-300">·</span> {claim.status}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 rounded-lg bg-[#F5F6F7] px-2 py-1 text-[10px] font-bold tabular-nums text-[#465D70]">{days} d <ArrowDownRight className="h-3 w-3 text-[#9AA8B0]" /></span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between border-t border-[#EDF0F1] bg-[#FAFBFB] px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2 text-[9px] text-slate-500"><span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#B5493B]" />14+ d</span><span className="inline-flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#D28B43]" />7+ d</span></div>
              <button type="button" onClick={() => onNavigateToView(ViewType.INSURANCE_CLAIM)} className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2F5270] transition hover:text-[#755613]">Revisar cartera <ArrowRight className="h-3 w-3" /></button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function MetricCard({ title, value, illustration, onClick }: { key?: React.Key; title: string; value: string; illustration: Illustration; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="admin-metric-card group relative flex min-h-[76px] min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-[#E0E5E8] bg-white px-3 py-3 text-left shadow-[0_4px_15px_rgba(23,49,74,0.035)] transition duration-200 hover:-translate-y-0.5 hover:border-[#D3DBDF] hover:shadow-[0_10px_22px_rgba(23,49,74,0.075)] focus-visible:outline-[#755613] sm:px-3.5">
      <span className="admin-metric-accent absolute inset-x-0 top-0 h-[2px]" />
      <IllustratedIcon name={illustration} className="admin-metric-illustration" />
      <span className="min-w-0 flex-1"><span title={title} className="line-clamp-2 whitespace-normal break-words text-[9px] font-bold uppercase leading-[1.15] tracking-[0.065em] text-[#73818B]">{title}</span><span className="mt-1 block truncate text-2xl font-bold leading-none tracking-tight tabular-nums text-[#102A46]">{value}</span></span>
    </button>
  );
}

function FilterButton({ active, onClick, children, dark = false }: { key?: React.Key; active: boolean; onClick: () => void; children: React.ReactNode; dark?: boolean }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[9px] font-bold transition focus-visible:outline-[#755613] ${active ? "bg-white text-[#102A46] shadow-sm" : dark ? "text-[#CFD9E1] hover:bg-white/10 hover:text-white" : "text-[#596D78] hover:bg-white/70 hover:text-[#2F5270]"}`}>{children}</button>;
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <div className="flex min-h-[185px] flex-col items-center justify-center px-5 py-8 text-center">
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF0F5] text-[#102A46]">{icon}</span>
    <p className="mt-3 text-xs font-bold text-[#2F5270]">{title}</p>
    <p className="mt-1 max-w-[270px] text-[10px] leading-4 text-slate-500">{description}</p>
  </div>;
}

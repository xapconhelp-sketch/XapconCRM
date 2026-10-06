import React from "react";
import {
  AlarmClock,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Clock3,
  HardHat,
  MapPin,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { eligibleCaseMembers, isTaskAssignedTo } from "../lib/teamAccess.js";
import { Lead, TaskItem, TeamMember, ViewType } from "../types";

type NewTaskDetails = {
  dueDate: string;
  priority: "high" | "medium" | "low";
  kind: NonNullable<TaskItem["kind"]>;
  category: NonNullable<TaskItem["category"]>;
  scheduledTime?: string;
};

interface ContractorDashboardProps {
  claims: Lead[];
  currentUserId: string;
  defaultTaskScope?: "all" | "mine";
  composerOnly?: boolean;
  teamMembers: TeamMember[];
  onNavigateToView: (view: ViewType) => void;
  onNavigateToLead: (leadId: string) => void;
  onCreateClaim: () => void;
  onToggleTask: (leadId: string, taskId: string) => Promise<void> | void;
  onAddTask: (leadId: string, title: string, assignedTo: string | undefined, details: NewTaskDetails) => Promise<void>;
}

type TaskRow = { claim: Lead; task: TaskItem };
type ModalMode = "task" | "activity" | null;

const activeClaim = (claim: Lead) => !["Finalizado", "Cancelado", "Negados"].includes(claim.status);
const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const validDayKey = (value?: string) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
const localDate = (key: string) => {
  const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
};
const formatDate = (key: string, options?: Intl.DateTimeFormatOptions) => {
  const date = localDate(key);
  return date ? new Intl.DateTimeFormat("es-US", options || { weekday: "short", month: "short", day: "numeric" }).format(date) : "Sin fecha";
};
const todayKey = () => dayKey(new Date());
const defaultDate = () => todayKey();

const kindLabels: Record<NonNullable<TaskItem["kind"]>, string> = {
  task: "Tarea",
  inspection: "Inspección",
  adjuster_meeting: "Cita con ajustador",
  installation: "Instalación",
};
const taskCategoryLabels: Record<NonNullable<TaskItem["category"]>, string> = {
  general: "General",
  pending_document: "Documento pendiente",
  visit_homeowner: "Visitar HO",
  call_homeowner: "Llamar HO",
  call_adjuster: "Llamar ADJ",
};

export default function ContractorDashboard({
  claims,
  currentUserId,
  defaultTaskScope = "all",
  composerOnly = false,
  teamMembers,
  onNavigateToView,
  onNavigateToLead,
  onToggleTask,
  onAddTask,
}: ContractorDashboardProps) {
  const [taskScope, setTaskScope] = React.useState(defaultTaskScope);
  const [modalMode, setModalMode] = React.useState<ModalMode>(null);
  const [kind, setKind] = React.useState<NonNullable<TaskItem["kind"]>>("task");
  const [category, setCategory] = React.useState<NonNullable<TaskItem["category"]>>("general");
  const [claimId, setClaimId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [dueDate, setDueDate] = React.useState(defaultDate());
  const [scheduledTime, setScheduledTime] = React.useState("");
  const [priority, setPriority] = React.useState<"high" | "medium" | "low">("medium");
  const [assignedTo, setAssignedTo] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState("");

  const today = todayKey();
  const assignmentMembers = eligibleCaseMembers(teamMembers, claims.find(claim => claim.id === claimId)?.organizationId);
  React.useEffect(() => {
    if (assignedTo && !assignmentMembers.some(member => member.id === assignedTo)) setAssignedTo('');
  }, [claimId, teamMembers, assignedTo]);
  const activeClaims = React.useMemo(() => claims.filter(activeClaim), [claims]);
  const allTasks = React.useMemo<TaskRow[]>(() => activeClaims.flatMap((claim) =>
    (claim.tasks || []).filter((task) => task.status === "pending" && (taskScope === "all" || isTaskAssignedTo(task, currentUserId))).map((task) => ({ claim, task }))
  ), [activeClaims, taskScope, currentUserId]);

  const dueToday = allTasks.filter(({ task }) => task.kind !== "inspection" && task.kind !== "adjuster_meeting" && task.kind !== "installation" && task.dueDate === today);
  const overdue = allTasks.filter(({ task }) => validDayKey(task.dueDate) && task.dueDate < today);
  const scheduled = allTasks
    .filter(({ task }) => task.kind && task.kind !== "task" && validDayKey(task.dueDate) && task.dueDate >= today && task.dueDate <= dayKey(new Date(new Date().setDate(new Date().getDate() + 6))))
    .sort((a, b) => `${a.task.dueDate}${a.task.scheduledTime || ""}`.localeCompare(`${b.task.dueDate}${b.task.scheduledTime || ""}`));
  const taskQueue = allTasks.filter(({ task }) => task.kind === "task" || !task.kind || (validDayKey(task.dueDate) && task.dueDate < today))
    .sort((a, b) => {
      const dateOrder = (validDayKey(a.task.dueDate) ? a.task.dueDate : "9999").localeCompare(validDayKey(b.task.dueDate) ? b.task.dueDate : "9999");
      if (dateOrder !== 0) return dateOrder;
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return (priorityOrder[a.task.priority || "medium"] ?? 1) - (priorityOrder[b.task.priority || "medium"] ?? 1);
    });
  const taskCountToday = dueToday.length;
  const lateCount = overdue.length;
  const inactivity = React.useMemo(() => activeClaims.map((claim) => {
    const createdAt = claim.created_at ? Date.parse(claim.created_at) : 0;
    const latest = (claim.timeline || []).reduce((latestTime, event) => {
      const dateTime = Date.parse(event.date || "");
      const timestamp = Date.parse(event.timestamp || "");
      const parsed = Math.max(Number.isFinite(dateTime) ? dateTime : 0, Number.isFinite(timestamp) ? timestamp : 0);
      return Math.max(latestTime, parsed);
    }, Number.isFinite(createdAt) ? createdAt : 0);
    const days = latest ? Math.max(0, Math.floor((Date.now() - latest) / 86400000)) : 0;
    return { claim, days };
  }).filter(({ days }) => days >= 7).sort((a, b) => b.days - a.days).slice(0, 5), [activeClaims]);

  const openComposer = (mode: Exclude<ModalMode, null>, preset: NonNullable<TaskItem["kind"]>) => {
    setModalMode(mode);
    setKind(preset);
    setCategory("general");
    setClaimId(activeClaims[0]?.id || "");
    setTitle(preset === "task" ? "" : kindLabels[preset]);
    setDueDate(defaultDate());
    setScheduledTime("");
    setPriority("medium");
    setAssignedTo("");
    setFormError("");
  };


  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!claimId) {
      setFormError("Selecciona un reclamo para asociar esta actividad.");
      return;
    }
    if (!title.trim()) {
      setFormError("Escribe un nombre para la actividad.");
      return;
    }
    if (kind !== "task" && (!dueDate || !scheduledTime)) {
      setFormError("Las actividades agendadas necesitan fecha y hora.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await onAddTask(claimId, title.trim(), assignedTo || undefined, {
        dueDate,
        priority,
        kind,
        category: kind === "task" ? category : "general",
        scheduledTime: kind === "task" ? undefined : scheduledTime,
      });
      setModalMode(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const dayGreeting = new Date().getHours() < 12 ? "Buenos días" : new Date().getHours() < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className={composerOnly ? "contents" : "contractor-dashboard crm-workspace flex-1 min-h-0 overflow-y-auto bg-[#F1F4F7]"} aria-label={composerOnly ? "Crear tareas y actividades" : "Dashboard de contratistas"}>
      {composerOnly && <div className="flex shrink-0 flex-wrap justify-end gap-2 p-0"><button onClick={() => openComposer("task", "task")} className="whitespace-nowrap rounded-lg bg-white px-3.5 py-2.5 text-[11px] font-bold text-[#102A46] shadow-sm transition hover:bg-[#F4EEDB]">Nueva tarea</button><button onClick={() => openComposer("activity", "inspection")} className="whitespace-nowrap rounded-lg border border-white/25 bg-white/[0.04] px-3.5 py-2.5 text-[11px] font-bold text-white transition hover:border-white/45 hover:bg-white/[0.08]">Agendar actividad</button></div>}
      {!composerOnly && <>
      <div className="contractor-dashboard-inner mx-auto w-full max-w-[1500px] space-y-5 p-4 sm:p-6 xl:p-8">
        <section className="contractor-hero relative isolate overflow-hidden rounded-[24px] bg-[#102A46] px-5 py-6 text-white shadow-[0_18px_48px_rgba(23,49,74,0.16)] sm:px-8 sm:py-8">
          <div className="pointer-events-none absolute -right-8 -top-20 h-64 w-64 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-1 -top-12 h-48 w-48 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-1 w-2/5 bg-gradient-to-l from-[#8C6A22] to-transparent" />
          <div className="contractor-hero-content relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#D7A47B]">
                <HardHat className="h-4 w-4" /> Centro de operaciones
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-[38px]">{dayGreeting}, equipo.</h1>
            </div>
            <div className="contractor-metrics grid grid-cols-3 gap-2 sm:gap-3">
              <SummaryMetric label="Para hoy" value={taskCountToday} icon={<CalendarDays className="h-4 w-4" />} />
              <SummaryMetric label="Vencidas" value={lateCount} icon={<CircleAlert className="h-4 w-4" />} alert={lateCount > 0} />
              <SummaryMetric label="Agenda · 7 días" value={scheduled.length} icon={<Clock3 className="h-4 w-4" />} />
            </div>
          </div>
        </section>

        <section className="contractor-actionbar flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" aria-label="Acciones rápidas">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#102A46]">Mi día</h2>
            <p className="text-xs text-slate-500">Tareas, visitas y seguimientos de tu empresa.</p>
            <div className="contractor-scope mt-2 flex gap-2"><button onClick={() => setTaskScope('mine')} className={`rounded-lg px-3 py-1 text-xs ${taskScope === 'mine' ? 'bg-[#102A46] text-white' : 'border bg-white'}`}>Mis tareas</button><button onClick={() => setTaskScope('all')} className={`rounded-lg px-3 py-1 text-xs ${taskScope === 'all' ? 'bg-[#102A46] text-white' : 'border bg-white'}`}>Toda la empresa</button></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => openComposer("task", "task")} className="inline-flex items-center gap-2 rounded-xl bg-[#102A46] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#193856] focus:outline-none focus:ring-2 focus:ring-[#8C6A22] focus:ring-offset-2">
              <Plus className="h-4 w-4" /> Nueva tarea
            </button>
            <button onClick={() => openComposer("activity", "inspection")} className="inline-flex items-center gap-2 rounded-xl border border-[#D5DDE1] bg-white px-4 py-2.5 text-xs font-bold text-[#102A46] transition hover:border-[#8C6A22] hover:bg-[#FBF9F2] focus:outline-none focus:ring-2 focus:ring-[#8C6A22] focus:ring-offset-2">
              <CalendarDays className="h-4 w-4 text-[#755613]" /> Agendar actividad
            </button>
          </div>
        </section>

        <div className="contractor-dashboard-grid grid grid-cols-1 gap-5 xl:grid-cols-12">
          <section className="contractor-panel overflow-hidden rounded-2xl border border-[#E0E5E6] bg-white shadow-[0_5px_20px_rgba(23,49,74,0.04)] xl:col-span-7" aria-labelledby="agenda-heading">
            <div className="contractor-panel-head flex items-center justify-between border-b border-[#EEF2F5] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F4E9] text-[#755613]"><CalendarDays className="h-5 w-5" /></div>
                <div><h2 id="agenda-heading" className="text-sm font-bold text-[#102A46]">Agenda próxima</h2><p className="mt-0.5 text-[11px] text-slate-500">Inspecciones, citas e instalaciones · próximos 7 días</p></div>
              </div>
              <span className="rounded-full bg-[#F4F6F6] px-2.5 py-1 text-[10px] font-bold text-[#61717A]">{scheduled.length}</span>
            </div>
            {scheduled.length === 0 ? (
              <EmptyState icon={<CalendarDays className="h-5 w-5" />} title="No hay actividades agendadas" detail="Agenda una inspección, una cita o una instalación para verla aquí." />
            ) : (
              <div className="divide-y divide-[#F0F2F2]">
                {scheduled.slice(0, 6).map(({ claim, task }) => (
                  <button key={`${claim.id}-${task.id}`} onClick={() => onNavigateToLead(claim.id)} className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-[#FAFBFA] sm:px-6">
                    <div className="flex w-[62px] shrink-0 flex-col items-center rounded-xl bg-[#F1F4F7] px-2 py-2 text-center group-hover:bg-white">
                      <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{formatDate(task.dueDate, { weekday: "short" })}</span>
                      <span className="mt-0.5 text-[14px] font-extrabold leading-none text-[#102A46]">{formatDate(task.dueDate, { day: "numeric" })}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-xs font-bold text-[#102A46]">{task.title}</p>
                        <span className="rounded-md bg-[#F7F4E9] px-1.5 py-0.5 text-[9px] font-bold text-[#905A39]">{kindLabels[task.kind || "inspection"]}</span>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-slate-500">{claim.name}{claim.address ? ` · ${claim.address}` : ""}{task.scheduledTime ? <span className="sm:hidden"> · {formatTime(task.scheduledTime)}</span> : null}</p>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      {task.scheduledTime && <p className="text-xs font-bold text-[#102A46]">{formatTime(task.scheduledTime)}</p>}
                      {task.assignedTo && <p className="mt-1 text-[10px] text-slate-500">{task.assignedTo}</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#755613]" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="contractor-panel overflow-hidden rounded-2xl border border-[#E0E5E6] bg-white shadow-[0_5px_20px_rgba(23,49,74,0.04)] xl:col-span-5" aria-labelledby="tasks-heading">
            <div className="contractor-panel-head flex items-center justify-between border-b border-[#EEF2F5] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF0F4] text-[#2F5270]"><ClipboardList className="h-5 w-5" /></div>
                <div><h2 id="tasks-heading" className="text-sm font-bold text-[#102A46]">Tareas por atender</h2><p className="mt-0.5 text-[11px] text-slate-500">Ordenadas por vencimiento y prioridad</p></div>
              </div>
              <button onClick={() => openComposer("task", "task")} className="rounded-lg p-2 text-[#61717A] transition hover:bg-[#F1F4F7] hover:text-[#102A46]" aria-label="Agregar una tarea"><Plus className="h-4 w-4" /></button>
            </div>
                  {taskQueue.length === 0 ? (
              <EmptyState icon={<CheckCheck className="h-5 w-5" />} title="Todo al día" detail="No hay tareas pendientes en tus reclamos activos." />
            ) : (
              <div className="max-h-[440px] divide-y divide-[#F0F2F2] overflow-y-auto">
                {taskQueue.map(({ claim, task }) => {
                  const isLate = validDayKey(task.dueDate) && task.dueDate < today;
                  const isToday = task.dueDate === today;
                  return (
                    <div key={`${claim.id}-${task.id}`} className={`flex items-start gap-3 px-5 py-3.5 sm:px-6 ${isLate ? "bg-[#FFF9F7]" : ""}`}>
                      <button onClick={() => onToggleTask(claim.id, task.id)} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${isLate ? "border-[#D06B55] text-[#D06B55] hover:bg-[#D06B55] hover:text-white" : "border-[#C8D2D6] text-transparent hover:border-[#3C856F] hover:bg-[#3C856F] hover:text-white"}`} aria-label={`Completar tarea: ${task.title}`}><Check className="h-3 w-3" /></button>
                      <div className="min-w-0 flex-1">
                        <button onClick={() => onNavigateToLead(claim.id)} className="block max-w-full truncate text-left text-xs font-bold text-[#102A46] hover:text-[#755613]">{task.title}</button>
                        {task.category && task.category !== "general" && <span className="mt-1 inline-flex rounded-md bg-[#F7F4E9] px-1.5 py-0.5 text-[9px] font-bold text-[#905A39]">{taskCategoryLabels[task.category]}</span>}
                        <p className="mt-1 truncate text-[10px] text-slate-500">{claim.name}{task.assignedTo ? ` · ${task.assignedTo}` : ""}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        {validDayKey(task.dueDate) ? <span className={`text-[10px] font-bold ${isLate ? "text-[#C45645]" : isToday ? "text-[#755613]" : "text-slate-500"}`}>{isLate ? "Vencida · " : isToday ? "Hoy · " : ""}{formatDate(task.dueDate, { month: "short", day: "numeric" })}</span> : <span className="text-[10px] font-medium text-slate-400">Sin fecha</span>}
                        {task.priority === "high" && <span className="mt-1 block text-[9px] font-bold uppercase tracking-wide text-[#C45645]">Prioridad alta</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="contractor-dashboard-grid grid grid-cols-1 gap-5 xl:grid-cols-12">
          <section className="contractor-panel overflow-hidden rounded-2xl border border-[#E0E5E6] bg-white shadow-[0_5px_20px_rgba(23,49,74,0.04)] xl:col-span-7" aria-labelledby="followup-heading">
            <div className="contractor-panel-head flex items-center justify-between border-b border-[#EEF2F5] px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F7F0E5] text-[#9B7135]"><RotateCcw className="h-5 w-5" /></div>
                <div><h2 id="followup-heading" className="text-sm font-bold text-[#102A46]">Casos que requieren seguimiento</h2><p className="mt-0.5 text-[11px] text-slate-500">Sin actividad registrada en los últimos 7 días</p></div>
              </div>
              <button onClick={() => onNavigateToView(ViewType.INSURANCE_CLAIM)} className="inline-flex items-center gap-1 text-[10px] font-bold text-[#465D70] hover:text-[#755613]">Todos los reclamos <ArrowRight className="h-3 w-3" /></button>
            </div>
            {inactivity.length === 0 ? (
              <EmptyState icon={<CheckCheck className="h-5 w-5" />} title="Buen ritmo de seguimiento" detail="Ningún reclamo activo lleva 7 días sin actividad." />
            ) : (
              <div className="divide-y divide-[#F0F2F2]">
                {inactivity.map(({ claim, days }) => (
                  <button key={claim.id} onClick={() => onNavigateToLead(claim.id)} className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-[#FAFBFA] sm:px-6">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${days >= 14 ? "bg-[#C45645]" : "bg-[#D29447]"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-[#102A46] group-hover:text-[#755613]">{claim.name}</p>
                      <p className="mt-1 truncate text-[10px] text-slate-500">{claim.address || "Sin dirección"} · {claim.status}</p>
                    </div>
                    <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold ${days >= 14 ? "bg-[#FCEDEA] text-[#B5493B]" : "bg-[#FBF3E8] text-[#96652B]"}`}>{days} días</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-[#755613]" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="contractor-shortcuts flex flex-col justify-between rounded-2xl border border-[#DCE5E8] bg-[#EAF0F2] p-5 sm:p-6 xl:col-span-5" aria-label="Atajos de operación">
            <div>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#2F5270] shadow-sm"><MapPin className="h-5 w-5" /></div>
              <h2 className="text-sm font-bold text-[#102A46]">Mantén los proyectos en movimiento</h2>
              <p className="mt-2 text-xs leading-5 text-[#5E707A]">Registra el siguiente paso de cada reclamo. El equipo verá fechas, responsables y actividades desde el mismo expediente.</p>
            </div>
            <button onClick={() => onNavigateToView(ViewType.INSURANCE_CLAIM)} className="mt-5 inline-flex items-center justify-between rounded-xl bg-white px-4 py-3 text-xs font-bold text-[#102A46] shadow-sm transition hover:shadow-md">
              Abrir reclamos <ArrowRight className="h-4 w-4 text-[#755613]" />
            </button>
          </section>
        </div>
      </div>

      </>}
      {modalMode && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#102333]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModalMode(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="composer-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between border-b border-[#EEF2F5] px-5 py-4 sm:px-6">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#755613]">{modalMode === "task" ? "Seguimiento" : "Agenda de trabajo"}</p><h2 id="composer-title" className="mt-1 text-lg font-bold text-[#102A46]">{modalMode === "task" ? "Nueva tarea" : "Agendar actividad"}</h2></div>
              <button type="button" onClick={() => setModalMode(null)} disabled={saving} aria-label="Cerrar" className="rounded-lg p-2 text-slate-500 hover:bg-[#F1F4F7]"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4 px-5 py-5 sm:px-6">
              {modalMode === "task" ? (
                <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-[#465D70]">Tipo de tarea o actividad</span><select value={kind === "task" ? category : kind} onChange={(event) => {
                  const value = event.target.value;
                  if (value === "general" || value === "pending_document" || value === "visit_homeowner" || value === "call_homeowner" || value === "call_adjuster") {
                    setCategory(value);
                    setKind("task");
                    if (Object.values(kindLabels).includes(title)) setTitle("");
                    return;
                  }
                  const next = value as Exclude<NonNullable<TaskItem["kind"]>, "task">;
                  setKind(next);
                  setCategory("general");
                  if (!title || Object.values(kindLabels).includes(title)) setTitle(kindLabels[next]);
                }} className="w-full rounded-xl border border-[#DCE4EB] bg-white px-3 py-2.5 text-sm text-[#102A46] outline-none focus:border-[#755613] focus:ring-2 focus:ring-[#755613]/15">
                  <optgroup label="Tareas"><option value="general">Tarea general</option><option value="pending_document">Documento pendiente</option><option value="visit_homeowner">Visitar HO</option><option value="call_homeowner">Llamar HO</option><option value="call_adjuster">Llamar ADJ</option></optgroup>
                  <optgroup label="Actividades agendadas"><option value="inspection">Inspección</option><option value="adjuster_meeting">Cita con ajustador</option><option value="installation">Instalación</option></optgroup>
                </select></label>
              ) : (
                <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-[#465D70]">Tipo de actividad</span><select value={kind} onChange={(event) => { const next = event.target.value as Exclude<NonNullable<TaskItem["kind"]>, "task">; setKind(next); if (!title || Object.values(kindLabels).includes(title)) setTitle(kindLabels[next]); }} className="w-full rounded-xl border border-[#DCE4EB] bg-white px-3 py-2.5 text-sm text-[#102A46] outline-none focus:border-[#755613] focus:ring-2 focus:ring-[#755613]/15"><option value="inspection">Inspección</option><option value="adjuster_meeting">Cita con ajustador</option><option value="installation">Instalación</option></select></label>
              )}
              <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-[#465D70]">Reclamo</span><select value={claimId} onChange={(event) => setClaimId(event.target.value)} required className="w-full rounded-xl border border-[#DCE4EB] bg-white px-3 py-2.5 text-sm text-[#102A46] outline-none focus:border-[#755613] focus:ring-2 focus:ring-[#755613]/15"><option value="">Selecciona un reclamo</option>{activeClaims.map((claim) => <option key={claim.id} value={claim.id}>{claim.name}{claim.address ? ` · ${claim.address}` : ""}</option>)}</select></label>
              <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-[#465D70]">Descripción</span><input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} placeholder={kind === "task" ? "Ej. Confirmar fecha con el ajustador" : `Ej. ${kindLabels[kind]} inicial`} className="w-full rounded-xl border border-[#DCE4EB] px-3 py-2.5 text-sm text-[#102A46] outline-none placeholder:text-slate-400 focus:border-[#755613] focus:ring-2 focus:ring-[#755613]/15" /></label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-[#465D70]">{kind === "task" ? "Fecha límite" : "Fecha"}</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required={kind !== "task"} className="w-full rounded-xl border border-[#DCE4EB] px-3 py-2.5 text-sm text-[#102A46] outline-none focus:border-[#755613] focus:ring-2 focus:ring-[#755613]/15" /></label>
                {kind === "task" ? <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-[#465D70]">Prioridad</span><select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} className="w-full rounded-xl border border-[#DCE4EB] bg-white px-3 py-2.5 text-sm text-[#102A46] outline-none focus:border-[#755613] focus:ring-2 focus:ring-[#755613]/15"><option value="high">Alta</option><option value="medium">Normal</option><option value="low">Baja</option></select></label> : <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-[#465D70]">Hora</span><input type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} required className="w-full rounded-xl border border-[#DCE4EB] px-3 py-2.5 text-sm text-[#102A46] outline-none focus:border-[#755613] focus:ring-2 focus:ring-[#755613]/15" /></label>}
              </div>
              <label className="block"><span className="mb-1.5 block text-[11px] font-bold text-[#465D70]">Asignar a</span><select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} className="w-full rounded-xl border border-[#DCE4EB] bg-white px-3 py-2.5 text-sm text-[#102A46] outline-none focus:border-[#755613] focus:ring-2 focus:ring-[#755613]/15"><option value="">Sin asignar</option>{assignmentMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
              {formError && <p role="alert" className="rounded-xl bg-[#FCEDEA] px-3 py-2.5 text-xs font-medium text-[#B5493B]">{formError}</p>}
              <div className="flex flex-col-reverse gap-2 border-t border-[#EEF2F5] pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setModalMode(null)} disabled={saving} className="rounded-xl px-4 py-2.5 text-xs font-bold text-[#465D70] hover:bg-[#F1F4F7]">Cancelar</button>
                <button type="submit" disabled={saving || activeClaims.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#102A46] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#193856] disabled:cursor-not-allowed disabled:opacity-50">{saving ? <><AlarmClock className="h-4 w-4 animate-pulse" /> Guardando…</> : <><Check className="h-4 w-4" /> {kind === "task" ? "Guardar tarea" : "Guardar actividad"}</>}</button>
              </div>
              {activeClaims.length === 0 && <p className="text-center text-[11px] text-slate-500">Necesitas un reclamo activo para registrar una actividad.</p>}
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function SummaryMetric({ label, value, icon, alert = false }: { label: string; value: number; icon: React.ReactNode; alert?: boolean }) {
  return <div className={`contractor-summary min-w-[86px] rounded-xl border px-3 py-2.5 sm:min-w-[110px] sm:px-4 ${alert ? "border-[#E9A196]/35 bg-[#8D3D34]/35" : "border-white/10 bg-white/[0.07]"}`}>
    <div className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide sm:text-[10px] ${alert ? "text-[#FFD0C7]" : "text-blue-100/70"}`}>{icon}<span className="truncate">{label}</span></div>
    <div className={`mt-1 text-2xl font-semibold tracking-tight sm:text-[28px] ${alert ? "text-[#FFD0C7]" : "text-white"}`}>{value}</div>
  </div>;
}

function EmptyState({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return <div className="contractor-empty flex min-h-[150px] flex-col items-center justify-center px-6 py-8 text-center">
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1F4F7] text-[#596D78]">{icon}</div>
    <p className="text-xs font-bold text-[#102A46]">{title}</p>
    <p className="mt-1 max-w-[280px] text-[11px] leading-5 text-slate-500">{detail}</p>
  </div>;
}

function formatTime(value: string) {
  const [hourPart, minute] = value.split(":");
  const hour = Number(hourPart);
  if (!Number.isFinite(hour)) return value;
  return `${hour % 12 || 12}:${minute || "00"} ${hour >= 12 ? "PM" : "AM"}`;
}

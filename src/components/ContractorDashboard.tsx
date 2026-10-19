import IllustratedIcon from './contractor/IllustratedIcon';
import { RoleInput, RoleSelect } from "./contractor/DesignSystem";
import React from "react";
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/card';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from './ui/empty';
import { RoleField, RoleFieldGroup } from './contractor/DesignSystem';
import { RoleModal } from './contractor/DesignSystem';
import {
  AlarmClock,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  ClipboardList,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { eligibleCaseMembers, isTaskAssignedTo } from "../lib/teamAccess.js";
import { getDaysSinceLastUpdate } from "../lib/caseActivity";
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
  membershipPlan?: "pro" | "plus";
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
  visit_homeowner: "Visitar HO",
  reinspection: "Re inspección",
};
const taskCategoryLabels: Record<NonNullable<TaskItem["category"]>, string> = {
  general: "General",
  pending_document: "Documento pendiente",
  visit_homeowner: "Visitar HO",
  call_homeowner: "Llamar HO",
  call_adjuster: "Llamar ADJ",
  prepare_supplement: "Preparar Suplemento",
  prepare_estimate: "Preparar Estimado",
  itel_followup: "Esperando o enviar ITEL",
  panel_contract_followup: "Esperando o enviar Contrato de Paneles",
  pending_coc: "Pendiente enviar COC",
  request_depreciation: "Pendiente Solicitar Depreciación",
  send_upload_photos: "Enviar o cargar Fotos",
  other: "Otro",
};
const taskCategoryOptions = [
  { value: "prepare_supplement", label: "Preparar Suplemento" },
  { value: "prepare_estimate", label: "Preparar Estimado" },
  { value: "itel_followup", label: "Esperando o enviar ITEL" },
  { value: "panel_contract_followup", label: "Esperando o enviar Contrato de Paneles" },
  { value: "pending_coc", label: "Pendiente enviar COC" },
  { value: "request_depreciation", label: "Pendiente Solicitar Depreciación" },
  { value: "send_upload_photos", label: "Enviar o cargar Fotos" },
  { value: "other", label: "Otro" },
] as const;

export default function ContractorDashboard({
  claims,
  currentUserId,
  membershipPlan,
  defaultTaskScope = "all",
  composerOnly = false,
  teamMembers,
  onNavigateToView,
  onNavigateToLead,
  onCreateClaim,
  onToggleTask,
  onAddTask,
}: ContractorDashboardProps) {
  const [taskScope, setTaskScope] = React.useState(defaultTaskScope);
  const [modalMode, setModalMode] = React.useState<ModalMode>(null);
  const [kind, setKind] = React.useState<NonNullable<TaskItem["kind"]>>("task");
  const [category, setCategory] = React.useState<NonNullable<TaskItem["category"]>>(taskCategoryOptions[0].value);
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

  const dueToday = allTasks.filter(({ task }) => (!task.kind || task.kind === "task") && task.dueDate === today);
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
    const days = getDaysSinceLastUpdate(claim);
    return { claim, days };
  }).filter(({ days }) => days >= 7).sort((a, b) => b.days - a.days).slice(0, 5), [activeClaims]);

  const openComposer = (mode: Exclude<ModalMode, null>, preset: NonNullable<TaskItem["kind"]>) => {
    setModalMode(mode);
    setKind(preset);
    setCategory(taskCategoryOptions[0].value);
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
    const taskTitle = kind === "task" && category !== "other" ? taskCategoryLabels[category] : title.trim();
    if (!taskTitle) {
      setFormError(category === "other" ? "Escribe una descripción para la tarea Otro." : "Escribe una descripción para la actividad.");
      return;
    }
    if (kind !== "task" && (!dueDate || !scheduledTime)) {
      setFormError("Las actividades agendadas necesitan fecha y hora.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await onAddTask(claimId, taskTitle, assignedTo || undefined, {
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


  return (
    <div className={composerOnly ? "contents" : "contractor-dashboard crm-workspace flex-1 min-h-0 overflow-y-auto bg-[#F1F4F7]"} aria-label={composerOnly ? "Crear tareas y actividades" : "Dashboard de contratistas"}>
      {composerOnly && <div className="flex shrink-0 flex-wrap justify-end gap-2 p-0"><button onClick={() => openComposer("task", "task")} className="whitespace-nowrap rounded-lg bg-white px-3.5 py-2.5 text-[11px] font-bold text-[#102A46] shadow-sm transition hover:bg-[#F4EEDB]">Nueva tarea</button><button onClick={() => openComposer("activity", "inspection")} className="whitespace-nowrap rounded-lg border border-white/25 bg-white/[0.04] px-3.5 py-2.5 text-[11px] font-bold text-white transition hover:border-white/45 hover:bg-white/[0.08]">Agendar actividad</button></div>}
      {!composerOnly && <>
      <div className="contractor-dashboard-inner mx-auto w-full max-w-[1500px] space-y-5 p-4 sm:p-6 xl:p-8">
        <div className="contractor-overview">
        <header className="contractor-page-heading contractor-welcome">
          <div className="flex flex-wrap items-center gap-3">
            <h1>Panel de trabajo</h1>
            {membershipPlan && <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-[.09em] ${membershipPlan === "plus" ? "border-[#D2B96F] bg-[#FBF7E9] text-[#735719]" : "border-[#C9DCEB] bg-[#EEF5FA] text-[#1F5C91]"}`}><BadgeCheck className="h-3.5 w-3.5" /> Miembro {membershipPlan === "pro" ? "PRO" : "PLUS"}</span>}
          </div>
          <div className="contractor-welcome-action"><Button onClick={onCreateClaim}><Plus data-icon="inline-start" />Nuevo reclamo</Button></div>
        </header>
        <section className="contractor-metrics" aria-label="Resumen de trabajo">
          <SummaryMetric label="Reclamos activos" value={activeClaims.length} icon={<IllustratedIcon name="claim" />} />
          <SummaryMetric label="Tareas para hoy" value={taskCountToday} icon={<IllustratedIcon name="calendar" />} />
          <SummaryMetric label="Tareas vencidas" value={lateCount} icon={<IllustratedIcon name="alert" />} alert={lateCount > 0} />
          <SummaryMetric label="Agenda · 7 días" value={scheduled.length} icon={<IllustratedIcon name="calendar" />} />
        </section>
        </div>

        <section className="contractor-actionbar flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" aria-label="Acciones rápidas">
          <div className="contractor-day-controls">
            <div>
            <h2 className="text-lg font-bold tracking-tight text-[#102A46]">Mi día</h2>
            <p className="text-xs text-slate-500">Tareas, visitas y seguimientos de tu empresa.</p>
            </div>
            <ToggleGroup type="single" value={taskScope} onValueChange={value => { if (value === 'mine' || value === 'all') setTaskScope(value); }} className="contractor-scope mt-3" size="sm" aria-label="Mostrar tareas"><ToggleGroupItem value="mine">Mis tareas</ToggleGroupItem><ToggleGroupItem value="all">Toda la empresa</ToggleGroupItem></ToggleGroup>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => openComposer("task", "task")}><Plus data-icon="inline-start" />Nueva tarea</Button>
            <Button variant="outline" onClick={() => openComposer("activity", "inspection")}><CalendarDays data-icon="inline-start" />Agendar actividad</Button>
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
                  <button key={`${claim.id}-${task.id}`} onClick={() => onNavigateToLead(claim.id)} className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-[#FAFBFC] sm:px-6">
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
                      <button onClick={() => onToggleTask(claim.id, task.id)} className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${isLate ? "border-[#D06B55] text-[#D06B55] hover:bg-[#D06B55] hover:text-white" : "border-[#C8D2D6] text-transparent hover:border-[#102A46] hover:bg-[#102A46] hover:text-white"}`} aria-label={`Completar tarea: ${task.title}`}><Check className="h-3 w-3" /></button>
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
                  <button key={claim.id} onClick={() => onNavigateToLead(claim.id)} className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-[#FAFBFC] sm:px-6">
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

          <Card className="contractor-progress">
            <CardHeader><CardTitle>Estado de tus proyectos</CardTitle><CardDescription>Distribución de los reclamos activos.</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-5">
              {activeClaims.length === 0 ? <p className="text-sm text-muted-foreground">Tus proyectos aparecerán aquí al registrar el primer reclamo.</p> : Array.from(new Set(activeClaims.map(claim => claim.status))).map(status => {
                const count = activeClaims.filter(claim => claim.status === status).length;
                return <div className="contractor-progress-row" key={status}><span>{status}</span><strong>{count}</strong><div className="contractor-progress-track" role="meter" aria-label={status} aria-valuenow={count} aria-valuemin={0} aria-valuemax={activeClaims.length}><span style={{ width: `${count / activeClaims.length * 100}%` }} /></div></div>;
              })}
            </CardContent>
            <CardFooter><Button variant="ghost" onClick={() => onNavigateToView(ViewType.PRODUCTION)}>Ver producción<ArrowRight data-icon="inline-end" /></Button></CardFooter>
          </Card>
        </div>
      </div>

      </>}
      {modalMode && (
        <RoleModal title={modalMode === "task" ? "Nueva tarea" : "Agendar actividad"} onClose={() => setModalMode(null)} busy={saving} wide={false} outerProps={{"className": "fixed inset-0 z-[100] flex items-end justify-center bg-[#102333]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4", "role": "presentation", "onMouseDown": (event) => { if (event.target === event.currentTarget && !saving) setModalMode(null); }}} contentProps={{"role": "dialog", "aria-modal": "true", "aria-labelledby": "composer-title", "className": "max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"}}>
            <div className="flex items-start justify-between border-b border-[#EEF2F5] px-5 py-4 sm:px-6">
              <div>{composerOnly && <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#755613]">{modalMode === "task" ? "Seguimiento" : "Agenda de trabajo"}</p>}<h2 id="composer-title" className={`${composerOnly ? "mt-1 " : ""}text-lg font-bold text-[#102A46]`}>{modalMode === "task" ? "Nueva tarea" : "Agendar actividad"}</h2></div>
              <button type="button" onClick={() => setModalMode(null)} disabled={saving} aria-label="Cerrar" className="rounded-lg p-2 text-slate-500 hover:bg-[#F1F4F7]"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4 px-5 py-5 sm:px-6"><RoleFieldGroup>
              {modalMode === "task" ? (
                <RoleField><span className="mb-1.5 block text-[11px] font-bold text-[#465D70]">Tipo de tarea</span><RoleSelect value={category} onChange={(event) => { setCategory(event.target.value as NonNullable<TaskItem["category"]>); setTitle(""); }} className="w-full rounded-xl border border-[#DCE4EB] bg-white px-3 py-2.5 text-sm text-[#102A46] outline-none focus:border-[#755613] focus:ring-2 focus:ring-[#755613]/15">
                  {taskCategoryOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </RoleSelect></RoleField>
              ) : (
                <RoleField><span className="mb-1.5 block text-[11px] font-bold text-[#465D70]">Tipo de actividad</span><RoleSelect value={kind} onChange={(event) => { const next = event.target.value as Exclude<NonNullable<TaskItem["kind"]>, "task">; setKind(next); if (!title || Object.values(kindLabels).includes(title)) setTitle(kindLabels[next]); }} className="w-full rounded-xl border border-[#DCE4EB] bg-white px-3 py-2.5 text-sm text-[#102A46] outline-none focus:border-[#755613] focus:ring-2 focus:ring-[#755613]/15"><option value="inspection">Inspección</option><option value="adjuster_meeting">Cita con ajustador</option><option value="installation">Instalación</option><option value="visit_homeowner">Visitar HO</option><option value="reinspection">Re inspección</option></RoleSelect></RoleField>
              )}
              <RoleField><span className="mb-1.5 block text-[11px] font-bold text-[#465D70]">Reclamo</span><RoleSelect value={claimId} onChange={(event) => setClaimId(event.target.value)} required className="w-full rounded-xl border border-[#DCE4EB] bg-white px-3 py-2.5 text-sm text-[#102A46] outline-none focus:border-[#755613] focus:ring-2 focus:ring-[#755613]/15"><option value="">Selecciona un reclamo</option>{activeClaims.map((claim) => <option key={claim.id} value={claim.id}>{claim.name}{claim.address ? ` · ${claim.address}` : ""}</option>)}</RoleSelect></RoleField>
              {(modalMode === "activity" || category === "other") && <RoleField><span className="mb-1.5 block text-[11px] font-bold text-[#465D70]">Descripción</span><RoleInput value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} placeholder={kind === "task" ? "Describe la tarea" : `Ej. ${kindLabels[kind]} inicial`} className="w-full rounded-xl border border-[#DCE4EB] px-3 py-2.5 text-sm text-[#102A46] outline-none placeholder:text-slate-400 focus:border-[#755613] focus:ring-2 focus:ring-[#755613]/15" /></RoleField>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <RoleField><span className="mb-1.5 block text-[11px] font-bold text-[#465D70]">{kind === "task" ? "Fecha límite" : "Fecha"}</span><RoleInput type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required={kind !== "task"} className="w-full rounded-xl border border-[#DCE4EB] px-3 py-2.5 text-sm text-[#102A46] outline-none focus:border-[#755613] focus:ring-2 focus:ring-[#755613]/15" /></RoleField>
                {kind === "task" ? <RoleField><span className="mb-1.5 block text-[11px] font-bold text-[#465D70]">Prioridad</span><RoleSelect value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} className="w-full rounded-xl border border-[#DCE4EB] bg-white px-3 py-2.5 text-sm text-[#102A46] outline-none focus:border-[#755613] focus:ring-2 focus:ring-[#755613]/15"><option value="high">Alta</option><option value="medium">Normal</option><option value="low">Baja</option></RoleSelect></RoleField> : <RoleField><span className="mb-1.5 block text-[11px] font-bold text-[#465D70]">Hora</span><RoleInput type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} required className="w-full rounded-xl border border-[#DCE4EB] px-3 py-2.5 text-sm text-[#102A46] outline-none focus:border-[#755613] focus:ring-2 focus:ring-[#755613]/15" /></RoleField>}
              </div>
              <RoleField><span className="mb-1.5 block text-[11px] font-bold text-[#465D70]">Asignar a</span><RoleSelect value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} className="w-full rounded-xl border border-[#DCE4EB] bg-white px-3 py-2.5 text-sm text-[#102A46] outline-none focus:border-[#755613] focus:ring-2 focus:ring-[#755613]/15"><option value="">Sin asignar</option>{assignmentMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</RoleSelect></RoleField>
              {formError && <p role="alert" className="rounded-xl bg-[#FCEDEA] px-3 py-2.5 text-xs font-medium text-[#B5493B]">{formError}</p>}
              <div className="flex flex-col-reverse gap-2 border-t border-[#EEF2F5] pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setModalMode(null)} disabled={saving} className="rounded-xl px-4 py-2.5 text-xs font-bold text-[#465D70] hover:bg-[#F1F4F7]">Cancelar</button>
                <button type="submit" disabled={saving || activeClaims.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#102A46] px-5 py-2.5 text-xs font-bold text-white transition hover:bg-[#193856] disabled:cursor-not-allowed disabled:opacity-50">{saving ? <><AlarmClock className="h-4 w-4 animate-pulse" /> Guardando…</> : <><Check className="h-4 w-4" /> {kind === "task" ? "Guardar tarea" : "Guardar actividad"}</>}</button>
              </div>
              {activeClaims.length === 0 && <p className="text-center text-[11px] text-slate-500">Necesitas un reclamo activo para registrar una actividad.</p>}
            </RoleFieldGroup></form>
          </RoleModal>
      )}
    </div>
  );
}

function SummaryMetric({ label, value, icon, alert = false }: { label: string; value: number; icon: React.ReactNode; alert?: boolean }) {
  return <Card className="contractor-summary" data-alert={alert}><div className="contractor-summary-top">{icon}<span className="contractor-summary-value">{value}</span></div><p className="contractor-summary-label">{label}</p></Card>;
}

function EmptyState({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return <Empty className="contractor-empty"><EmptyHeader><EmptyMedia variant="icon">{icon}</EmptyMedia><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{detail}</EmptyDescription></EmptyHeader></Empty>;
}

function formatTime(value: string) {
  const [hourPart, minute] = value.split(":");
  const hour = Number(hourPart);
  if (!Number.isFinite(hour)) return value;
  return `${hour % 12 || 12}:${minute || "00"} ${hour >= 12 ? "PM" : "AM"}`;
}

import React from "react";
import { KPI, CriticalAlert, InspectionAppointment, ViewType, Lead, TaskItem } from "../types";
import { 
  Users, 
  FileText, 
  HardHat, 
  DollarSign, 
  AlertTriangle, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  BellRing,
  XCircle,
  Search,
  Scale,
  PlusCircle,
  CheckSquare,
  Activity,
  Flame,
  ChevronRight,
  BarChart3,
  Zap,
  AlertCircle
} from "lucide-react";

interface MainDashboardProps {
  kpis: KPI[];
  alerts: CriticalAlert[];
  inspections: InspectionAppointment[];
  onResolveAlert: (alert: CriticalAlert) => void;
  onNavigateToView: (view: ViewType) => void;
  onNavigateToLead: (leadId: string) => void;
  claims: Lead[];
  onToggleTask?: (leadId: string, taskId: string) => void;
}

const ICON_MAP: Record<string, any> = {
  "users": Users,
  "file-text": FileText,
  "hard-hat": HardHat,
  "dollar-sign": DollarSign,
  "check-circle": CheckCircle2,
  "clock": Clock,
  "trending-up": TrendingUp,
  "x-circle": XCircle,
  "search": Search,
  "scale": Scale,
  "plus-circle": PlusCircle
};

const KPI_THEMES = [
  { bg: "from-[#0F172A] to-[#1e293b]", accent: "#eab308", iconBg: "bg-yellow-500/20", iconColor: "text-yellow-400", textColor: "text-white" },
  { bg: "from-[#1e3a5f] to-[#1e40af]", accent: "#60a5fa", iconBg: "bg-blue-400/20", iconColor: "text-blue-300", textColor: "text-white" },
  { bg: "from-[#064e3b] to-[#065f46]", accent: "#34d399", iconBg: "bg-emerald-400/20", iconColor: "text-emerald-300", textColor: "text-white" },
  { bg: "from-[#4a1d96] to-[#5b21b6]", accent: "#c4b5fd", iconBg: "bg-violet-400/20", iconColor: "text-violet-300", textColor: "text-white" },
  { bg: "from-[#7c2d12] to-[#9a3412]", accent: "#fb923c", iconBg: "bg-orange-400/20", iconColor: "text-orange-300", textColor: "text-white" },
];

export default function MainDashboard({
  kpis,
  alerts,
  inspections,
  onResolveAlert,
  onNavigateToView,
  onNavigateToLead,
  claims = [],
  onToggleTask
}: MainDashboardProps) {

  const parseEventDate = (ev: any) => {
    if (ev.date) { const p = Date.parse(ev.date); if (!isNaN(p)) return p; }
    if (ev.timestamp) {
      const p = Date.parse(ev.timestamp);
      if (!isNaN(p)) return p;
      const cleaned = ev.timestamp.replace(" a las ", " ");
      const match = cleaned.match(/(\d{1,2})[\/\-](\d{2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})/);
      if (match) {
        const [_, day, month, year, hour, minute] = match;
        return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).getTime();
      }
    }
    if (ev.id && ev.id.startsWith("timeline-")) {
      const parts = ev.id.split("-");
      if (parts.length > 1) { const ts = Number(parts[1]); if (!isNaN(ts)) return ts; }
    }
    return 0;
  };

  const getInactivityDays = (claim: Lead) => {
    let latestTime = claim.created_at ? new Date(claim.created_at).getTime() : new Date().getTime();
    if (isNaN(latestTime)) latestTime = new Date().getTime();
    if (claim.timeline && claim.timeline.length > 0) {
      claim.timeline.forEach(ev => {
        const evTime = parseEventDate(ev);
        if (evTime > latestTime) latestTime = evTime;
      });
    }
    const diffMs = Date.now() - latestTime;
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  };

  const claimsWithInactivity = claims
    .filter(c => c.status !== "Finalizado" && c.status !== "Cancelado" && c.status !== "Negados")
    .map(c => ({ claim: c, days: getInactivityDays(c) }))
    .sort((a, b) => b.days - a.days);

  const getTaskDaysAgo = (taskId: string) => {
    const parts = taskId.split("-");
    const ts = parseInt(parts[1]);
    if (isNaN(ts)) return 0;
    return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
  };

  const pendingTasks = React.useMemo(() => {
    const tasksList: { claimId: string; claimName: string; claimStatus: string; task: TaskItem }[] = [];
    const seen = new Set<string>();
    claims.forEach(claim => {
      if (!claim || !claim.tasks) return;
      if (claim.status === "Finalizado" || claim.status === "Cancelado" || claim.status === "Negados") return;
      claim.tasks.forEach(t => {
        if (t.status !== "pending") return;
        const key = `${claim.name}-${(t.title || "").trim().toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          tasksList.push({ claimId: claim.id, claimName: claim.name, claimStatus: claim.status, task: t });
        }
      });
    });
    return tasksList;
  }, [claims]);

  const PIPELINE_STAGES = [
    { key: "Negados", label: "Negados", color: "#ef4444" },
    { key: "Inspección", label: "Inspección", color: "#f59e0b" },
    { key: "En disputa", label: "En Disputa", color: "#f97316" },
    { key: "Esperando Scope", label: "Esp. Scope", color: "#8b5cf6" },
    { key: "Aprobado y Suplementado", label: "Aprobado", color: "#3b82f6" },
    { key: "Construcción", label: "Construcción", color: "#06b6d4" },
    { key: "Esperando Depreciación", label: "Esp. Dep.", color: "#ec4899" },
    { key: "Finalizado", label: "Finalizado", color: "#10b981" },
    { key: "Cancelado", label: "Cancelado", color: "#6b7280" },
  ];

  const getStageCount = (key: string) =>
    claims.filter(c => {
      const knownStatuses = PIPELINE_STAGES.map(s => s.key);
      if (key === "Inspección" && !knownStatuses.includes(c.status)) return true;
      return c.status === key;
    }).length;

  const totalActive = claims.filter(c => c.status !== "Finalizado" && c.status !== "Cancelado").length;
  const urgentClaims = claimsWithInactivity.filter(x => x.days >= 7).length;
  const todayStr = new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="flex-1 overflow-y-auto bg-[#F0F2F7]" style={{ minHeight: 0 }}>

      {/* ── Top Hero Header ─────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1e293b] to-[#0F172A] px-8 py-6 border-b border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-[#eab308] flex items-center justify-center shadow-lg shadow-yellow-500/30">
                <Zap className="w-4 h-4 text-[#0F172A]" />
              </div>
              <h1 className="text-xl font-black text-white tracking-tight">Xapcon CRM</h1>
              <span className="px-2 py-0.5 bg-[#eab308]/20 text-[#eab308] text-[9px] font-bold rounded-full border border-[#eab308]/30 uppercase tracking-widest">Dashboard</span>
            </div>
            <p className="text-[11px] text-slate-400 ml-11 capitalize">{todayStr}</p>
          </div>

          <div className="flex items-center gap-3">
            {urgentClaims > 0 && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-lg">
                <Flame className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                <span className="text-red-300 text-[11px] font-bold">{urgentClaims} casos urgentes</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-[11px] font-bold">{totalActive} activos</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg text-[11px] text-slate-400 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              {new Date().toISOString().substring(11, 16)} UTC
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* ── KPI Cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {kpis.map((kpi, index) => {
            const Icon = ICON_MAP[kpi.icon] || FileText;
            const theme = KPI_THEMES[index % KPI_THEMES.length];
            return (
              <div
                key={index}
                onClick={() => {
                  if (kpi.icon === "users") onNavigateToView(ViewType.TEAM);
                  else if (kpi.icon === "dollar-sign") onNavigateToView(ViewType.FINANCIALS);
                  else onNavigateToView(ViewType.PRODUCTION);
                }}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${theme.bg} p-5 cursor-pointer group transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl shadow-lg`}
              >
                {/* Decorative circle */}
                <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10" style={{ background: theme.accent }} />

                <div className="relative flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl ${theme.iconBg} flex items-center justify-center backdrop-blur-sm`}>
                    <Icon className={`w-4.5 h-4.5 ${theme.iconColor}`} style={{ width: 18, height: 18 }} />
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
                </div>

                <div className="relative">
                  <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mb-1 truncate">{kpi.title}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white tracking-tighter">{kpi.value}</span>
                    {kpi.trend && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${kpi.trendDirection === "up" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
                        {kpi.trendDirection === "up" ? "↑" : "↓"} {kpi.trend}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/40 mt-0.5 truncate leading-tight">{kpi.subtitle}</p>
                </div>

                {kpi.progress !== undefined && (
                  <div className="relative mt-3">
                    <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${kpi.progress}%`, background: theme.accent }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Pipeline Stage Bar ───────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E4EA]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Pipeline de Casos</h2>
            </div>
            <button onClick={() => onNavigateToView(ViewType.PRODUCTION)} className="text-[10px] text-blue-500 hover:text-blue-700 font-semibold transition-colors flex items-center gap-1">
              Ver Kanban <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-9 gap-1.5">
            {PIPELINE_STAGES.map(stage => {
              const count = getStageCount(stage.key);
              const pct = totalActive > 0 ? (count / Math.max(1, claims.length)) * 100 : 0;
              return (
                <div key={stage.key} className="flex flex-col items-center gap-1.5 group cursor-pointer" onClick={() => onNavigateToView(ViewType.PRODUCTION)}>
                  <span className="text-[8px] font-bold text-[#64748B] uppercase tracking-wide text-center leading-tight h-7 flex items-end justify-center">{stage.label}</span>
                  <div className="w-full bg-[#F1F5F9] rounded-lg overflow-hidden" style={{ height: 48 }}>
                    <div
                      className="w-full rounded-lg transition-all duration-500 group-hover:opacity-80"
                      style={{ height: `${Math.max(pct, count > 0 ? 15 : 0)}%`, background: stage.color, marginTop: `${100 - Math.max(pct, count > 0 ? 15 : 0)}%`, minHeight: count > 0 ? 8 : 0 }}
                    />
                  </div>
                  <span className="text-sm font-black" style={{ color: stage.color }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Main 3-col layout ────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Col 1 & 2: Tareas Pendientes (wide) */}
          <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-[#E2E4EA] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9] bg-gradient-to-r from-[#FFF8EB] to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] flex items-center justify-center">
                  <CheckSquare className="w-4 h-4 text-[#B8860B]" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">Tareas Pendientes</h2>
                  <p className="text-[9px] text-slate-400">{pendingTasks.length} tarea{pendingTasks.length !== 1 ? "s" : ""} activa{pendingTasks.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              {pendingTasks.length > 0 && (
                <span className="min-w-[22px] h-5 px-1.5 bg-[#eab308] text-[#0F172A] text-[9px] font-black rounded-full flex items-center justify-center">{pendingTasks.length}</span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto max-h-[380px] divide-y divide-[#F1F5F9]">
              {pendingTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500">¡Todo al día! No hay tareas pendientes.</p>
                </div>
              ) : (
                pendingTasks.map(({ claimId, claimName, claimStatus, task }) => {
                  const daysAgo = getTaskDaysAgo(task.id);
                  const isUrgent = daysAgo >= 3;
                  return (
                    <div key={task.id} className={`px-5 py-3.5 hover:bg-slate-50/80 transition-colors duration-150 ${isUrgent ? "border-l-[3px] border-red-400 bg-red-50/20" : "border-l-[3px] border-transparent"}`}>
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isUrgent ? "bg-red-100" : "bg-amber-50"}`}>
                          {isUrgent ? <AlertCircle className="w-3.5 h-3.5 text-red-500" /> : <Clock className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="px-1.5 py-0.5 bg-[#0F172A] text-[#eab308] text-[8px] font-mono font-bold rounded-md">{claimName}</span>
                            {task.assignedTo && (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-bold rounded-md">{task.assignedTo}</span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-[#0F172A] leading-snug">{task.title}</p>
                          <p className={`text-[10px] font-bold mt-0.5 ${isUrgent ? "text-red-500" : "text-slate-400"}`}>
                            {daysAgo === 0 ? "Asignado hoy" : `Hace ${daysAgo} día${daysAgo > 1 ? "s" : ""}`}
                            {isUrgent && " · URGENTE"}
                          </p>
                        </div>
                        {onToggleTask && (
                          <button
                            onClick={() => onToggleTask(claimId, task.id)}
                            className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-[#eab308] hover:bg-[#ca8a04] text-[#0F172A] font-bold text-[10px] rounded-lg transition-colors shadow-sm shadow-yellow-200"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Listo</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Col 3: Próximas Inspecciones */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-[#E2E4EA] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9] bg-gradient-to-r from-blue-50/50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">Inspecciones</h2>
                  <p className="text-[9px] text-slate-400">{inspections.length} próxima{inspections.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <button onClick={() => onNavigateToView(ViewType.INSURANCE_CLAIM)} className="text-[10px] text-blue-500 hover:text-blue-700 font-bold transition-colors flex items-center gap-0.5">
                Agenda <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[380px] divide-y divide-[#F1F5F9]">
              {inspections.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 gap-2 text-center">
                  <Calendar className="w-8 h-8 text-slate-200" />
                  <p className="text-xs text-slate-400">Sin inspecciones programadas.</p>
                </div>
              ) : (
                inspections.map(insp => (
                  <div key={insp.id} className="px-4 py-3 hover:bg-slate-50/60 transition-colors cursor-pointer">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#0F172A] text-[#eab308] font-black text-[9px] flex items-center justify-center shrink-0">
                        {insp.inspectorInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-xs font-bold text-[#0F172A] truncate">{insp.clientName}</p>
                          <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-bold rounded border border-blue-100 shrink-0">{insp.type}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">{insp.address}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] font-mono font-bold text-[#0F172A]">{insp.dateTime}</span>
                          {insp.timeRemaining && (
                            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{insp.timeRemaining}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Col 4: Gestión / Inactividad */}
          <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-[#E2E4EA] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9] bg-gradient-to-r from-emerald-50/40 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">Monitoreo de Gestión</h2>
                  <p className="text-[9px] text-slate-400">Casos sin actualización reciente</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[380px] divide-y divide-[#F1F5F9]">
              {claimsWithInactivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 gap-2 text-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-200" />
                  <p className="text-xs text-slate-400">Todos los casos están actualizados.</p>
                </div>
              ) : (
                claimsWithInactivity.map(({ claim, days }) => {
                  const urgency = days >= 14 ? "critical" : days >= 7 ? "high" : days >= 3 ? "medium" : "low";
                  const urgencyConfig = {
                    critical: { badge: "bg-red-100 text-red-700", dot: "bg-red-500", ring: "border-l-[3px] border-red-400" },
                    high: { badge: "bg-orange-100 text-orange-700", dot: "bg-orange-400", ring: "border-l-[3px] border-orange-400" },
                    medium: { badge: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-400", ring: "border-l-[3px] border-yellow-400" },
                    low: { badge: "bg-slate-100 text-slate-500", dot: "bg-slate-300", ring: "border-l-[3px] border-transparent" },
                  }[urgency];

                  return (
                    <div
                      key={claim.id}
                      onClick={() => onNavigateToLead(claim.id)}
                      className={`px-4 py-2.5 hover:bg-slate-50/80 transition-colors duration-150 cursor-pointer group flex items-center gap-3 ${urgencyConfig.ring}`}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${urgencyConfig.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#0F172A] truncate group-hover:text-[#B8860B] transition-colors">{claim.name}</p>
                        <p className="text-[9px] text-slate-400 truncate">{claim.address || "Sin dirección"} · {claim.status}</p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-black px-2 py-1 rounded-lg ${urgencyConfig.badge}`}>
                        {days}d
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-5 py-3 border-t border-[#F1F5F9] bg-[#FAFBFC] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[9px] text-slate-500">≥14d</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400" /><span className="text-[9px] text-slate-500">≥7d</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400" /><span className="text-[9px] text-slate-500">≥3d</span></div>
              </div>
              <span className="text-[9px] text-slate-300 font-mono">Xapcon CRM · v2.6</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

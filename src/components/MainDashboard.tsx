import React from "react";
import { KPI, ViewType, Lead, TaskItem } from "../types";
import { 
  Users, 
  FileText, 
  HardHat, 
  DollarSign, 
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Scale,
  PlusCircle,
  CheckSquare,
  Activity,
  AlertCircle,
  Home
} from "lucide-react";

interface MainDashboardProps {
  kpis: KPI[];
  taskComposer?: React.ReactNode;
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

export default function MainDashboard({
  kpis,
  onNavigateToView,
  onNavigateToLead,
  claims = [],
  onToggleTask,
  taskComposer
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

  const getTaskDaysAgo = (task: TaskItem) => {
    const legacy = task.id.match(/^task-(\d{13})$/);
    const ts = task.createdAt ? Date.parse(task.createdAt) : legacy ? Number(legacy[1]) : NaN;
    if (!Number.isFinite(ts)) return 0;
    return Math.max(0, Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24)));
  };

  const pendingTasks = React.useMemo(() => {
    const tasksList: { claimId: string; claimName: string; claimStatus: string; task: TaskItem }[] = [];
    const seen = new Set<string>();
    claims.forEach(claim => {
      if (!claim || !claim.tasks) return;
      if (claim.status === "Finalizado" || claim.status === "Cancelado" || claim.status === "Negados") return;
      claim.tasks.forEach(t => {
        if (t.status !== "pending") return;
        const key = `${claim.id}-${t.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          tasksList.push({ claimId: claim.id, claimName: claim.name, claimStatus: claim.status, task: t });
        }
      });
    });
    return tasksList;
  }, [claims]);

  return (
    <div className="crm-workspace flex-1 overflow-y-auto bg-[#F0F2F7]" style={{ minHeight: 0 }}>
      {taskComposer}



      <div className="p-6 space-y-6">

        {/* ── KPI Cards (Contenedores con Forma Real de Casa Centrados) ─────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

          {/* Proyectos — total de casos registrados */}
          <div
            onClick={() => onNavigateToView(ViewType.PRODUCTION)}
            className="cursor-pointer group transition-transform duration-200 hover:-translate-y-1 filter drop-shadow-sm hover:drop-shadow-md"
              style={{ background: "#DCE4EA", padding: "1px", borderRadius: "16px" }}
          >
            <div
              className="w-full h-full bg-white p-4 pt-5 flex flex-col items-center justify-between text-center"
              style={{ borderRadius: "15px" }}
            >
              {/* Roof Accent Top Bar inside the peak */}
              <div className="w-10 h-1 bg-[#17314A] rounded-full mb-1 opacity-90 mx-auto" />

              <div className="flex items-center justify-center gap-1.5 w-full">
                <div className="w-5 h-5 rounded bg-[#17314A]/10 text-[#17314A] group-hover:bg-[#17314A] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                  <Home className="w-3 h-3" />
                </div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest truncate">Proyectos</span>
              </div>

              <div className="my-1">
                <span className="text-3xl font-black text-[#17314A] leading-none">{claims.length}</span>
              </div>

              <div className="pt-1.5 border-t border-slate-100 w-full text-center">
                <span className="text-[10px] text-slate-400 leading-tight block truncate">Total registrados</span>
              </div>
            </div>
          </div>

          {kpis.map((kpi, index) => {
            const BRAND_COLORS = ["#B77A4B", "#2563EB", "#17314A"];
            const accent = BRAND_COLORS[index % BRAND_COLORS.length];
            const Icon = ICON_MAP[kpi.icon] || FileText;
            return (
              <div
                key={index}
                onClick={() => {
                  if (kpi.icon === "users") onNavigateToView(ViewType.TEAM);
                  else if (kpi.icon === "dollar-sign") onNavigateToView(ViewType.FINANCIALS);
                  else onNavigateToView(ViewType.PRODUCTION);
                }}
                className="cursor-pointer group transition-transform duration-200 hover:-translate-y-1 filter drop-shadow-sm hover:drop-shadow-md"
                style={{ background: "#DCE4EA", padding: "1px", borderRadius: "16px" }}
              >
                <div
                  className="w-full h-full bg-white p-4 pt-5 flex flex-col items-center justify-between text-center"
                  style={{ borderRadius: "15px" }}
                >
                  {/* Roof Accent Top Bar inside the peak */}
                  <div className="w-12 h-1 rounded-full mb-1 opacity-90 mx-auto" style={{ background: accent }} />

                  <div className="flex items-center justify-center gap-1.5 w-full">
                    <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors" style={{ backgroundColor: `${accent}15`, color: accent }}>
                      <Icon className="w-3 h-3" />
                    </div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest truncate">{kpi.title}</span>
                  </div>

                  <div className="flex items-baseline justify-center gap-1 my-1">
                    <span className="text-3xl font-black text-[#17314A] leading-none">{kpi.value}</span>
                    {kpi.trend && (
                      <span className={`text-[9px] font-bold ${kpi.trendDirection === "up" ? "text-emerald-500" : "text-red-400"}`}>
                        {kpi.trendDirection === "up" ? "↑" : "↓"} {kpi.trend}
                      </span>
                    )}
                  </div>

                  <div className="pt-1.5 border-t border-slate-100 w-full text-center">
                    <span className="text-[10px] text-slate-400 truncate block leading-tight">{kpi.subtitle}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>




        {/* ── Main 2-col layout ────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Col 1: Tareas Pendientes */}
          <div className="lg:col-span-6 bg-white rounded-2xl shadow-sm border border-[#E2E4EA] flex flex-col overflow-hidden">
            {/* Header */}
            <div 
              className="flex items-center justify-between px-5 py-4 text-white"
              style={{ background: 'linear-gradient(100deg, #17314A 0%, #25435B 100%)' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#B77A4B]/20 border border-[#B77A4B]/30 flex items-center justify-center">
                  <CheckSquare className="w-4 h-4 text-[#B77A4B]" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-wide">Tareas Pendientes</h2>
                  <p className="text-[9px] text-slate-300">{pendingTasks.length} tarea{pendingTasks.length !== 1 ? "s" : ""} activa{pendingTasks.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              {pendingTasks.length > 0 && (
                <span className="min-w-[22px] h-5 px-1.5 bg-[#B77A4B] text-[#17314A] text-[9px] font-black rounded-full flex items-center justify-center">{pendingTasks.length}</span>
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
                pendingTasks.map(({ claimId, claimName, task }) => {
                  const daysAgo = getTaskDaysAgo(task);
                  const isUrgent = daysAgo >= 3;
                  return (
                    <div key={task.id} className={`px-5 py-3.5 hover:bg-slate-50/80 transition-colors duration-150 ${isUrgent ? "border-l-[3px] border-red-400 bg-red-50/20" : "border-l-[3px] border-transparent"}`}>
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isUrgent ? "bg-red-100" : "bg-amber-50"}`}>
                          {isUrgent ? <AlertCircle className="w-3.5 h-3.5 text-red-500" /> : <Clock className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="px-1.5 py-0.5 bg-[#17314A] text-[#B77A4B] text-[8px] font-mono font-bold rounded-md">{claimName}</span>
                            {task.assignedTo && (
                              <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-bold rounded-md">{task.assignedTo}</span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-[#17314A] leading-snug">{task.title}</p>
                          <p className={`text-[10px] font-bold mt-0.5 ${isUrgent ? "text-red-500" : "text-slate-400"}`}>
                            {daysAgo === 0 ? "Asignado hoy" : `Hace ${daysAgo} día${daysAgo > 1 ? "s" : ""}`}
                            {isUrgent && " · URGENTE"}
                          </p>
                        </div>
                        {onToggleTask && (
                          <button
                            onClick={() => onToggleTask(claimId, task.id)}
                            className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-[#B77A4B] hover:bg-[#955B32] text-[#17314A] font-bold text-[10px] rounded-lg transition-colors shadow-sm shadow-yellow-200"
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

          {/* Col 2: Gestión / Inactividad */}
          <div className="lg:col-span-6 bg-white rounded-2xl shadow-sm border border-[#E2E4EA] flex flex-col overflow-hidden">
            <div 
              className="flex items-center justify-between px-5 py-4 text-white"
              style={{ background: 'linear-gradient(100deg, #17314A 0%, #25435B 100%)' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-400/20 border border-emerald-400/30 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-wide">Monitoreo de Gestión</h2>
                  <p className="text-[9px] text-slate-300">Casos sin actualización reciente</p>
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
                        <p className="text-xs font-semibold text-[#17314A] truncate group-hover:text-[#B8860B] transition-colors">{claim.name}</p>
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

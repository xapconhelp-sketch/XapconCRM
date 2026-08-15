import React from "react";
import { KPI, CriticalAlert, ViewType, Lead, TaskItem } from "../types";
import { 
  Users, 
  FileText, 
  HardHat, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  Clock,
  CheckCircle2,
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
  AlertCircle,
  Home
} from "lucide-react";

interface MainDashboardProps {
  kpis: KPI[];
  alerts: CriticalAlert[];
  onResolveAlert: (alert: CriticalAlert) => void;
  onNavigateToView: (view: ViewType) => void;
  onNavigateToLead: (leadId: string) => void;
  claims: Lead[];
  onToggleTask?: (leadId: string, taskId: string) => void;
  userRole?: string;
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
  onResolveAlert,
  onNavigateToView,
  onNavigateToLead,
  claims = [],
  onToggleTask,
  userRole
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



      <div className="p-6 space-y-6">

        {/* ── KPI Cards (Contenedores con Forma Real de Casa Centrados) ─────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">

          {/* Proyectos — total de casos registrados */}
          <div
            onClick={() => onNavigateToView(ViewType.PRODUCTION)}
            className="cursor-pointer group transition-transform duration-200 hover:-translate-y-1 filter drop-shadow-sm hover:drop-shadow-md"
            style={{
              clipPath: "polygon(50% 0%, 100% 18px, 100% 100%, 0% 100%, 0% 18px)",
              background: "#0F172A",
              padding: "1.5px",
            }}
          >
            <div
              className="w-full h-full bg-white p-4 pt-5 flex flex-col items-center justify-between text-center"
              style={{ clipPath: "polygon(50% 0%, 100% 17px, 100% 100%, 0% 100%, 0% 17px)" }}
            >
              {/* Roof Accent Top Bar inside the peak */}
              <div className="w-12 h-1 bg-[#0F172A] rounded-full mb-1 opacity-90 mx-auto" />

              <div className="flex items-center justify-center gap-1.5 w-full">
                <div className="w-5 h-5 rounded bg-[#0F172A]/10 text-[#0F172A] group-hover:bg-[#0F172A] group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                  <Home className="w-3 h-3" />
                </div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest truncate">Proyectos</span>
              </div>

              <div className="my-1">
                <span className="text-3xl font-black text-[#0F172A] leading-none">{claims.length}</span>
              </div>

              <div className="pt-1.5 border-t border-slate-100 w-full text-center">
                <span className="text-[10px] text-slate-400 leading-tight block truncate">Total registrados</span>
              </div>
            </div>
          </div>

          {kpis.map((kpi, index) => {
            const BRAND_COLORS = ["#EAB308", "#2563EB", "#0F172A"];
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
                style={{
                  clipPath: "polygon(50% 0%, 100% 18px, 100% 100%, 0% 100%, 0% 18px)",
                  background: accent,
                  padding: "1.5px",
                }}
              >
                <div
                  className="w-full h-full bg-white p-4 pt-5 flex flex-col items-center justify-between text-center"
                  style={{ clipPath: "polygon(50% 0%, 100% 17px, 100% 100%, 0% 100%, 0% 17px)" }}
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
                    <span className="text-3xl font-black text-[#0F172A] leading-none">{kpi.value}</span>
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
              style={{ background: 'linear-gradient(90deg, #0F172A 0%, #1e293b 50%, #0F172A 100%)' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#eab308]/20 border border-[#eab308]/30 flex items-center justify-center">
                  <CheckSquare className="w-4 h-4 text-[#eab308]" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-white uppercase tracking-wide">Tareas Pendientes</h2>
                  <p className="text-[9px] text-slate-300">{pendingTasks.length} tarea{pendingTasks.length !== 1 ? "s" : ""} activa{pendingTasks.length !== 1 ? "s" : ""}</p>
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

          {/* Col 2: Gestión / Inactividad */}
          <div className="lg:col-span-6 bg-white rounded-2xl shadow-sm border border-[#E2E4EA] flex flex-col overflow-hidden">
            <div 
              className="flex items-center justify-between px-5 py-4 text-white"
              style={{ background: 'linear-gradient(90deg, #0F172A 0%, #1e293b 50%, #0F172A 100%)' }}
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

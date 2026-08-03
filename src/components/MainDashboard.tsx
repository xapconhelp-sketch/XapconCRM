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
  CheckSquare
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
  // Helper to parse date from timeline event or creation date
  const parseEventDate = (ev: any) => {
    if (ev.date) {
      const parsed = Date.parse(ev.date);
      if (!isNaN(parsed)) return parsed;
    }
    if (ev.timestamp) {
      const parsed = Date.parse(ev.timestamp);
      if (!isNaN(parsed)) return parsed;
      
      const cleaned = ev.timestamp.replace(" a las ", " ");
      const match = cleaned.match(/(\d{1,2})[\/\-](\d{2})[\/\-](\d{4})\s+(\d{1,2}):(\d{2})/);
      if (match) {
        const [_, day, month, year, hour, minute] = match;
        return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).getTime();
      }
    }
    if (ev.id && ev.id.startsWith("timeline-")) {
      const parts = ev.id.split("-");
      if (parts.length > 1) {
        const ts = Number(parts[1]);
        if (!isNaN(ts)) return ts;
      }
    }
    return 0;
  };

  const getInactivityDays = (claim: Lead) => {
    let latestTime = claim.created_at ? new Date(claim.created_at).getTime() : new Date().getTime();
    if (isNaN(latestTime)) {
      latestTime = new Date().getTime();
    }
    
    if (claim.timeline && claim.timeline.length > 0) {
      claim.timeline.forEach(ev => {
        const evTime = parseEventDate(ev);
        if (evTime > latestTime) {
          latestTime = evTime;
        }
      });
    }
    
    const diffMs = Date.now() - latestTime;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const claimsWithInactivity = claims
    .filter(c => c.status !== "Finalizado" && c.status !== "Cancelado" && c.status !== "Negados")
    .map(c => ({
      claim: c,
      days: getInactivityDays(c)
    })).sort((a, b) => b.days - a.days);

  const pipelineStatuses = [
    "Negados",
    "Inspección",
    "En disputa",
    "Esperando Scope",
    "Aprobado y Suplementado",
    "Construcción",
    "Esperando Depreciación",
    "Finalizado",
    "Cancelado"
  ];

  const getStageCount = (statusId: string) => {
    return claims.filter((c) => {
      if (statusId === "Inspección" && !pipelineStatuses.includes(c.status)) {
        return true;
      }
      return c.status === statusId;
    }).length;
  };

  const getTaskDaysAgo = (taskId: string) => {
    const parts = taskId.split("-");
    const ts = parseInt(parts[1]);
    if (isNaN(ts)) return 0;
    const diffMs = Date.now() - ts;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  const pendingTasks = React.useMemo(() => {
    const tasksList: { claimId: string; claimName: string; task: TaskItem }[] = [];
    const seen = new Set<string>();
    
    claims.forEach(claim => {
      if (!claim || !claim.tasks) return;
      if (claim.status === "Finalizado" || claim.status === "Cancelado" || claim.status === "Negados") return;
      claim.tasks.forEach(t => {
        if (t.status !== "pending") return;
        // Strict deduplication by case name and task title
        const normalizedTitle = t.title ? t.title.trim().toLowerCase() : "";
        const key = `${claim.name}-${normalizedTitle}`;
        if (!seen.has(key)) {
          seen.add(key);
          tasksList.push({
            claimId: claim.id,
            claimName: claim.name,
            task: t
          });
        }
      });
    });
    return tasksList;
  }, [claims]);

  return (
    <div className="flex-1 p-6 space-y-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E2E4EA] pb-5">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)' }} className="text-[24px] font-bold text-[#0F172A] tracking-tight">Xapcon CRM Dashboard</h1>
          <p className="text-xs text-[#64748B] mt-1">Panel general de operaciones comerciales, reclamos y producción activa.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-[#E2E4EA] rounded-lg text-xs text-[#64748B] font-mono">
          <Clock className="w-3.5 h-3.5 text-[#B8860B]" />
          <span>{new Date().toISOString().replace('T', ' ').substring(0, 16)} UTC</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, index) => {
          const Icon = {
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
          }[kpi.icon] || FileText;

          return (
            <div
              key={index}
              onClick={() => {
                if (kpi.icon === "users") onNavigateToView(ViewType.TEAM);
                else if (kpi.icon === "dollar-sign") onNavigateToView(ViewType.FINANCIALS);
                else onNavigateToView(ViewType.PRODUCTION);
              }}
              className="kpi-card p-4 cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide truncate mr-2" title={kpi.title}>{kpi.title}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#FEF3C7]">
                  <Icon className="w-4 h-4 text-[#B8860B]" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span style={{ fontFamily: 'var(--font-display)' }} className="text-2xl font-bold text-[#0F172A] tracking-tight">{kpi.value}</span>
                {kpi.trend && (
                  <span className={`flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    kpi.trendDirection === "up"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-600"
                  }`}>
                    {kpi.trendDirection === "up" ? (
                      <ArrowUpRight className="w-2.5 h-2.5 mr-0.5 shrink-0" />
                    ) : (
                      <ArrowDownRight className="w-2.5 h-2.5 mr-0.5 shrink-0" />
                    )}
                    {kpi.trend}
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500 leading-tight truncate">{kpi.subtitle}</div>
              {kpi.progress !== undefined && (
                <div className="mt-3">
                  <div className="w-full bg-[#E2E4EA] rounded-full h-0.5 overflow-hidden">
                    <div className="bg-[#B8860B] h-full" style={{ width: `${kpi.progress}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>



      {/* Main Content Layout - 3 Symmetrical Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Column 1: Tareas Pendientes */}
        <div className="space-y-6">
          <div className="bg-white border border-[#E2E4EA] rounded-2xl p-5 shadow-sm h-full flex flex-col">
            <div className="panel-section-label" style={{ color: '#B8860B' }}>
              <CheckSquare className="w-3.5 h-3.5" />
              <h2>Tareas Pendientes</h2>
            </div>
            
            <div className="flex-1 space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {pendingTasks.length === 0 ? (
                <div className="flex items-center justify-center p-6 bg-yellow-50/50 rounded-xl text-[#854d0e] text-xs font-semibold gap-2 border border-yellow-200 font-sans">
                  <CheckCircle2 className="w-4 h-4 text-yellow-600" />
                  <span>No hay tareas pendientes en los expedientes.</span>
                </div>
              ) : (
                pendingTasks.map(({ claimId, claimName, task }) => {
                  const daysAgo = getTaskDaysAgo(task.id);
                  return (
                    <div 
                      key={task.id} 
                      className="flex flex-col p-4 bg-white hover:bg-slate-50/50 border-b border-[#E2E4EA]/60 last:border-0 rounded-none gap-2 transition-colors duration-200 relative"
                    >
                      <div className="space-y-1 text-left flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-1.5 py-0.5 bg-[#131b2e] text-[#eab308] text-[8px] font-mono font-bold rounded">
                            Caso: {claimName}
                          </span>
                          {task.assignedTo && (
                            <span className="px-1.5 py-0.5 bg-[#ca8a04]/10 text-[#ca8a04] text-[8px] font-bold rounded font-sans">
                              Para: {task.assignedTo}
                            </span>
                          )}
                        </div>
                        <h4 className="font-sans text-xs font-bold text-[#131b2e] break-words">{task.title}</h4>
                        <span className={`text-[10px] block font-mono font-bold ${daysAgo >= 3 ? "text-red-600 animate-pulse font-extrabold" : "text-[#7c839b]"}`}>
                          {daysAgo === 0 ? "Asignado hoy" : `Asignado hace ${daysAgo} ${daysAgo === 1 ? "día" : "días"}`}
                        </span>
                      </div>
                      
                      {onToggleTask && (
                        <button 
                          onClick={() => onToggleTask(claimId, task.id)}
                          className="btn-responsive btn-gold-3d w-full py-1.5 bg-[#eab308] hover:bg-[#ca8a04] text-slate-900 font-bold text-[10px] rounded-lg shrink-0 flex items-center justify-center gap-1 font-sans mt-1"
                          title="Marcar como completada"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Completar</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Próximas Inspecciones en Sitio */}
        <div className="space-y-6">
          <div className="bg-white border border-[#E2E4EA] rounded-2xl p-5 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="panel-section-label mb-0" style={{ color: '#3B82F6' }}>
                <Calendar className="w-3.5 h-3.5" />
                <h2>Próximas Inspecciones</h2>
              </div>
              <button
                onClick={() => onNavigateToView(ViewType.INSURANCE_CLAIM)}
                className="text-[10px] text-[#3B82F6] hover:text-[#2563EB] font-semibold transition-colors"
              >
                Ver agenda →
              </button>
            </div>

            <div className="flex-1 divide-y divide-[#c6c6cd]/20 max-h-[420px] overflow-y-auto pr-1">
              {inspections.map((insp) => (
                <div key={insp.id} className="py-3 flex flex-col gap-2 hover:bg-[#f7f9fb]/40 px-1.5 rounded-lg transition-colors border border-transparent">
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-100 text-[#131b2e] font-bold text-[9px] flex items-center justify-center shrink-0 border border-[#c6c6cd]/20">
                      {insp.inspectorInitials}
                    </div>
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1">
                        <h4 className="font-sans text-xs font-bold text-[#131b2e] truncate">{insp.clientName}</h4>
                        <span className="px-1 py-0.2 bg-slate-100 text-[#45464d] text-[8px] rounded font-medium border border-[#c6c6cd]/30">{insp.type}</span>
                      </div>
                      <p className="font-sans text-[10px] text-[#7c839b] truncate">{insp.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] border-t border-[#eceef0] pt-1">
                    <span className="font-mono font-semibold text-[#131b2e]">{insp.dateTime}</span>
                    {insp.timeRemaining && (
                      <span className="font-bold text-amber-600 font-mono">{insp.timeRemaining}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: Gestión Actualizada */}
        <div className="space-y-6">
          <div className="bg-white border border-[#E2E4EA] rounded-2xl p-5 shadow-sm h-full flex flex-col">
            <div className="panel-section-label" style={{ color: '#10B981' }}>
              <BellRing className="w-3.5 h-3.5" />
              <h2>Gestión Actualizada</h2>
            </div>
            
            <div className="flex-1 space-y-1 max-h-[420px] overflow-y-auto pr-1">
              {claimsWithInactivity.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No hay casos activos registrados.</p>
              ) : (
                claimsWithInactivity.map(({ claim, days }) => (
                  <div
                    key={claim.id}
                    onClick={() => onNavigateToLead(claim.id)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-transparent hover:border-[#E2E4EA] hover:bg-[#F8F9FB] transition-all duration-150 cursor-pointer group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#0F172A] truncate group-hover:text-[#B8860B] transition-colors">{claim.name}</p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{claim.address || 'Sin dirección'}</p>
                    </div>
                    <div className={`min-w-[28px] h-7 px-2 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ml-3 ${
                      days > 3
                        ? "bg-red-100 text-red-600"
                        : "bg-slate-100 text-slate-500"
                    }`} title={`Inactivo hace ${days} días`}>
                      {days}d
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-[#E2E4EA] text-center">
              <p className="text-[10px] text-[#CBD5E1] font-mono tracking-wide">Xapcon CRM · v2.6</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

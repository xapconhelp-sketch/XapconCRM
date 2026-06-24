import React from "react";
import { KPI, CriticalAlert, InspectionAppointment, ViewType } from "../types";
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
  BellRing
} from "lucide-react";

interface MainDashboardProps {
  kpis: KPI[];
  alerts: CriticalAlert[];
  inspections: InspectionAppointment[];
  onResolveAlert: (alert: CriticalAlert) => void;
  onNavigateToView: (view: ViewType) => void;
  onNavigateToLead: (leadId: string) => void;
}

export default function MainDashboard({
  kpis,
  alerts,
  inspections,
  onResolveAlert,
  onNavigateToView,
  onNavigateToLead
}: MainDashboardProps) {
  // Activity feed mock
  const activities = [
    { id: "a1", text: "Sarah C. subió fotos de daños de la tormenta para James Robertson", time: "Hace 15 min", author: "Sarah C." },
    { id: "a2", text: "El sistema aprobó automáticamente el estimado de State Farm EST-2409-A", time: "Hace 2 hrs", author: "System" },
    { id: "a3", text: "Mike L. actualizó estado de materiales a 'Ordenados' para Chen Commercial", time: "Hace 4 hrs", author: "Mike L." },
    { id: "a4", text: "El cliente Martínez firmó contrato digital para reemplazo de tejas", time: "Ayer, 05:22 PM", author: "Cliente" }
  ];

  return (
    <div className="flex-1 p-6 space-y-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#c6c6cd]/30 pb-4">
        <div>
          <h1 className="font-sans text-[26px] font-bold text-[#131b2e] tracking-tight">Xapcon CRM V2 Dashboard</h1>
          <p className="font-sans text-xs text-[#7c839b] mt-1 font-medium">Panel general de operaciones comerciales, reclamos y producción activa.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-[#c6c6cd]/40 rounded-xl shadow-sm text-xs text-[#45464d] font-mono font-medium">
          <Clock className="w-4 h-4 text-[#006c49]" />
          <span>UTC: {new Date().toISOString().replace('T', ' ').substring(0, 16)}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => {
          const Icon = {
            "users": Users,
            "file-text": FileText,
            "hard-hat": HardHat,
            "dollar-sign": DollarSign
          }[kpi.icon] || FileText;

          return (
            <div 
              key={index}
              onClick={() => {
                if (kpi.icon === "users") onNavigateToView(ViewType.LEADS);
                if (kpi.icon === "file-text") onNavigateToView(ViewType.CLAIMS);
                if (kpi.icon === "hard-hat") onNavigateToView(ViewType.PRODUCTION);
                if (kpi.icon === "dollar-sign") onNavigateToView(ViewType.FINANCIALS);
              }}
              className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="font-sans text-xs font-semibold text-[#7c839b] tracking-tight">{kpi.title}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 text-[#006c49] group-hover:bg-[#6cf8bb]/20 group-hover:text-[#002113] transition-colors`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-sans text-2xl font-bold text-[#131b2e] tracking-tight">{kpi.value}</span>
                {kpi.trend && (
                  <span className={`flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    kpi.trendDirection === "up" 
                      ? "bg-emerald-50 text-emerald-700" 
                      : "bg-red-50 text-red-700"
                  }`}>
                    {kpi.trendDirection === "up" ? (
                      <ArrowUpRight className="w-3 h-3 mr-0.5 shrink-0" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 mr-0.5 shrink-0" />
                    )}
                    {kpi.trend}
                  </span>
                )}
              </div>
              <div className="mt-1 text-[11px] text-[#7c839b] font-medium leading-tight">{kpi.subtitle}</div>
              
              {kpi.progress !== undefined && (
                <div className="mt-4">
                  <div className="w-full bg-[#eceef0] rounded-full h-1 overflow-hidden">
                    <div className="bg-[#006c49] h-full" style={{ width: `${kpi.progress}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column: Alerts and Inspections */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Critical Alerts */}
          <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-red-700 font-bold text-sm border-b border-gray-100 pb-2">
              <AlertTriangle className="w-5 h-5 text-red-500 animate-bounce" />
              <h2>Alertas Críticas</h2>
            </div>
            
            <div className="space-y-4">
              {alerts.length === 0 ? (
                <div className="flex items-center justify-center p-6 bg-emerald-50/50 rounded-xl text-emerald-800 text-xs font-semibold gap-2 border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>No hay alertas operativas críticas pendientes.</span>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-red-50/40 hover:bg-red-50/70 border border-red-100 rounded-xl gap-3 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <h4 className="font-sans text-xs font-bold text-[#131b2e]">{alert.title}</h4>
                      <p className="font-sans text-[11px] text-[#7c839b]">{alert.description}</p>
                    </div>
                    <button 
                      onClick={() => onResolveAlert(alert)}
                      className="px-3 py-1.5 bg-[#006c49] hover:bg-[#005236] text-white text-[11px] font-bold rounded-lg shrink-0 transition-colors shadow-sm"
                    >
                      {alert.buttonText}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Inspections */}
          <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#131b2e]">
                <Calendar className="w-5 h-5 text-[#006c49]" />
                <h2>Próximas Inspecciones en Sitio</h2>
              </div>
              <button 
                onClick={() => onNavigateToView(ViewType.LEADS)}
                className="text-xs text-[#006c49] font-semibold hover:underline"
              >
                Ver Agenda
              </button>
            </div>

            <div className="divide-y divide-[#c6c6cd]/20">
              {inspections.map((insp) => (
                <div key={insp.id} className="py-3 flex items-center justify-between gap-4 hover:bg-[#f7f9fb]/40 px-1 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-[#131b2e] font-bold text-[10px] flex items-center justify-center shrink-0 border border-[#c6c6cd]/20">
                      {insp.inspectorInitials}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-sans text-xs font-bold text-[#131b2e]">{insp.clientName}</h4>
                        <span className="px-1.5 py-0.5 bg-slate-100 text-[#45464d] text-[9px] rounded font-medium border border-[#c6c6cd]/30">{insp.type}</span>
                      </div>
                      <p className="font-sans text-[11px] text-[#7c839b] leading-none">{insp.address}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs font-semibold text-[#131b2e] block">{insp.dateTime}</span>
                    {insp.timeRemaining && (
                      <span className="text-[10px] font-bold text-amber-600 font-mono block">{insp.timeRemaining}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right column: Recent Activity Feed */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-sm font-bold text-[#131b2e] border-b border-gray-100 pb-2">
              <BellRing className="w-5 h-5 text-[#006c49]" />
              <h2>Actividad Reciente</h2>
            </div>
            
            <div className="flex-1 space-y-4">
              {activities.map((act) => (
                <div key={act.id} className="relative pl-5 pb-1 border-l border-[#c6c6cd]/30 last:border-l-0">
                  <div className="absolute left-0 top-1.5 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#6cf8bb] border-2 border-white shadow-sm"></div>
                  <p className="font-sans text-xs text-[#45464d] leading-relaxed">{act.text}</p>
                  <span className="font-mono text-[9px] text-[#7c839b] font-medium block mt-1">{act.time}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-[#eceef0] text-center">
              <p className="text-[11px] text-[#7c839b] font-medium font-sans">© Xapcon Enterprise CRM System v2.6</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

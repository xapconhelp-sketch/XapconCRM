import React, { useState } from "react";
import { TeamMember } from "../types";
import { 
  Users2, 
  Search, 
  MapPin, 
  CheckCircle2, 
  Mail, 
  Phone,
  Filter,
  UserCheck
} from "lucide-react";

interface TeamViewProps {
  members: TeamMember[];
}

export default function TeamView({ members }: TeamViewProps) {
  const [filterRole, setFilterRole] = useState<"all" | "sales" | "pm" | "install">("all");

  const filteredMembers = filterRole === "all" 
    ? members 
    : members.filter((m) => m.roleCategory === filterRole);

  const filters = [
    { id: "all", label: "Todo el Personal" },
    { id: "sales", label: "Asesores de Venta" },
    { id: "pm", label: "Project Managers" },
    { id: "install", label: "Equipos de Instalación" }
  ];

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#c6c6cd]/30 pb-4">
        <div>
          <h1 className="font-sans text-[26px] font-bold text-[#131b2e] tracking-tight">Personal & Cuadrillas</h1>
          <p className="font-sans text-xs text-[#7c839b] mt-1 font-medium">Directorio interno de asesores de ventas comerciales, directores de obra y equipos de instalación activa.</p>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 select-none">
        <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-4 shadow-sm text-center">
          <span className="text-[10px] font-mono text-[#7c839b] uppercase block font-semibold">Instaladores Activos</span>
          <span className="text-2xl font-bold text-[#131b2e] block mt-1">42 Operarios</span>
          <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">● 100% Capacitados OSHA</span>
        </div>
        <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-4 shadow-sm text-center">
          <span className="text-[10px] font-mono text-[#7c839b] uppercase block font-semibold">Tasa de Cierre Comercial</span>
          <span className="text-2xl font-bold text-[#131b2e] block mt-1">68% Promedio</span>
          <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">+2.4% vs Trimestre anterior</span>
        </div>
        <div className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-4 shadow-sm text-center">
          <span className="text-[10px] font-mono text-[#7c839b] uppercase block font-semibold">Entregas a Tiempo</span>
          <span className="text-2xl font-bold text-[#131b2e] block mt-1">94% Global</span>
          <span className="text-[10px] text-teal-600 font-bold block mt-0.5">En 12 sitios de construcción</span>
        </div>
      </div>

      {/* Filter and Content Grid */}
      <div className="space-y-4">
        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#eceef0] pb-3 select-none">
          <span className="text-xs font-bold text-[#45464d] mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filtrar por Rol:
          </span>
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterRole(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterRole === f.id
                  ? "bg-[#6cf8bb] text-[#002113] shadow-sm font-bold"
                  : "bg-white border border-[#c6c6cd]/50 text-[#45464d] hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 select-none">
          {filteredMembers.map((m) => (
            <div 
              key={m.id} 
              className="bg-white border border-[#c6c6cd]/30 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img 
                    src={m.avatar} 
                    alt={m.name} 
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full border border-[#c6c6cd]/30 bg-gray-50 object-cover shrink-0"
                  />
                  <div>
                    <h3 className="font-sans text-sm font-bold text-[#131b2e] leading-tight">{m.name}</h3>
                    <p className="font-sans text-xs text-[#7c839b] font-medium mt-0.5">{m.role}</p>
                  </div>
                </div>
                
                <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                  m.status === "Available" 
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                    : m.status === "Offline"
                    ? "bg-gray-100 text-gray-500 border border-gray-200"
                    : "bg-amber-50 text-amber-700 border border-amber-100"
                }`}>
                  {m.status === "Available" ? "Disponible" : m.status === "Offline" ? "Desconectado" : "En Sitio (Ocupado)"}
                </span>
              </div>

              {/* Statistics details */}
              <div className="bg-[#f7f9fb] border border-[#eceef0] rounded-xl p-3 text-xs grid grid-cols-2 gap-3">
                {m.roleCategory === "sales" && (
                  <>
                    <div>
                      <span className="text-[#7c839b] font-medium block text-[10px]">Leads Asignados</span>
                      <span className="font-sans font-bold text-[#131b2e]">{m.activeLeads} prospectos</span>
                    </div>
                    <div>
                      <span className="text-[#7c839b] font-medium block text-[10px]">Cierre de Ventas</span>
                      <span className="font-sans font-bold text-emerald-600">{m.closeRate}%</span>
                    </div>
                  </>
                )}

                {m.roleCategory === "pm" && (
                  <>
                    <div>
                      <span className="text-[#7c839b] font-medium block text-[10px]">Proyectos en Curso</span>
                      <span className="font-sans font-bold text-[#131b2e]">{m.activeProjects} obras</span>
                    </div>
                    <div>
                      <span className="text-[#7c839b] font-medium block text-[10px]">Sitios Inspeccionados</span>
                      <span className="font-sans font-bold text-[#131b2e]">{m.sitesInspected} esta semana</span>
                    </div>
                  </>
                )}

                {m.roleCategory === "install" && (
                  <>
                    <div>
                      <span className="text-[#7c839b] font-medium block text-[10px]">Tamaño Cuadrilla</span>
                      <span className="font-sans font-bold text-[#131b2e]">{m.crewMembersCount} operarios</span>
                    </div>
                    <div>
                      <span className="text-[#7c839b] font-medium block text-[10px]">Entrega a Tiempo</span>
                      <span className="font-sans font-bold text-[#006c49]">{m.onTimeRate}%</span>
                    </div>
                  </>
                )}
              </div>

              {/* Contact button actions */}
              <div className="flex gap-2 pt-1 border-t border-[#eceef0]">
                <button className="flex-1 py-1.5 bg-[#131b2e] hover:bg-[#252f46] text-[#6cf8bb] text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Enviar Correo</span>
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

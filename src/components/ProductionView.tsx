import React, { useState } from "react";
import { Lead } from "../types";
import { 
  ArrowRight, 
  ArrowLeft,
  AlertTriangle,
  FileCheck2
} from "lucide-react";

interface ProductionViewProps {
  claims: Lead[];
  onMoveProject: (projectId: string, direction: "next" | "prev") => void;
}

export default function ProductionView({
  claims,
  onMoveProject
}: ProductionViewProps) {
  const columns = [
    { id: "Negados", title: "Negados", countColor: "bg-red-700" },
    { id: "Inspección", title: "Inspección", countColor: "bg-blue-500" },
    { id: "En disputa", title: "En disputa", countColor: "bg-rose-500" },
    { id: "Esperando Scope", title: "Esperando Scope", countColor: "bg-purple-500" },
    { id: "Aprobado y Suplementado", title: "Aprobado y Suplementado", countColor: "bg-indigo-500" },
    { id: "Construcción", title: "Construcción", countColor: "bg-amber-500" },
    { id: "Esperando Depreciación", title: "Esperando Depreciación", countColor: "bg-orange-500" },
    { id: "Finalizado", title: "Finalizado", countColor: "bg-[#eab308]" },
    { id: "Cancelado", title: "Cancelado", countColor: "bg-red-500" }
  ];

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#c6c6cd]/30 pb-4">
        <div>
          <h1 className="font-sans text-[26px] font-bold text-[#131b2e] tracking-tight">Tubería de Producción</h1>
          <p className="font-sans text-xs text-[#7c839b] mt-1 font-medium">Control visual de proyectos activos, entrega de materiales y listas de verificación de control de calidad.</p>
        </div>
      </div>

      {/* Kanban Grid */}
      <div className="flex gap-6 overflow-x-auto pb-4 select-none snap-x">
        {columns.map((col, index) => {
          const colProjects = claims.filter((c) => {
            const knownStatuses = columns.map(col => col.id);
            if (col.id === "Inspección" && !knownStatuses.includes(c.status)) {
              return true;
            }
            return c.status === col.id;
          });
          return (
            <div key={col.id} className="min-w-[280px] md:min-w-[320px] max-w-[320px] bg-[#eceef0] border border-[#c6c6cd]/30 rounded-2xl p-4 flex flex-col space-y-4 h-[calc(100vh-14rem)] overflow-hidden shadow-inner snap-center">
              
              {/* Column Header */}
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="font-sans text-[11px] font-bold text-[#131b2e] truncate max-w-[85%]">{col.title}</h2>
                <span className={`w-5 h-5 rounded-full ${col.countColor} text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0`}>
                  {colProjects.length}
                </span>
              </div>

              {/* Cards list container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {colProjects.length === 0 ? (
                  <div className="h-24 border border-dashed border-[#c6c6cd] rounded-xl flex items-center justify-center text-center p-4">
                    <span className="text-[10px] text-[#7c839b] font-medium">No hay proyectos en esta etapa.</span>
                  </div>
                ) : (
                  colProjects.map((c) => (
                    <div 
                      key={c.id}
                      className="bg-white border border-[#c6c6cd]/30 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 bg-[#131b2e] text-[#eab308] text-[8px] font-mono font-bold rounded flex-shrink-0">Claim: {c.claimNumber}</span>
                          <span className="text-[9px] text-[#7c839b] font-bold truncate max-w-[120px]">{c.insuranceProvider}</span>
                        </div>
                        <h3 className="font-sans text-xs font-bold text-[#131b2e] leading-tight pt-1">{c.name}</h3>
                        <p className="font-sans text-[10px] text-[#7c839b] truncate">{c.address}</p>
                      </div>

                      {c.tasks && c.tasks.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <FileCheck2 className="w-3.5 h-3.5 text-[#ca8a04]" />
                          <span className="text-[9px] text-[#7c839b] font-bold">Tareas: {c.tasks.filter(t => t.status === "completed").length}/{c.tasks.length}</span>
                        </div>
                      )}

                      {/* Moving Controls */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#eceef0] gap-2 mt-1">
                        <button
                          onClick={() => onMoveProject(c.id, "prev")}
                          disabled={index === 0}
                          className="px-2 py-1 border border-[#c6c6cd] text-[#45464d] text-[10px] rounded hover:bg-slate-100 disabled:opacity-40"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onMoveProject(c.id, "next")}
                          disabled={index === columns.length - 1}
                          className="flex-1 py-1 bg-[#131b2e] hover:bg-[#252f46] text-[#eab308] text-[10px] font-bold rounded flex items-center justify-center gap-1 active:scale-[0.98] transition-all disabled:opacity-40"
                        >
                          <span>Avanzar</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#eab308]" />
                        </button>
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}

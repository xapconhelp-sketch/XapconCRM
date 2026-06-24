import React, { useState } from "react";
import { KanbanProject } from "../types";
import { 
  HardHat, 
  ArrowRight, 
  ArrowLeft, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Play,
  ClipboardList
} from "lucide-react";

interface ProductionViewProps {
  projects: KanbanProject[];
  onMoveProject: (projectId: string, direction: "next" | "prev") => void;
  onStartQA: (project: KanbanProject) => void;
}

export default function ProductionView({
  projects,
  onMoveProject,
  onStartQA
}: ProductionViewProps) {
  const [qaProject, setQAProject] = useState<KanbanProject | null>(null);
  const [checklist, setChecklist] = useState({
    underlaymentSecure: false,
    flashingInspected: false,
    dripEdgeInstalled: false,
    siteCleaned: false
  });

  const columns: { id: KanbanProject["status"]; title: string; countColor: string }[] = [
    { id: "scheduled", title: "Programados / Scheduled", countColor: "bg-blue-500" },
    { id: "ordered", title: "Material Ordenado / Ordered", countColor: "bg-purple-500" },
    { id: "in_progress", title: "En Progreso / In Progress", countColor: "bg-amber-500" },
    { id: "qa", title: "Inspección de Calidad / QA", countColor: "bg-emerald-500" }
  ];

  const handleStartChecklist = (project: KanbanProject) => {
    setQAProject(project);
    setChecklist({
      underlaymentSecure: false,
      flashingInspected: false,
      dripEdgeInstalled: false,
      siteCleaned: false
    });
  };

  const handleToggleCheck = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allChecked = Object.values(checklist).every(v => v);

  return (
    <div className="flex-1 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#c6c6cd]/30 pb-4">
        <div>
          <h1 className="font-sans text-[26px] font-bold text-[#131b2e] tracking-tight">Tubería de Producción</h1>
          <p className="font-sans text-xs text-[#7c839b] mt-1 font-medium">Control visual de proyectos activos, entrega de materiales y listas de verificación de control de calidad.</p>
        </div>
      </div>

      {qaProject && (
        <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-md space-y-4 max-w-xl">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs border-b pb-2">
            <ClipboardList className="w-5 h-5 text-emerald-600 animate-pulse" />
            <span>Lista de Verificación QA: {qaProject.title} ({qaProject.projectCode})</span>
          </div>

          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
              <input 
                type="checkbox" 
                checked={checklist.underlaymentSecure} 
                onChange={() => handleToggleCheck("underlaymentSecure")}
                className="rounded text-emerald-600 focus:ring-emerald-600"
              />
              <span className="font-semibold text-[#191c1e]">Membrana impermeabilizante y subcapa asegurada sin arrugas</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
              <input 
                type="checkbox" 
                checked={checklist.flashingInspected} 
                onChange={() => handleToggleCheck("flashingInspected")}
                className="rounded text-emerald-600 focus:ring-emerald-600"
              />
              <span className="font-semibold text-[#191c1e]">Intermitentes de chimenea y valles (flashing) sellados herméticamente</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
              <input 
                type="checkbox" 
                checked={checklist.dripEdgeInstalled} 
                onChange={() => handleToggleCheck("dripEdgeInstalled")}
                className="rounded text-emerald-600 focus:ring-emerald-600"
              />
              <span className="font-semibold text-[#191c1e]">Goteros perimetrales (drip edge) instalados con traslapes correctos</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
              <input 
                type="checkbox" 
                checked={checklist.siteCleaned} 
                onChange={() => handleToggleCheck("siteCleaned")}
                className="rounded text-emerald-600 focus:ring-emerald-600"
              />
              <span className="font-semibold text-[#191c1e]">Predio limpio magnéticamente libre de clavos y residuos de tejas</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button 
              onClick={() => setQAProject(null)}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg"
            >
              Cerrar
            </button>
            <button 
              onClick={() => {
                onStartQA(qaProject);
                setQAProject(null);
              }}
              disabled={!allChecked}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
            >
              Completar y Aprobar Proyecto
            </button>
          </div>
        </div>
      )}

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 select-none">
        {columns.map((col) => {
          const colProjects = projects.filter((p) => p.status === col.id);
          return (
            <div key={col.id} className="bg-[#eceef0] border border-[#c6c6cd]/30 rounded-2xl p-4 flex flex-col space-y-4 h-[600px] overflow-hidden shadow-inner">
              
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
                  colProjects.map((p) => (
                    <div 
                      key={p.id}
                      className="bg-white border border-[#c6c6cd]/30 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 bg-[#131b2e] text-[#6cf8bb] text-[8px] font-mono font-bold rounded">{p.projectCode}</span>
                          <span className="text-[10px] text-[#7c839b] font-medium truncate max-w-[120px]">{p.durationEstimate}</span>
                        </div>
                        <h3 className="font-sans text-xs font-bold text-[#131b2e] leading-tight pt-1">{p.title}</h3>
                        <p className="font-sans text-[10px] text-[#7c839b]">{p.address}</p>
                      </div>

                      {p.progress !== undefined && (
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[9px] font-bold text-[#45464d]">
                            <span>Progreso</span>
                            <span>{p.progress}%</span>
                          </div>
                          <div className="w-full bg-[#eceef0] rounded-full h-1 overflow-hidden">
                            <div className="bg-[#006c49] h-full" style={{ width: `${p.progress}%` }}></div>
                          </div>
                        </div>
                      )}

                      {p.crews && p.crews.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-[9px] text-[#7c839b] font-bold uppercase mr-1">Cuadrilla:</span>
                          <div className="flex -space-x-1.5">
                            {p.crews.map((cr, idx) => (
                              <img 
                                key={idx} 
                                src={cr.avatar} 
                                alt={cr.name} 
                                referrerPolicy="no-referrer"
                                title={cr.name}
                                className="w-5 h-5 rounded-full border border-white bg-slate-50 object-cover"
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {p.isWarning && (
                        <div className="flex items-center gap-1.5 p-2 bg-red-50 border border-red-100 rounded-lg text-red-700 text-[9px] font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{p.warningText}</span>
                        </div>
                      )}

                      {/* Moving Controls */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#eceef0] gap-2 mt-1">
                        {p.status === "qa" ? (
                          <button
                            onClick={() => handleStartChecklist(p)}
                            className="w-full py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded flex items-center justify-center gap-1 shadow-sm"
                          >
                            <ClipboardList className="w-3.5 h-3.5" />
                            Inspeccionar
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => onMoveProject(p.id, "prev")}
                              disabled={p.status === "scheduled"}
                              className="px-2 py-1 border border-[#c6c6cd] text-[#45464d] text-[10px] rounded hover:bg-slate-100 disabled:opacity-40"
                            >
                              <ArrowLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onMoveProject(p.id, "next")}
                              className="flex-1 py-1 bg-[#131b2e] hover:bg-[#252f46] text-[#6cf8bb] text-[10px] font-bold rounded flex items-center justify-center gap-1 active:scale-[0.98] transition-all"
                            >
                              <span>Avanzar</span>
                              <ArrowRight className="w-3.5 h-3.5 text-[#6cf8bb]" />
                            </button>
                          </>
                        )}
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

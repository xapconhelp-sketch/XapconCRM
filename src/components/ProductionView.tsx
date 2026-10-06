import React from "react";
import { Lead } from "../types";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  MapPin,
  ShieldCheck,
  Layers3,
  HardHat,
} from "lucide-react";

interface ProductionViewProps {
  claims: Lead[];
  onMoveProject: (projectId: string, direction: "next" | "prev") => void;
}

const PIPELINE_COLUMNS = [
  { id: "Negados", title: "Negados", accent: "#B6484F", tint: "#F9ECEC" },
  { id: "Inspección", title: "Inspección", accent: "#4385A4", tint: "#EAF3F7" },
  { id: "En disputa", title: "En disputa", accent: "#B8794B", tint: "#F7EFE9" },
  { id: "Esperando Scope", title: "Esperando Scope", accent: "#786A9F", tint: "#F0EEF6" },
  { id: "Aprobado y Suplementado", title: "Aprobado y Suplementado", accent: "#57846C", tint: "#EDF4EF" },
  { id: "Construcción", title: "Construcción", accent: "#4F7390", tint: "#EBF1F5" },
  { id: "Esperando Depreciación", title: "Esperando Depreciación", accent: "#AD8059", tint: "#F7F4E9" },
  { id: "Finalizado", title: "Finalizado", accent: "#4E8C75", tint: "#EAF4F0" },
  { id: "Cancelado", title: "Cancelado", accent: "#7B8793", tint: "#E6ECF1" },
];

export default function ProductionView({ claims, onMoveProject }: ProductionViewProps) {
  const constructionCount = claims.filter((claim) => claim.status === "Construcción").length;
  const finishedCount = claims.filter((claim) => claim.status === "Finalizado").length;

  return (
    <div className="production-page crm-workspace flex-1 min-h-0 overflow-y-auto p-5 md:p-7 space-y-6">
      <header className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 border-b border-[#DCE3E8] pb-6">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#102A46] shadow-md shadow-[#102A46]/15">
            <Layers3 className="h-5 w-5 text-[#D5BF7A]" strokeWidth={1.8} />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[.18em] text-[#664A14]">Operación de proyectos</p>
            <h1 className="font-display text-[28px] font-bold tracking-tight text-[#102A46] md:text-[32px]">
              Pipeline de Producción
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#718093]">
              Sigue cada expediente por sus etapas y mantén visible el próximo movimiento del equipo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:min-w-[390px] sm:gap-3">
          <div className="rounded-2xl border border-[#DCE4EB] bg-white px-3 py-3 shadow-sm sm:px-4">
            <p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#5C6D7D]">Expedientes</p>
            <p className="mt-1 text-2xl font-bold leading-none text-[#102A46]">{claims.length}</p>
          </div>
          <div className="rounded-2xl border border-[#DCE4EB] bg-white px-3 py-3 shadow-sm sm:px-4">
            <p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#5C6D7D]">En construcción</p>
            <p className="mt-1 text-2xl font-bold leading-none text-[#4F7390]">{constructionCount}</p>
          </div>
          <div className="rounded-2xl border border-[#DCE4EB] bg-white px-3 py-3 shadow-sm sm:px-4">
            <p className="text-[9px] font-bold uppercase tracking-[.12em] text-[#5C6D7D]">Finalizados</p>
            <p className="mt-1 text-2xl font-bold leading-none text-[#4E8C75]">{finishedCount}</p>
          </div>
        </div>
      </header>

      <div className="flex snap-x gap-4 overflow-x-auto pb-4 select-none">
        {PIPELINE_COLUMNS.map((column, index) => {
          const knownStatuses = PIPELINE_COLUMNS.map((item) => item.id);
          const projects = claims.filter((claim) => {
            if (column.id === "Inspección" && !knownStatuses.includes(claim.status)) return true;
            return claim.status === column.id;
          });

          return (
            <section
              key={column.id}
              aria-label={`${column.title}: ${projects.length} expedientes`}
              className="flex h-[min(70vh,720px)] min-h-[420px] w-[300px] shrink-0 snap-start flex-col overflow-hidden rounded-[20px] border border-[#DFE5EA] bg-[#EEF2F5] shadow-[0_3px_12px_rgba(23,49,74,0.04)] md:w-[320px]"
            >
              <div className="border-b border-[#E1E7EB] bg-white/80 px-4 pb-2 pt-3">
                <div className="mb-2 h-1 w-9 rounded-full" style={{ backgroundColor: column.accent }} />
                <div className="flex items-center justify-between gap-3">
                  <h2 className="min-w-0 truncate text-[13px] font-bold text-[#263B50]">{column.title}</h2>
                  <span
                    className="flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-bold tabular-nums"
                    style={{ color: column.accent, backgroundColor: column.tint }}
                  >
                    {projects.length}
                  </span>
                </div>
                <p className="mt-1 text-[10px] font-medium text-[#8A97A4]">
                  {projects.length === 1 ? "1 expediente" : `${projects.length} expedientes`}
                </p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-3">
                {projects.length === 0 ? (
                  <div className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-dashed border-[#D5DEE5] bg-white/45 px-4 text-center">
                    <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl" style={{ color: column.accent, backgroundColor: column.tint }}>
                      <Layers3 className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-medium text-[#8794A1]">Sin expedientes en esta etapa</span>
                  </div>
                ) : (
                  projects.map((project) => {
                    const totalTasks = project.tasks?.length ?? 0;
                    const completedTasks = project.tasks?.filter((task) => task.status === "completed").length ?? 0;
                    const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

                    return (
                      <article
                        key={project.id}
                        className="group rounded-2xl border border-[#E0E6EB] bg-white p-4 shadow-[0_2px_6px_rgba(23,49,74,0.035)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#CBD6DE] hover:shadow-[0_10px_22px_rgba(23,49,74,0.09)]"
                        style={{ borderTopWidth: 3, borderTopColor: column.accent }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-[9px] font-bold text-[#506579]" style={{ backgroundColor: column.tint }}>
                            <ShieldCheck className="h-3 w-3 shrink-0" style={{ color: column.accent }} />
                            <span className="truncate">{project.claimNumber || "Claim pendiente"}</span>
                          </span>
                          {project.insuranceProvider && (
                            <span className="max-w-[112px] truncate pt-1 text-[10px] font-semibold text-[#81909E]" title={project.insuranceProvider}>
                              {project.insuranceProvider}
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3 text-[13px] font-bold leading-5 text-[#20364B]">{project.name}</h3>
                        <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-4 text-[#7C8B99]">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#735818]" />
                          <span className="line-clamp-2">{project.address || "Dirección pendiente"}</span>
                        </p>

                        {totalTasks > 0 && (
                          <div className="mt-4 rounded-xl bg-[#F6F8F9] px-3 py-2.5">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#53677B]">
                                <ClipboardCheck className="h-3.5 w-3.5 text-[#735818]" /> Avance de tareas
                              </span>
                              <span className="text-[10px] font-bold tabular-nums text-[#506579]">{completedTasks}/{totalTasks}</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-[#E3E9ED]">
                              <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${taskProgress}%`, backgroundColor: column.accent }} />
                            </div>
                          </div>
                        )}

                        <div className="mt-4 flex items-center gap-2 border-t border-[#EDF1F3] pt-3">
                          <button
                            type="button"
                            onClick={() => onMoveProject(project.id, "prev")}
                            disabled={index === 0}
                            aria-label={`Mover ${project.name} a la etapa anterior`}
                            title="Etapa anterior"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#DCE3E8] bg-white text-[#657789] transition-colors hover:bg-[#F4F6F7] disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onMoveProject(project.id, "next")}
                            disabled={index === PIPELINE_COLUMNS.length - 1}
                            className="flex h-9 flex-1 items-center justify-center gap-2 rounded-xl bg-[#102A46] text-[11px] font-bold text-white shadow-sm transition-colors hover:bg-[#193856] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <span>Avanzar etapa</span>
                            <ArrowRight className="h-3.5 w-3.5 text-[#D5BF7A]" />
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-[#84919D]">
        <HardHat className="h-3.5 w-3.5 text-[#735818]" />
        Desplázate horizontalmente para recorrer todas las etapas del proyecto.
        <CheckCircle2 className="ml-auto hidden h-4 w-4 text-[#4E8C75] sm:block" />
      </div>
    </div>
  );
}

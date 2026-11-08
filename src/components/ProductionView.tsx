import { RoleSectionIcon, RoleIconTile } from "./contractor/DesignSystem";
import { KPI, Lead, ViewType } from "../types";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  Layers3,
  HardHat,
} from "lucide-react";

interface ProductionViewProps {
  claims: Lead[];
  adminMetrics?: { kpis: KPI[]; onNavigateToView: (view: ViewType) => void };
  onMoveProject: (projectId: string, direction: "next" | "prev") => void;
}

const PIPELINE_COLUMNS = [
  { id: "Nuevos", title: "Nuevos", accent: "#64748B", tint: "#F1F5F9", header: "#688A72" },
  { id: "Estimados", title: "Estimados", accent: "#4385A4", tint: "#EAF3F7", header: "#688A72" },
  { id: "En disputa", title: "En disputa", accent: "#B8794B", tint: "#F7EFE9", header: "#B8794B" },
  { id: "Aprobado", title: "Aprobado", accent: "#57846C", tint: "#EDF4EF", header: "#688A72" },
  { id: "Aprobado y Suplementado", title: "Aprobado y Suplementado", accent: "#57846C", tint: "#EDF4EF", header: "#688A72" },
  { id: "Construcción", title: "Construcción", accent: "#4F7390", tint: "#EBF1F5", header: "#796E9A" },
  { id: "Solicitud Depreciación", title: "Solicitud Depreciación", accent: "#AD8059", tint: "#F7F4E9" },
  { id: "Finalizado", title: "Finalizado", accent: "#4E8C75", tint: "#EAF4F0", header: "#617F9B" },
  { id: "Cancelado", title: "Cancelado", accent: "#7B8793", tint: "#E6ECF1", header: "#777F87" },
  { id: "Negados", title: "Negados", accent: "#B6484F", tint: "#F9ECEC", header: "#AD5C61" },
];

const legacyStageAliases: Record<string, string> = {
  "Nuevo": "Nuevos",
  "Inspección": "Estimados",
  "Esperando Scope": "Estimados",
  "Esperando Depreciación": "Solicitud Depreciación",
};

export default function ProductionView({ claims, onMoveProject, adminMetrics }: ProductionViewProps) {
  return (
    <div className="production-page crm-workspace flex-1 min-h-0 overflow-y-auto p-5 md:p-7 space-y-6">
      <header className={`flex flex-col gap-5 border-b border-[#DCE3E8] pb-6 ${adminMetrics ? "" : "xl:flex-row xl:items-end xl:justify-between"}`}>
        <div className="flex items-start gap-4">
          <div>
            <h1 className="font-display text-[28px] font-bold tracking-tight text-[#102A46] md:text-[32px]">
              <RoleSectionIcon name="production" />Producción
            </h1>
          </div>
        </div>

      </header>

      <div className="flex snap-x gap-4 overflow-x-auto pb-4 select-none">
        {PIPELINE_COLUMNS.map((column, index) => {
          const projects = claims.filter((claim) => {
            const stage = legacyStageAliases[claim.status] || claim.status;
            return stage === column.id;
          });

          return (
            <section
              key={column.id}
              aria-label={`${column.title}: ${projects.length} expedientes`}
              className="flex h-[min(70vh,720px)] min-h-[420px] w-[300px] shrink-0 snap-start flex-col overflow-hidden rounded-[20px] border border-[#DFE5EA] bg-[#EEF2F5] shadow-[0_3px_12px_rgba(23,49,74,0.04)] md:w-[320px]"
            >
              <div className="border-b border-[#E1E7EB] px-4 pb-2 pt-3" style={column.header ? { backgroundColor: column.header } : { backgroundColor: "#ffffff" }}>
                <div className="mb-2 h-1 w-9 rounded-full" style={{ backgroundColor: column.header ? "#ffffff99" : column.accent }} />
                <div className="flex items-center justify-between gap-3">
                  <h2 className={`min-w-0 truncate text-[13px] font-bold ${column.header ? "text-white" : "text-[#263B50]"}`}>{column.title}</h2>
                  <span
                    className={`flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-bold tabular-nums ${column.header ? "text-white" : ""}`}
                    style={column.header ? { backgroundColor: "#00000026" } : { color: column.accent, backgroundColor: column.tint }}
                  >
                    {projects.length}
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-3">
                {projects.length === 0 ? (
                  <div className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-dashed border-[#D5DEE5] bg-white/45 px-4 text-center">
                    <RoleIconTile name="production" className="contractor-row-icon mb-2"><span className="mb-2 flex h-8 w-8 items-center justify-center rounded-xl" style={{ color: column.accent, backgroundColor: column.tint }}>
                      <Layers3 className="h-4 w-4" />
                    </span></RoleIconTile>
                    <span className="text-[11px] font-medium text-[#8794A1]">Sin expedientes en esta etapa</span>
                  </div>
                ) : (
                  projects.map((project) => (
                      <article
                        key={project.id}
                        className="group rounded-2xl border border-[#E0E6EB] bg-white p-4 shadow-[0_2px_6px_rgba(23,49,74,0.035)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#CBD6DE] hover:shadow-[0_10px_22px_rgba(23,49,74,0.09)]"
                        style={{ borderTopWidth: 3, borderTopColor: column.accent }}
                      >
                        <div className="production-card-reference flex items-start justify-between gap-3">
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
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-[#84919D]">
        <HardHat className="h-3.5 w-3.5 text-[#735818]" />
        <span className="text-black">Desplázate horizontalmente para recorrer todas las etapas del proyecto.</span>
        <CheckCircle2 className="ml-auto hidden h-4 w-4 text-[#4E8C75] sm:block" />
      </div>
    </div>
  );
}

export const CLAIM_PIPELINE_STAGES = [
  "Nuevos",
  "Estimados",
  "En disputa",
  "Aprobado",
  "Aprobado y Suplementado",
  "Construcción",
  "Solicitud Depreciación",
  "Finalizado",
  "Cancelado",
  "Negados",
] as const;

const LEGACY_STAGE_ALIASES: Record<string, string> = {
  "Nuevo": "Nuevos",
  "Inspección": "Estimados",
  "Esperando Scope": "Estimados",
  "Esperando Depreciación": "Solicitud Depreciación",
};

export function normalizeClaimStage(status: string): string {
  return LEGACY_STAGE_ALIASES[status] || status;
}

export function adjacentClaimStage(status: string, direction: "next" | "prev"): string | null {
  const index = CLAIM_PIPELINE_STAGES.indexOf(normalizeClaimStage(status) as typeof CLAIM_PIPELINE_STAGES[number]);
  if (index < 0) return null;
  const nextIndex = index + (direction === "next" ? 1 : -1);
  return CLAIM_PIPELINE_STAGES[nextIndex] || null;
}

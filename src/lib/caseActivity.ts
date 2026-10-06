import type { Lead, TimelineEvent } from "../types";

function parseDate(value?: string): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function timelineEventTime(event: TimelineEvent): number {
  const recordedTime = parseDate(event.date) || parseDate(event.timestamp);
  if (recordedTime) return recordedTime;

  // Older events stored their creation time in the ID; UUIDs do not encode it.
  const legacyTime = event.id.match(/(?:^|\D)(\d{13})(?:\D|$)/)?.[1];
  return legacyTime ? Number(legacyTime) : 0;
}

export function formatTimelineDate(event: TimelineEvent): string {
  const time = timelineEventTime(event);
  return time ? new Intl.DateTimeFormat("es-CO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(time)) : "Fecha no disponible";
}

export function getDaysSinceLastUpdate(lead: Lead, now = Date.now()): number {
  const created = parseDate(lead.created_at) || parseDate(lead.createdAt);
  const latest = (lead.timeline || []).reduce(
    (last, event) => Math.max(last, timelineEventTime(event)), created,
  );
  return latest ? Math.max(0, Math.floor((now - latest) / 86400000)) : 0;
}

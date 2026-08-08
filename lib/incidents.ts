import type { Locale } from "@/lib/i18n";

export type IncidentSeverity = "minor" | "major" | "critical";
export type PublishedIncident = { id: string; startedAt: string; resolvedAt: string; severity: IncidentSeverity; title: { ru: string; en: string }; summary: { ru: string; en: string }; affected: readonly string[] };

// Append-only publication registry. Never invent uptime or backfill incidents from unavailable evidence.
export const PUBLISHED_INCIDENTS: readonly PublishedIncident[] = [];

export function getPublishedIncidents(locale: Locale) {
  return PUBLISHED_INCIDENTS.map((incident) => ({ ...incident, title: incident.title[locale], summary: incident.summary[locale] }));
}

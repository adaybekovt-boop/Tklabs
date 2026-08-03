"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleAlert, ExternalLink } from "lucide-react";

import { useLanguage } from "@/components/providers/LanguageProvider";

export function StatusPage() {
  const { copy } = useLanguage();
  const systems = [
    [copy.status.systems.facility, "operational"],
    [copy.status.systems.proof, "operational"],
    [copy.status.systems.confidence, "monitoring"],
    [copy.status.systems.legal, "operational"],
  ] as const;

  return (
    <main className="status-page-shell">
      <header className="status-page-header"><Link className="status-back" href="/"><ArrowLeft size={14} aria-hidden="true" /> {copy.common.backToFacility}</Link><div className="status-brand">{copy.status.brand}</div><span className="status-date">{copy.status.updated}</span></header>
      <section className="status-hero"><div><span className="eyebrow text-[#e7ff49]">{copy.status.eyebrow}</span><h1>{copy.status.titleLead}<br /><em>{copy.status.titleAccent}</em></h1><p>{copy.status.intro}</p></div><div className="status-orb" aria-label={copy.status.orbAria}><span className="status-orb-ring" /><strong>99.97%</strong><small>{copy.status.uptime}</small><span className="status-orb-state"><CheckCircle2 size={14} /> {copy.status.allOperational}</span></div></section>
      <section className="status-systems" aria-label={copy.status.systemsAria}>{systems.map(([label, state]) => <div className="system-row" key={label}><span className={state === "monitoring" ? "system-icon monitoring" : "system-icon"}>{state === "monitoring" ? <CircleAlert size={14} /> : <CheckCircle2 size={14} />}</span><span>{label}</span><strong>{state === "monitoring" ? copy.common.monitoring : copy.common.operational}</strong></div>)}</section>
      <section className="incident-list"><div className="incident-list-heading"><span className="eyebrow">{copy.status.incidentHistory}</span><span>{copy.status.rootCause}</span></div>{copy.status.incidents.map((incident) => <article className="incident-card" key={incident.title}><div className="incident-marker" /><div className="incident-date">{incident.date}</div><div className="incident-copy"><div className="incident-status">{incident.status} / {incident.duration}</div><h2>{incident.title}</h2><p>{incident.body}</p></div><ExternalLink className="incident-link" size={16} aria-hidden="true" /></article>)}</section>
      <footer className="status-page-footer"><span>{copy.status.incidentFeed}</span><Link href="/truth">{copy.common.readDisclosure} <ExternalLink size={13} /></Link></footer>
    </main>
  );
}

"use client";

import { Activity, FileText, MessageSquareText, ShieldCheck, Workflow, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { TrustControlSheet } from "@/components/playground/TrustControlSheet";
import type { Locale } from "@/lib/i18n";
import { acknowledgeTrustDisclosure, isTrustDisclosureAcknowledged, subscribeTrustDisclosure } from "@/lib/trust-disclosure";
import { cn } from "@/lib/utils";
import type { WorkspaceSection } from "@/lib/workspace-events";

const ITEMS: Array<{ id: WorkspaceSection; ru: string; en: string; icon: typeof MessageSquareText }> = [
  { id: "chat", ru: "Чат", en: "Chat", icon: MessageSquareText }, { id: "flow", ru: "Flow", en: "Flow", icon: Workflow }, { id: "artifacts", ru: "Файлы", en: "Artifacts", icon: FileText }, { id: "runs", ru: "Runs", en: "Runs", icon: Activity },
];

export function MobileWorkspaceSwitcher({ locale, active, onSelect }: { locale: Locale; active: WorkspaceSection; onSelect: (section: WorkspaceSection) => void }) {
  const ru = locale === "ru";
  const [trustOpen, setTrustOpen] = useState(false);
  const acknowledged = useSyncExternalStore(subscribeTrustDisclosure, () => isTrustDisclosureAcknowledged(), () => false);
  return <><nav className="mobile-workspace-switcher md:hidden" aria-label={ru ? "Разделы рабочей области" : "Workspace sections"} data-mobile-workspace-switcher>{ITEMS.map(({ id, ru: ruLabel, en, icon: Icon }) => { const selected = active === id; return <button key={id} type="button" onClick={() => onSelect(id)} aria-current={selected ? "page" : undefined} aria-pressed={selected} className={cn("mobile-workspace-switcher__item", selected && "is-active")}><Icon size={16} aria-hidden="true" /><span>{ru ? ruLabel : en}</span></button>; })}<button type="button" onClick={() => setTrustOpen(true)} className="mobile-workspace-switcher__item" aria-label={ru ? "Данные и приватность" : "Data and privacy"}><ShieldCheck size={16} aria-hidden="true" /><span>Trust</span></button></nav>{!acknowledged && <div className="flex items-start gap-3 border-b border-outline-variant bg-surface-container-low px-3 py-2 text-[11px] leading-5 text-on-surface-variant md:hidden" data-trust-jit-disclosure><ShieldCheck size={15} className="mt-0.5 shrink-0" /><p className="flex-1">{ru ? "AI-запросы и отправленные вложения покидают устройство для генерации. Local/Ephemeral управляют хранением, а не on-device inference." : "AI requests and submitted attachments leave the device for generation. Local/Ephemeral control storage, not on-device inference."}</p><button type="button" className="grid size-7 shrink-0 place-items-center" onClick={() => acknowledgeTrustDisclosure()} aria-label={ru ? "Понятно" : "Got it"}><X size={14} /></button></div>}<TrustControlSheet locale={locale} open={trustOpen} onClose={() => setTrustOpen(false)} /></>;
}

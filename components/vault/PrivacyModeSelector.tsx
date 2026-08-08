"use client";

import { useSyncExternalStore } from "react";

import type { Locale } from "@/lib/i18n";
import { getWorkspacePrivacyMode, setWorkspacePrivacyMode, WORKSPACE_PRIVACY_MODE_EVENT, type WorkspacePrivacyMode } from "@/lib/privacy-mode";

function subscribe(callback: () => void) {
  window.addEventListener(WORKSPACE_PRIVACY_MODE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener(WORKSPACE_PRIVACY_MODE_EVENT, callback); window.removeEventListener("storage", callback); };
}
function snapshot() { return getWorkspacePrivacyMode(); }
function serverSnapshot(): WorkspacePrivacyMode { return "local"; }

export function PrivacyModeSelector({ locale }: { locale: Locale }) {
  const mode = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const ru = locale === "ru";
  const options: Array<{ id: WorkspacePrivacyMode; title: string; detail: string }> = ru ? [
    { id: "local", title: "Local", detail: "История сохраняется на этом устройстве. AI-запрос всё равно уходит через TK LAB Worker к модельному провайдеру." },
    { id: "synced", title: "Synced", detail: "Local workspace можно вручную синхронизировать в encrypted-at-rest D1 snapshot. Автосинхронизации нет." },
    { id: "ephemeral", title: "Ephemeral", detail: "Новые chat sessions не записываются в локальный архив. AI inference остаётся внешним provider route." },
  ] : [
    { id: "local", title: "Local", detail: "History is stored on this device. Submitted AI requests still travel through the TK LAB Worker to a model provider." },
    { id: "synced", title: "Synced", detail: "The local workspace can be manually synchronized to an encrypted-at-rest D1 snapshot. There is no automatic sync." },
    { id: "ephemeral", title: "Ephemeral", detail: "New chat sessions are not written to the local archive. AI inference still uses the external provider route." },
  ];
  return <section className="mb-8 border border-outline-variant/40 p-5 sm:p-7"><p className="label-caps text-secondary">TK LAB · STORAGE MODE</p><h2 className="headline-title mt-3">{ru ? "Режим приватности" : "Privacy mode"}</h2><div className="mt-5 grid gap-3 md:grid-cols-3">{options.map((option) => <button key={option.id} type="button" aria-pressed={mode === option.id} onClick={() => setWorkspacePrivacyMode(option.id)} className={`border p-4 text-left ${mode === option.id ? "border-primary bg-surface-container-low" : "border-outline-variant"}`}><span className="font-medium">{option.title}</span><span className="mt-2 block text-sm leading-6 text-on-surface-variant">{option.detail}</span></button>)}</div></section>;
}

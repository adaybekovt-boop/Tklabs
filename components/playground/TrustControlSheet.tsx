"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { ChatOverlay } from "@/components/playground/ChatOverlay";
import { DataRouteInspector } from "@/components/playground/DataRouteInspector";
import type { Locale } from "@/lib/i18n";
import { getWorkspacePrivacyMode, setWorkspacePrivacyMode, WORKSPACE_PRIVACY_MODE_EVENT, type WorkspacePrivacyMode } from "@/lib/privacy-mode";

function subscribe(callback: () => void) { window.addEventListener(WORKSPACE_PRIVACY_MODE_EVENT, callback); window.addEventListener("storage", callback); return () => { window.removeEventListener(WORKSPACE_PRIVACY_MODE_EVENT, callback); window.removeEventListener("storage", callback); }; }
function serverMode(): WorkspacePrivacyMode { return "local"; }

export function TrustControlSheet({ locale, open, onClose }: { locale: Locale; open: boolean; onClose: () => void }) {
  const mode = useSyncExternalStore(subscribe, () => getWorkspacePrivacyMode(), serverMode);
  const ru = locale === "ru";
  const modes: WorkspacePrivacyMode[] = ["local", "synced", "ephemeral"];
  return <ChatOverlay open={open} onClose={onClose} position="sheet" labelledBy="mobile-trust-title" closeLabel={ru ? "Закрыть" : "Close"} className="p-4"><div className="space-y-6"><div><p className="label-caps text-secondary">TK LAB · TRUST</p><h2 id="mobile-trust-title" className="mt-2 text-xl font-medium">{ru ? "Данные и AI" : "Data & AI"}</h2></div><DataRouteInspector locale={locale} /><section><p className="text-sm font-medium">{ru ? "Режим хранения" : "Storage mode"}</p><div className="mt-3 grid grid-cols-3 gap-2">{modes.map((item) => <button key={item} type="button" aria-pressed={mode === item} onClick={() => setWorkspacePrivacyMode(item)} className={`min-h-10 rounded-xl border px-2 text-xs ${mode === item ? "border-primary bg-primary text-on-primary" : "border-outline-variant"}`}>{item}</button>)}</div></section><section className="space-y-3 text-sm leading-6 text-on-surface-variant"><p><strong className="text-primary">{ru ? "Файлы:" : "Files:"}</strong> {ru ? "после отправки извлечённый текст выбранных вложений становится частью model context и покидает устройство." : "after submission, extracted text from selected attachments becomes part of model context and leaves the device."}</p><p><strong className="text-primary">{ru ? "Голос:" : "Voice:"}</strong> {ru ? "speech recognition зависит от реализации браузера/ОС; server TTS может передать текст ElevenLabs только после явного запуска." : "speech recognition depends on the browser/OS implementation; server TTS may send text to ElevenLabs only after an explicit request."}</p><p><strong className="text-primary">Sync:</strong> {ru ? "ручной encrypted-at-rest D1 snapshot; это не end-to-end encryption." : "manual encrypted-at-rest D1 snapshot; it is not end-to-end encryption."}</p></section><div className="flex flex-wrap gap-4 text-sm underline underline-offset-4"><Link href="/vault" onClick={onClose}>Vault</Link><Link href="/legal/privacy" onClick={onClose}>Privacy</Link><Link href="/legal/ai-transparency" onClick={onClose}>AI Transparency</Link><Link href="/legal/subprocessors" onClick={onClose}>Providers</Link></div></div></ChatOverlay>;
}

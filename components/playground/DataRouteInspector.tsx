"use client";

import { useSyncExternalStore } from "react";

import type { Locale } from "@/lib/i18n";
import { getWorkspacePrivacyMode, privacyModeRoute, WORKSPACE_PRIVACY_MODE_EVENT, type WorkspacePrivacyMode } from "@/lib/privacy-mode";

function subscribe(callback: () => void) { window.addEventListener(WORKSPACE_PRIVACY_MODE_EVENT, callback); window.addEventListener("storage", callback); return () => { window.removeEventListener(WORKSPACE_PRIVACY_MODE_EVENT, callback); window.removeEventListener("storage", callback); }; }
function serverSnapshot(): WorkspacePrivacyMode { return "local"; }

export function DataRouteInspector({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const mode = useSyncExternalStore(subscribe, () => getWorkspacePrivacyMode(), serverSnapshot);
  const route = privacyModeRoute(mode);
  const ru = locale === "ru";
  return <details className={compact ? "text-[11px] text-secondary" : "border border-outline-variant/40 p-4 text-sm"} data-data-route-inspector><summary className="cursor-pointer select-none font-medium">{ru ? "Маршрут данных" : "Data route"} · {mode}</summary><div className="mt-2 leading-6 text-on-surface-variant"><p>{route.join(" → ")}</p><p>{mode === "ephemeral" ? (ru ? "Сессия не архивируется локально; inference не является on-device." : "The session is not archived locally; inference is not on-device.") : mode === "synced" ? (ru ? "Server snapshot создаётся только при ручной синхронизации." : "The server snapshot is created only by manual sync.") : (ru ? "Server conversation backup не создаётся." : "No server conversation backup is created.")}</p></div></details>;
}

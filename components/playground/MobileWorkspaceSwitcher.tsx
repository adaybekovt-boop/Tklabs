"use client";

import { FileText, ListChecks, MessageSquareText, ShieldCheck, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";

import type { Locale } from "@/lib/i18n";
import { acknowledgeTrustDisclosure, isTrustDisclosureAcknowledged, subscribeTrustDisclosure } from "@/lib/trust-disclosure";
import { cn } from "@/lib/utils";
import type { WorkspaceSection } from "@/lib/workspace-events";

const ITEMS: Array<{ id: WorkspaceSection; ru: string; en: string; icon: typeof MessageSquareText }> = [
  { id: "chat", ru: "Чат", en: "Chat", icon: MessageSquareText },
  { id: "flow", ru: "Задачи", en: "Tasks", icon: ListChecks },
  { id: "artifacts", ru: "Файлы", en: "Files", icon: FileText },
];

const subscribeClientReady = () => () => undefined;
const clientReadySnapshot = () => true;
const serverReadySnapshot = () => false;

export function MobileWorkspaceSwitcher({ locale, active, onSelect }: { locale: Locale; active: WorkspaceSection; onSelect: (section: WorkspaceSection) => void }) {
  const ru = locale === "ru";
  const acknowledged = useSyncExternalStore(subscribeTrustDisclosure, () => isTrustDisclosureAcknowledged(), () => false);
  const portalReady = useSyncExternalStore(subscribeClientReady, clientReadySnapshot, serverReadySnapshot);

  return portalReady
    ? createPortal(
        <>
          {!acknowledged && (
            <div className="mobile-trust-jit-disclosure md:hidden" data-trust-jit-disclosure>
              <ShieldCheck size={15} className="mt-0.5 shrink-0" />
              <p className="min-w-0 flex-1">
                {ru
                  ? "AI-запросы и отправленные файлы передаются внешнему AI-провайдеру для генерации. Режим приватности управляет хранением, а не локальным запуском модели."
                  : "AI requests and submitted files are sent to an external AI provider for generation. Privacy mode controls storage, not on-device model execution."}
              </p>
              <button type="button" className="grid size-8 shrink-0 place-items-center rounded-full" onClick={() => acknowledgeTrustDisclosure()} aria-label={ru ? "Понятно" : "Got it"}><X size={14} /></button>
            </div>
          )}
          <nav className="mobile-workspace-switcher md:hidden" aria-label={ru ? "Разделы Erma" : "Erma sections"} data-mobile-workspace-switcher>
            {ITEMS.map(({ id, ru: ruLabel, en, icon: Icon }) => {
              const selected = active === id || (active === "runs" && id === "flow");
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelect(id)}
                  aria-current={selected ? "page" : undefined}
                  aria-pressed={selected}
                  className={cn("mobile-workspace-switcher__item", selected && "is-active")}
                >
                  <Icon size={17} aria-hidden="true" />
                  <span>{ru ? ruLabel : en}</span>
                </button>
              );
            })}
          </nav>
        </>,
        document.body,
      )
    : null;
}

"use client";

import { Download, Eraser, HardDrive, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { clearArchive, loadArchive } from "@/lib/local-archive";

type ArchiveStats = {
  sessions: number;
  messages: number;
  bytes: number;
};

const DRAFT_PREFIX = "tklabs.chat-draft.v1:";

function readStats(): ArchiveStats {
  const sessions = loadArchive();
  const serialized = JSON.stringify(sessions);
  return {
    sessions: sessions.length,
    messages: sessions.reduce((total, session) => total + session.messages.length, 0),
    bytes: new TextEncoder().encode(serialized).byteLength,
  };
}

function formatBytes(bytes: number, locale: string) {
  if (bytes < 1024) return `${bytes} B`;
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1024) + " KB";
}

export function ProfileLocalData({ locale }: { locale: "ru" | "en" }) {
  const [stats, setStats] = useState<ArchiveStats>({ sessions: 0, messages: 0, bytes: 0 });
  const labels = locale === "ru"
    ? {
        title: "Данные на устройстве",
        description: "История диалогов и черновики хранятся только в этом браузере и не синхронизируются с сервером.",
        sessions: "Диалогов",
        messages: "Сообщений",
        size: "Размер",
        export: "Экспортировать JSON",
        clear: "Очистить историю",
        reset: "Сбросить черновики и настройки",
        confirmClear: "Удалить всю локальную историю диалогов на этом устройстве?",
        confirmReset: "Удалить локальные черновики и настройки AI-чата?",
      }
    : {
        title: "On-device data",
        description: "Conversation history and drafts stay in this browser and are not synchronized with the server.",
        sessions: "Conversations",
        messages: "Messages",
        size: "Size",
        export: "Export JSON",
        clear: "Clear history",
        reset: "Reset drafts and settings",
        confirmClear: "Delete all local conversation history on this device?",
        confirmReset: "Delete local AI chat drafts and settings?",
      };

  useEffect(() => {
    function refresh() {
      setStats(readStats());
    }
    refresh();
    window.addEventListener("tklab:archive-updated", refresh);
    return () => window.removeEventListener("tklab:archive-updated", refresh);
  }, []);

  function exportArchive() {
    const payload = JSON.stringify({
      exportedAt: new Date().toISOString(),
      conversations: loadArchive(),
    }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `tklabs-conversations-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function clearHistory() {
    if (!window.confirm(labels.confirmClear)) return;
    clearArchive();
    setStats(readStats());
  }

  function resetDraftsAndSettings() {
    if (!window.confirm(labels.confirmReset)) return;
    try {
      for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
        const key = window.localStorage.key(index);
        if (key?.startsWith(DRAFT_PREFIX)) window.localStorage.removeItem(key);
      }
      window.localStorage.removeItem("tklab.settings.v1");
      window.localStorage.removeItem("tklabs.erma-tone");
    } catch {
      // Restricted browser storage should not break profile controls.
    }
  }

  return (
    <section className="mt-section-gap border-t border-outline-variant pt-8" aria-labelledby="local-data-title">
      <div className="grid gap-7 md:grid-cols-12">
        <div className="md:col-span-4">
          <span className="grid size-11 place-items-center rounded-2xl border border-outline-variant bg-surface-container-low">
            <HardDrive size={19} aria-hidden="true" />
          </span>
          <h2 id="local-data-title" className="headline-title mt-5">{labels.title}</h2>
          <p className="mt-4 max-w-md text-sm leading-[1.7] text-on-surface-variant">{labels.description}</p>
        </div>

        <div className="md:col-span-7 md:col-start-6">
          <div className="grid grid-cols-3 gap-2">
            {[
              [labels.sessions, String(stats.sessions)],
              [labels.messages, String(stats.messages)],
              [labels.size, formatBytes(stats.bytes, locale)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-secondary">{label}</p>
                <p className="mt-3 text-base font-medium text-primary">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button type="button" onClick={exportArchive} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-outline-variant px-3 text-xs font-medium text-primary">
              <Download size={16} /> {labels.export}
            </button>
            <button type="button" onClick={clearHistory} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-outline-variant px-3 text-xs font-medium text-primary">
              <Eraser size={16} /> {labels.clear}
            </button>
            <button type="button" onClick={resetDraftsAndSettings} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-outline-variant px-3 text-xs font-medium text-primary">
              <RotateCcw size={16} /> {labels.reset}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

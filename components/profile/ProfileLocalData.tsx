"use client";

import { Check, Download, Eraser, HardDrive, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";

import { clearArchive, loadArchive } from "@/lib/local-archive";

type ArchiveStats = {
  sessions: number;
  messages: number;
  bytes: number;
};

type PendingAction = "clear" | "reset" | null;

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
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [notice, setNotice] = useState("");
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
        confirmClear: "Подтвердить удаление истории",
        confirmReset: "Подтвердить сброс настроек",
        cancel: "Отмена",
        exported: "Архив подготовлен и сохранён как JSON.",
        cleared: "Локальная история удалена.",
        resetDone: "Черновики и локальные настройки сброшены.",
        confirmHint: "Нажмите подтверждение ещё раз. Действие нельзя отменить.",
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
        confirmClear: "Confirm history deletion",
        confirmReset: "Confirm settings reset",
        cancel: "Cancel",
        exported: "The archive was prepared and saved as JSON.",
        cleared: "Local conversation history was deleted.",
        resetDone: "Drafts and local chat settings were reset.",
        confirmHint: "Press confirm once more. This action cannot be undone.",
      };

  useEffect(() => {
    function refresh() {
      setStats(readStats());
    }
    refresh();
    window.addEventListener("tklab:archive-updated", refresh);
    return () => window.removeEventListener("tklab:archive-updated", refresh);
  }, []);

  function announce(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => current === message ? "" : current), 3_000);
  }

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
    setPendingAction(null);
    announce(labels.exported);
  }

  function clearHistory() {
    if (pendingAction !== "clear") {
      setPendingAction("clear");
      setNotice(labels.confirmHint);
      return;
    }
    clearArchive();
    setStats(readStats());
    setPendingAction(null);
    announce(labels.cleared);
  }

  function resetDraftsAndSettings() {
    if (pendingAction !== "reset") {
      setPendingAction("reset");
      setNotice(labels.confirmHint);
      return;
    }
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
    setPendingAction(null);
    announce(labels.resetDone);
  }

  return (
    <section id="local-data" className="scroll-mt-24 border-t border-outline-variant pt-8 md:mt-section-gap" aria-labelledby="local-data-title" data-local-data-actions>
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
              <div key={label} className="min-w-0 rounded-2xl border border-outline-variant bg-surface-container-lowest p-3 sm:p-4">
                <p className="truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-secondary sm:text-[10px] sm:tracking-[0.1em]">{label}</p>
                <p className="mt-3 truncate text-sm font-medium text-primary sm:text-base">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button type="button" onClick={exportArchive} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-3 text-xs font-medium text-on-primary">
              <Download size={16} aria-hidden="true" /> {labels.export}
            </button>
            <button
              type="button"
              onClick={clearHistory}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-outline-variant px-3 text-xs font-medium text-primary"
              aria-pressed={pendingAction === "clear"}
            >
              {pendingAction === "clear" ? <Check size={16} aria-hidden="true" /> : <Eraser size={16} aria-hidden="true" />}
              {pendingAction === "clear" ? labels.confirmClear : labels.clear}
            </button>
            <button
              type="button"
              onClick={resetDraftsAndSettings}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-outline-variant px-3 text-xs font-medium text-primary"
              aria-pressed={pendingAction === "reset"}
            >
              {pendingAction === "reset" ? <Check size={16} aria-hidden="true" /> : <RotateCcw size={16} aria-hidden="true" />}
              {pendingAction === "reset" ? labels.confirmReset : labels.reset}
            </button>
          </div>

          {pendingAction ? (
            <button type="button" onClick={() => { setPendingAction(null); setNotice(""); }} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-medium text-secondary">
              <X size={15} aria-hidden="true" /> {labels.cancel}
            </button>
          ) : null}
          <p className="min-h-6 pt-2 text-xs leading-[1.5] text-secondary" role="status" aria-live="polite">{notice}</p>
        </div>
      </div>
    </section>
  );
}

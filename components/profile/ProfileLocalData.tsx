"use client";

import Link from "next/link";
import { Check, DatabaseBackup, Download, Eraser, HardDrive, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { clearArchive, loadArchive } from "@/lib/local-archive";

type ArchiveStats = {
  sessions: number;
  messages: number;
  bytes: number;
};

type PendingAction = "clear" | "reset" | null;

const DRAFT_PREFIX = "tklabs.chat-draft.v1:";
const CHAT_SETTING_KEYS = [
  "tklab.settings.v1",
  "tklabs.erma-tone",
  "tklabs.erma-nova.workspace-tab",
  "tklabs.response-mode",
] as const;

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
  const noticeTimeoutRef = useRef<number | null>(null);
  const labels = locale === "ru"
    ? {
        title: "Данные на устройстве",
        description: "История диалогов и черновики хранятся только в этом браузере. Здесь находятся быстрые действия для чата; полный бэкап всех рабочих данных доступен в Workspace Vault.",
        sessions: "Диалогов",
        messages: "Сообщений",
        size: "Размер",
        vaultTitle: "Workspace Vault",
        openVault: "Открыть полный бэкап",
        export: "Экспортировать диалоги",
        clear: "Очистить историю",
        reset: "Сбросить настройки чата",
        confirmClear: "Подтвердить удаление истории",
        confirmReset: "Подтвердить сброс настроек",
        cancel: "Отмена",
        exported: "Диалоги сохранены как JSON. Для полного бэкапа используйте Workspace Vault.",
        cleared: "Локальная история удалена.",
        resetDone: "Черновики и локальные настройки чата сброшены.",
        confirmHint: "Нажмите подтверждение ещё раз. Действие нельзя отменить.",
      }
    : {
        title: "On-device data",
        description: "Conversation history and drafts stay in this browser. These are quick chat controls; Workspace Vault provides a complete backup of all workspace data.",
        sessions: "Conversations",
        messages: "Messages",
        size: "Size",
        vaultTitle: "Workspace Vault",
        openVault: "Open full backup",
        export: "Export conversations",
        clear: "Clear history",
        reset: "Reset chat settings",
        confirmClear: "Confirm history deletion",
        confirmReset: "Confirm settings reset",
        cancel: "Cancel",
        exported: "Conversations were saved as JSON. Use Workspace Vault for a complete backup.",
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

  useEffect(() => {
    if (!pendingAction) return;
    const timeout = window.setTimeout(() => {
      setPendingAction(null);
      setNotice("");
    }, 10_000);
    return () => window.clearTimeout(timeout);
  }, [pendingAction]);

  useEffect(() => () => {
    if (noticeTimeoutRef.current !== null) window.clearTimeout(noticeTimeoutRef.current);
  }, []);

  function announce(message: string) {
    if (noticeTimeoutRef.current !== null) window.clearTimeout(noticeTimeoutRef.current);
    setNotice(message);
    noticeTimeoutRef.current = window.setTimeout(() => {
      setNotice((current) => current === message ? "" : current);
      noticeTimeoutRef.current = null;
    }, 3_000);
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
    document.body.append(link);
    link.click();
    link.remove();
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
      CHAT_SETTING_KEYS.forEach((key) => window.localStorage.removeItem(key));
    } catch {
      // Restricted browser storage should not break profile controls.
    }
    setPendingAction(null);
    announce(labels.resetDone);
  }

  return (
    <section id="local-data" className="scroll-mt-28 border-t border-outline-variant pt-8 md:mt-section-gap" aria-labelledby="local-data-title" data-local-data-actions>
      <div className="grid gap-7 md:grid-cols-12">
        <div className="md:col-span-4">
          <span className="grid size-11 place-items-center rounded-2xl border border-outline-variant bg-surface-container-low">
            <HardDrive size={19} aria-hidden="true" />
          </span>
          <h2 id="local-data-title" className="headline-title mt-5">{labels.title}</h2>
          <p className="mt-4 max-w-md text-sm leading-[1.7] text-on-surface-variant">{labels.description}</p>
        </div>

        <div className="md:col-span-7 md:col-start-6">
          <Link href="/vault" className="group flex items-start gap-4 rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,rgba(123,97,255,.12),rgba(59,130,246,.06))] p-4 transition-[transform,border-color] hover:-translate-y-0.5 hover:border-primary/45 sm:p-5" data-profile-vault-card>
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-on-primary">
              <DatabaseBackup size={19} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-primary">{labels.vaultTitle}</span>
              <span className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-primary">{labels.openVault} ↗</span>
            </span>
          </Link>

          <div className="mt-4 grid grid-cols-3 gap-2">
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
            <button type="button" onClick={exportArchive} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-3 text-xs font-medium text-on-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25">
              <Download size={16} aria-hidden="true" /> {labels.export}
            </button>
            <button
              type="button"
              onClick={clearHistory}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-outline-variant px-3 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
              aria-pressed={pendingAction === "clear"}
            >
              {pendingAction === "clear" ? <Check size={16} aria-hidden="true" /> : <Eraser size={16} aria-hidden="true" />}
              {pendingAction === "clear" ? labels.confirmClear : labels.clear}
            </button>
            <button
              type="button"
              onClick={resetDraftsAndSettings}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-outline-variant px-3 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
              aria-pressed={pendingAction === "reset"}
            >
              {pendingAction === "reset" ? <Check size={16} aria-hidden="true" /> : <RotateCcw size={16} aria-hidden="true" />}
              {pendingAction === "reset" ? labels.confirmReset : labels.reset}
            </button>
          </div>

          {pendingAction ? (
            <button type="button" onClick={() => { setPendingAction(null); setNotice(""); }} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-medium text-secondary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20">
              <X size={15} aria-hidden="true" /> {labels.cancel}
            </button>
          ) : null}
          <p className="min-h-6 pt-2 text-xs leading-[1.5] text-secondary" role="status" aria-live="polite">{notice}</p>
        </div>
      </div>
    </section>
  );
}

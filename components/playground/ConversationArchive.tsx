"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, CopyPlus, FolderKanban, Pencil, Pin, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getDictionary, type Locale } from "@/lib/i18n";
import {
  clearArchive,
  deleteSession,
  duplicateSession,
  loadArchive,
  renameSession,
  toggleSessionPinned,
  type ArchivedSession,
} from "@/lib/local-archive";
import { cn } from "@/lib/utils";

type ConversationArchiveProps = {
  locale: Locale;
  onNavigate?: () => void;
  headingId?: string;
  compact?: boolean;
};

export function ConversationArchive({ locale, onNavigate, headingId = "conversation-history-title", compact = false }: ConversationArchiveProps) {
  const text = getDictionary(locale);
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<ArchivedSession[]>([]);
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [clearArmed, setClearArmed] = useState(false);

  const ui = locale === "ru"
    ? {
        search: "Поиск диалогов и проектов",
        emptySearch: "Ничего не найдено.",
        clear: "Очистить все",
        confirmClear: "Подтвердить",
        cancel: "Отмена",
        pin: "Закрепить",
        unpin: "Открепить",
        rename: "Переименовать",
        duplicate: "Дублировать диалог",
        save: "Сохранить название",
        remove: "Удалить диалог",
        pinned: "Закреплён",
        noProject: "Без проекта",
        copySuffix: "копия",
      }
    : {
        search: "Search conversations and projects",
        emptySearch: "No conversations found.",
        clear: "Clear all",
        confirmClear: "Confirm",
        cancel: "Cancel",
        pin: "Pin conversation",
        unpin: "Unpin conversation",
        rename: "Rename conversation",
        duplicate: "Duplicate conversation",
        save: "Save title",
        remove: "Delete conversation",
        pinned: "Pinned",
        noProject: "No project",
        copySuffix: "copy",
      };

  useEffect(() => {
    const refresh = () => setSessions(loadArchive());
    refresh();
    window.addEventListener("tklab:archive-updated", refresh);
    window.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("tklab:archive-updated", refresh);
      window.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const activeSession = searchParams.get("session");
  const normalizedQuery = query.trim().toLocaleLowerCase(locale === "ru" ? "ru-RU" : "en-US");
  const filteredSessions = useMemo(
    () => sessions.filter((session) => `${session.title} ${session.model} ${session.project ?? ""}`.toLocaleLowerCase(locale === "ru" ? "ru-RU" : "en-US").includes(normalizedQuery)),
    [locale, normalizedQuery, sessions],
  );
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { day: "2-digit", month: "short" }),
    [locale],
  );

  function beginRename(session: ArchivedSession) {
    setEditingId(session.id);
    setTitleDraft(session.title);
  }

  function cancelRename() {
    setEditingId(null);
    setTitleDraft("");
  }

  function saveRename(sessionId: string) {
    if (!renameSession(sessionId, titleDraft)) return;
    cancelRename();
  }

  function confirmClearArchive() {
    clearArchive();
    setClearArmed(false);
    setEditingId(null);
    setTitleDraft("");
  }

  function duplicateConversation(session: ArchivedSession) {
    const duplicate = duplicateSession(session.id, `${session.title} · ${ui.copySuffix}`);
    if (!duplicate) return;
    onNavigate?.();
    window.location.assign(`/playground?session=${encodeURIComponent(duplicate.id)}`);
  }

  return (
    <section className={compact ? "pt-3" : "mt-8 border-t-[0.5px] border-primary pt-6"} aria-labelledby={headingId}>
      <div className="mb-3 flex items-center justify-between gap-3 px-2">
        <h2 id={headingId} className="label-caps text-secondary">{text.chat.currentSession}</h2>
        <div className="flex min-h-9 items-center gap-1">
          <span className="label-caps mr-1 text-secondary">{sessions.length}</span>
          {sessions.length > 0 && !clearArmed && (
            <button type="button" onClick={() => setClearArmed(true)} className="min-h-9 rounded-full px-2 text-[10px] uppercase tracking-[0.08em] text-on-secondary-container hover:bg-surface-container-low hover:text-primary">{ui.clear}</button>
          )}
          {sessions.length > 0 && clearArmed && (
            <>
              <button type="button" onClick={confirmClearArchive} className="min-h-9 rounded-full bg-error px-3 text-[10px] uppercase tracking-[0.08em] text-on-primary">{ui.confirmClear}</button>
              <button type="button" onClick={() => setClearArmed(false)} className="grid size-9 place-items-center rounded-full text-on-secondary-container hover:bg-surface-container-low hover:text-primary" aria-label={ui.cancel}><X size={14} /></button>
            </>
          )}
        </div>
      </div>

      {sessions.length > 0 && (
        <label className="relative mb-3 block">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-secondary-container" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ui.search} aria-label={ui.search} className="h-11 w-full rounded-2xl border border-outline-variant bg-surface-container-low pl-9 pr-3 text-[13px] text-primary outline-none focus:border-primary" />
        </label>
      )}

      {sessions.length === 0 ? (
        <p className="rounded-2xl bg-surface-container-low px-3 py-4 text-[13px] leading-[1.6] text-on-surface-variant">{text.chat.historyEmpty}</p>
      ) : filteredSessions.length === 0 ? (
        <p className="rounded-2xl bg-surface-container-low px-3 py-4 text-[13px] leading-[1.6] text-on-surface-variant">{ui.emptySearch}</p>
      ) : (
        <div className="flex max-h-[min(58vh,520px)] flex-col gap-1 overflow-y-auto pr-1">
          {filteredSessions.map((session) => {
            const active = session.id === activeSession;
            const editing = session.id === editingId;
            return (
              <div key={session.id} className={cn("group flex min-h-14 items-center gap-1 rounded-2xl border px-2 py-1.5 transition-[border-color,background-color,transform] hover:-translate-y-px hover:border-primary", active ? "border-primary bg-surface-container-low" : "border-transparent")}>
                {editing ? (
                  <div className="flex min-w-0 flex-1 items-center gap-1">
                    <input value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveRename(session.id); if (event.key === "Escape") cancelRename(); }} maxLength={120} autoFocus aria-label={ui.rename} className="h-10 min-w-0 flex-1 rounded-xl border border-primary bg-surface-container-lowest px-3 text-[13px] text-primary outline-none" />
                    <button type="button" onClick={() => saveRename(session.id)} className="grid size-10 place-items-center rounded-full text-primary hover:bg-surface-container" aria-label={ui.save}><Check size={15} /></button>
                    <button type="button" onClick={cancelRename} className="grid size-10 place-items-center rounded-full text-on-secondary-container hover:bg-surface-container hover:text-primary" aria-label={ui.cancel}><X size={15} /></button>
                  </div>
                ) : (
                  <>
                    <Link href={`/playground?session=${encodeURIComponent(session.id)}`} onClick={onNavigate} className="min-w-0 flex-1 rounded-xl px-1 py-1.5">
                      <span className="flex items-center gap-1.5">
                        {session.pinned && <Pin size={12} className="shrink-0 fill-current" aria-label={ui.pinned} />}
                        <span className="block truncate text-[13px] text-primary">{session.title}</span>
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 truncate text-[10px] uppercase tracking-[0.08em] text-on-secondary-container">
                        {session.project && <><FolderKanban size={11} /><span className="truncate">{session.project}</span><span>·</span></>}
                        <span>{dateFormatter.format(new Date(session.updatedAt))} · {session.messages.length}</span>
                      </span>
                    </Link>
                    <div className="flex shrink-0 items-center">
                      <button type="button" onClick={() => toggleSessionPinned(session.id)} aria-label={session.pinned ? ui.unpin : ui.pin} aria-pressed={session.pinned === true} className={cn("grid size-9 place-items-center rounded-full text-on-secondary-container hover:bg-surface-container hover:text-primary", session.pinned && "text-primary")}><Pin size={14} className={session.pinned ? "fill-current" : undefined} /></button>
                      <button type="button" onClick={() => beginRename(session)} aria-label={`${ui.rename}: ${session.title}`} className="grid size-9 place-items-center rounded-full text-on-secondary-container hover:bg-surface-container hover:text-primary"><Pencil size={14} /></button>
                      <button type="button" onClick={() => duplicateConversation(session)} aria-label={`${ui.duplicate}: ${session.title}`} className="grid size-9 place-items-center rounded-full text-on-secondary-container hover:bg-surface-container hover:text-primary"><CopyPlus size={14} /></button>
                      <button type="button" onClick={() => deleteSession(session.id)} aria-label={`${ui.remove}: ${session.title}`} className="grid size-9 place-items-center rounded-full text-on-secondary-container hover:bg-error-container hover:text-error"><Trash2 size={14} /></button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, CopyPlus, FolderKanban, MoreHorizontal, Pencil, Pin, Search, Trash2, X } from "lucide-react";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<ArchivedSession[]>([]);
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [clearArmed, setClearArmed] = useState(false);

  const ui = locale === "ru"
    ? { search: "Поиск диалогов", emptySearch: "Ничего не найдено.", clear: "Очистить", confirmClear: "Удалить всё", cancel: "Отмена", pin: "Закрепить", unpin: "Открепить", rename: "Переименовать", duplicate: "Дублировать", save: "Сохранить", remove: "Удалить", pinned: "Закреплён", projects: "Проекты", allProjects: "Все", noProject: "Без проекта", copySuffix: "копия", actions: "Действия" }
    : { search: "Search conversations", emptySearch: "No conversations found.", clear: "Clear", confirmClear: "Delete all", cancel: "Cancel", pin: "Pin", unpin: "Unpin", rename: "Rename", duplicate: "Duplicate", save: "Save", remove: "Delete", pinned: "Pinned", projects: "Projects", allProjects: "All", noProject: "No project", copySuffix: "copy", actions: "Actions" };

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
  const projects = useMemo(
    () => [...new Set(sessions.flatMap((session) => session.project ? [session.project] : []))].sort((left, right) => left.localeCompare(right, locale === "ru" ? "ru" : "en")),
    [locale, sessions],
  );
  const filteredSessions = useMemo(
    () => sessions.filter((session) => {
      const matchesProject = projectFilter === "all" || (projectFilter === "none" ? !session.project : session.project === projectFilter);
      if (!matchesProject) return false;
      return `${session.title} ${session.project ?? ""}`.toLocaleLowerCase(locale === "ru" ? "ru-RU" : "en-US").includes(normalizedQuery);
    }),
    [locale, normalizedQuery, projectFilter, sessions],
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
    cancelRename();
  }

  function duplicateConversation(session: ArchivedSession) {
    const duplicate = duplicateSession(session.id, `${session.title} · ${ui.copySuffix}`);
    if (!duplicate) return;
    onNavigate?.();
    router.push(`/playground?session=${encodeURIComponent(duplicate.id)}`);
  }

  return (
    <section className={compact ? "pt-3" : "mt-8 border-t-[0.5px] border-primary pt-6"} aria-labelledby={headingId}>
      <div className="mb-3 flex items-center justify-between gap-3 px-2">
        <h2 id={headingId} className="label-caps text-secondary">{text.chat.history}</h2>
        <div className="flex min-h-9 items-center gap-1">
          <span className="label-caps mr-1 text-secondary">{sessions.length}</span>
          {sessions.length > 0 && !clearArmed && <button type="button" onClick={() => setClearArmed(true)} className="min-h-9 rounded-full px-2 text-[10px] uppercase tracking-[0.08em] text-on-secondary-container hover:bg-surface-container-low hover:text-primary">{ui.clear}</button>}
          {sessions.length > 0 && clearArmed && (
            <>
              <button type="button" onClick={confirmClearArchive} className="min-h-9 rounded-full bg-error px-3 text-[10px] uppercase tracking-[0.08em] text-on-primary">{ui.confirmClear}</button>
              <button type="button" onClick={() => setClearArmed(false)} className="grid size-9 place-items-center rounded-full text-on-secondary-container hover:bg-surface-container-low" aria-label={ui.cancel}><X size={14} /></button>
            </>
          )}
        </div>
      </div>

      {sessions.length > 0 && (
        <>
          <label className="relative mb-3 block">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-secondary-container" aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ui.search} aria-label={ui.search} className="h-11 w-full rounded-2xl border border-outline-variant bg-surface-container-low pl-9 pr-3 text-[13px] text-primary outline-none focus:border-primary" />
          </label>
          {projects.length > 0 && (
            <div className="mb-3" data-chat-project-navigation>
              <p className="label-caps mb-2 px-2 text-on-secondary-container">{ui.projects}</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button type="button" onClick={() => setProjectFilter("all")} aria-pressed={projectFilter === "all"} className={cn("min-h-9 shrink-0 rounded-full border px-3 text-[10px]", projectFilter === "all" ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface text-on-secondary-container")}>{ui.allProjects}</button>
                <button type="button" onClick={() => setProjectFilter("none")} aria-pressed={projectFilter === "none"} className={cn("min-h-9 shrink-0 rounded-full border px-3 text-[10px]", projectFilter === "none" ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface text-on-secondary-container")}>{ui.noProject}</button>
                {projects.map((project) => <button key={project} type="button" onClick={() => setProjectFilter(project)} aria-pressed={projectFilter === project} className={cn("inline-flex min-h-9 max-w-40 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[10px]", projectFilter === project ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface text-on-secondary-container")}><FolderKanban size={11} /><span className="truncate">{project}</span></button>)}
              </div>
            </div>
          )}
        </>
      )}

      {sessions.length === 0 ? (
        <p className="rounded-2xl bg-surface-container-low px-3 py-4 text-[13px] leading-[1.6] text-on-surface-variant">{text.chat.historyEmpty}</p>
      ) : filteredSessions.length === 0 ? (
        <p className="rounded-2xl bg-surface-container-low px-3 py-4 text-[13px] leading-[1.6] text-on-surface-variant">{ui.emptySearch}</p>
      ) : (
        <div className="flex max-h-[min(56vh,520px)] flex-col gap-1 overflow-y-auto pr-1">
          {filteredSessions.map((session) => {
            const active = session.id === activeSession;
            const editing = session.id === editingId;
            return (
              <div key={session.id} className={cn("relative flex min-h-14 items-center gap-1 rounded-2xl border px-2 py-1.5", active ? "border-primary bg-surface-container-low" : "border-transparent hover:bg-surface-container-low/60")}>
                {editing ? (
                  <div className="flex min-w-0 flex-1 items-center gap-1">
                    <input value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveRename(session.id); if (event.key === "Escape") cancelRename(); }} maxLength={120} autoFocus aria-label={ui.rename} className="h-10 min-w-0 flex-1 rounded-xl border border-primary bg-surface-container-lowest px-3 text-[13px] text-primary outline-none" />
                    <button type="button" onClick={() => saveRename(session.id)} className="grid size-10 place-items-center rounded-full text-primary hover:bg-surface-container" aria-label={ui.save}><Check size={15} /></button>
                    <button type="button" onClick={cancelRename} className="grid size-10 place-items-center rounded-full text-on-secondary-container hover:bg-surface-container" aria-label={ui.cancel}><X size={15} /></button>
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
                    <details className="group relative shrink-0">
                      <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-full text-on-secondary-container hover:bg-surface-container hover:text-primary [&::-webkit-details-marker]:hidden" aria-label={ui.actions}><MoreHorizontal size={16} /></summary>
                      <div className="absolute right-0 top-10 z-30 w-48 rounded-2xl border border-outline-variant bg-surface-container-lowest p-1.5 shadow-xl">
                        <button type="button" onClick={() => toggleSessionPinned(session.id)} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-[12px] hover:bg-surface-container-low"><Pin size={14} className={session.pinned ? "fill-current" : undefined} />{session.pinned ? ui.unpin : ui.pin}</button>
                        <button type="button" onClick={() => beginRename(session)} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-[12px] hover:bg-surface-container-low"><Pencil size={14} />{ui.rename}</button>
                        <button type="button" onClick={() => duplicateConversation(session)} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-[12px] hover:bg-surface-container-low"><CopyPlus size={14} />{ui.duplicate}</button>
                        <button type="button" onClick={() => deleteSession(session.id)} className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-[12px] text-error hover:bg-error-container"><Trash2 size={14} />{ui.remove}</button>
                      </div>
                    </details>
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
